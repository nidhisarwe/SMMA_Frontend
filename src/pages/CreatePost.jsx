import apiClient from '../api/apiClient';
import { api } from '../utils/api';
import { auth } from "../firebase/config";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaMagic,
  FaImage,
  FaEdit,
  FaSave,
  FaCalendarAlt,
  FaPaperPlane,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaChevronDown,
  FaChevronRight,
  FaEye,
  FaTimes,
  FaHeart,
  FaRegHeart,
  FaComment,
  FaShare,
  FaDownload,
  FaRocket,
  FaPlus,
  FaTrash,
  FaArrowLeft,
  FaArrowRight
} from "react-icons/fa";
import { BsLightningFill, BsCalendarEvent, BsThreeDots, BsBookmark, BsEmojiSmile } from "react-icons/bs";
import { MdOutlineCampaign, MdContentPaste } from "react-icons/md";
import { RiLinkedinFill, RiFacebookFill, RiTwitterFill, RiInstagramFill } from "react-icons/ri";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";

const validatePlatform = (platform) => {
  const validPlatforms = ['instagram', 'facebook', 'twitter', 'linkedin'];
  const normalizedPlatform = platform.toLowerCase();
  if (!validPlatforms.includes(normalizedPlatform)) {
    throw new Error(`Invalid platform. Must be one of: ${validPlatforms.join(', ')}`);
  }
  return normalizedPlatform;
};

