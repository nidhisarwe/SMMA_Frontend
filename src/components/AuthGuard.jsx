// src/components/AuthGuard.jsx
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * AuthGuard component that protects routes from unauthenticated access
 * This is a more robust version of ProtectedRoute that handles loading states
 * and preserves the full URL (including search params) for redirect after login
 */
const AuthGuard = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Only set isChecking to false once we've confirmed auth state
    if (!loading) {
      setIsChecking(false);
    }
  }, [loading]);

  useEffect(() => {
    // If user is not authenticated and not in loading state, save the current path
    if (!loading && !currentUser) {
      console.log("AuthGuard: Saving current path for redirect after login:", 
        location.pathname + location.search);
      
      // Save the full URL including search params
      sessionStorage.setItem('redirectAfterLogin', 
        location.pathname + location.search);
    }
  }, [currentUser, loading, location]);

  // Show loading indicator while checking authentication
  if (loading || isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Redirect to landing page if user is not authenticated
  if (!currentUser) {
    console.log("AuthGuard: User not authenticated, redirecting to landing page");
    return <Navigate to="/" replace />;
  }

  // User is authenticated, render the protected content
  return children;
};

export default AuthGuard;
