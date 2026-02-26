import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export function LoginPage() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);

  if (user) {
    return <Navigate to="/app" replace />;
  }

  if (isLoading) {
    return (
      <main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
        <h1>Project Fibula 1</h1>
        <p>Completing sign-in...</p>
      </main>
    );
  }

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
