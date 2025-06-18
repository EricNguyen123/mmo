import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyUserToken, validateActivationKey, updateDeviceLastActive } from '@/lib/auth-utils';
import { verifyToken } from '@/lib/auth';

// Initialize database on first request
let dbInitialized = false;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Initialize database indexes on first API request
  if (!dbInitialized && pathname.startsWith('/api/')) {
    try {
      const { ensureIndexes } = await import('@/lib/mongodb');
      await ensureIndexes();
      dbInitialized = true;
    } catch (error) {
      console.warn('Database initialization warning:', error);
    }
  }

  // Admin route protection - check both old and new auth methods
  if (pathname.startsWith('/admin/dashboard')) {
    const authToken = request.cookies.get('auth_token');

    // Check new auth system first
    if (authToken) {
      const decoded = verifyToken(authToken.value);
      if (decoded && decoded.role === 'ADMIN') {
        return NextResponse.next();
      }
    }

    // If no valid admin token, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // User route protection - now with auto-activation fallback
  if (pathname.startsWith('/user/dashboard')) {
    // First check if user is authenticated via new auth system
    const authToken = request.cookies.get('auth_token');
    if (authToken) {
      const decoded = verifyToken(authToken.value);
      if (decoded && decoded.role === 'USER') {
        // User is authenticated, check if they have user_token (device activated)
        const userToken = request.cookies.get('user_token');
        if (!userToken) {
          // No user token, redirect to dashboard with message to contact admin
          return NextResponse.redirect(new URL('/user/no-access', request.url));
        }

        // Validate activation key
        const activationDecoded = await verifyUserToken(request);
        if (!activationDecoded) {
          return NextResponse.redirect(new URL('/user/no-access', request.url));
        }

        const validation = await validateActivationKey(
          activationDecoded.activationKey,
          activationDecoded.deviceId,
          activationDecoded.userId
        );
        if (!validation.isValid) {
          const response = NextResponse.redirect(new URL('/user/no-access', request.url));
          response.cookies.delete('user_token');
          return response;
        }

        // Update last active time
        updateDeviceLastActive(
          activationDecoded.activationKey,
          activationDecoded.deviceId,
          activationDecoded.assignmentId
        ).catch(console.error);
        return NextResponse.next();
      }
    }

    // If not authenticated, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Remove the user activation page from middleware since we're auto-activating
  // Users who need manual activation will be handled differently

  // API route protection for user endpoints
  if (pathname.startsWith('/api/user/') && !pathname.includes('/activate')) {
    const decoded = await verifyUserToken(request);

    if (!decoded) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Validate activation key for API requests
    const validation = await validateActivationKey(
      decoded.activationKey,
      decoded.deviceId,
      decoded.userId
    );

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Access revoked',
          reason: validation.reason,
          requiresReactivation: true,
        },
        { status: 403 }
      );
    }

    // Add user info to request headers for API routes
    const response = NextResponse.next();
    response.headers.set('x-user-id', decoded.userId);
    response.headers.set('x-device-id', decoded.deviceId);
    response.headers.set('x-activation-key', decoded.activationKey);

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/dashboard/:path*',
    '/user/dashboard/:path*',
    '/user/no-access',
    '/api/user/:path*',
    '/api/:path*',
  ],
};
