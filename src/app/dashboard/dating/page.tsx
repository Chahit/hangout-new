'use client';

import { createClient } from '@/lib/supabase/client';
import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DatingProfile {
  id: string;
  user_id: string;
  gender: 'male' | 'female';
  looking_for: 'male' | 'female';
  bio: string | null;
  interests: string[];
  answers: Record<string, string>;
  has_completed_profile: boolean;
  created_at: string;
  updated_at?: string;
}

export default function DatingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<DatingProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const checkProfile = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Simplified query with proper error handling
      const { data: profile, error } = await supabase
        .from('dating_profiles')
        .select('id, user_id, gender, looking_for, bio, interests, answers, has_completed_profile, created_at')
        .eq('user_id', session.user.id)
        .maybeSingle();

      // Handle case where profile doesn't exist
      if (error && error.code !== 'PGRST116') {
        console.error('Profile fetch error:', error);
        throw error;
      }

      if (!profile) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Ensure proper typing of the response
      const typedProfile: DatingProfile = {
        id: profile.id,
        user_id: profile.user_id,
        gender: profile.gender as 'male' | 'female',
        looking_for: profile.looking_for as 'male' | 'female',
        bio: profile.bio,
        interests: profile.interests || [],
        answers: profile.answers || {},
        has_completed_profile: profile.has_completed_profile || false,
        created_at: profile.created_at
      };

      setProfile(typedProfile);

      // Handle routing based on profile state
      if (typedProfile.has_completed_profile) {
        router.push('/dashboard/dating/matches');
      } else if (Object.keys(typedProfile.answers || {}).length > 0) {
        router.push('/dashboard/dating/profile');
      }
    } catch (error) {
      console.error('Error checking profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  const createProfile = useCallback(async (gender: 'male' | 'female', lookingFor: 'male' | 'female') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Simplified query with proper error handling
      const { data: existingProfile, error: checkError } = await supabase
        .from('dating_profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingProfile) {
        const { error: updateError } = await supabase
          .from('dating_profiles')
          .update({
            gender,
            looking_for: lookingFor,
            has_completed_profile: false
          })
          .eq('id', existingProfile.id)
          .select()
          .single();

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('dating_profiles')
          .insert({
            user_id: session.user.id,
            gender,
            looking_for: lookingFor,
            has_completed_profile: false,
            answers: {},
            interests: []
          })
          .select()
          .single();

        if (insertError) throw insertError;
      }

      router.push('/dashboard/dating/profile');
    } catch (error) {
      console.error('Error creating profile:', error);
      alert('Failed to create profile. Please try again.');
    }
  }, [supabase, router]);

  useEffect(() => {
    checkProfile();
  }, [checkProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white/5 p-8 rounded-xl backdrop-blur-lg">
          <h2 className="text-2xl font-bold mb-6 text-white">Welcome to Dating!</h2>
          <p className="mb-6 text-gray-300">Let&apos;s start by knowing a bit about you.</p>
          <div className="space-y-4">
            <button
              onClick={() => createProfile('male', 'female')}
              className="w-full p-4 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition"
            >
              Male
            </button>
            <button
              onClick={() => createProfile('female', 'male')}
              className="w-full p-4 bg-pink-600 hover:bg-pink-700 rounded-lg text-white transition"
            >
              Female
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}