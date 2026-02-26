import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export function ProtectedRoute({ children }) {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return (
      <main className="auth-shell">
        <section className="auth-layout">
          <div className="auth-hero">
            <span className="app-badge">SESSION</span>
            <h1>Project Fibula-1</h1>
            <p className="app-subtitle">Restoring your workspace session.</p>
          </div>
          <div className="auth-card">
            <span className="app-badge">Loading</span>
            <h2>Preparing your dashboard</h2>
            <p>Fetching workspace configuration and profile data.</p>
          </div>
        </section>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
