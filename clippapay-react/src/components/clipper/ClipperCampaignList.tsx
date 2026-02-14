import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Apple, Github, Loader2, Send } from 'lucide-react';

export default function ClipperCampaignList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [telegramJoined, setTelegramJoined] = useState(false);

  // Simulate loading state for smooth transition
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleTelegramRedirect = () => {
    window.open('https://t.me/clippapay', '_blank');
    setTelegramJoined(true);
    // Store in localStorage to remember they've been notified
    localStorage.setItem('telegram_notified', 'true');
  };

  // Check if user has already been to Telegram
  useEffect(() => {
    const notified = localStorage.getItem('telegram_notified');
    if (notified) {
      setTelegramJoined(true);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500 text-lg">
          <Loader2 className="animate-spin" /> Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main content */}
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        {/* Logo or brand indicator */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Main announcement card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 sm:p-12 text-center border border-white/20">
          {/* Coming Soon Badge */}
          <div className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-semibold mb-8 shadow-lg">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            Coming March 2nd, 2024
          </div>

          {/* Main headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-blue-800 to-purple-900 mb-6">
            We're Going Mobile!
          </h1>

          {/* Subheadline */}
          <p className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Get ready for a faster, smoother, and more powerful experience with our brand new mobile apps
          </p>

          {/* Platform badges */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <div className="flex items-center gap-3 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-200">
              <Apple className="w-8 h-8" />
              <div className="text-left">
                <div className="text-xs opacity-80">Coming soon for</div>
                <div className="text-xl font-semibold">iOS</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-green-600 text-white px-6 py-3 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-200">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18,13.5V10c0-2-1.5-4-4-4h-4C7.5,6,6,8,6,10v3.5c0,1.5,0.5,3,2,4.5V20c0,0.5,0.5,1,1,1h2c0.5,0,1-0.5,1-1v-2h4v2c0,0.5,0.5,1,1,1h2c0.5,0,1-0.5,1-1v-2.5C17.5,16.5,18,15,18,13.5z M10,10c0-0.5,0.5-1,1-1s1,0.5,1,1v4c0,0.5-0.5,1-1,1s-1-0.5-1-1V10z M14,14c-0.5,0-1-0.5-1-1v-4c0-0.5,0.5-1,1-1s1,0.5,1,1v4C15,13.5,14.5,14,14,14z"/>
              </svg>
              <div className="text-left">
                <div className="text-xs opacity-80">Coming soon for</div>
                <div className="text-xl font-semibold">Android</div>
              </div>
            </div>
          </div>

          {/* Telegram Join Section - Highlighted */}
          <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 rounded-2xl p-8 mb-12 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-white/20 p-3 rounded-full">
                <Send className="w-8 h-8" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">📱 Get Notified instantly!</h2>
            <p className="text-blue-100 mb-6 max-w-lg mx-auto">
              Join our Telegram channel to be the first to know when we launch on iOS and Android. Get exclusive updates, early access, and special offers!
            </p>
            
            {!telegramJoined ? (
              <button
                onClick={handleTelegramRedirect}
                className="group relative inline-flex items-center gap-3 bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200 overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                <Send className="relative z-10 w-5 h-5" />
                <span className="relative z-10">Join @clippapay on Telegram</span>
                <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                </span>
              </button>
            ) : (
              <div className="bg-green-500/20 backdrop-blur rounded-xl p-4 inline-block">
                <p className="text-white font-semibold flex items-center gap-2">
                  <span>✅</span> Thanks for joining! You'll be notified when we launch.
                </p>
              </div>
            )}

            <p className="text-blue-200 text-sm mt-4">
              👥 Already 1,000+ members staying ahead of the curve
            </p>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/60 backdrop-blur rounded-xl p-4 shadow-sm">
              <div className="text-3xl mb-2">🚀</div>
              <h3 className="font-semibold text-gray-800">2x Faster</h3>
              <p className="text-sm text-gray-600">Optimized performance for quick job browsing</p>
            </div>
            <div className="bg-white/60 backdrop-blur rounded-xl p-4 shadow-sm">
              <div className="text-3xl mb-2">📱</div>
              <h3 className="font-semibold text-gray-800">Native Experience</h3>
              <p className="text-sm text-gray-600">Smooth gestures and intuitive design</p>
            </div>
            <div className="bg-white/60 backdrop-blur rounded-xl p-4 shadow-sm">
              <div className="text-3xl mb-2">🔔</div>
              <h3 className="font-semibold text-gray-800">Instant Alerts</h3>
              <p className="text-sm text-gray-600">Never miss a new opportunity</p>
            </div>
          </div>

          {/* GitHub banner
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Github className="w-4 h-4" />
              <span>Open source mobile apps coming soon to</span>
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                GitHub
              </a>
            </div>
          </div>
        </div> */}

        {/* Countdown or additional info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          ⚡ The web version will remain available until March 15th for transition
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
// import React, { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { HiOutlineFilm } from 'react-icons/hi';
// import { Loader2, Info } from 'lucide-react';
// import axios from 'axios';

// interface Campaign {
//   _id: string;
//   title: string;
//   thumb_url?: string;
//   rate_per_1000?: number;
//   clipper_cpm?: number;
//   payPerView?: number;
//   budget_total: number;
//   budget_remaining: number;
//   views_purchased?: number;
//   views_left?: number;
//   desiredVideos?: number;
//   approvedVideosCount?: number;
//   categories: string[];
//   hashtags: string[];
//   status: 'active' | 'paused' | 'completed';
//   adWorkerStatus: 'pending' | 'processing' | 'ready' | 'rejected';
//   kind?: 'normal' | 'ugc' | 'pgc';
//   createdAt: string;
//   updatedAt: string;
// }

// const PAGE_SIZE = 50;

// export default function ClipperCampaignList() {
//   const navigate = useNavigate();
//   const [campaigns, setCampaigns] = useState<Campaign[]>([]);
//   const [joinedCampaignIds, setJoinedCampaignIds] = useState<string[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [search, setSearch] = useState('');
//   const [page, setPage] = useState(1);
//   const [showTooltip, setShowTooltip] = useState<string | null>(null);

//   useEffect(() => {
//     setLoading(true);
//     setError(null);

//     const fetchAll = async () => {
//       try {
//         const token = localStorage.getItem('token');
//         if (!token) throw new Error('You are not logged in!');

//         const res = await axios.get('/clippers/available', {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         setCampaigns(res.data);

//         const mySubsRes = await axios.get('/clippers/my-submissions', {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         const joinedIds = mySubsRes.data
//           .map((sub: any) => sub.campaign?._id)
//           .filter(Boolean);
//         setJoinedCampaignIds(Array.from(new Set(joinedIds)));
//       } catch (err: any) {
//         console.error('Error fetching data:', err);
//         setError(err.response?.data?.error || err.message || 'Could not load campaigns');
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchAll();
//     const intervalId = setInterval(fetchAll, 15000);
//     return () => clearInterval(intervalId);
//   }, []);

//   const filtered = campaigns.filter((c) =>
//     c.title.toLowerCase().includes(search.toLowerCase())
//   );

//   const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
//   const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

//   useEffect(() => {
//     setPage(1);
//   }, [search, campaigns.length]);

//   const formatNaira = (n?: number) =>
//     typeof n === 'number' ? n.toLocaleString() : '0';

//   return (
//     <div className="max-w-7xl mx-auto px-2 sm:px-6 py-10">
//       <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
//         <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Browse Jobs</h1>
//         <input
//           type="text"
//           placeholder="Search by campaign name…"
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//           className="w-full sm:w-72 px-4 py-2 border rounded-xl shadow-sm focus:ring-cp-blue focus:border-cp-blue bg-white"
//         />
//       </div>

//       {loading ? (
//         <div className="flex items-center gap-2 text-gray-500 text-lg justify-center py-10">
//           <Loader2 className="animate-spin" /> Loading jobs…
//         </div>
//       ) : error ? (
//         <div className="text-center py-10 text-red-500">{error}</div>
//       ) : (
//         <>
//           <div className="flex flex-wrap justify-center sm:justify-start gap-4">
//             {paged.map((c) => {
//               const isPgc = c.kind === 'pgc';
//               const progress = isPgc
//                 ? c.desiredVideos ? Math.round((c.approvedVideosCount || 0) / c.desiredVideos * 100) : 0
//                 : c.views_purchased && c.views_purchased > 0
//                   ? Math.min(Math.round(((c.views_purchased - c.views_left) / c.views_purchased) * 100), 100)
//                   : 0;
//               const alreadyJoined = joinedCampaignIds.includes(c._id);

//               return (
//                 <div
//                   key={c._id}
//                   className="relative rounded-xl overflow-hidden shadow-md hover:shadow-xl transition group cursor-pointer"
//                   style={{ width: '260px', height: '330px', backgroundColor: '#1a1f2b' }}
//                   onClick={() => navigate(`/dashboard/clipper/campaigns/${c._id}`)}
//                 >
//                   <div className="absolute top-2 left-2 bg-cp-blue text-white text-xs font-semibold px-3 py-1 rounded-full z-10">
//                     ₦{formatNaira(c.payPerView ?? c.clipper_cpm ?? c.rate_per_1000 ?? 0)} / {isPgc ? 'video' : '1k views'}
//                   </div>

//                   <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
//                     <div className="bg-green-500 text-white text-[10px] font-extrabold px-3 py-1 rounded-full animate-pulse">
//                       LIVE
//                     </div>
//                     <div className="flex items-center gap-1">
//                       {c.kind === 'ugc' || c.kind === 'pgc' ? (
//                         <>
//                           <div className="bg-red-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-full shadow-sm">
//                             {c.kind === 'ugc' ? 'UGC' : 'PGC'}
//                           </div>
//                           <div
//                             className="relative"
//                             onClick={(e) => {
//                               e.stopPropagation();
//                               setShowTooltip(showTooltip === c._id ? null : c._id);
//                             }}
//                           >
//                             <Info
//                               size={25}
//                               className="text-gray-300 cursor-pointer hover:text-white"
//                               onMouseEnter={() => setShowTooltip(c._id)}
//                               onMouseLeave={() => setShowTooltip(null)}
//                             />
//                             {showTooltip === c._id && (
//                               <div
//                                 className="absolute top-6 right-0 w-48 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg z-20"
//                                 onMouseEnter={() => setShowTooltip(c._id)}
//                                 onMouseLeave={() => setShowTooltip(null)}
//                               >
//                                 <div className="font-bold mb-1">{c.kind === 'ugc' ? 'UGC Campaign' : 'PGC Campaign'}</div>
//                                 <p>
//                                   {c.kind === 'ugc'
//                                     ? 'User-Generated Content: Create and post your own video showcasing this product for higher earnings!'
//                                     : 'Professional-Generated Content: Submit high-quality videos for approval to earn a fixed payout per video!'}
//                                 </p>
//                               </div>
//                             )}
//                           </div>
//                         </>
//                       ) : (
//                         <div className="bg-orange-500 text-white text-[10px] font-extrabold px-3 py-1 rounded-full shadow-sm">
//                           REPOST
//                         </div>
//                       )}
//                     </div>
//                   </div>

//                   <div className="flex mt-8 items-center justify-center h-48 px-4 pt-8">
//                     {c.thumb_url ? (
//                       <img
//                         src={c.thumb_url}
//                         alt={c.title}
//                         className="object-contain h-49 w-49 rounded-md"
//                       />
//                     ) : (
//                       <HiOutlineFilm className="text-gray-500 w-49 h-49" />
//                     )}
//                   </div>

//                   <div className="text-white text-xl font-medium text-center px-3 mt-0 truncate">
//                     {c.title}
//                   </div>

//                   <div className="absolute bottom-12 left-0 right-0 px-4 z-10">
//                     <div className="w-full bg-gray-700 h-1 rounded-full mb-1 overflow-hidden">
//                       <div
//                         className="h-full rounded-full transition-all"
//                         style={{
//                           width: `${progress}%`,
//                           background: progress >= 100
//                             ? "#A3A3A3"
//                             : progress >= 80
//                               ? "#16a34a"
//                               : "#4f46e5"
//                         }}
//                       />
//                     </div>
//                     <div className="text-gray-300 text-xs text-center">
//                       {progress}% completed
//                     </div>
//                   </div>

//                   <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 z-10">
//                     <button
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         navigate(`/dashboard/clipper/campaigns/${c._id}`);
//                       }}
//                       className={`${alreadyJoined ? 'bg-gray-500 hover:bg-gray-600' : 'bg-cp-blue hover:bg-blue-700'
//                         } text-white font-semibold px-4 py-2 rounded-lg text-sm transition`}
//                     >
//                       {alreadyJoined ? 'Joined' : 'Join'}
//                     </button>
//                   </div>
//                 </div>
//               );
//             })}

//             {paged.length === 0 && (
//               <div className="text-center w-full text-gray-500 py-10">
//                 No campaigns match your search.
//               </div>
//             )}
//           </div>

//           <div className="flex flex-col sm:flex-row justify-between items-center mt-8 gap-3">
//             <div className="text-sm text-gray-500">
//               Page {page} of {totalPages}
//             </div>
//             <div className="flex gap-2">
//               <button
//                 onClick={() => setPage((p) => Math.max(1, p - 1))}
//                 disabled={page === 1}
//                 className="px-4 py-2 bg-gray-100 rounded-lg font-semibold text-gray-700 hover:bg-gray-200 transition disabled:opacity-50"
//               >
//                 Previous
//               </button>
//               <button
//                 onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
//                 disabled={page === totalPages}
//                 className="px-4 py-2 bg-gray-100 rounded-lg font-semibold text-gray-700 hover:bg-gray-200 transition disabled:opacity-50"
//               >
//                 Next
//               </button>
//             </div>
//           </div>
//         </>
//       )}
//     </div>
//   );
// }