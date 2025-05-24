import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Import page components
import SocialSyncLanding from "./pages/SocialSyncLanding";
import AuthPage from "./pages/AuthPage";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import SocialDashboard from "./pages/SocialDashboard";
import Dashboard from "./pages/Dashboard";
import CalendarPage from "./pages/CalendarPage";
import ContentCalendar from "./pages/ContentCalendar";
import CreateCampaign from "./pages/CreateCampaign";
import CampaignPage from "./pages/CampaignPage";
import CreatePost from "./pages/CreatePost";
import ChatSupport from "./pages/ChatSupport";
import DraftsPage from "./pages/DraftsPage";
import Accounts from "./pages/Accounts";
import SavedCampaigns from "./pages/SavedCampaigns";

// Import Auth Provider and Auth Guard
import { AuthProvider } from "./contexts/AuthContext";
import AuthGuard from "./components/AuthGuard";

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Landing Page - Default route */}
          <Route path="/" element={<SocialSyncLanding />} />

          {/* Authentication Routes */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Routes */}
          <Route
            path="/social-dashboard"
            element={
              <AuthGuard>
                <SocialDashboard />
              </AuthGuard>
            }
          />
          <Route
            path="/dashboard"
            element={
              <AuthGuard>
                <Dashboard />
              </AuthGuard>
            }
          />
          <Route
            path="/calendar"
            element={
              <AuthGuard>
                <CalendarPage />
              </AuthGuard>
            }
          />
          <Route
            path="/content-calendar"
            element={
              <AuthGuard>
                <ContentCalendar />
              </AuthGuard>
            }
          />
          <Route
            path="/create-campaign"
            element={
              <AuthGuard>
                <CreateCampaign />
              </AuthGuard>
            }
          />
          <Route
            path="/campaign"
            element={
              <AuthGuard>
                <CampaignPage />
              </AuthGuard>
            }
          />
          
          {/* FIXED: Add the missing /campaigns route */}
          <Route
            path="/campaigns"
            element={
              <AuthGuard>
                <SavedCampaigns />
              </AuthGuard>
            }
          />
          
          <Route
            path="/saved-campaigns"
            element={
              <AuthGuard>
                <SavedCampaigns />
              </AuthGuard>
            }
          />
          <Route
            path="/campaign/:campaignId"
            element={
              <AuthGuard>
                <CampaignPage />
              </AuthGuard>
            }
          />
          <Route
            path="/create-post"
            element={
              <AuthGuard>
                <CreatePost />
              </AuthGuard>
            }
          />
          <Route
            path="/chat-support"
            element={
              <AuthGuard>
                <ChatSupport />
              </AuthGuard>
            }
          />
          <Route
            path="/drafts-page"
            element={
              <AuthGuard>
                <DraftsPage />
              </AuthGuard>
            }
          />
          <Route
            path="/accounts"
            element={
              <AuthGuard>
                <Accounts />
              </AuthGuard>
            }
          />

          {/* Redirects for legacy paths */}
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          <Route path="/register" element={<Navigate to="/auth" replace />} />

          {/* Optional: Catch-all for 404 */}
          {/* <Route path="*" element={<NotFoundPage />} /> */}
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;