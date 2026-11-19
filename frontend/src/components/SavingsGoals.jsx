
import { useEffect, useState } from "react";
import "./SavingsGoals.css";

// ============================================================
// THE NIGHT OWL - SAVINGS GOALS TRACKER
// ============================================================
//
// Users can:
// - Create savings goals
// - Add money toward their goals
// - Track progress and remaining amounts
// - Edit goal names and targets
// - Delete goals
// - Earn 25 Owl Points for completing a goal
//
// All goals and contributions are saved through FastAPI.
//
// Savings contributions are budget allocations.
// They are NOT actual bank transfers or expense transactions.
//
// Monetary values are stored as integer cents.
// ============================================================

// Local FastAPI backend.
const API_URL = "http://127.0.0.1:8001";

// Converts integer cents into formatted dollars.
function formatMoney(cents) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

// Reads the backend response and handles API errors.
async function readResponse(response) {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Request failed.");
  }

  return data;
}

export default function SavingsGoals({ userId, onBack }) {
  // Savings goals retrieved from the backend.
  const [goals, setGoals] = useState([]);

  // Form inputs for creating a new goal.
  const [goalName, setGoalName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");

  // Contribution input values for individual goals.
  const [contributionAmounts, setContributionAmounts] = useState({});

  // Tracks which goal is currently being edited.
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editTarget, setEditTarget] = useState("");

  // Loading states prevent duplicate requests.
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Displays success messages and API errors.
  const [message, setMessage] = useState("");

  // ==========================================================
  // LOAD SAVINGS GOALS
  // ==========================================================

  // Retrieves the logged-in user's saved goals when the page opens.
  useEffect(() => {
    let cancelled = false;

    async function loadGoals() {
      if (userId == null) {
        setMessage("Please sign in to view your savings goals.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setMessage("");

      try {
        const response = await fetch(
          `${API_URL}/savings-goals/${userId}`
        );

        const data = await readResponse(response);

        if (!cancelled) {
          setGoals(data.goals || []);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error.message || "Unable to load savings goals."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadGoals();

    // Prevent state updates after leaving the page.
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Retrieves the latest goal records after changes.
  async function refreshGoals() {
    const response = await fetch(
      `${API_URL}/savings-goals/${userId}`
    );

    const data = await readResponse(response);

    setGoals(data.goals || []);
  }

  // ==========================================================
  // CREATE A SAVINGS GOAL
  // ==========================================================

  async function createGoal(event) {
    event.preventDefault();
    setMessage("");

    const name = goalName.trim();
    const target = Number(targetAmount);
    const targetCents = Math.round(target * 100);

    // Validate the goal before sending it to FastAPI.
    if (
      !name ||
      !targetAmount.trim() ||
      !Number.isFinite(target) ||
      !Number.isSafeInteger(targetCents) ||
      targetCents <= 0
    ) {
      setMessage("Please enter a valid goal name and target.");
      return;
    }

    setIsSaving(true);

    try {
      // Save the goal in SQLite through FastAPI.
      const response = await fetch(
        `${API_URL}/savings-goals`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            name,
            target_cents: targetCents,
          }),
        }
      );

      await readResponse(response);

      // Reload saved goals from the database.
      await refreshGoals();

      setGoalName("");
      setTargetAmount("");
      setMessage("Savings goal created successfully!");
    } catch (error) {
      setMessage(error.message || "Could not create goal.");
    } finally {
      setIsSaving(false);
    }
  }

  // ==========================================================
  // ADD SAVINGS CONTRIBUTIONS
  // ==========================================================

  async function addSavings(goalId) {
    setMessage("");

    const input = contributionAmounts[goalId] ?? "";
    const amount = Number(input);
    const amountCents = Math.round(amount * 100);

    const goal = goals.find((item) => item.id === goalId);

    // Reject empty or invalid contribution amounts.
    if (
      !goal ||
      !input.trim() ||
      !Number.isFinite(amount) ||
      !Number.isSafeInteger(amountCents) ||
      amountCents <= 0
    ) {
      setMessage("Please enter a valid contribution amount.");
      return;
    }

    // Prevent contributions above the goal's remaining amount.
    if (
      amountCents >
      goal.target_cents - goal.saved_cents
    ) {
      setMessage(
        "This contribution exceeds the remaining goal amount."
      );
      return;
    }

    setIsSaving(true);

    try {
      // Contributions are saved separately from expenses.
      const response = await fetch(
        `${API_URL}/savings-goals/${goalId}/contributions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            amount_cents: amountCents,
          }),
        }
      );

      const result = await readResponse(response);

      // Reload goal progress from the database.
      await refreshGoals();

      // Clear the contribution field.
      setContributionAmounts((previous) => ({
        ...previous,
        [goalId]: "",
      }));

      // The backend awards points only on first completion.
      if (result.points_earned > 0) {
        setMessage(
          `🎉 Goal completed! You earned ${result.points_earned} Owl Points!`
        );
      } else {
        setMessage("Savings contribution recorded successfully!");
      }
    } catch (error) {
      setMessage(
        error.message || "Could not record contribution."
      );
    } finally {
      setIsSaving(false);
    }
  }

  // ==========================================================
  // EDIT A SAVINGS GOAL
  // ==========================================================

  // Opens the editing form with the goal's current values.
  function startEditing(goal) {
    setEditingGoalId(goal.id);
    setEditName(goal.name);
    setEditTarget((goal.target_cents / 100).toFixed(2));
    setMessage("");
  }

  // Closes the edit form without saving changes.
  function cancelEditing() {
    setEditingGoalId(null);
    setEditName("");
    setEditTarget("");
  }

  // Saves changes to an existing goal.
  async function saveEditedGoal(goalId) {
    setMessage("");

    const name = editName.trim();
    const target = Number(editTarget);
    const targetCents = Math.round(target * 100);

    const goal = goals.find((item) => item.id === goalId);

    if (
      !goal ||
      !name ||
      !editTarget.trim() ||
      !Number.isFinite(target) ||
      !Number.isSafeInteger(targetCents) ||
      targetCents <= 0
    ) {
      setMessage("Please enter a valid goal name and target.");
      return;
    }

    // Do not allow a target lower than the saved amount.
    if (targetCents < goal.saved_cents) {
      setMessage(
        "The target cannot be lower than the amount already saved."
      );
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        `${API_URL}/savings-goals/${goalId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            name,
            target_cents: targetCents,
          }),
        }
      );

      await readResponse(response);

      // Show the updated values from the database.
      await refreshGoals();

      cancelEditing();
      setMessage("Savings goal updated successfully!");
    } catch (error) {
      setMessage(error.message || "Could not update goal.");
    } finally {
      setIsSaving(false);
    }
  }

  // ==========================================================
  // DELETE A SAVINGS GOAL
  // ==========================================================

  async function deleteGoal(goalId) {
    const goal = goals.find((item) => item.id === goalId);

    if (!goal) return;

    // Require confirmation before permanent deletion.
    const confirmed = window.confirm(
      `Are you sure you want to delete "${goal.name}"?`
    );

    if (!confirmed) return;

    setIsSaving(true);
    setMessage("");

    try {
      // Include user ID so the backend can locate the goal.
      const response = await fetch(
        `${API_URL}/savings-goals/${goalId}?user_id=${userId}`,
        {
          method: "DELETE",
        }
      );

      await readResponse(response);

      await refreshGoals();

      // Remove the deleted goal's contribution input.
      setContributionAmounts((previous) => {
        const updated = { ...previous };
        delete updated[goalId];
        return updated;
      });

      if (editingGoalId === goalId) {
        cancelEditing();
      }

      setMessage("Savings goal deleted successfully!");
    } catch (error) {
      setMessage(error.message || "Could not delete goal.");
    } finally {
      setIsSaving(false);
    }
  }

  // ==========================================================
  // PAGE INTERFACE
  // ==========================================================

  return (
    <div className="savings-goals-page">
      {/* Navigation back to The Night Owl dashboard. */}
      <button
        type="button"
        onClick={onBack}
        className="savings-back-button"
      >
        ← Back to Dashboard
      </button>

      <h1>Savings Goals</h1>
      <p>Create savings goals and track your progress.</p>

      {/* Form for creating a new savings goal. */}
      <form
        className="savings-create-form"
        onSubmit={createGoal}
      >
        <input
          type="text"
          placeholder="Goal name (e.g., New Laptop)"
          value={goalName}
          onChange={(event) => setGoalName(event.target.value)}
          disabled={isSaving}
          required
        />

        <input
          type="number"
          placeholder="Target amount ($)"
          value={targetAmount}
          onChange={(event) => setTargetAmount(event.target.value)}
          min="0.01"
          step="0.01"
          disabled={isSaving}
          required
        />

        <button
          type="submit"
          disabled={isSaving || isLoading}
        >
          {isSaving ? "Saving..." : "Create Goal"}
        </button>
      </form>

      {/* Messages from successful actions or backend errors. */}
      {message && (
        <p role="status" className="savings-status-message">
          {message}
        </p>
      )}

      {/* Show loading feedback while fetching saved goals. */}
      {isLoading ? (
        <p>Loading savings goals...</p>
      ) : (
        <div className="savings-goals-list">
          {goals.length === 0 ? (
            <p>
              No savings goals yet. Create your first goal above!
            </p>
          ) : (
            goals.map((goal) => {
              const remainingCents = Math.max(
                0,
                goal.target_cents - goal.saved_cents
              );

              const progressPercentage =
                (goal.saved_cents / goal.target_cents) * 100;

              const isComplete = remainingCents === 0;
              const isEditing = editingGoalId === goal.id;

              return (
                <div
                  className="savings-goal-card"
                  key={goal.id}
                >
                  {isEditing ? (
                    // Goal editing interface.
                    <div className="savings-edit-form">
                      <h2>Edit Savings Goal</h2>

                      <label htmlFor={`edit-name-${goal.id}`}>
                        Goal Name
                      </label>

                      <input
                        id={`edit-name-${goal.id}`}
                        type="text"
                        value={editName}
                        onChange={(event) =>
                          setEditName(event.target.value)
                        }
                        disabled={isSaving}
                      />

                      <label htmlFor={`edit-target-${goal.id}`}>
                        Target Amount ($)
                      </label>

                      <input
                        id={`edit-target-${goal.id}`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={editTarget}
                        onChange={(event) =>
                          setEditTarget(event.target.value)
                        }
                        disabled={isSaving}
                      />

                      <div className="savings-goal-actions">
                        <button
                          type="button"
                          onClick={() => saveEditedGoal(goal.id)}
                          disabled={isSaving}
                        >
                          Save Changes
                        </button>

                        <button
                          type="button"
                          className="savings-cancel-button"
                          onClick={cancelEditing}
                          disabled={isSaving}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Goal name and financial progress. */}
                      <h2>{goal.name}</h2>

                      <p>
                        {formatMoney(goal.saved_cents)} saved of{" "}
                        {formatMoney(goal.target_cents)}
                      </p>

                      <progress
                        value={goal.saved_cents}
                        max={goal.target_cents}
                        aria-label={`${goal.name} savings progress`}
                      />

                      <p className="savings-progress-text">
                        {progressPercentage.toFixed(1)}% complete
                      </p>

                      <p className="savings-remaining">
                        {formatMoney(remainingCents)} remaining
                      </p>

                      {/* Goal completion and reward messages. */}
                      {isComplete && (
                        <p className="savings-complete-message">
                          🎉 Savings goal reached!
                          {goal.reward_awarded === 1 &&
                            " +25 Owl Points earned!"}
                        </p>
                      )}

                      {/* Input for a new savings contribution. */}
                      <div className="savings-contribution">
                        <input
                          type="number"
                          placeholder="Amount to save ($)"
                          min="0.01"
                          step="0.01"
                          value={
                            contributionAmounts[goal.id] ?? ""
                          }
                          onChange={(event) =>
                            setContributionAmounts((previous) => ({
                              ...previous,
                              [goal.id]: event.target.value,
                            }))
                          }
                          disabled={isSaving || isComplete}
                          aria-label={`Contribution for ${goal.name}`}
                        />

                        <button
                          type="button"
                          onClick={() => addSavings(goal.id)}
                          disabled={isSaving || isComplete}
                        >
                          Add Savings
                        </button>
                      </div>

                      {/* Edit and delete controls. */}
                      <div className="savings-goal-actions">
                        <button
                          type="button"
                          className="savings-edit-button"
                          onClick={() => startEditing(goal)}
                          disabled={isSaving}
                        >
                          Edit Goal
                        </button>

                        <button
                          type="button"
                          className="savings-delete-button"
                          onClick={() => deleteGoal(goal.id)}
                          disabled={isSaving}
                        >
                          Delete Goal
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
