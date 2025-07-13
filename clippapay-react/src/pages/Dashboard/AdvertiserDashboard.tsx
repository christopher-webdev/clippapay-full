import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Outlet } from 'react-router-dom';

export default function AdvertiserDashboard() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}
