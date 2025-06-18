'use client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Settings, Shield, Key, HelpCircle } from 'lucide-react';
import { LogoutButton } from './logout-button';

interface UserNavProps {
  user?: {
    _id: string;
    username: string;
    email: string;
    role: 'ADMIN' | 'USER';
    firstName?: string;
    lastName?: string;
    profileImage?: string;
  };
}

export function UserNav({ user }: UserNavProps) {
  const router = useRouter();

  // Add this at the beginning of the UserNav function
  if (!user) {
    return (
      <div className='flex items-center gap-2'>
        <Button variant='outline' onClick={() => router.push('/register')}>
          Sign Up
        </Button>
        <Button onClick={() => router.push('/login')}>Sign In</Button>
      </div>
    );
  }

  // Add debug logging (remove in production)
  console.log('UserNav user:', user);

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user?.username?.[0]?.toUpperCase() || 'U';
  };

  const getDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.username || 'User';
  };

  const getRoleColor = () => {
    return user?.role === 'ADMIN' ? 'text-blue-600' : 'text-green-600';
  };

  const getRoleIcon = () => {
    return user?.role === 'ADMIN' ? Shield : Key;
  };

  const getRoleBadgeStyle = () => {
    return user?.role === 'ADMIN'
      ? 'bg-blue-100 text-blue-700 border-blue-200'
      : 'bg-green-100 text-green-700 border-green-200';
  };

  const RoleIcon = getRoleIcon();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='relative h-10 w-10 rounded-full'>
          <Avatar className='h-10 w-10'>
            <AvatarImage src={user.profileImage || '/placeholder.svg'} alt={getDisplayName()} />
            <AvatarFallback
              className={`${
                user.role === 'ADMIN'
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                  : 'bg-gradient-to-br from-green-500 to-green-600'
              } text-white font-semibold`}
            >
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-64' align='end' forceMount>
        <DropdownMenuLabel className='font-normal'>
          <div className='flex flex-col space-y-2'>
            <div className='flex items-center gap-2'>
              <Avatar className='h-8 w-8'>
                <AvatarImage src={user.profileImage || '/placeholder.svg'} alt={getDisplayName()} />
                <AvatarFallback
                  className={`${
                    user.role === 'ADMIN'
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                      : 'bg-gradient-to-br from-green-500 to-green-600'
                  } text-white text-xs`}
                >
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className='flex-1'>
                <p className='text-sm font-medium leading-none'>{getDisplayName()}</p>
                <p className='text-xs leading-none text-muted-foreground mt-1'>{user.email}</p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <RoleIcon className={`w-3 h-3 ${getRoleColor()}`} />
              <span className={`text-xs px-2 py-1 rounded-full border ${getRoleBadgeStyle()}`}>
                {user.role}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Navigation Items */}
        <DropdownMenuItem onClick={() => router.push('/profile')}>
          <User className='mr-2 h-4 w-4' />
          <span>Profile</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => router.push('/settings')}>
          <Settings className='mr-2 h-4 w-4' />
          <span>Settings</span>
        </DropdownMenuItem>

        {/* Role-specific navigation */}
        {user.role === 'USER' && (
          <DropdownMenuItem onClick={() => router.push('/user/activate')}>
            <Key className='mr-2 h-4 w-4' />
            <span>Device Activation</span>
          </DropdownMenuItem>
        )}

        {user.role === 'ADMIN' && (
          <DropdownMenuItem onClick={() => router.push('/admin/dashboard')}>
            <Shield className='mr-2 h-4 w-4' />
            <span>Admin Dashboard</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={() => router.push('/help')}>
          <HelpCircle className='mr-2 h-4 w-4' />
          <span>Help & Support</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Logout Button */}
        <div className='p-1'>
          <LogoutButton
            variant='ghost'
            size='sm'
            className='w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50'
            showConfirmation={true}
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
