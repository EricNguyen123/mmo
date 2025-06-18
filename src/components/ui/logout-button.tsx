'use client';

import type React from 'react';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { LogOut, Loader2 } from 'lucide-react';

interface LogoutButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showIcon?: boolean;
  showConfirmation?: boolean;
  children?: React.ReactNode;
}

export function LogoutButton({
  variant = 'ghost',
  size = 'default',
  className = '',
  showIcon = true,
  showConfirmation = true,
  children,
}: LogoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setLoading(true);
    try {
      // Call logout API
      await fetch('/api/auth/logout', { method: 'POST' });

      // Clear all tokens and storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('userToken');
      localStorage.clear();

      // Clear session storage as well
      sessionStorage.clear();

      // Redirect to login
      router.push('/login');

      // Force page refresh to clear any cached state
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    } finally {
      setLoading(false);
    }
  };

  const LogoutContent = () => (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={loading}
      onClick={handleLogout}
    >
      {loading ? (
        <Loader2 className='w-4 h-4 mr-2 animate-spin' />
      ) : (
        showIcon && <LogOut className='w-4 h-4 mr-2' />
      )}
      {children || (loading ? 'Signing out...' : 'Sign out')}
    </Button>
  );

  if (!showConfirmation) {
    return <LogoutContent />;
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} className={className} disabled={loading}>
          {showIcon && <LogOut className='w-4 h-4 mr-2' />}
          {children || 'Sign out'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Sign Out</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to sign out? You will need to log in again to access your account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleLogout}
            disabled={loading}
            className='bg-red-600 hover:bg-red-700'
          >
            {loading ? (
              <>
                <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                Signing out...
              </>
            ) : (
              <>
                <LogOut className='w-4 h-4 mr-2' />
                Sign out
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
