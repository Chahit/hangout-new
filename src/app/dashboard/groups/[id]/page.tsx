'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useParams } from 'next/navigation';
import { Send, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Ably from 'ably';

// Create a singleton Ably client
let ablyClient: Ably.Realtime | null = null;

function getAblyClient() {
  if (!ablyClient) {
    ablyClient = new Ably.Realtime({
      key: process.env.NEXT_PUBLIC_ABLY_API_KEY!,
      closeOnUnload: true,
      recover: function(lastConnectionDetails, cb) {
        cb(true);
      },
      disconnectedRetryTimeout: 15000, // Retry connection after 15s
      suspendedRetryTimeout: 30000,    // Retry when suspended after 30s
    });
  }
  return ablyClient;
}

type Message = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  group_id: string;
  user: {
    name: string;
    email?: string;  // Make email optional
  };
};

type GroupInfo = {
  id: string;
  name: string;
  description: string;
  members: {
    user_id: string;
    role: string;
    user: {
      name: string;
      email?: string;  // Make email optional
    };
  }[];
};

export default function GroupChatPage() {
  const params = useParams();
  const supabase = createClientComponentClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [user, setUser] = useState<{ id: string; email: string | undefined } | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [connectionState, setConnectionState] = useState<string>('initialized');
  const [error, setError] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = useCallback(async () => {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles:user_id (
            name
          )
        `)
        .eq('group_id', params.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(messages.map(msg => ({
        ...msg,
        user: msg.profiles
      })));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
    }
  }, [supabase, params.id]);

  const fetchUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { id, email } = session.user;
      setUser({ id, email: email || undefined });
    } else {
      // Removed router.push('/auth');
    }
  }, [supabase]);

  const fetchGroupInfo = useCallback(async () => {
    try {
      const { data: group, error } = await supabase
        .from('groups')
        .select(`
          *,
          members:group_members (
            user_id,
            role,
            profiles:user_id (
              name
            )
          )
        `)
        .eq('id', params.id)
        .single();

      if (error) throw error;
      setGroupInfo(group);
    } catch (error) {
      console.error('Error fetching group info:', error);
    }
  }, [supabase, params.id]);

  useEffect(() => {
    const fetchUserAndSetup = async () => {
      await fetchUser();
      await fetchGroupInfo();
      await fetchMessages();
    };
    fetchUserAndSetup();
  }, [fetchUser, fetchGroupInfo, fetchMessages]);

  // Ably subscription
  useEffect(() => {
    if (!user) return;

    let mounted = true;
    const ably = getAblyClient();
    let channel: Ably.RealtimeChannel | null = null;
    let messageHandler: ((message: Ably.Message) => void) | null = null;

    // Update connection state
    const connectionStateHandler = (stateChange: Ably.ConnectionStateChange) => {
      if (!mounted) return;
      setConnectionState(stateChange.current);
      if (stateChange.reason) {
        setError(stateChange.reason.message);
      }
    };

    const setupAbly = async () => {
      try {
        // Listen for connection state changes
        ably.connection.on(connectionStateHandler);

        // Wait for connection to be established
        if (ably.connection.state !== 'connected') {
          await new Promise<void>((resolve, reject) => {
            const onStateChange = (stateChange: Ably.ConnectionStateChange) => {
              if (stateChange.current === 'connected') {
                ably.connection.off(onStateChange);
                resolve();
              } else if (stateChange.current === 'failed' || stateChange.current === 'suspended') {
                ably.connection.off(onStateChange);
                reject(new Error(`Connection ${stateChange.current}: ${stateChange.reason?.message || 'Unknown error'}`));
              }
            };

            ably.connection.on(onStateChange);
            
            if (ably.connection.state === 'connected') {
              ably.connection.off(onStateChange);
              resolve();
            }
          });
        }

        if (!mounted) return;

        // Create and attach to channel with options
        channel = ably.channels.get(`group-${params.id}`, {
          modes: ['PRESENCE', 'PUBLISH', 'SUBSCRIBE'],
          params: { rewind: '1' } // Get last message on connect
        });
        channelRef.current = channel;

        // Handle channel state
        channel.on((stateChange: Ably.ChannelStateChange) => {
          if (!mounted) return;
          if (stateChange.current === 'failed') {
            setError(`Channel error: ${stateChange.reason?.message || 'Unknown error'}`);
          }
        });

        // Create message handler with error handling
        messageHandler = (message: Ably.Message) => {
          if (!mounted) return;
          try {
            const newMsg = message.data as Message;
            setMessages(prev => {
              const exists = prev.some(msg => msg.id === newMsg.id);
              if (!exists) {
                return [...prev, newMsg];
              }
              return prev;
            });
            scrollToBottom();
          } catch (err) {
            console.error('Error handling message:', err);
            setError('Error processing message');
          }
        };

        // Subscribe to messages with error handling
        if (channel) {
          await channel.attach();
          channel.subscribe('new-message', messageHandler);
          
          // Handle channel state changes for errors
          channel.on((stateChange: Ably.ChannelStateChange) => {
            if (!mounted) return;
            if (stateChange.current === 'failed') {
              console.error('Channel error:', stateChange.reason);
              setError(`Channel error: ${stateChange.reason?.message || 'Unknown error'}`);
            }
          });
        }

      } catch (error) {
        console.error('Error setting up Ably:', error);
        setError(error instanceof Error ? error.message : 'Unknown error setting up Ably');
      }
    };

    setupAbly();

    // Store cleanup function
    cleanupRef.current = () => {
      mounted = false;
      ably.connection.off(connectionStateHandler);
      if (channel && messageHandler) {
        channel.unsubscribe('new-message', messageHandler);
      }
      if (channel && channel.state === 'attached') {
        channel.detach();
      }
    };

    // Return cleanup function
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [params.id, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !channelRef.current) return;
  
    try {
      // First, insert the message into Supabase
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          content: newMessage.trim(),
          group_id: params.id,
          user_id: user.id
        })
        .select(`
          *,
          profiles:user_id (
            name
          )
        `)
        .single();
  
      if (error) throw error;

      // Then publish to Ably
      if (message && channelRef.current) {
        const messageWithUser = {
          ...message,
          user: message.profiles
        };
        await channelRef.current.publish('new-message', messageWithUser);
      }
  
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-4"></div>
        <div className="text-gray-400">
          {connectionState === 'connecting' ? 'Connecting to chat...' : 'Loading...'}
        </div>
        {error && <div className="text-red-500 mt-2">{error}</div>}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-white/10">
        <Link href="/dashboard/groups" className="mr-4">
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ArrowLeft className="w-6 h-6 text-gray-400 hover:text-white transition-colors" />
          </motion.div>
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-white">{groupInfo?.name}</h1>
          <p className="text-sm text-gray-400">
            {groupInfo?.members?.length || 0} members
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`max-w-[70%] rounded-lg p-3 ${
                message.user_id === user?.id 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-800 text-gray-100'
              }`}
            >
              <div className="text-sm font-medium mb-1 flex items-center gap-2">
                <span>{message.user?.name || message.user?.email?.split('@')[0] || 'Unknown User'}</span>
                <span className="text-xs opacity-50">
                  {new Date(message.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
              <p>{message.content}</p>
            </motion.div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={sendMessage} className="p-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-purple-600 text-white rounded-lg p-2 hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>
      </form>
    </div>
  );
} 