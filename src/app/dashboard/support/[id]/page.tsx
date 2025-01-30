'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Tag, User, Check } from 'lucide-react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';

type SupportPost = {
  id: string;
  title: string;
  content: string;
  category: string;
  is_anonymous: boolean;
  is_resolved: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: {
    name: string;
    email: string;
  };
  responses?: {
    id: string;
    content: string;
    is_anonymous: boolean;
    is_accepted: boolean;
    created_at: string;
    creator?: {
      name: string;
      email: string;
    };
  }[];
};

export default function SupportPostPage() {
  const supabase = createClient();
  const { id } = useParams();
  const [post, setPost] = useState<SupportPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [newResponse, setNewResponse] = useState({
    content: '',
    is_anonymous: false
  });
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);

  const fetchCurrentUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { id, email } = session.user;
      setCurrentUser({ id, email });
    }
  }, [supabase]);

  const fetchPost = useCallback(async () => {
    try {
      const { data: post, error } = await supabase
        .from('support_posts')
        .select(`
          *,
          creator:created_by(name, email),
          responses(
            id,
            content,
            is_anonymous,
            is_accepted,
            created_at,
            creator:created_by(name, email)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setPost(post);
    } catch (error) {
      console.error('Error fetching post:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, id, setPost, setLoading]);

  useEffect(() => {
    fetchPost();
    fetchCurrentUser();
  }, [fetchPost, fetchCurrentUser]);

  const handleSubmitResponse = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!currentUser) return;

      const { error } = await supabase.from('support_responses').insert({
        content: newResponse.content,
        post_id: id,
        created_by: currentUser.id,
        is_anonymous: newResponse.is_anonymous
      });

      if (error) throw error;

      setNewResponse({
        content: '',
        is_anonymous: false
      });
      fetchPost();
    } catch (error) {
      console.error('Error creating response:', error);
    }
  }, [supabase, currentUser, newResponse, fetchPost]);

  const handleMarkResolved = useCallback(async () => {
    try {
      if (!currentUser || post?.created_by !== currentUser.id) return;

      const { error } = await supabase
        .from('support_posts')
        .update({ is_resolved: true })
        .eq('id', id);

      if (error) throw error;
      fetchPost();
    } catch (error) {
      console.error('Error marking post as resolved:', error);
    }
  }, [supabase, currentUser, post, id, fetchPost]);

  const handleAcceptResponse = useCallback(async (responseId: string) => {
    try {
      if (!currentUser || post?.created_by !== currentUser.id) return;

      const { error } = await supabase
        .from('support_responses')
        .update({ is_accepted: true })
        .eq('id', responseId);

      if (error) throw error;
      fetchPost();
    } catch (error) {
      console.error('Error accepting response:', error);
    }
  }, [supabase, currentUser, post, id, fetchPost]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-1/4"></div>
          <div className="h-32 bg-gray-800 rounded"></div>
          <div className="h-32 bg-gray-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="p-6">
        <div className="text-center py-12 bg-black border border-gray-800 rounded-lg">
          <p className="text-gray-400">Post not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-black border border-gray-800 rounded-lg p-6 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-white">{post.title}</h1>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2 text-gray-400">
                <User className="w-4 h-4" />
                <span>
                  {post.is_anonymous ? 'Anonymous' : post.creator?.name || post.creator?.email?.split('@')[0]}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Tag className="w-4 h-4" />
                <span>{post.category}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {post.is_resolved ? (
              <span className="bg-green-600/20 text-green-400 px-3 py-1 rounded-full text-sm">
                Resolved
              </span>
            ) : currentUser?.id === post.created_by && (
              <button
                onClick={handleMarkResolved}
                className="flex items-center gap-2 bg-green-600 text-white px-3 py-1 rounded-full text-sm hover:bg-green-700 transition-colors"
              >
                <Check className="w-4 h-4" />
                Mark as Resolved
              </button>
            )}
          </div>
        </div>

        <p className="text-gray-300 mt-6 whitespace-pre-wrap">{post.content}</p>

        <div className="mt-4 text-sm text-gray-500">
          Posted {format(new Date(post.created_at), 'MMM d, yyyy')}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Responses</h2>
        <div className="space-y-6">
          {post.responses?.map((response) => (
            <div
              key={response.id}
              className={`bg-gray-900 border border-gray-800 rounded-lg p-6 ${
                response.is_accepted ? 'border-green-500' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-gray-400">
                  <User className="w-4 h-4" />
                  <span>
                    {response.is_anonymous ? 'Anonymous' : response.creator?.name || response.creator?.email?.split('@')[0]}
                  </span>
                </div>
                {response.is_accepted ? (
                  <span className="flex items-center gap-2 text-green-400">
                    <Check className="w-4 h-4" />
                    Accepted Answer
                  </span>
                ) : (
                  currentUser?.id === post.created_by && !post.is_resolved && (
                    <button
                      onClick={() => handleAcceptResponse(response.id)}
                      className="text-gray-400 hover:text-green-400 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )
                )}
              </div>

              <p className="text-gray-300 mt-4 whitespace-pre-wrap">{response.content}</p>

              <div className="mt-4 text-sm text-gray-500">
                Responded {format(new Date(response.created_at), 'MMM d, yyyy')}
              </div>
            </div>
          ))}

          {(!post.responses || post.responses.length === 0) && (
            <div className="text-center py-8 bg-gray-900 border border-gray-800 rounded-lg">
              <p className="text-gray-400">No responses yet</p>
            </div>
          )}
        </div>
      </div>

      {!post.is_resolved && (
        <div className="bg-black border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Add Your Response</h2>
          <form onSubmit={handleSubmitResponse} className="space-y-4">
            <div>
              <textarea
                value={newResponse.content}
                onChange={(e) => setNewResponse({ ...newResponse, content: e.target.value })}
                className="w-full bg-gray-800 rounded-lg px-4 py-2"
                rows={4}
                placeholder="Share your thoughts or advice..."
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newResponse.is_anonymous}
                onChange={(e) => setNewResponse({ ...newResponse, is_anonymous: e.target.checked })}
                className="rounded bg-gray-800"
              />
              <label className="text-sm font-medium">Respond Anonymously</label>
            </div>
            <div>
              <button
                type="submit"
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Submit Response
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}