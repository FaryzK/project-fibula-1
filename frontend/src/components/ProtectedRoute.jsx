import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export function ProtectedRoute({ children }) {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return (
      <main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
        <h1>Project Fibula 1</h1>
        <p>Loading session...</p>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
