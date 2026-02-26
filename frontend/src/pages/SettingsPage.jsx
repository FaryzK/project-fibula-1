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
    <main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
      <h1>User Settings</h1>
      <p>
        <Link to="/app">Back to Workflow Tab</Link>
      </p>

      <form onSubmit={handleSubmit}>
        <p>
          <label htmlFor="firstName">First name</label>
          <br />
          <input
            id="firstName"
            name="firstName"
            type="text"
            value={formValues.firstName}
            onChange={handleFieldChange}
          />
        </p>

        <p>
          <label htmlFor="lastName">Last name</label>
          <br />
          <input
            id="lastName"
            name="lastName"
            type="text"
            value={formValues.lastName}
            onChange={handleFieldChange}
          />
        </p>

        <p>
          <label htmlFor="profileIconUrl">Profile icon URL</label>
          <br />
          <input
            id="profileIconUrl"
            name="profileIconUrl"
            type="url"
            value={formValues.profileIconUrl}
            onChange={handleFieldChange}
          />
        </p>

        <p>
          <label htmlFor="theme">Theme</label>
          <br />
          <select id="theme" name="theme" value={formValues.theme} onChange={handleFieldChange}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </p>

        <button type="submit">Save Settings</button>
      </form>

      {statusText ? <p>{statusText}</p> : null}
    </main>
  );
}
