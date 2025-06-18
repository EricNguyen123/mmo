'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Key, Users, Lock, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center'>
        <div className='text-center'>
          <Shield className='w-8 h-8 text-blue-600 mx-auto mb-2 animate-spin' />
          <p className='text-slate-600'>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100'>
      {/* Header */}
      <header className='container mx-auto px-4 py-6'>
        <div className='flex justify-between items-center'>
          <div className='flex items-center gap-2'>
            <Shield className='w-8 h-8 text-blue-600' />
            <span className='text-xl font-bold text-slate-900'>SecureVault Pro</span>
          </div>
          <div className='flex items-center gap-4'>
            {user ? (
              <>
                <span className='text-sm text-slate-600'>
                  Welcome, {user.firstName || user.username}!
                </span>
                {user.role === 'ADMIN' ? (
                  <Button asChild>
                    <Link href='/admin/dashboard'>Admin Dashboard</Link>
                  </Button>
                ) : (
                  <Button asChild>
                    <Link href='/user/dashboard'>Dashboard</Link>
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button variant='ghost' asChild>
                  <Link href='/login'>Login</Link>
                </Button>
                <Button asChild>
                  <Link href='/register'>Register</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className='container mx-auto px-4 py-16'>
        <div className='text-center max-w-4xl mx-auto'>
          <div className='w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-8'>
            <Lock className='w-10 h-10 text-white' />
          </div>
          <h1 className='text-5xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-slate-900 bg-clip-text text-transparent mb-6'>
            Secure Credential Management
          </h1>
          <p className='text-xl text-slate-600 mb-8 leading-relaxed'>
            Enterprise-grade password and credential management with automatic device activation,
            multi-user support, and comprehensive admin controls.
          </p>
          {!user && (
            <div className='flex flex-col sm:flex-row gap-4 justify-center'>
              <Button size='lg' asChild className='text-lg px-8 py-6'>
                <Link href='/register'>
                  Get Started <ArrowRight className='ml-2 w-5 h-5' />
                </Link>
              </Button>
              <Button size='lg' variant='outline' asChild className='text-lg px-8 py-6'>
                <Link href='/login'>Sign In</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className='container mx-auto px-4 py-16'>
        <div className='grid md:grid-cols-3 gap-8'>
          <Card className='border-0 shadow-lg bg-white/80 backdrop-blur-sm'>
            <CardHeader className='text-center pb-2'>
              <div className='w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4'>
                <CheckCircle className='w-6 h-6 text-white' />
              </div>
              <CardTitle className='text-xl font-bold text-slate-900'>
                Auto Device Activation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className='text-slate-600 text-center'>
                Seamless device activation upon login. No manual activation steps required - just
                log in and start using your credentials.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className='border-0 shadow-lg bg-white/80 backdrop-blur-sm'>
            <CardHeader className='text-center pb-2'>
              <div className='w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4'>
                <Key className='w-6 h-6 text-white' />
              </div>
              <CardTitle className='text-xl font-bold text-slate-900'>
                Smart Key Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className='text-slate-600 text-center'>
                Advanced activation key system with device limits, expiration dates, and user
                assignments for maximum security.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className='border-0 shadow-lg bg-white/80 backdrop-blur-sm'>
            <CardHeader className='text-center pb-2'>
              <div className='w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4'>
                <Users className='w-6 h-6 text-white' />
              </div>
              <CardTitle className='text-xl font-bold text-slate-900'>Multi-User Support</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className='text-slate-600 text-center'>
                Comprehensive user management with role-based access control, assignment tracking,
                and detailed audit logs.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className='container mx-auto px-4 py-16'>
        <div className='text-center mb-12'>
          <h2 className='text-3xl font-bold text-slate-900 mb-4'>How It Works</h2>
          <p className='text-lg text-slate-600'>Simple, secure, and automatic</p>
        </div>
        <div className='grid md:grid-cols-3 gap-8'>
          <div className='text-center'>
            <div className='w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4'>
              <span className='text-2xl font-bold text-white'>1</span>
            </div>
            <h3 className='text-xl font-semibold text-slate-900 mb-2'>Register & Login</h3>
            <p className='text-slate-600'>Create your account and log in to the system</p>
          </div>
          <div className='text-center'>
            <div className='w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4'>
              <span className='text-2xl font-bold text-white'>2</span>
            </div>
            <h3 className='text-xl font-semibold text-slate-900 mb-2'>Auto Activation</h3>
            <p className='text-slate-600'>
              Your device is automatically activated if you have assigned keys
            </p>
          </div>
          <div className='text-center'>
            <div className='w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4'>
              <span className='text-2xl font-bold text-white'>3</span>
            </div>
            <h3 className='text-xl font-semibold text-slate-900 mb-2'>Manage Credentials</h3>
            <p className='text-slate-600'>
              Securely store and manage your passwords and credentials
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className='bg-slate-900 text-white py-12'>
        <div className='container mx-auto px-4'>
          <div className='flex flex-col md:flex-row justify-between items-center'>
            <div className='flex items-center gap-2 mb-4 md:mb-0'>
              <Shield className='w-6 h-6 text-blue-400' />
              <span className='text-lg font-bold'>SecureVault Pro</span>
            </div>
            <div className='text-sm text-slate-400'>
              © 2024 SecureVault Pro. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
