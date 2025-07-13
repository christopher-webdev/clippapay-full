import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Outlet } from 'react-router-dom';

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
