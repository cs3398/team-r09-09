// Calendar page: shows expenses (transactions) from the FastAPI backend on their days.
// Click a day to log an expense for it; click an expense to see details.

const API = "http://localhost:8000";
const ACCOUNT_ID = 1; // TODO: use the logged-in user's account

const errorEl = document.getElementById("cal-error");
const streakEl = document.getElementById("streak-count");

function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Loads all transactions for the account from the backend
async function getTransactions() {
  const res = await fetch(`${API}/transactions/${ACCOUNT_ID}`);
  if (!res.ok) throw new Error(`Server error (${res.status})`);
  const data = await res.json();
  return data.transactions; // backend returns { transactions: [...] }
}

// Streak = consecutive days (ending today or yesterday) with at least one expense logged
function calculateStreak(dates) {
  const days = new Set(dates);
  const day = new Date();
  if (!days.has(toKey(day))) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (days.has(toKey(day))) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

async function loadStreak() {
  try {
    const txns = await getTransactions();
    streakEl.textContent = calculateStreak(txns.map((t) => t.date));
  } catch (err) {
    console.error("Couldn't load streak", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // If we came from the log page (?date=...), open on that month
  const startDate = new URLSearchParams(window.location.search).get("date") || undefined;

  const calendar = new FullCalendar.Calendar(document.getElementById("calendar"), {
    initialView: "dayGridMonth",
    initialDate: startDate,
    headerToolbar: { left: "prev,next today", center: "title", right: "dayGridMonth,listMonth" },
    height: "auto",

    // FullCalendar calls this whenever the visible month changes
    events: async (info, success, failure) => {
      try {
        const start = info.startStr.slice(0, 10);
        const end = info.endStr.slice(0, 10);
        const txns = (await getTransactions()).filter(
          (t) => t.date >= start && t.date < end
        );
        errorEl.textContent = "";
        success(
          txns.map((t) => ({
            title: `$${Number(t.amount).toFixed(2)} ${t.description || ""}`.trim(),
            start: t.date,
            allDay: true,
          }))
        );
      } catch (err) {
        errorEl.textContent = "Couldn't load expenses. Is the backend running?";
        console.error(err);
        failure(err);
      }
    },

    // Click an empty part of a day → log an expense for that day
    dateClick(info) {
      window.location.href = `log-expense.html?date=${info.dateStr}`;
    },

    // Click an expense → show its details
    eventClick(info) {
      alert(info.event.title);
    },
  });

  calendar.render();
  loadStreak();
});