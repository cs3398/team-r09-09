
import { useState } from 'react';
import Dashboard from './components/Dashboard';
import './App.css';

// Local address of the team's FastAPI backend.
// React sends login and signup requests to this server.
const API_URL = 'http://127.0.0.1:8001';


function App() {
  // Controls whether the user sees the login or signup form.
  const [isSignUp, setIsSignUp] = useState(false);

  // Tracks the logged-in user and whether to display the dashboard.
  const [showDashboard, setShowDashboard] = useState(false);
  const [userId, setUserId] = useState(null);

  // Stores the values entered into the authentication form.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Provides feedback and prevents duplicate requests.
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Categories displayed on the login and signup page.
  const categories = [
    { name: 'Tuition & Fees', icon: '◈' },
    { name: 'Housing & Utilities', icon: '⌂' },
    { name: 'Dining & Night Bites', icon: '✦' },
    { name: 'Transportation & Travel', icon: '▰' },
    { name: 'Lifestyle & Emergency', icon: '✣' }
  ];

  // Validates the form and sends the credentials to FastAPI.
  // Signup creates a user, while login verifies an existing user.
  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');

    if (!email.trim() || !password) {
      setMessage('Please fill in all required fields.');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      // Select the appropriate backend endpoint.
      const endpoint = isSignUp ? '/users' : '/login';

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Request failed.');
      }

      // The current backend returns an error property
      // when login credentials are incorrect.
      if (data.error) {
        setMessage(data.error);
        return;
      }

      if (!Number.isInteger(data.user_id)) {
        throw new Error('The backend did not return a valid user ID.');
      }

      if (isSignUp) {
        // After registration, return to login so the
        // user can sign in with their new account.
        setIsSignUp(false);
        setPassword('');
        setConfirmPassword('');
        setMessage('Account created! Please sign in.');
      } else {
        // Save the user ID so the dashboard can retrieve
        // the correct account and expense transactions.
        setUserId(data.user_id);
        setPassword('');
        setShowDashboard(true);
      }
    } catch (error) {
      setMessage(error.message || 'Could not connect to the backend.');
    } finally {
      setIsLoading(false);
    }
  }

  // Switches between login and signup and clears old form data.
  function toggleMode() {
    setIsSignUp(!isSignUp);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setMessage('');
  }

  // Returns the user to the login page and clears their
  // authentication information from React's local state.
  function handleSignOut() {
    setShowDashboard(false);
    setUserId(null);
    setIsSignUp(false);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setMessage('');
  }

  // Only a successful login can display the dashboard.
  // The user ID is passed to Dashboard for database requests.
  if (showDashboard) {
    return (
      <Dashboard
        userId={userId}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="app-title">The Night Owl</h1>
        <p className="app-subtitle">Student Budget Planner</p>

        <div className="category-preview">
          <h3>TRACKING 5 CORE CATEGORIES:</h3>

          <div className="category-list">
            {categories.map((category) => (
              <span className="category-badge" key={category.name}>
                <span className="category-icon">
                  {category.icon}
                </span>
                {category.name}
              </span>
            ))}
          </div>
        </div>

        {/* Login and signup share the same form layout. */}
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {/* Password confirmation appears only during signup. */}
          {isSignUp && (
            <>
              <label htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                required
              />
            </>
          )}

          {message && (
            <p className="form-message" role="status">
              {message}
            </p>
          )}

          <button
            type="submit"
            className="submit-btn"
            disabled={isLoading}
          >
            {isLoading
              ? 'Please wait...'
              : isSignUp
                ? 'Create Account'
                : 'Sign In'}
          </button>
        </form>

        {/* Allows users to switch authentication modes. */}
        <button
          type="button"
          className="toggle-btn"
          onClick={toggleMode}
          disabled={isLoading}
        >
          {isSignUp
            ? 'Already have an account? Sign in here'
            : "Don't have an account? Set up account"}
        </button>
      </div>
    </div>
  );
}

export default App;

