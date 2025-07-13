// // File: src/components/admin/AdminSubscriptionsDashboard.tsx

// import React, { useEffect, useState } from 'react';
// import axios from 'axios';
// import { Dialog } from '@headlessui/react';
// import { CheckCircle, X, Trash2 } from 'lucide-react';

// type Subscription = {
//   _id: string;
//   user: { _id: string; email: string };
//   plan: { name: string; market: string; durationMonths: number };
//   paymentMethod: 'bank' | 'usdt';
//   bankName?: string;
//   accountNumber?: string;
//   accountName?: string;
//   usdtNetwork?: string;
//   receiptUrl: string;
//   paymentStatus: 'pending' | 'verified' | 'rejected';
//   status: 'pending' | 'active' | 'cancelled';
//   startDate: string;
//   endDate: string;
// };

// export default function AdminSubscriptionsDashboard() {
//   const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [filter, setFilter] = useState<'pending' | 'active' | 'rejected'>('pending');
//   const [searchTerm, setSearchTerm] = useState('');
//   const [previewUrl, setPreviewUrl] = useState<string | null>(null);
//   const [sortKey, setSortKey] = useState<'email' | 'plan' | 'startDate' | 'endDate' | null>(null);
//   const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

//   const fetchAll = () => {
//     setLoading(true);
//     axios.get<Subscription[]>('/admin/subscriptions')
//       .then(res => setSubscriptions(res.data))
//       .catch(err => {
//         console.error(err);
//         setError('Could not load subscriptions.');
//       })
//       .finally(() => setLoading(false));
//   };

//   useEffect(fetchAll, []);

//   const verify = (id: string, action: 'approve' | 'reject') => {
//     axios.post(`/admin/subscriptions/${id}/verify`, { action })
//       .then(fetchAll)
//       .catch(err => {
//         console.error(err);
//         alert('Update failed.');
//       });
//   };

//   const deleteSub = (id: string) => {
//     if (!confirm('Delete this subscription and its receipt?')) return;
//     axios.delete(`/admin/subscriptions/${id}`)
//       .then(fetchAll)
//       .catch(err => {
//         console.error(err);
//         alert('Delete failed.');
//       });
//   };

//   const handleSort = (key: 'email' | 'plan' | 'startDate' | 'endDate') => {
//     if (sortKey === key) {
//       setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
//     } else {
//       setSortKey(key);
//       setSortOrder('asc');
//     }
//   };

//   const displayed = subscriptions
//     .filter(s => {
//       if (filter === 'pending') return s.paymentStatus === 'pending';
//       if (filter === 'active') return s.status === 'active';
//       return s.paymentStatus === 'rejected';
//     })
//     .filter(s =>
//       s.user.email.toLowerCase().includes(searchTerm.trim().toLowerCase())
//     )
//     .sort((a, b) => {
//       if (!sortKey) return 0;

//       let aVal: string = '';
//       let bVal: string = '';

//       switch (sortKey) {
//         case 'email':
//           aVal = a.user.email;
//           bVal = b.user.email;
//           break;
//         case 'plan':
//           aVal = a.plan.name;
//           bVal = b.plan.name;
//           break;
//         case 'startDate':
//           aVal = a.startDate;
//           bVal = b.startDate;
//           break;
//         case 'endDate':
//           aVal = a.endDate;
//           bVal = b.endDate;
//           break;
//       }

//       return sortOrder === 'asc'
//         ? aVal.localeCompare(bVal)
//         : bVal.localeCompare(aVal);
//     });

//   if (loading) return <p className="text-center py-6">Loading…</p>;
//   if (error) return <p className="text-center py-6 text-red-500">{error}</p>;

//   const sortIcon = (key: string) => sortKey === key ? (sortOrder === 'asc' ? '↑' : '↓') : '';

//   return (
//     <div className="p-4 max-w-7xl mx-auto">
//       <h1 className="text-2xl font-bold mb-4">Manage Subscriptions</h1>

//       {/* Tabs */}
//       <div className="flex flex-wrap gap-2 mb-4">
//         {(['pending','active','rejected'] as const).map(f => (
//           <button
//             key={f}
//             onClick={() => setFilter(f)}
//             className={`px-4 py-2 rounded-md font-medium transition ${
//               filter === f
//                 ? 'bg-blue-600 text-white'
//                 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
//             }`}
//           >
//             {f.charAt(0).toUpperCase() + f.slice(1)} (
//               {subscriptions.filter(s =>
//                 f === 'pending'
//                   ? s.paymentStatus === 'pending'
//                   : f === 'active'
//                     ? s.status === 'active'
//                     : s.paymentStatus === 'rejected'
//               ).length}
//             )
//           </button>
//         ))}
//       </div>

