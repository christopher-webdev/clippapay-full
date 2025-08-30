// src/App.tsx

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
import AdvertiserHowTo from './components/advertiser/AdvertiserHowTo';
import CreateUGCCampaignForm from './components/advertiser/Create-Ugc.tsx';
import CreateAssetCreationCampaign from './components/advertiser/CreateAssetCreationCampaign.tsx';
import PGCApprovedVideos from './components/advertiser/PGCApprovedVideos.tsx';

// Clipper
import ClipperDashboardLayout from './components/clipper/ClipperDashboardLayout.tsx';
import ClipperDashboardOverview from './components/clipper/ClipperDashboardOverview.tsx';
import CampaignListClipper from './components/clipper/ClipperCampaignList.tsx';
import CampaignDetail from './components/clipper/CampaignDetail.tsx';
import Submissions from './components/clipper/ClipperSubmissions.tsx';
import ClipperWallet from './components/clipper/ClipperWallet.tsx';
import ClipperSettings from './components/clipper/ClipperSettings.tsx';
import ClipperHowTo from './components/clipper/ClipperHowTo';
import ClipperPGCSubmissions from './components/clipper/ClipperPGCSubmissions.tsx';

// Admin
import AdminLayout from './components/admin/AdminLayout.tsx';
import AdminOverview from './components/admin/AdminOverview.tsx';
import AdminUsersManagement from './components/admin/AdminUsersManagement.tsx';
import AdminCampaignsManagement from './components/admin/AdminCampaignsManagement.tsx';
import AdminSubmissionsManagement from './components/admin/AdminSubmissionsManagement.tsx';
import AdminWalletsManagement from './components/admin/AdminWalletsManagement.tsx';
import AdminWithdrawalsManagement from './components/admin/AdminWithdrawalsManagement.tsx';
import AdminSettings from './components/admin/AdminSettings.tsx';
import AdminCorrectApproval from './components/admin/AdminCorrectApproval.tsx';
// import AdminSubscriptions   from './components/admin/AdminSubscriptions';

import AdminSignup from '@/components/admin/AdminSignup';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminWorkerCreation from '@/components/admin/AdminWorkerCreation';

//Ad-Workers
import AdWorkerDashboard from './components/AdWorkerDashboard';
import AdWorkerCampaign from './components/AdWorkerCampaign.tsx'

import WorkerLayout from './components/WorkerLayout';

import ForgotPasswordPage from './pages/ForgotPasswordPage.tsx';
import Terms from './pages/Terms.tsx'
import Privacy from './pages/Privacy.tsx'
import { usePageView } from '@/utils/usePageView';
import Contact from './pages/Contact.tsx';
export default function App() {
  usePageView();
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomePage />} />
      <Route path="signup" element={<SignupPage />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="about" element={<AboutPage />} />
      <Route path="terms" element={<Terms />} />
      <Route path="privacy" element={<Privacy />} />
      <Route path="contact" element={<Contact />} />
      <Route path="forgot-password" element={<ForgotPasswordPage />} />
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
        <Route path="create-campaign" element={<CreateCampaignForm onClose={() => { }} />} />
        <Route path="analytics" element={<CampaignAnalytics />} />
        <Route path="wallet" element={<WalletSection />} />
        <Route path="notifications" element={<NotificationsPanel />} />
        <Route path="settings" element={<SettingsPanel />} />
        <Route path="how-to" element={<AdvertiserHowTo />} />
        <Route path="create-ugc" element={<CreateUGCCampaignForm />} />
        <Route path="create-asset-creation" element={<CreateAssetCreationCampaign />} />
        <Route path="pgc-videos" element={<PGCApprovedVideos />} />

      </Route>

      {/* Clipper */}
      <Route path="dashboard/clipper" element={<ClipperDashboardLayout />}>
        <Route index element={<ClipperDashboardOverview />} />
        <Route path="campaigns" element={<CampaignListClipper />} />
        <Route path="campaigns/:id" element={<CampaignDetail />} />
        <Route path="submissions" element={<Submissions />} />
        <Route path="wallet" element={<ClipperWallet />} />
        <Route path="settings" element={<ClipperSettings />} />
        <Route path="how-to" element={<ClipperHowTo />} />
        <Route path="pgc-submissions" element={<ClipperPGCSubmissions />} />
      </Route>

      {/* ad-worker */}
      <Route path="dashboard/ad-worker" element={<WorkerLayout />}>
        <Route index element={<AdWorkerDashboard />} />
        <Route path="campaigns" element={<AdWorkerCampaign />} />
        {/* <Route path="campaigns/:id" element={<CampaignDetail />} />
        <Route path="submissions" element={<Submissions />} />
        <Route path="wallet" element={<ClipperWallet />} />
        <Route path="settings" element={<ClipperSettings />} /> */}
      </Route>
      {/* <Route path="dashboard/ad-worker" element={< />} />
        <Route index element={< />} />
        <Route path="overview" element={<AdWorkerDashboard/>} />  
      </Route> */}

      {/* Admin */}
      <Route path="dashboard/admin" element={<AdminLayout />}>
        <Route index element={<AdminOverview />} />
        {/* <Route path="subscriptions" element={<AdminSubscriptions />} /> */}
        <Route path="users" element={<AdminUsersManagement />} />
        <Route path="campaigns" element={<AdminCampaignsManagement />} />
        <Route path="submissions" element={<AdminSubmissionsManagement />} />
        <Route path="wallets" element={<AdminWalletsManagement />} />
        <Route path="withdrawals" element={<AdminWithdrawalsManagement />} />
        <Route path='correct' element={<AdminCorrectApproval />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}
