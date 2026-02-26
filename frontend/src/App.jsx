import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { AppHomePage } from './pages/AppHomePage';
import { SettingsPage } from './pages/SettingsPage';
import { WorkflowCanvasPage } from './pages/WorkflowCanvasPage';
import { useAuthStore } from './stores/authStore';

export function AppRoutes() {
  const user = useAuthStore((state) => state.user);
  const hydrateSession = useAuthStore((state) => state.hydrateSession);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    if (!user) {
      return;
    }

    fetchProfile();
  }, [user, fetchProfile]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppHomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/workflows/:workflowId/canvas"
        element={
          <ProtectedRoute>
            <WorkflowCanvasPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to={user ? '/app' : '/login'} replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
