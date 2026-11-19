import { useEffect, useState } from 'react';
import './Onboarding.css';

// Local address of the FastAPI backend.
const API_URL = 'http://127.0.0.1:8001';

// Categories used during onboarding.
// Names should match the categories stored in Supabase.
const onboardingCategories = [
  { name: 'Housing & Utilities', type: 'expense' },
  { name: 'Food & Dining', type: 'expense' },
  { name: 'Transportation', type: 'expense' },
  { name: 'Other Expenses', type: 'expense' }
];

function Onboarding({ userId, onComplete, onSignOut }) {
  const [step, setStep] = useState(1);

  const [income, setIncome] = useState('');
  const [budget, setBudget] = useState('');

  const [housing, setHousing] = useState('');
  const [food, setFood] = useState('');
  const [transportation, setTransportation] = useState('');
  const [other, setOther] = useState('');

  const [categories, setCategories] = useState([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Retrieve the user's existing categories from FastAPI.
  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetch(
          `${API_URL}/categories/${userId}`
        );

        if (!response.ok) {
          throw new Error('Could not load categories.');
        }

        const data = await response.json();
        setCategories(data.categories);
      } catch (error) {
        setMessage(error.message);
      }
    }

    if (userId != null) {
      loadCategories();
    }
  }, [userId]);

  // Converts dollars into integer cents.
  function toCents(amount) {
    return Math.round(Number(amount || 0) * 100);
  }

  const expenses =
    Number(housing) +
    Number(food) +
    Number(transportation) +
    Number(other);

  // Validates the form before moving to the next step.
  function handleNext(event) {
    event.preventDefault();
    setMessage('');

    if (step === 1) {
      if (
        income.trim() === '' ||
        budget.trim() === '' ||
        !Number.isFinite(Number(income)) ||
        !Number.isFinite(Number(budget)) ||
        Number(income) < 0 ||
        Number(budget) < 0
      ) {
        setMessage('Please enter valid income and budget amounts.');
        return;
      }
    }

    if (step === 2) {
      const amounts = [housing, food, transportation, other];

      if (
        amounts.some(
          (amount) =>
            !Number.isFinite(Number(amount)) ||
            Number(amount) < 0
        )
      ) {
        setMessage('Please enter valid expense amounts.');
        return;
      }

      if (toCents(expenses) > toCents(budget)) {
        setMessage(
          'Your estimated expenses cannot exceed your monthly budget.'
        );
        return;
      }
    }

    setStep(step + 1);
  }

  // Find a category or create it if it doesn't exist.
  async function getOrCreateCategory(categoryName, existingCategories) {
    const categoryType = 'expense';

    const existing = existingCategories.find(
      (category) =>
        category.name === categoryName &&
        category.type.toLowerCase() === categoryType
    );

    if (existing) {
      return existing.id;
    }

    const response = await fetch(`${API_URL}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        name: categoryName,
        type: categoryType
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        typeof data.detail === 'string'
          ? data.detail
          : 'Could not create category.'
      );
    }

    // Assumes POST /categories returns category_id.
    const categoryId = data.category_id;

    if (!Number.isInteger(categoryId)) {
      throw new Error('The backend did not return a category ID.');
    }

    existingCategories.push({
      id: categoryId,
      name: categoryName,
      type: categoryType
    });

    return categoryId;
  }

  // Saves the onboarding information to Supabase through FastAPI.
  async function handleFinish() {
    if (isLoading) return;

    setMessage('');
    setIsLoading(true);

    try {
      // Copy the existing categories so we can add missing ones.
      const availableCategories = [...categories];

      const amounts = [
        housing,
        food,
        transportation,
        other
      ];

      const allocations = [];

      for (let i = 0; i < onboardingCategories.length; i++) {
        const categoryId = await getOrCreateCategory(
          onboardingCategories[i].name,
          availableCategories
        );

        allocations.push({
          category_id: categoryId,
          budget_limit: toCents(amounts[i])
        });
      }

      const onboardingData = {
        user_id: userId,
        monthly_income: toCents(income),
        monthly_budget: toCents(budget),
        allocations: allocations
      };

      const response = await fetch(`${API_URL}/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(onboardingData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === 'string'
            ? data.detail
            : 'Could not save onboarding information.'
        );
      }

      // Redirect only after the backend saves successfully.
      onComplete();

    } catch (error) {
      setMessage(error.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <h1>Welcome to Night Owl! 🦉</h1>
        <p>Step {step} of 3</p>

        {step === 1 && (
          <form onSubmit={handleNext}>
            <h2>Your Financial Information</h2>

            <label htmlFor="income">Monthly Income ($)</label>
            <input
              id="income"
              type="number"
              min="0"
              step="0.01"
              value={income}
              onChange={(event) => setIncome(event.target.value)}
              required
            />

            <label htmlFor="budget">Monthly Budget ($)</label>
            <input
              id="budget"
              type="number"
              min="0"
              step="0.01"
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              required
            />

            {message && <p role="alert">{message}</p>}

            <button type="submit">Continue</button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleNext}>
            <h2>Estimated Monthly Expenses</h2>

            {[
              ['Housing & Utilities', housing, setHousing],
              ['Food & Dining', food, setFood],
              ['Transportation', transportation, setTransportation],
              ['Other Expenses', other, setOther]
            ].map(([label, value, setter]) => (
              <div key={label}>
                <label>{label} ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={value}
                  onChange={(event) => setter(event.target.value)}
                />
              </div>
            ))}

            {message && <p role="alert">{message}</p>}

            <button
              type="button"
              onClick={() => {
                setMessage('');
                setStep(1);
              }}
            >
              Back
            </button>

            <button type="submit">Continue</button>
          </form>
        )}

        {step === 3 && (
          <div>
            <h2>Review Your Budget</h2>

            <p>
              Monthly Income: ${Number(income).toFixed(2)}
            </p>

            <p>
              Monthly Budget: ${Number(budget).toFixed(2)}
            </p>

            <p>
              Estimated Expenses: ${expenses.toFixed(2)}
            </p>

            <p>
              Budget After Estimates: $
              {(Number(budget) - expenses).toFixed(2)}
            </p>

            {message && <p role="alert">{message}</p>}

            <button
              type="button"
              onClick={() => {
                setMessage('');
                setStep(2);
              }}
              disabled={isLoading}
            >
              Back
            </button>

            <button
              type="button"
              onClick={handleFinish}
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Finish Setup'}
            </button>
          </div>
        )}

        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            disabled={isLoading}
          >
            Sign Out
          </button>
        )}
      </div>
    </div>
  );
}

export default Onboarding;