const CreatePost = () => {
  const [prompt, setPrompt] = useState("");
  const [caption, setCaption] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("Instagram");
  const [uploadedImage, setUploadedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignPosts, setCampaignPosts] = useState([]);
  const [showCampaigns, setShowCampaigns] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isCarousel, setIsCarousel] = useState(false);
  const [carouselItems, setCarouselItems] = useState([]);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const navigate = useNavigate();

  // Custom arrow components
  const PrevArrow = ({ onClick }) => (
    <button 
      className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white/80 p-3 rounded-full shadow-md z-10 hover:bg-white"
      onClick={onClick}
    >
      <FaArrowLeft className="text-gray-600" />
    </button>
  );

  const NextArrow = ({ onClick }) => (
    <button 
      className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white/80 p-3 rounded-full shadow-md z-10 hover:bg-white"
      onClick={onClick}
    >
      <FaArrowRight className="text-gray-600" />
    </button>
  );

  const editorCarouselSettings = {
    dots: false,
    infinite: false,
    speed: 300,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    prevArrow: <PrevArrow />,
    nextArrow: <NextArrow />,
    afterChange: (current) => setActiveCarouselIndex(current),
    appendDots: (dots) => (
      <div className="bg-white/80 rounded-lg p-2 mt-2">
        <ul className="m-0 p-0 flex justify-center space-x-2">
          {carouselItems.map((_, i) => (
            <li
              key={i}
              className={`px-3 py-1 rounded-full text-sm font-medium cursor-pointer ${
                i === activeCarouselIndex ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
              onClick={() => document.querySelector('.carousel-editor').slickGoTo(i)}
            >
              {i + 1}
            </li>
          ))}
        </ul>
      </div>
    )
  };

  const previewCarouselSettings = {
    dots: false,
    infinite: true,
    speed: 300,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    prevArrow: <PrevArrow />,
    nextArrow: <NextArrow />,
    afterChange: (current) => setActiveCarouselIndex(current),
    appendDots: (dots) => (
      <div className="bg-white/80 rounded-lg p-2 mt-2">
        <ul className="m-0 p-0 flex justify-center space-x-2">
          {carouselItems.map((_, i) => (
            <li
              key={i}
              className={`px-3 py-1 rounded-full text-sm font-medium cursor-pointer ${
                i === activeCarouselIndex ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
              onClick={() => document.querySelector('.carousel-preview').slickGoTo(i)}
            >
              {i + 1}
            </li>
          ))}
        </ul>
      </div>
    ),
  };

  useEffect(() => {
    let interval;
    if (loading || generatingImage) {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 500);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [loading, generatingImage]);

  const CarouselSlide = ({ item, onRemove, index }) => (
    <div className="relative group">
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition">
        <button
          onClick={() => onRemove(index)}
          className="bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 transition"
        >
          <FaTrash className="text-xs" />
        </button>
      </div>
      <div className="h-64 bg-gray-100 rounded-lg overflow-hidden">
        {item.image ? (
          <img
            src={item.image}
            alt={`Slide ${index + 1}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <FaImage className="text-gray-400 text-4xl" />
          </div>
        )}
      </div>
    </div>
  );

  const updateCarouselItem = (index, field, value) => {
    const updatedItems = [...carouselItems];
    updatedItems[index][field] = value;
    setCarouselItems(updatedItems);
  };

  const addCarouselSlide = () => {
    setCarouselItems([
      ...carouselItems,
      {
        id: Date.now() + carouselItems.length,
        image: null,
      },
    ]);
  };

  const removeCarouselSlide = (index) => {
    const updatedItems = [...carouselItems];
    updatedItems.splice(index, 1);
    setCarouselItems(updatedItems);
    if (activeCarouselIndex >= updatedItems.length) {
      setActiveCarouselIndex(Math.max(0, updatedItems.length - 1));
    }
  };

  const handleCarouselImageUpload = (e, index) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB", {
          position: "top-center",
        });
        return;
      }
      const imageUrl = URL.createObjectURL(file);
      updateCarouselItem(index, 'image', imageUrl);
      toast.success("Image added to carousel!", {
        position: "top-center",
      });
    }
  };

  const generateCarouselImages = async () => {
    if (!prompt.trim()) {
      toast.warn("Please enter a prompt for image generation", {
        position: "top-center",
      });
      return;
    }

    const numImages = Math.min(carouselItems.length || 3, 5);
    setGeneratingImage(true);
    const toastId = toast.loading(`Generating ${numImages} carousel images...`, {
      position: "top-center",
    });

    try {
      const promptVariations = [
        prompt,
        `${prompt} with different perspective`,
        `${prompt} with alternative styling`,
        `${prompt} with varied composition`,
        `${prompt} with different lighting`,
      ].slice(0, numImages);

      const imagePromises = promptVariations.map(async (promptVar, index) => {
        try {
          const imageRes = await axios.post(
            "http://127.0.0.1:8000/api/generate-image/",
            { prompt: promptVar },
            {
              responseType: "blob",
              timeout: 60000,
            }
          );

          const imageUrl = URL.createObjectURL(imageRes.data);
          return {
            id: Date.now() + index,
            image: imageUrl,
            caption: promptVar
          };
        } catch (error) {
          console.error(`Error generating image ${index + 1}:`, error);
          return null;
        }
      });

      const results = await Promise.all(imagePromises);
      const successfulResults = results.filter(result => result !== null);
      
      if (successfulResults.length === 0) {
        throw new Error("Failed to generate any carousel images");
      }
      
      setCarouselItems(successfulResults);
      
      toast.update(toastId, {
        render: successfulResults.length < numImages
          ? `Generated ${successfulResults.length} out of ${numImages} images`
          : "Carousel images generated successfully!",
        type: successfulResults.length < numImages ? "info" : "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (error) {
      console.error("Carousel image generation error:", error);
      toast.update(toastId, {
        render: error.response?.data?.detail || error.message || "Failed to generate carousel images",
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setGeneratingImage(false);
    }
  };

  const PreviewModal = ({ onClose, content, platform, isCarousel }) => {
    const getPlatformIcon = () => {
      switch (platform) {
        case 'LinkedIn': return <RiLinkedinFill className="text-blue-600 text-xl" />;
        case 'Facebook': return <RiFacebookFill className="text-blue-700 text-xl" />;
        case 'Twitter': return <RiTwitterFill className="text-blue-400 text-xl" />;
        case 'Instagram': return <RiInstagramFill className="text-pink-600 text-xl" />;
        default: return <RiLinkedinFill className="text-blue-600 text-xl" />;
      }
    };

    const handleDownload = () => {
      if (isCarousel) {
        toast.info("Downloading carousel images as ZIP...", {
          position: "top-center",
        });
      } else if (content.image) {
        const link = document.createElement('a');
        link.href = content.image;
        link.download = `social-post-${new Date().getTime()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Image downloaded!", {
          position: "top-center",
          autoClose: 2000,
        });
      }
    };

    const handleEditWithCanva = () => {
      window.open("https://www.canva.com/", "_blank");
      toast.info("Redirecting to Canva for editing...", {
        position: "top-center",
        autoClose: 2000,
      });
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose}></div>
        <div className="relative bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl z-10">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition"
          >
            <FaTimes className="text-gray-600 text-sm" />
          </button>
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">
              {isCarousel ? "Carousel Post Preview" : "Post Preview"}
            </h2>
            <p className="text-gray-500 text-sm mt-1">How your post will appear on {platform}</p>
          </div>
          <div className="p-4">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                {getPlatformIcon()}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-800 text-sm">SocialSync</h3>
                <p className="text-xs text-gray-500">SocialSync Post • Just now</p>
              </div>
              <BsThreeDots className="text-gray-500 text-lg cursor-pointer hover:text-gray-700" />
            </div>
            {platform === 'LinkedIn' && isCarousel && Array.isArray(content) && content.length > 1 && (
              <div className="my-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center">
                  <RiLinkedinFill className="text-blue-600 mr-2 text-lg" />
                  <span className="text-blue-800 font-medium">LinkedIn API Limitation</span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  When posting to LinkedIn, only the first image will be used due to LinkedIn API limitations.
                </p>
              </div>
            )}
            <div className="mb-3">
              <p className="text-gray-800 text-sm whitespace-pre-line">
                {caption || "Your caption will appear here..."}
              </p>
              {caption?.length > 100 && (
                <button className="text-blue-500 text-xs mt-1 hover:underline">
                  ...see more
                </button>
              )}
            </div>
            {isCarousel ? (
              content.length > 0 ? (
                <div className="mb-4 relative h-96 overflow-hidden">
                  <Slider {...previewCarouselSettings} className="carousel-preview">
                    {content.map((item, index) => (
                      <div key={item.id} className="px-1 h-full">
                        <div className="rounded-lg overflow-hidden border border-gray-200 h-80 flex items-center justify-center bg-gray-100">
                          <img
                            src={item.image}
                            alt={`Carousel slide ${index + 1}`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>
                    ))}
                  </Slider>
                  <div className="text-center text-xs text-gray-500 mt-2">
                    Swipe to view all {content.length} images
                  </div>
                </div>
              ) : (
                <div className="mb-4 h-80 flex items-center justify-center bg-gray-100 rounded-lg">
                  <FaImage className="text-gray-400 text-4xl" />
                  <p className="text-gray-500 ml-2">No images in carousel</p>
                </div>
              )
            ) : (
              content.image ? (
                <div className="rounded-lg overflow-hidden border border-gray-200 mb-3">
                  <img
                    src={content.image}
                    alt="Post preview"
                    className="w-full h-auto object-cover"
                  />
                </div>
              ) : (
                <div className="mb-3 h-80 flex items-center justify-center bg-gray-100 rounded-lg">
                  <FaImage className="text-gray-400 text-4xl" />
                  <p className="text-gray-500 ml-2">No image selected</p>
                </div>
              )
            )}
            <div className="flex items-center justify-between text-gray-500 text-xs mb-3 px-1">
              <div className="flex items-center space-x-3">
                <span>👍 42</span>
                <span>💬 8 comments</span>
                <span>↗️ 3 shares</span>
              </div>
              <span>🔖 Saved</span>
            </div>
            <div className="flex items-center justify-between border-t border-b border-gray-200 py-1 mb-4">
              <button
                onClick={() => setIsLiked(!isLiked)}
                className="flex items-center justify-center space-x-1 text-gray-500 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition text-sm"
              >
                {isLiked ? (
                  <FaHeart className="text-red-500 text-sm" />
                ) : (
                  <FaRegHeart className="text-sm" />
                )}
                <span>Like</span>
              </button>
              <button className="flex items-center justify-center space-x-1 text-gray-500 hover:text-blue-500 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition text-sm">
                <FaComment className="text-sm" />
                <span>Comment</span>
              </button>
              <button className="flex items-center justify-center space-x-1 text-gray-500 hover:text-green-500 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition text-sm">
                <FaShare className="text-sm" />
                <span>Share</span>
              </button>
            </div>
            <div className="mb-4 flex space-x-2">
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center py-2 rounded-lg font-medium bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-md transition text-sm"
              >
                <FaDownload className="mr-1.5 text-xs" />
                {isCarousel ? "Download All Images" : "Download Image"}
              </button>
              <button
                onClick={handleEditWithCanva}
                className="flex-1 flex items-center justify-center py-2 rounded-lg font-medium bg-gradient-to-r from-green-500 to-teal-600 text-white hover:from-green-600 hover:to-teal-700 shadow-md transition text-sm"
              >
                <FaEdit className="mr-1.5 text-xs" />
                Edit with Canva
              </button>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-200 space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSaveDraft}
                disabled={loading}
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Save Draft
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSchedulePost}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Schedule Post
              </motion.button>
              <button
                onClick={() => {
                  handlePostNow();
                  onClose();
                }}
                disabled={loading}
                className={`flex items-center px-3 py-1.5 rounded-lg font-medium text-white transition duration-200 shadow-md text-sm ${
                  loading
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                }`}
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin mr-1.5 text-xs" />
                    Post Now
                  </>
                ) : (
                  <>
                    <FaPaperPlane className="mr-1.5 text-xs" />
                    Post Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        console.log("🔍 Fetching campaigns...");
        const response = await api.campaigns.getAll();
        console.log("📊 Campaigns response:", response.data);
        if (Array.isArray(response.data)) {
          setCampaigns(response.data);
          console.log(`✅ Found ${response.data.length} campaigns`);
        } else {
          console.log("⚠️ No campaigns array found in response");
          setCampaigns([]);
        }
      } catch (error) {
        console.error("❌ Error fetching campaigns:", error);
        if (error.response?.status === 401) {
          toast.error("Please log in to view campaigns", { position: "top-center", autoClose: 3000 });
        } else if (error.response?.status === 404) {
          console.log("📭 Campaigns endpoint not found");
          setCampaigns([]);
        } else {
          toast.error("Failed to load campaigns", { position: "top-center", autoClose: 3000 });
          setCampaigns([]);
        }
      }
    };

    const currentUser = auth.currentUser;
    if (currentUser) {
      fetchCampaigns();
    } else {
      console.log("👤 No authenticated user, skipping campaign fetch");
    }
  }, []);

  useEffect(() => {
    if (selectedCampaign) {
      const fetchCampaignPosts = async () => {
        try {
          console.log(`🔍 Fetching posts for campaign: ${selectedCampaign._id}`);
          const response = await api.campaigns.getById(selectedCampaign._id);
          console.log("📊 Campaign posts response:", response.data);
          let posts = [];
          if (response.data) {
            if (response.data.parsed_posts && Array.isArray(response.data.parsed_posts)) {
              posts = response.data.parsed_posts.map(post => ({
                ...post,
                description: post.description || post.title || '',
                image_url: post.image_url || null
              }));
            } else if (response.data.posts && Array.isArray(response.data.posts)) {
              posts = response.data.posts.map(post => ({
                ...post,
                description: post.caption || post.content || post.description || '',
                image_url: post.image_url || post.image_urls || null
              }));
            }
          }
          setCampaignPosts(posts);
          console.log(`✅ Found ${posts.length} posts for campaign`);
        } catch (error) {
          console.error("❌ Error fetching campaign posts:", error);
          if (error.response?.status === 401) {
            toast.error("Please log in to view campaign posts", { position: "top-center", autoClose: 3000 });
          } else if (error.response?.status === 404) {
            toast.error("Campaign not found or access denied", { position: "top-center", autoClose: 3000 });
          } else {
            toast.error("Failed to load campaign posts", { position: "top-center", autoClose: 3000 });
          }
          setCampaignPosts([]);
        }
      };
      fetchCampaignPosts();
    } else {
      setCampaignPosts([]);
    }
  }, [selectedCampaign]);

  const generateContent = async () => {
    if (!prompt.trim()) {
      toast.warn("Please enter a prompt before generating.", { position: "top-center", autoClose: 3000 });
      return;
    }

    setLoading(true);
    setGeneratingImage(true);
    // CHANGED: Dismiss any existing toasts to prevent overlap
    toast.dismiss();
    const toastId = toast.loading(isCarousel ? "Generating your carousel content..." : "Generating your content...", {
      position: "top-center",
    });

    try {
      console.log("🎯 Generating caption with:", {
        prompt: prompt.substring(0, 50) + "...",
        platform: selectedPlatform.toLowerCase(),
        is_carousel: isCarousel
      });

      const captionRes = await axios.post(
        "http://127.0.0.1:8000/api/generate-caption/",
        {
          prompt: prompt,
          platform: selectedPlatform.toLowerCase(),
          is_carousel: isCarousel,
          max_length: selectedPlatform.toLowerCase() === 'twitter' ? 240 : 300
        },
        {
          timeout: 30000,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      console.log("📝 Caption response:", captionRes.data);

      if (captionRes.data && captionRes.data.caption) {
        setCaption(captionRes.data.caption);
        toast.update(toastId, {
          render: "Caption generated! Now creating images...",
          type: "info",
          isLoading: true
        });
      } else {
        throw new Error("Invalid caption response structure");
      }

      if (isCarousel) {
        const numImages = 3;
        setCarouselItems([]);
        
        const promptVariations = [
          prompt,
          `${prompt} - variation 1`,
          `${prompt} - variation 2`,
          `${prompt} - different perspective`,
          `${prompt} - alternative style`
        ];
        
        for (let i = 0; i < Math.min(numImages, promptVariations.length); i++) {
          toast.update(toastId, {
            render: `Generating carousel image ${i+1}/${numImages}...`,
            type: "info",
            isLoading: true
          });
          
          const imageRes = await axios.post(
            "http://127.0.0.1:8000/api/generate-image/",
            { prompt: promptVariations[i] },
            { responseType: "blob", timeout: 60000 }
          );
          
          const imageUrl = URL.createObjectURL(imageRes.data);
          setCarouselItems(prev => [
            ...prev,
            { id: Date.now() + i, image: imageUrl }
          ]);
          
          if (i < numImages - 1) await new Promise(r => setTimeout(r, 500));
        }
      } else {
        const imageRes = await axios.post(
          "http://127.0.0.1:8000/api/generate-image/",
          { prompt: prompt },
          { responseType: "blob", timeout: 60000 }
        );

        const imageUrl = URL.createObjectURL(imageRes.data);
        setUploadedImage(imageUrl);
      }

      toast.update(toastId, {
        render: isCarousel ? "Carousel content generated successfully!" : "Content generated successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000
      });
    } catch (error) {
      console.error("❌ Error generating content:", error);
      const errorMessage = error.response?.data?.detail || error.message || "Failed to generate content";
      toast.update(toastId, {
        render: errorMessage,
        type: "error",
        isLoading: false,
        autoClose: 5000
      });
    } finally {
      setLoading(false);
      setGeneratingImage(false);
    }
  };

  const generateImageOnly = async () => {
    if (!prompt.trim()) {
      toast.warn("Please enter a prompt before generating image.", { position: "top-center", autoClose: 3000 });
      return;
    }

    setGeneratingImage(true);
    // CHANGED: Dismiss any existing toasts
    toast.dismiss();
    const toastId = toast.loading("Generating image...", { position: "top-center" });

    try {
      const imageRes = await axios.post(
        "http://127.0.0.1:8000/api/generate-image/",
        { prompt: prompt },
        { responseType: "blob", timeout: 60000 }
      );

      if (!imageRes.data || imageRes.data.size === 0) {
        throw new Error("Received empty image data");
      }

      const imageUrl = URL.createObjectURL(imageRes.data);
      setUploadedImage(imageUrl);

      toast.update(toastId, {
        render: "Image generated successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000
      });
    } catch (error) {
      console.error("Image generation error:", error);
      const errorMessage = error.response?.data?.error || error.message || "Failed to generate image";
      toast.update(toastId, {
        render: (
          <div className="text-center">
            <FaExclamationTriangle className="mx-auto text-red-500 text-xl mb-2" />
            <div className="font-bold">Image Generation Failed</div>
            <div className="text-sm mt-1">{errorMessage}</div>
          </div>
        ),
        type: "error",
        isLoading: false,
        autoClose: 5000
      });
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB", { position: "top-center" });
        return;
      }
      const imageUrl = URL.createObjectURL(file);
      setUploadedImage(imageUrl);
      toast.success("Image uploaded successfully!", { position: "top-center" });
    }
  };

  const showLinkedInCarouselWarning = (carouselItems) => {
    if (carouselItems.length > 1) {
      toast.info(
        <div>
          <strong>LinkedIn Carousel Limitation</strong>
          <p className="mt-1 text-sm">
            LinkedIn's API only supports single image posts. Your first carousel image will be used for LinkedIn.
          </p>
        </div>,
        {
          position: "top-center",
          autoClose: 5000,
          icon: <RiLinkedinFill className="text-blue-600 text-xl" />
        }
      );
    }
  };

  const handlePostNow = async () => {
    // CHANGED: Declare toastId at function scope
    let toastId = null;

    // CHANGED: Dismiss any existing toasts
    toast.dismiss();

    try {
      toastId = toast.loading("Posting content...", { position: "top-center" });

      if (!caption || !selectedPlatform) {
        toast.update(toastId, {
          render: "Caption and platform are required",
          type: "error",
          isLoading: false,
          autoClose: 5000,
        });
        return;
      }

      if (!auth.currentUser) {
        toast.update(toastId, {
          render: "Please log in to post content",
          type: "error",
          isLoading: false,
          autoClose: 5000,
        });
        return;
      }

      // CHANGED: Use carouselItems for image_urls if in carousel mode
      const imageUrls = isCarousel ? carouselItems.map(item => item.image).filter(Boolean) : [uploadedImage].filter(Boolean);

      if (isCarousel && imageUrls.length === 0) {
        toast.update(toastId, {
          render: "At least one image is required for carousel post",
          type: "error",
          isLoading: false,
          autoClose: 5000,
        });
        return;
      }

      if (!isCarousel && !imageUrls[0]) {
        toast.update(toastId, {
          render: "An image is required for the post",
          type: "error",
          isLoading: false,
          autoClose: 5000,
        });
        return;
      }

      // CHANGED: Show LinkedIn carousel warning if applicable
      if (selectedPlatform.toLowerCase() === 'linkedin' && isCarousel) {
        showLinkedInCarouselWarning(carouselItems);
      }

      const postData = {
        platform: selectedPlatform.toLowerCase(),
        caption,
        image_url: isCarousel ? imageUrls : imageUrls[0],
        is_carousel: isCarousel,
        user_id: auth.currentUser.uid,
      };

      console.log("📤 Posting to backend with:", {
        url: "http://127.0.0.1:8000/api/post-now/",
        data: postData,
      });

      const postResponse = await axios.post(
        "http://127.0.0.1:8000/api/post-now/",
        postData,
        {
          timeout: 30000,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await auth.currentUser.getIdToken()}`,
          },
        }
      );

      toast.update(toastId, {
        render: "Content posted successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      setCaption("");
      setUploadedImage(null);
      setCarouselItems([]);
      setIsCarousel(false);
    } catch (error) {
      console.error("Error posting content:", error.response?.data || error.message);
      const errorMessage = error.response?.data?.detail || error.message || "Failed to post content";
      toast.update(toastId, {
        render: errorMessage,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    }
  };

  const handleSchedulePost = async () => {
    if (!caption.trim()) {
      toast.warn("Caption is required for scheduling.", { position: "top-center" });
      return;
    }
    if (isCarousel && carouselItems.length === 0) {
      toast.warn("At least one image is required for carousel post.", { position: "top-center" });
      return;
    }
    if (!isCarousel && !uploadedImage) {
      toast.warn("Image is required for scheduling.", { position: "top-center" });
      return;
    }

    setLoading(true);
    // CHANGED: Dismiss any existing toasts
    toast.dismiss();
    const toastId = toast.loading("Uploading images for scheduling...", { position: "top-center" });

    try {
      const platform = validatePlatform(selectedPlatform);
      let imageUrls = [];

      if (isCarousel) {
        for (const item of carouselItems) {
          if (item.image && item.image.startsWith("blob:")) {
            const response = await fetch(item.image);
            const blob = await response.blob();
            const file = new File([blob], `carousel-image-${Date.now()}.jpg`, { type: blob.type });
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", "gtwsrzhq");
            const cloudinaryResponse = await axios.post(
              "https://api.cloudinary.com/v1_1/dgk4su3ne/image/upload",
              formData,
              { timeout: 30000 }
            );
            imageUrls.push(cloudinaryResponse.data.secure_url);
          } else if (item.image) {
            imageUrls.push(item.image);
          }
        }
      } else {
        if (uploadedImage.startsWith("blob:")) {
          const response = await fetch(uploadedImage);
          const blob = await response.blob();
          const file = new File([blob], `post-image-${Date.now()}.jpg`, { type: blob.type });
          const formData = new FormData();
          formData.append("file", file);
          formData.append("upload_preset", "gtwsrzhq");
          const cloudinaryResponse = await axios.post(
            "https://api.cloudinary.com/v1_1/dgk4su3ne/image/upload",
            formData,
            { timeout: 30000 }
          );
          imageUrls.push(cloudinaryResponse.data.secure_url);
        } else if (uploadedImage) {
          imageUrls.push(uploadedImage);
        }
      }

      if (imageUrls.length === 0) {
        throw new Error("No valid images to schedule");
      }

      navigate("/calendar", {
        state: {
          caption,
          image_url: isCarousel ? imageUrls : imageUrls[0],
          platform: platform.toLowerCase(),
          is_carousel: isCarousel,
        },
      });

      toast.update(toastId, {
        render: "Images uploaded successfully! Ready to schedule.",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (error) {
      console.error("Error preparing images for scheduling:", error);
      toast.update(toastId, {
        render: "Failed to upload images for scheduling. Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (isCarousel && carouselItems.length === 0) {
      toast.warn("At least one image is required for carousel draft.", { position: "top-center" });
      return;
    }
    if (!isCarousel && !uploadedImage) {
      toast.warn("Image is required for draft.", { position: "top-center" });
      return;
    }

    setLoading(true);
    // CHANGED: Dismiss any existing toasts
    toast.dismiss();
    const toastId = toast.loading("Saving draft...", { position: "top-center" });

    try {
      const platform = validatePlatform(selectedPlatform);
      let imageUrls = [];

      if (isCarousel) {
        for (const item of carouselItems) {
          if (item.image && item.image.startsWith("blob:")) {
            const response = await fetch(item.image);
            const blob = await response.blob();
            const file = new File([blob], `carousel-draft-${Date.now()}.jpg`, { type: blob.type });
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", "gtwsrzhq");
            const cloudinaryResponse = await axios.post(
              "https://api.cloudinary.com/v1_1/dgk4su3ne/image/upload",
              formData,
              { timeout: 30000 }
            );
            imageUrls.push(cloudinaryResponse.data.secure_url);
          } else if (item.image) {
            imageUrls.push(item.image);
          }
        }
      } else {
        if (uploadedImage.startsWith("blob:")) {
          const response = await fetch(uploadedImage);
          const blob = await response.blob();
          const file = new File([blob], `draft-${Date.now()}.jpg`, { type: blob.type });
          const formData = new FormData();
          formData.append("file", file);
          formData.append("upload_preset", "gtwsrzhq");
          const cloudinaryResponse = await axios.post(
            "https://api.cloudinary.com/v1_1/dgk4su3ne/image/upload",
            formData,
            { timeout: 30000 }
          );
          imageUrls.push(cloudinaryResponse.data.secure_url);
        } else if (uploadedImage) {
          imageUrls.push(uploadedImage);
        }
      }

      if (imageUrls.length === 0) {
        throw new Error("No valid images to save as draft");
      }

      const draftData = {
        caption: caption.trim() || "Untitled Draft",
        image_url: isCarousel ? imageUrls : imageUrls[0],
        platform: platform.toLowerCase(),
        is_carousel: isCarousel,
        prompt: prompt || "",
      };

      // Get current user for logging
      const user = auth.currentUser;
      if (!user) {
        throw new Error("You must be logged in to save drafts");
      }
      
      // Add user_id to draft data for extra validation
      draftData.user_id = user.uid;
      
      console.log(`📝 Saving draft for user: ${user.uid}`);
      console.log("Draft data:", draftData);
      
      // Use the configured API client which automatically handles authentication
      // Import is 'import apiClient from "../api/apiClient"' at the top of the file
      const response = await apiClient.post("/save-draft/", draftData);

      toast.update(toastId, {
        render: "Draft saved successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      setCaption("");
      setUploadedImage(null);
      setCarouselItems([]);
      setIsCarousel(false);
      navigate("/drafts-page");
    } catch (error) {
      console.error("Error saving draft:", error);
      
      let errorMessage = "Failed to save draft. Please try again.";
      
      if (error.message === "You must be logged in to save drafts") {
        errorMessage = "Please log in to save drafts";
        navigate('/auth'); // Redirect to auth page
      } else if (error.response?.status === 401) {
        errorMessage = "Authentication required. Please log in again.";
        navigate('/auth'); // Redirect to auth page on 401
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to save drafts";
      }
      
      toast.update(toastId, {
        render: errorMessage,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUsePost = (post) => {
    try {
      console.log("🔧 Using post:", post);
      const promptText = post.description || post.title || post.caption || post.content || "";
      setPrompt(promptText);
      setShowCampaigns(false);
      toast.success("Content loaded to AI generator!", { position: "top-center", autoClose: 2000 });
    } catch (error) {
      console.error("❌ Error using post:", error);
      toast.error("Failed to load post content", { position: "top-center", autoClose: 3000 });
    }
  };

  const toggleCarouselMode = () => {
    const newIsCarousel = !isCarousel;
    setIsCarousel(newIsCarousel);

    if (newIsCarousel) {
      setCarouselItems(
        uploadedImage
          ? [{ id: Date.now(), image: uploadedImage }]
          : [{ id: Date.now(), image: null }]
      );
    } else {
      if (carouselItems.length > 0 && carouselItems[0].image) {
        setUploadedImage(carouselItems[0].image);
      }
      setCarouselItems([]);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen flex font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        {/* CHANGED: Removed toastId prop from ToastContainer */}
        <ToastContainer
          position="top-center"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
        {(loading || generatingImage) && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 transition-all duration-300 ease-out">
            <div className="bg-white/90 p-8 rounded-2xl shadow-2xl border border-white/20 w-full max-w-md transform transition-all duration-300 scale-95 hover:scale-100">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <FaRocket className="text-white text-3xl animate-bounce" />
                  </div>
                  <div className="absolute -inset-2 border-4 border-indigo-200 rounded-full animate-ping opacity-75"></div>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  {generatingImage ? "Generating Your Image" : "Crafting Your Content"}
                </h3>
                <p className="text-gray-600 mb-6 max-w-md">
                  {generatingImage
                    ? "Our AI is creating a stunning visual based on your description"
                    : "Our AI is analyzing your requirements and generating high-quality content"}
                </p>
                <div className="w-full mb-4">
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{progress}% complete</p>
                </div>
                <div className="flex space-x-2 mt-2">
                  {['Analyzing', 'Generating', 'Optimizing', 'Finalizing'].map((step, index) => (
                    <span
                      key={index}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        progress > index * 25
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {step}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {showPreview && (
          <PreviewModal
            onClose={() => setShowPreview(false)}
            content={isCarousel ? carouselItems : { image: uploadedImage }}
            platform={selectedPlatform}
            isCarousel={isCarousel}
          />
        )}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full">
                  <div
                    className="flex items-center justify-between cursor-pointer mb-4"
                    onClick={() => setShowCampaigns(!showCampaigns)}
                  >
                    <div className="flex items-center">
                      <MdOutlineCampaign className="text-blue-600 mr-2 text-xl" />
                      <h2 className="text-xl font-semibold text-gray-800">Campaigns</h2>
                    </div>
                    {showCampaigns ? <FaChevronDown className="text-gray-500" /> : <FaChevronRight className="text-gray-500" />}
                  </div>
             {showCampaigns && (
  <div className="space-y-2 max-h-[300px] overflow-y-auto">
    {campaigns.length > 0 ? (
      campaigns.map((campaign) => (
        <div
          key={campaign._id}
          className={`p-3 rounded-lg cursor-pointer transition ${
            selectedCampaign?._id === campaign._id
              ? "bg-blue-50 border border-blue-200"
              : "hover:bg-gray-50"
          }`}
          onClick={() => setSelectedCampaign(campaign)}
        >
          <h3 className="font-medium text-gray-800">{campaign.campaign_name}</h3>
          <p className="text-sm text-gray-500">
            {campaign.post_count || campaign.parsed_posts?.length || 0} posts
          </p>
        </div>
      ))
    ) : (
      <p className="text-gray-500 text-sm">No campaigns found</p>
    )}
  </div>
)}
                  {selectedCampaign && campaignPosts.length > 0 && (
                    <div className="mt-6">
                      <div className="flex items-center mb-3">
                        <MdContentPaste className="text-purple-600 mr-2" />
                        <h3 className="font-medium text-gray-800">
                          Posts in {selectedCampaign.campaign_name}
                        </h3>
                      </div>
                      <div className="space-y-4 max-h-[400px] overflow-y-auto">
                        {campaignPosts.map((post, index) => (
                          <div
                            key={index}
                            className="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition"
                          >
                            {post.image_url && (
                              <img
                                src={post.image_url}
                                alt="Post preview"
                                className="w-full h-auto rounded mb-2"
                              />
                            )}
                            <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                              {post.description || post.title || "No caption"}
                            </p>
                            <button
                              onClick={() => handleUsePost(post)}
                              className="w-full py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition flex items-center justify-center"
                            >
                              <FaMagic className="mr-2" />
                              Use This Post
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="lg:col-span-3 space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all hover:shadow-md">
                  <div className="flex items-center mb-4">
                    <div className="bg-blue-100 p-2 rounded-lg mr-3">
                      <BsLightningFill className="text-blue-600 text-lg" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800">
                      AI Content Generator
                    </h2>
                  </div>
                  <textarea
                    rows={5}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    placeholder="Describe what you want to post about (e.g., 'launching a new summer collection')..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                  <div className="mt-4 flex justify-between items-center">
                    <span className={`text-sm ${prompt.length > 450 ? "text-red-500" : "text-gray-500"}`}>
                      {prompt.length}/500
                    </span>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition duration-200 shadow-sm"
                      >
                        <FaEye className="mr-2" />
                        Preview
                      </button>
                      <button
                        onClick={generateContent}
                        disabled={loading || generatingImage}
                        className={`flex items-center px-4 py-2 rounded-lg font-medium transition ${
                          loading || generatingImage
                            ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                            : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-md"
                        }`}
                      >
                        {loading || generatingImage ? (
                          <>
                            <FaSpinner className="animate-spin mr-2" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <FaMagic className="mr-2" />
                            Generate Content
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all hover:shadow-md">
                  <div className="flex items-center mb-4">
                    <div className="bg-purple-100 p-2 rounded-lg mr-3">
                      <FaEdit className="text-purple-600 text-lg" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800">Caption</h2>
                  </div>
                  <textarea
                    rows={5}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    placeholder="Your caption will appear here or write your own..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    maxLength={2200}
                  />
                  <div className="mt-4 flex justify-between items-center">
                    <div className="w-full">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Platform
                      </label>
                      <select
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                        value={selectedPlatform}
                        onChange={(e) => setSelectedPlatform(e.target.value)}
                      >
                        <option>Instagram</option>
                        <option>Twitter</option>
                        <option>Facebook</option>
                        <option>LinkedIn</option>
                      </select>
                    </div>
                    <div className="ml-4 text-right">
                      <span
                        className={`text-sm ${caption.length > 2000 ? "text-red-500" : "text-gray-500"}`}
                      >
                        {caption.length}/2200
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="bg-green-100 p-2 rounded-lg mr-3">
                        <FaImage className="text-green-600 text-lg" />
                      </div>
                      <h2 className="text-xl font-semibold text-gray-800">
                        {isCarousel ? "Carousel Options" : "Image Options"}
                      </h2>
                    </div>
                    <div className="flex items-center">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isCarousel}
                          onChange={toggleCarouselMode}
                          className="sr-only peer"
                        />
                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        <span className="ms-3 text-sm font-medium text-gray-700">
                          Carousel Mode
                        </span>
                      </label>
                    </div>
                  </div>
                  {isCarousel ? (
                    <div className="space-y-4">
                      <Slider {...editorCarouselSettings} className="carousel-editor">
                        {carouselItems.map((item, index) => (
                          <div key={item.id} className="px-2">
                            <CarouselSlide
                              item={item}
                              index={index}
                              onRemove={removeCarouselSlide}
                            />
                            <div className="mt-3">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Upload Image for Slide {index + 1}
                              </label>
                              <div className="flex space-x-3">
                                <label className="flex-1 cursor-pointer">
                                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition">
                                    <div className="flex flex-col items-center justify-center space-y-1">
                                      <FaImage className="text-gray-400" />
                                      <p className="text-sm text-gray-600">Upload Image</p>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleCarouselImageUpload(e, index)}
                                        className="hidden"
                                      />
                                    </div>
                                  </div>
                                </label>
                                <button
                                  onClick={() => updateCarouselItem(index, 'image', null)}
                                  disabled={!item.image}
                                  className={`px-4 py-2 border rounded-lg ${item.image ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-gray-400 border-gray-200 cursor-not-allowed'}`}
                                >
                                  <FaTrash className="inline mr-1" /> Remove
                                </button>
                              </div>
                              {item.image && (
                                <div className="mt-3 flex space-x-2">
                                  <button
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = item.image;
                                      link.download = `carousel-slide-${index + 1}.jpg`;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                      toast.success(`Slide ${index + 1} downloaded!`, {
                                        position: "top-center",
                                        autoClose: 2000,
                                      });
                                    }}
                                    className="flex-1 flex items-center justify-center py-2 rounded-lg font-medium bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-md transition text-sm"
                                  >
                                    <FaDownload className="mr-1.5 text-xs" />
                                    Download Slide
                                  </button>
                                  <button
                                    onClick={() => {
                                      window.open("https://www.canva.com/", "_blank");
                                      toast.info(`Opening Canva for Slide ${index + 1}...`, {
                                        position: "top-center",
                                        autoClose: 2000,
                                      });
                                    }}
                                    className="flex-1 flex items-center justify-center py-2 rounded-lg font-medium bg-gradient-to-r from-green-500 to-teal-600 text-white hover:from-green-600 hover:to-teal-700 shadow-md transition text-sm"
                                  >
                                    <FaEdit className="mr-1.5 text-xs" />
                                    Edit with Canva
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </Slider>
                      <div className="flex space-x-3">
                        <button
                          onClick={addCarouselSlide}
                          disabled={carouselItems.length >= 10}
                          className={`flex items-center px-4 py-2 rounded-lg ${carouselItems.length >= 10 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                        >
                          <FaPlus className="mr-2" /> Add Slide
                        </button>
                        <button
                          onClick={generateCarouselImages}
                          disabled={generatingImage}
                          className={`flex-1 flex items-center justify-center py-2 rounded-lg font-medium ${generatingImage ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-green-600 to-teal-600 text-white hover:from-green-700 hover:to-teal-700 shadow-md'}`}
                        >
                          {generatingImage ? (
                            <>
                              <FaSpinner className="animate-spin mr-2" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <FaMagic className="mr-2" />
                              Generate All Images
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        {uploadedImage ? (
                          <div className="relative group">
                            <img
                              src={uploadedImage}
                              alt="Uploaded preview"
                              className="w-full h-64 object-contain mx-auto"
                            />
                            <button
                              onClick={() => setUploadedImage(null)}
                              className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 transition opacity-0 group-hover:opacity-100"
                            >
                              <FaTimes className="text-xs" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <FaImage className="text-gray-400 text-4xl" />
                            <p className="text-gray-500">No image selected</p>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="cursor-pointer">
                          <div className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition text-center">
                            <div className="flex flex-col items-center justify-center space-y-1">
                              <FaImage className="text-gray-400" />
                              <p className="text-sm text-gray-600">Upload Image</p>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                              />
                            </div>
                          </div>
                        </label>
                        <button
                          onClick={generateImageOnly}
                          disabled={generatingImage || !prompt.trim()}
                          className={`flex flex-col items-center justify-center p-3 rounded-lg font-medium transition ${
                            generatingImage || !prompt.trim()
                              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                              : "bg-gradient-to-r from-green-600 to-teal-600 text-white hover:from-green-700 hover:to-teal-700 shadow-md"
                          }`}
                        >
                          {generatingImage ? (
                            <>
                              <FaSpinner className="animate-spin mb-1" />
                              <span className="text-xs">Generating...</span>
                            </>
                          ) : (
                            <>
                              <FaMagic className="mb-1" />
                              <span className="text-xs">Generate with AI</span>
                            </>
                          )}
                        </button>
                      </div>
                      {uploadedImage && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = uploadedImage;
                              link.download = `social-post-${new Date().getTime()}.jpg`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              toast.success("Image downloaded!", {
                                position: "top-center",
                                autoClose: 2000,
                              });
                            }}
                            className="flex-1 flex items-center justify-center py-2 rounded-lg font-medium bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-md transition text-sm"
                          >
                            <FaDownload className="mr-1.5 text-xs" />
                            Download Image
                          </button>
                          <button
                            onClick={() => {
                              window.open("https://www.canva.com/", "_blank");
                              toast.info("Redirecting to Canva for editing...", {
                                position: "top-center",
                                autoClose: 2000,
                              });
                            }}
                            className="flex-1 flex items-center justify-center py-2 rounded-lg font-medium bg-gradient-to-r from-green-500 to-teal-600 text-white hover:from-green-600 hover:to-teal-700 shadow-md transition text-sm"
                          >
                            <FaEdit className="mr-1.5 text-xs" />
                            Edit with Canva
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
        <footer className="sticky bottom-0 bg-white border-t border-gray-200 shadow-sm py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSaveDraft}
                disabled={loading}
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Save Draft
              </motion.button>
              <button
                onClick={() => setShowPreview(true)}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition duration-200 shadow-sm"
              >
                <FaEye className="mr-2" />
                Preview {isCarousel ? "Carousel" : "Post"}
              </button>
              <button
                onClick={handlePostNow}
                disabled={loading || (isCarousel && (carouselItems.length === 0 || carouselItems.some(item => !item.image)))}
                className={`flex items-center px-4 py-2 rounded-lg font-medium text-white transition duration-200 shadow-md ${
                  loading
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                }`}
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Post Now
                  </>
                ) : (
                  <>
                    <FaPaperPlane className="mr-2" />
                    Post Now
                  </>
                )}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default CreatePost;
