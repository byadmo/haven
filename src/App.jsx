import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Outlet, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Dashboard from '@/pages/Dashboard';
import FinancialDashboard from '@/pages/finance/FinancialDashboard';
import FinancialAllocation from '@/pages/finance/FinancialAllocation';
import Splash from '@/pages/Splash';
import Hub from '@/pages/Hub';
import { EduLayout } from '@/lib/eduSyncContext';
import EduHome from '@/pages/edu/EduHome';
import EduFocusHub from '@/pages/edu/EduFocusHub';
import EduVault from '@/pages/edu/EduVault';
import EduSettings from '@/pages/edu/EduSettings';
import EduTimer from '@/pages/edu/EduTimer';
import RecurringBills from '@/pages/RecurringBills';
import Goals from '@/pages/Goals';
import Debts from '@/pages/Debts';
import CreditUtilization from '@/pages/CreditUtilization';
import Accounts from '@/pages/Accounts';
import Transactions from '@/pages/Transactions';
import Setup from '@/pages/Setup';
import Settings from '@/pages/Settings';
import ProtectedRoute from '@/components/ProtectedRoute';
import { FinanceLayout } from '@/lib/FinanceDataContext';
import OnboardingGate from '@/components/onboarding/OnboardingGate';
import KeepAliveOutlet from '@/components/finance/KeepAliveOutlet';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import { SIProvider } from '@/lib/SIContext';
import { SILayout } from '@/lib/SILayout';
import { GrowthProvider } from '@/lib/GrowthContext';
import SIDashboard from '@/pages/growth/SIDashboard';
import HabitsPage from '@/pages/growth/HabitsPage';
import StreaksPage from '@/pages/growth/StreaksPage';
import JournalPage from '@/pages/growth/JournalPage';
import SIAnalyticsPage from '@/pages/growth/SIAnalyticsPage';
import GrowthSettingsPage from '@/pages/growth/GrowthSettingsPage';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Splash />} />}>
        <Route path="/" element={<Hub />} />
        <Route element={<EduLayout />}>
                  <Route path="/education" element={<EduHome />} />
                  <Route path="/education/focus" element={<EduFocusHub />} />
                  <Route path="/education/vault" element={<EduVault />} />
                  <Route path="/education/settings" element={<EduSettings />} />
                  <Route path="/education/courses" element={<Navigate to="/education/vault" replace />} />
                  <Route path="/education/schedule" element={<Navigate to="/education/focus" replace />} />
                  <Route path="/education/timer" element={<EduTimer />} />
                  <Route path="/education/grades" element={<Navigate to="/education/vault" replace />} />
                  <Route path="/education/analytics" element={<Navigate to="/education/vault" replace />} />
                </Route>
        <Route element={<FinanceLayout />}>
          <Route element={<OnboardingGate><KeepAliveOutlet /></OnboardingGate>}>
            <Route path="/overview" element={<FinancialDashboard />} />
                        <Route path="/allocation" element={<FinancialAllocation />} />
                        <Route path="/goals" element={<Goals />} />
                        <Route path="/debts" element={<Debts />} />
                        <Route path="/insights" element={<Navigate to="/allocation" replace />} />
                        <Route path="/forecast" element={<Navigate to="/overview" replace />} />
                        <Route path="/budgeting" element={<Navigate to="/allocation" replace />} />
                        <Route path="/cashflow" element={<Navigate to="/overview" replace />} />
                                    <Route path="/accounts" element={<Accounts />} />
                                    <Route path="/transactions" element={<Transactions />} />
                                    <Route path="/recurring-bills" element={<RecurringBills />} />
                                    <Route path="/credit-utilization" element={<CreditUtilization />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="/setup" element={<Setup />} />
        </Route>
        <Route element={<SIProvider><SILayout /></SIProvider>}>
                  <Route element={<GrowthProvider><Outlet /></GrowthProvider>}>
                    <Route path="/growth" element={<SIDashboard />} />
                    <Route path="/growth/habits" element={<HabitsPage />} />
                    <Route path="/growth/streaks" element={<StreaksPage />} />
                    <Route path="/growth/journal" element={<JournalPage />} />
                    <Route path="/growth/analytics" element={<SIAnalyticsPage />} />
                    <Route path="/growth/settings" element={<GrowthSettingsPage />} />
                  </Route>
                </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App