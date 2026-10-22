import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ApplicantDashboard } from './pages/ApplicantDashboard';
import { NewApplicationWizard } from './pages/NewApplicationWizard';
import { ApplicantDossierPage } from './pages/ApplicantDossierPage';
import { OfficerQueuePage } from './pages/OfficerQueuePage';
import { ThreePanelReviewWorkspace } from './pages/ThreePanelReviewWorkspace';
import { CompliancePage } from './pages/CompliancePage';
import { AdminAuditPage } from './pages/AdminAuditPage';

// Protected Route wrapper with role requirement
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: string[];
}> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400 text-sm">
        Authenticating...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex-1 max-w-xl mx-auto p-12 text-center">
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-500 mt-2">
          Your current role (<strong>{user.role}</strong>) does not have authorization to view this
          section. Switch your persona in the top navigation bar to test this role.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
          <Navbar />
          <main className="flex-1 flex flex-col">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Applicant Portal */}
              <Route
                path="/applicant"
                element={
                  <ProtectedRoute allowedRoles={['applicant', 'admin']}>
                    <ApplicantDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/applicant/new"
                element={
                  <ProtectedRoute allowedRoles={['applicant', 'admin']}>
                    <NewApplicationWizard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/applicant/dossier/:id"
                element={
                  <ProtectedRoute>
                    <ApplicantDossierPage />
                  </ProtectedRoute>
                }
              />

              {/* Verification Officer Workspace */}
              <Route
                path="/officer/queue"
                element={
                  <ProtectedRoute allowedRoles={['officer', 'admin', 'auditor']}>
                    <OfficerQueuePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/officer/review/:id"
                element={
                  <ProtectedRoute allowedRoles={['officer', 'admin', 'auditor']}>
                    <ThreePanelReviewWorkspace />
                  </ProtectedRoute>
                }
              />

              {/* Compliance Governance */}
              <Route
                path="/compliance"
                element={
                  <ProtectedRoute allowedRoles={['compliance', 'admin', 'auditor']}>
                    <CompliancePage />
                  </ProtectedRoute>
                }
              />

              {/* Admin & Quality Audit */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'auditor']}>
                    <AdminAuditPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
