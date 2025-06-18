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
  Download,
  User,
  Key,
  Bolt,
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

  // New states for picked credential feature
  const [pickedCredential, setPickedCredential] = useState<Credential | null>(null);
  const [picking, setPicking] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user && user.role === 'USER') {
      fetchCredentials();
    }
  }, [user, authLoading]);

  if (authLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center px-4'>
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

  // NEW FUNCTION: Pick random credential
  const pickRandomCredential = async () => {
    if (credentials.length === 0) {
      showMessage('No credentials available to pick!', 'error');
      return;
    }

    setPicking(true);

    try {
      setPickedCredential(credentials[0]);
      showMessage('Credential picked successfully!', 'success');
      deleteCredential(credentials[0]._id);
      fetchCredentials();
    } catch (error) {
      console.error('Pick credential error:', error);
      await handleApiError(error);
    } finally {
      setPicking(false);
    }
  };

  const clearPickedCredential = () => {
    setPickedCredential(null);
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

      const response = await fetch('/api/user/credentials', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
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
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6'>
      <header className='flex justify-between items-center mb-6 sm:mb-8 gap-4'>
        <div>
          <h1 className='text-xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2'>
            Credential Manager
          </h1>
          <p className='text-slate-600 text-sm sm:text-base'>
            Securely store and manage your credentials
          </p>
        </div>
        <div className='flex items-center gap-4'>
          <div className='self-start sm:self-auto'>
            <UserNav user={user} />
          </div>
        </div>
      </header>

      <div className='max-w-6xl mx-auto'>
        {message && (
          <Alert
            className={`mb-6 ${
              messageType === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
            }`}
          >
            {messageType === 'error' ? (
              <AlertCircle className='h-4 w-4 text-red-600 flex-shrink-0' />
            ) : (
              <CheckCircle className='h-4 w-4 text-green-600 flex-shrink-0' />
            )}
            <AlertDescription
              className={`${messageType === 'error' ? 'text-red-700' : 'text-green-700'} text-sm`}
            >
              {message}
              {messageType === 'error' && message.includes('revoked') && (
                <div className='mt-3 flex gap-2 flex-wrap'>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={retryAccess}
                    disabled={retryingAccess}
                    className='text-orange-700 border-orange-300 hover:bg-orange-100 text-xs sm:text-sm'
                  >
                    {retryingAccess ? (
                      <>
                        <RefreshCw className='w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin' />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className='w-3 h-3 sm:w-4 sm:h-4 mr-2' />
                        Refresh Access
                      </>
                    )}
                  </Button>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* NEW: Picked Credential Display */}
        {pickedCredential && (
          <Card className='mb-6 border-2 border-green-200 bg-green-50/50 shadow-lg'>
            <CardHeader className='pb-4'>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-xl text-green-800 flex items-center gap-2'>
                  <Download className='w-5 h-5' />
                  Selected Credential
                </CardTitle>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={clearPickedCredential}
                  className='text-green-700 border-green-300 hover:bg-green-100'
                >
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label className='text-sm font-medium text-green-700 flex items-center gap-1'>
                    <User className='w-4 h-4' />
                    Username
                  </Label>
                  <div className='flex items-center gap-2'>
                    <code className='bg-white px-3 py-2 rounded-lg text-sm font-mono flex-1 border border-green-200 break-all'>
                      {pickedCredential.username}
                    </code>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => copyToClipboard(pickedCredential.username, 'Username')}
                      className='flex-shrink-0'
                    >
                      <Copy className='w-4 h-4' />
                    </Button>
                  </div>
                </div>
                <div className='space-y-2'>
                  <Label className='text-sm font-medium text-green-700 flex items-center gap-1'>
                    <Key className='w-4 h-4' />
                    Password
                  </Label>
                  <div className='flex items-center gap-2'>
                    <code className='bg-white px-3 py-2 rounded-lg text-sm font-mono flex-1 border border-green-200 break-all'>
                      {showPasswords['picked'] ? pickedCredential.password : '••••••••'}
                    </code>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => togglePasswordVisibility('picked')}
                      className='flex-shrink-0'
                    >
                      {showPasswords['picked'] ? (
                        <EyeOff className='w-4 h-4' />
                      ) : (
                        <Eye className='w-4 h-4' />
                      )}
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => copyToClipboard(pickedCredential.password, 'Password')}
                      className='flex-shrink-0'
                    >
                      <Copy className='w-4 h-4' />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className='mb-6 shadow-md rounded-xl border border-blue-100 bg-blue-50/70 backdrop-blur-sm'>
          <CardHeader className='pb-4'>
            <CardTitle className='text-lg sm:text-xl text-blue-800 flex items-center gap-2'>
              <Bolt className='w-5 h-5' /> Quick Actions
            </CardTitle>
            <CardDescription className='text-sm text-blue-600'>
              Perform key actions here.
            </CardDescription>
          </CardHeader>
          <CardContent className='pt-0 pb-6 flex flex-col items-center justify-center'>
            <Button
              onClick={pickRandomCredential}
              disabled={picking || credentials.length === 0}
              size='lg'
              className='relative group overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 text-lg font-semibold rounded-full shadow-lg transition-all duration-300 ease-out
                   hover:from-blue-700 hover:to-purple-700 hover:scale-105 hover:shadow-xl
                   active:scale-95 active:shadow-inner
                   focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-opacity-75'
            >
              {picking ? (
                <>
                  <RefreshCw className='w-5 h-5 mr-2 animate-spin' />
                  Picking credential...
                </>
              ) : (
                <>
                  <Download className='w-5 h-5 mr-2 group-hover:animate-bounce-y' />
                  Pick Random Credential
                </>
              )}
            </Button>
            {credentials.length === 0 && (
              <p className='text-sm text-slate-600 mt-4 flex items-center justify-center gap-2'>
                <AlertCircle className='w-4 h-4 text-orange-500' />
                No credentials available to pick. Please add credentials first.
              </p>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue='add' className='space-y-6'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger
              value='add'
              className='flex items-center gap-1 sm:gap-2 text-xs sm:text-sm'
            >
              <Plus className='w-3 h-3 sm:w-4 sm:h-4' />
              <span className='hidden sm:inline'>Add Credentials</span>
              <span className='sm:hidden'>Add</span>
            </TabsTrigger>
            <TabsTrigger
              value='manage'
              className='flex items-center gap-1 sm:gap-2 text-xs sm:text-sm'
            >
              <Copy className='w-3 h-3 sm:w-4 sm:h-4' />
              <span className='hidden sm:inline'>Manage Credentials ({credentials.length})</span>
              <span className='sm:hidden'>Manage ({credentials.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value='add' className='space-y-6'>
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
              <Card className='shadow-lg border-0 bg-white/80 backdrop-blur-sm'>
                <CardHeader className='pb-4'>
                  <CardTitle className='text-lg sm:text-xl text-slate-800'>Bulk Import</CardTitle>
                  <CardDescription className='text-sm'>
                    Add multiple credentials using the format: username|password (one per line)
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='bulkInput' className='text-sm font-medium'>
                      Credentials List
                    </Label>
                    <Textarea
                      id='bulkInput'
                      placeholder='user1|password1&#10;user2|password2&#10;user3|password3'
                      value={bulkInput}
                      onChange={(e) => setBulkInput(e.target.value)}
                      rows={6}
                      className='text-sm'
                    />
                    <p className='text-xs text-slate-500'>
                      Format: username|password (one per line)
                    </p>
                  </div>
                  <Button
                    onClick={addBulkCredentials}
                    disabled={loading || !bulkInput.trim()}
                    className='w-full text-sm'
                    size='sm'
                  >
                    {loading ? 'Adding...' : 'Add Bulk Credentials'}
                  </Button>
                </CardContent>
              </Card>

              <Card className='shadow-lg border-0 bg-white/80 backdrop-blur-sm'>
                <CardHeader className='pb-4'>
                  <CardTitle className='text-lg sm:text-xl text-slate-800'>Single Entry</CardTitle>
                  <CardDescription className='text-sm'>
                    Add individual credentials one at a time
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='username' className='text-sm font-medium'>
                      Username
                    </Label>
                    <Input
                      id='username'
                      value={singleCredential.username}
                      onChange={(e) =>
                        setSingleCredential((prev) => ({ ...prev, username: e.target.value }))
                      }
                      placeholder='Enter username'
                      className='text-sm'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='password' className='text-sm font-medium'>
                      Password
                    </Label>
                    <Input
                      id='password'
                      type='password'
                      value={singleCredential.password}
                      onChange={(e) =>
                        setSingleCredential((prev) => ({ ...prev, password: e.target.value }))
                      }
                      placeholder='Enter password'
                      className='text-sm'
                    />
                  </div>
                  <Button
                    onClick={addSingleCredential}
                    disabled={
                      loading ||
                      !singleCredential.username.trim() ||
                      !singleCredential.password.trim()
                    }
                    className='w-full text-sm'
                    size='sm'
                  >
                    {loading ? 'Adding...' : 'Add Credential'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value='manage'>
            <Card className='shadow-lg border-0 bg-white/80 backdrop-blur-sm'>
              <CardHeader className='pb-4'>
                <CardTitle className='text-lg sm:text-xl text-slate-800'>
                  Stored Credentials
                </CardTitle>
                <CardDescription className='text-sm'>
                  View, copy, and manage your stored credentials
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  {credentials.map((credential) => (
                    <div
                      key={credential._id}
                      className='flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg gap-4 bg-white/50 hover:bg-white/80 transition-colors'
                    >
                      <div className='flex-1 space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4'>
                        <div className='space-y-2'>
                          <Label className='text-xs text-slate-500 font-medium'>Username</Label>
                          <div className='flex items-center gap-2'>
                            <code className='bg-slate-100 px-2 py-1 rounded text-xs sm:text-sm font-mono flex-1 break-all'>
                              {credential.username}
                            </code>
                            <Button
                              size='sm'
                              variant='ghost'
                              onClick={() => copyToClipboard(credential.username, 'Username')}
                              className='flex-shrink-0 p-1 h-8 w-8'
                            >
                              <Copy className='w-3 h-3' />
                            </Button>
                          </div>
                        </div>
                        <div className='space-y-2'>
                          <Label className='text-xs text-slate-500 font-medium'>Password</Label>
                          <div className='flex items-center gap-2'>
                            <code className='bg-slate-100 px-2 py-1 rounded text-xs sm:text-sm font-mono flex-1 break-all'>
                              {showPasswords[credential._id] ? credential.password : '••••••••'}
                            </code>
                            <Button
                              size='sm'
                              variant='ghost'
                              onClick={() => togglePasswordVisibility(credential._id)}
                              className='flex-shrink-0 p-1 h-8 w-8'
                            >
                              {showPasswords[credential._id] ? (
                                <EyeOff className='w-3 h-3' />
                              ) : (
                                <Eye className='w-3 h-3' />
                              )}
                            </Button>
                            <Button
                              size='sm'
                              variant='ghost'
                              onClick={() => copyToClipboard(credential.password, 'Password')}
                              className='flex-shrink-0 p-1 h-8 w-8'
                            >
                              <Copy className='w-3 h-3' />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className='flex items-center justify-between sm:justify-end gap-2 sm:flex-col sm:items-end'>
                        <Badge variant='outline' className='text-xs'>
                          {new Date(credential.createdAt).toLocaleDateString()}
                        </Badge>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => deleteCredential(credential._id)}
                          className='text-red-600 hover:text-red-700 hover:bg-red-50 p-1 h-8 w-8'
                        >
                          <Trash2 className='w-3 h-3' />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {credentials.length === 0 && (
                    <div className='text-center text-slate-500 py-8'>
                      <p className='text-sm sm:text-base'>
                        No credentials stored yet. Add some using the Add Credentials tab.
                      </p>
                    </div>
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
