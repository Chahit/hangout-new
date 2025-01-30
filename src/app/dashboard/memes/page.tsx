'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Plus, ArrowUpDown, X, Upload, Heart, MessageCircle, Share, Check, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface Meme {
  id: string;
  title: string;
  media_url: string;
  media_type: 'image' | 'video';
  created_at: string;
  user_id: string;
  user_name: string;
  likes?: Array<{ user_id: string }>;
  comments: MemeComment[];
  profiles?: { name: string };
}

interface MemeComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_name: string;
  meme_id: string;
  profiles?: {
    name: string;
  };
}

interface MemeLike {
  id: string;
  meme_id: string;
  user_id: string;
  created_at: string;
}

interface MemeWithLikes extends Meme {
  has_liked: boolean;
  likes_count: number;
  likes: MemeLike[];
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

// Modal component for creating new memes
const CreateMemeModal = ({ isOpen, onClose, onSubmit }: { 
  isOpen: boolean; 
  onClose: () => void;
  onSubmit: (title: string, file: File) => Promise<void>;
}) => {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(title, file);
      onClose();
    } catch (error) {
      console.error('Error creating meme:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-xl p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Create New Meme</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none"
              placeholder="Enter a title for your meme"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Upload Media</label>
            <div className="border-2 border-dashed border-white/10 rounded-lg p-4 text-center">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload"
                required
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                {preview ? (
                  <div className="relative w-full aspect-video">
                    {file?.type.startsWith('image/') ? (
                      <Image
                        src={preview}
                        alt="Preview"
                        fill
                        className="object-contain rounded-lg"
                      />
                    ) : (
                      <video
                        src={preview}
                        className="w-full rounded-lg"
                        controls
                      />
                    )}
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-400">
                      Click to upload image or video
                    </span>
                  </>
                )}
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !file || !title}
              className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Meme'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function MemesPage() {
  const [memes, setMemes] = useState<MemeWithLikes[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedMeme, setSelectedMeme] = useState<MemeWithLikes | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  const getCurrentUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { id, email } = user;
      setCurrentUser({ id, email });
    }
  }, [supabase]);

  const fetchMemes = useCallback(async () => {
    try {
      if (!currentUser) return;

      const { data: memesData, error } = await supabase
        .from('memes')
        .select(`
          *,
          profiles:user_id(name),
          likes:meme_likes(
            id,
            user_id,
            created_at
          ),
          comments:meme_comments(
            id,
            content,
            created_at,
            user_id,
            profiles:user_id(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (memesData) {
        const formattedMemes: MemeWithLikes[] = memesData.map((meme) => ({
          ...meme,
          user_name: meme.profiles?.name || 'Anonymous',
          has_liked: meme.likes?.some((like: { user_id: string }) => like.user_id === currentUser.id) || false,
          likes_count: meme.likes?.length || 0,
          likes: meme.likes || [],
          comments: meme.comments?.map((comment: MemeComment) => ({
            ...comment,
            user_name: comment.profiles?.name || 'Anonymous'
          })) || []
        }));

        setMemes(formattedMemes);
      }
    } catch (error) {
      console.error('Error fetching memes:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser, supabase]);

  useEffect(() => {
    getCurrentUser();
  }, [getCurrentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchMemes();
    }
  }, [currentUser, fetchMemes]);

  const handleCreateMeme = async (title: string, file: File) => {
    try {
      if (!currentUser) return;

      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${currentUser.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('memes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('memes')
        .getPublicUrl(filePath);

      // Create meme record
      const { error: insertError } = await supabase
        .from('memes')
        .insert({
          title,
          media_url: publicUrl,
          media_type: file.type.startsWith('image/') ? 'image' : 'video',
          user_id: currentUser.id
        });

      if (insertError) throw insertError;

      // Refresh memes
      fetchMemes();
    } catch (error) {
      console.error('Error creating meme:', error);
      throw error;
    }
  };

  const handleLike = async (meme: MemeWithLikes) => {
    try {
      if (!currentUser) return;

      if (meme.has_liked) {
        // Unlike
        const { error } = await supabase
          .from('meme_likes')
          .delete()
          .eq('meme_id', meme.id)
          .eq('user_id', currentUser.id);

        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from('meme_likes')
          .insert({
            meme_id: meme.id,
            user_id: currentUser.id
          });

        if (error) throw error;
      }

      // Refresh memes to update like status
      fetchMemes();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedMeme || !commentContent.trim()) return;

    try {
      const { error } = await supabase
        .from('meme_comments')
        .insert({
          meme_id: selectedMeme.id,
          user_id: currentUser.id,
          content: commentContent.trim()
        });

      if (error) throw error;

      // Clear form and refresh memes
      setCommentContent('');
      setShowCommentModal(false);
      fetchMemes();
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const handleShare = async (meme: MemeWithLikes) => {
    try {
      const shareUrl = `${window.location.origin}/memes/${meme.id}`;
      const shareText = `Check out this meme: ${meme.title}`;

      if (navigator.share) {
        await navigator.share({
          title: meme.title,
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareSuccess(meme.id);
        setTimeout(() => setShareSuccess(null), 2000);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleDelete = async (meme: MemeWithLikes) => {
    try {
      if (!currentUser || currentUser.id !== meme.user_id) return;

      // Delete the meme record
      const { error: deleteError } = await supabase
        .from('memes')
        .delete()
        .eq('id', meme.id);

      if (deleteError) throw deleteError;

      // Delete the media file from storage
      const fileName = meme.media_url.split('/').pop();
      if (fileName) {
        const { error: storageError } = await supabase.storage
          .from('memes')
          .remove([`${currentUser.id}/${fileName}`]);

        if (storageError) console.error('Error deleting media file:', storageError);
      }

      // Refresh memes
      fetchMemes();
    } catch (error) {
      console.error('Error deleting meme:', error);
    }
  };

  // Comment Modal Component
  const CommentModal = () => {
    if (!showCommentModal || !selectedMeme) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[#1a1a1a] rounded-xl p-6 w-full max-w-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Comments</h2>
            <button onClick={() => setShowCommentModal(false)} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Existing comments */}
          <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
            {selectedMeme.comments.map((comment) => (
              <div key={comment.id} className="bg-white/5 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <span className="font-medium text-purple-400">{comment.user_name}</span>
                  <span className="text-sm text-gray-400">
                    {format(new Date(comment.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
                <p className="mt-2 text-gray-200">{comment.content}</p>
              </div>
            ))}
          </div>

          {/* Comment form */}
          <form onSubmit={handleComment} className="space-y-4">
            <div>
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none"
                placeholder="Write a comment..."
                rows={3}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCommentModal(false)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!commentContent.trim()}
                className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Post Comment
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full relative font-cabinet-grotesk">
        <FloatingShapes />
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4 md:space-y-6">
            <div className="h-12 bg-white/5 rounded-xl w-1/3" />
            <div className="space-y-3 md:space-y-4">
              <div className="h-64 bg-white/5 rounded-xl" />
              <div className="h-64 bg-white/5 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sortedMemes = [...memes].sort((a, b) => {
    switch (sortBy) {
      case 'mostLiked':
        return (b.likes.length || 0) - (a.likes.length || 0);
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  return (
    <div className="min-h-screen w-full relative font-cabinet-grotesk">
      <FloatingShapes />
      
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 md:space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-clash-display font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 text-transparent bg-clip-text">
              Campus Memes ✨
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => setSortBy(sortBy === 'newest' ? 'mostLiked' : 'newest')}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span>{sortBy === 'newest' ? 'Latest' : 'Most Liked'}</span>
            </motion.button>
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Meme</span>
            </motion.button>
          </div>
        </div>

        {/* Create Meme Modal */}
        <CreateMemeModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateMeme}
        />

        {/* Comment Modal */}
        <CommentModal />

        {/* Memes Grid */}
        <div className="grid grid-cols-1 gap-6">
          {sortedMemes.map((meme) => (
            <motion.div
              key={meme.id}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white/5 rounded-xl overflow-hidden hover:bg-white/10 transition-colors"
            >
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <div className="text-sm">
                      <span className="font-medium text-purple-400">{meme.user_name}</span>
                      <span className="text-gray-400 ml-2">
                        {format(new Date(meme.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                  {currentUser && currentUser.id === meme.user_id && (
                    <button
                      onClick={() => handleDelete(meme)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete meme"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <h3 className="text-lg font-medium mb-4">{meme.title}</h3>
                {meme.media_type === 'image' ? (
                  <Image
                    src={meme.media_url}
                    alt={meme.title}
                    width={800}
                    height={600}
                    className="rounded-lg w-full"
                  />
                ) : (
                  <video
                    src={meme.media_url}
                    controls
                    className="rounded-lg w-full"
                  />
                )}
                
                {/* Interaction buttons */}
                <div className="flex items-center gap-4 mt-4">
                  <button
                    onClick={() => handleLike(meme)}
                    className={`flex items-center gap-2 text-sm ${
                      meme.has_liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${meme.has_liked ? 'fill-current' : ''}`} />
                    <span>{meme.likes_count}</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedMeme(meme);
                      setShowCommentModal(true);
                    }}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>{meme.comments?.length || 0}</span>
                  </button>
                  <button
                    onClick={() => handleShare(meme)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
                  >
                    {shareSuccess === meme.id ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <Share className="w-5 h-5" />
                    )}
                    <span>{shareSuccess === meme.id ? 'Copied!' : 'Share'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}