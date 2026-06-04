'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Moon, Sun, BarChart3, Briefcase, Building2, Users, FileText, Table, Keyboard, LogIn, UserPlus, LogOut, User } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { useGlobalShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAppData } from '@/hooks/useAppData';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const navItems = [
  { href: '/spreadsheet', label: 'Spreadsheet', icon: BarChart3, featured: true },
  { href: '/', label: 'Dashboard', icon: BarChart3 },
  { href: '/applications', label: 'Add Job', icon: Briefcase },
  { href: '/networking', label: 'Networking', icon: Users },
  { href: '/career-fairs', label: 'Career Fairs', icon: Building2 },
  { href: '/resources', label: 'Resources', icon: FileText },
];

export function Navigation() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const router = useRouter();
  const { undo } = useAppData();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const isAuthenticated = !!user;
  
  const shortcuts = useGlobalShortcuts(
    undefined,
    () => setShowShortcuts(true)
  );
  
  // Add Ctrl+Z listener for undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  return (
    <nav className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <div className="w-8 h-8 bg-northeastern-red rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-gray-900 dark:text-white whitespace-nowrap">
                  Career Tracker
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 -mt-1 whitespace-nowrap">
                  Northeastern
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex gap-1">
              {navItems.map((item) => {
                const Icon = item.label === 'Spreadsheet' ? Table : item.icon;
                const isActive = pathname === item.href;
                const isFeatured = 'featured' in item && item.featured;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-northeastern-red text-white shadow-md'
                        : isFeatured
                        ? 'text-northeastern-red dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShortcuts(true)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors hidden sm:block"
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts (Ctrl+/)"
            >
              <Keyboard className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            {/* Auth Status */}
            {authLoading ? (
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
            ) : isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title={user?.email || 'Account'}
                >
                  <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden md:inline">
                    {user?.user_metadata?.name || user?.email?.split('@')[0] || 'Account'}
                  </span>
                </button>
                
                {showUserMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 py-2">
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {user?.user_metadata?.name || 'Account'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {user?.email}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          const supabase = createClient();
                          await supabase.auth.signOut();
                          setShowUserMenu(false);
                          router.push('/');
                          router.refresh();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden md:inline">Login</span>
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-northeastern-red text-white hover:bg-red-700 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden md:inline">Sign Up</span>
                </Link>
              </div>
            )}
            
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex gap-1 pb-2 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.label === 'Spreadsheet' ? Table : item.icon;
            const isActive = pathname === item.href;
            const isFeatured = 'featured' in item && item.featured;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                  isActive
                    ? 'bg-northeastern-red text-white'
                    : isFeatured
                    ? 'bg-red-50 dark:bg-red-900/20 text-northeastern-red dark:text-red-400 font-semibold'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
      
      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <KeyboardShortcutsModal
          shortcuts={shortcuts}
          onClose={() => setShowShortcuts(false)}
        />
      )}
    </nav>
  );
}
