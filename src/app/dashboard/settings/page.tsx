'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, User, Mail, GraduationCap, BookOpen, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  batch: string;
  branch: string;
  interests: string[];
  online_status: boolean;
  last_seen: string;
  notification_preferences: {
    email_notifications: boolean;
    dating_notifications: boolean;
    group_notifications: boolean;
    event_notifications: boolean;
    support_notifications: boolean;
  };
  privacy_settings: {
    show_online_status: boolean;
    show_last_seen: boolean;
    show_email: boolean;
    show_batch: boolean;
    show_branch: boolean;
  };
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

// Animation variants
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

// Enhanced loading component with purple gradient shimmer
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

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const supabase = createClient();

  const fetchProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      // Set default values if not present
      setProfile({
        ...profile,
        notification_preferences: profile.notification_preferences || {
          email_notifications: true,
          dating_notifications: true,
          group_notifications: true,
          event_notifications: true,
          support_notifications: true
        },
        privacy_settings: profile.privacy_settings || {
          show_online_status: true,
          show_last_seen: true,
          show_email: true,
          show_batch: true,
          show_branch: true
        }
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(async () => {
    if (!profile) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setSaving(true);

      // Update the profile directly without fetching current profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name: profile.name,
          email: profile.email,
          batch: profile.batch,
          branch: profile.branch,
          interests: profile.interests,
          notification_preferences: profile.notification_preferences,
          privacy_settings: profile.privacy_settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  }, [supabase, profile]);

  const handleInterestChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile) return;
    
    const interests = e.target.value
      .split(',')
      .map(interest => interest.trim())
      .filter(interest => interest !== '');
    
    setProfile({ ...profile, interests });
  }, [profile]);

  const handleBranchChange = useCallback((branch: string) => {
    if (!profile) return;
    
    setProfile({
      ...profile,
      branch
    });
  }, [profile]);

  const handleNotificationPreferenceChange = useCallback((key: string, value: boolean) => {
    if (!profile) return;
    
    setProfile({
      ...profile,
      notification_preferences: {
        ...profile.notification_preferences,
        [key]: value
      }
    });
  }, [profile]);

  const handlePrivacySettingChange = useCallback((key: string, value: boolean) => {
    if (!profile) return;
    
    setProfile({
      ...profile,
      privacy_settings: {
        ...profile.privacy_settings,
        [key]: value
      }
    });
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen w-full relative font-cabinet-grotesk">
        <FloatingShapes />
        <div className="p-4 md:p-6 max-w-2xl mx-auto">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative font-cabinet-grotesk">
      <FloatingShapes />
      
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4 md:space-y-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1 md:space-y-2"
        >
          <h1 className="text-2xl md:text-3xl font-clash-display font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 text-transparent bg-clip-text">
            Settings ✨
          </h1>
          <p className="text-sm md:text-base text-gray-400">
            Customize your profile and preferences
          </p>
        </motion.div>

        {/* Profile Form */}
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          onSubmit={(e) => {
            e.preventDefault();
            updateProfile();
          }}
          className="glass-morphism p-4 md:p-6 rounded-xl space-y-4 md:space-y-6"
        >
          <div className="space-y-4 md:space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2 text-gray-300">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="w-full px-4 py-2.5 md:py-3 bg-white/5 text-white rounded-xl opacity-50 cursor-not-allowed text-sm md:text-base"
              />
              <p className="text-xs md:text-sm text-gray-400 mt-1.5 md:mt-2 ml-6">Email cannot be changed</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2 text-gray-300">
                <User className="w-4 h-4" />
                Name
              </label>
              <input
                type="text"
                value={profile?.name || ''}
                onChange={(e) => setProfile(prev => prev ? { ...prev, name: e.target.value } : null)}
                className="w-full px-4 py-2.5 md:py-3 bg-white/5 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm md:text-base"
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2 text-gray-300">
                <GraduationCap className="w-4 h-4" />
                Batch
              </label>
              <input
                type="text"
                value={profile?.batch || ''}
                onChange={(e) => setProfile(prev => prev ? { ...prev, batch: e.target.value } : null)}
                placeholder="e.g., 2020-2024"
                className="w-full px-4 py-2.5 md:py-3 bg-white/5 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm md:text-base"
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2 text-gray-300">
                <BookOpen className="w-4 h-4" />
                Branch
              </label>
              <select
                value={profile?.branch || ''}
                onChange={(e) => handleBranchChange(e.target.value)}
                className="w-full px-4 py-2.5 md:py-3 bg-[#1a1a1a] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm md:text-base"
                style={{ backgroundColor: '#1a1a1a' }}
              >
                <option value="" className="bg-[#1a1a1a] text-white">Select your branch</option>
                {BRANCHES.map(branch => (
                  <option key={branch} value={branch} className="bg-[#1a1a1a] text-white">{branch}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2 text-gray-300">
                <Heart className="w-4 h-4" />
                Interests
              </label>
              <input
                type="text"
                value={profile?.interests?.join(', ') || ''}
                onChange={handleInterestChange}
                placeholder="e.g., Programming, Music, Sports"
                className="w-full px-4 py-2.5 md:py-3 bg-white/5 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm md:text-base"
              />
              <p className="text-xs md:text-sm text-gray-400 mt-1.5 md:mt-2 ml-6">Separate interests with commas</p>
            </div>

            <NotificationSettings profile={profile} onChange={handleNotificationPreferenceChange} />
            <PrivacySettings profile={profile} onChange={handlePrivacySettingChange} />
          </div>

          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 rounded-lg text-sm ${
                message.type === 'success' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {message.text}
            </motion.div>
          )}

          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            type="submit"
            disabled={saving}
            className="w-full py-2.5 md:py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-all text-sm md:text-base flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Heart className="w-4 h-4" />
                Save Changes
              </>
            )}
          </motion.button>
        </motion.form>
      </div>
    </div>
  );
}

interface NotificationSettingsProps {
  profile: Profile | null;
  onChange: (key: string, value: boolean) => void;
}

const NotificationSettings = ({ profile, onChange }: NotificationSettingsProps) => (
  <div className="space-y-4">
    <h3 className="text-lg font-medium">Notification Preferences</h3>
    <div className="space-y-2">
      {Object.entries(profile?.notification_preferences || {}).map(([key, value]) => (
        <div key={key} className="flex items-center justify-between">
          <label className="text-sm">
            {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          </label>
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => onChange(key, e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
        </div>
      ))}
    </div>
  </div>
);

interface PrivacySettingsProps {
  profile: Profile | null;
  onChange: (key: string, value: boolean) => void;
}

const PrivacySettings = ({ profile, onChange }: PrivacySettingsProps) => (
  <div className="space-y-4">
    <h3 className="text-lg font-medium">Privacy Settings</h3>
    <div className="space-y-2">
      {Object.entries(profile?.privacy_settings || {}).map(([key, value]) => (
        <div key={key} className="flex items-center justify-between">
          <label className="text-sm">
            {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          </label>
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => onChange(key, e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
        </div>
      ))}
    </div>
  </div>
);