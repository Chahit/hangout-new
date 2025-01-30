'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';
import { Send, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  match_id: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

interface MatchInfo {
  id: string;
  partner_id: string;
  partner_email: string;
  status: string;
}

export default function ChatPage() {
  const params = useParams();
  const matchId = params.matchId as string;
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const { data: messages, error: messagesError } = await supabase
        .from('dating_messages')
        .select(`
          *,
          sender:sender_id(email)
        `)
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      setMessages(messages.map(msg => ({
        ...msg,
        sender_email: msg.sender.email
      })));
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [supabase, matchId]);

  const fetchMatchInfo = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: match, error: matchError } = await supabase
        .from('dating_matches')
        .select(`
          *,
          sender:sender_id(email),
          receiver:receiver_id(email)
        `)
        .eq('id', matchId)
        .single();

      if (matchError) throw matchError;
      if (!match) throw new Error('Match not found');
      if (match.status !== 'accepted') throw new Error('Match not accepted');
      if (match.sender_id !== user.id && match.receiver_id !== user.id) {
        throw new Error('Unauthorized');
      }

      const partnerId = match.sender_id === user.id ? match.receiver_id : match.sender_id;
      const partnerEmail = match.sender_id === user.id ? match.receiver.email : match.sender.email;

      setMatchInfo({
        id: match.id,
        partner_id: partnerId,
        partner_email: partnerEmail,
        status: match.status
      });

      await fetchMessages();
    } catch (error) {
      console.error('Error fetching match:', error);
      setError('Failed to load chat. Please try again.');
      setLoading(false);
    }
  }, [supabase, matchId, fetchMessages]);

  const handleNewMessage = useCallback(() => {
    const messagesChannel = supabase.channel(`match:${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'dating_messages',
        filter: `match_id=eq.${matchId}`
      }, (payload) => {
        const newMessage = payload.new as Message;
        setMessages(prev => [...prev, newMessage]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [supabase, matchId]);

  useEffect(() => {
    const channel = supabase
      .channel(`match_${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'dating_messages',
        filter: `match_id=eq.${matchId}`
      }, (payload) => {
        const newMessage = payload.new as Message;
        setMessages(prevMessages => [...prevMessages, newMessage]);
      })
      .subscribe();

    fetchMessages();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, matchId, fetchMessages]);

  useEffect(() => {
    const setup = async () => {
      await Promise.all([
        fetchMatchInfo(),
      ]);
      handleNewMessage();
    };
    setup();
  }, [fetchMatchInfo, handleNewMessage]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser({
          id: user.id,
          name: user.user_metadata.name || user.email?.split('@')[0] || 'Anonymous',
          email: user.email || ''
        });
      }
    };
    getUser();
  }, [supabase.auth]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('dating_messages')
        .insert({
          match_id: matchId,
          sender_id: user.id,
          content: newMessage.trim()
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error}</p>
        <Link href="/dashboard/dating/matches" className="text-purple-500 hover:underline">
          Return to Matches
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Chat Header */}
      <div className="flex items-center gap-4 p-4 border-b border-gray-700 bg-gray-800">
        <Link
          href="/dashboard/dating/matches"
          className="text-gray-400 hover:text-gray-300"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h2 className="text-lg font-semibold">
            {matchInfo?.partner_email.split('@')[0]}
          </h2>
          <p className="text-sm text-gray-400">Matched</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isOwnMessage = message.sender_id === currentUser?.id;

          return (
            <div
              key={message.id}
              className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  isOwnMessage
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-700 text-gray-100'
                }`}
              >
                <p>{message.content}</p>
                <span className="text-xs opacity-75 mt-1 block">
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={sendMessage} className="p-4 border-t border-gray-700 bg-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 p-2 rounded-lg bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Send className="w-6 h-6" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}