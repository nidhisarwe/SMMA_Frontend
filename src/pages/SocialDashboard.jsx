// SocialDashboard.jsx - Complete LinkedIn connection flow
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import {
  FaInstagram,
  FaFacebook,
  FaLinkedin,
  FaPen,
  FaCalendarAlt,
  FaQuestionCircle,
  FaCheck,
  FaPlus,
  FaTimes,
  FaSpinner,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";

const SocialDashboard = () => {
  const [linkedInAuthUrl, setLinkedInAuthUrl] = useState("");
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [showAccountTypeSelector, setShowAccountTypeSelector] = useState(false);
  const [selectedAccountType, setSelectedAccountType] = useState("personal");
  const [disconnecting, setDisconnecting] = useState(null);
  const [linkedInState, setLinkedInState] = useState("");
  const [greeting, setGreeting] = useState("Good Day");
  
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, loading: authLoading } = useAuth();

  // Dynamic greeting based on time of day
  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) {
        setGreeting("Good Morning");
      } else if (hour < 17) {
        setGreeting("Good Afternoon");
      } else {
        setGreeting("Good Evening");
      }
    };
    updateGreeting();
    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate('/auth');
      return;
    }
  }, [currentUser, authLoading, navigate]);

  const fetchConnectedAccounts = async () => {
    try {
      if (!currentUser) {
        console.log("No current user, cannot fetch accounts");
        return;
      }

      console.log("🔄 Fetching connected accounts for authenticated user...");
      
      const response = await api.get("/linkedin/accounts");
      
      console.log("✅ Connected accounts response:", response.data);
      setConnectedAccounts(response.data?.accounts || []);
      
      console.log(`📊 Found ${response.data?.accounts?.length || 0} connected accounts for current user`);
      
    } catch (error) {
      console.error("❌ Error fetching connected accounts:", error);
      if (error.response?.status === 401) {
        setError("Authentication issue. Please refresh the page.");
        setTimeout(() => setError(null), 5000);
      } else if (error.response?.status === 403) {
        setError("Access denied. Please ensure you're logged in with the correct account.");
      } else {
        setError("Failed to load connected accounts");
        console.error("Connected accounts error details:", error.response?.data);
      }
    }
  };

  const fetchInitialData = async (retryCount = 0) => {
    const maxRetries = 3;
    try {
      if (!currentUser) {
        console.log("No current user, cannot fetch initial data");
        setLoading(false);
        return;
      }

      console.log("🔄 Fetching LinkedIn auth URL...");
      
      const currentPage = window.location.href;
      console.log("Current page for return_to:", currentPage);
      
      const authUrlResponse = await api.get(`/linkedin/auth-url?return_to=${encodeURIComponent(currentPage)}`);
      
      console.log("✅ Auth URL response:", authUrlResponse.data);

      if (!authUrlResponse.data.authUrl) {
        throw new Error("No LinkedIn auth URL returned from server. Please check backend configuration.");
      }
      
      setLinkedInAuthUrl(authUrlResponse.data.authUrl);
      setLinkedInState(authUrlResponse.data.state);
      console.log("LinkedIn auth URL set:", authUrlResponse.data.authUrl);
      console.log("LinkedIn state set:", authUrlResponse.data.state);

      await fetchConnectedAccounts();
    } catch (error) {
      console.error("❌ Error fetching data:", error);
      let errorMessage = error.response?.data?.detail || error.message;
      if (error.response?.status === 500) {
        errorMessage = "Server error while fetching LinkedIn auth URL. Please try again or contact support.";
      } else if (error.response?.status === 401) {
        errorMessage = "Authentication error. Please refresh the page or log in again.";
      }
      
      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying fetchInitialData (attempt ${retryCount + 1})...`);
        setTimeout(() => fetchInitialData(retryCount + 1), 1000);
      } else {
        setError(`Failed to load dashboard: ${errorMessage}`);
      }
    } finally {
      if (retryCount === 0) {
        setLoading(false);
      }
    }
  };

  const handleLinkedInConnect = async (accountType = "personal") => {
    console.log("Starting LinkedIn connection process...");
    setError(null);
    
    if (!linkedInAuthUrl) {
      console.error("LinkedIn auth URL is missing");
      setError("LinkedIn authentication URL is not available. Please refresh the page or try again later.");
      return;
    }
    
    if (!currentUser) {
      console.error("No current user found when trying to connect LinkedIn");
      setError("Please log in first before connecting LinkedIn account.");
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      navigate('/auth');
      return;
    }
    
    try {
      const url = new URL(linkedInAuthUrl);
      url.searchParams.set("account_type", accountType);
      url.searchParams.set("state", linkedInState);
      
      sessionStorage.setItem('linkedInReturnUrl', window.location.href);
      
      console.log("🔗 Redirecting to LinkedIn auth:", url.toString());
      window.location.href = url.toString();
    } catch (err) {
      console.error("❌ Error in LinkedIn connection process:", err);
      setError("Failed to initiate LinkedIn connection. Please try again.");
    }
  };

  const handleAccountTypeSelect = (accountType) => {
    console.log(`Selected account type: ${accountType}`);
    setSelectedAccountType(accountType);
    setShowAccountTypeSelector(false);
    handleLinkedInConnect(accountType);
  };

  const handleDisconnect = async (accountId) => {
    if (disconnecting) return;

    try {
      setDisconnecting(accountId);
      console.log(`🔄 Disconnecting account ${accountId} for authenticated user...`);
      
      await api.delete(`/linkedin/accounts/${accountId}`);
      
      console.log("✅ Account disconnected successfully");
      setSuccessMessage("LinkedIn account disconnected successfully");
      setTimeout(() => setSuccessMessage(""), 5000);
      
      await fetchConnectedAccounts();
      
    } catch (error) {
      console.error("❌ Error disconnecting account:", error);
      if (error.response?.status === 401) {
        setError("Authentication issue. Please refresh the page.");
        setTimeout(() => setError(null), 5000);
      } else if (error.response?.status === 403) {
        setError("You don't have permission to disconnect this account.");
      } else if (error.response?.status === 404) {
        setError("Account not found or already disconnected.");
      } else {
        setError("Failed to disconnect account");
      }
    } finally {
      setDisconnecting(null);
    }
  };

  const handleConnect = (platform) => {
    if (!currentUser) {
      setError("Please log in first before connecting social accounts.");
      navigate('/auth');
      return;
    }
    
    setError(null);
    
    switch (platform) {
      case "linkedin":
        console.log("Opening LinkedIn account type selector");
        setShowAccountTypeSelector(true);
        break;
      case "facebook":
        setError("Facebook integration coming soon!");
        break;
      case "instagram":
        setError("Instagram integration coming soon!");
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const handleLinkedInCallback = async () => {
      const query = new URLSearchParams(location.search);
      const linkedinConnected = query.get('linkedin_connected');
      const state = query.get('state');
      const code = query.get('code');
      const linkedinError = query.get('linkedin_error');

      console.log("LinkedIn callback detected with params:", {
        linkedinConnected,
        state: state ? "[state present]" : "[no state]",
        code: code ? "[code present]" : "[no code]",
        linkedinError: linkedinError || "[no error]"
      });

      // Clear URL parameters to prevent issues on refresh
      const cleanupUrl = () => {
        window.history.replaceState({}, document.title, window.location.pathname);
      };

      if (linkedinError) {
        const errorMsg = decodeURIComponent(linkedinError);
        console.error(`LinkedIn connection error: ${errorMsg}`);
        setError(`LinkedIn connection failed: ${errorMsg}`);
        setTimeout(() => setError(null), 5000);
        cleanupUrl();
        return;
      }
      
      // If we have code and state but no user, save them and redirect to auth
      if ((code && state) && !currentUser) {
        console.log("LinkedIn OAuth callback detected but user not logged in");
        sessionStorage.setItem('pendingLinkedInCode', code);
        sessionStorage.setItem('pendingLinkedInState', state);
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        navigate('/auth');
        return;
      }
      
      // If we have code and state and user is logged in, process the callback
      if (code && state && currentUser) {
        console.log("Direct LinkedIn OAuth callback detected with code and state");
        try {
          const response = await api.post('/linkedin/callback', { code, state });
          console.log("LinkedIn OAuth callback processed successfully:", response.data);
          
          // Now complete the connection with the state
          const completeResponse = await api.post('/linkedin/complete-connection', { state });
          console.log("LinkedIn connection completed:", completeResponse.data);
          
          setSuccessMessage("LinkedIn account connected successfully!");
          setTimeout(() => setSuccessMessage(""), 5000);
          
          await fetchConnectedAccounts();
          
          cleanupUrl();
          return;
        } catch (error) {
          console.error("Error processing LinkedIn OAuth callback:", error);
          setError(`Failed to complete LinkedIn connection: ${error.response?.data?.detail || error.message}`);
          setTimeout(() => setError(null), 5000);
          cleanupUrl();
          return;
        }
      }
      
      // Handle the case where we've been redirected back with linkedin_connected=true
      if (linkedinConnected === 'true' && state) {
        if (!currentUser) {
          console.log("LinkedIn connected but no current user - storing state for after login");
          sessionStorage.setItem('pendingLinkedInState', state);
          sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
          navigate('/auth');
          return;
        }

        try {
          console.log("Completing LinkedIn connection...");
          const response = await api.post('/linkedin/complete-connection', { state });
          
          if (response.data.success) {
            setSuccessMessage(`LinkedIn account connected successfully! Welcome ${response.data.account?.name || 'User'}!`);
            setTimeout(() => setSuccessMessage(""), 5000);
            
            await fetchConnectedAccounts();
            
            console.log("✅ LinkedIn connection completed successfully");
          }
        } catch (error) {
          console.error('❌ Error completing LinkedIn connection:', error);
          let errorMessage = 'Failed to complete LinkedIn connection';
          
          if (error.response?.status === 409) {
            errorMessage = 'This LinkedIn account is already connected to another user.';
          } else if (error.response?.status === 404) {
            errorMessage = 'LinkedIn connection expired. Please try connecting again.';
          } else if (error.response?.data?.detail) {
            errorMessage = error.response.data.detail;
          }
          
          setError(errorMessage);
        }
        
        cleanupUrl();
      }
    };

    // Process LinkedIn callback if we have search params and either the user is logged in or we have a code parameter
    if (location.search && (currentUser || location.search.includes('code='))) {
      handleLinkedInCallback();
    }
  }, [location.search, currentUser, navigate]);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.get("linkedin_connected") === "true") {
      setSuccessMessage("LinkedIn account connected successfully!");
      setTimeout(() => setSuccessMessage(""), 5000);
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchConnectedAccounts();
    }

    if (query.get("linkedin_error")) {
      const errorMsg = query.get("linkedin_error");
      setError(`LinkedIn connection failed: ${errorMsg}`);
      setTimeout(() => setError(null), 5000);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (currentUser && !authLoading) {
      fetchInitialData();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [location, currentUser, authLoading]);

  if (authLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"
            >
              <FaSpinner className="text-blue-500 text-xl" />
            </motion.div>
            <p className="text-gray-600">Authenticating...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4 flex items-center justify-center"
              >
                <FaSpinner className="text-blue-500 text-xl" />
              </motion.div>
              <p className="text-gray-600">Loading your personal dashboard...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <p>{error}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setError(null);
                  fetchInitialData();
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md flex items-center justify-center mx-auto"
              >
                Retry
              </motion.button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence>
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6 flex justify-between items-center"
                >
                  <span>{successMessage}</span>
                  <button
                    onClick={() => setSuccessMessage("")}
                    className="text-green-700 hover:text-green-900"
                  >
                    <FaTimes />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showAccountTypeSelector && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
                  >
                    <h3 className="text-xl font-bold mb-4 text-gray-800">Select LinkedIn Account Type</h3>
                    <p className="text-gray-600 mb-6">Choose the type of LinkedIn account you want to connect:</p>
                    
                    <div className="space-y-4">
                      <button
                        onClick={() => handleAccountTypeSelect("personal")}
                        className="w-full p-4 bg-white border border-gray-300 rounded-lg flex items-center hover:bg-gray-50 transition-colors"
                      >
                        <div className="bg-blue-100 p-3 rounded-full mr-4">
                          <FaLinkedin className="text-blue-600 text-xl" />
                        </div>
                        <div className="text-left">
                          <h4 className="font-medium text-gray-800">Personal Account</h4>
                          <p className="text-sm text-gray-500">Connect your individual LinkedIn profile</p>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => handleAccountTypeSelect("company")}
                        className="w-full p-4 bg-white border border-gray-300 rounded-lg flex items-center hover:bg-gray-50 transition-colors"
                      >
                        <div className="bg-blue-100 p-3 rounded-full mr-4">
                          <FaLinkedin className="text-blue-600 text-xl" />
                        </div>
                        <div className="text-left">
                          <h4 className="font-medium text-gray-800">Company Page</h4>
                          <p className="text-sm text-gray-500">Connect a LinkedIn company page you manage</p>
                        </div>
                      </button>
                    </div>
                    
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={() => setShowAccountTypeSelector(false)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <header className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {greeting}, {currentUser?.displayName || 'User'}!
              </h1>
              <p className="text-gray-600">
                Manage your personal social media presence with ease
              </p>
            </header>

            <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Your Connected Accounts</h2>
                <span className="text-sm text-gray-500">{connectedAccounts.length} of 3 connected</span>
              </div>

              {connectedAccounts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {connectedAccounts.map((account) => (
                    <motion.div
                      key={account._id}
                      whileHover={{ y: -5 }}
                      className="border border-gray-200 rounded-lg p-4 flex items-center bg-gradient-to-r from-gray-50 to-white relative"
                    >
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 shadow-sm ${
                          account.platform === "instagram"
                            ? "bg-gradient-to-r from-pink-500 to-purple-600"
                            : account.platform === "facebook"
                            ? "bg-gradient-to-r from-blue-600 to-blue-800"
                            : "bg-gradient-to-r from-blue-500 to-blue-700"
                        }`}
                      >
                        {account.platform === "instagram" ? (
                          <FaInstagram className="text-white text-xl" />
                        ) : account.platform === "facebook" ? (
                          <FaFacebook className="text-white text-xl" />
                        ) : (
                          <FaLinkedin className="text-white text-xl" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{account.name}</h3>
                        <p className="text-sm text-gray-500 capitalize">{account.platform}</p>
                        <p className="text-xs text-gray-400">Connected to your account</p>
                      </div>
                      <div className="flex items-center">
                        <span className="text-green-500 mr-3">
                          <FaCheck />
                        </span>
                        <button
                          onClick={() => handleDisconnect(account._id || account.account_id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Disconnect"
                          disabled={disconnecting === account._id}
                        >
                          {disconnecting === account._id ? <FaSpinner className="animate-spin" /> : <FaTimes />}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <FaLinkedin className="text-gray-400 text-2xl" />
                  </div>
                  <p className="text-gray-500 mb-4">No accounts connected to your profile yet</p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAccountTypeSelector(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                  >
                    Connect Your First Account
                  </motion.button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-8 mb-8 border border-gray-100">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Connect Your Social Accounts</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Link your social media accounts to your personal profile for powerful scheduling and analytics.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleConnect("instagram")}
                  className="flex flex-col items-center px-6 py-6 border-2 border-gray-200 rounded-xl hover:border-pink-300 hover:bg-pink-50 transition-all group"
                >
                  <div className="bg-gradient-to-r from-pink-500 to-purple-600 w-14 h-14 rounded-full flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl transition-shadow">
                    <FaInstagram className="text-white text-2xl" />
                  </div>
                  <span className="text-gray-700 font-medium">Instagram</span>
                  <span className="text-xs text-gray-500 mt-1">Connect Account</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleConnect("facebook")}
                  className="flex flex-col items-center px-6 py-6 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all group"
                >
                  <div className="bg-gradient-to-r from-blue-600 to-blue-800 w-14 h-14 rounded-full flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl transition-shadow">
                    <FaFacebook className="text-white text-2xl" />
                  </div>
                  <span className="text-gray-700 font-medium">Facebook</span>
                  <span className="text-xs text-gray-500 mt-1">Connect Account</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleConnect("linkedin")}
                  className="flex flex-col items-center px-6 py-6 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
                >
                  <div className="bg-gradient-to-r from-blue-500 to-blue-700 w-14 h-14 rounded-full flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl transition-shadow">
                    <FaLinkedin className="text-white text-2xl" />
                  </div>
                  <span className="text-gray-700 font-medium">LinkedIn</span>
                  <span className="text-xs text-gray-500 mt-1">Connect Account</span>
                </motion.button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <motion.div whileHover={{ y: -5 }}>
                <Link
                  to="/create-post"
                  className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all h-full block border border-gray-100 group"
                >
                  <div className="bg-gradient-to-r from-blue-100 to-blue-50 w-14 h-14 rounded-xl flex items-center justify-center mb-4 shadow-inner group-hover:shadow-inner-lg transition-shadow">
                    <FaPen className="text-blue-600 text-2xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Create a Post</h3>
                  <p className="text-gray-600 mb-4">
                    Craft and schedule new posts for your connected social media accounts.
                  </p>
                  <div className="flex items-center text-blue-600 text-sm font-medium group-hover:text-blue-700 transition-colors">
                    <span>Start Posting</span>
                    <FaPlus className="ml-2 text-xs" />
                  </div>
                </Link>
              </motion.div>

              <motion.div whileHover={{ y: -5 }}>
                <Link
                  to="/calendar"
                  className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all h-full block border border-gray-100 group"
                >
                  <div className="bg-gradient-to-r from-blue-100 to-blue-50 w-14 h-14 rounded-xl flex items-center justify-center mb-4 shadow-inner group-hover:shadow-inner-lg transition-shadow">
                    <FaCalendarAlt className="text-blue-600 text-2xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">View Content Calendar</h3>
                  <p className="text-gray-600 mb-4">
                    Plan and review your scheduled posts and campaigns.
                  </p>
                  <div className="flex items-center text-blue-600 text-sm font-medium group-hover:text-blue-700 transition-colors">
                    <span>Check Calendar</span>
                    <FaPlus className="ml-2 text-xs" />
                  </div>
                </Link>
              </motion.div>

              <motion.div whileHover={{ y: -5 }}>
                <Link
                  to="/chat-support"
                  className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all h-full block border border-gray-100 group"
                >
                  <div className="bg-gradient-to-r from-blue-100 to-blue-50 w-14 h-14 rounded-xl flex items-center justify-center mb-4 shadow-inner group-hover:shadow-inner-lg transition-shadow">
                    <FaQuestionCircle className="text-blue-600 text-2xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Get Support</h3>
                  <p className="text-gray-600 mb-4">
                    Reach out to our support team for assistance with your account.
                  </p>
                  <div className="flex items-center text-blue-600 text-sm font-medium group-hover:text-blue-700 transition-colors">
                    <span>Contact Support</span>
                    <FaPlus className="ml-2 text-xs" />
                  </div>
                </Link>
              </motion.div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SocialDashboard;