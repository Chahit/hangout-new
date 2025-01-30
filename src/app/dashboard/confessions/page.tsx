'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Heart, Send, X, Loader2, Share, MessageCircle, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Database } from '@/lib/database.types';
import { format } from 'date-fns';
import Modal from '@/components/shared/Modal';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Confession {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  media_url?: string;
  has_liked: boolean;
  likes_count: number;
  user_name: string;
  comments: Comment[];
  likes?: Array<{ user_id: string }>;
  profiles?: { name: string };
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_name: string;
  confession_id: string;
  profiles?: {
    name: string;
  };
}

type SortOption = 'newest' | 'oldest' | 'mostLiked';

// Animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
};

const buttonVariants = {
  hover: { scale: 1.02 },
  tap: { scale: 0.98 }
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

export default function ConfessionsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [newConfession, setNewConfession] = useState('');
  const [loading, setLoading] = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);
  const [commenting, setCommenting] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const supabase = createClientComponentClient<Database>();

  const fetchUser = useCallback(async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        const userData: User = {
          id: currentUser.id,
          name: profile?.name || '',
          email: profile?.email || ''
        };
        setUser(userData);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  }, [supabase]);

  const fetchConfessions = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      const { data: confessionsData, error } = await supabase
        .from('confessions')
        .select(`
          *,
          profiles:user_id(name),
          likes:confession_likes(user_id),
          comments:confession_comments(
            id,
            content,
            created_at,
            user_id,
            profiles:user_id(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (confessionsData) {
        const formattedConfessions = confessionsData.map((confession: Confession) => ({
          ...confession,
          user_name: confession.profiles?.name || 'Anonymous',
          has_liked: confession.likes?.some((like: { user_id: string }) => like.user_id === currentUser.id) || false,
          likes_count: confession.likes?.length || 0,
          comments: (confession.comments || []).map((comment: Comment) => ({
            ...comment,
            user_name: comment.profiles?.name || 'Anonymous'
          }))
        }));

        setConfessions(formattedConfessions);
      }
    } catch (error) {
      console.error('Error fetching confessions:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const handlePostConfession = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      const { error } = await supabase
        .from('confessions')
        .insert({
          content: newConfession,
          user_id: currentUser.id,
        });

      if (error) throw error;

      setNewConfession('');
      setShowPostModal(false);
      fetchConfessions();
    } catch (error) {
      console.error('Error posting confession:', error);
    }
  };

  const handleLike = async (confessionId: string) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      const confession = confessions.find(c => c.id === confessionId);
      if (!confession) return;

      if (confession.has_liked) {
        await supabase
          .from('confession_likes')
          .delete()
          .eq('confession_id', confessionId)
          .eq('user_id', currentUser.id);
      } else {
        await supabase.from('confession_likes').insert({
          confession_id: confessionId,
          user_id: currentUser.id
        });
      }

      fetchConfessions();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleComment = async (confessionId: string) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      const anonymousName = 'Anonymous';

      const { error } = await supabase.from('confession_comments').insert({
        confession_id: confessionId,
        content: newComment,
        anonymous_name: anonymousName,
        user_id: currentUser.id
      });

      if (error) throw error;

      setNewComment('');
      setCommenting(null);
      fetchConfessions();
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const handleDelete = async (confessionId: string) => {
    try {
      console.log('Starting delete process for confession:', confessionId);
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        console.log('No authenticated user found');
        return;
      }
      console.log('Current user:', currentUser.id);

      const confession = confessions.find(c => c.id === confessionId);
      if (!confession) {
        console.log('Confession not found:', confessionId);
        return;
      }
      if (confession.user_id !== currentUser.id) {
        console.log('User does not own this confession');
        return;
      }
      console.log('Confession found:', confession);

      // Delete confession (cascade will handle comments and likes)
      console.log('Deleting confession from database...');
      const { error } = await supabase
        .from('confessions')
        .delete()
        .eq('id', confessionId);

      if (error) {
        console.error('Error deleting confession:', error);
        throw error;
      }

      console.log('Confession deleted successfully');
      // Update local state immediately and don't fetch again
      setConfessions(prevConfessions => prevConfessions.filter(c => c.id !== confessionId));
      setDeleteConfirmation(null);
    } catch (error) {
      console.error('Error in handleDelete:', error);
    }
  };

  // Add sorting function
  const sortConfessions = (confessions: Confession[]) => {
    switch (sortBy) {
      case 'oldest':
        return [...confessions].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      case 'mostLiked':
        return [...confessions].sort((a, b) => 
          Object.keys(b.likes || {}).length - Object.keys(a.likes || {}).length
        );
      case 'newest':
      default:
        return [...confessions].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
  };

  // Add handleShare function
  const handleShare = async (confession: Confession) => {
    const shareUrl = `${window.location.origin}/dashboard/confessions/${confession.id}`;
    const shareText = `Check out this confession: ${confession.content.slice(0, 100)}${confession.content.length > 100 ? '...' : ''}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Campus Confession',
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareSuccess(confession.id);
        setTimeout(() => setShareSuccess(null), 2000);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  useEffect(() => {
    const setup = async () => {
      await Promise.all([fetchUser(), fetchConfessions()]);
    };
    setup();
  }, [fetchUser, fetchConfessions]);

  if (loading) {
    return (
      <div className="min-h-screen w-full relative">
        <FloatingShapes />
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-40 bg-gray-800 rounded"></div>
          <div className="h-40 bg-gray-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative font-cabinet-grotesk">
      <FloatingShapes />
      
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 md:space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-clash-display font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 text-transparent bg-clip-text">
              Campus Confessions ✨
            </h1>
            <p className="text-sm md:text-base text-gray-400 mt-1">
              Share your thoughts anonymously with the community
            </p>
          </div>
          
          <div className="flex w-full sm:w-auto gap-3">
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => setShowPostModal(true)}
              className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-all text-sm md:text-base flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Share Confession
            </motion.button>
            
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => setSortBy(sortBy === 'newest' ? 'mostLiked' : 'newest')}
              className="flex-1 sm:flex-none px-4 py-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-sm md:text-base flex items-center justify-center gap-2"
            >
              <Heart className="w-4 h-4" />
              {sortBy === 'newest' ? 'Most Liked' : 'Newest'}
            </motion.button>
          </div>
        </div>

        {/* Confessions List */}
        <div className="space-y-4 md:space-y-6">
          {sortConfessions(confessions).map((confession) => (
            <motion.div
              key={confession.id}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="glass-morphism p-4 md:p-6 rounded-xl space-y-4"
            >
              {/* Confession Header */}
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white font-medium">
                      {confession.user_name[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm md:text-base">
                      {confession.user_name}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {format(new Date(confession.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
                
                {confession.user_id === user.id && (
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={() => setDeleteConfirmation(confession.id)}
                    className="text-red-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                )}
              </div>

              {/* Confession Content */}
              <p className="text-sm md:text-base leading-relaxed">
                {confession.content}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-4 pt-2">
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => handleLike(confession.id)}
                  className={`flex items-center gap-2 text-sm transition-colors ${
                    confession.has_liked
                      ? 'text-pink-500'
                      : 'text-gray-400 hover:text-pink-500'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${confession.has_liked ? 'fill-current' : ''}`} />
                  {confession.likes_count}
                </motion.button>

                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => setCommenting(commenting === confession.id ? null : confession.id)}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-purple-500 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  {confession.comments.length}
                </motion.button>

                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => handleShare(confession)}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-blue-500 transition-colors"
                >
                  {shareSuccess === confession.id ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Share className="w-4 h-4" />
                      Share
                    </>
                  )}
                </motion.button>
              </div>

              {/* Comments Section */}
              {commenting === confession.id && (
                <div className="space-y-4 pt-4 border-t border-white/10">
                  {confession.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <span className="text-xs font-medium">
                          {comment.user_name[0]}
                        </span>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium">
                            {comment.user_name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Comment Input */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-xs font-medium text-white">A</span>
                    </div>
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1 bg-white/5 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <motion.button
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                        onClick={() => handleComment(confession.id)}
                        disabled={!newComment.trim()}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Post Modal */}
        {showPostModal && (
          <Modal onClose={() => setShowPostModal(false)} maxWidth="max-w-lg">
            <div className="bg-gray-900 p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl md:text-2xl font-clash-display font-bold">
                  Share a Confession
                </h2>
                <button
                  onClick={() => setShowPostModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <textarea
                  value={newConfession}
                  onChange={(e) => setNewConfession(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full h-32 bg-white/5 rounded-xl p-4 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />

                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={handlePostConfession}
                  disabled={!newConfession.trim()}
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Share Anonymously
                </motion.button>
              </div>
            </div>
          </Modal>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmation && (
          <Modal onClose={() => setDeleteConfirmation(null)} maxWidth="max-w-md">
            <div className="bg-gray-900 p-6 rounded-2xl">
              <h2 className="text-xl font-clash-display font-bold mb-4">
                Delete Confession?
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                This action cannot be undone. Are you sure you want to delete this confession?
              </p>
              <div className="flex gap-3">
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => setDeleteConfirmation(null)}
                  className="flex-1 px-4 py-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-sm"
                >
                  Cancel
                </motion.button>
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => {
                    handleDelete(deleteConfirmation);
                    setDeleteConfirmation(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:opacity-90 transition-all text-sm"
                >
                  Delete
                </motion.button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
} 