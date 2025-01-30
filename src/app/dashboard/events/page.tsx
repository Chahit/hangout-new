'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Plus, X, ArrowRight, Calendar, Clock, MapPin, Users, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import Modal from '@/components/shared/Modal';
import type { Database } from '@/lib/database.types';

interface EventParticipant {
  user_id: string;
  status: 'going' | 'maybe' | 'not_going';
  user: {
    id: string;
    name: string;
  };
}

interface Event {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  created_at: string;
  media_url?: string;
  is_public: boolean;
  is_approved: boolean;
  max_participants: number;
  created_by: string;
  group_id?: string;
  event_participants: EventParticipant[];
  group?: {
    id: string;
    name: string;
  };
}

interface GroupMemberResponse {
  group_id: string;
  groups: {
    id: string;
    name: string;
  };
}

interface CreateEventData {
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  is_public: boolean;
  max_participants?: number;
  group_id?: string;
  media_url?: string;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
};

const buttonVariants = {
  hover: { scale: 1.02 },
  tap: { scale: 0.98 }
};

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

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[200px] relative">
    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-transparent animate-shimmer" />
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="relative"
    >
      <Loader2 className="w-12 h-12 text-purple-500" />
      <motion.div
        className="absolute inset-0 bg-purple-500/20 blur-xl"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
    </motion.div>
  </div>
);

const handleParticipantUpdate = (prevEvents: Event[], eventId: string, userId: string, newParticipant: EventParticipant) => {
  return prevEvents.map(event => {
    if (event.id === eventId) {
      const updatedParticipants = [...(event.event_participants || [])];
      const participantIndex = updatedParticipants.findIndex(participant => participant.user_id === userId);
      
      if (participantIndex >= 0) {
        updatedParticipants[participantIndex] = newParticipant;
      } else {
        updatedParticipants.push(newParticipant);
      }
      
      return {
        ...event,
        event_participants: updatedParticipants
      };
    }
    return event;
  });
};

const isParticipant = (event: Event, userId: string): boolean => {
  return event.event_participants.some(p => p.user_id === userId);
};

