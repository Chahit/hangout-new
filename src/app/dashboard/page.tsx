"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  Calendar, TrendingUp,
  MessageSquare, Users, Heart,
  Bell
} from "lucide-react";
import { createClient } from '@/lib/supabase/client';
import { motion } from "framer-motion";
import Link from "next/link";

// Animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  hover: { scale: 1.02, transition: { duration: 0.2 } }
};

// Floating background shapes component
const FloatingShapes = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden">
    <motion.div
      className="absolute w-72 h-72 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full blur-3xl"
      animate={{
        x: [0, 100, 0],
        y: [0, 50, 0],
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        ease: "linear"
      }}
      style={{ top: '10%', left: '20%' }}
    />
    <motion.div
      className="absolute w-96 h-96 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-full blur-3xl"
      animate={{
        x: [0, -70, 0],
        y: [0, 100, 0],
      }}
      transition={{
        duration: 25,
        repeat: Infinity,
        ease: "linear"
      }}
      style={{ top: '40%', right: '10%' }}
    />
  </div>
);

interface DashboardStats {
  communities: number;
  unreadMessages: number;
  upcomingEvents: number;
  notifications: number;
  totalConnections: number;
  activeChats: number;
  eventParticipation: number;
  groupEngagement: number;
  datingMatches: number;
  pendingConfessions: number;
  supportResponses: number;
  memeInteractions: number;
}

export default function DashboardPage() {
  const supabase = createClient();
  const [stats, setStats] = useState<DashboardStats>({
    communities: 0,
    unreadMessages: 0,
    upcomingEvents: 0,
    notifications: 0,
    totalConnections: 0,
    activeChats: 0,
    eventParticipation: 0,
    groupEngagement: 0,
    datingMatches: 0,
    pendingConfessions: 0,
    supportResponses: 0,
    memeInteractions: 0
  });

  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('is_read', false)
        .single();

      setStats(prev => ({ ...prev, notifications: count || 0 }));
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [supabase]);

  const fetchDashboardData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch stats
      const [
        { count: unreadMessages },
        { count: upcomingEventsCount },
        { count: notifications },
        { count: datingMatches }
      ] = await Promise.all([
        // Fetch unread messages
        supabase
          .from('direct_messages')
          .select('id', { count: 'exact' })
          .eq('receiver_id', user.id)
          .eq('is_read', false),

        // Fetch upcoming events
        supabase
          .from('events')
          .select('id', { count: 'exact' })
          .gte('start_time', new Date().toISOString())
          .eq('is_approved', true),

        // Fetch notifications
        supabase
          .from('notifications')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('is_read', false),

        // Fetch dating matches
        supabase
          .from('dating_connections')
          .select('id', { count: 'exact' })
          .eq('status', 'accepted')
          .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      ]);

      setStats(prev => ({
        ...prev,
        unreadMessages: unreadMessages || 0,
        upcomingEvents: upcomingEventsCount || 0,
        notifications: notifications || 0,
        datingMatches: datingMatches || 0
      }));

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  }, [supabase]);

  useEffect(() => {
    fetchDashboardData();
    fetchNotifications();
    
    // Set up real-time subscription for notifications
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchDashboardData, fetchNotifications]);

  if (loading) {
    return (
      <div className="min-h-screen w-full relative font-cabinet-grotesk flex justify-center items-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative font-cabinet-grotesk">
      {/* Floating background shapes for visual interest */}
      <FloatingShapes />
      
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        {/* Welcome Section */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-clash-display font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 text-transparent bg-clip-text">
              Welcome Back! 
            </h1>
            <p className="text-gray-400 mt-1">
              Here&apos;s what&apos;s happening in your college community
            </p>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Communities Card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-purple-500/30 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-medium">Communities</h3>
                <p className="text-2xl font-bold">{stats.communities}</p>
              </div>
            </div>
            <p className="text-sm text-gray-400">Active group memberships</p>
          </motion.div>

          {/* Messages Card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-blue-500/30 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-medium">Messages</h3>
                <p className="text-2xl font-bold">{stats.unreadMessages}</p>
              </div>
            </div>
            <p className="text-sm text-gray-400">Unread messages</p>
          </motion.div>

          {/* Events Card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-green-500/30 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Calendar className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="font-medium">Events</h3>
                <p className="text-2xl font-bold">{stats.upcomingEvents}</p>
              </div>
            </div>
            <p className="text-sm text-gray-400">Upcoming events</p>
          </motion.div>

          {/* Notifications Card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-pink-500/30 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-pink-500/20 rounded-lg">
                <Bell className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <h3 className="font-medium">Notifications</h3>
                <p className="text-2xl font-bold">{stats.notifications}</p>
              </div>
            </div>
            <p className="text-sm text-gray-400">Unread notifications</p>
          </motion.div>
        </div>

        {/* Engagement Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Connections Card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-indigo-500/30 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Heart className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-medium">Connections</h3>
                <p className="text-2xl font-bold">{stats.totalConnections}</p>
              </div>
            </div>
            <p className="text-sm text-gray-400">Total unique connections</p>
          </motion.div>

          {/* Active Chats Card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-cyan-500/30 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <MessageSquare className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-medium">Active Chats</h3>
                <p className="text-2xl font-bold">{stats.activeChats}</p>
              </div>
            </div>
            <p className="text-sm text-gray-400">Conversations this week</p>
          </motion.div>

          {/* Event Participation Card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-amber-500/30 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-medium">Event Participation</h3>
                <p className="text-2xl font-bold">{stats.eventParticipation}%</p>
              </div>
            </div>
            <p className="text-sm text-gray-400">Attendance rate</p>
          </motion.div>

          {/* Group Engagement Card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-rose-500/30 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-rose-500/20 rounded-lg">
                <Users className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-medium">Group Activity</h3>
                <p className="text-2xl font-bold">{stats.groupEngagement}</p>
              </div>
            </div>
            <p className="text-sm text-gray-400">Posts in last 30 days</p>
          </motion.div>
        </div>

        {/* Quick Actions Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link href="/dashboard/messages">
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover="hover"
              className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-blue-500/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-medium">Messages</h3>
                  <p className="text-sm text-gray-400">Start a conversation</p>
                </div>
              </div>
            </motion.div>
          </Link>

          <Link href="/dashboard/groups">
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover="hover"
              className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-purple-500/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-medium">Groups</h3>
                  <p className="text-sm text-gray-400">Join or create a group</p>
                </div>
              </div>
            </motion.div>
          </Link>

          <Link href="/dashboard/events">
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover="hover"
              className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-green-500/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Calendar className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-medium">Events</h3>
                  <p className="text-sm text-gray-400">Browse upcoming events</p>
                </div>
              </div>
            </motion.div>
          </Link>

          <Link href="/dashboard/dating">
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover="hover"
              className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-pink-500/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-500/20 rounded-lg">
                  <Heart className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <h3 className="font-medium">Dating</h3>
                  <p className="text-sm text-gray-400">Find your match</p>
                </div>
              </div>
            </motion.div>
          </Link>
        </div>
      </div>
    </div>
  );
}