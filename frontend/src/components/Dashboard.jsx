
import { useEffect, useState } from 'react';
import './Dashboard.css';

// Address of the Python FastAPI backend running on your Mac.
const API_URL = 'http://127.0.0.1:8001';

// Categories displayed in The Night Owl dashboard.
// The current backend does not save transaction categories yet.
const categories = [
  'Tuition & Fees',
  'Housing & Utilities',
  'Dining & Night Bites',
  'Transportation & Travel',
  'Lifestyle & Emergency'
];

const coupons = [
  {
    id: 'c1',
    title: '$5 Fine Dining & Night Bites',
    category: 'Dining',
    cost: 200,
    icon: 'fa-utensils',
    description: 'Valid for dinner, late-night bites, and popular local dining spots.',
    searchQuery: '$5 restaurants'
  },
  {
    id: 'c2',
    title: '$5 Retail & Shopping Sprees',
    category: 'Shopping',
    cost: 200,
    icon: 'fa-bag-shopping',
    description: 'Redeemable for groceries, tech gear, or local fashion apparel.',
    searchQuery: '$5 shopping deals'
  },
  {
    id: 'c3',
    title: '$10 Premium Travel Voucher',
    category: 'Travel',
    cost: 450,
    icon: 'fa-plane',
    description: 'Save big on ride-shares, flight tickets, or weekend getaways.',
    searchQuery: 'travel discounts and experiences'
  }
];

// Converts integer cents from SQLite into a dollar amount.
function formatMoney(cents) {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  });
}

