import React, { useState, useEffect, useCallback } from "react";
import { FaSearch, FaBell, FaCog, FaSignOutAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import debounce from "lodash.debounce";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const Navbar = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  // Load user data from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Handle click outside profile dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".profile-dropdown") && !event.target.closest(".search-container")) {
        setIsProfileOpen(false);
        setSearchResults([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Add scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setUser(null);
    setSearchResults([]); // Clear search results on logout
    toast.success("Logged out successfully!");
    navigate("/auth");
  };

  // Debounced search function
  const fetchCampaigns = useCallback(
    debounce(async (query) => {
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/get-campaigns`);
        const campaigns = response.data;
        // Filter campaigns based on query (case-insensitive)
        const filteredCampaigns = campaigns.filter(
          (campaign) =>
            campaign.campaign_name.toLowerCase().includes(query.toLowerCase()) ||
            campaign.theme.toLowerCase().includes(query.toLowerCase()) ||
            campaign.posts.some((post) =>
              post.description.toLowerCase().includes(query.toLowerCase())
            )
        );
        setSearchResults(filteredCampaigns);
      } catch (error) {
        toast.error("Failed to fetch campaigns. Please try again.");
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  // Trigger search when query changes
  useEffect(() => {
    fetchCampaigns(searchQuery);
  }, [searchQuery, fetchCampaigns]);

  // Handle campaign click
  const handleCampaignClick = (campaignId) => {
    setSearchResults([]);
    setSearchQuery("");
    navigate(`/campaign/${campaignId}`);
  };

  return (
    <header
      className={`bg-white border-b border-gray-100 w-full sticky top-0 z-20 transition-shadow duration-300 ${
        isScrolled ? "shadow-sm" : ""
      }`}
    >
      <div className="flex items-center h-16 px-6">
        {/* Spacer to account for sidebar width */}
        <div className="w-[280px]"></div>

        {/* Main navbar content */}
        <div className="flex-1 flex justify-between items-center ml-4">
          {/* Search Bar */}
          <div className="relative max-w-xl w-full search-container">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative"
            >
              <input
                type="text"
                placeholder="Search campaigns, posts..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </motion.div>

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-30 max-h-96 overflow-y-auto"
                >
                  {searchResults.map((campaign) => (
                    <div
                      key={campaign._id}
                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => handleCampaignClick(campaign._id)}
                    >
                      <p className="text-sm font-medium text-gray-700">{campaign.campaign_name}</p>
                      <p className="text-xs text-gray-500 truncate">{campaign.theme}</p>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            {isSearching && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute top-full left-0 mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-100 p-4 text-center"
              >
                <p className="text-sm text-gray-500">Searching...</p>
              </motion.div>
            )}
          </div>

          {/* Right Section - Icons */}
          <div className="flex items-center space-x-6 ml-4">
            {/* Profile Dropdown */}
            <div className="relative profile-dropdown">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-2 focus:outline-none"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white">
                  <span className="font-medium text-sm">
                    {user?.full_name?.[0]?.toUpperCase() || "U"}
                  </span>
                </div>
                <span className="hidden md:inline-block font-medium text-gray-700">
                  {user?.full_name || "Guest"}
                </span>
              </motion.button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-40"
                  >
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-700">Signed in as</p>
                      <p className="text-sm text-gray-500 truncate">{user?.email || "Not signed in"}</p>
                    </div>

                    <a
                      href="#"
                      className="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 transition-colors"
                    >
                      <FaCog className="mr-3 text-blue-500" />
                      <span>Settings</span>
                    </a>

                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-3 text-gray-700 hover:bg-blue-50 transition-colors"
                    >
                      <FaSignOutAlt Genuine className="mr-3 text-blue-500" />
                      <span>Logout</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;