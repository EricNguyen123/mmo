/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  AlertCircle,
  RefreshCw,
  Bug,
  CheckCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { UserNav } from '@/components/ui/user-nav';
import { useAuth } from '@/hooks/useAuth';

interface Credential {
  _id: string;
  username: string;
  password: string;
  createdAt: string;
}

export default function UserDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [bulkInput, setBulkInput] = useState('');
  const [singleCredential, setSingleCredential] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  const [retryingAccess, setRetryingAccess] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user && user.role === 'USER') {
      fetchCredentials();
    }
  }, [user, authLoading]);

  if (authLoading) {
    return (
      <div className='min-h-screen bg-slate-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-2'></div>
          <p className='text-slate-600'>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'USER') {
    router.push('/login');
    return null;
  }

  const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const retryAccess = async () => {
    setRetryingAccess(true);
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        window.location.reload();
      } else {
        showMessage('Please log out and log back in to refresh your access.', 'error');
      }
    } catch (error) {
      showMessage('Unable to refresh access. Please log out and log back in.', 'error');
    } finally {
      setRetryingAccess(false);
    }
  };

  const handleApiError = async (error: any, response?: Response) => {
    if (response) {
      const errorText = await response.text();

      try {
        const errorData = JSON.parse(errorText);

        if (response.status === 403) {
          showMessage(
            errorData.error ||
              'Your device access has been revoked or expired. Please contact your administrator or try refreshing your access.',
            'error'
          );
        } else if (response.status === 401) {
          showMessage('Session expired. Please log in again.', 'error');
          setTimeout(() => router.push('/login'), 2000);
        } else {
          showMessage(errorData.error || 'An error occurred. Please try again.', 'error');
        }
      } catch (parseError) {
        showMessage(`Server error (${response.status}): ${errorText}`, 'error');
      }
    } else {
      showMessage('Network error. Please check your connection.', 'error');
    }
  };

  const fetchCredentials = async () => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        showMessage('No access token found. Please contact your administrator.', 'error');
        return;
      }

      console.log('Fetching credentials with token:', token.substring(0, 20) + '...');

      const response = await fetch('/api/user/credentials', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Credentials response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Credentials data:', data);
        setCredentials(data.credentials || []);
        showMessage(`Loaded ${data.credentials?.length || 0} credentials`, 'success');
      } else {
        await handleApiError(null, response);
      }
    } catch (error) {
      console.error('Fetch credentials error:', error);
      await handleApiError(error);
    }
  };

  const addBulkCredentials = async () => {
    if (!bulkInput.trim()) {
      showMessage('Please enter credentials to add.', 'error');
      return;
    }

    setLoading(true);
    try {
      const lines = bulkInput.split('\n').filter((line) => line.includes('|'));
      const credentialList = lines
        .map((line) => {
          const [username, password] = line.split('|');
          return { username: username?.trim(), password: password?.trim() };
        })
        .filter((cred) => cred.username && cred.password);

      if (credentialList.length === 0) {
        showMessage('No valid credentials found. Use format: username|password', 'error');
        return;
      }

      const token = localStorage.getItem('userToken');
      if (!token) {
        showMessage('No access token found. Please contact your administrator.', 'error');
        return;
      }

      const response = await fetch('/api/user/credentials/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ credentials: credentialList }),
      });

      if (response.ok) {
        const data = await response.json();
        showMessage(`Successfully added ${data.insertedCount} credentials!`, 'success');
        setBulkInput('');
        fetchCredentials();
      } else {
        await handleApiError(null, response);
      }
    } catch (error) {
      console.error('Bulk add error:', error);
      await handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const addSingleCredential = async () => {
    if (!singleCredential.username.trim() || !singleCredential.password.trim()) {
      showMessage('Please enter both username and password.', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        showMessage('No access token found. Please contact your administrator.', 'error');
        return;
      }

      const response = await fetch('/api/user/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: singleCredential.username.trim(),
          password: singleCredential.password.trim(),
        }),
      });

      if (response.ok) {
        showMessage('Credential added successfully!', 'success');
        setSingleCredential({ username: '', password: '' });
        fetchCredentials();
      } else {
        await handleApiError(null, response);
      }
    } catch (error) {
      console.error('Single add error:', error);
      await handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    showMessage(`${type} copied to clipboard!`, 'success');
  };

  const togglePasswordVisibility = (credentialId: string) => {
    setShowPasswords((prev) => ({
      ...prev,
      [credentialId]: !prev[credentialId],
    }));
  };

  const deleteCredential = async (credentialId: string) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        showMessage('No access token found. Please contact your administrator.', 'error');
        return;
      }

      const response = await fetch(`/api/user/credentials/${credentialId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        showMessage('Credential deleted successfully!', 'success');
        fetchCredentials();
      } else {
        await handleApiError(null, response);
      }
    } catch (error) {
      console.error('Delete error:', error);
      await handleApiError(error);
    }
  };

  return (
    <div className='min-h-screen bg-slate-50 p-6'>
      <header className='flex justify-between items-center mb-8'>
        <div>
          <h1 className='text-3xl font-bold text-slate-900 mb-2'>Credential Manager</h1>
          <p className='text-slate-600'>Securely store and manage your credentials</p>
        </div>
        <UserNav user={user} />
      </header>
      <div className='max-w-6xl mx-auto'>
        {message && (
          <Alert
            className={`mb-6 ${
              messageType === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
            }`}
          >
            {messageType === 'error' ? (
              <AlertCircle className='h-4 w-4 text-red-600' />
            ) : (
              <CheckCircle className='h-4 w-4 text-green-600' />
            )}
            <AlertDescription
              className={messageType === 'error' ? 'text-red-700' : 'text-green-700'}
            >
              {message}
              {messageType === 'error' && message.includes('revoked') && (
                <div className='mt-3 flex gap-2 flex-wrap'>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={retryAccess}
                    disabled={retryingAccess}
                    className='text-orange-700 border-orange-300 hover:bg-orange-100'
                  >
                    {retryingAccess ? (
                      <>
                        <RefreshCw className='w-4 h-4 mr-2 animate-spin' />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className='w-4 h-4 mr-2' />
                        Refresh Access
                      </>
                    )}
                  </Button>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue='add' className='space-y-6'>
          <TabsList>
            <TabsTrigger value='add' className='flex items-center gap-2'>
              <Plus className='w-4 h-4' />
              Add Credentials
            </TabsTrigger>
            <TabsTrigger value='manage' className='flex items-center gap-2'>
              <Copy className='w-4 h-4' />
              Manage Credentials ({credentials.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value='add' className='space-y-6'>
            <div className='grid md:grid-cols-2 gap-6'>
              <Card>
                <CardHeader>
                  <CardTitle>Bulk Import</CardTitle>
                  <CardDescription>
                    Add multiple credentials using the format: username|password (one per line)
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='bulkInput'>Credentials List</Label>
                    <Textarea
                      id='bulkInput'
                      placeholder='user1|password1&#10;user2|password2&#10;user3|password3'
                      value={bulkInput}
                      onChange={(e) => setBulkInput(e.target.value)}
                      rows={8}
                    />
                    <p className='text-xs text-slate-500'>
                      Format: username|password (one per line)
                    </p>
                  </div>
                  <Button
                    onClick={addBulkCredentials}
                    disabled={loading || !bulkInput.trim()}
                    className='w-full'
                  >
                    {loading ? 'Adding...' : 'Add Bulk Credentials'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Single Entry</CardTitle>
                  <CardDescription>Add individual credentials one at a time</CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='username'>Username</Label>
                    <Input
                      id='username'
                      value={singleCredential.username}
                      onChange={(e) =>
                        setSingleCredential((prev) => ({ ...prev, username: e.target.value }))
                      }
                      placeholder='Enter username'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='password'>Password</Label>
                    <Input
                      id='password'
                      type='password'
                      value={singleCredential.password}
                      onChange={(e) =>
                        setSingleCredential((prev) => ({ ...prev, password: e.target.value }))
                      }
                      placeholder='Enter password'
                    />
                  </div>
                  <Button
                    onClick={addSingleCredential}
                    disabled={
                      loading ||
                      !singleCredential.username.trim() ||
                      !singleCredential.password.trim()
                    }
                    className='w-full'
                  >
                    {loading ? 'Adding...' : 'Add Credential'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value='manage'>
            <Card>
              <CardHeader>
                <CardTitle>Stored Credentials</CardTitle>
                <CardDescription>View, copy, and manage your stored credentials</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  {credentials.map((credential) => (
                    <div
                      key={credential._id}
                      className='flex items-center justify-between p-4 border rounded-lg'
                    >
                      <div className='flex-1 grid grid-cols-2 gap-4'>
                        <div>
                          <Label className='text-xs text-slate-500'>Username</Label>
                          <div className='flex items-center gap-2'>
                            <code className='bg-slate-100 px-2 py-1 rounded text-sm font-mono'>
                              {credential.username}
                            </code>
                            <Button
                              size='sm'
                              variant='ghost'
                              onClick={() => copyToClipboard(credential.username, 'Username')}
                            >
                              <Copy className='w-4 h-4' />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label className='text-xs text-slate-500'>Password</Label>
                          <div className='flex items-center gap-2'>
                            <code className='bg-slate-100 px-2 py-1 rounded text-sm font-mono'>
                              {showPasswords[credential._id] ? credential.password : '••••••••'}
                            </code>
                            <Button
                              size='sm'
                              variant='ghost'
                              onClick={() => togglePasswordVisibility(credential._id)}
                            >
                              {showPasswords[credential._id] ? (
                                <EyeOff className='w-4 h-4' />
                              ) : (
                                <Eye className='w-4 h-4' />
                              )}
                            </Button>
                            <Button
                              size='sm'
                              variant='ghost'
                              onClick={() => copyToClipboard(credential.password, 'Password')}
                            >
                              <Copy className='w-4 h-4' />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Badge variant='outline'>
                          {new Date(credential.createdAt).toLocaleDateString()}
                        </Badge>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => deleteCredential(credential._id)}
                        >
                          <Trash2 className='w-4 h-4' />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {credentials.length === 0 && (
                    <p className='text-center text-slate-500 py-8'>
                      No credentials stored yet. Add some using the Add Credentials tab.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
