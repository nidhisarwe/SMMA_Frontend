import React, { useState, useEffect, useCallback } from "react";
import api from "../utils/api"; // Use configured API client
import { auth } from "../firebase/config"; // Import Firebase auth
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import moment from "moment";
import {
  FaImage,
  FaSpinner,
  FaTrash,
  FaEdit,
  FaChevronLeft,
  FaChevronRight,
  FaCalendarAlt,
  FaPaperPlane,
  FaClock,
  FaTimes,
  FaCheck
} from "react-icons/fa";
import { BsThreeDotsVertical } from "react-icons/bs";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { motion, AnimatePresence } from "framer-motion";

const DraftsPage = () => {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeSlideIndex, setActiveSlideIndex] = useState({});
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [scheduledTime, setScheduledTime] = useState(new Date());
  const [isScheduling, setIsScheduling] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [selectedPlatform, setSelectedPlatform] = useState("linkedin");
  const limit = 9;

  // Authentication check function
  const checkAuth = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error("Please log in to view your drafts", {
          position: "top-center",
          autoClose: 3000,
        });
        navigate('/auth'); // Redirect to auth page if not logged in
        return false;
      }
      return true;
    } catch (error) {
      console.error("Auth check error:", error);
      toast.error("Authentication error. Please log in again.", {
        position: "top-center",
        autoClose: 3000,
      });
      navigate('/auth'); // Redirect to auth page on auth error
      return false;
    }
  };

  // Define fetchDrafts outside useEffect so it can be called from other functions
  const fetchDrafts = async () => {
    setLoading(true);
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      // Get current user for logging
      const user = auth.currentUser;
      console.log(`🔍 Fetching drafts for user: ${user.uid}, page: ${page}, limit: ${limit}`);
      
      // Use the configured API client which automatically handles authentication
      const response = await api.get(`/get-drafts/?page=${page}&limit=${limit}`);
      console.log("📋 Drafts API response:", response.data);

      if (response.data.drafts) {
        setDrafts(response.data.drafts);
        setTotalPages(response.data.total_pages || 1);
      } else if (response.data.status === "success") {
        setDrafts(response.data.data);
        setTotalPages(response.data.pages || Math.ceil(response.data.total / limit) || 1);
      } else if (Array.isArray(response.data)) {
        setDrafts(response.data);
        setTotalPages(1);
      } else {
        setDrafts([]);
        setTotalPages(1);
      }

      const draftList = response.data.drafts || response.data.data || response.data || [];
      console.log(`📝 Retrieved ${draftList.length} drafts for user: ${user.uid}`);

      if (draftList.length === 0) {
        console.log(`No drafts found for user: ${user.uid}`);
      }

      // Verify user_id in drafts for debugging
      if (draftList.length > 0) {
        const userIds = new Set(draftList.map(draft => draft.user_id));
        console.log(`Draft user_ids in response: ${Array.from(userIds).join(', ')}`);
        
        // Check if any drafts don't belong to the current user
        const wrongUserDrafts = draftList.filter(draft => draft.user_id !== user.uid);
        if (wrongUserDrafts.length > 0) {
          console.warn(`Found ${wrongUserDrafts.length} drafts that don't match current user ID`);
          // Filter out drafts that don't belong to the current user
          const filteredDrafts = draftList.filter(draft => draft.user_id === user.uid);
          console.log(`Filtered out ${draftList.length - filteredDrafts.length} drafts that don't belong to the current user`);
          setDrafts(filteredDrafts);
        }
      }

      const indexes = {};
      draftList.forEach(draft => {
        if (draft.is_carousel && Array.isArray(draft.image_url)) {
          indexes[draft._id] = 0;
        }
      });
      setActiveSlideIndex(indexes);
    } catch (error) {
      console.error("Error fetching drafts:", error);
      if (error.response?.status === 401) {
        toast.error("Please log in to view drafts", {
          position: "top-center",
          autoClose: 3000,
        });
        navigate('/auth'); // Redirect to auth page on 401
      } else if (error.response?.status === 404) {
        setDrafts([]);
        setTotalPages(1);
      } else if (error.response?.status === 403) {
        toast.error("You don't have permission to view these drafts", {
          position: "top-center",
          autoClose: 3000,
        });
      } else {
        toast.error("Failed to load drafts", {
          position: "top-center",
          autoClose: 3000,
        });
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Call fetchDrafts when the component mounts or when dependencies change
  useEffect(() => {
    fetchDrafts();
  }, [page, limit, navigate]);

  const handleDeleteDraft = async (draftId) => {
    const toastId = toast.loading("Deleting draft...");
    try {
      // Get current user for logging
      const user = auth.currentUser;
      if (!user) {
        throw new Error("You must be logged in to delete drafts");
      }
      
      console.log(`🗑️ Deleting draft ${draftId} for user: ${user.uid}`);
      await api.delete(`/delete-draft/${draftId}`);
      
      // Remove the draft from state
      setDrafts(drafts.filter(draft => draft._id !== draftId));
      
      console.log(`✅ Draft ${draftId} deleted successfully`);
      toast.update(toastId, {
        render: "Draft deleted successfully",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (error) {
      console.error("Error deleting draft:", error);
      let errorMessage = "Failed to delete draft";
      
      if (error.response?.status === 401) {
        errorMessage = "Please log in to delete drafts";
        navigate('/auth'); // Redirect to auth page on 401
      } else if (error.response?.status === 404) {
        errorMessage = "Draft not found";
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to delete this draft";
      }
      
      toast.update(toastId, {
        render: errorMessage,
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    }
  };

  const fetchConnectedAccounts = async () => {
    try {
      // Get current user for logging
      const user = auth.currentUser;
      if (!user) {
        throw new Error("You must be logged in to fetch connected accounts");
      }
      
      console.log(`🔄 Fetching connected accounts for user: ${user.uid}`);
      const response = await api.get("/linkedin/accounts");
      
      if (response.data && response.data.accounts) {
        console.log(`✅ Found ${response.data.accounts.length} connected accounts`);
        setConnectedAccounts(response.data.accounts);
      } else {
        console.log("No connected accounts found or invalid response format");
        setConnectedAccounts([]);
      }
    } catch (error) {
      console.error("Error fetching connected accounts:", error);
      
      if (error.response?.status === 401) {
        toast.error("Please log in to view connected accounts");
        navigate('/auth'); // Redirect to auth page on 401
      } else {
        toast.error("Could not load connected social accounts");
      }
    }
  };

  const handleScheduleDraft = (draft) => {
    setSelectedDraft(draft);
    setSelectedPlatform(draft.platform || "linkedin");
    setShowScheduleModal(true);
    fetchConnectedAccounts();
  };

  const closeScheduleModal = () => {
    setShowScheduleModal(false);
    setSelectedDraft(null);
    setScheduledDate(new Date());
    setScheduledTime(new Date());
  };

  const schedulePost = async () => {
    if (!selectedDraft) return;
    setIsScheduling(true);
    const toastId = toast.loading("Scheduling post...");
    try {
      // Get current user for logging
      const user = auth.currentUser;
      if (!user) {
        throw new Error("You must be logged in to schedule posts");
      }
      
      // Combine date and time
      const scheduledDateTime = new Date(scheduledDate);
      scheduledDateTime.setHours(
        scheduledTime.getHours(),
        scheduledTime.getMinutes(),
        0
      );
      
      // Format for API
      const scheduledUTC = scheduledDateTime.toISOString();
      
      // Prepare post data
      const postData = {
        caption: selectedDraft.caption,
        image_url: selectedDraft.image_url,
        platform: selectedPlatform,
        scheduled_time: scheduledUTC,
        is_carousel: selectedDraft.is_carousel || false,
        from_draft_id: selectedDraft._id,
        user_id: user.uid, // Include user_id for extra validation
      };
      
      console.log(`📅 Scheduling post from draft ${selectedDraft._id} for user: ${user.uid}`);
      const response = await api.post("/scheduled-posts", postData);
      
      console.log(`✅ Post scheduled successfully: ${response.data?.id || 'unknown ID'}`);
      toast.update(toastId, {
        render: "Post scheduled successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
      
      // Close the modal and navigate to calendar
      closeScheduleModal();
      navigate("/calendar");
    } catch (error) {
      console.error("Error scheduling post:", error);
      
      let errorMessage = error.response?.data?.detail || "Failed to schedule post";
      if (error.response?.status === 401) {
        errorMessage = "Please log in to schedule posts";
        navigate('/auth'); // Redirect to auth page on 401
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to schedule this post";
      }
      
      toast.update(toastId, {
        render: errorMessage,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setIsScheduling(false);
    }
  };

  const postNow = async (draft) => {
    try {
      // Get current user for logging
      const user = auth.currentUser;
      if (!user) {
        toast.error("You must be logged in to post");
        navigate('/auth');
        return;
      }
      
      const draftToPost = draft || selectedDraft;
      if (!draftToPost) {
        toast.error("No draft selected for posting");
        return;
      }
      
      setIsPosting(true);
      const toastId = toast.loading("Posting now...");
      
      // Ensure image_url is properly formatted
      let imageUrl = draftToPost.image_url;
      
      // Prepare post data
      const postData = {
        caption: draftToPost.caption,
        image_url: imageUrl,
        platform: draftToPost.platform || "linkedin",
        is_carousel: Array.isArray(imageUrl) && imageUrl.length > 1,
        from_draft_id: draftToPost._id,
        user_id: user.uid, // Include user_id for extra validation
      };
      
      console.log(`📤 Posting draft ${draftToPost._id} now for user: ${user.uid}`);
      console.log("Posting data:", JSON.stringify(postData, null, 2));
      
      const response = await api.post("/post-now/", postData);
      console.log(`✅ Post published successfully: ${JSON.stringify(response.data)}`);
      
      toast.update(toastId, {
        render: "Post published successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
      
      // Refresh the drafts list
      await fetchDrafts();
      
      // Close the modal if it's open
      if (showScheduleModal) {
        closeScheduleModal();
      }
    } catch (error) {
      console.error("Error posting now:", error);
      console.error("Error response:", error.response?.data);
      
      let errorMessage = "Failed to publish post";
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.status === 404) {
        errorMessage = "No connected account found. Please connect your account first.";
      } else if (error.response?.status === 401) {
        errorMessage = "Authentication required. Please log in again.";
        navigate('/auth'); // Redirect to auth page on 401
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to post this draft.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, {
        position: "top-center",
        autoClose: 5000,
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleNextSlide = (draftId) => {
    setActiveSlideIndex(prev => {
      const currentIndex = prev[draftId] || 0;
      const draft = drafts.find(d => d._id === draftId);
      if (!draft || !Array.isArray(draft.image_url)) return prev;
      const maxIndex = draft.image_url.length - 1;
      return {
        ...prev,
        [draftId]: currentIndex < maxIndex ? currentIndex + 1 : currentIndex,
      };
    });
  };

  const handlePrevSlide = (draftId) => {
    setActiveSlideIndex(prev => ({
      ...prev,
      [draftId]: Math.max(0, (prev[draftId] || 0) - 1),
    }));
  };

  const getImageUrl = (draft) => {
    if (!draft.image_url) return null;
    if (typeof draft.image_url === 'string') {
      return draft.image_url;
    }
    if (Array.isArray(draft.image_url)) {
      if (draft.is_carousel) {
        const currentIndex = activeSlideIndex[draft._id] || 0;
        return draft.image_url[currentIndex] || draft.image_url[0];
      }
      return draft.image_url[0];
    }
    return null;
  };

  const isCarousel = (draft) => {
    return draft.is_carousel &&
           Array.isArray(draft.image_url) &&
           draft.image_url.length > 1;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Your Drafts</h1>
              <p className="text-gray-500 mt-1">Manage your saved posts</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="p-2 rounded-full bg-white border border-gray-200 disabled:opacity-50 hover:bg-gray-50 transition"
              >
                <FaChevronLeft className="text-gray-600" />
              </button>
              <button
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-full bg-white border border-gray-200 disabled:opacity-50 hover:bg-gray-50 transition"
              >
                <FaChevronRight className="text-gray-600" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <FaSpinner className="animate-spin text-4xl text-blue-600" />
            </div>
          ) : drafts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <FaImage className="mx-auto text-5xl text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-700">No drafts found</h3>
              <p className="text-gray-500 mt-2">
                Create some drafts and they'll appear here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {drafts.map((draft) => {
                const currentImage = getImageUrl(draft);
                const isCarouselPost = isCarousel(draft);
                const currentIndex = activeSlideIndex[draft._id] || 0;

                return (
                  <div
                    key={draft._id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300 group"
                  >
                    <div className="relative h-48 bg-gray-100">
                      {currentImage ? (
                        <>
                          <img
                            src={currentImage}
                            alt="Draft preview"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              e.target.src = "https://via.placeholder.com/300x200?text=Image+Not+Found";
                            }}
                          />
                          {isCarouselPost && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrevSlide(draft._id);
                                }}
                                disabled={currentIndex === 0}
                                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/90 p-2 rounded-full shadow-md z-10 hover:bg-white disabled:opacity-30 transition-all duration-200"
                              >
                                <FaChevronLeft className="text-gray-700 text-sm" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNextSlide(draft._id);
                                }}
                                disabled={currentIndex === draft.image_url.length - 1}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/90 p-2 rounded-full shadow-md z-10 hover:bg-white disabled:opacity-30 transition-all duration-200"
                              >
                                <FaChevronRight className="text-gray-700 text-sm" />
                              </button>
                              <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-1">
                                {draft.image_url.map((_, index) => (
                                  <div
                                    key={index}
                                    className={`w-2 h-2 rounded-full transition-all duration-200 ${
                                      currentIndex === index ? 'bg-blue-600 w-4' : 'bg-white/70'
                                    }`}
                                  />
                                ))}
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FaImage className="text-gray-400 text-4xl" />
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 mb-2 capitalize">
                            {draft.platform}
                          </span>
                          {isCarouselPost && (
                            <span className="inline-block ml-2 px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                              {draft.image_url.length} images
                            </span>
                          )}
                        </div>
                        <button className="text-gray-400 hover:text-gray-600 transition">
                          <BsThreeDotsVertical />
                        </button>
                      </div>

                      <p className="mt-2 text-sm text-gray-700 line-clamp-2">
                        {draft.caption || "No caption"}
                      </p>

                      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                        <span>
                          {new Date(draft.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => postNow(draft)}
                            className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
                            title="Post now"
                          >
                            <FaPaperPlane className="text-xs" />
                          </button>
                          {/* <button
                            onClick={() => handleScheduleDraft(draft)}
                            className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
                            title="Schedule"
                          >
                            <FaCalendarAlt className="text-xs" />
                          </button> */}
                          <button
                            onClick={() => handleDeleteDraft(draft._id)}
                            className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-red-500 transition"
                            title="Delete"
                          >
                            <FaTrash className="text-xs" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
      <ToastContainer />
      <AnimatePresence>
        {showScheduleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-6 rounded-lg max-w-md w-full mx-4"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Schedule Post</h3>
                <button
                  onClick={closeScheduleModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform
                </label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="linkedin">LinkedIn</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <DatePicker
                  selected={scheduledDate}
                  onChange={(date) => setScheduledDate(date)}
                  minDate={new Date()}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time
                </label>
                <DatePicker
                  selected={scheduledTime}
                  onChange={(time) => setScheduledTime(time)}
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={15}
                  timeCaption="Time"
                  dateFormat="h:mm aa"
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={closeScheduleModal}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={schedulePost}
                  disabled={isScheduling}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                >
                  {isScheduling ? (
                    <FaSpinner className="animate-spin inline-block mr-2" />
                  ) : (
                    "Schedule"
                  )}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => postNow()}
                  disabled={isPosting}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
                >
                  {isPosting ? (
                    <FaSpinner className="animate-spin inline-block mr-2" />
                  ) : (
                    "Post Now"
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DraftsPage;