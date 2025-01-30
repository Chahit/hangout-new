export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          batch: string
          branch: string
          interests: string[]
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          batch: string
          branch: string
          interests?: string[]
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          batch?: string
          branch?: string
          interests?: string[]
          updated_at?: string
        }
      }
      groups: {
        Row: {
          id: string
          name: string
          description: string | null
          code: string
          is_private: boolean
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          code: string
          is_private?: boolean
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          code?: string
          is_private?: boolean
          created_by?: string
          created_at?: string
        }
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role: 'member' | 'moderator' | 'admin'
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          role?: 'member' | 'moderator' | 'admin'
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          role?: 'member' | 'moderator' | 'admin'
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          content: string
          group_id: string
          user_id: string
          reactions: Json
          created_at: string
        }
        Insert: {
          id?: string
          content: string
          group_id: string
          user_id: string
          reactions?: Json
          created_at?: string
        }
        Update: {
          id?: string
          content?: string
          group_id?: string
          user_id?: string
          reactions?: Json
          created_at?: string
        }
      }
      direct_messages: {
        Row: {
          id: string
          content: string
          sender_id: string
          receiver_id: string
          reactions: Json
          is_read: boolean
          message_type: 'regular' | 'dating'
          created_at: string
        }
        Insert: {
          id?: string
          content: string
          sender_id: string
          receiver_id: string
          reactions?: Json
          is_read?: boolean
          message_type?: 'regular' | 'dating'
          created_at?: string
        }
        Update: {
          id?: string
          content?: string
          sender_id?: string
          receiver_id?: string
          reactions?: Json
          is_read?: boolean
          message_type?: 'regular' | 'dating'
          created_at?: string
        }
      }
      dating_profiles: {
        Row: {
          id: string
          user_id: string
          gender: 'male' | 'female'
          looking_for: 'male' | 'female'
          bio: string | null
          interests: string[]
          answers: Json
          has_completed_profile: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          gender: 'male' | 'female'
          looking_for: 'male' | 'female'
          bio?: string | null
          interests?: string[]
          answers?: Json
          has_completed_profile?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          gender?: 'male' | 'female'
          looking_for?: 'male' | 'female'
          bio?: string | null
          interests?: string[]
          answers?: Json
          has_completed_profile?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      dating_connections: {
        Row: {
          id: string
          from_user_id: string
          to_user_id: string
          status: 'pending' | 'accepted' | 'rejected'
          created_at: string
        }
        Insert: {
          id?: string
          from_user_id: string
          to_user_id: string
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
        }
        Update: {
          id?: string
          from_user_id?: string
          to_user_id?: string
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
        }
      }
      confessions: {
        Row: {
          id: string
          content: string
          anonymous_name: string
          media_url: string | null
          media_type: 'image' | 'video' | null
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          content: string
          anonymous_name: string
          media_url?: string | null
          media_type?: 'image' | 'video' | null
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          content?: string
          anonymous_name?: string
          media_url?: string | null
          media_type?: 'image' | 'video' | null
          user_id?: string
          created_at?: string
        }
      }
      confession_comments: {
        Row: {
          id: string
          confession_id: string
          content: string
          anonymous_name: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          confession_id: string
          content: string
          anonymous_name: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          confession_id?: string
          content?: string
          anonymous_name?: string
          user_id?: string
          created_at?: string
        }
      }
      confession_likes: {
        Row: {
          id: string
          confession_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          confession_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          confession_id?: string
          user_id?: string
          created_at?: string
        }
      }
      memes: {
        Row: {
          id: string
          title: string
          media_url: string
          user_id: string
          user_email: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          media_url: string
          user_id: string
          user_email: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          media_url?: string
          user_id?: string
          user_email?: string
          created_at?: string
        }
      }
      meme_comments: {
        Row: {
          id: string
          meme_id: string
          content: string
          user_id: string
          user_email: string
          created_at: string
        }
        Insert: {
          id?: string
          meme_id: string
          content: string
          user_id: string
          user_email: string
          created_at?: string
        }
        Update: {
          id?: string
          meme_id?: string
          content?: string
          user_id?: string
          user_email?: string
          created_at?: string
        }
      }
      meme_likes: {
        Row: {
          id: string
          meme_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          meme_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          meme_id?: string
          user_id?: string
          created_at?: string
        }
      }
      support_posts: {
        Row: {
          id: string
          title: string
          content: string
          category: string
          is_anonymous: boolean
          is_resolved: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          category: string
          is_anonymous?: boolean
          is_resolved?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          category?: string
          is_anonymous?: boolean
          is_resolved?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      support_responses: {
        Row: {
          id: string
          content: string
          post_id: string
          created_by: string
          is_anonymous: boolean
          is_accepted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          content: string
          post_id: string
          created_by: string
          is_anonymous?: boolean
          is_accepted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          content?: string
          post_id?: string
          created_by?: string
          is_anonymous?: boolean
          is_accepted?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          data: Json
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          data: Json
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          data?: Json
          read?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_potential_matches: {
        Args: { user_uuid: string }
        Returns: {
          profile_id: string
          user_id: string
          gender: string
          bio: string
          interests: string[]
        }[]
      }
      are_users_matched: {
        Args: { user1_uuid: string; user2_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}