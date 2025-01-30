'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search, User } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface Profile {
  id: string;
  username: string;
  name: string;
  batch: string;
  branch: string;
}

export default function UserSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const searchUsers = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const searchTerm = query.startsWith('@') ? query.substring(1) : query;
        
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, name, batch, branch')
          .or(`username.ilike.%${searchTerm}%, name.ilike.%${searchTerm}%`)
          .limit(5);

        if (error) throw error;
        setResults(data || []);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [query, supabase]);

  return (
    <div className="w-full space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username or name..."
          className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500/50 transition-colors"
        />
      </div>

      {loading && (
        <div className="text-center py-2 text-sm text-gray-400">
          Searching...
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((profile) => (
            <Link href={`/dashboard/messages/${profile.username}`} key={profile.id}>
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">@{profile.username}</span>
                    <span className="text-sm text-gray-400">{profile.name}</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {profile.batch} • {profile.branch}
                  </p>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}

      {query && !loading && results.length === 0 && (
        <div className="text-center py-2 text-sm text-gray-400">
          No users found
        </div>
      )}
    </div>
  );
} 