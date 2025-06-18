'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import { UserNav } from '@/components/ui/user-nav';
import { useAuth } from '@/hooks/useAuth';

export default function NoAccess() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Redirect if user is not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleRetry = () => {
    // Refresh the page to retry auto-activation
    window.location.reload();
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
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-slate-100'>
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
              <div className='w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4'>
                <AlertTriangle className='w-8 h-8 text-white' />
              </div>
              <CardTitle className='text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent'>
                Access Not Available
              </CardTitle>
              <CardDescription className='text-slate-600'>
                Hello {user.firstName || user.username}! You don&#39;t have access to the credential
                manager yet.
              </CardDescription>
            </CardHeader>
            <CardContent className='pt-2'>
              <Alert className='border-amber-200 bg-amber-50 mb-6'>
                <AlertTriangle className='h-4 w-4 text-amber-600' />
                <AlertDescription className='text-amber-800'>
                  <strong>No Active Key Assignment</strong>
                  <br />
                  You need an administrator to assign you an activation key before you can access
                  the credential manager.
                </AlertDescription>
              </Alert>

              <div className='space-y-4'>
                <div className='text-sm text-slate-600 space-y-2'>
                  <p>
                    <strong>What you need:</strong>
                  </p>
                  <ul className='list-disc list-inside space-y-1 ml-2'>
                    <li>An activation key assigned to your account</li>
                    <li>The key must be active and not expired</li>
                    <li>Available device slots on the key</li>
                  </ul>
                </div>

                <div className='flex flex-col gap-3'>
                  <Button
                    onClick={handleRetry}
                    className='w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200'
                  >
                    <RefreshCw className='w-4 h-4 mr-2' />
                    Retry Access
                  </Button>

                  <Button
                    variant='outline'
                    onClick={() => router.push('/profile')}
                    className='w-full h-11'
                  >
                    View Profile
                  </Button>
                </div>
              </div>

              <div className='mt-6 text-center'>
                <p className='text-xs text-slate-500 mb-2'>
                  Contact your system administrator to get an activation key assigned
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
