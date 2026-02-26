import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export function SettingsPage() {
  const profile = useAuthStore((state) => state.profile);
  const updateProfile = useAuthStore((state) => state.updateProfile);

  const initialValues = useMemo(
    () => ({
      firstName: profile?.firstName || '',
      lastName: profile?.lastName || '',
      profileIconUrl: profile?.profileIconUrl || '',
      theme: profile?.theme || 'light'
    }),
    [profile]
  );

  const [formValues, setFormValues] = useState(initialValues);
  const [statusText, setStatusText] = useState('');

  function handleFieldChange(event) {
    const { name, value } = event.target;
    setFormValues((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const { error } = await updateProfile(formValues);

    if (error) {
      setStatusText(error.message || 'Failed to update settings');
      return;
    }

    setStatusText('Settings saved');
  }

  return (
    <main className="app-shell">
      <header className="app-hero">
        <div>
          <span className="app-badge">PROFILE</span>
          <h1>User Settings</h1>
          <p className="app-subtitle">Manage your display profile and user preferences.</p>
        </div>
        <div className="app-hero-actions">
          <Link to="/app">Back to Workflow Tab</Link>
        </div>
      </header>

      <section className="panel" style={{ marginTop: '1rem' }}>
        <form onSubmit={handleSubmit}>
          <label htmlFor="firstName">First name</label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            value={formValues.firstName}
            onChange={handleFieldChange}
          />

          <label htmlFor="lastName">Last name</label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            value={formValues.lastName}
            onChange={handleFieldChange}
          />

          <label htmlFor="profileIconUrl">Profile icon URL</label>
          <input
            id="profileIconUrl"
            name="profileIconUrl"
            type="url"
            value={formValues.profileIconUrl}
            onChange={handleFieldChange}
          />

          <label htmlFor="theme">Theme</label>
          <select id="theme" name="theme" value={formValues.theme} onChange={handleFieldChange}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>

          <button type="submit">Save Settings</button>
        </form>

        {statusText ? <p className="status-ok">{statusText}</p> : null}
      </section>
    </main>
  );
}
