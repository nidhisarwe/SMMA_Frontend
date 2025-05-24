// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from "firebase/auth";
import { auth } from "../firebase/config";
import api from "../utils/api";

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Register new user
  const register = async (email, password, fullName, organizationName) => {
    try {
      setError(null);
      console.log("Starting registration process...");
      
      // Create user in Firebase
      console.log("Creating user in Firebase...");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      console.log("Firebase user created successfully:", firebaseUser.uid);
      
      // Update Firebase profile with display name
      console.log("Updating Firebase profile with display name...");
      await updateProfile(firebaseUser, {
        displayName: fullName
      });
      console.log("Firebase profile updated successfully");
      
      // Get Firebase token
      console.log("Getting Firebase token...");
      const token = await firebaseUser.getIdToken(true);
      console.log("Firebase token obtained");
      
      // Create user in your backend database
      console.log("Registering user with backend...");
      try {
        const response = await api.post('/auth/firebase-auth', {
          token: token
        });
        console.log("Backend registration successful:", response.data);
      } catch (backendError) {
        console.error("Backend registration failed, but Firebase registration succeeded:", backendError);
        // Continue anyway since Firebase auth succeeded
      }
      
      return firebaseUser;
    } catch (error) {
      console.error("Registration error:", error);
      setError(error);
      throw error;
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      setError(null);
      console.log("Starting login process...");
      
      // Sign in with Firebase
      console.log("Signing in with Firebase...");
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      console.log("Firebase login successful:", firebaseUser.uid);
      
      // Get Firebase token
      console.log("Getting Firebase token...");
      const token = await firebaseUser.getIdToken(true);
      console.log("Firebase token obtained");
      
      // Authenticate with your backend
      console.log("Authenticating with backend...");
      try {
        const response = await api.post('/auth/firebase-auth', {
          token: token
        });
        console.log("Backend authentication successful:", response.data);
      } catch (backendError) {
        console.error("Backend authentication failed, but Firebase login succeeded:", backendError);
        // Continue anyway since Firebase auth succeeded
      }
      
      // Check if there's a pending LinkedIn connection to complete
      const pendingLinkedInState = sessionStorage.getItem('pendingLinkedInState');
      if (pendingLinkedInState) {
        console.log('Found pending LinkedIn connection, will complete after login');
        // We'll handle this in the useEffect after the user is fully authenticated
      }
      
      return firebaseUser;
    } catch (error) {
      console.error("Login error:", error);
      setError(error);
      throw error;
    }
  };

  // Logout user
  const logout = async (redirectToLanding = true) => {
    try {
      setError(null);
      console.log("Logging out...");
      
      // Clear all session and local storage
      sessionStorage.clear();
      localStorage.clear();
      
      // Clear any API tokens or cookies
      try {
        // Call backend logout endpoint if available
        await api.post('/auth/logout');
        console.log("Backend logout successful");
      } catch (backendError) {
        console.log("Backend logout failed or not implemented, continuing with Firebase logout");
      }
      
      // Sign out from Firebase
      await signOut(auth);
      console.log("Firebase logout successful");
      
      // Force clear the current user state
      setCurrentUser(null);
      
      // Redirect to landing page if requested
      if (redirectToLanding) {
        console.log("Redirecting to landing page after logout");
        window.location.href = '/';
      }
      
      console.log("Logout process completed");
    } catch (error) {
      console.error("Logout error:", error);
      setError(error);
      throw error;
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      setError(null);
      console.log("Sending password reset email...");
      await sendPasswordResetEmail(auth, email);
      console.log("Password reset email sent successfully");
    } catch (error) {
      console.error("Password reset error:", error);
      setError(error);
      throw error;
    }
  };

  // Get current user token
  const getIdToken = async () => {
    if (currentUser) {
      try {
        console.log("Getting fresh ID token...");
        return await currentUser.getIdToken(true);
      } catch (error) {
        console.error("Error getting ID token:", error);
        return null;
      }
    }
    return null;
  };

  // Update user profile
  const updateUserProfile = async (profileData) => {
    try {
      setError(null);
      
      if (currentUser) {
        // Update Firebase profile if needed
        if (profileData.displayName) {
          console.log("Updating Firebase profile...");
          await updateProfile(currentUser, {
            displayName: profileData.displayName
          });
          console.log("Firebase profile updated successfully");
        }
        
        // Update backend profile
        console.log("Updating backend profile...");
        try {
          const response = await api.put('/auth/me', profileData);
          console.log("Backend profile updated successfully:", response.data);
        } catch (backendError) {
          console.error("Backend profile update failed:", backendError);
          // Continue anyway since Firebase profile update succeeded
        }
      }
    } catch (error) {
      console.error("Profile update error:", error);
      setError(error);
      throw error;
    }
  };

  useEffect(() => {
    console.log("Setting up auth state change listener...");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        console.log("Auth state changed:", user ? `User: ${user.uid}` : "No user");
        
        if (user) {
          // User is signed in, sync with backend
          console.log("User is signed in, syncing with backend...");
          try {
            const token = await user.getIdToken(true);
            const response = await api.post('/auth/firebase-auth', {
              token: token
            });
            console.log("Backend sync successful:", response.data);
            
            // Check if there's a pending LinkedIn connection to complete
            const pendingLinkedInState = sessionStorage.getItem('pendingLinkedInState');
            if (pendingLinkedInState) {
              console.log('Found pending LinkedIn connection, completing now...');
              try {
                // Complete the LinkedIn connection
                const linkedInResponse = await api.post('/linkedin/complete-connection', { 
                  state: pendingLinkedInState 
                });
                console.log('LinkedIn connection completed successfully:', linkedInResponse.data);
                // Clear the pending state
                sessionStorage.removeItem('pendingLinkedInState');
                
                // Check if we need to redirect to a specific page
                const linkedInReturnUrl = sessionStorage.getItem('linkedInReturnUrl');
                if (linkedInReturnUrl) {
                  console.log('Redirecting to saved LinkedIn return URL:', linkedInReturnUrl);
                  sessionStorage.removeItem('linkedInReturnUrl');
                  window.location.href = linkedInReturnUrl;
                  // Set current user after everything is done
                  setCurrentUser(user);
                  setLoading(false);
                  return; // Exit early since we're redirecting
                }
              } catch (linkedInError) {
                console.error('Error completing pending LinkedIn connection:', linkedInError);
                // Clear the pending state to avoid infinite loop
                sessionStorage.removeItem('pendingLinkedInState');
              }
            }
            
            // Handle redirect after login if needed
            const redirectPath = sessionStorage.getItem('redirectAfterLogin');
            if (redirectPath && window.location.pathname === '/auth') {
              console.log('Redirecting to saved path after login:', redirectPath);
              sessionStorage.removeItem('redirectAfterLogin');
              window.location.href = redirectPath;
              // Set current user after everything is done
              setCurrentUser(user);
              setLoading(false);
              return; // Exit early since we're redirecting
            }
          } catch (backendError) {
            console.error("Backend sync failed, but user is still authenticated in Firebase:", backendError);
            // Continue anyway since Firebase auth is valid
          }
        }
        
        // Set current user state after all processing
        setCurrentUser(user);
      } catch (error) {
        console.error("Auth state change error:", error);
        setError(error);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    error,
    register,
    login,
    logout,
    resetPassword,
    getIdToken,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};