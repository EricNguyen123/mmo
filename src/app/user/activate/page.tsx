/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, ArrowLeft, Shield } from 'lucide-react';
import { UserNav } from '@/components/ui/user-nav';
import { useAuth } from '@/hooks/useAuth';

export default function UserActivation() {
  const [activationKey, setActivationKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Redirect if user is not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Sử dụng deviceId đã được lưu trong localStorage từ login
      const deviceId = localStorage.getItem('deviceId');

      if (!deviceId) {
        setError('Device ID not found. Please try logging in again.');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/user/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activationKey,
          deviceId,
          userId: user ? user._id : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('userToken', data.token);
        router.push('/user/dashboard');
      } else {
        const data = await response.json();
        setError(data.error || 'Invalid activation key');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center'>
        <div className='text-center'>
          <Shield className='w-8 h-8 text-blue-600 mx-auto mb-2 animate-spin' />
          <p className='text-slate-600'>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100'>
      <header className='container mx-auto px-4 py-6'>
        <div className='flex justify-between items-center'>
          <div className='flex items-center gap-2'>
            <Shield className='w-8 h-8 text-blue-600' />
            <span className='text-xl font-bold text-slate-900'>SecureVault Pro</span>
          </div>
          <UserNav user={user} />
        </div>
      </header>

      <div className='container mx-auto px-4 py-16 flex items-center justify-center'>
        <div className='w-full max-w-md'>
          <Card className='shadow-xl border-0 bg-white/80 backdrop-blur-sm'>
            <CardHeader className='text-center pb-2'>
              <div className='w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4'>
                <Key className='w-8 h-8 text-white' />
              </div>
              <CardTitle className='text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent'>
                Device Activation
              </CardTitle>
              <CardDescription className='text-slate-600'>
                Welcome {user.firstName || user.username}! Enter your activation key to access the
                credential manager
              </CardDescription>
            </CardHeader>
            <CardContent className='pt-2'>
              <form onSubmit={handleActivation} className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='activationKey' className='text-sm font-medium text-slate-700'>
                    Activation Key
                  </Label>
                  <Input
                    id='activationKey'
                    type='text'
                    placeholder='Enter your activation key'
                    value={activationKey}
                    onChange={(e) => setActivationKey(e.target.value)}
                    className='h-11'
                    required
                  />
                  <p className='text-xs text-slate-500'>
                    Contact your administrator to get an activation key
                  </p>
                </div>

                {error && (
                  <Alert variant='destructive' className='border-red-200 bg-red-50'>
                    <AlertDescription className='text-red-700'>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type='submit'
                  className='w-full h-11 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 transition-all duration-200'
                  disabled={loading}
                >
                  {loading ? 'Activating Device...' : 'Activate Device'}
                </Button>
              </form>

              <div className='mt-6 text-center'>
                <p className='text-xs text-slate-500 mb-2'>
                  Need help? Contact your system administrator
                </p>
                <Link
                  href='/'
                  className='inline-flex items-center text-sm text-slate-600 hover:text-slate-900 transition-colors'
                >
                  <ArrowLeft className='w-4 h-4 mr-2' />
                  Back to Home
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
