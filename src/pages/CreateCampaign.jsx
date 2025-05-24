import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { FaCalendarAlt, FaRobot, FaMagic, FaFileSignature, FaLightbulb, FaRocket } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/apiClient';

export default function CreateCampaign() {
  const [formData, setFormData] = useState({
    name: '',
    theme: '',
    count: 1,
    startDate: '',
    endDate: '',
  });

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const progressIntervalRef = useRef(null);
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !currentUser) {
      toast.error('You must be logged in to create a campaign');
      navigate('/auth');
      return;
    }
  }, [currentUser, authLoading, navigate]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'count' ? parseInt(value, 10) || 1 : value,
    }));
  };

  const validateForm = () => {
    const { name, theme, count, startDate, endDate } = formData;

    if (name.length < 3) {
      toast.error('Campaign name must be at least 3 characters.');
      return false;
    }

    if (theme.length < 3) {
      toast.error('Theme must be at least 3 characters.');
      return false;
    }

    if (count < 1 || count > 50) {
      toast.error('Number of posts must be between 1 and 50.');
      return false;
    }

    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates.');
      return false;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('End date must be after start date.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (!currentUser) {
      toast.error('You must be logged in to create a campaign');
      navigate('/auth');
      return;
    }

    try {
      setLoading(true);
      setProgress(0);
      setError(null);

      toast.info('Generating your campaign. This might take up to 2 minutes...');

      progressIntervalRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressIntervalRef.current);
            return prev;
          }
          return prev + 3;
        });
      }, 1000);

      const payload = {
        name: formData.name,
        theme: formData.theme,
        count: formData.count,
        startDate: formData.startDate,
        endDate: formData.endDate,
      };
      console.log('Sending campaign creation payload:', JSON.stringify(payload, null, 2));

      const response = await api.post('/plan-campaign/', payload);

      clearInterval(progressIntervalRef.current);
      setProgress(100);

      console.log('Campaign creation response:', JSON.stringify(response.data, null, 2));

      if (response.data && response.data.campaign_id) {
        toast.success('Campaign generated successfully!');
        setTimeout(() => {
          navigate(`/campaign/${response.data.campaign_id}`);
        }, 1500);
      } else {
        throw new Error('Invalid response structure: Missing campaign_id');
      }
    } catch (err) {
      console.error('Campaign creation error:', err);

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }

      let errorMessage = 'Error generating campaign. Please try again.';
      if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        errorMessage = 'Campaign generation timed out. Try a simpler theme or fewer posts.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Session expired. Please log in again.';
        navigate('/auth');
      } else if (err.response?.status === 400) {
        errorMessage = err.response.data?.detail || 'Invalid campaign data.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50 font-[Poppins]">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
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
    <div className="flex min-h-screen bg-gray-50 font-[Poppins]">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        <div className="p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 shadow-md">
                <FaMagic className="text-white text-2xl" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Create AI Campaign</h1>
                <p className="text-gray-600">Generate a complete content campaign with AI for your account</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <form
                  onSubmit={handleSubmit}
                  className="space-y-6 bg-white p-8 rounded-xl shadow-sm border border-gray-100"
                >
                  <div className="space-y-6">
                    {error && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Error generating campaign</h3>
                            <div className="mt-2 text-sm text-red-700">
                              <p>{error}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <FaFileSignature className="text-blue-500" /> Campaign Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="mt-1 block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                        placeholder="e.g., Summer Marketing Blitz"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <FaLightbulb className="text-yellow-500" /> Campaign Theme
                      </label>
                      <input
                        type="text"
                        name="theme"
                        value={formData.theme}
                        onChange={handleChange}
                        className="mt-1 block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition duration-200"
                        placeholder="e.g., AI in Digital Marketing"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">Describe the main topic or focus of your campaign</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <FaRobot className="text-purple-500" /> Number of Posts
                      </label>
                      <input
                        type="number"
                        name="count"
                        value={formData.count}
                        onChange={handleChange}
                        className="mt-1 block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition duration-200"
                        min="1"
                        max="50"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">Between 1 and 50 posts</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                          <FaCalendarAlt className="text-red-500" /> Start Date
                        </label>
                        <input
                          type="date"
                          name="startDate"
                          value={formData.startDate}
                          onChange={handleChange}
                          className="mt-1 block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition duration-200"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                          <FaCalendarAlt className="text-green-500" /> End Date
                        </label>
                        <input
                          type="date"
                          name="endDate"
                          value={formData.endDate}
                          onChange={handleChange}
                          className="mt-1 block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-200 ease-in-out transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Generating Campaign...' : 'Generate Campaign'}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FaMagic className="text-indigo-500" /> Campaign Tips
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-2">Personal Content</h4>
                      <p className="text-sm text-blue-700">Your campaigns are private and only visible to you. Create content that aligns with your brand and goals.</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-800 mb-2">Theme Selection</h4>
                      <p className="text-sm text-purple-700">Be specific with your theme. Instead of "Marketing", try "AI-Powered Social Media Marketing Strategies".</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-800 mb-2">Post Count</h4>
                      <p className="text-sm text-green-700">For best results, aim for 10-20 posts for a 2-week campaign. More posts may dilute quality.</p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <h4 className="font-medium text-yellow-800 mb-2">Data Privacy</h4>
                      <p className="text-sm text-yellow-700">All your campaign data is secure and isolated. Other users cannot access your content.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 transition-all duration-300 ease-out">
          <div className="bg-white/90 p-8 rounded-2xl shadow-2xl border border-white/20 w-full max-w-md transform transition-all duration-300 scale-95 hover:scale-100">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <FaRocket className="text-white text-3xl animate-bounce" />
                </div>
                <div className="absolute -inset-2 border-4 border-indigo-200 rounded-full animate-ping opacity-75"></div>
              </div>

              <h3 className="text-2xl font-bold text-gray-800 mb-2">Crafting Your Personal Campaign</h3>
              <p className="text-gray-600 mb-6 max-w-md">
                Our AI is creating personalized content for your account. This will be saved securely to your profile.
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
                {['Generating ideas', 'Writing content', 'Optimizing', 'Finalizing'].map((step, index) => (
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
        theme="light"
      />
    </div>
  );
}