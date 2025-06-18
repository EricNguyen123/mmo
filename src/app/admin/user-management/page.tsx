/* eslint-disable @typescript-eslint/no-explicit-any */
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Users,
  Key,
  Plus,
  Search,
  Eye,
  Calendar,
  Building,
  CheckCircle,
  Clock,
  XCircle,
  ArrowLeft,
  BarChart3,
  UserCheck,
  KeyRound,
} from 'lucide-react';
import { UserNav } from '@/components/ui/user-nav';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

interface UserWithKeys {
  _id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  createdAt: string;
  assignedKeys: Array<{
    keyId: string;
    key: string;
    assignedAt: string;
    status: string;
    expiresAt?: string;
    deviceLimit: number;
    usedDevices: number;
    isActive: boolean;
    notes?: string;
    metadata?: any;
  }>;
  totalKeys: number;
  activeKeys: number;
}

interface KeyWithUser {
  _id: string;
  key: string;
  deviceLimit: number;
  usedDevices: number;
  isActive: boolean;
  createdAt: string;
  isAssigned: boolean;
  assignedUser?: {
    userId: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    assignedAt: string;
    status: string;
    expiresAt?: string;
    notes?: string;
    metadata?: any;
  };
}

interface Statistics {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalKeys: number;
    activeKeys: number;
    assignedKeys: number;
    unassignedKeys: number;
    totalAssignments: number;
    activeAssignments: number;
    expiredAssignments: number;
    revokedAssignments: number;
  };
  departmentStats: Array<{ department: string; count: number }>;
  recentAssignments: Array<any>;
  utilizationRate: number;
  userEngagement: number;
}

