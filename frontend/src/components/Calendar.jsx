import { useEffect, useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import themePlugin from '@fullcalendar/react/themes/monarch';
import dayGridPlugin from '@fullcalendar/react/daygrid';
import interactionPlugin from '@fullcalendar/react/interaction';
import '@fullcalendar/react/skeleton.css';
import '@fullcalendar/react/themes/monarch/theme.css';
import '@fullcalendar/react/themes/monarch/palettes/blue.css';
import './Calendar.css';
//FullCalendary v7

//Connect to Pythin backend
const API_URL ='http://127.0.0.1:8001';

const categoryColors = {
  'Tuition & Fees': '#8b5cf6',
  'Housing & Utilities': '#3b82f6',
  'Dining & Night Bites': '#f59e0b',
  'Transportation & Travel': '#10b981',
  'Lifestyle & Emergency': '#ec4899'
};
const defaultColor = '#64748b';

function formatMoney(cents) {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  });
}

//Function to format dates
function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Turns a FullCalendar date (a JS Date, a Temporal date, or a string)
function anyToDateKey(value) {
  if (value instanceof Date) return toDateKey(value);
  if (value && typeof value === 'object' && 'year' in value) {
    return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
  }
  return String(value || '').slice(0, 10);
}

// Transaction dates may be "YYYY-MM-DD" or "YYYY-MM-DD HH:MM:SS".
function transactionDay(transaction) {
  return String(transaction.date || '').slice(0, 10);
}


//track strea
function calculateStreak(dayKeys) {
  const days = new Set(dayKeys);
  const cursor= new Date();

  if (!days.has(toDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (days.has(toDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate()- 1);
  }
  return streak;
}

function Calendar({ userId, onBack }) {
  const [transactions, setTransactions] = useState([]);
  const [selectedDay, setSelectedDay] = useState(toDateKey(new Date()));
  const [visibleMonth, setVisibleMonth] = useState(toDateKey(new Date()).slice(0, 7));
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  //load account
  useEffect(() => {
    if (userId == null) {
      setMessage('Please sign in to view your calendar.');
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadTransactions() {
      setIsLoading(true);
      setMessage('');

      try {
        const accountsResponse = await fetch(`${API_URL}/accounts/${userId}`);
        if (!accountsResponse.ok) {
          throw new Error('Unable to retrieve your account.');
        }

        const accountsData = await accountsResponse.json();
        const account = accountsData.accounts?.[0];

        
        if (!account) {
          if (!cancelled) setTransactions([]);
          return;
        }

        const transactionsResponse = await fetch(
          `${API_URL}/transactions/${account.id}`
        );
        if (!transactionsResponse.ok) {
          throw new Error('Unable to load your transactions.');
        }

        const transactionsData = await transactionsResponse.json();
        if (!cancelled) {
          setTransactions(transactionsData.transactions || []);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error.message || 'Unable to connect to FastAPI.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadTransactions();

    return () => {
      cancelled = true;
    };
  }, [userId]);


  //detelete from calendar AND database
  async function handleDelete(transactionId) {
    if (!window.confirm('Delete this expense?')) return;

    try {
      const response = await fetch(`${API_URL}/transactions/${transactionId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Unable to delete the expense.');
      }
      setTransactions((current) => current.filter((t) => t.id !== transactionId));
      setMessage('Expense deleted.');
    } catch (error) {
      setMessage(error.message || 'Unable to connect to FastAPI.');
    }
  }

  //create calendar event for expense
  const events = useMemo(
    () =>
      transactions.map((t) => {
        const color = categoryColors[t.category] || defaultColor;
        return {
          id: String(t.id),
          title: `${formatMoney(Number(t.amount))} ${t.description}`,
          start: transactionDay(t),
          allDay: true,
          color
        };
      }),
    [transactions]
  );

  const streak = useMemo(
    () => calculateStreak(transactions.map(transactionDay)),
    [transactions]
  );

  const monthTotalCents = transactions
    .filter((t) => transactionDay(t).startsWith(visibleMonth))
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const selectedTransactions = transactions.filter(
    (t) => transactionDay(t) === selectedDay
  );
  const selectedTotalCents = selectedTransactions.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  );

  const selectedLabel = new Date(`${selectedDay}T00:00:00`).toLocaleDateString(
    'en-US',
    { weekday: 'long', month: 'long', day: 'numeric' }
  );

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1>Spending Calendar</h1>
        <div className="dashboard-actions">
          <button type="button" className="dashboard-button" onClick={onBack}>
            Back to Dashboard
          </button>
        </div>
      </header>

      <section className="dashboard-stats">
        <div className="stat-card">
          <h2>LOGGING STREAK</h2>
          <p>
            {streak} {streak === 1 ? 'day' : 'days'}
          </p>
        </div>
        <div className="stat-card">
          <h2>SPENT THIS MONTH</h2>
          <p>{formatMoney(monthTotalCents)}</p>
        </div>
      </section>

      {message && (
        <p role="status" className="calendar-message">
          {message}
        </p>
      )}

      <div className="calendar-layout">
        <section className="dashboard-section calendar-card">
          {isLoading ? (
            <p>Loading calendar...</p>
          ) : (
            <FullCalendar
              plugins={[themePlugin, dayGridPlugin, interactionPlugin]}
              colorScheme="dark"
              initialView="dayGridMonth"
              headerToolbar={{ start: 'prev,next today', center: 'title', end: '' }}
              events={events}
              dayMaxEvents={2}
              dateClick={(info) => setSelectedDay(anyToDateKey(info.dateStr || info.date))}
              eventClick={(info) => {
                // Look the expense up by id to get its day
                const t = transactions.find((item) => String(item.id) === info.event.id);
                if (t) setSelectedDay(transactionDay(t));
              }}
              datesSet={(info) => {
                // The month grid can start in the previous month, so jump
                // two weeks past the first visible day to land in the shown month.
                const first = new Date(`${anyToDateKey(info.startStr || info.start)}T00:00:00`);
                first.setDate(first.getDate() + 14);
                setVisibleMonth(toDateKey(first).slice(0, 7));
              }}
              dayCellClass={(arg) =>
                anyToDateKey(arg.date) === selectedDay ? 'selected-day' : ''
              }
            />
          )}
        </section>

        <section className="dashboard-section day-panel">
          <h2>{selectedLabel}</h2>
          <p className="day-total">Total: {formatMoney(selectedTotalCents)}</p>

          {selectedTransactions.length === 0 ? (
            <p className="empty-transactions">No expenses on this day.</p>
          ) : (
            <ul className="day-list">
              {selectedTransactions.map((t) => (
                <li key={t.id}>
                  <span
                    className="category-dot"
                    style={{ backgroundColor: categoryColors[t.category] || defaultColor }}
                  />
                  <div className="day-item-text">
                    <strong>{t.description}</strong>
                    <span>{t.category || 'Uncategorized'}</span>
                  </div>
                  <span className="day-item-amount">
                    {formatMoney(Number(t.amount))}
                  </span>
                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => handleDelete(t.id)}
                    aria-label={`Delete ${t.description}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default Calendar;