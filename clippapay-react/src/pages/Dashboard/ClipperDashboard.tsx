// File: clippapay-react/src/pages/Dashboard/ClipperDashboard.tsx
import React from 'react';
import ClipperDashboardLayout from '@/components/ClipperDashboardLayout';
import { Outlet } from 'react-router-dom';

export default function ClipperDashboard() {
  return (
    <ClipperDashboardLayout>
      <Outlet />
    </ClipperDashboardLayout>
  );
}
