import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export function ProtectedRoute({ children }) {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <span className="app-badge">SESSION</span>
          <h1>Project Fibula 1</h1>
          <p className="app-subtitle">Loading session...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
