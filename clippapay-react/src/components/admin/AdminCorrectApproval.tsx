import React, { useState } from 'react';
import axios from 'axios';
import { HiExclamationCircle, HiCheckCircle, HiSearch, HiPencilAlt } from 'react-icons/hi';

interface User {
  _id: string;
  email: string;
  name: string;
}

interface Proof {
  _id: string;
  platform: string;
  submissionUrl: string;
  verifiedViews: number;
  rewardAmount: number;
  status: string;
  lastVerified: string;
  views?: number;
  proofVideo?: string;
  proofImage?: string;
  adminNote?: string;
}

interface Submission {
  _id: string;
  campaign?: {
    _id: string;
    title?: string;
  };
  clipper?: {
    _id: string;
    email: string;
    name: string;
  };
  proofs: Proof[];
  createdAt: string;
  updatedAt: string;
}

const API_BASE = import.meta.env.VITE_API_URL || "";

const AdminCorrectApproval = () => {
  const [email, setEmail] = useState('chrisnwok@gmail.com');
  const [user, setUser] = useState<User | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Correction modal state
  const [correctingProof, setCorrectingProof] = useState<{
    submissionId: string;
    proofId: string;
    currentViews: number;
    platform: string;
  } | null>(null);
  const [correctViews, setCorrectViews] = useState('');
  const [correctionNote, setCorrectionNote] = useState('');
  const [correcting, setCorrecting] = useState(false);
  const [correctionError, setCorrectionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const searchUser = async () => {
    if (!email) {
      setError('Please enter an email');
      return;
    }

    setLoading(true);
    setError('');
    setUser(null);
    setSubmissions([]);
    setSuccessMessage('');

    try {
      // 1. Find user by email
      const userRes = await axios.get(`${API_BASE}/admin/submissions/find-user`, {
        params: { email },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        withCredentials: true
      });

      setUser(userRes.data);

      // 2. Fetch user's submissions
      const submissionsRes = await axios.get(`${API_BASE}/admin/submissions/user-submissions`, {
        params: {
          userId: userRes.data._id,
          status: 'approved'
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        withCredentials: true
      });

      setSubmissions(submissionsRes.data);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error ||
        (err.response?.status === 404 ? 'No submissions found' : 'Failed to fetch data');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const openCorrectionModal = (submissionId: string, proof: Proof) => {
    setCorrectingProof({
      submissionId,
      proofId: proof._id,
      currentViews: proof.verifiedViews,
      platform: proof.platform
    });
    setCorrectViews(proof.verifiedViews.toString());
    setCorrectionNote(proof.adminNote || '');
    setCorrectionError('');
    setSuccessMessage('');
  };

  const handleCorrectApproval = async () => {
    if (!correctingProof || !correctViews) {
      setCorrectionError('Please enter correct view count');
      return;
    }

    const views = Number(correctViews);
    if (isNaN(views) || views < 0) {
      setCorrectionError('Please enter a valid view count');
      return;
    }

    setCorrecting(true);
    setCorrectionError('');

    try {
      const response = await axios.post(
        `${API_BASE}/admin/submissions/correct-approval`,
        {
          submissionId: correctingProof.submissionId,
          proofId: correctingProof.proofId,
          correctViews: views,
          note: correctionNote
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          withCredentials: true
        }
      );

      setSuccessMessage('Approval successfully corrected');

      // Refresh data
      if (user) {
        await searchUser();
      }

      // Close modal after 2 seconds
      setTimeout(() => {
        setCorrectingProof(null);
        setSuccessMessage('');
      }, 2000);
    } catch (err: any) {
      setCorrectionError(err.response?.data?.error || 'Failed to correct approval');
    } finally {
      setCorrecting(false);
    }
  };

  const getCampaignTitle = (submission: Submission) => {
    return submission.campaign?.title || 'Deleted Campaign';
  };

  const getClipperName = (submission: Submission) => {
    return submission.clipper?.name || 'Unknown Clipper';
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Correct Wrong Approval</h1>

      {/* Search Section */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-3">1. Find User</h2>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter clipper email"
            className="flex-1 border p-2 rounded"
          />
          <button
            onClick={searchUser}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 disabled:bg-blue-300"
          >
            <HiSearch className="w-5 h-5" />
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* User Info */}
      {user && (
        <div className="mb-6 p-4 border rounded-lg bg-blue-50">
          <h2 className="text-lg font-semibold mb-2">User Found</h2>
          <p><span className="font-medium">Email:</span> {user.email}</p>
          <p><span className="font-medium">Name:</span> {user.name}</p>
        </div>
      )}

      {/* Submissions List */}
      {submissions.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Approved Submissions</h2>
          {submissions.map(sub => (
            <div key={sub._id} className="border p-4 rounded-lg">
              <h3 className="font-medium">{getCampaignTitle(sub)}</h3>
              <p className="text-sm text-gray-600">Clipper: {getClipperName(sub)}</p>

              <div className="mt-4 space-y-3">
                {sub.proofs.map(proof => (
                  <div key={proof._id} className="p-3 border rounded-lg flex justify-between items-start">
                    <div>
                      <p className="font-medium">{proof.platform}</p>
                      <p>Status:
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${proof.status === 'approved' ? 'bg-green-100 text-green-800' :
                            proof.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                          }`}>
                          {proof.status}
                        </span>
                      </p>
                      <p>Reported Views: {proof.views || 0}</p>
                      <p>Verified Views: {proof.verifiedViews || 0}</p>
                      <p>Reward: ₦{proof.rewardAmount?.toLocaleString() || 0}</p>
                      {proof.adminNote && (
                        <p className="text-xs text-gray-600 mt-1">Note: {proof.adminNote}</p>
                      )}
                    </div>

                    {proof.status === 'approved' && (
                      <button
                        onClick={() => openCorrectionModal(sub._id, proof)}
                        className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 text-sm"
                      >
                        <HiPencilAlt className="w-4 h-4" />
                        Correct
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        !loading && user && (
          <p className="text-gray-500 py-4">
            No approved submissions found for this user
          </p>
        )
      )}

      {/* Error Message */}
      {error && !loading && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="text-center py-4">Loading...</div>
      )}

      {/* Correction Modal */}
      {correctingProof && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Correct Approval</h2>

            <div className="mb-4">
              <p className="font-medium">Platform: {correctingProof.platform}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Currently Approved Views
              </label>
              <input
                type="number"
                value={correctingProof.currentViews}
                readOnly
                className="w-full p-2 border rounded bg-gray-100"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Correct View Count *
              </label>
              <input
                type="number"
                value={correctViews}
                onChange={(e) => setCorrectViews(e.target.value)}
                min="0"
                className="w-full p-2 border rounded"
                placeholder="Enter correct views"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Correction Note
              </label>
              <textarea
                value={correctionNote}
                onChange={(e) => setCorrectionNote(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Reason for correction..."
                rows={3}
              />
            </div>

            {correctionError && (
              <div className="text-red-600 mb-4">{correctionError}</div>
            )}

            {successMessage && (
              <div className="text-green-600 mb-4">{successMessage}</div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCorrectingProof(null)}
                disabled={correcting}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCorrectApproval}
                disabled={correcting}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-400"
              >
                {correcting ? 'Processing...' : 'Submit Correction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCorrectApproval;