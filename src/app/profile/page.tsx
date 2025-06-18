/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, Calendar, Shield, Key, ArrowLeft } from 'lucide-react';
import { UserNav } from '@/components/ui/user-nav';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

interface UserProfile {
  _id: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'USER';
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  profileImage?: string;
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
        setFormData({
          firstName: data.user.firstName || '',
          lastName: data.user.lastName || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setMessage('Profile updated successfully!');
        fetchProfile();
      } else {
        setMessage('Failed to update profile');
      }
    } catch (error) {
      setMessage('Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    if (profile?.firstName && profile?.lastName) {
      return `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();
    }
    return profile?.username?.[0]?.toUpperCase() || 'U';
  };

  const getRoleColor = () => {
    return profile?.role === 'ADMIN' ? 'text-blue-600' : 'text-green-600';
  };

  const getRoleIcon = () => {
    return profile?.role === 'ADMIN' ? Shield : Key;
  };

  if (authLoading || loading) {
    return (
      <div className='min-h-screen bg-slate-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2'></div>
          <p className='text-slate-600'>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className='min-h-screen bg-slate-50 flex items-center justify-center'>
        <div className='text-center'>
          <p className='text-slate-600'>Profile not found</p>
        </div>
      </div>
    );
  }

  const RoleIcon = getRoleIcon();

  return (
    <div className='min-h-screen bg-slate-50 p-6'>
      <header className='flex justify-between items-center mb-8'>
        <div className='flex items-center gap-4'>
          <Link
            href={profile.role === 'ADMIN' ? '/admin/dashboard' : '/user/dashboard'}
            className='inline-flex items-center text-sm text-slate-600 hover:text-slate-900 transition-colors'
          >
            <ArrowLeft className='w-4 h-4 mr-2' />
            Back to Dashboard
          </Link>
        </div>
        <UserNav user={user ?? undefined} />
      </header>

      <div className='max-w-2xl mx-auto'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-slate-900 mb-2'>Profile Settings</h1>
          <p className='text-slate-600'>Manage your account information and preferences</p>
        </div>

        {message && (
          <Alert className='mb-6'>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <div className='grid gap-6'>
          {/* Profile Overview */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <User className='w-5 h-5' />
                Profile Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='flex items-center gap-6'>
                <Avatar className='h-20 w-20'>
                  <AvatarImage
                    src={profile.profileImage || '/placeholder.svg'}
                    alt={profile.username}
                  />
                  <AvatarFallback
                    className={`${
                      profile.role === 'ADMIN'
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                        : 'bg-gradient-to-br from-green-500 to-green-600'
                    } text-white text-lg`}
                  >
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className='flex-1'>
                  <h3 className='text-xl font-semibold text-slate-900'>
                    {profile.firstName && profile.lastName
                      ? `${profile.firstName} ${profile.lastName}`
                      : profile.username}
                  </h3>
                  <div className='flex items-center gap-2 mt-1'>
                    <Mail className='w-4 h-4 text-slate-500' />
                    <span className='text-slate-600'>{profile.email}</span>
                  </div>
                  <div className='flex items-center gap-2 mt-1'>
                    <RoleIcon className={`w-4 h-4 ${getRoleColor()}`} />
                    <span
                      className={`text-sm px-2 py-1 rounded-full ${
                        profile.role === 'ADMIN'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {profile.role}
                    </span>
                  </div>
                  <div className='flex items-center gap-2 mt-1'>
                    <Calendar className='w-4 h-4 text-slate-500' />
                    <span className='text-sm text-slate-600'>
                      Joined {new Date(profile.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit Profile */}
          <Card>
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='firstName'>First Name</Label>
                  <Input
                    id='firstName'
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                    placeholder='Enter your first name'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='lastName'>Last Name</Label>
                  <Input
                    id='lastName'
                    value={formData.lastName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                    placeholder='Enter your last name'
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='username'>Username</Label>
                <Input id='username' value={profile.username} disabled className='bg-slate-50' />
                <p className='text-xs text-slate-500'>Username cannot be changed</p>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='email'>Email</Label>
                <Input id='email' value={profile.email} disabled className='bg-slate-50' />
                <p className='text-xs text-slate-500'>Email cannot be changed</p>
              </div>

              <Button onClick={handleSave} disabled={saving} className='w-full'>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-2 gap-4 text-sm'>
                <div>
                  <Label className='text-slate-500'>Account Status</Label>
                  <p className='font-medium text-green-600'>Active</p>
                </div>
                <div>
                  <Label className='text-slate-500'>Last Login</Label>
                  <p className='font-medium'>
                    {profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : 'Never'}
                  </p>
                </div>
                <div>
                  <Label className='text-slate-500'>User ID</Label>
                  <p className='font-mono text-xs'>{profile._id}</p>
                </div>
                <div>
                  <Label className='text-slate-500'>Role</Label>
                  <p className='font-medium'>{profile.role}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
