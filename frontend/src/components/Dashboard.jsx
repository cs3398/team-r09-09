
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

// Converts integer cents from SQLite into a dollar amount.
function formatMoney(cents) {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  });
}

function Dashboard({ userId, onSignOut, onOpenCalendar }) {
  // The budget is temporary React state until the backend
  // provides endpoints for storing and retrieving budgets.
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
            className="dashboard-button"
            onClick={onOpenCalendar}>
              
              Calendar 
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
    </div>
  );
}

export default Dashboard;
