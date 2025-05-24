// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, setPersistence, browserLocalPersistence } from 'firebase/auth';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB6g3yzKk54aH1WM3BGhS-sT6fWuppdOF0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "socialsync-ai.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "socialsync-ai",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "socialsync-ai.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef1234567890",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Print Firebase configuration for debugging
console.log('Firebase configuration:', {
  apiKey: firebaseConfig.apiKey ? '✓ Set' : '✗ Missing',
  authDomain: firebaseConfig.authDomain ? '✓ Set' : '✗ Missing',
  projectId: firebaseConfig.projectId ? '✓ Set' : '✗ Missing',
  storageBucket: firebaseConfig.storageBucket ? '✓ Set' : '✗ Missing',
  messagingSenderId: firebaseConfig.messagingSenderId ? '✓ Set' : '✗ Missing',
  appId: firebaseConfig.appId ? '✓ Set' : '✗ Missing'
});

// Validate Firebase configuration
const validateConfig = () => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId'];
  const missingFields = requiredFields.filter(field => !firebaseConfig[field]);
  
  if (missingFields.length > 0) {
    console.error(`Firebase initialization error: Missing required fields: ${missingFields.join(', ')}`);
    console.error('Please check your .env file and ensure all Firebase configuration variables are set correctly.');
    return false;
  }
  return true;
};

// Initialize Firebase
let app;
let auth;

try {
  if (validateConfig()) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    
    // Set persistence to LOCAL to keep user logged in even when browser is closed
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        console.log('Firebase persistence set to LOCAL - user will stay logged in');
        
        // Add auth state change listener for debugging
        auth.onAuthStateChanged((user) => {
          if (user) {
            console.log('Firebase auth state changed: User is signed in', user.uid);
            // Check if token is valid by getting a fresh one
            user.getIdToken(true)
              .then(token => {
                console.log('Successfully refreshed token, length:', token.length);
              })
              .catch(error => {
                console.error('Error refreshing token:', error);
              });
          } else {
            console.log('Firebase auth state changed: User is signed out');
          }
        });
      })
      .catch((error) => {
        console.error('Error setting persistence:', error);
      });
    
    // Log successful initialization
    console.log('Firebase initialized successfully');
    console.log('Auth domain:', firebaseConfig.authDomain);
  } else {
    console.error('Firebase initialization skipped due to missing configuration');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

export { auth };
export default app;
