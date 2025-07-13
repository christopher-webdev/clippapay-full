// src/components/NotificationsPanel.tsx
import React, { useEffect, useState } from 'react';
import {
  HiUserAdd,
  HiExclamationCircle,
  HiCheckCircle,
  HiBell,
} from 'react-icons/hi';

interface Notification {
  id: string;
  type: 'new_clipper' | 'funds_low' | 'campaign_complete' | 'repost_verified';
  message: string;
  date: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: 'n1',
    type: 'new_clipper',
    message: 'Alice joined “Summer Sale” campaign.',
    date: '2025-07-01 10:32',
    read: false,
  },
  {
    id: 'n2',
    type: 'funds_low',
    message: 'Funds in escrow for “Flash Promo” dropped below 20%.',
    date: '2025-07-02 09:15',
    read: false,
  },
  {
    id: 'n3',
    type: 'repost_verified',
    message: 'Bob’s repost on Instagram was verified and paid.',
    date: '2025-07-03 14:48',
    read: true,
  },
  {
    id: 'n4',
    type: 'campaign_complete',
    message: '“New Collection” campaign has completed all views.',
    date: '2025-07-04 08:05',
    read: false,
  },
];

export default function NotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // simulate fetch
    setTimeout(() => setNotifications(mockNotifications), 500);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const iconFor = (type: Notification['type']) => {
    switch (type) {
      case 'new_clipper':
        return <HiUserAdd className="w-6 h-6 text-blue-500" />;
      case 'funds_low':
        return <HiExclamationCircle className="w-6 h-6 text-yellow-500" />;
      case 'repost_verified':
        return <HiCheckCircle className="w-6 h-6 text-green-500" />;
      case 'campaign_complete':
      default:
        return <HiBell className="w-6 h-6 text-indigo-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-800">Notifications</h2>
        <button
          onClick={markAllRead}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          Mark all as read
        </button>
      </div>

      {notifications.length === 0 ? (
        <p className="text-center text-gray-500 py-10">
          Loading notifications…
        </p>
      ) : (
        <ul className="space-y-4">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`
                flex items-start space-x-4 p-4 rounded-lg transition
                ${n.read ? 'bg-white' : 'bg-indigo-50'}
              `}
            >
              <div>{iconFor(n.type)}</div>
              <div className="flex-1">
                <p className="text-sm text-gray-800">{n.message}</p>
                <p className="mt-1 text-xs text-gray-500">{n.date}</p>
              </div>
              {!n.read && (
                <button
                  onClick={() => markAsRead(n.id)}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  Mark read
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
