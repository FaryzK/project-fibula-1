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
        <section className="auth-layout">
          <div className="auth-hero">
            <span className="app-badge">FIBULA-1</span>
            <h1>Workflow-first ETL studio</h1>
            <p className="app-subtitle">Syncing your session...</p>
          </div>
          <div className="auth-card">
            <span className="app-badge">AUTH</span>
            <h2>Completing sign-in</h2>
            <p>Hold tight while we confirm your credentials.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <section className="auth-layout">
        <div className="auth-hero">
          <span className="app-badge">FIBULA-1</span>
          <h1>Document workflow control</h1>
          <p>
            Build, govern, and monitor document workflows across extraction, reconciliation, and
            exports.
          </p>
          <ul className="auth-list">
            <li>Canvas-based workflow design</li>
            <li>Service nodes for extractors and reconciliation</li>
            <li>Operational tabs for folders and mapping sets</li>
          </ul>
        </div>
        <div className="auth-card">
          <span className="app-badge">Secure access</span>
          <h2>Sign in to your workspace</h2>
          <p>Use Google authentication to continue to Project Fibula-1.</p>
          <button type="button" className="btn-primary" onClick={signInWithGoogle}>
            Sign in with Google
          </button>
        </div>
      </section>
    </main>
  );
}
