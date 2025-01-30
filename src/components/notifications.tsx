'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Bell, Heart, MessageSquare, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

interface Notification {
  id: string;
  type: 'match_request' | 'match_accepted' | 'new_message';
  data: {
    sender_id?: string;
    sender_email?: string;
    match_id?: string;
    message?: string;
  };
  read: boolean;
  created_at: string;
}

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    };

    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    // Click outside to close dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      channel.unsubscribe();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [supabase]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notification.id);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      setUnreadCount(prev => prev - 1);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id ? { ...n, read: true } : n
        )
      );
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'match_request':
        router.push('/dashboard/dating/requests');
        break;
      case 'match_accepted':
        router.push(`/dashboard/dating/chat/${notification.data.match_id}`);
        break;
      case 'new_message':
        router.push(`/dashboard/dating/chat/${notification.data.match_id}`);
        break;
    }

    setShowDropdown(false);
  };

  const getNotificationContent = (notification: Notification) => {
    switch (notification.type) {
      case 'match_request':
        return {
          icon: <UserPlus className="h-5 w-5 text-blue-500" />,
          text: `New match request from ${notification.data.sender_email?.split('@')[0]}`
        };
      case 'match_accepted':
        return {
          icon: <Heart className="h-5 w-5 text-pink-500" />,
          text: `${notification.data.sender_email?.split('@')[0]} accepted your match request!`
        };
      case 'new_message':
        return {
          icon: <MessageSquare className="h-5 w-5 text-purple-500" />,
          text: `New message from ${notification.data.sender_email?.split('@')[0]}`
        };
      default:
        return {
          icon: <Bell className="h-5 w-5" />,
          text: 'New notification'
        };
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-full hover:bg-secondary transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-card rounded-md shadow-lg border border-secondary overflow-hidden z-50">
          <div className="p-2">
            <h3 className="text-sm font-medium px-3 py-2">Notifications</h3>
            <div className="divide-y divide-secondary">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground p-3">No notifications</p>
              ) : (
                notifications.map(notification => {
                  const { icon, text } = getNotificationContent(notification);
                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full flex items-start gap-3 p-3 text-left hover:bg-secondary transition-colors ${
                        !notification.read ? 'bg-secondary/50' : ''
                      }`}
                    >
                      {icon}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{text}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 