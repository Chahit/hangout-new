import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  interests: string[];
  created_at: string;
};

export type Group = {
  id: string;
  name: string;
  description: string;
  category: string;
  image_url: string | null;
  is_private: boolean;
  invite_code: string | null;
  created_by: string;
  created_at: string;
  member_count: number;
};

export type Message = {
  id: string;
  content: string;
  sender_id: string;
  group_id: string | null;
  receiver_id: string | null;
  attachments: string[];
  created_at: string;
}; 