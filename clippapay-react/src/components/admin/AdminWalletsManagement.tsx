// // // src/components/admin/WalletsManagement.tsx

// import React, { useEffect, useState } from 'react';
// import axios from 'axios';
// import { Dialog } from '@headlessui/react';
// import { CheckCircle, X, Trash2 } from 'lucide-react';

// type Deposit = {
//   _id: string;
//   user: { _id: string; email: string };
//   amount: number;
//   receiptUrl: string;
//   status: 'pending' | 'approved' | 'rejected';
//   createdAt: string;
// };

// export default function AdminDepositsDashboard() {
//   const [list, setList] = useState<Deposit[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
//   const [search, setSearch] = useState<string>('');
//   const [previewUrl, setPreviewUrl] = useState<string | null>(null);

//   const fetchAll = () => {
//     setLoading(true);
//     axios.get<Deposit[]>('admin/deposits/pending')
//       .then(res => setList(res.data))
//       .catch(err => {
//         console.error(err);
//         setError('Could not load deposits.');
//       })
//       .finally(() => setLoading(false));
//   };

//   useEffect(fetchAll, []);

//   const handleVerify = (id: string, action: 'approve' | 'reject') => {
//     axios.post(`/admin/deposits/${id}/verify`, { action })
//       .then(fetchAll)
//       .catch(() => alert('Action failed.'));
//   };

//   const handleDelete = (id: string) => {
//     if (!confirm('Delete this deposit request?')) return;
//     axios.delete(`/admin/deposits/${id}`)
//       .then(fetchAll)
//       .catch(() => alert('Delete failed.'));
//   };

//   if (loading) return <p className="text-center py-6">Loading…</p>;
//   if (error) return <p className="text-center py-6 text-red-500">{error}</p>;

//   // filter + search
//   const displayed = list
//     .filter(d => filter === 'pending' ? d.status === 'pending' : d.status === filter)
//     .filter(d => d.user.email.toLowerCase().includes(search.toLowerCase()));

//   return (
//     <div className="p-4 max-w-7xl mx-auto space-y-4">
//       <h1 className="text-2xl font-bold">Deposit Requests</h1>

//       {/* Filters */}
//       <div className="flex flex-wrap gap-2 items-center">
//         {(['pending', 'approved', 'rejected'] as const).map(f => (
//           <button
//             key={f}
//             onClick={() => setFilter(f)}
//             className={`px-4 py-2 rounded-md ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
//               }`}
//           >
//             {f.charAt(0).toUpperCase() + f.slice(1)} (
//             {list.filter(d => d.status === f).length})
//           </button>
//         ))}
//         <input
//           type="text"
//           placeholder="Search email…"
//           value={search}
//           onChange={e => setSearch(e.target.value)}
//           className="ml-auto px-3 py-2 border rounded-md w-full sm:w-64"
//         />
//       </div>

//       {/* Table */}
//       <div className="overflow-x-auto">
//         <table className="min-w-full bg-white shadow rounded-lg overflow-hidden">
//           <thead className="bg-gray-50">
//             <tr>
//               <th className="p-3 text-left text-sm font-semibold">#</th>
//               <th className="p-3 text-left text-sm font-semibold">User</th>
//               <th className="p-3 text-left text-sm font-semibold">Amount</th>
//               <th className="p-3 text-left text-sm font-semibold">Date</th>
//               <th className="p-3 text-left text-sm font-semibold">Status</th>
//               <th className="p-3 text-left text-sm font-semibold">Receipt</th>
//               <th className="p-3 text-left text-sm font-semibold">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {displayed.map((d, i) => (
//               <tr key={d._id} className="border-t">
//                 <td className="p-3 text-sm">{i + 1}</td>
//                 <td className="p-3 text-sm">{d.user.email}</td>
//                 <td className="p-3 text-sm">₦{d.amount.toLocaleString()}</td>
//                 <td className="p-3 text-sm">
//                   {new Date(d.createdAt).toLocaleDateString()}
//                 </td>
//                 <td className="p-3 text-sm">
//                   <span className={`px-2 py-1 rounded-full text-xs font-semibold ${d.status === 'pending'
//                       ? 'bg-yellow-100 text-yellow-800'
//                       : d.status === 'approved'
//                         ? 'bg-green-100 text-green-800'
//                         : 'bg-red-100 text-red-800'
//                     }`}>
//                     {d.status.toUpperCase()}
//                   </span>
//                 </td>
//                 <td className="p-3 text-sm">
//                   <img
//                     src={d.receiptUrl}
//                     alt="Receipt"
//                     className="h-8 w-8 object-cover rounded cursor-pointer"
//                     onClick={() => setPreviewUrl(d.receiptUrl)}
//                   />
//                 </td>
//                 <td className="p-3 text-sm space-x-2">
//                   {d.status === 'pending' && (
//                     <>
//                       <button
//                         onClick={() => handleVerify(d._id, 'approve')}
//                         className="text-green-600 hover:text-green-800"
//                       >
//                         <CheckCircle size={18} />
//                       </button>
//                       <button
//                         onClick={() => handleVerify(d._id, 'reject')}
//                         className="text-red-600 hover:text-red-800"
//                       >
//                         <X size={18} />
//                       </button>
//                     </>
//                   )}
//                   <button
//                     onClick={() => handleDelete(d._id)}
//                     className="text-gray-600 hover:text-gray-800"
//                   >
//                     <Trash2 size={18} />
//                   </button>
//                 </td>
//               </tr>
//             ))}
//             {displayed.length === 0 && (
//               <tr>
//                 <td colSpan={7} className="p-4 text-center text-gray-500">
//                   No matching records.
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* Receipt Preview */}
//       <Dialog
//         open={!!previewUrl}
//         onClose={() => setPreviewUrl(null)}
//         className="fixed inset-0 z-50 flex items-center justify-center p-4"
//       >
//         <div className="fixed inset-0 bg-black/30" />
//         <Dialog.Panel className="bg-white rounded-lg overflow-auto max-w-lg w-full p-4 relative">
//           <button
//             onClick={() => setPreviewUrl(null)}
//             className="absolute top-2 right-2 text-gray-500 hover:text-black"
//           >
//             <X size={24} />
//           </button>
//           {previewUrl && (
//             <img src={previewUrl} alt="Receipt" className="w-full h-auto rounded" />
//           )}
//         </Dialog.Panel>
//       </Dialog>
//     </div>
//   );
// }

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Dialog } from '@headlessui/react';
import { CheckCircle, X, Trash2, Search, Filter, Download } from 'lucide-react';

