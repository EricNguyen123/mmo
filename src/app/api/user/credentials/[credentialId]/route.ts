import { type NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { verifyUserToken, validateActivationKey } from '@/lib/auth-utils';

export async function DELETE(request: NextRequest) {
  try {
    // Extract credentialId from URL
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    const credentialId = segments.pop() || segments.pop(); // handle trailing slash

    if (!credentialId || !ObjectId.isValid(credentialId)) {
      return NextResponse.json({ error: 'Invalid credential ID' }, { status: 400 });
    }

    const decoded = await verifyUserToken(request);
    if (!decoded) {
      return NextResponse.json({ error: 'User authentication failed' }, { status: 401 });
    }

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

    const { db } = await connectToDatabase();

    const result = await db.collection('credentials').deleteOne({
      _id: new ObjectId(credentialId),
      userId: new ObjectId(decoded.userId),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Credential not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete credential:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
