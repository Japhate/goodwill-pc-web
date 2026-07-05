import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import PageLoadingScreen from '@/components/PageLoadingScreen';

const DefaultFallback = () => (
  <PageLoadingScreen fixed label="Loading protected page" />
);

const DefaultUnauthenticated = () => null;

export default function ProtectedRoute({
  fallback = <DefaultFallback />,
  unauthenticatedElement = <DefaultUnauthenticated />,
}) {
  const { isAuthenticated, isLoadingAuth, authChecked, authError } = useAuth();

  if (isLoadingAuth || !authChecked) {
    return fallback;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    return unauthenticatedElement;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement;
  }

  return <Outlet />;
}
