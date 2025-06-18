import { type NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { db } = await connectToDatabase();

    // Get dashboard statistics
    const stats = {
      totalKeys: await db.collection('activation_keys').countDocuments(),
      activeKeys: await db.collection('activation_keys').countDocuments({ isActive: true }),
      totalUsers: await db.collection('users').countDocuments({ role: 'USER' }),
      totalCredentials: await db.collection('credentials').countDocuments(),
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
