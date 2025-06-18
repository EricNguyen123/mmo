import { type NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { verifyUserToken, validateActivationKey } from '@/lib/auth-utils';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { credentialId: string } }
) {
  try {
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
      _id: new ObjectId(params.credentialId),
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
