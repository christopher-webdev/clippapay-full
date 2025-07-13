// src/App.tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Public
import HomePage from './pages/HomePage';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import AboutPage from './pages/AboutPage';

// Advertiser
import AdvertiserDashboardLayout from './components/advertiser/DashboardLayout';
import AdvertiserDashboardOverview from './components/advertiser/DashboardOverview';
// import SubscriptionPlans from './components/advertiser/SubscriptionPlans.tsx';
// import SubscribePage from './components/advertiser/SubscribePage.tsx';
import AdvertiserCampaignList from './components/advertiser/AdvertiserCampaignList.tsx';
import CreateCampaignForm from './components/advertiser/CreateCampaignForm';
import CampaignAnalytics from './components/advertiser/CampaignAnalytics';
import WalletSection from './components/advertiser/WalletSection';
import NotificationsPanel from './components/advertiser/NotificationsPanel';
import SettingsPanel from './components/advertiser/SettingsPanel';

// Clipper
import ClipperDashboardLayout from './components/clipper/ClipperDashboardLayout.tsx';
import ClipperDashboardOverview from './components/clipper/ClipperDashboardOverview.tsx';
import CampaignListClipper from './components/clipper/ClipperCampaignList.tsx';
import CampaignDetail from './components/clipper/CampaignDetail.tsx';
import Submissions from './components/clipper/ClipperSubmissions.tsx';
import ClipperWallet from './components/clipper/ClipperWallet.tsx';
import ClipperSettings from './components/clipper/ClipperSettings.tsx';

// Admin
import AdminLayout from './components/admin/AdminLayout.tsx';
import AdminOverview from './components/admin/AdminOverview.tsx';
import AdminUsersManagement from './components/admin/AdminUsersManagement.tsx';
import AdminCampaignsManagement from './components/admin/AdminCampaignsManagement.tsx';
import AdminSubmissionsManagement from './components/admin/AdminSubmissionsManagement.tsx';
import AdminWalletsManagement from './components/admin/AdminWalletsManagement.tsx';
import AdminWithdrawalsManagement from './components/admin/AdminWithdrawalsManagement.tsx';
import AdminSettings from './components/admin/AdminSettings.tsx';
// import AdminSubscriptions   from './components/admin/AdminSubscriptions';

import AdminSignup from '@/components/admin/AdminSignup';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminWorkerCreation from '@/components/admin/AdminWorkerCreation';

import AdWorkerDashboard from './components/AdWorkerDashboard';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomePage />} />
      <Route path="signup" element={<SignupPage />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="about" element={<AboutPage />} />

      {/* initial super-admin signup (remove or secure after first use) */}
      <Route path="/admin/signup" element={<AdminSignup />} />

      {/* admin login */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* worker creation (protected by requireSuperAdmin on the backend) */}
      <Route path="/admin/workers" element={<AdminWorkerCreation />} />

      {/* Advertiser */}
      <Route path="dashboard/advertiser" element={<AdvertiserDashboardLayout />}>
        <Route index element={<AdvertiserDashboardOverview />} />
        <Route path="campaigns" element={<AdvertiserCampaignList />} />
        {/* <Route path="subscription-plan" element={<SubscriptionPlans />} /> */}
        {/* <Route path="subscribe" element={<SubscribePage />} /> */}
        <Route path="create-campaign" element={<CreateCampaignForm />} />
        <Route path="analytics" element={<CampaignAnalytics />} />
        <Route path="wallet" element={<WalletSection />} />
        <Route path="notifications" element={<NotificationsPanel />} />
        <Route path="settings" element={<SettingsPanel />} />
      </Route>

      {/* Clipper */}
      <Route path="dashboard/clipper" element={<ClipperDashboardLayout />}>
        <Route index element={<ClipperDashboardOverview />} />
        <Route path="campaigns" element={<CampaignListClipper />} />
        <Route path="campaigns/:id" element={<CampaignDetail />} />
        <Route path="submissions" element={<Submissions />} />
        <Route path="wallet" element={<ClipperWallet />} />
        <Route path="settings" element={<ClipperSettings />} />
      </Route>

      {/* ad-worker */}
      <Route path="dashboard/ad-worker" element={<AdWorkerDashboard />} />
        {/* <Route path="wallet" element={<ClipperWallet />} />
        <Route path="settings" element={<ClipperSettings />} /> */}
      <Route/>

      {/* Admin */}
      <Route path="dashboard/admin" element={<AdminLayout />}>
        <Route index element={<AdminOverview />} />
        {/* <Route path="subscriptions" element={<AdminSubscriptions />} /> */}
        <Route path="users" element={<AdminUsersManagement />} />
        <Route path="campaigns" element={<AdminCampaignsManagement />} />
        <Route path="submissions" element={<AdminSubmissionsManagement />} />
        <Route path="wallets" element={<AdminWalletsManagement />} />
        <Route path="withdrawals" element={<AdminWithdrawalsManagement />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}
