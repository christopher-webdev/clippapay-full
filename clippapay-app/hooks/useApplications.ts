// hooks/useApplications.ts
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getToken } from '../utils/auth';

const API_BASE = 'https://clippapay.com/api';

export function useApplications() {
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);

  const fetchPendingCount = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return 0;
      
      const response = await axios.get(
        `${API_BASE}/applications/advertiser/pending-count`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPendingCount(response.data.count || 0);
      return response.data.count;
    } catch (error) {
      console.error('Error fetching pending count:', error);
      return 0;
    }
  }, []);

  const fetchApplications = useCallback(async (campaignId?: string) => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) throw new Error('No token');

      const url = campaignId 
        ? `${API_BASE}/applications/campaign/${campaignId}`
        : `${API_BASE}/applications/advertiser/all`;

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setApplications(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching applications:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshCount = useCallback(async () => {
    await fetchPendingCount();
  }, [fetchPendingCount]);

  useEffect(() => {
    fetchPendingCount();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, [fetchPendingCount]);

  return {
    pendingCount,
    applications,
    loading,
    refreshCount,
    fetchApplications,
    fetchPendingCount,
  };
}