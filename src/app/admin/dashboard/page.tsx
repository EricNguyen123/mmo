/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Key,
  Settings,
  Plus,
  Copy,
  Trash2,
  Eye,
  AlertTriangle,
  Users,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import { UserNav } from '@/components/ui/user-nav';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

interface ActivationKey {
  _id: string;
  key: string;
  deviceLimit: number;
  usedDevices: number;
  createdAt: string;
  isActive: boolean;
  devices: Array<{
    deviceId: string;
    userId: string;
    registeredAt: string;
  }>;
}

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalKeys: number;
  activeKeys: number;
  totalAssignments: number;
  activeAssignments: number;
}

export default function AdminDashboard() {
  const [keys, setKeys] = useState<ActivationKey[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [deviceLimit, setDeviceLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<ActivationKey | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [keyToView, setKeyToView] = useState<ActivationKey | null>(null);

  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchKeys();
      fetchStats();
    }
  }, [user]);

  const fetchKeys = async () => {
    try {
      const response = await fetch('/api/admin/keys');
      if (response.ok) {
        const data = await response.json();
        setKeys(data.keys);
      }
    } catch (error) {
      setMessage('Failed to fetch keys');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/statistics');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats.overview);
      }
    } catch (error) {}
  };

  const generateKey = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceLimit }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(`Activation key generated successfully: ${data.key.key}`);
        fetchKeys();
        fetchStats();
      } else {
        const errorData = await response.json();
        setMessage(errorData.error || 'Failed to generate key');
      }
    } catch (error) {
      setMessage('Error generating key');
    } finally {
      setLoading(false);
    }
  };

  const deleteKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/admin/keys/${keyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage('Activation key deleted successfully!');
        fetchKeys();
        fetchStats();
        setDeleteDialogOpen(false);
        setKeyToDelete(null);
      } else {
        const errorData = await response.json();
        setMessage(errorData.error || 'Failed to delete key');
      }
    } catch (error) {
      setMessage('Error deleting key');
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setMessage('Key copied to clipboard!');
  };

  const toggleKey = async (keyId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/keys/${keyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        fetchKeys();
        fetchStats();
        setMessage('Key status updated!');
      }
    } catch (error) {
      setMessage('Failed to update key');
    }
  };

  const openDeleteDialog = (key: ActivationKey) => {
    setKeyToDelete(key);
    setDeleteDialogOpen(true);
  };

  const openViewDialog = (key: ActivationKey) => {
    setKeyToView(key);
    setViewDialogOpen(true);
  };

  const revokeDeviceAccess = async (keyId: string, deviceId: string) => {
    try {
      const response = await fetch(`/api/admin/keys/${keyId}/revoke-device`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      });

      if (response.ok) {
        setMessage('Device access revoked successfully!');
        fetchKeys();
      } else {
        const errorData = await response.json();
        setMessage(errorData.error || 'Failed to revoke device access');
      }
    } catch (error) {
      setMessage('Error revoking device access');
    }
  };

  if (authLoading) {
    return (
      <div className='min-h-screen bg-slate-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2'></div>
          <p className='text-slate-600'>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className='min-h-screen bg-slate-50 flex items-center justify-center'>
        <div className='text-center'>
          <p className='text-slate-600'>Access denied. Admin privileges required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-slate-50 p-6'>
      <header className='flex justify-between items-center mb-8'>
        <div>
          <h1 className='text-3xl font-bold text-slate-900 mb-2'>Admin Dashboard</h1>
          <p className='text-slate-600'>Manage activation keys and system settings</p>
        </div>
        <UserNav user={user} />
      </header>

      <div className='max-w-7xl mx-auto space-y-6'>
        {/* Statistics Overview */}
        {stats && (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
            <Card>
              <CardContent className='p-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm text-slate-600'>Total Users</p>
                    <p className='text-2xl font-bold text-slate-900'>{stats.totalUsers}</p>
                  </div>
                  <Users className='w-8 h-8 text-blue-600' />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='p-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm text-slate-600'>Active Keys</p>
                    <p className='text-2xl font-bold text-slate-900'>{stats.activeKeys}</p>
                  </div>
                  <Key className='w-8 h-8 text-green-600' />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='p-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm text-slate-600'>Active Assignments</p>
                    <p className='text-2xl font-bold text-slate-900'>{stats.activeAssignments}</p>
                  </div>
                  <BarChart3 className='w-8 h-8 text-purple-600' />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='p-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm text-slate-600'>Total Assignments</p>
                    <p className='text-2xl font-bold text-slate-900'>{stats.totalAssignments}</p>
                  </div>
                  <Users className='w-8 h-8 text-emerald-600' />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
          <Link href='/admin/user-management'>
            <Card className='hover:shadow-lg transition-shadow cursor-pointer'>
              <CardContent className='p-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <h3 className='font-semibold text-slate-900'>User & Key Management</h3>
                    <p className='text-sm text-slate-600'>Manage user-key relationships</p>
                  </div>
                  <ArrowRight className='w-5 h-5 text-slate-400' />
                </div>
              </CardContent>
            </Card>
          </Link>
          <Card className='hover:shadow-lg transition-shadow cursor-pointer'>
            <CardContent className='p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <h3 className='font-semibold text-slate-900'>System Analytics</h3>
                  <p className='text-sm text-slate-600'>View detailed reports</p>
                </div>
                <ArrowRight className='w-5 h-5 text-slate-400' />
              </div>
            </CardContent>
          </Card>
          <Card className='hover:shadow-lg transition-shadow cursor-pointer'>
            <CardContent className='p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <h3 className='font-semibold text-slate-900'>Audit Logs</h3>
                  <p className='text-sm text-slate-600'>Track system activity</p>
                </div>
                <ArrowRight className='w-5 h-5 text-slate-400' />
              </div>
            </CardContent>
          </Card>
        </div>

        {message && (
          <Alert className='mb-6'>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue='keys' className='space-y-6'>
          <TabsList>
            <TabsTrigger value='keys' className='flex items-center gap-2'>
              <Key className='w-4 h-4' />
              Activation Keys
            </TabsTrigger>
            <TabsTrigger value='settings' className='flex items-center gap-2'>
              <Settings className='w-4 h-4' />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value='keys' className='space-y-6'>
            {/* Generate New Key Card */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Plus className='w-5 h-5' />
                  Generate New Activation Key
                </CardTitle>
                <CardDescription>
                  Create a new activation key with specified device limit
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex items-end gap-4'>
                  <div className='flex-1 max-w-xs'>
                    <Label htmlFor='deviceLimit'>Device Limit</Label>
                    <Input
                      id='deviceLimit'
                      type='number'
                      min='1'
                      max='100'
                      value={deviceLimit}
                      onChange={(e) => setDeviceLimit(Number.parseInt(e.target.value))}
                    />
                  </div>
                  <Button onClick={generateKey} disabled={loading} className='px-8'>
                    {loading ? 'Generating...' : 'Generate Key'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Keys Management Table */}
            <Card>
              <CardHeader>
                <CardTitle>Activation Keys Management</CardTitle>
                <CardDescription>
                  View, manage, and delete activation keys. Total keys: {keys.length}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {keys.length > 0 ? (
                  <div className='overflow-x-auto'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Activation Key</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Device Usage</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {keys.map((key) => (
                          <TableRow key={key._id}>
                            <TableCell>
                              <div className='flex items-center gap-2'>
                                <code className='bg-slate-100 px-2 py-1 rounded text-sm font-mono max-w-[200px] truncate'>
                                  {key.key}
                                </code>
                                <Button size='sm' variant='ghost' onClick={() => copyKey(key.key)}>
                                  <Copy className='w-4 h-4' />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={key.isActive ? 'default' : 'secondary'}>
                                {key.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className='flex items-center gap-2'>
                                <span className='text-sm'>
                                  {key.usedDevices}/{key.deviceLimit}
                                </span>
                                {key.usedDevices >= key.deviceLimit && (
                                  <Badge variant='destructive' className='text-xs'>
                                    Full
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className='text-sm text-slate-600'>
                                {new Date(key.createdAt).toLocaleDateString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className='flex items-center gap-2'>
                                <Button
                                  size='sm'
                                  variant='outline'
                                  onClick={() => openViewDialog(key)}
                                >
                                  <Eye className='w-4 h-4' />
                                </Button>
                                <Button
                                  size='sm'
                                  variant='outline'
                                  onClick={() => toggleKey(key._id, key.isActive)}
                                >
                                  {key.isActive ? 'Deactivate' : 'Activate'}
                                </Button>
                                <Button
                                  size='sm'
                                  variant='destructive'
                                  onClick={() => openDeleteDialog(key)}
                                >
                                  <Trash2 className='w-4 h-4' />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className='text-center py-12'>
                    <Key className='w-12 h-12 text-slate-400 mx-auto mb-4' />
                    <p className='text-slate-500 text-lg mb-2'>No activation keys generated yet</p>
                    <p className='text-slate-400 text-sm'>
                      Generate your first activation key to get started
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='settings'>
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>Configure global system parameters</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  <div>
                    <Label>Default Device Limit</Label>
                    <Input
                      type='number'
                      value={deviceLimit}
                      onChange={(e) => setDeviceLimit(Number.parseInt(e.target.value))}
                      className='max-w-xs'
                    />
                  </div>
                  <Button>Save Settings</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2'>
                <AlertTriangle className='w-5 h-5 text-red-500' />
                Delete Activation Key
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this activation key? This action cannot be undone.
                {keyToDelete && keyToDelete.usedDevices > 0 && (
                  <div className='mt-2 p-2 bg-red-50 border border-red-200 rounded'>
                    <p className='text-red-700 text-sm font-medium'>
                      Warning: This key is currently being used by {keyToDelete.usedDevices}{' '}
                      device(s). Deleting it will prevent those devices from accessing the system.
                    </p>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            {keyToDelete && (
              <div className='py-4'>
                <div className='bg-slate-50 p-3 rounded'>
                  <p className='text-sm text-slate-600'>Key to delete:</p>
                  <code className='text-sm font-mono'>{keyToDelete.key}</code>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant='outline' onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant='destructive'
                onClick={() => keyToDelete && deleteKey(keyToDelete._id)}
              >
                Delete Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Key Details Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className='max-w-2xl'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2'>
                <Eye className='w-5 h-5' />
                Activation Key Details
              </DialogTitle>
            </DialogHeader>
            {keyToView && (
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <Label className='text-sm font-medium text-slate-600'>Activation Key</Label>
                    <div className='flex items-center gap-2 mt-1'>
                      <code className='bg-slate-100 px-2 py-1 rounded text-sm font-mono'>
                        {keyToView.key}
                      </code>
                      <Button size='sm' variant='ghost' onClick={() => copyKey(keyToView.key)}>
                        <Copy className='w-4 h-4' />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className='text-sm font-medium text-slate-600'>Status</Label>
                    <div className='mt-1'>
                      <Badge variant={keyToView.isActive ? 'default' : 'secondary'}>
                        {keyToView.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className='text-sm font-medium text-slate-600'>Device Usage</Label>
                    <p className='mt-1 text-sm'>
                      {keyToView.usedDevices} / {keyToView.deviceLimit} devices
                    </p>
                  </div>
                  <div>
                    <Label className='text-sm font-medium text-slate-600'>Created</Label>
                    <p className='mt-1 text-sm'>{new Date(keyToView.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                {keyToView.devices && keyToView.devices.length > 0 && (
                  <div>
                    <Label className='text-sm font-medium text-slate-600'>Registered Devices</Label>
                    <div className='mt-2 space-y-2'>
                      {keyToView.devices.map((device, index) => (
                        <div key={index} className='bg-slate-50 p-3 rounded border'>
                          <div className='grid grid-cols-2 gap-2 text-sm'>
                            <div>
                              <span className='font-medium'>Device ID:</span>
                              <code className='ml-2 text-xs'>{device.deviceId}</code>
                            </div>
                            <div>
                              <span className='font-medium'>User ID:</span>
                              <code className='ml-2 text-xs'>{device.userId}</code>
                            </div>
                            <div className='col-span-2'>
                              <span className='font-medium'>Registered:</span>
                              <span className='ml-2'>
                                {new Date(device.registeredAt).toLocaleString()}
                              </span>
                            </div>
                            <Button
                              size='sm'
                              variant='destructive'
                              onClick={() => revokeDeviceAccess(keyToView._id, device.deviceId)}
                              className='mt-2'
                            >
                              Revoke Access
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!keyToView.devices || keyToView.devices.length === 0) && (
                  <div className='text-center py-4 text-slate-500'>
                    <p>No devices registered with this key yet</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant='outline' onClick={() => setViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
