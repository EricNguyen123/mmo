import { type NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyUserToken } from '@/lib/auth-utils';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const decoded = await verifyUserToken(request);

    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { credentials } = await request.json();

    if (!credentials || !Array.isArray(credentials) || credentials.length === 0) {
      return NextResponse.json({ error: 'Valid credentials array is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Verify user still has valid access
    console.log(decoded);
    const assignment = await db.collection('user_key_assignments').findOne({
      userId: new ObjectId(decoded.userId),
      status: 'ACTIVE',
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Access revoked or expired' }, { status: 403 });
    }

    // Validate and prepare credentials
    const validCredentials = credentials
      .filter((cred) => cred.username && cred.password)
      .map((cred) => ({
        userId: new ObjectId(decoded.userId),
        username: cred.username.trim(),
        password: cred.password.trim(),
        createdAt: new Date(),
      }));

    if (validCredentials.length === 0) {
      return NextResponse.json({ error: 'No valid credentials provided' }, { status: 400 });
    }

    const result = await db.collection('credentials').insertMany(validCredentials);

    return NextResponse.json({
      success: true,
      insertedCount: result.insertedCount,
      credentialIds: result.insertedIds,
    });
  } catch (error) {
    console.error('Failed to add bulk credentials:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
