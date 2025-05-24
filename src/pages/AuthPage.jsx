import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FiUser, FiMail, FiLock, FiBriefcase, FiLogIn, FiUserPlus, FiLoader, FiEye, FiEyeOff } from "react-icons/fi";
import { useAuth } from "../contexts/AuthContext";

const AuthPage = () => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    organizationName: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [shake, setShake] = useState(false);
  const navigate = useNavigate();
  const { login, register, error, currentUser, loading: authLoading } = useAuth();
  
  // Check if user is already logged in and redirect if needed
  useEffect(() => {
    if (!authLoading && currentUser) {
      console.log("User already logged in, checking for redirect");
      
      // Check if there's a pending LinkedIn connection to complete
      const pendingLinkedInState = sessionStorage.getItem('pendingLinkedInState');
      const pendingLinkedInCode = sessionStorage.getItem('pendingLinkedInCode');
      
      if (pendingLinkedInState && pendingLinkedInCode) {
        console.log("Found pending LinkedIn connection with code and state, redirecting to process it");
        // Construct a URL to the social dashboard with the LinkedIn parameters
        const linkedInRedirectUrl = `/social-dashboard?code=${pendingLinkedInCode}&state=${pendingLinkedInState}`;
        
        // Clear the pending LinkedIn data
        sessionStorage.removeItem('pendingLinkedInState');
        sessionStorage.removeItem('pendingLinkedInCode');
        
        // Redirect to process the LinkedIn connection
        navigate(linkedInRedirectUrl);
        return;
      } else if (pendingLinkedInState) {
        console.log("Found pending LinkedIn state, redirecting to complete connection");
        // Construct a URL to the social dashboard with the LinkedIn parameters
        const linkedInRedirectUrl = `/social-dashboard?linkedin_connected=true&state=${pendingLinkedInState}`;
        
        // Clear the pending LinkedIn state
        sessionStorage.removeItem('pendingLinkedInState');
        
        // Redirect to complete the LinkedIn connection
        navigate(linkedInRedirectUrl);
        return;
      }
      
      // Check if there's a saved redirect path
      const redirectPath = sessionStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        console.log(`Redirecting to saved path: ${redirectPath}`);
        sessionStorage.removeItem('redirectAfterLogin'); // Clear the saved path
        navigate(redirectPath);
      } else {
        // Default redirect to dashboard
        console.log("No saved redirect path, going to dashboard");
        navigate('/social-dashboard');
      }
    }
  }, [currentUser, authLoading, navigate]);

  const pageVariants = {
    initial: { opacity: 0 },
    in: { opacity: 1 },
    out: { opacity: 0 },
  };

  const cardVariants = {
    initial: { opacity: 0, y: 30, scale: 0.98 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        type: "spring",
        stiffness: 100,
        damping: 15,
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    initial: { y: 20, opacity: 0 },
    animate: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
      },
    },
    exit: {
      y: -20,
      opacity: 0,
      transition: {
        duration: 0.2,
      },
    },
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const toggleMode = (mode) => {
    setIsLoginMode(mode);
    setFormData({
      fullName: "",
      email: mode ? formData.email : "", // Keep email if switching from register to login
      organizationName: "",
      password: "",
    });
  };

  // Function to use test credentials for easier testing
  const useTestCredentials = () => {
    setFormData({
      ...formData,
      email: "test@socialsync.com",
      password: "Test123456",
      fullName: isLoginMode ? formData.fullName : "Test User",
      organizationName: isLoginMode ? formData.organizationName : "Test Organization"
    });
    toast.info("Test credentials loaded. Click Login/Register to continue.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const { fullName, email, organizationName, password } = formData;

    if (isLoginMode) {
      if (!email || !password) {
        toast.error("Email and Password are required for login.");
        triggerShake();
        setIsLoading(false);
        return;
      }
      try {
        console.log("Attempting login with:", { email, password: "[REDACTED]" });
        await login(email, password);
        toast.success("Login successful!");
        
        // Check if there's a pending LinkedIn connection to complete
        const pendingLinkedInState = sessionStorage.getItem('pendingLinkedInState');
        const pendingLinkedInCode = sessionStorage.getItem('pendingLinkedInCode');
        
        // Redirect after a short delay to allow the toast to be seen
        setTimeout(() => {
          if (pendingLinkedInState && pendingLinkedInCode) {
            console.log("Found pending LinkedIn connection with code and state, redirecting to process it");
            // Construct a URL to the social dashboard with the LinkedIn parameters
            const linkedInRedirectUrl = `/social-dashboard?code=${pendingLinkedInCode}&state=${pendingLinkedInState}`;
            
            // Clear the pending LinkedIn data
            sessionStorage.removeItem('pendingLinkedInState');
            sessionStorage.removeItem('pendingLinkedInCode');
            
            // Redirect to process the LinkedIn connection
            navigate(linkedInRedirectUrl);
          } else if (pendingLinkedInState) {
            console.log("Found pending LinkedIn state, redirecting to complete connection");
            // Construct a URL to the social dashboard with the LinkedIn parameters
            const linkedInRedirectUrl = `/social-dashboard?linkedin_connected=true&state=${pendingLinkedInState}`;
            
            // Clear the pending LinkedIn state
            sessionStorage.removeItem('pendingLinkedInState');
            
            // Redirect to complete the LinkedIn connection
            navigate(linkedInRedirectUrl);
          } else {
            // Check if there's a saved redirect path
            const redirectPath = sessionStorage.getItem('redirectAfterLogin');
            
            if (redirectPath) {
              console.log(`Redirecting to saved path after login: ${redirectPath}`);
              sessionStorage.removeItem('redirectAfterLogin'); // Clear the saved path
              navigate(redirectPath);
            } else {
              // Default redirect to dashboard
              navigate("/social-dashboard");
            }
          }
        }, 1500);
      } catch (err) {
        console.error("Login error details:", err);
        // Handle specific Firebase errors
        if (err.code === "auth/invalid-credential") {
          toast.error("Invalid email or password. Please check your credentials or register if you don't have an account.");
        } else if (err.code === "auth/configuration-not-found") {
          toast.error("Authentication service is misconfigured. Please contact support.");
        } else {
          toast.error(err.message || "Login failed. Please check your credentials.");
        }
        triggerShake();
      } finally {
        setIsLoading(false);
      }
    } else {
      // Registration mode
      if (!fullName || !email || !organizationName || !password) {
        toast.error("All fields are required for registration.");
        triggerShake();
        setIsLoading(false);
        return;
      }
      if (password.length < 6) {
        toast.error("Password must be at least 6 characters long.");
        triggerShake();
        setIsLoading(false);
        return;
      }
      try {
        await register(email, password, fullName, organizationName);
        toast.success("Registration successful! Please login to continue.");
        setIsLoginMode(true);
        setFormData({
          ...formData,
          password: "",
        });
      } catch (err) {
        if (err.code === "auth/email-already-in-use") {
          toast.error("Email is already in use. Please login instead.");
        } else {
          toast.error(err.message || "Registration failed. Please try again.");
        }
        triggerShake();
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-4 relative" /* Added relative position to fix framer-motion warning */
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
    >
      <ToastContainer position="top-center" autoClose={3000} />

      <motion.div
        className={`w-full max-w-md ${shake ? "animate-form-shake" : ""}`}
        variants={cardVariants}
        initial="initial"
        animate="animate"
      >
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-sky-500 transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>

            <div className="relative bg-white rounded-lg px-4 py-5 sm:p-6">
              <div className="flex items-center justify-center h-12 bg-gray-100 rounded-full p-1 mb-6">
                <div className="relative w-full h-full rounded-full">
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-300 ease-in-out"
                    style={{
                      transform: isLoginMode ? "translateX(0)" : "translateX(100%)",
                      width: "50%",
                    }}
                  />
                  <div className="relative flex h-full">
                    <button
                      type="button"
                      className={`flex-1 flex items-center justify-center text-sm font-medium transition-colors duration-300 ${isLoginMode ? "text-white" : "text-gray-700"}`}
                      onClick={() => toggleMode(true)}
                    >
                      <FiLogIn className="mr-2" /> Sign In
                    </button>
                    <button
                      type="button"
                      className={`flex-1 flex items-center justify-center text-sm font-medium transition-colors duration-300 ${!isLoginMode ? "text-white" : "text-gray-700"}`}
                      onClick={() => toggleMode(false)}
                    >
                      <FiUserPlus className="mr-2" /> Register
                    </button>
                  </div>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
                {isLoginMode ? "Welcome Back!" : "Create an Account"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <AnimatePresence mode="wait">
                  {!isLoginMode && (
                    <motion.div
                      key="fullName"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="relative">
                        <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          name="fullName"
                          id="fullName"
                          placeholder="Full Name"
                          value={formData.fullName}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {!isLoginMode && (
                    <motion.div
                      key="organizationName"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="relative">
                        <FiBriefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          name="organizationName"
                          id="organizationName"
                          placeholder="Organization Name"
                          value={formData.organizationName}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    id="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    id="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>

                {isLoginMode && (
                  <div className="flex justify-end">
                    <Link
                      to="/forgot-password"
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      Forgot password?
                    </Link>
                  </div>
                )}

                {/* Test Credentials Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={useTestCredentials}
                    className="w-full flex justify-center items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    <FiUser className="mr-2" /> Use Test Credentials
                  </button>
                  <p className="text-xs text-gray-500 mt-1 text-center">For testing purposes only</p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  {isLoading ? (
                    <>
                      <FiLoader className="animate-spin mr-2" />
                      {isLoginMode ? "Signing in..." : "Creating account..."}
                    </>
                  ) : (
                    <>
                      {isLoginMode ? "Sign in" : "Create account"}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </motion.div>

      {/* This style tag is for the custom shake animation */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes formShake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-form-shake {
          animation: formShake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}} />
    </motion.div>
  );
};

export default AuthPage;
