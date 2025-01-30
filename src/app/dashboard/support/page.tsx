'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  MessageCircle, 
  Plus, 
  Tag, 
  User, 
  Search,
  ArrowRight,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import Modal from '@/components/shared/Modal';
import FloatingShapes from '../components/FloatingShapes';

interface SupportPost {
  id: string;
  title: string;
  content: string;
  category: string;
  is_anonymous: boolean;
  is_resolved: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    name: string;
  };
  support_responses?: SupportResponse[];
}

interface SupportResponse {
  id: string;
  content: string;
  post_id: string;
  created_by: string;
  is_anonymous: boolean;
  is_accepted: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    name: string;
  };
}

interface User {
  id: string;
}

interface DeleteConfirmation {
  type: 'post' | 'response';
  id: string;
  title?: string;
}

const CATEGORIES = [
  'Academic',
  'Mental Health',
  'Career',
  'Personal',
  'Technical',
  'Other'
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  hover: { scale: 1.02, borderColor: 'rgb(168, 85, 247)' },
  tap: { scale: 0.98 }
};

const buttonVariants = {
  hover: { scale: 1.02 },
  tap: { scale: 0.98 }
};

export default function SupportPage() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<SupportPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showCommentModal, setShowCommentModal] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isAnonymousComment, setIsAnonymousComment] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: '',
    is_anonymous: false
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      if (!user) {
        console.log('No user available for fetching posts');
        return;
      }

      console.log('Fetching posts for user:', user.id);
      let query = supabase
        .from('support_posts')
        .select(`
          *,
          profiles (
            name
          ),
          support_responses (
            *,
            profiles (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      const { data: posts, error } = await query;

      if (error) throw error;

      console.log('Fetched posts:', posts);
      const transformedPosts = posts.map((post): SupportPost => ({
        ...post,
        support_responses: (post.support_responses || [])
          .sort((a: SupportResponse, b: SupportResponse) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
      }));

      setPosts(transformedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedCategory, supabase]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Loaded user:', user);
      setUser(user);
    };
    getUser();
  }, [supabase.auth]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const sortPosts = (posts: SupportPost[]): SupportPost[] => {
    return [...posts].sort((a: SupportPost, b: SupportPost): number => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'mostResponses':
          return ((b.support_responses?.length || 0) - (a.support_responses?.length || 0));
        default: // 'newest'
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  };

  const handleCreatePost = async () => {
    try {
      if (!user) return;

      const { error } = await supabase
        .from('support_posts')
        .insert({
          title: newPost.title,
          content: newPost.content,
          category: newPost.category,
          is_anonymous: newPost.is_anonymous,
          created_by: user.id
        });

      if (error) throw error;

      setShowCreateModal(false);
      setNewPost({
        title: '',
        content: '',
        category: '',
        is_anonymous: false
      });
      fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const handleCreateResponse = async (postId: string) => {
    try {
      if (!user) return;

      const { error } = await supabase
        .from('support_responses')
        .insert({
          content: newComment,
          post_id: postId,
          created_by: user.id,
          is_anonymous: isAnonymousComment
        });

      if (error) throw error;

      setShowCommentModal(null);
      setNewComment('');
      setIsAnonymousComment(false);
      fetchPosts();
    } catch (error) {
      console.error('Error creating response:', error);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      if (!user) {
        console.log('No user found');
        return;
      }

      console.log('Attempting to delete post:', postId);
      console.log('Current user:', user.id);

      const { error } = await supabase
        .from('support_posts')
        .delete()
        .eq('id', postId)
        .eq('created_by', user.id);

      if (error) {
        console.error('Error deleting post:', error);
        alert(`Failed to delete post: ${error.message}`);
        return;
      }

      console.log('Post deleted successfully');
      setPosts(currentPosts => currentPosts.filter(post => post.id !== postId));
      setDeleteConfirmation(null);
    } catch (error) {
      console.error('Error in delete operation:', error);
      alert('Failed to delete post. Please try again.');
    }
  };

  const handleDeleteResponse = async (responseId: string) => {
    try {
      if (!user) return;

      const { error } = await supabase
        .from('support_responses')
        .delete()
        .eq('id', responseId)
        .eq('created_by', user.id);

      if (error) throw error;

      setPosts(currentPosts => currentPosts.map(post => ({
        ...post,
        support_responses: post.support_responses?.filter(response => response.id !== responseId) || []
      })));
      setDeleteConfirmation(null);
    } catch (error) {
      console.error('Error deleting response:', error);
      alert('Failed to delete response. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full relative font-cabinet-grotesk">
        <FloatingShapes />
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-800 rounded w-1/4"></div>
            <div className="h-4 bg-gray-800 rounded w-1/2"></div>
            <div className="h-64 bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative font-cabinet-grotesk">
      <FloatingShapes />
      
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4 md:space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-clash-display font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 text-transparent bg-clip-text">
              Peer Support 
            </h1>
            <p className="text-sm md:text-base text-gray-400 mt-1">
              Connect, share, and support each other through challenges
            </p>
          </div>
          <div className="flex gap-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white/5 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="mostResponses">Most Responses</option>
            </select>
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              New Post
            </motion.button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3 md:space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search support posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 rounded-xl pl-11 pr-4 py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            <motion.button
              whileHover="hover"
              whileTap="tap"
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1.5 rounded-lg text-xs md:text-sm transition-colors ${
                selectedCategory === '' ? 'bg-purple-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              All
            </motion.button>
            {CATEGORIES.map(category => (
              <motion.button
                key={category}
                whileHover="hover"
                whileTap="tap"
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-lg text-xs md:text-sm transition-colors ${
                  selectedCategory === category ? 'bg-purple-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {category}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 gap-4">
          {sortPosts(posts).map((post) => (
            <motion.div
              key={post.id}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover="hover"
              whileTap="tap"
              className="bg-white/5 rounded-xl p-4 md:p-6 border border-transparent hover:border-purple-500/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-purple-400">{post.category}</span>
                  {post.is_anonymous && (
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">
                      Anonymous
                    </span>
                  )}
                </div>
                {post.created_by === user?.id && (
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Opening delete confirmation for post:', {
                        postId: post.id,
                        userId: user.id,
                        createdBy: post.created_by
                      });
                      setDeleteConfirmation({
                        type: 'post',
                        id: post.id,
                        title: post.title
                      });
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                )}
              </div>

              <h3 className="text-lg font-medium mb-2">{post.title}</h3>
              <p className="text-gray-400 mb-4">
                {post.content}
              </p>

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-400">
                    {post.is_anonymous ? 'Anonymous' : post.profiles?.name}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-400">
                    {format(new Date(post.created_at), 'MMM d, h:mm a')}
                  </span>
                  <button
                    onClick={() => setShowCommentModal(post.id)}
                    className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-sm">
                      {post.support_responses?.length || 0} Responses
                    </span>
                  </button>
                </div>
              </div>

              {/* Responses Section */}
              {post.support_responses && post.support_responses.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Responses</h4>
                  <div className="space-y-3">
                    {post.support_responses.map((response) => (
                      <div
                        key={response.id}
                        className="bg-white/5 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-300">
                            {response.is_anonymous ? 'Anonymous' : response.profiles?.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">
                              {format(new Date(response.created_at), 'MMM d, h:mm a')}
                            </span>
                            {response.created_by === user?.id && (
                              <button
                                onClick={() => setDeleteConfirmation({
                                  type: 'response',
                                  id: response.id
                                })}
                                className="text-red-400 hover:text-red-300 p-1 rounded-lg hover:bg-red-500/10 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-400">{response.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {posts.length === 0 && (
          <motion.div
            initial="hidden"
            animate="visible"
            className="text-center py-12"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block"
            >
              <MessageCircle className="w-12 h-12 text-purple-500 mx-auto mb-4" />
            </motion.div>
            <h3 className="text-lg md:text-xl font-medium mb-2">No Support Posts Found</h3>
            <p className="text-gray-400 text-sm md:text-base">
              {searchQuery ? 'Try adjusting your search or filters' : 'Be the first to ask for help!'}
            </p>
          </motion.div>
        )}

        {/* Create Post Modal */}
        {showCreateModal && (
          <Modal onClose={() => setShowCreateModal(false)} maxWidth="max-w-lg">
            <div className="bg-gray-900 p-4 md:p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl md:text-2xl font-clash-display font-bold">
                  Ask for Help
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                handleCreatePost();
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    className="w-full bg-white/5 rounded-xl px-4 py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="What do you need help with?"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    className="w-full bg-white/5 rounded-xl px-4 py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[120px] resize-none"
                    placeholder="Describe your situation..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <select
                    value={newPost.category}
                    onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                    className="w-full bg-white/5 rounded-xl px-4 py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">Select a category</option>
                    {CATEGORIES.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPost.is_anonymous}
                    onChange={(e) => setNewPost({ ...newPost, is_anonymous: e.target.checked })}
                    className="rounded border-gray-600 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-400">Post anonymously</span>
                </label>

                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  type="submit"
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  disabled={!newPost.title.trim() || !newPost.content.trim() || !newPost.category}
                >
                  <ArrowRight className="w-4 h-4" />
                  Create Post
                </motion.button>
              </form>
            </div>
          </Modal>
        )}

        {/* Add Comment Modal */}
        {showCommentModal && (
          <Modal onClose={() => setShowCommentModal(null)} maxWidth="max-w-lg">
            <div className="bg-gray-900 p-6 rounded-2xl">
              <h3 className="text-lg font-medium mb-4">Add a Response</h3>
              <div className="space-y-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write your response..."
                  className="w-full h-32 bg-white/5 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="anonymous-comment"
                    checked={isAnonymousComment}
                    onChange={(e) => setIsAnonymousComment(e.target.checked)}
                    className="rounded border-gray-600"
                  />
                  <label htmlFor="anonymous-comment" className="text-sm text-gray-300">
                    Post anonymously
                  </label>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCommentModal(null)}
                    className="flex-1 px-4 py-2 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleCreateResponse(showCommentModal)}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                    disabled={!newComment.trim()}
                  >
                    Post Response
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmation && (
          <Modal onClose={() => setDeleteConfirmation(null)} maxWidth="max-w-md">
            <div className="bg-gray-900 p-6 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <h3 className="text-lg font-medium">Confirm Delete</h3>
              </div>
              <p className="text-gray-400 mb-6">
                {deleteConfirmation.type === 'post' 
                  ? `Are you sure you want to delete this post${deleteConfirmation.title ? `: "${deleteConfirmation.title}"` : ''}? This will also delete all responses.`
                  : 'Are you sure you want to delete this response?'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmation(null)}
                  className="flex-1 px-4 py-2 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    console.log('Confirming delete for:', deleteConfirmation);
                    if (deleteConfirmation.type === 'post') {
                      handleDeletePost(deleteConfirmation.id);
                    } else {
                      handleDeleteResponse(deleteConfirmation.id);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}