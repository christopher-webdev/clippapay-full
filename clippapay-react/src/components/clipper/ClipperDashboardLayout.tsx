// src/components/clipper/ClipperDashboardLayout.tsx
import React, { useState, useEffect } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiMenu,
  HiX,
  HiHome,
  HiCollection,
  HiUpload,
  HiCurrencyDollar,
  HiCog,
} from 'react-icons/hi';
import { getUserFromToken } from '@/utils/getUserFromToken'; // Adjust path as needed

const navItems = [
  { name: 'Overview', to: '', icon: <HiHome className="w-5 h-5" /> },
  { name: 'Campaigns', to: 'campaigns', icon: <HiCollection className="w-5 h-5" /> },
  { name: 'Submissions', to: 'submissions', icon: <HiUpload className="w-5 h-5" /> },
  { name: 'Earnings', to: 'wallet', icon: <HiCurrencyDollar className="w-5 h-5" /> },
  { name: 'Settings', to: 'settings', icon: <HiCog className="w-5 h-5" /> },
];

export default function ClipperDashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const user = getUserFromToken();

  useEffect(() => {
    if (!user) {
      navigate('/login'); // Redirect if not logged in
    }
  }, [user, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile header */}
      <header className="md:hidden flex items-center justify-between bg-white p-4 shadow w-full fixed top-0 z-50">
        <button onClick={() => setMobileOpen(true)}>
          <HiMenu className="w-6 h-6 text-gray-700" />
        </button>
        <Link to="/" className="flex items-center gap-2">
          <motion.img
            src="/ClippaPaye.svg"
            alt="ClippaPay Logo"
            className="h-10 w-auto"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          />
          <motion.span
            className="text-2xl font-extrabold text-blue-600 dark:text-blue-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            ClippaPay
          </motion.span>
        </Link>
      </header>

      {/* Sidebar overlay (mobile) */}
      <div
        className={`fixed inset-0 z-40 transition-transform duration-300 md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div
          className="absolute inset-0 bg-black opacity-50"
          onClick={() => setMobileOpen(false)}
        />
        <nav className="relative z-50 w-64 h-full bg-white shadow-lg p-4">
          <button className="mb-6" onClick={() => setMobileOpen(false)}>
            <HiX className="w-6 h-6 text-gray-700" />
          </button>
          <ul className="space-y-4">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  end
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center space-x-2 px-3 py-2 rounded-lg transition ${isActive
                      ? 'bg-indigo-500 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                  onClick={() => setMobileOpen(false)}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 bg-white border-r">
          <div className="h-16 flex items-center justify-center border-b">
            <h1 className="text-xl font-bold">ClippaPay - Clipper</h1>
          </div>
          <nav className="flex-1 overflow-y-auto p-6 space-y-4">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                end
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center space-x-2 px-4 py-2 rounded-lg transition ${isActive
                    ? 'bg-indigo-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                {item.icon}
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gray-50 overflow-y-auto p-6 pt-20 md:pt-6">
        <div className="flex justify-between items-center mb-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              👋 Welcome, <span className="text-cp-blue">{user?.name || 'Clipper'}</span>
            </h2>
            <div className="text-sm text-gray-500 mt-1">Let’s get you earning today!</div>
          </div>

          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm"
          >
            Logout
          </button>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
