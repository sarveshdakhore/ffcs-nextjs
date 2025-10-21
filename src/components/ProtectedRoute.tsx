'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  showMessage?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  redirectTo = '/login',
  showMessage = false 
}: ProtectedRouteProps) {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!state.isAuthenticated && !state.isLoading) {
      if (showMessage) {
        alert('Please login to access this feature.');
      }
      router.push(redirectTo);
    }
  }, [state.isAuthenticated, state.isLoading, router, redirectTo, showMessage]);

  // Show loading while checking authentication
  if (state.isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated
  if (!state.isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

// Hook for checking auth in components
export function useAuthGuard() {
  const { state } = useAuth();
  const router = useRouter();

  const requireAuth = (callback?: () => void, message = 'Please login to access this feature.') => {
    if (!state.isAuthenticated) {
      alert(message);
      router.push('/login');
      return false;
    }
    if (callback) callback();
    return true;
  };

  return { requireAuth, isAuthenticated: state.isAuthenticated };
}