type Deposit = {
  _id: string;
  user: { 
    _id: string; 
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
  };
  amount: number;
  receiptUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
};

export default function AdminDepositsDashboard() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [search, setSearch] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalAmount: 0
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get<Deposit[]>('/admin/deposits');
      setDeposits(data);
      
      // Calculate statistics
      const pending = data.filter(d => d.status === 'pending').length;
      const approved = data.filter(d => d.status === 'approved').length;
      const rejected = data.filter(d => d.status === 'rejected').length;
      const totalAmount = data.reduce((sum, d) => sum + d.amount, 0);
      
      setStats({
        total: data.length,
        pending,
        approved,
        rejected,
        totalAmount
      });
    } catch (err) {
      console.error(err);
      setError('Failed to load deposit data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleVerify = async (id: string, action: 'approve' | 'reject') => {
    try {
      await axios.post(`/admin/deposits/${id}/verify`, { action });
      fetchData();
    } catch (err) {
      alert(`Failed to ${action} deposit: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Permanently delete this deposit record?')) return;
    try {
      await axios.delete(`/admin/deposits/${id}`);
      fetchData();
    } catch (err) {
      alert('Failed to delete deposit record');
    }
  };

  const filteredDeposits = deposits
    .filter(d => filter === 'all' || d.status === filter)
    .filter(d => 
      d.user.email.toLowerCase().includes(search.toLowerCase()) ||
      (d.user.firstName && d.user.firstName.toLowerCase().includes(search.toLowerCase())) ||
      (d.user.company && d.user.company.toLowerCase().includes(search.toLowerCase()))
    );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <X className="h-5 w-5 text-red-500" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deposit Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and manage user deposit requests
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg w-full bg-white shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="appearance-none pl-3 pr-8 py-2 border rounded-lg bg-white shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm font-medium text-gray-500">Total Deposits</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm font-medium text-gray-500">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm font-medium text-gray-500">Approved</div>
          <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm font-medium text-gray-500">Total Amount</div>
          <div className="text-2xl font-bold text-blue-600">₦{stats.totalAmount.toLocaleString()}</div>
        </div>
      </div>

      {/* Deposits List */}
      <div className="bg-white rounded-xl shadow border overflow-hidden">
        {filteredDeposits.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <div className="text-lg">No deposit requests found</div>
            <p className="text-sm mt-2">
              {search ? 'Try a different search term' : 'No deposits match the current filters'}
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {filteredDeposits.map((deposit) => (
              <li key={deposit._id} className="p-4 hover:bg-gray-50 transition">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        deposit.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        deposit.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {deposit.status.toUpperCase()}
                      </span>
                      <div>
                        <div className="font-medium">
                          {deposit.user.firstName || deposit.user.company || deposit.user.email}
                        </div>
                        <div className="text-sm text-gray-500">{deposit.user.email}</div>
                      </div>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">Amount</div>
                        <div className="font-bold">₦{deposit.amount.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Requested</div>
                        <div className="text-sm">
                          {new Date(deposit.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Receipt</div>
                        <button
                          onClick={() => setPreviewUrl(deposit.receiptUrl)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          View Receipt
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row md:flex-col gap-2">
                    {deposit.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleVerify(deposit._id, 'approve')}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 flex items-center gap-1 justify-center"
                        >
                          <CheckCircle size={16} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleVerify(deposit._id, 'reject')}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 flex items-center gap-1 justify-center"
                        >
                          <X size={16} />
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(deposit._id)}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300 flex items-center gap-1 justify-center"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Receipt Preview Modal */}
      <Dialog
        open={!!previewUrl}
        onClose={() => setPreviewUrl(null)}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="fixed inset-0 bg-black/30" />
        <Dialog.Panel className="bg-white rounded-lg overflow-auto max-w-4xl w-full p-6 relative">
          <button
            onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-medium">
              Deposit Receipt
            </Dialog.Title>
            {previewUrl && (
              <a
                href={previewUrl}
                download={`deposit-receipt-${new Date().toISOString()}.jpg`}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
              >
                <Download size={16} />
                Download
              </a>
            )}
          </div>
          {previewUrl && (
            <div className="flex justify-center">
              <img
                src={previewUrl}
                alt="Deposit receipt"
                className="max-h-[80vh] max-w-full rounded border"
              />
            </div>
          )}
        </Dialog.Panel>
      </Dialog>
    </div>
  );
}

