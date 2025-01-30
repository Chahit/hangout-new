'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { calculateEnhancedCompatibilityScore, QUESTION_CATEGORIES } from '../questions';
import { Heart, UserPlus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface CompatibilityDetails {
  score: number;
  categoryScores: Record<string, number>;
  details: Array<{
    category: string;
    score: number;
    questions: Array<{
      id: number;
      similarity: number;
    }>;
  }>;
}

interface DatingProfile {
  id: string;
  user_id: string;
  gender: 'male' | 'female';
  looking_for: 'male' | 'female';
  bio: string | null;
  interests: string[];
  answers: Record<string, string>;
  has_completed_profile: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    name: string;
    email: string;
  };
  compatibility?: number;
  compatibilityDetails?: CompatibilityDetails;
}

export default function MatchesPage() {
  const supabase = createClient();
  const [matches, setMatches] = useState<DatingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const router = useRouter();

  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        throw new Error('Not authenticated');
      }

      // First get the user's profile and answers
      const { data: myProfile, error: profileError } = await supabase
        .from('dating_profiles')
        .select(`
          *,
          profiles!inner (
            id,
            name,
            email
          )
        `)
        .eq('user_id', session.user.id)
        .single();

      if (profileError) throw profileError;
      if (!myProfile.has_completed_profile) {
        router.push('/dashboard/dating/profile');
        return;
      }

      // Get potential matches based on gender preference and completion status
      const { data: existingConnections } = await supabase
        .from('dating_connections')
        .select('to_user_id')
        .eq('from_user_id', session.user.id);

      const excludedUserIds = existingConnections?.map(d => d.to_user_id) || [];

      // Build query
      let query = supabase
        .from('dating_profiles')
        .select(`
          *,
          profiles!inner (
            id,
            name,
            email
          )
        `)
        .eq('gender', myProfile.looking_for)
        .eq('looking_for', myProfile.gender)
        .eq('has_completed_profile', true)
        .neq('user_id', session.user.id);

      // Only add the not.in filter if there are users to exclude
      if (excludedUserIds.length > 0) {
        query = query.not('user_id', 'in', excludedUserIds);
      }

      const { data: potentialMatches, error: matchesError } = await query;

      if (matchesError) throw matchesError;

      // Calculate compatibility scores and sort by score
      const matchesWithScores = potentialMatches
        .map((match) => {
          const compatibility = calculateEnhancedCompatibilityScore(myProfile.answers, match.answers);
          return {
            ...match,
            compatibility: compatibility.score,
            compatibilityDetails: compatibility
          };
        })
        .sort((a, b) => (b.compatibility || 0) - (a.compatibility || 0))
        // Filter out low compatibility matches (below 60%)
        .filter(match => (match.compatibility || 0) >= 0.6);

      setMatches(matchesWithScores);
    } catch (error) {
      console.error('Error fetching matches:', error);
      setMessage({ type: 'error', text: 'Failed to load matches' });
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  const createConnection = useCallback(async (toUserId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage({ type: 'error', text: 'You must be logged in' });
        return;
      }

      const { error } = await supabase
        .from('dating_connections')
        .insert({
          from_user_id: session.user.id,
          to_user_id: toUserId,
          status: 'pending'
        });

      if (error) throw error;
      setMessage({ type: 'success', text: 'Connection request sent!' });
      await fetchMatches();
    } catch (error) {
      console.error('Error creating connection:', error);
      setMessage({ type: 'error', text: 'Failed to send connection request' });
    }
  }, [supabase, fetchMatches]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Your Matches</h1>
        <Link 
          href="/dashboard/dating/requests" 
          className="text-purple-400 hover:text-purple-300 transition"
        >
          View Connection Requests
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((match) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 p-6 rounded-xl backdrop-blur-lg border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {match.profiles?.name || 'Anonymous'}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Heart className="w-4 h-4 text-pink-500" />
                    <span className="text-gray-300">
                      {Math.round((match.compatibility || 0) * 100)}% Match
                    </span>
                  </div>
                </div>
              </div>

              {match.compatibilityDetails && (
                <div className="mb-4 space-y-2">
                  {Object.entries(match.compatibilityDetails.categoryScores)
                    .sort(([,a], [,b]) => b - a)
                    .map(([category, score]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">
                          {QUESTION_CATEGORIES[category as keyof typeof QUESTION_CATEGORIES].description}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                              style={{ width: `${Math.round(score * 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-300">
                            {Math.round(score * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {match.bio && (
                <p className="text-gray-300 mb-4">{match.bio}</p>
              )}

              {match.interests && match.interests.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {match.interests.map((interest, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-white/10 rounded-full text-sm text-gray-300"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => createConnection(match.user_id)}
                  className="flex-1 p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white flex items-center justify-center gap-2 hover:opacity-90 transition"
                >
                  <UserPlus className="w-4 h-4" />
                  Connect
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {message && (
        <div
          className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg text-white ${
            message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}