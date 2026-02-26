import React, { useMemo, useState } from 'react';
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
    <div className="panel-stack">
      <header className="section-header">
        <div>
          <span className="section-eyebrow">Account</span>
          <h1>User Settings</h1>
          <p className="section-subtitle">Manage your display profile and user preferences.</p>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Profile</h2>
            <p>Update your name, avatar URL, and theme preference.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="form-grid">
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

          <div className="panel-actions">
            <button type="submit" className="btn-primary">
              Save Settings
            </button>
          </div>
        </form>

        {statusText ? <p className="status-ok">{statusText}</p> : null}
      </section>
    </div>
  );
}
