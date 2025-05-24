// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useEffect } from "react";

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();
  
  useEffect(() => {
    // If user is not authenticated and not in loading state, save the current path
    if (!loading && !currentUser) {
      console.log("Saving current path for redirect after login:", location.pathname);
      sessionStorage.setItem('redirectAfterLogin', location.pathname + location.search);
    }
  }, [currentUser, loading, location]);
  
  // Show loading indicator while checking authentication
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
  }
  
  // Redirect to auth page if user is not authenticated
  if (!currentUser) {
    return <Navigate to="/auth" replace />;
  }
  
  return children;
};

export default ProtectedRoute;