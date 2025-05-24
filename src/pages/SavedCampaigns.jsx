// SavedCampaigns.jsx - FIXED to properly display campaigns
import { api } from '../utils/api';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { FiEye, FiPlay, FiEdit, FiTrash2, FiPlus, FiSearch, FiCalendar, FiFilter } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const SavedCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !currentUser) {
      toast.error('You must be logged in to view campaigns');
      navigate('/auth');
      return;
    }
  }, [currentUser, authLoading, navigate]);

  useEffect(() => {
    if (currentUser && !authLoading) {
      fetchCampaigns();
    }
  }, [currentUser, authLoading]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Use the correct API method from the api object
      const response = await api.campaigns.getAll();
      console.log("📊 Raw campaigns response:", response.data);
      
      let campaignsData = Array.isArray(response.data) ? response.data : [];
      
      // Log all campaigns before filtering
      console.log(`🔍 Total campaigns before filtering: ${campaignsData.length}`);
      
      // Log the raw structure of each campaign for debugging
      console.log("DEBUG: Full campaign data structure:");
      campaignsData.forEach((campaign, index) => {
        console.log(`Campaign ${index + 1} ID: ${campaign._id}`);
        console.log(`Campaign ${index + 1} Name: ${campaign.campaign_name || campaign.name}`);
        console.log(`Campaign ${index + 1} has parsed_posts:`, !!campaign.parsed_posts);
        if (campaign.parsed_posts) {
          console.log(`Campaign ${index + 1} parsed_posts length:`, campaign.parsed_posts.length);
        }
        console.log(`Campaign ${index + 1} has content:`, !!campaign.content);
        if (campaign.content) {
          console.log(`Campaign ${index + 1} has content.parsed_posts:`, !!(campaign.content && campaign.content.parsed_posts));
          if (campaign.content && campaign.content.parsed_posts) {
            console.log(`Campaign ${index + 1} content.parsed_posts length:`, campaign.content.parsed_posts.length);
          }
        }
        console.log(`Campaign ${index + 1} has posts:`, !!campaign.posts);
        if (campaign.posts) {
          console.log(`Campaign ${index + 1} posts length:`, Array.isArray(campaign.posts) ? campaign.posts.length : 'Not an array');
        }
        console.log('-----------------------------------');
      });
      
      // Process each campaign to ensure it has the correct structure, but be more lenient
      const processedCampaigns = campaignsData.map(campaign => {
        // Normalize campaign name
        const name = campaign.campaign_name || campaign.name || 'Unnamed Campaign';
        
        // Check for posts in different possible locations
        let parsedPosts = [];
        
        // Try to find posts in various locations in the data structure
        if (campaign.parsed_posts && Array.isArray(campaign.parsed_posts) && campaign.parsed_posts.length > 0) {
          parsedPosts = campaign.parsed_posts;
          console.log(`Found ${parsedPosts.length} posts in campaign.parsed_posts for ${name}`);
        } 
        else if (campaign.content && campaign.content.parsed_posts && 
                 Array.isArray(campaign.content.parsed_posts) && campaign.content.parsed_posts.length > 0) {
          parsedPosts = campaign.content.parsed_posts;
          console.log(`Found ${parsedPosts.length} posts in campaign.content.parsed_posts for ${name}`);
        }
        else if (campaign.posts && Array.isArray(campaign.posts) && campaign.posts.length > 0) {
          parsedPosts = campaign.posts;
          console.log(`Found ${parsedPosts.length} posts in campaign.posts for ${name}`);
        }
        else if (campaign.content && campaign.content.posts && 
                 Array.isArray(campaign.content.posts) && campaign.content.posts.length > 0) {
          parsedPosts = campaign.content.posts;
          console.log(`Found ${parsedPosts.length} posts in campaign.content.posts for ${name}`);
        }
        else {
          console.log(`No posts found in any location for campaign: ${name}`);
        }
        
        return {
          ...campaign,
          campaign_name: name,
          parsed_posts: parsedPosts
        };
      });
      
      // Don't filter out any campaigns - we'll show all of them
      // but mark empty ones with a visual indicator
      const allCampaigns = processedCampaigns.map(campaign => {
        // Add a flag to indicate if the campaign has posts
        const hasPosts = campaign.parsed_posts && campaign.parsed_posts.length > 0;
        return {
          ...campaign,
          isEmpty: !hasPosts
        };
      });
      
      // Log which campaigns are being included
      allCampaigns.forEach(campaign => {
        console.log(`Including campaign: ${campaign.campaign_name}, Posts: ${campaign.parsed_posts?.length || 0}, Empty: ${campaign.isEmpty}`);
      });
      
      // Sort by creation date (newest first)
      allCampaigns.sort((a, b) => {
        const dateA = new Date(a.created_at || a.createdAt || 0);
        const dateB = new Date(b.created_at || b.createdAt || 0);
        return dateB - dateA;
      });
      
      setCampaigns(allCampaigns);
      console.log(`✅ Found ${allCampaigns.length} campaigns total`);
      console.log(`✅ ${allCampaigns.filter(c => !c.isEmpty).length} campaigns have posts`);
      console.log(`✅ ${allCampaigns.filter(c => c.isEmpty).length} campaigns are empty`);
      
      if (allCampaigns.length === 0) {
        console.log("⚠️ No campaigns found. This might indicate an issue with the data structure.");
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      setError(error.message || 'Failed to load campaigns');
      toast.error('Failed to load campaigns', {
        position: "top-right",
        autoClose: 5000,
      });
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewCampaign = (campaignId) => {
    // Navigate to view campaign (not edit mode to prevent duplicate creation)
    navigate(`/campaign/${campaignId}?mode=view`);
  };

  const handleEditCampaign = (campaignId) => {
    // Navigate to edit mode
    navigate(`/campaign/${campaignId}?mode=edit`);
  };

  const handleGenerateContent = async (campaignId) => {
  if (generating) return;
  
  setGenerating(campaignId);
  try {
    // Get the campaign data to extract the first post
    const campaign = campaigns.find(c => c._id === campaignId);
    
    if (!campaign) {
      toast.error('Campaign not found');
      setGenerating(null);
      return;
    }
    
    // Check if the campaign has posts
    const hasPosts = campaign.parsed_posts && campaign.parsed_posts.length > 0;
    
    if (hasPosts) {
      // Get the first post from the campaign
      const firstPost = campaign.parsed_posts[0];
      
      // Navigate to CreatePost with the first post data
      navigate('/create-post', {
        state: {
          campaignData: {
            campaignId: campaign._id,
            campaignName: campaign.campaign_name,
            postData: firstPost,
            currentPostIndex: 0,
            totalPosts: campaign.parsed_posts.length
          }
        }
      });
      
      toast.success('Loading campaign post in editor...', {
        position: "top-right",
        autoClose: 3000,
      });
    } else {
      // If no posts, generate content first
      const toastId = toast.loading('Generating campaign content...');
      
      // Use the api.campaigns object directly
      const result = await api.campaigns.generateContent(campaignId);
      
      if (result.success) {
        toast.update(toastId, {
          render: result.data.message || 'Content generated successfully!',
          type: 'success',
          isLoading: false,
          autoClose: 3000,
        });
        
        // Refresh campaigns list and then navigate
        await fetchCampaigns();
        
        // Get the updated campaign with generated posts
        const updatedCampaign = await api.campaigns.getById(campaignId);
        
        if (updatedCampaign.success && updatedCampaign.data.parsed_posts?.length > 0) {
          const firstPost = updatedCampaign.data.parsed_posts[0];
          
          // Navigate to CreatePost with the first post data
          navigate('/create-post', {
            state: {
              campaignData: {
                campaignId: updatedCampaign.data.id,
                campaignName: updatedCampaign.data.campaign_name,
                postData: firstPost,
                currentPostIndex: 0,
                totalPosts: updatedCampaign.data.parsed_posts.length
              }
            }
          });
        } else {
          toast.error('No posts were generated for this campaign');
        }
      } else {
        if (result.status === 401) {
          toast.update(toastId, {
            render: 'Session expired. Please log in again.',
            type: 'error',
            isLoading: false,
            autoClose: 3000,
          });
          navigate('/auth');
        } else if (result.status === 404) {
          toast.update(toastId, {
            render: 'Campaign not found or you do not have permission to access it.',
            type: 'error',
            isLoading: false,
            autoClose: 3000,
          });
        } else {
          toast.update(toastId, {
            render: result.message || 'Failed to generate content',
            type: 'error',
            isLoading: false,
            autoClose: 5000,
          });
        }
      }
    }
  } catch (error) {
    console.error('Unexpected error generating content:', error);
    toast.error('An unexpected error occurred while generating content', {
      position: "top-right",
      autoClose: 5000,
    });
  } finally {
    setGenerating(null);
  }
};

  const handleDeleteCampaign = async (campaignId) => {
  const campaign = campaigns.find(c => c._id === campaignId);
  const confirmMessage = `Are you sure you want to delete "${campaign?.campaign_name || 'this campaign'}"? This action cannot be undone.`;
  
  if (!window.confirm(confirmMessage)) {
    return;
  }
  
  try {
    console.log(`Attempting to delete campaign with ID: ${campaignId}`);
    
    // Show loading toast
    const toastId = toast.loading('Deleting campaign...');
    
    // Use the api.campaigns object directly
    const result = await api.campaigns.delete(campaignId);
    
    if (result.success) {
      // Remove campaign from local state
      setCampaigns(campaigns.filter(c => c._id !== campaignId));
      
      toast.update(toastId, {
        render: 'Campaign deleted successfully!',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
      });
      
      // Refresh campaigns list
      fetchCampaigns();
    } else {
      if (result.status === 401) {
        toast.update(toastId, {
          render: 'Session expired. Please log in again.',
          type: 'error',
          isLoading: false,
          autoClose: 3000,
        });
        navigate('/auth');
      } else if (result.status === 404) {
        toast.update(toastId, {
          render: 'Campaign not found or already deleted.',
          type: 'warning',
          isLoading: false,
          autoClose: 3000,
        });
        // Remove from local state anyway
        setCampaigns(campaigns.filter(c => c._id !== campaignId));
      } else {
        toast.update(toastId, {
          render: result.message || 'Failed to delete campaign',
          type: 'error',
          isLoading: false,
          autoClose: 5000,
        });
      }
    }
  } catch (error) {
    console.error('Unexpected error deleting campaign:', error);
    toast.error('An unexpected error occurred while deleting campaign', {
      position: "top-right",
      autoClose: 5000,
    });
  }
};

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';

    try {
      let date = new Date(dateString);

      if (isNaN(date.getTime())) {
        // Try parsing custom format
        const parts = dateString.match(/(\w+) (\d+) at (\d+):(\d+) (AM|PM)/);
        if (parts) {
          const months = {
            January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
            July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
          };

          const month = months[parts[1]];
          const day = parseInt(parts[2]);
          let hours = parseInt(parts[3]);
          const minutes = parseInt(parts[4]);
          const period = parts[5];

          if (period === 'PM' && hours < 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;

          date = new Date(new Date().getFullYear(), month, day, hours, minutes);
        }
      }

      if (isNaN(date.getTime())) return 'Invalid date';

      const options = {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };
      return date.toLocaleString(undefined, options);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  // Enhanced filtering logic
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.campaign_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.theme?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || campaign.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' }
  ];

  // Calculate stats from unique campaigns
  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'active').length,
    draft: campaigns.filter(c => c.status === 'draft').length,
    completed: campaigns.filter(c => c.status === 'completed').length
  };

  if (authLoading) {
    return (
      <div className="flex bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen font-[Inter]">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Authenticating...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen font-[Inter]">
      <div className="w-[250px] fixed top-0 left-0 bottom-0 z-20 bg-white shadow-xl border-r border-gray-200">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 ml-[250px]">
        <Navbar />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Your Campaigns
                  </span>
                </h1>
                <p className="text-gray-500 mt-2">
                  Manage and organize all your personal marketing campaigns
                </p>
              </div>

              <button
                onClick={() => navigate('/create-campaign')}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium px-5 py-2.5 rounded-lg hover:shadow-lg transition-all duration-200"
              >
                <FiPlus className="text-lg" />
                Create New Campaign
              </button>
            </div>

            {/* Search and Filter Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search your campaigns..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiFilter className="text-gray-400" />
                  </div>
                  <select
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    onClick={fetchCampaigns}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
                  >
                    <FiSearch className="text-sm" />
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <motion.div whileHover={{ scale: 1.02 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-medium text-gray-500">Total Campaigns</h3>
                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-medium text-gray-500">Active</h3>
                <p className="text-2xl font-bold text-indigo-600">{stats.active}</p>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-medium text-gray-500">Drafts</h3>
                <p className="text-2xl font-bold text-yellow-600">{stats.draft}</p>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-medium text-gray-500">Completed</h3>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </motion.div>
            </div>

            {/* Campaigns List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-indigo-600 mb-4"></div>
                <p className="text-gray-600 mt-4">Loading your campaigns...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-red-500 text-lg font-medium mb-2">Error loading campaigns</div>
                <p className="text-gray-600">{error}</p>
                <button
                  onClick={fetchCampaigns}
                  className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-64 h-48 mb-6 mx-auto flex items-center justify-center bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
                  <FiSearch className="text-indigo-400 text-5xl" />
                </div>
                <h3 className="text-xl font-medium text-gray-700">
                  {searchTerm ? 'No campaigns match your search' : 'No campaigns found'}
                </h3>
                <p className="text-gray-500 mt-2 max-w-md mx-auto">
                  {searchTerm 
                    ? 'Try adjusting your search terms or filters.' 
                    : 'Create your first campaign to get started with AI-powered content generation.'
                  }
                </p>
                <button
                  onClick={() => navigate('/create-campaign')}
                  className="mt-4 flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium px-5 py-2.5 rounded-lg hover:shadow-lg transition-all duration-200 mx-auto"
                >
                  <FiPlus className="text-lg" />
                  Create Your First Campaign
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredCampaigns.map((campaign) => (
                  <motion.div
                    key={`${campaign._id}-${campaign.created_at}`} // More unique key
                    whileHover={{ y: -5 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300"
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 min-w-0">
                          <h2 className="text-xl font-bold text-gray-800 truncate">
                            {campaign.campaign_name || 'Untitled Campaign'}
                          </h2>
                          <p className="text-gray-600 truncate">
                            {campaign.theme || 'No theme specified'}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          campaign.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          campaign.status === 'active' ? 'bg-blue-100 text-blue-800' :
                          campaign.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {campaign.status || 'draft'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500">Posts</p>
                          <p className="text-lg font-semibold text-gray-800">
                            {campaign.post_count || 
                             (campaign.posts?.length || 0) + (campaign.parsed_posts?.length || 0) || 
                             0}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Created</p>
                          <p className="text-sm font-semibold text-gray-800">
                            {formatDate(campaign.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-500 mb-1">Theme</p>
                            <p className="text-sm font-semibold text-indigo-600">
                              {campaign.theme ? campaign.theme : 'Not set'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-500 mb-1">Start Date</p>
                            <p className="text-sm font-semibold text-indigo-600">
                              {campaign.start_date ? formatDate(campaign.start_date) : 'Not set'}
                            </p>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-500 mb-1">End Date</p>
                            <p className="text-sm font-semibold text-indigo-600">
                              {campaign.end_date ? formatDate(campaign.end_date) : 'Not set'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center text-sm text-gray-500">
                          <span>Private to your account</span>
                        </div>

                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewCampaign(campaign._id)}
                            className="flex items-center justify-center p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors group relative"
                            title="View Campaign"
                          >
                            <FiEye className="text-lg" />
                            <span className="absolute -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                              View
                            </span>
                          </button>

                          <button
                            onClick={() => handleGenerateContent(campaign._id)}
                            disabled={generating === campaign._id}
                            className={`flex items-center justify-center p-2 group relative ${
                              generating === campaign._id ?
                              'bg-gray-100 text-gray-400 cursor-not-allowed' :
                              'bg-green-100 text-green-600 hover:bg-green-200'
                            } rounded-lg transition-colors`}
                            title="Generate Content"
                          >
                            <FiPlay className="text-lg" />
                            <span className="absolute -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                              Generate
                            </span>
                          </button>

                          <button
                            onClick={() => handleEditCampaign(campaign._id)}
                            className="flex items-center justify-center p-2 bg-yellow-100 text-yellow-600 rounded-lg hover:bg-yellow-200 transition-colors group relative"
                            title="Edit Campaign"
                          >
                            <FiEdit className="text-lg" />
                            <span className="absolute -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                              Edit
                            </span>
                          </button>

                          <button
                            onClick={() => handleDeleteCampaign(campaign._id)}
                            className="flex items-center justify-center p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors group relative"
                            title="Delete Campaign"
                          >
                            <FiTrash2 className="text-lg" />
                            <span className="absolute -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                              Delete
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        toastClassName="rounded-lg shadow-xl"
        progressStyle={{ background: 'linear-gradient(to right, #4f46e5, #7c3aed)' }}
      />
    </div>
  );
};

export default SavedCampaigns;