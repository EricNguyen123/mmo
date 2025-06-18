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
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Eye, EyeOff, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
}

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (formData.username.length > 50) {
      newErrors.username = 'Username must be less than 50 characters';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, hyphens, and underscores';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (formData.password.length > 128) {
      newErrors.password = 'Password must be less than 128 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password =
        'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Terms validation
    if (!acceptTerms) {
      newErrors.terms = 'You must accept the terms and conditions';
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    // Validate form
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token in localStorage
        localStorage.setItem('authToken', data.token);
        setSuccess(true);

        // Show success message briefly, then redirect
        setTimeout(() => {
          router.push('/user/activate');
        }, 2000);
      } else {
        if (data.error.includes('Username')) {
          setErrors({ username: data.error });
        } else if (data.error.includes('Email')) {
          setErrors({ email: data.error });
        } else {
          setErrors({ username: data.error });
        }
      }
    } catch (err) {
      setErrors({ username: 'Connection error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange =
    (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      // Clear error when user starts typing
      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

  if (success) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-slate-100 flex items-center justify-center p-4'>
        <Card className='w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm'>
          <CardContent className='pt-6'>
            <div className='text-center'>
              <div className='w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4'>
                <CheckCircle className='w-8 h-8 text-white' />
              </div>
              <h2 className='text-2xl font-bold text-slate-900 mb-2'>Registration Successful!</h2>
              <p className='text-slate-600 mb-4'>
                Welcome to SecureVault Pro! Your account has been created successfully.
              </p>
              <p className='text-sm text-slate-500'>Redirecting to device activation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4'>
      <div className='w-full max-w-md'>
        {/* Back to Login */}
        <div className='mb-6'>
          <Link
            href='/login'
            className='inline-flex items-center text-sm text-slate-600 hover:text-slate-900 transition-colors'
          >
            <ArrowLeft className='w-4 h-4 mr-2' />
            Back to Login
          </Link>
        </div>

        <Card className='shadow-xl border-0 bg-white/80 backdrop-blur-sm'>
          <CardHeader className='text-center pb-2'>
            <div className='w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4'>
              <Users className='w-8 h-8 text-white' />
            </div>
            <CardTitle className='text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent'>
              Create Account
            </CardTitle>
            <CardDescription className='text-slate-600'>
              Join SecureVault Pro to manage your credentials
            </CardDescription>
          </CardHeader>

          <CardContent className='pt-2'>
            <form onSubmit={handleSubmit} className='space-y-4'>
              {/* Name Fields */}
              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-2'>
                  <Label htmlFor='firstName' className='text-sm font-medium text-slate-700'>
                    First Name
                  </Label>
                  <Input
                    id='firstName'
                    type='text'
                    placeholder='John'
                    value={formData.firstName}
                    onChange={handleInputChange('firstName')}
                    className='h-11'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='lastName' className='text-sm font-medium text-slate-700'>
                    Last Name
                  </Label>
                  <Input
                    id='lastName'
                    type='text'
                    placeholder='Doe'
                    value={formData.lastName}
                    onChange={handleInputChange('lastName')}
                    className='h-11'
                  />
                </div>
              </div>

              {/* Username */}
              <div className='space-y-2'>
                <Label htmlFor='username' className='text-sm font-medium text-slate-700'>
                  Username *
                </Label>
                <Input
                  id='username'
                  type='text'
                  placeholder='Choose a unique username'
                  value={formData.username}
                  onChange={handleInputChange('username')}
                  className={`h-11 ${errors.username ? 'border-red-300 focus:border-red-500' : ''}`}
                  required
                />
                {errors.username && (
                  <div className='flex items-center gap-1 text-red-600 text-xs'>
                    <AlertCircle className='w-3 h-3' />
                    {errors.username}
                  </div>
                )}
              </div>

              {/* Email */}
              <div className='space-y-2'>
                <Label htmlFor='email' className='text-sm font-medium text-slate-700'>
                  Email Address *
                </Label>
                <Input
                  id='email'
                  type='email'
                  placeholder='your@email.com'
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  className={`h-11 ${errors.email ? 'border-red-300 focus:border-red-500' : ''}`}
                  required
                />
                {errors.email && (
                  <div className='flex items-center gap-1 text-red-600 text-xs'>
                    <AlertCircle className='w-3 h-3' />
                    {errors.email}
                  </div>
                )}
              </div>

              {/* Password */}
              <div className='space-y-2'>
                <Label htmlFor='password' className='text-sm font-medium text-slate-700'>
                  Password *
                </Label>
                <div className='relative'>
                  <Input
                    id='password'
                    type={showPassword ? 'text' : 'password'}
                    placeholder='Create a strong password'
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    className={`h-11 pr-10 ${
                      errors.password ? 'border-red-300 focus:border-red-500' : ''
                    }`}
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
                {errors.password && (
                  <div className='flex items-center gap-1 text-red-600 text-xs'>
                    <AlertCircle className='w-3 h-3' />
                    {errors.password}
                  </div>
                )}
                <p className='text-xs text-slate-500'>
                  Must contain at least 6 characters with uppercase, lowercase, and number
                </p>
              </div>

              {/* Confirm Password */}
              <div className='space-y-2'>
                <Label htmlFor='confirmPassword' className='text-sm font-medium text-slate-700'>
                  Confirm Password *
                </Label>
                <div className='relative'>
                  <Input
                    id='confirmPassword'
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder='Confirm your password'
                    value={formData.confirmPassword}
                    onChange={handleInputChange('confirmPassword')}
                    className={`h-11 pr-10 ${
                      errors.confirmPassword ? 'border-red-300 focus:border-red-500' : ''
                    }`}
                    required
                  />
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='absolute right-0 top-0 h-11 px-3 hover:bg-transparent'
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className='w-4 h-4' />
                    ) : (
                      <Eye className='w-4 h-4' />
                    )}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <div className='flex items-center gap-1 text-red-600 text-xs'>
                    <AlertCircle className='w-3 h-3' />
                    {errors.confirmPassword}
                  </div>
                )}
              </div>

              {/* Terms and Conditions */}
              <div className='space-y-2'>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='terms'
                    checked={acceptTerms}
                    onCheckedChange={(checked) => {
                      setAcceptTerms(checked as boolean);
                      if (errors.terms) {
                        setErrors((prev) => ({ ...prev, terms: undefined }));
                      }
                    }}
                  />
                  <div className='grid gap-1.5 leading-none'>
                    <Label
                      htmlFor='terms'
                      className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                    >
                      I agree to the{' '}
                      <Link href='/terms' className='text-blue-600 hover:underline'>
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link href='/privacy' className='text-blue-600 hover:underline'>
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>
                </div>
                {errors.terms && (
                  <div className='flex items-center gap-1 text-red-600 text-xs'>
                    <AlertCircle className='w-3 h-3' />
                    {errors.terms}
                  </div>
                )}
              </div>

              <Button
                type='submit'
                className='w-full h-11 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 transition-all duration-200'
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <div className='mt-6 text-center'>
              <p className='text-sm text-slate-600'>
                Already have an account?{' '}
                <Link href='/login' className='text-blue-600 hover:underline font-medium'>
                  Sign in here
                </Link>
              </p>
            </div>

            <div className='mt-4 text-center'>
              <p className='text-xs text-slate-500'>
                By creating an account, you agree to our terms and conditions
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