//       {/* Search */}
//       <div className="mb-4">
//         <input
//           type="text"
//           placeholder="Search by user email…"
//           value={searchTerm}
//           onChange={e => setSearchTerm(e.target.value)}
//           className="w-full md:w-1/3 px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
//         />
//       </div>

//       {/* Table */}
//       <div className="overflow-x-auto">
//         <table className="min-w-full bg-white shadow overflow-hidden rounded-lg">
//           <thead className="bg-gray-50">
//             <tr>
//               <th className="p-3 text-left">#</th>
//               <th
//                 className="p-3 text-left cursor-pointer"
//                 onClick={() => handleSort('email')}
//               >
//                 User {sortIcon('email')}
//               </th>
//               <th
//                 className="p-3 text-left cursor-pointer"
//                 onClick={() => handleSort('plan')}
//               >
//                 Plan {sortIcon('plan')}
//               </th>
//               <th className="p-3 text-left">Method</th>
//               <th
//                 className="p-3 text-left cursor-pointer"
//                 onClick={() => handleSort('startDate')}
//               >
//                 Start Date {sortIcon('startDate')}
//               </th>
//               <th
//                 className="p-3 text-left cursor-pointer"
//                 onClick={() => handleSort('endDate')}
//               >
//                 End Date {sortIcon('endDate')}
//               </th>
//               <th className="p-3 text-left">Status</th>
//               <th className="p-3 text-left">Receipt</th>
//               <th className="p-3 text-left">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {displayed.map((sub, i) => (
//               <tr key={sub._id} className="border-t">
//                 <td className="p-3">{i + 1}</td>
//                 <td className="p-3">{sub.user.email}</td>
//                 <td className="p-3">{sub.plan.name}</td>
//                 <td className="p-3 uppercase">{sub.paymentMethod}</td>
//                 <td className="p-3">{new Date(sub.startDate).toLocaleDateString()}</td>
//                 <td className="p-3">{new Date(sub.endDate).toLocaleDateString()}</td>
//                 <td className="p-3">
//                   <span
//                     className={`px-2 py-1 rounded-full text-xs font-semibold ${
//                       sub.paymentStatus === 'pending'
//                         ? 'bg-yellow-100 text-yellow-800'
//                         : sub.status === 'active'
//                           ? 'bg-green-100 text-green-800'
//                           : 'bg-red-100 text-red-800'
//                     }`}
//                   >
//                     {sub.paymentStatus === 'pending'
//                       ? 'Pending'
//                       : sub.status === 'active'
//                         ? 'Active'
//                         : 'Rejected'}
//                   </span>
//                 </td>
//                 <td className="p-3">
//                   <img
//                     src={sub.receiptUrl}
//                     alt="Receipt"
//                     className="h-10 w-10 object-cover rounded cursor-pointer"
//                     onClick={() => setPreviewUrl(sub.receiptUrl)}
//                   />
//                 </td>
//                 <td className="p-3 space-x-2">
//                   {sub.paymentStatus === 'pending' && (
//                     <>
//                       <button
//                         onClick={() => verify(sub._id, 'approve')}
//                         className="inline-flex items-center text-green-600 hover:text-green-800"
//                       >
//                         <CheckCircle className="w-5 h-5" />
//                       </button>
//                       <button
//                         onClick={() => verify(sub._id, 'reject')}
//                         className="inline-flex items-center text-red-600 hover:text-red-800"
//                       >
//                         <X className="w-5 h-5" />
//                       </button>
//                     </>
//                   )}
//                   <button
//                     onClick={() => deleteSub(sub._id)}
//                     className="inline-flex items-center text-gray-600 hover:text-gray-800"
//                   >
//                     <Trash2 className="w-5 h-5" />
//                   </button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       {/* Fullscreen receipt preview */}
//       <Dialog
//         open={!!previewUrl}
//         onClose={() => setPreviewUrl(null)}
//         className="fixed inset-0 z-50 flex items-center justify-center p-4"
//       >
//         <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
//         <Dialog.Panel className="relative bg-white rounded-lg p-4 max-w-3xl w-full max-h-[90vh] overflow-auto">
//           <button
//             onClick={() => setPreviewUrl(null)}
//             className="absolute top-3 right-3 text-gray-500 hover:text-black"
//           >
//             <X className="w-6 h-6" />
//           </button>
//           {previewUrl && (
//             <img
//               src={previewUrl}
//               alt="Full Receipt"
//               className="w-full h-auto rounded"
//             />
//           )}
//         </Dialog.Panel>
//       </Dialog>
//     </div>
//   );
// }