function Dashboard({ userId, onSignOut }) {
  // The budget is temporary React state until the backend
  // provides endpoints for storing and retrieving budgets.
  const [userPoints, setUserPoints] = useState(150);
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const UNLOCK_THRESHOLD = 200;
  const pointsNeeded = Math.max(0, UNLOCK_THRESHOLD - userPoints);
  const [budget, setBudget] = useState(2500);
  const [budgetInput, setBudgetInput] = useState('2500');

  // Stores the account ID belonging to the logged-in user.
  const [accountId, setAccountId] = useState(null);

  // Holds transactions retrieved from the SQLite database.
  const [transactions, setTransactions] = useState([]);

  // Controlled inputs for the new expense form.
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0]);

  // Displays API errors and successful actions to the user.
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [streak, setStreak] = useState(3);
  const [claimedCoupons, setClaimedCoupons] = useState([]);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [zipCode, setZipCode] = useState('78660'); // Pflugerville, TX default
  const [toast, setToast] = useState(null);

  // Dynamic Tier Status
  const getTier = (pts) => {
    if (pts >= 400) return { name: 'Wise Owl Master', icon: 'crown', badge: 'bg-amber-400/10 border-amber-400/30 text-amber-400' };
    if (pts >= 200) return { name: 'Night Owl Explorer', icon: 'moon', badge: 'bg-purple-400/10 border-purple-400/30 text-purple-400' };
    return { name: 'Fledgling Owl', icon: 'feather', badge: 'bg-cyan-400/10 border-cyan-400/30 text-cyan-400' };
  };
  const tier = getTier(userPoints);

  // Retrieves an existing account, or creates one for a new user.
  // The account ID is required when saving transactions.
  useEffect(() => {
    if (userId == null) {
      setMessage('Please sign in to record expenses.');
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadAccountAndTransactions() {
      setIsLoading(true);
      setMessage('');

      try {
        const accountsResponse = await fetch(
          `${API_URL}/accounts/${userId}`
        );

        if (!accountsResponse.ok) {
          throw new Error('Unable to retrieve your account.');
        }

        const accountsData = await accountsResponse.json();
        const existingAccount = accountsData.accounts?.[0];

        let currentAccountId;

        if (existingAccount) {
          currentAccountId = existingAccount.id;
        } else {
          // New users need an account before they can
          // record expenses in the transactions table.
          const createResponse = await fetch(
            `${API_URL}/accounts`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                user_id: userId,
                name: 'Night Owl Budget'
              })
            }
          );

          if (!createResponse.ok) {
            throw new Error('Unable to create your account.');
          }

          const createdAccount = await createResponse.json();
          currentAccountId = createdAccount.account_id;
        }

        if (!Number.isInteger(currentAccountId)) {
          throw new Error('The backend returned an invalid account ID.');
        }

        // Load expenses previously saved for this account.
        const transactionsResponse = await fetch(
          `${API_URL}/transactions/${currentAccountId}`
        );

        if (!transactionsResponse.ok) {
          throw new Error('Unable to load your transactions.');
        }

        const transactionsData = await transactionsResponse.json();

        if (!cancelled) {
          setAccountId(currentAccountId);
          setTransactions(transactionsData.transactions || []);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error.message || 'Unable to connect to FastAPI.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadAccountAndTransactions();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Updates the displayed monthly budget.
  // This value is not saved in SQLite yet.
  function handleUpdateBudget() {
    const newBudget = Number(budgetInput);

    if (!Number.isFinite(newBudget) || newBudget < 0 ||
        budgetInput.trim() === '') {
      setMessage('Please enter a valid budget amount.');
      return;
    }

    setBudget(newBudget);
    setMessage('Budget updated for this session.');
  }

  // Sends the new expense to FastAPI for permanent storage.
  async function handleRecordExpense(event) {
    event.preventDefault();
    setMessage('');

    if (!title.trim()) {
      setMessage('Please enter an expense title.');
      return;
    }

    const expenseAmount = Number(amount);

    if (!Number.isFinite(expenseAmount) || expenseAmount <= 0) {
      setMessage('Please enter an amount greater than zero.');
      return;
    }

    // Convert dollars to integer cents before sending to SQLite.
    const amountInCents = Math.round(expenseAmount * 100);

    if (!Number.isSafeInteger(amountInCents) ||
        amountInCents <= 0) {
      setMessage('Please enter a valid expense amount.');
      return;
    }

    if (accountId == null) {
      setMessage('Your account is not ready. Please try signing in again.');
      return;
    }

    setIsSaving(true);

    try {
      // Use the local calendar date rather than UTC so
      // the saved date matches the user's current day.
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const date = `${year}-${month}-${day}`;

      const response = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          account_id: accountId,
          description: title.trim(),
          amount: amountInCents,
          category: category,
          date: date
        })
      });

      if (!response.ok) {
        throw new Error('Unable to save the expense.');
      }

      const result = await response.json();

      if (!Number.isInteger(result.transaction_id)) {
        throw new Error('The backend did not confirm the transaction.');
      }

      // Retrieve the latest transactions from SQLite after saving.
      // This ensures the dashboard displays database records.
      const refreshResponse = await fetch(
        `${API_URL}/transactions/${accountId}`
      );

      if (!refreshResponse.ok) {
        throw new Error(
          'Expense saved, but the transaction list could not refresh.'
        );
      }

      const refreshedData = await refreshResponse.json();
      setTransactions(refreshedData.transactions || []);

      // Clear the form only after the expense is saved.
      setTitle('');
      setAmount('');
      setCategory(categories[0]);
      setMessage('Expense recorded successfully!');
    } catch (error) {
      setMessage(error.message || 'Unable to connect to FastAPI.');
    } finally {
      setIsSaving(false);
    }
  }

  // All saved transactions are treated as expenses for this demo.
  const totalSpentCents = transactions.reduce(
    (total, transaction) => total + Number(transaction.amount),
    0
  );

  const budgetCents = Math.round(budget * 100);
  const remainingCents = budgetCents - totalSpentCents;

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1>The Night Owl Dashboard</h1>

        <div className="dashboard-actions">
          <div 
            onClick={() => setShowRewardsModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              background: 'rgba(30, 41, 59, 0.85)',
              border: '1px solid #334155',
              padding: '12px 24px',
              borderRadius: '32px',
              cursor: 'pointer',
              userSelect: 'none',
              marginRight: '15px'
            }}
          >
            <span style={{ fontSize: '36px' }}>🏆</span>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#f8fafc' }}>
                {userPoints} PTS
              </span>
              <span style={{ fontSize: '18px', color: '#94a3b8' }}>
                {userPoints >= UNLOCK_THRESHOLD ? "$50 Unlocked!" : `${pointsNeeded} pts to $50`}
              </span>
            </div>
          </div>
          <label htmlFor="monthlyBudget">
            Monthly Budget/Income ($):
          </label>

          <input
            id="monthlyBudget"
            type="number"
            min="0"
            step="0.01"
            value={budgetInput}
            onChange={(event) => setBudgetInput(event.target.value)}
          />

          <button
            type="button"
            className="dashboard-button"
            onClick={handleUpdateBudget}
          >
            Update Budget
          </button>

          <button
            type="button"
            className="signout-button"
            onClick={onSignOut}
          >
            Sign Out
          </button>
        </div>
      </header>

      <section className="dashboard-stats">
        <div className="stat-card">
          <h2>TOTAL SPENT</h2>
          <p>{formatMoney(totalSpentCents)}</p>
        </div>

        <div className="stat-card">
          <h2>REMAINING BALANCE</h2>
          <p
            className="remaining-balance"
            style={{
              color: remainingCents < 0 ? '#ef4444' : '#10b981'
            }}
          >
            {formatMoney(remainingCents)}
          </p>
        </div>
      </section>

      <section className="dashboard-section">
        <h2>Add New Expense</h2>

        <form
          className="expense-form"
          onSubmit={handleRecordExpense}
        >
          <div>
            <label htmlFor="expenseTitle">Title</label>
            <input
              id="expenseTitle"
              type="text"
              placeholder="Expense title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="expenseAmount">Amount ($)</label>
            <input
              id="expenseAmount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="expenseCategory">Category</label>
            <select
              id="expenseCategory"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="dashboard-button"
            disabled={isLoading || isSaving || accountId == null}
          >
            {isSaving ? 'Saving...' : 'Record Expense'}
          </button>
        </form>

        {message && (
          <p
            role="status"
            style={{ marginTop: '15px', fontSize: '14px' }}
          >
            {message}
          </p>
        )}
      </section>

      <section className="dashboard-section">
        <h2>Category Breakdown (% of Monthly Income)</h2>
        <div className="category-breakdown">
          {categories.map((item) => {
            // Calculate total cents for transactions matching this category
            const categoryTotalCents = transactions
              .filter((t) => t.category === item)
              .reduce((sum, t) => sum + Number(t.amount), 0);

            const budgetCents = Math.round(budget * 100);
            const percentage =
              budgetCents > 0
                ? ((categoryTotalCents / budgetCents) * 100).toFixed(1)
                : '0.0';

            return (
              <div className="breakdown-row" key={item}>
                <span>{item}</span>
                <span>
                  {formatMoney(categoryTotalCents)} ({percentage}%)
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="dashboard-section">
        <h2>Recent Transactions</h2>

        <div className="transactions-container">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Amount ($)</th>
              </tr>
            </thead>

            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan="3"
                    className="empty-transactions"
                  >
                    {isLoading
                      ? 'Loading transactions...'
                      : 'No transactions to display.'}
                  </td>
                </tr>
              ) : (
                [...transactions]
                  .sort((a, b) => b.id - a.id)
                  .map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{transaction.description}</td>
                      <td>{transaction.category || 'Uncategorized'}</td>
                      <td>
                        {formatMoney(Number(transaction.amount))}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    {showRewardsModal && (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '20px'
      }}>
        <div style={{
          background: '#0f172a', border: '1px solid #334155',
          borderRadius: '20px', width: '96vw', maxWidth: '1400px',
          height: '92vh', maxHeight: '92vh', overflowY: 'auto', padding: '36px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', color: '#f8fafc',
          display: 'flex', flexDirection: 'column'
        }}>     
          {/* Toast Notification Alert */}
          {toast && (
            <div style={{
              background: '#10b981', color: '#ffffff', padding: '12px 18px',
              borderRadius: '10px', marginBottom: '20px', fontWeight: '600',
              textAlign: 'center', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
            }}>
              {toast}
            </div>
          )}

          {/* Modal Header with Owl Logo */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <img 
                src="/night_owl_logo.svg" 
                alt="The Night Owl Logo" 
                style={{ height: '50px', width: 'auto', objectFit: 'contain' }}
              />
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '22px', fontWeight: 'bold' }}>Night Owl Rewards Hub</h2>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>Redeem vouchers earned by hitting budget goals</p>
              </div>
            </div>
            <button 
              onClick={() => setShowRewardsModal(false)}
              style={{
                background: '#1e293b', border: '1px solid #334155', color: '#94a3b8',
                width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer',
                fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>

          {/* Stats Summary Bar */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px', marginBottom: '24px'
          }}>
            <div style={{ background: '#1e293b', padding: '16px', borderRadius: '14px', border: '1px solid #334155' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Points Balance</span>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#38bdf8', marginTop: '4px' }}>🏆 {userPoints} PTS</div>
            </div>
            <div style={{ background: '#1e293b', padding: '16px', borderRadius: '14px', border: '1px solid #334155' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Current Tier</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: 'bold', color: '#a855f7', marginTop: '4px' }}>
                <img 
                  src="/night_owl_logo.svg" 
                  alt="Owl Logo" 
                  style={{ height: '24px', width: 'auto', objectFit: 'contain' }} 
                />
                <span>{tier.name}</span>
              </div>
            </div>
            <div style={{ background: '#1e293b', padding: '16px', borderRadius: '14px', border: '1px solid #334155' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Streak Counter</span>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', marginTop: '4px' }}>🔥 {streak} Days</div>
            </div>
          </div>

          {/* ZIP Code Location Helper */}
          <div style={{
            background: '#1e293b', padding: '16px', borderRadius: '14px',
            border: '1px solid #334155', marginBottom: '24px', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between', gap: '16px'
          }}>
            <div style={{ fontSize: '14px', color: '#cbd5e1' }}>
              📍 <strong>Local Offers Near You:</strong>
            </div>
            <input 
              type="text" 
              value={zipCode} 
              onChange={(e) => setZipCode(e.target.value)}
              placeholder="Enter ZIP Code"
              style={{
                background: '#0f172a', border: '1px solid #334155', color: '#f8fafc',
                padding: '8px 12px', borderRadius: '8px', fontSize: '14px', width: '120px'
              }}
            />
          </div>

          {/* Available Rewards Grid */}
          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Available Vouchers</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '24px' }}>
            {coupons.map((coupon) => {
              const isClaimed = claimedCoupons.includes(coupon.id);
              const canAfford = userPoints >= coupon.cost;

              return (
                <div key={coupon.id} style={{
                  background: '#1e293b', border: '1px solid #334155',
                  borderRadius: '16px', padding: '20px', display: 'flex',
                  flexDirection: 'column', justifyContent: 'space-between'
                }}>
                  <div>
                    <span style={{
                      fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase',
                      padding: '4px 10px', borderRadius: '20px', background: '#334155', color: '#38bdf8'
                    }}>
                      {coupon.category}
                    </span>
                    <h4 style={{ margin: '12px 0 6px 0', fontSize: '16px' }}>{coupon.title}</h4>
                    <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: '1.4' }}>{coupon.description}</p>
                  </div>

                  <div style={{ marginTop: '20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '12px' }}>
                      Cost: <span style={{ color: '#38bdf8' }}>{coupon.cost} PTS</span>
                    </div>

                    {isClaimed ? (
                      <button 
                        onClick={() => setSelectedCoupon(coupon)}
                        style={{
                          width: '100%', padding: '10px', borderRadius: '10px', border: 'none',
                          background: '#10b981', color: '#fff', fontWeight: 'bold', cursor: 'pointer'
                        }}
                      >
                        View Voucher
                      </button>
                    ) : (
                      <button 
                        disabled={!canAfford}
                        onClick={() => {
                          setUserPoints(prev => prev - coupon.cost);
                          setClaimedCoupons(prev => [...prev, coupon.id]);
                          setSelectedCoupon(coupon);
                          setToast(`Unlocked ${coupon.title}!`);
                          setTimeout(() => setToast(null), 3000);
                        }}
                        style={{
                          width: '100%', padding: '10px', borderRadius: '10px', border: 'none',
                          background: canAfford ? '#3b82f6' : '#334155',
                          color: canAfford ? '#fff' : '#64748b',
                          fontWeight: 'bold', cursor: canAfford ? 'pointer' : 'not-allowed'
                        }}
                      >
                        {canAfford ? 'Redeem Voucher' : `Need ${coupon.cost - userPoints} More PTS`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Voucher Details / Local Links Overlay */}
          {selectedCoupon && (
            <div style={{
              background: '#161e2e', border: '1px solid #3b82f6', borderRadius: '16px',
              padding: '20px', marginTop: '20px'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#38bdf8' }}>🎉 Active Voucher: {selectedCoupon.title}</h4>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#94a3b8' }}>
                Search local venues near ZIP <strong>{zipCode}</strong>:
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(selectedCoupon.searchQuery + ' ' + zipCode)}`, '_blank')}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                    background: '#334155', color: '#f8fafc', fontSize: '13px', cursor: 'pointer'
                  }}
                >
                  🗺️ Find on Google Maps
                </button>
                <button 
                  onClick={() => window.open(`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(selectedCoupon.searchQuery + ' deals ' + zipCode)}`, '_blank')}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                    background:'#334155', color: '#f8fafc', fontSize: '13px', cursor: 'pointer'
                  }}
                >
                  🛍️ Search Shopping Deals
                </button>
                <button 
                  onClick={() => setSelectedCoupon(null)}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: '1px solid #334155',
                    background: 'transparent', color: '#94a3b8', fontSize: '13px', cursor: 'pointer', marginLeft: 'auto'
                  }}
                >
                  Close Preview
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    )}
    </div>
  );
}

export default Dashboard;
