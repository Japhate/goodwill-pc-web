import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Unsubscribe from './pages/Unsubscribe';
import AdminSetup from './pages/AdminSetup';
import HeritageSealLoader from '@/components/HeritageSealLoader';
import PageLoadingScreen from '@/components/PageLoadingScreen';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();
  const location = useLocation();
  const isHomeRoute = location.pathname === '/' || location.pathname.toLowerCase() === `/${mainPageKey.toLowerCase()}`;

  // Show the branded loader while checking app public settings or auth.
  if (isLoadingPublicSettings || isLoadingAuth) {
    if (isHomeRoute) {
      return (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#f8f1e5]"
          role="status"
          aria-live="polite"
          aria-label="Loading homepage"
        >
          <div className="relative flex w-full max-w-sm flex-col items-center px-6 text-center">
            <div className="absolute h-56 w-56 rounded-full bg-amber-300/20 blur-3xl"></div>
            <HeritageSealLoader showText />
          </div>
        </div>
      );
    }

    return (
      <PageLoadingScreen fixed />
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
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/AdminSetup" element={<AdminSetup />} />
      <Route path="/Unsubscribe" element={<Unsubscribe />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
