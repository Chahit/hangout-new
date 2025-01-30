"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Logo } from '@/components/Logo';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Calendar,
  Heart,
  Ghost,
  SmilePlus,
  HeartHandshake,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X
} from 'lucide-react';

const menuItems = [
  { name: 'Overview', icon: LayoutDashboard, href: '/dashboard', color: 'purple' },
  { name: 'Groups', icon: Users, href: '/dashboard/groups', color: 'blue' },
  { name: 'Messages', icon: MessageSquare, href: '/dashboard/messages', color: 'pink' },
  { name: 'Events', icon: Calendar, href: '/dashboard/events', color: 'green' },
  { name: 'Dating', icon: Heart, href: '/dashboard/dating', color: 'red' },
  { name: 'Confessions', icon: Ghost, href: '/dashboard/confessions', color: 'yellow' },
  { name: 'Memes', icon: SmilePlus, href: '/dashboard/memes', color: 'orange' },
  { name: 'PeerSupport', icon: HeartHandshake, href: '/dashboard/support', color: 'teal' },
  { name: 'Settings', icon: Settings, href: '/dashboard/settings', color: 'gray' }
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const supabase = createClient();
  const router = useRouter();

  // Handle logout function
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  // Check if we're on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex min-h-screen bg-black">
      {/* Desktop Sidebar */}
      <motion.div
        initial={false}
        animate={{ width: isCollapsed ? '5rem' : '16rem' }}
        className="fixed left-0 top-0 h-screen bg-black border-r border-white/10 z-50 hidden md:block"
      >
        {/* Logo Section */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Logo />
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>

        {/* Desktop Menu Items */}
        <div className="py-4 space-y-2 px-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <motion.div
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group cursor-pointer
                    ${isActive 
                      ? `bg-${item.color}-500/10 text-${item.color}-500` 
                      : 'hover:bg-white/5 text-gray-400 hover:text-white'
                    }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? `text-${item.color}-500` : 'group-hover:text-white'}`} />
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="font-medium"
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            );
          })}
        </div>

        {/* Desktop Bottom Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <motion.button
            onClick={handleLogout}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all duration-200 cursor-pointer w-full"
          >
            <LogOut className="w-5 h-5" />
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="font-medium"
                >
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="fixed top-4 right-4 p-2 bg-white/5 rounded-lg md:hidden z-50"
      >
        <Menu className="w-6 h-6 text-gray-400" />
      </button>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="absolute right-0 top-0 bottom-0 w-72 bg-black border-l border-white/10 p-4 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile Menu Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                <Logo />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Mobile Menu Items */}
              <div className="space-y-2">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.name} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                      <motion.div
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.95 }}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200
                          ${isActive 
                            ? `bg-${item.color}-500/10 text-${item.color}-500` 
                            : 'hover:bg-white/5 text-gray-400 hover:text-white'
                          }`}
                      >
                        <item.icon className={`w-5 h-5 ${isActive ? `text-${item.color}-500` : ''}`} />
                        <span className="font-medium">{item.name}</span>
                      </motion.div>
                    </Link>
                  );
                })}

                {/* Mobile Menu Logout */}
                <motion.button
                  onClick={handleLogout}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all duration-200 cursor-pointer w-full mt-4"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-200 ${isCollapsed ? 'md:ml-20' : 'md:ml-64'} p-4`}>
        {children}
      </main>
    </div>
  );
} 