'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion } from 'framer-motion';

export default function ActivityTrends() {
  const [totalPosts, setTotalPosts] = useState(0);
  const [totalEvents, setTotalEvents] = useState(0);
  const supabase = createClientComponentClient();

  const fetchStats = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch posts count
      const { count: postsCount } = await supabase
        .from('support_posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      // Fetch events count
      const { count: eventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      setTotalPosts(postsCount || 0);
      setTotalEvents(eventsCount || 0);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [supabase]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="bg-gray-800/50 backdrop-blur-lg rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4 text-white">Activity Overview</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-700/50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-white">Total Posts</h3>
          <motion.p 
            className="text-3xl font-bold text-pink-500"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {totalPosts}
          </motion.p>
        </div>
        <div className="bg-gray-700/50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-white">Total Events</h3>
          <motion.p 
            className="text-3xl font-bold text-blue-500"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {totalEvents}
          </motion.p>
        </div>
      </div>
    </div>
  );
}