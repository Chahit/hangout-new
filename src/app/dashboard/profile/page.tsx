'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Profile {
  id: string;
  name: string;
  email: string;
  batch: string;
  branch: string;
  interests: string[];
}

const BRANCHES = [
  'CSE',
  'ECE',
  'Mechanical',
  'Civil',
  'Chemical',
  'Physics',
  'Mathematics',
  'Chemistry',
  'BMS',
  'Economics',
  'Ecofin',
  'English',
  'History',
  'Sociology',
  'Design'
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const supabase = createClient();

  const fetchProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }, [supabase]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update(profile)
        .eq('id', profile.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <label className="block text-sm font-medium mb-2">Branch</label>
          <select
            value={profile.branch || ''}
            onChange={(e) => setProfile({ ...profile, branch: e.target.value })}
            className="w-full bg-white/5 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Select your branch</option>
            {BRANCHES.map(branch => (
              <option key={branch} value={branch}>{branch}</option>
            ))}
          </select>
        </div>
        
        {/* Add other form fields here */}
        
        <button
          onClick={handleSubmit}
          className="w-full bg-purple-500 text-white rounded-lg px-4 py-3 hover:bg-purple-600 transition-colors"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
} 