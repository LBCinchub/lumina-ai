import React, { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from '@/lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppShell from '@/components/layout/AppShell';
import { base44 } from '@/api/base44Client';

// Lazy-loaded pages (code-split per workspace).
const Converse = lazy(() => import('@/pages/Converse'));
const Build = lazy(() => import('@/pages/Build'));
const KnowledgeSources = lazy(() => import('@/pages/KnowledgeSources'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const LBCCommandCenter = lazy(() => import('@/pages/LBCCommandCenter'));
const Pricing = lazy(() => import('@/pages/Pricing'));

const Loading = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

// Server-verified admin gate for the Operations workspace. Founder-only gating
// remains enforced inside the backend functions; the client only checks the
// user role (no founder PII in client source).
function AdminGate({ children }) {
  const [state, setState] = React.useState('loading');
  React.useEffect(() => {
    base44.auth.me()
      .then(u => setState(u?.role === 'admin' ? 'allowed' : 'denied'))
      .catch(() => setState('denied'));
  }, []);
  if (state === 'loading') return <Loading />;
  if (state === 'denied') return <Navigate to="/" replace />;
  return children;
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <Loading />;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Converse />} />
          <Route path="/build" element={<Build />} />
          <Route path="/knowledge" element={<KnowledgeSources />} />
          <Route path="/projects" element={<Dashboard />} />
          <Route path="/operations" element={<AdminGate><LBCCommandCenter /></AdminGate>} />
          <Route path="/pricing" element={<Pricing />} />

          {/* Legacy route consolidation redirects */}
          <Route path="/context" element={<Navigate to="/knowledge" replace />} />
          <Route path="/twin" element={<Navigate to="/knowledge" replace />} />
          <Route path="/insights" element={<Navigate to="/knowledge" replace />} />
          <Route path="/resources" element={<Navigate to="/knowledge" replace />} />
          <Route path="/dashboard" element={<Navigate to="/projects" replace />} />
          <Route path="/github" element={<Navigate to="/operations" replace />} />
          <Route path="/vps" element={<Navigate to="/operations" replace />} />
          <Route path="/deploy" element={<Navigate to="/operations" replace />} />
          <Route path="/lbc-command-center" element={<Navigate to="/operations" replace />} />
          <Route path="/lbc-deployment" element={<Navigate to="/operations" replace />} />
          <Route path="/pulse" element={<Navigate to="/knowledge" replace />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;