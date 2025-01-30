'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, MessageSquare } from 'lucide-react';
import UserSearch from '@/components/UserSearch';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface DirectMessage {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  recipient_id: string;
  sender: {
    id: string;
    username: string;
    name: string;
  };
  recipient: {
    id: string;
    username: string;
    name: string;
  };
}

interface Chat {
  user: {
    id: string;
    username: string;
    name: string;
  };
  lastMessage: {
    content: string;
    created_at: string;
  };
  unreadCount: number;
}

export default function MessagesPage() {
  const [recentChats, setRecentChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchRecentChats = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch recent chats with last message and unread count
        const { data: chats, error } = await supabase
          .from('direct_messages')
          .select(`
            id,
            content,
            created_at,
            sender_id,
            recipient_id,
            sender:profiles!direct_messages_sender_id_fkey(id, username, name),
            recipient:profiles!direct_messages_recipient_id_fkey(id, username, name)
          `)
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .returns<DirectMessage[]>();

        if (error) {
          console.error('Error fetching recent chats:', error);
          throw error;
        }

        // Process and deduplicate chats
        const processedChats = (chats || []).reduce((acc: Chat[], message: DirectMessage) => {
          const otherUser = message.sender_id === user.id 
            ? message.recipient
            : message.sender;
          
          // Check if we already have a chat with this user
          const existingChat = acc.find(chat => chat.user.id === otherUser.id);
          if (!existingChat) {
            acc.push({
              user: {
                id: otherUser.id,
                username: otherUser.username,
                name: otherUser.name
              },
              lastMessage: {
                content: message.content,
                created_at: message.created_at,
              },
              unreadCount: 0,
            });
          }
          return acc;
        }, []);

        setRecentChats(processedChats);
      } catch (error) {
        console.error('Error fetching recent chats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentChats();
  }, [supabase]);

  return (
    <div className="min-h-screen w-full relative font-cabinet-grotesk">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 text-transparent bg-clip-text">
            Messages
          </h1>
          <p className="text-gray-400 mt-1">Chat with your college mates</p>
        </div>

        {/* User Search */}
        <div className="glass-morphism p-4 rounded-xl">
          <UserSearch />
        </div>

        {/* Recent Chats */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Recent Chats</h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
            </div>
          ) : recentChats.length > 0 ? (
            <div className="space-y-2">
              {recentChats.map((chat) => (
                <Link href={`/dashboard/messages/${chat.user.username}`} key={chat.user.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">@{chat.user.username}</span>
                          <span className="text-sm text-gray-400">{chat.user.name}</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(chat.lastMessage.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 truncate">{chat.lastMessage.content}</p>
                    </div>
                    {chat.unreadCount > 0 && (
                      <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white">{chat.unreadCount}</span>
                      </div>
                    )}
                  </motion.div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No messages yet</p>
              <p className="text-sm">Search for users to start chatting!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 