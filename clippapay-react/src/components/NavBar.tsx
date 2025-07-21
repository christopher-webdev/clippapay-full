// src/components/NavBar.tsx
import React, { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { HiMenu, HiX, HiSun, HiMoon } from 'react-icons/hi';
import { motion } from 'framer-motion';

const navItems = [
  // { name: 'Pricing', to: '/pricing' },
  // { name: 'Clips',   to: '/clips'   },
  // { name: 'FAQs',    to: '/faqs'    },
  { name: 'About', to: '/about' },
  { name: 'Login', to: '/login' },
];

export default function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  // const [theme, setTheme] = useState<'light' | 'dark'>(() => {
  //   if (typeof window !== 'undefined') {
  //     const stored = localStorage.getItem('theme');
  //     if (stored === 'light' || stored === 'dark') return stored;
  //     return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  //   }
  //   return 'light';
  // });

  // useEffect(() => {
  //   const root = window.document.documentElement;
  //   root.classList.remove(theme === 'dark' ? 'light' : 'dark');
  //   root.classList.add(theme);
  //   localStorage.setItem('theme', theme);
  // }, [theme]);

  // const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <nav className="relative z-50 w-full bg-white dark:bg-gray-900 shadow px-6 py-4 flex items-center justify-between">
      {/* Logo */}
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

      {/* Desktop menu */}
      <div className="hidden md:flex items-center space-x-6">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition
          ${isActive ? 'font-semibold text-blue-600 dark:text-blue-400' : ''}`
            }
          >
            {item.name}
          </NavLink>
        ))}
        <NavLink
          to="/signup"
          className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Sign Up
        </NavLink>
        {/* <button onClick={toggleTheme} className="p-2 rounded-full bg-gray-200 dark:bg-gray-800">
          {theme === 'dark'
            ? <HiSun className="w-5 h-5 text-yellow-400" />
            : <HiMoon className="w-5 h-5 text-gray-600" />}
        </button> */}
      </div>

      {/* Mobile hamburger */}
      <button
        className="md:hidden p-2 text-gray-700 dark:text-gray-300"
        onClick={() => setMobileOpen(o => !o)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <HiX className="w-6 h-6" /> : <HiMenu className="w-6 h-6" />}
      </button>

      {/* Mobile menu dropdown */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={mobileOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className={`absolute left-0 top-full w-full bg-white dark:bg-gray-900 shadow-md md:hidden overflow-hidden ${mobileOpen ? 'block' : 'hidden'
          }`}
      >
        <div className="flex flex-col px-6 py-4 space-y-4">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `block text-lg text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400
            ${isActive ? 'font-semibold text-blue-600 dark:text-blue-400' : ''}`
              }
            >
              {item.name}
            </NavLink>
          ))}
          <NavLink
            to="/signup"
            onClick={() => setMobileOpen(false)}
            className="block text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Sign Up
          </NavLink>
        </div>
      </motion.div>
    </nav>

  );
}
