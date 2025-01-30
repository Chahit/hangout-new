'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Music, BookOpen, Palette, Code, Dumbbell, Camera, Film, Gamepad, Users, Coffee } from 'lucide-react';

const INTERESTS = [
  { id: 'music', label: 'Music', icon: Music },
  { id: 'academics', label: 'Academics', icon: BookOpen },
  { id: 'art', label: 'Art', icon: Palette },
  { id: 'coding', label: 'Coding', icon: Code },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell },
  { id: 'photography', label: 'Photography', icon: Camera },
  { id: 'movies', label: 'Movies', icon: Film },
  { id: 'gaming', label: 'Gaming', icon: Gamepad },
  { id: 'socializing', label: 'Socializing', icon: Users },
  { id: 'coffee', label: 'Coffee', icon: Coffee },
];

const BATCHES = ['2020', '2021', '2022', '2023', '2024'];
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

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    batch: '',
    branch: '',
  });
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [username, setUsername] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);

  // Fetch user on mount
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setUser(user);
    };
    fetchUser();
  }, [supabase, router]);

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev => 
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const checkUsername = useCallback(async (username: string) => {
    if (!username || username.length < 3) {
      setIsUsernameAvailable(null);
      return;
    }

    setIsCheckingUsername(true);
    try {
      const { data, error } = await supabase
        .rpc('check_username_availability', {
          username_to_check: username
        });

      if (error) throw error;
      setIsUsernameAvailable(data);
    } catch (error) {
      console.error('Error checking username:', error);
      setIsUsernameAvailable(null);
    } finally {
      setIsCheckingUsername(false);
    }
  }, [supabase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (username) {
        checkUsername(username);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username, checkUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!isUsernameAvailable) {
        setError('Please choose a different username');
        return;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          ...formData,
          username: username.toLowerCase(),
          interests: selectedInterests,
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      router.push('/dashboard');
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <div className="max-w-md mx-auto space-y-8 pt-8">
        <div>
          <h2 className="text-3xl font-bold text-center">Complete Your Profile</h2>
          <p className="mt-2 text-center text-muted-foreground">
            Let&apos;s get to know you better
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                required
                className="mobile-input"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">@</span>
                <input
                  type="text"
                  id="username"
                  required
                  className="mobile-input pl-8"
                  value={username}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                    setUsername(value);
                    setFormData({ ...formData, username: value });
                  }}
                  placeholder="your_username"
                />
                {isCheckingUsername && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div>
                  </div>
                )}
                {!isCheckingUsername && isUsernameAvailable !== null && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    {isUsernameAvailable ? (
                      <span className="text-green-500">✓</span>
                    ) : (
                      <span className="text-red-500">✗</span>
                    )}
                  </div>
                )}
              </div>
              {username && !isCheckingUsername && (
                <p className={`mt-1 text-sm ${isUsernameAvailable ? 'text-green-500' : 'text-red-500'}`}>
                  {isUsernameAvailable ? 'Username is available' : 'Username is taken'}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="batch" className="block text-sm font-medium mb-1">
                Batch
              </label>
              <select
                id="batch"
                required
                className="mobile-input"
                value={formData.batch}
                onChange={(e) => setFormData(prev => ({ ...prev, batch: e.target.value }))}
              >
                <option value="">&nbsp;Select Batch</option>
                {BATCHES.map(batch => (
                  <option key={batch} value={batch}>{batch}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="branch" className="block text-sm font-medium mb-1">
                Branch
              </label>
              <select
                id="branch"
                required
                className="mobile-input"
                value={formData.branch}
                onChange={(e) => setFormData(prev => ({ ...prev, branch: e.target.value }))}
              >
                <option value="">&nbsp;Select Branch</option>
                {BRANCHES.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">
              Your Interests
            </label>
            <div className="grid grid-cols-2 gap-3">
              {INTERESTS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleInterest(id)}
                  className={`interest-button flex items-center justify-center gap-2 ${
                    selectedInterests.includes(id) ? 'selected' : ''
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-destructive text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mobile-button w-full"
          >
            {loading ? 'Saving...' : 'Complete Profile'}
          </button>
        </form>
      </div>
    </div>
  );
} 