// Frontend/src/pages/DraftsPage.jsx - FIXED VERSION
import React, { useState, useEffect } from "react";
import axios from "axios";
import api from "../utils/api"; // Use the configured API client
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

  useEffect(() => {
    // Check if user is authenticated first
    const checkAuth = async () => {
      try {
        // Check if we have a current user
        const currentUser = await auth.currentUser;
        if (!currentUser) {
          toast.error("Please log in to view your drafts", {
            position: "top-center",
            autoClose: 3000,
          });
          return false;
        }
        return true;
      } catch (error) {
        console.error("Auth check error:", error);
        toast.error("Authentication error. Please log in again.", {
          position: "top-center",
          autoClose: 3000,
        });
        return false;
      }
    };
    
    const fetchDrafts = async () => {
      setLoading(true);
      
      // First check authentication
      const isAuthenticated = await checkAuth();
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }
      
      try {
        // Use axios directly with the full URL and auth token
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://127.0.0.1:8000/api/get-drafts/?page=${page}&limit=${limit}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
        
        console.log("📋 Drafts API response:", response.data);
        
        // Handle different response structures
        if (response.data.drafts) {
          // New API structure
          setDrafts(response.data.drafts);
          setTotalPages(response.data.total_pages || 1);
        } else if (response.data.status === "success") {
          // Old API structure
          setDrafts(response.data.data);
          setTotalPages(response.data.pages || Math.ceil(response.data.total / limit) || 1);
        } else if (Array.isArray(response.data)) {
          // Direct array response
          setDrafts(response.data);
          setTotalPages(1);
        } else {
          setDrafts([]);
          setTotalPages(1);
        }

        // Log the drafts for debugging
        const draftList = response.data.drafts || response.data.data || response.data || [];
        console.log("📝 Processed drafts:", draftList);
        
        if (draftList.length === 0) {
          console.log("No drafts found for this user");
        }
        
        // Initialize slide indexes for all carousels
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
        } else if (error.response?.status === 404) {
          // No drafts found - this is OK
          setDrafts([]);
          setTotalPages(1);
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
    
    fetchDrafts();
  }, [page]);

  const handleDeleteDraft = async (draftId) => {
    const toastId = toast.loading("Deleting draft...");
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://127.0.0.1:8000/api/delete-draft/${draftId}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      // Remove the draft from state
      setDrafts(drafts.filter(draft => draft._id !== draftId));
      
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
      } else if (error.response?.status === 404) {
        errorMessage = "Draft not found";
      }
      
      toast.update(toastId, {
        render: errorMessage,
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    }
  };

  // Function to fetch connected social accounts
  const fetchConnectedAccounts = async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/linkedin/accounts", {
        headers: {
          Authorization: `Bearer ${await auth.currentUser.getIdToken()}`
        }
      });
      
      if (response.data && response.data.accounts) {
        setConnectedAccounts(response.data.accounts);
      }
    } catch (error) {
      console.error("Error fetching connected accounts:", error);
      toast.error("Could not load connected social accounts");
    }
  };

  // Function to handle scheduling a draft - opens the scheduling modal
  const handleScheduleDraft = (draft) => {
    setSelectedDraft(draft);
    setSelectedPlatform(draft.platform || "linkedin");
    setShowScheduleModal(true);
    fetchConnectedAccounts();
  };
  
  // Function to close the scheduling modal
  const closeScheduleModal = () => {
    setShowScheduleModal(false);
    setSelectedDraft(null);
    setScheduledDate(new Date());
    setScheduledTime(new Date());
  };
  
  // Function to schedule the post
  const schedulePost = async () => {
    if (!selectedDraft) return;
    
    setIsScheduling(true);
    const toastId = toast.loading("Scheduling post...");
    
    try {
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
        from_draft_id: selectedDraft._id // Include the draft ID for reference
      };
      
      // Call the API to schedule the post
      const response = await axios.post("http://localhost:8000/api/scheduled-posts", postData, {
        headers: {
          Authorization: `Bearer ${await auth.currentUser.getIdToken()}`
        }
      });
      
      toast.update(toastId, {
        render: "Post scheduled successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000
      });
      
      // Close the modal
      closeScheduleModal();
      
      // Navigate to calendar to see the scheduled post
      navigate("/calendar");
    } catch (error) {
      console.error("Error scheduling post:", error);
      
      toast.update(toastId, {
        render: error.response?.data?.detail || "Failed to schedule post",
        type: "error",
        isLoading: false,
        autoClose: 5000
      });
    } finally {
      setIsScheduling(false);
    }
  };
  
  // Function to post now
  const postNow = async (draft) => {
    try {
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
        from_draft_id: draftToPost._id // Include the draft ID for reference
      };
      
      // Log the post data for debugging
      console.log("Posting data:", JSON.stringify(postData, null, 2));
      
      // Call the API to post now with the trailing slash
      const response = await axios.post("http://localhost:8000/api/post-now/", postData, {
        headers: {
          Authorization: `Bearer ${await auth.currentUser.getIdToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log("Post response:", response.data);
      
      toast.update(toastId, {
        render: "Post published successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000
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
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, {
        position: "top-center",
        autoClose: 5000
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
        [draftId]: currentIndex < maxIndex ? currentIndex + 1 : currentIndex
      };
    });
  };

  const handlePrevSlide = (draftId) => {
    setActiveSlideIndex(prev => ({
      ...prev,
      [draftId]: Math.max(0, (prev[draftId] || 0) - 1)
    }));
  };

  const getImageUrl = (draft) => {
    if (!draft.image_url) return null;

    // Handle case where image_url is a string
    if (typeof draft.image_url === 'string') {
      return draft.image_url;
    }

    // Handle case where image_url is an array
    if (Array.isArray(draft.image_url)) {
      if (draft.is_carousel) {
        const currentIndex = activeSlideIndex[draft._id] || 0;
        return draft.image_url[currentIndex] || draft.image_url[0];
      }
      return draft.image_url[0]; // Return first image if not marked as carousel
    }

    return null;
  };

  const isCarousel = (draft) => {
    // Check if it's marked as carousel AND has multiple images
    return draft.is_carousel &&
           Array.isArray(draft.image_url) &&
           draft.image_url.length > 1;
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen flex font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
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
                      {/* Image section */}
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

                      {/* Content section */}
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
                              day: 'numeric'
                            })}
                          </span>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                // Direct post now without setting state to avoid race conditions
                                postNow(draft);
                              }}
                              className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
                              title="Post now"
                            >
                              <FaPaperPlane className="text-xs" />
                            </button>
                            <button
                              onClick={() => handleScheduleDraft(draft)}
                              className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
                              title="Schedule"
                            >
                              <FaCalendarAlt className="text-xs" />
                            </button>
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
      </div>
    );
  };

export default DraftsPage;