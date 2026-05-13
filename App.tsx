/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useEffect, useState } from 'react';
import { AppProvider } from './context';
import { Layout } from './components/Layout';
import { Page } from './types';
import { useAppContext } from './context';
import { canAccessPage } from './permissions';
import { Toaster } from 'sonner';

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Plan2D = lazy(() => import('./pages/Plan2D').then(m => ({ default: m.Plan2D })));
const Kanban = lazy(() => import('./pages/Kanban').then(m => ({ default: m.Kanban })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Budget = lazy(() => import('./pages/Budget').then(m => ({ default: m.Budget })));
const Documents = lazy(() => import('./pages/Documents').then(m => ({ default: m.Documents })));
const Discussions = lazy(() => import('./pages/Discussions').then(m => ({ default: m.Discussions })));
const Polls = lazy(() => import('./pages/Polls').then(m => ({ default: m.Polls })));
const Planning = lazy(() => import('./pages/Planning').then(m => ({ default: m.Planning })));

function PageLoader() {
  return <div className="h-full flex items-center justify-center text-sm text-gray-500">Chargement du module…</div>;
}

function AppContent() {
  const { state } = useAppContext();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  useEffect(() => {
    if (state.user && !canAccessPage(state.user, currentPage)) {
      setCurrentPage('dashboard');
    }
  }, [state.user, currentPage]);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentPage} />;
      case 'plan': return <Plan2D />;
      case 'kanban': return <Kanban />;
      case 'settings': return <Settings />;
      case 'budget': return <Budget onNavigate={setCurrentPage} />;
      case 'ged': return <Documents />;
      case 'discussions': return <Discussions />;
      case 'polls': return <Polls />;
      case 'planning': return <Planning />;
      default: return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      <Toaster position="top-right" richColors />
      <Suspense fallback={<PageLoader />}>{renderPage()}</Suspense>
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

