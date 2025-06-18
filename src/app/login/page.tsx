/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import type React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Eye, EyeOff, ArrowLeft, Users } from 'lucide-react';

export default function LoginPage() {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Hàm tạo hoặc lấy deviceId từ localStorage
  const getOrCreateDeviceId = () => {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const deviceId = getOrCreateDeviceId();
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credentials, deviceId }),
      });
      const data = await response.json();
      console.log(data);

      if (response.ok) {
        // Lưu authToken vào localStorage
        localStorage.setItem('authToken', data.token);

        // Lưu deviceId được trả về từ server
        if (data.deviceId) {
          localStorage.setItem('deviceId', data.deviceId);
        }

        // Chuyển hướng dựa trên vai trò người dùng và trạng thái kích hoạt thiết bị
        if (data.user.role === 'ADMIN') {
          router.push('/admin/dashboard');
        } else if (data.user.role === 'USER') {
          if (data.isDeviceActivated) {
            localStorage.setItem('userToken', data.token);
            router.push('/user/dashboard');
          } else {
            router.push('/user/activate');
          }
        }
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4'>
      <div className='w-full max-w-md'>
        {/* Back to Home */}
        <div className='mb-6'>
          <Link
            href='/'
            className='inline-flex items-center text-sm text-slate-600 hover:text-slate-900 transition-colors'
          >
            <ArrowLeft className='w-4 h-4 mr-2' />
            Back to Home
          </Link>
        </div>

        <Card className='shadow-xl border-0 bg-white/80 backdrop-blur-sm'>
          <CardHeader className='text-center pb-2'>
            <div className='w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4'>
              <Shield className='w-8 h-8 text-white' />
            </div>
            <CardTitle className='text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent'>
              Welcome Back
            </CardTitle>
            <CardDescription className='text-slate-600'>
              Sign in to access SecureVault Pro
            </CardDescription>
          </CardHeader>

          <CardContent className='pt-2'>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='username' className='text-sm font-medium text-slate-700'>
                  Username or Email
                </Label>
                <Input
                  id='username'
                  type='text'
                  placeholder='Enter your username or email'
                  value={credentials.username}
                  onChange={(e) =>
                    setCredentials((prev) => ({ ...prev, username: e.target.value }))
                  }
                  className='h-11'
                  required
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='password' className='text-sm font-medium text-slate-700'>
                  Password
                </Label>
                <div className='relative'>
                  <Input
                    id='password'
                    type={showPassword ? 'text' : 'password'}
                    placeholder='Enter your password'
                    value={credentials.password}
                    onChange={(e) =>
                      setCredentials((prev) => ({ ...prev, password: e.target.value }))
                    }
                    className='h-11 pr-10'
                    required
                  />
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='absolute right-0 top-0 h-11 px-3 hover:bg-transparent'
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant='destructive' className='border-red-200 bg-red-50'>
                  <AlertDescription className='text-red-700'>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type='submit'
                className='w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200'
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className='mt-6 text-center space-y-4'>
              <div className='relative'>
                <div className='absolute inset-0 flex items-center'>
                  <span className='w-full border-t border-slate-200' />
                </div>
                <div className='relative flex justify-center text-xs uppercase'>
                  <span className='bg-white px-2 text-slate-500'>Or</span>
                </div>
              </div>

              <Link href='/register' className='block'>
                <Button
                  variant='outline'
                  className='w-full h-11 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300'
                >
                  <Users className='w-4 h-4 mr-2' />
                  Create New Account
                </Button>
              </Link>
            </div>

            <div className='mt-6 text-center'>
              <p className='text-xs text-slate-500'>
                By signing in, you agree to our{' '}
                <Link href='/terms' className='text-blue-600 hover:underline'>
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href='/privacy' className='text-blue-600 hover:underline'>
                  Privacy Policy
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
