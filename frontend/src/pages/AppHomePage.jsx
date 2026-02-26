import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export function AppHomePage() {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const signOut = useAuthStore((state) => state.signOut);

  return (
    <main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
      <h1>Workflow Tab</h1>
      <p>Signed in as {user?.email || 'unknown user'}.</p>
      <p>
        Name: {profile?.firstName || ''} {profile?.lastName || ''}
      </p>
      <p>
        <Link to="/app/settings">Go to User Settings</Link>
      </p>
      <button type="button" onClick={signOut}>
        Logout
      </button>
    </main>
  );
}
