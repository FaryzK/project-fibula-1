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
      <main className="auth-shell">
        <section className="auth-card">
          <span className="app-badge">AUTH</span>
          <h1>Project Fibula 1</h1>
          <p className="app-subtitle">Completing sign-in...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <span className="app-badge">FIBULA-1</span>
        <h1>Document Workflow Control</h1>
        <p className="app-subtitle">
          Sign in with Google to access workflow design, service nodes, and operations tabs.
        </p>
        <button type="button" onClick={signInWithGoogle}>
          Sign in with Google
        </button>
      </section>
    </main>
  );
}
