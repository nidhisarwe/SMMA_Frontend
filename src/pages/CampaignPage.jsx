import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { FiDownload, FiCheck, FiX, FiEdit2, FiSave, FiShare2, FiCalendar, FiCopy } from 'react-icons/fi';
import { FaRegLightbulb, FaRegClock, FaRegStickyNote, FaRegHandPointer } from 'react-icons/fa';
import { RiMagicLine } from 'react-icons/ri';
import { jsPDF } from 'jspdf';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

const CampaignPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const campaignData = location.state?.campaignData;
  const campaignId = location.pathname.split('/').pop();
  const [isLoadedCampaign, setIsLoadedCampaign] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareLink, setShareLink] = useState('');

  const [campaignName, setCampaignName] = useState(campaignData?.name || 'Campaign');
  const [posts, setPosts] = useState([]);
  const [originalPosts, setOriginalPosts] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const contentRefs = useRef({});

  const cleanText = (text) => {
    if (!text) return '';
    return text.replace(/\*\*/g, '').replace(/#+\s*/g, '').trim();
  };

  const parsePosts = (campaignData) => {
    let parsedPosts = [];
    
    try {
      // Check if we have parsed_posts from the new structure
      if (campaignData.parsed_posts && Array.isArray(campaignData.parsed_posts)) {
        parsedPosts = campaignData.parsed_posts.map((post, idx) => ({
          id: idx + 1,
          title: post.title || `Post ${idx + 1}`,
          type: post.content_type || 'Content Post',
          schedule: post.schedule || 'To be scheduled',
          description: post.description || 'No description available',
          cta: post.call_to_action || 'Engage with this post',
          isEditing: false,
        }));
      }
      // Check for content.parsed_posts
      else if (campaignData.content?.parsed_posts && Array.isArray(campaignData.content.parsed_posts)) {
        parsedPosts = campaignData.content.parsed_posts.map((post, idx) => ({
          id: idx + 1,
          title: post.title || `Post ${idx + 1}`,
          type: post.content_type || 'Content Post',
          schedule: post.schedule || 'To be scheduled',
          description: post.description || 'No description available',
          cta: post.call_to_action || 'Engage with this post',
          isEditing: false,
        }));
      }
      // Check if we have posts with raw structure
      else if (campaignData.posts) {
        if (Array.isArray(campaignData.posts)) {
          parsedPosts = campaignData.posts;
        } else if (campaignData.posts.raw && campaignData.posts.raw.generated_posts) {
          // Handle fallback content structure
          parsedPosts = campaignData.posts.raw.generated_posts.map((post, idx) => ({
            id: idx + 1,
            title: post.title,
            type: post.content_type,
            schedule: post.schedule,
            description: post.description,
            cta: post.call_to_action,
            isEditing: false,
          }));
        } else if (typeof campaignData.posts.raw === 'string') {
          // Handle raw string content - parse it
          const rawContent = cleanText(campaignData.posts.raw);
          parsedPosts = parseRawStringContent(rawContent);
        }
      }
      // Handle campaignData.content structure from new campaign creation
      else if (campaignData.content) {
        if (campaignData.content.parsed_posts && Array.isArray(campaignData.content.parsed_posts)) {
          parsedPosts = campaignData.content.parsed_posts.map((post, idx) => ({
            id: idx + 1,
            title: post.title || `Post ${idx + 1}`,
            type: post.content_type || 'Content Post',
            schedule: post.schedule || 'To be scheduled',
            description: post.description || 'No description available',
            cta: post.call_to_action || 'Engage with this post',
            isEditing: false,
          }));
        } else if (typeof campaignData.content.raw === 'string') {
          const rawContent = cleanText(campaignData.content.raw);
          parsedPosts = parseRawStringContent(rawContent);
        }
      }
      
      // If still no posts, try to parse from raw if available
      if (parsedPosts.length === 0 && campaignData.raw) {
        const rawContent = cleanText(campaignData.raw);
        parsedPosts = parseRawStringContent(rawContent);
      }
      
    } catch (error) {
      console.error('Error parsing posts:', error);
      parsedPosts = [];
    }
    
    return parsedPosts;
  };

  const parseRawStringContent = (rawContent) => {
    const postSections = rawContent.split(/Post \d+/).map((s) => s.trim()).filter(Boolean);
    const validPosts = postSections.filter((section) => section.includes('1. What to Post'));

    return validPosts.map((section, idx) => {
      const lines = section.split('\n').filter(Boolean);
      const getField = (label) =>
        lines.find((line) => line.startsWith(label))?.split(':')?.slice(1).join(':')?.trim() || '';

      const descIndex = lines.findIndex((line) => line.startsWith('4. Description:'));
      const description =
        descIndex !== -1
          ? lines.slice(descIndex).join('\n').replace('4. Description:', '').trim()
          : '';

      return {
        id: idx + 1,
        title: getField('1. What to Post') || `Post ${idx + 1}`,
        type: getField('2. Type of Post') || 'Content Post',
        schedule: getField('3. Posting Schedule') || 'To be scheduled',
        description: description || 'No description available',
        cta: getField('5. Call-to-Action') || 'Engage with this post',
        isEditing: false,
      };
    });
  };

  useEffect(() => {
    if (!currentUser) {
      toast.error('Please log in to view campaigns');
      navigate('/auth');
      return;
    }

    if (campaignId && campaignId !== 'campaign') {
      const loadCampaign = async () => {
        setIsLoading(true);
        try {
          const response = await api.get(`/campaign-schedules/get-campaign/${campaignId}`);

          if (response.data) {
            const loadedCampaign = response.data;
            
            // Parse posts using the updated parser
            const campaignPosts = parsePosts(loadedCampaign);
            
            setPosts(campaignPosts);
            setCampaignName(loadedCampaign.campaign_name || loadedCampaign.name || 'Campaign');
            setIsLoadedCampaign(true);
          } else {
            throw new Error('Empty response from server');
          }
        } catch (error) {
          console.error('Error loading campaign:', error);
          toast.error(`Failed to load campaign: ${error.response?.data?.detail || error.message}`, {
            position: "bottom-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: "colored",
          });
          navigate('/campaigns');
        } finally {
          setIsLoading(false);
        }
      };

      loadCampaign();
    } else if (campaignData) {
      // Handle new campaign data from location state
      const campaignPosts = parsePosts(campaignData);
      setPosts(campaignPosts);
      setCampaignName(campaignData?.name || 'Campaign');
    }
  }, [campaignId, campaignData, navigate, currentUser]);

  const toggleEdit = (id) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === id
          ? {
              ...post,
              isEditing: true,
            }
          : post
      )
    );

    setOriginalPosts((prev) => ({
      ...prev,
      [id]: posts.find((p) => p.id === id),
    }));
  };

  const handleDiscard = (id) => {
    const original = originalPosts[id];
    if (original) {
      setPosts((prev) =>
        prev.map((post) => (post.id === id ? { ...original, isEditing: false } : post))
      );
      toast.info('Changes discarded', {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: true,
        theme: "colored",
      });
    }
  };

  const handleAccept = (id) => {
    const card = contentRefs.current[id];
    if (card) {
      const getText = (selector, prefix) => {
        const raw = card.querySelector(selector)?.innerText || '';
        if (!raw.includes(prefix)) return raw.trim();
        return raw.replace(prefix, '').trim();
      };

      const updatedPost = {
        title: getText('[data-field="title"]', '📌'),
        type: getText('[data-field="type"]', '📝 Type:'),
        schedule: getText('[data-field="schedule"]', '📅 Schedule:'),
        description: getText('[data-field="description"]', '🧾 Description:'),
        cta: getText('[data-field="cta"]', '🔗'),
      };

      setPosts((prev) =>
        prev.map((post) =>
          post.id === id ? { ...post, ...updatedPost, isEditing: false } : post
        )
      );
      toast.success('Changes saved', {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: true,
        theme: "colored",
      });
    }
  };

  const handleSaveSchedule = async () => {
    const hasEmptyFields = posts.some(
      (post) =>
        !post.title || !post.type || !post.schedule || !post.description || !post.cta
    );

    if (hasEmptyFields) {
      toast.warning('Please fill in all fields before saving the schedule', {
        position: "bottom-right",
        autoClose: 5000,
        theme: "colored",
      });
      return;
    }

    setIsSaving(true);
    try {
      console.log('Saving campaign with posts:', posts);
      
      // Check if we're editing an existing campaign
      const isExistingCampaign = campaignId && campaignId !== 'campaign';
      
      // Format posts for the backend
      const formattedPosts = posts.map((post) => ({
        title: post.title,
        content_type: post.type,
        schedule: post.schedule,
        description: post.description,
        call_to_action: post.cta,
      }));
      
      const payload = {
        campaign_name: campaignName, // Use the correct field name (campaign_name instead of name)
        theme: campaignData?.theme || '',
        parsed_posts: formattedPosts,
        start_date: campaignData?.startDate || '',
        end_date: campaignData?.endDate || '',
        status: 'active',
        post_count: posts.length
      };

      // If we're editing an existing campaign, include the ID
      if (isExistingCampaign) {
        payload.campaign_id = campaignId;
      }

      // First check if a similar campaign already exists
      let existingCampaigns = [];
      try {
        const campaignsResponse = await api.get('/campaign-schedules/get-campaigns');
        existingCampaigns = Array.isArray(campaignsResponse.data) ? campaignsResponse.data : [];
      } catch (err) {
        console.warn('Could not check for existing campaigns:', err);
      }

      // Check for duplicates (same name and created within last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const similarCampaign = existingCampaigns.find(campaign => {
        // Skip if this is the campaign we're editing
        if (isExistingCampaign && campaign._id === campaignId) {
          return false;
        }
        
        // Check if name matches and was created recently
        const campaignName = campaign.campaign_name || campaign.name;
        const createdAt = new Date(campaign.created_at || campaign.createdAt || 0);
        return campaignName === payload.campaign_name && createdAt > fiveMinutesAgo;
      });

      if (similarCampaign && !isExistingCampaign) {
        console.log('Found similar existing campaign:', similarCampaign);
        toast.info('A similar campaign was recently created. Redirecting to it.', {
          position: "bottom-right",
          autoClose: 3000,
          theme: "colored",
        });
        
        setTimeout(() => {
          navigate(`/campaign/${similarCampaign._id}`);
        }, 1500);
        return;
      }

      // Use the correct API endpoint based on whether we're creating or updating
      const endpoint = isExistingCampaign 
        ? `/campaign-schedules/campaigns/${campaignId}` 
        : '/plan-campaign/';
      
      const method = isExistingCampaign ? 'put' : 'post';
      const response = await api[method](endpoint, payload);

      if (response.status === 200 || response.status === 201) {
        toast.success(`Campaign ${isExistingCampaign ? 'updated' : 'saved'} successfully!`, {
          position: "bottom-right",
          autoClose: 3000,
          theme: "colored",
        });
        setTimeout(() => {
          navigate('/saved-campaigns');
        }, 1500);
      } else {
        throw new Error(`Failed to ${isExistingCampaign ? 'update' : 'save'} campaign`);
      }
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error(
        `Error saving campaign: ${error.response?.data?.detail || error.message}`,
        {
          position: "bottom-right",
          autoClose: 5000,
          theme: "colored",
        }
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPDF = () => {
    const postCount = posts.length;
    const dates = isLoadedCampaign
      ? posts.map(post => post.schedule)
      : campaignData?.dates || [];

    let metadata = `📅 Campaign Schedule\n\n`;
    metadata += `Campaign: ${campaignName}\n`;
    metadata += `Total Posts: ${postCount}\n`;
    if (dates.length) {
      metadata += `Post Dates:\n${dates.map((d, i) => `- Post ${i + 1}: ${d}`).join('\n')}\n`;
    }

    const content = posts
      .map(
        (post, idx) => `
Post ${idx + 1}
1. What to Post: ${post.title}
2. Type of Post: ${post.type}
3. Posting Schedule: ${post.schedule}
4. Description:
${post.description}
5. Call-to-Action: ${post.cta}
    `
      )
      .join('\n\n');

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const marginTop = 20;
    const lineHeight = 7;
    const lines = doc.splitTextToSize(`${metadata}\n\n${content}`, 180);
    let cursorY = marginTop;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);

    lines.forEach((line) => {
      if (cursorY + lineHeight > pageHeight - 15) {
        doc.addPage();
        cursorY = marginTop;
      }
      doc.text(line, 15, cursorY);
      cursorY += lineHeight;
    });

    doc.save(`${campaignName.replace(/\s+/g, '_')}_schedule.pdf`);
    toast.success('PDF downloaded successfully!', {
      position: "bottom-right",
      autoClose: 3000,
      hideProgressBar: true,
      theme: "colored",
    });
  };

  const generateShareLink = async () => {
    setIsSharing(true);
    try {
      const mockLink = `https://yourdomain.com/share/${campaignId || 'new'}`;
      setShareLink(mockLink);

      await navigator.clipboard.writeText(mockLink);
      toast.success('Share link copied to clipboard!', {
        position: "bottom-right",
        autoClose: 3000,
        theme: "colored",
      });
    } catch (error) {
      console.error('Error generating share link:', error);
      toast.error('Failed to generate share link', {
        position: "bottom-right",
        autoClose: 5000,
        theme: "colored",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!', {
        position: "bottom-right",
        autoClose: 2000,
        theme: "colored",
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard', {
        position: "bottom-right",
        autoClose: 5000,
        theme: "colored",
      });
    }
  };

  if (!currentUser) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking authentication...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen font-[Inter]">
      {/* Sidebar */}
      <div className="w-[250px] fixed top-0 left-0 bottom-0 z-20 bg-white shadow-xl border-r border-gray-200">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 ml-[250px]">
        <Navbar />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg">
                    <RiMagicLine className="text-white text-2xl" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800">
                      <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        {campaignName}
                      </span>
                    </h1>
                    <p className="text-gray-500 mt-1 flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        isLoadedCampaign ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {isLoadedCampaign ? 'Saved Campaign' : 'New Campaign'}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="flex items-center gap-1">
                        <FaRegClock className="text-gray-400" />
                        {posts.length} posts
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={generateShareLink}
                  disabled={isSharing}
                  className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <FiShare2 className="text-lg" />
                  {isSharing ? 'Generating...' : 'Share'}
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <FiDownload className="text-lg" />
                  Export
                </button>
              </div>
            </div>

            {/* Share Link Modal */}
            {shareLink && (
              <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FiShare2 className="text-indigo-600 flex-shrink-0" />
                  <p className="text-indigo-800 truncate">{shareLink}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(shareLink)}
                  className="flex items-center gap-1 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-md hover:bg-indigo-200 transition-colors"
                >
                  <FiCopy className="text-sm" />
                  <span className="text-sm">Copy</span>
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                  <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-indigo-600 mb-4"></div>
                  <RiMagicLine className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-indigo-600 text-2xl" />
                </div>
                <p className="text-gray-600 mt-4">Loading your campaign details...</p>
                <p className="text-gray-400 text-sm mt-1">This won't take long</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-64 h-48 mb-6 flex items-center justify-center bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
                  <RiMagicLine className="text-indigo-400 text-5xl" />
                </div>
                <h3 className="text-xl font-medium text-gray-700">No posts found</h3>
                <p className="text-gray-500 mt-2 max-w-md">
                  It looks like this campaign doesn't have any posts yet. Try creating a new campaign.
                </p>
                <button
                  onClick={() => navigate('/create-campaign')}
                  className="mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:shadow-md transition-all duration-200"
                >
                  Create New Campaign
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    ref={(el) => (contentRefs.current[post.id] = el)}
                    className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all duration-300 hover:shadow-md ${
                      post.isEditing ? 'ring-2 ring-indigo-500' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 flex items-center justify-center mr-3">
                          <span className="text-indigo-600 font-medium">{post.id}</span>
                        </div>
                        <div>
                          <h2 
                            data-field="title"
                            contentEditable={post.isEditing}
                            suppressContentEditableWarning={true}
                            className={`text-lg font-semibold text-gray-800 ${post.isEditing ? 'bg-gray-50 px-2 py-1 rounded border' : ''}`}
                          >
                            {post.title || 'Untitled Post'}
                          </h2>
                          <div className="flex items-center gap-2 mt-1">
                            <span 
                              data-field="type"
                              contentEditable={post.isEditing}
                              suppressContentEditableWarning={true}
                              className={`text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full ${post.isEditing ? 'bg-gray-50 border' : ''}`}
                            >
                              {post.type || 'No type specified'}
                            </span>
                            {post.isEditing && (
                              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                                Editing
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(`${post.title}\n\n${post.description}`)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Copy post content"
                      >
                        <FiCopy className="text-sm" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start">
                        <FaRegClock className="text-gray-400 mt-1 mr-3 flex-shrink-0" />
                        <div
                          data-field="schedule"
                          contentEditable={post.isEditing}
                          suppressContentEditableWarning={true}
                          className={`flex-1 ${post.isEditing ? 'bg-gray-50 px-3 py-2 rounded-lg border border-gray-200' : ''}`}
                        >
                          {post.schedule || 'No schedule specified'}
                        </div>
                      </div>

                      <div className="flex items-start">
                        <FaRegStickyNote className="text-gray-400 mt-1 mr-3 flex-shrink-0" />
                        <div
                          data-field="description"
                          contentEditable={post.isEditing}
                          suppressContentEditableWarning={true}
                          className={`flex-1 whitespace-pre-wrap ${post.isEditing ? 'bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 min-h-[100px]' : 'text-gray-700'}`}
                        >
                          {post.description || 'No description provided'}
                        </div>
                      </div>

                      <div className="flex items-start">
                        <FaRegHandPointer className="text-gray-400 mt-1 mr-3 flex-shrink-0" />
                        <div
                          data-field="cta"
                          contentEditable={post.isEditing}
                          suppressContentEditableWarning={true}
                          className={`flex-1 ${post.isEditing ? 'bg-gray-50 px-3 py-2 rounded-lg border border-gray-200' : 'text-indigo-600 font-medium'}`}
                        >
                          {post.cta || 'No call-to-action'}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end mt-5 gap-2">
                      {post.isEditing ? (
                        <>
                          <button
                            onClick={() => handleAccept(post.id)}
                            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium px-4 py-2 rounded-lg hover:shadow-md transition-all duration-200"
                          >
                            <FiCheck className="text-md" />
                            Save
                          </button>
                          <button
                            onClick={() => handleDiscard(post.id)}
                            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200"
                          >
                            <FiX className="text-md" />
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => toggleEdit(post.id)}
                          className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200"
                        >
                          <FiEdit2 className="text-md" />
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Enhanced Sticky Footer */}
        {!isLoading && posts.length > 0 && (
          <footer className="sticky bottom-0 bg-white border-t border-gray-200 py-4 px-8 shadow-sm z-10">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                  <FaRegLightbulb className="text-indigo-500" />
                  <span>Tip: Click on any field to edit content</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => copyToClipboard(JSON.stringify(posts, null, 2))}
                  className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-sm"
                  title="Copy all posts as JSON"
                >
                  <FiCopy className="text-md" />
                  Copy JSON
                </button>
                <button
                  onClick={handleSaveSchedule}
                  disabled={isSaving}
                  className={`flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium px-5 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg ${
                    isSaving ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  <FiSave className="text-lg" />
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-pulse">Saving</span>
                    </span>
                  ) : (
                    'Save Campaign'
                  )}
                </button>
              </div>
            </div>
          </footer>
        )}
      </div>

      {/* Toast Container */}
      <ToastContainer
        position="bottom-right"
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

export default CampaignPage;