import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { WorkflowsPage } from './pages/WorkflowsPage';
import { DashboardPage } from './pages/DashboardPage';
import { SettingsPage } from './pages/SettingsPage';
import { WorkflowCanvasPage } from './pages/WorkflowCanvasPage';
import { ExtractorsListPage } from './pages/services/ExtractorsListPage';
import { ExtractorDetailPage } from './pages/services/ExtractorDetailPage';
import { DocumentFoldersListPage } from './pages/services/DocumentFoldersListPage';
import { DocumentFolderDetailPage } from './pages/services/DocumentFolderDetailPage';
import { SplittingPromptsListPage } from './pages/services/SplittingPromptsListPage';
import { SplittingPromptDetailPage } from './pages/services/SplittingPromptDetailPage';
import { CategorisationPromptsListPage } from './pages/services/CategorisationPromptsListPage';
import { CategorisationPromptDetailPage } from './pages/services/CategorisationPromptDetailPage';
import { DataMapperListPage } from './pages/services/DataMapperListPage';
import { DataMapSetDetailPage } from './pages/services/DataMapSetDetailPage';
import { DataMapRuleDetailPage } from './pages/services/DataMapRuleDetailPage';
import { ReconciliationListPage } from './pages/services/ReconciliationListPage';
import { ReconciliationDetailPage } from './pages/services/ReconciliationDetailPage';
import { useAuthStore } from './stores/authStore';

export function AppRoutes() {
  const user = useAuthStore((state) => state.user);
  const hydrateSession = useAuthStore((state) => state.hydrateSession);
  const startAuthListener = useAuthStore((state) => state.startAuthListener);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    const unsubscribe = startAuthListener();
    return () => {
      unsubscribe();
    };
  }, [startAuthListener]);

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
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="workflows" element={<WorkflowsPage />} />
        <Route path="services/extractors" element={<ExtractorsListPage />} />
        <Route path="services/extractors/new" element={<ExtractorDetailPage />} />
        <Route path="services/extractors/:extractorId" element={<ExtractorDetailPage />} />
        <Route path="services/document-folders" element={<DocumentFoldersListPage />} />
        <Route path="services/document-folders/new" element={<DocumentFolderDetailPage />} />
        <Route path="services/document-folders/:folderId" element={<DocumentFolderDetailPage />} />
        <Route path="services/document-splitting" element={<SplittingPromptsListPage />} />
        <Route path="services/document-splitting/new" element={<SplittingPromptDetailPage />} />
        <Route path="services/document-splitting/:promptId" element={<SplittingPromptDetailPage />} />
        <Route path="services/document-categorisation" element={<CategorisationPromptsListPage />} />
        <Route path="services/document-categorisation/new" element={<CategorisationPromptDetailPage />} />
        <Route path="services/document-categorisation/:promptId" element={<CategorisationPromptDetailPage />} />
        <Route path="services/data-mapper" element={<DataMapperListPage />} />
        <Route path="services/data-mapper/sets/new" element={<DataMapSetDetailPage />} />
        <Route path="services/data-mapper/sets/:setId" element={<DataMapSetDetailPage />} />
        <Route path="services/data-mapper/rules/new" element={<DataMapRuleDetailPage />} />
        <Route path="services/data-mapper/rules/:ruleId" element={<DataMapRuleDetailPage />} />
        <Route path="services/reconciliation" element={<ReconciliationListPage />} />
        <Route path="services/reconciliation/new" element={<ReconciliationDetailPage />} />
        <Route path="services/reconciliation/:ruleId" element={<ReconciliationDetailPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
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