export default function UserManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<UserWithKeys[]>([]);
  const [keys, setKeys] = useState<KeyWithUser[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [availableKeys, setAvailableKeys] = useState<any[]>([]); // Only unassigned keys
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // Assignment dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    userId: '',
    keyId: '',
    expiresAt: '',
    notes: '',
    department: '',
    project: '',
    purpose: '',
    priority: 'MEDIUM',
  });

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchData();
      fetchStatistics();
      fetchAllUsers();
      fetchAvailableKeys();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        view: activeTab,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && statusFilter !== 'all' && { status: statusFilter }),
        ...(departmentFilter && departmentFilter !== 'all' && { department: departmentFilter }),
      });

      const response = await fetch(`/api/admin/user-key-assignments?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (activeTab === 'users') {
          setUsers(data.users);
        } else {
          setKeys(data.keys);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setMessage('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/admin/statistics');
      if (response.ok) {
        const data = await response.json();
        setStatistics(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchAvailableKeys = async () => {
    try {
      const response = await fetch('/api/admin/keys');
      if (response.ok) {
        const data = await response.json();
        // Filter out keys that are already assigned
        const assignedKeyIds = new Set();

        // Get all assigned key IDs
        const assignmentsResponse = await fetch('/api/admin/user-key-assignments?view=keys');
        if (assignmentsResponse.ok) {
          const assignmentsData = await assignmentsResponse.json();
          assignmentsData.keys.forEach((key: KeyWithUser) => {
            if (key.isAssigned) {
              assignedKeyIds.add(key._id);
            }
          });
        }

        // Filter out assigned keys
        const unassignedKeys = data.keys.filter((key: any) => !assignedKeyIds.has(key._id));
        setAvailableKeys(unassignedKeys);
      }
    } catch (error) {
      console.error('Failed to fetch available keys:', error);
    }
  };

  const handleAssignKey = async () => {
    if (!assignmentForm.userId || !assignmentForm.keyId) {
      setMessage('Please select both user and key');
      return;
    }

    try {
      const response = await fetch('/api/admin/user-key-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: assignmentForm.userId,
          keyId: assignmentForm.keyId,
          expiresAt: assignmentForm.expiresAt || null,
          notes: assignmentForm.notes,
          metadata: {
            department: assignmentForm.department,
            project: assignmentForm.project,
            purpose: assignmentForm.purpose,
            priority: assignmentForm.priority,
          },
        }),
      });

      if (response.ok) {
        setMessage('Key assigned successfully!');
        setAssignDialogOpen(false);
        setAssignmentForm({
          userId: '',
          keyId: '',
          expiresAt: '',
          notes: '',
          department: '',
          project: '',
          purpose: '',
          priority: 'MEDIUM',
        });
        fetchData();
        fetchStatistics();
        fetchAvailableKeys(); // Refresh available keys
      } else {
        const data = await response.json();
        setMessage(data.error || 'Failed to assign key');
      }
    } catch (error) {
      setMessage('Error assigning key');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      ACTIVE: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      EXPIRED: { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
      REVOKED: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' },
    };
    const config = variants[status as keyof typeof variants] || variants.ACTIVE;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className='flex items-center gap-1'>
        <Icon className='w-3 h-3' />
        {status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      HIGH: 'bg-red-100 text-red-700 border-red-200',
      MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      LOW: 'bg-green-100 text-green-700 border-green-200',
    };
    return (
      <Badge variant='outline' className={colors[priority as keyof typeof colors] || colors.MEDIUM}>
        {priority}
      </Badge>
    );
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, searchTerm, statusFilter, departmentFilter]);

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
        <div className='flex flex-col items-start gap-4'>
          <Link
            href='/admin/dashboard'
            className='inline-flex items-center text-sm text-slate-600 hover:text-slate-900 transition-colors'
          >
            <ArrowLeft className='w-4 h-4 mr-2' />
            Back to Dashboard
          </Link>
          <div>
            <h1 className='text-3xl font-bold text-slate-900 mb-2'>User & Key Management</h1>
            <p className='text-slate-600'>Manage user-key assignments (one key per user)</p>
          </div>
        </div>
        <UserNav user={user} />
      </header>

      <div className='max-w-7xl mx-auto space-y-6'>
        {message && (
          <Alert className='mb-6'>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {/* Statistics Overview */}
        {statistics && (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
            <Card>
              <CardContent className='p-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm text-slate-600'>Total Users</p>
                    <p className='text-2xl font-bold text-slate-900'>
                      {statistics.overview.totalUsers}
                    </p>
                  </div>
                  <Users className='w-8 h-8 text-blue-600' />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='p-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm text-slate-600'>Assigned Keys</p>
                    <p className='text-2xl font-bold text-slate-900'>
                      {statistics.overview.assignedKeys}
                    </p>
                  </div>
                  <UserCheck className='w-8 h-8 text-green-600' />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='p-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm text-slate-600'>Available Keys</p>
                    <p className='text-2xl font-bold text-slate-900'>
                      {statistics.overview.unassignedKeys}
                    </p>
                  </div>
                  <KeyRound className='w-8 h-8 text-orange-600' />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='p-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm text-slate-600'>Utilization Rate</p>
                    <p className='text-2xl font-bold text-slate-900'>
                      {statistics.utilizationRate}%
                    </p>
                  </div>
                  <BarChart3 className='w-8 h-8 text-purple-600' />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-6'>
          <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
            <TabsList>
              <TabsTrigger value='users' className='flex items-center gap-2'>
                <Users className='w-4 h-4' />
                Users View
              </TabsTrigger>
              <TabsTrigger value='keys' className='flex items-center gap-2'>
                <Key className='w-4 h-4' />
                Keys View
              </TabsTrigger>
              <TabsTrigger value='statistics' className='flex items-center gap-2'>
                <BarChart3 className='w-4 h-4' />
                Analytics
              </TabsTrigger>
            </TabsList>

            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button className='flex items-center gap-2' disabled={availableKeys.length === 0}>
                  <Plus className='w-4 h-4' />
                  Assign Key to User
                </Button>
              </DialogTrigger>
              <DialogContent className='max-w-md'>
                <DialogHeader>
                  <DialogTitle>Assign Key to User</DialogTitle>
                  <DialogDescription>
                    Assign an available key to a user. Each key can only be assigned to one user.
                  </DialogDescription>
                </DialogHeader>
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <Label>User</Label>
                    <Select
                      value={assignmentForm.userId}
                      onValueChange={(value) =>
                        setAssignmentForm((prev) => ({ ...prev, userId: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Select a user' />
                      </SelectTrigger>
                      <SelectContent>
                        {allUsers.map((user) => (
                          <SelectItem key={user._id} value={user._id}>
                            {user.firstName && user.lastName
                              ? `${user.firstName} ${user.lastName}`
                              : user.username}{' '}
                            ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-2'>
                    <Label>Available Activation Key</Label>
                    <Select
                      value={assignmentForm.keyId}
                      onValueChange={(value) =>
                        setAssignmentForm((prev) => ({ ...prev, keyId: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Select an available key' />
                      </SelectTrigger>
                      <SelectContent>
                        {availableKeys.length > 0 ? (
                          availableKeys.map((key) => (
                            <SelectItem key={key._id} value={key._id}>
                              {key.key} (Limit: {key.deviceLimit}, Used: {key.usedDevices})
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value='no-keys' disabled>
                            No available keys
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {availableKeys.length === 0 && (
                      <p className='text-sm text-amber-600'>
                        All keys are currently assigned. Create new keys to assign to users.
                      </p>
                    )}
                  </div>
                  <div className='grid grid-cols-2 gap-2'>
                    <div className='space-y-2'>
                      <Label>Department</Label>
                      <Input
                        placeholder='e.g., Engineering'
                        value={assignmentForm.department}
                        onChange={(e) =>
                          setAssignmentForm((prev) => ({ ...prev, department: e.target.value }))
                        }
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label>Priority</Label>
                      <Select
                        value={assignmentForm.priority}
                        onValueChange={(value) =>
                          setAssignmentForm((prev) => ({ ...prev, priority: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='LOW'>Low</SelectItem>
                          <SelectItem value='MEDIUM'>Medium</SelectItem>
                          <SelectItem value='HIGH'>High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className='space-y-2'>
                    <Label>Project</Label>
                    <Input
                      placeholder='e.g., Project Alpha'
                      value={assignmentForm.project}
                      onChange={(e) =>
                        setAssignmentForm((prev) => ({ ...prev, project: e.target.value }))
                      }
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label>Purpose</Label>
                    <Input
                      placeholder='e.g., Development access'
                      value={assignmentForm.purpose}
                      onChange={(e) =>
                        setAssignmentForm((prev) => ({ ...prev, purpose: e.target.value }))
                      }
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label>Expiration Date (Optional)</Label>
                    <Input
                      type='datetime-local'
                      value={assignmentForm.expiresAt}
                      onChange={(e) =>
                        setAssignmentForm((prev) => ({ ...prev, expiresAt: e.target.value }))
                      }
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      placeholder='Additional notes about this assignment'
                      value={assignmentForm.notes}
                      onChange={(e) =>
                        setAssignmentForm((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant='outline' onClick={() => setAssignDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAssignKey} disabled={availableKeys.length === 0}>
                    Assign Key
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className='p-4'>
              <div className='flex flex-col sm:flex-row gap-4'>
                <div className='flex-1'>
                  <div className='relative'>
                    <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4' />
                    <Input
                      placeholder={`Search ${activeTab}...`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className='pl-10'
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className='w-40'>
                    <SelectValue placeholder='All Statuses' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All Statuses</SelectItem>
                    <SelectItem value='ACTIVE'>Active</SelectItem>
                    <SelectItem value='EXPIRED'>Expired</SelectItem>
                    <SelectItem value='REVOKED'>Revoked</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className='w-40'>
                    <SelectValue placeholder='All Departments' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All Departments</SelectItem>
                    {statistics?.departmentStats.map((dept) => (
                      <SelectItem key={dept.department} value={dept.department}>
                        {dept.department} ({dept.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <TabsContent value='users' className='space-y-6'>
            <Card>
              <CardHeader>
                <CardTitle>Users and Their Assigned Keys</CardTitle>
                <CardDescription>
                  View all users and their key assignments. Each user can have multiple keys. Total
                  users: {users.length}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className='text-center py-8'>
                    <div className='w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2'></div>
                    <p className='text-slate-600'>Loading users...</p>
                  </div>
                ) : users.length > 0 ? (
                  <div className='space-y-4'>
                    {users.map((user) => (
                      <div key={user._id} className='border rounded-lg p-4 space-y-3'>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-3'>
                            <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold'>
                              {user.firstName && user.lastName
                                ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
                                : user.username[0].toUpperCase()}
                            </div>
                            <div>
                              <h3 className='font-semibold text-slate-900'>
                                {user.firstName && user.lastName
                                  ? `${user.firstName} ${user.lastName}`
                                  : user.username}
                              </h3>
                              <p className='text-sm text-slate-600'>{user.email}</p>
                            </div>
                          </div>
                          <div className='flex items-center gap-2'>
                            <Badge variant='outline'>
                              {user.totalKeys} {user.totalKeys === 1 ? 'Key' : 'Keys'}
                            </Badge>
                            <Badge variant='default'>{user.activeKeys} Active</Badge>
                          </div>
                        </div>

                        {user.assignedKeys.length > 0 && (
                          <div className='overflow-x-auto'>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Key</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Usage</TableHead>
                                  <TableHead>Department</TableHead>
                                  <TableHead>Assigned</TableHead>
                                  <TableHead>Expires</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {user.assignedKeys.map((assignment, index) => (
                                  <TableRow key={index}>
                                    <TableCell>
                                      <code className='bg-slate-100 px-2 py-1 rounded text-xs font-mono'>
                                        {assignment.key}
                                      </code>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(assignment.status)}</TableCell>
                                    <TableCell>
                                      <span className='text-sm'>
                                        {assignment.usedDevices}/{assignment.deviceLimit}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <span className='text-sm'>
                                        {assignment.metadata?.department || '—'}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <span className='text-sm text-slate-600'>
                                        {new Date(assignment.assignedAt).toLocaleDateString()}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <span className='text-sm text-slate-600'>
                                        {assignment.expiresAt
                                          ? new Date(assignment.expiresAt).toLocaleDateString()
                                          : 'Never'}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}

                        {user.assignedKeys.length === 0 && (
                          <div className='text-center py-4 text-slate-500'>
                            <Key className='w-8 h-8 mx-auto mb-2 opacity-50' />
                            <p>No keys assigned to this user</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-12'>
                    <Users className='w-12 h-12 text-slate-400 mx-auto mb-4' />
                    <p className='text-slate-500 text-lg mb-2'>No users found</p>
                    <p className='text-slate-400 text-sm'>Try adjusting your search or filters</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='keys' className='space-y-6'>
            <Card>
              <CardHeader>
                <CardTitle>Keys and Their Assigned User</CardTitle>
                <CardDescription>
                  View all activation keys and their single assigned user. Each key can only be
                  assigned to one user. Total keys: {keys.length}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className='text-center py-8'>
                    <div className='w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2'></div>
                    <p className='text-slate-600'>Loading keys...</p>
                  </div>
                ) : keys.length > 0 ? (
                  <div className='space-y-4'>
                    {keys.map((key) => (
                      <div key={key._id} className='border rounded-lg p-4 space-y-3'>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-3'>
                            <div className='w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white'>
                              <Key className='w-5 h-5' />
                            </div>
                            <div>
                              <code className='font-semibold text-slate-900 bg-slate-100 px-2 py-1 rounded'>
                                {key.key}
                              </code>
                              <p className='text-sm text-slate-600 mt-1'>
                                Device Limit: {key.deviceLimit} | Used: {key.usedDevices}
                              </p>
                            </div>
                          </div>
                          <div className='flex items-center gap-2'>
                            <Badge variant={key.isActive ? 'default' : 'secondary'}>
                              {key.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            <Badge variant={key.isAssigned ? 'default' : 'outline'}>
                              {key.isAssigned ? 'Assigned' : 'Available'}
                            </Badge>
                          </div>
                        </div>

                        {key.isAssigned && key.assignedUser && (
                          <div className='bg-slate-50 rounded-lg p-3'>
                            <h4 className='text-sm font-medium text-slate-700 mb-2'>
                              Assigned User
                            </h4>
                            <div className='flex items-center justify-between'>
                              <div className='flex items-center gap-2'>
                                <div className='w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold'>
                                  {key.assignedUser.firstName && key.assignedUser.lastName
                                    ? `${key.assignedUser.firstName[0]}${key.assignedUser.lastName[0]}`.toUpperCase()
                                    : key.assignedUser.username[0].toUpperCase()}
                                </div>
                                <div>
                                  <p className='text-sm font-medium'>
                                    {key.assignedUser.firstName && key.assignedUser.lastName
                                      ? `${key.assignedUser.firstName} ${key.assignedUser.lastName}`
                                      : key.assignedUser.username}
                                  </p>
                                  <p className='text-xs text-slate-600'>{key.assignedUser.email}</p>
                                </div>
                              </div>
                              <div className='text-right'>
                                {getStatusBadge(key.assignedUser.status)}
                                <p className='text-xs text-slate-600 mt-1'>
                                  Assigned:{' '}
                                  {new Date(key.assignedUser.assignedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            {key.assignedUser.metadata && (
                              <div className='mt-2 flex gap-2 flex-wrap'>
                                {key.assignedUser.metadata.department && (
                                  <Badge variant='outline' className='text-xs'>
                                    {key.assignedUser.metadata.department}
                                  </Badge>
                                )}
                                {key.assignedUser.metadata.priority &&
                                  getPriorityBadge(key.assignedUser.metadata.priority)}
                              </div>
                            )}
                          </div>
                        )}

                        {!key.isAssigned && (
                          <div className='text-center py-4 text-slate-500'>
                            <UserCheck className='w-8 h-8 mx-auto mb-2 opacity-50' />
                            <p>This key is available for assignment</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-12'>
                    <Key className='w-12 h-12 text-slate-400 mx-auto mb-4' />
                    <p className='text-slate-500 text-lg mb-2'>No keys found</p>
                    <p className='text-slate-400 text-sm'>Try adjusting your search or filters</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='statistics' className='space-y-6'>
            {statistics && (
              <>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <Card>
                    <CardHeader>
                      <CardTitle className='flex items-center gap-2'>
                        <Building className='w-5 h-5' />
                        Department Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='space-y-3'>
                        {statistics.departmentStats.map((dept, index) => (
                          <div key={index} className='flex items-center justify-between'>
                            <span className='text-sm font-medium'>{dept.department}</span>
                            <Badge variant='outline'>{dept.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className='flex items-center gap-2'>
                        <Calendar className='w-5 h-5' />
                        Recent Assignments
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='space-y-3'>
                        {statistics.recentAssignments.slice(0, 5).map((assignment, index) => (
                          <div key={index} className='flex items-center justify-between text-sm'>
                            <div>
                              <p className='font-medium'>{assignment.user.username}</p>
                              <p className='text-slate-600 text-xs'>
                                {assignment.key.key.substring(0, 20)}...
                              </p>
                            </div>
                            <div className='text-right'>
                              {getStatusBadge(assignment.status)}
                              <p className='text-xs text-slate-600 mt-1'>
                                {new Date(assignment.assignedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                  <Card>
                    <CardHeader>
                      <CardTitle>Key Assignment Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='space-y-3'>
                        <div className='flex items-center justify-between'>
                          <span className='flex items-center gap-2'>
                            <UserCheck className='w-4 h-4 text-green-600' />
                            Assigned Keys
                          </span>
                          <span className='font-semibold'>{statistics.overview.assignedKeys}</span>
                        </div>
                        <div className='flex items-center justify-between'>
                          <span className='flex items-center gap-2'>
                            <KeyRound className='w-4 h-4 text-orange-600' />
                            Available Keys
                          </span>
                          <span className='font-semibold'>
                            {statistics.overview.unassignedKeys}
                          </span>
                        </div>
                        <div className='flex items-center justify-between'>
                          <span className='flex items-center gap-2'>
                            <XCircle className='w-4 h-4 text-red-600' />
                            Revoked
                          </span>
                          <span className='font-semibold'>
                            {statistics.overview.revokedAssignments}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>System Health</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='space-y-3'>
                        <div>
                          <div className='flex justify-between text-sm mb-1'>
                            <span>Key Utilization</span>
                            <span>{statistics.utilizationRate}%</span>
                          </div>
                          <div className='w-full bg-slate-200 rounded-full h-2'>
                            <div
                              className='bg-blue-600 h-2 rounded-full'
                              style={{ width: `${statistics.utilizationRate}%` }}
                            ></div>
                          </div>
                        </div>
                        <div>
                          <div className='flex justify-between text-sm mb-1'>
                            <span>User Engagement</span>
                            <span>{statistics.userEngagement}%</span>
                          </div>
                          <div className='w-full bg-slate-200 rounded-full h-2'>
                            <div
                              className='bg-green-600 h-2 rounded-full'
                              style={{ width: `${statistics.userEngagement}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='space-y-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          className='w-full justify-start'
                          onClick={() => setAssignDialogOpen(true)}
                          disabled={availableKeys.length === 0}
                        >
                          <Plus className='w-4 h-4 mr-2' />
                          Assign New Key
                        </Button>
                        <Link href='/admin/dashboard'>
                          <Button variant='outline' size='sm' className='w-full justify-start'>
                            <Eye className='w-4 h-4 mr-2' />
                            View Dashboard
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
