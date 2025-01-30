'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Check, X, Loader2, Heart } from 'lucide-react';

interface MatchRequest {
  id: string;
  sender_id: string;
  sender_email: string;
  sender_profile: {
    bio: string | null;
    interests: string[];
  };
  compatibility_score: number;
  created_at: string;
}

export default function RequestsPage() {
  const supabase = createClient();
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('dating_connections')
        .select(`
          *,
          sender:profiles!from_user_id(
            id,
            name,
            email,
            dating_profiles (
              bio,
              interests
            )
          )
        `)
        .eq('to_user_id', session.user.id)
        .eq('status', 'pending');

      if (error) throw error;

      if (!data) {
        setRequests([]);
        return;
      }

      const formattedRequests: MatchRequest[] = data.map((request) => ({
        id: request.id,
        sender_id: request.from_user_id,
        sender_email: request.sender.email,
        sender_profile: request.sender.dating_profiles[0],
        compatibility_score: request.compatibility_score || 0,
        created_at: request.created_at
      }));

      setRequests(formattedRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setMessage({ type: 'error', text: 'Failed to load connection requests. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const handleRequest = useCallback(async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const { error } = await supabase
        .from('dating_connections')
        .update({ status: action === 'accept' ? 'accepted' : 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      setRequests(prev => prev.filter(request => request.id !== requestId));
      setMessage({
        type: 'success',
        text: `Match request ${action === 'accept' ? 'accepted' : 'rejected'} successfully!`
      });
    } catch (error) {
      console.error('Error handling request:', error);
      setMessage({
        type: 'error',
        text: `Failed to ${action} match request. Please try again.`
      });
    }
  }, [supabase]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-8">
        <Heart className="w-8 h-8 text-purple-500" />
        <h1 className="text-3xl font-bold">Match Requests</h1>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-8 ${
          message.type === 'success' ? 'bg-green-800' : 'bg-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {requests.map((request) => (
          <div key={request.id} className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-start justify-between">
              {/* Profile Info */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold">{request.sender_email.split('@')[0]}</h3>
                  <div className="flex items-center gap-2 text-purple-400">
                    <Heart className="w-4 h-4" />
                    <span>{request.compatibility_score}% Match</span>
                  </div>
                </div>

                <p className="text-gray-300">{request.sender_profile.bio}</p>

                <div className="flex flex-wrap gap-2">
                  {request.sender_profile.interests.map((interest, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-700 rounded-full text-sm"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={() => handleRequest(request.id, 'accept')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  <Check className="w-5 h-5" />
                  Accept
                </button>
                <button
                  onClick={() => handleRequest(request.id, 'reject')}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  <X className="w-5 h-5" />
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}

        {requests.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">No pending match requests</p>
          </div>
        )}
      </div>
    </div>
  );
}