export default function EventsPage() {
  const supabase = createClientComponentClient<Database>();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'approved' | 'pending'>('approved');
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    start_time: '',
    end_time: '',
    is_public: true,
    group_id: '',
  });
  const [userGroups, setUserGroups] = useState<Array<{ id: string; name: string; }>>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const checkAdminStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email === 'cl883@snu.edu.in') {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  }, [supabase]);

  const fetchEvents = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: events, error } = await supabase
        .from('events')
        .select(`
          *,
          event_participants (
            user_id,
            status,
            user:profiles(id, name)
          ),
          group:groups(id, name)
        `)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Filter events based on visibility and approval
      const filteredEvents = events.filter(event => {
        if (event.created_by === session.user.id) return true;
        if (!event.is_approved) return false;
        if (event.is_public) return true;
        if (event.group_id) {
          return event.event_participants.some((p: EventParticipant) => 
            p.user_id === session.user.id && p.status === 'going'
          );
        }
        return false;
      });

      // Transform the data to match the Event interface
      const transformedEvents = filteredEvents.map(event => ({
        ...event
      }));

      setEvents(transformedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const fetchUserGroups = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('group_members')
        .select('group_id, groups!inner(id, name)')
        .eq('user_id', session.user.id)
        .returns<GroupMemberResponse[]>();

      if (error) throw error;
      
      if (data) {
        const groups = data.map(item => ({
          id: item.groups.id,
          name: item.groups.name
        }));
        setUserGroups(groups);
      }
    } catch (error) {
      console.error('Error fetching user groups:', error);
    }
  }, [supabase]);

  useEffect(() => {
    checkAdminStatus();
    fetchEvents();
    fetchUserGroups();
  }, [checkAdminStatus, fetchEvents, fetchUserGroups, activeTab]);

  const createEvent = useCallback(async (eventData: CreateEventData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Upload media if present
      let publicUrl = null;
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${session.user.id}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('event-media')
          .upload(fileName, selectedFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl: url } } = supabase.storage
          .from('event-media')
          .getPublicUrl(fileName);
        
        publicUrl = url;
      }

      const { data: event, error } = await supabase
        .from('events')
        .insert({
          ...eventData,
          created_by: session.user.id,
          group_id: eventData.group_id || null,
          media_url: publicUrl,
          is_public: true,
          is_approved: false // Always set to false initially
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as first participant
      const { error: participantError } = await supabase
        .from('event_participants')
        .insert({
          event_id: event.id,
          user_id: session.user.id,
          status: 'going'
        });

      if (participantError) throw participantError;

      setEvents(prev => [...prev, event]);
      setShowCreateModal(false);
      setSelectedFile(null);
    } catch (error) {
      console.error('Error creating event:', error);
    }
  }, [supabase, selectedFile]);

  const handleJoinEvent = useCallback(async (eventId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', session.user.id)
        .single();

      if (!userProfile) return;

      const newParticipant: EventParticipant = {
        user_id: session.user.id,
        user: {
          id: session.user.id,
          name: userProfile.name,
        },
        status: 'going'
      };

      setEvents(prev => handleParticipantUpdate(prev, eventId, session.user.id, newParticipant));

      const { error } = await supabase
        .from('event_participants')
        .insert({
          event_id: eventId,
          user_id: session.user.id,
          status: 'going'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error joining event:', error);
    }
  }, [supabase]);

  const handleRemoveEvent = useCallback(async (eventId: string) => {
    try {
      // Delete the event and its participants
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      // Update local state
      setEvents(prev => prev.filter(event => event.id !== eventId));
    } catch (error) {
      console.error('Error removing event:', error);
    }
  }, [supabase]);

  const handleApproveEvent = useCallback(async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ is_approved: true })
        .eq('id', eventId);

      if (error) throw error;

      // Update local state
      setEvents(prev => prev.map(event => 
        event.id === eventId ? { ...event, is_approved: true } : event
      ));
    } catch (error) {
      console.error('Error approving event:', error);
    }
  }, [supabase]);

  const handleDeclineEvent = useCallback(async (eventId: string) => {
    try {
      // Delete the event and its participants
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      // Update local state
      setEvents(prev => prev.filter(event => event.id !== eventId));
    } catch (error) {
      console.error('Error declining event:', error);
    }
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-screen w-full relative font-cabinet-grotesk">
        <FloatingShapes />
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          <LoadingSpinner />
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
              Campus Events 
            </h1>
            <p className="text-sm md:text-base text-gray-400 mt-1">
              {isAdmin ? 'Manage and approve campus events' : 'Discover exciting events happening around campus'}
            </p>
          </div>
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-all text-sm md:text-base flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </motion.button>
        </div>

        {/* Admin Tabs */}
        {isAdmin && (
          <div className="flex gap-2">
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => setActiveTab('approved')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                activeTab === 'approved'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Approved Events
            </motion.button>
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                activeTab === 'pending'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Pending Approval
            </motion.button>
          </div>
        )}

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: index * 0.1 }}
              className="glass-morphism rounded-xl overflow-hidden"
            >
              <div className="p-4 md:p-5 space-y-3 md:space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-base md:text-lg truncate">
                      {event.title}
                    </h3>
                    {event.group && (
                      <p className="text-xs text-purple-400 mt-0.5">
                        Hosted by {event.group.name}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                      {event.is_public ? 'Public' : 'Private'}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-400 line-clamp-2">
                  {event.description}
                </p>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {format(new Date(event.start_time), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>
                      {format(new Date(event.start_time), 'h:mm a')} - {format(new Date(event.end_time), 'h:mm a')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{event.location}</span>
                  </div>
                </div>
              </div>

              {/* Event Actions */}
              <div className="p-4 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-400">
                    {event.event_participants?.length || 0} going
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && activeTab === 'pending' ? (
                    <>
                      <motion.button
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                        onClick={() => handleApproveEvent(event.id)}
                        className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Approve
                      </motion.button>
                      <motion.button
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                        onClick={() => handleDeclineEvent(event.id)}
                        className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Decline
                      </motion.button>
                    </>
                  ) : isAdmin ? (
                    <motion.button
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      onClick={() => handleRemoveEvent(event.id)}
                      className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Remove
                    </motion.button>
                  ) : (
                    <motion.button
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      onClick={() => handleJoinEvent(event.id)}
                      disabled={isParticipant(event, event.created_by)}
                      className="px-4 py-1.5 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isParticipant(event, event.created_by) ? 'Going' : 'Join Event'}
                    </motion.button>
                  )}
                </div>
              </div>
              {!event.is_approved && (
                <div className="absolute top-2 right-2 bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded-lg text-xs">
                  Pending Approval
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {events.length === 0 && (
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="text-center py-12"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block"
            >
              <ArrowRight className="w-12 h-12 text-purple-500 mx-auto mb-4" />
            </motion.div>
            <h3 className="text-lg md:text-xl font-medium mb-2">
              {isAdmin && activeTab === 'pending'
                ? 'No Events Pending Approval'
                : 'No Events Yet'}
            </h3>
            <p className="text-gray-400 text-sm md:text-base">
              {isAdmin && activeTab === 'pending'
                ? 'All events have been reviewed'
                : isAdmin
                ? 'Create an event or wait for submissions'
                : 'Check back later for upcoming events!'}
            </p>
          </motion.div>
        )}

        {/* Create Event Modal */}
        {showCreateModal && (
          <Modal onClose={() => setShowCreateModal(false)} maxWidth="max-w-md">
            <div className="bg-gray-900 p-4 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-clash-display font-bold">
                  Create Event
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                createEvent(newEvent);
              }} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="w-full bg-white/5 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Give your event a title..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="w-full bg-white/5 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[80px] resize-none"
                    placeholder="Describe your event..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Location</label>
                  <input
                    type="text"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    className="w-full bg-white/5 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Where is the event?"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Time</label>
                    <input
                      type="datetime-local"
                      value={newEvent.start_time}
                      onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                      className="w-full bg-white/5 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Time</label>
                    <input
                      type="datetime-local"
                      value={newEvent.end_time}
                      onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                      className="w-full bg-white/5 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Group (Optional)</label>
                  <select
                    value={newEvent.group_id}
                    onChange={(e) => setNewEvent({ ...newEvent, group_id: e.target.value })}
                    className="w-full bg-white/5 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">No group</option>
                    {userGroups.map(group => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEvent.is_public}
                    onChange={(e) => setNewEvent({ ...newEvent, is_public: e.target.checked })}
                    className="rounded border-gray-600 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-400">Make this event public</span>
                </label>

                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  type="submit"
                  className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-all text-sm flex items-center justify-center gap-2"
                >
                  Create Event
                </motion.button>
              </form>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}