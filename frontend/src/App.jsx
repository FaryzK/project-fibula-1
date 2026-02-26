import React from 'react';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';

export function App() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const hydrateSession = useAuthStore((state) => state.hydrateSession);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);
  const signOut = useAuthStore((state) => state.signOut);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  if (isLoading) {
    return (
      <main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
        <h1>Project Fibula 1</h1>
        <p>Loading session...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
        <h1>Project Fibula 1</h1>
        <p>Sign in to access your workflows and document services.</p>
        <button type="button" onClick={signInWithGoogle}>
          Sign in with Google
        </button>
      </main>
    );
  }

  return (
    <main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
      <h1>Project Fibula 1</h1>
      <p>Signed in as {user.email || 'unknown user'}.</p>
      <button type="button" onClick={signOut}>
        Logout
      </button>
    </main>
  );
}
