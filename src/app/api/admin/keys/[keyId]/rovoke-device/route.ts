import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const adminSession = (await cookies()).get('admin_session');
    if (!adminSession || adminSession.value !== 'authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deviceId, assignmentId } = await request.json();

    const url = new URL(request.url);
    const keyId = url.pathname.split('/').slice(-2, -1)[0]; // lấy keyId từ URL

    if (!keyId || !ObjectId.isValid(keyId)) {
      return NextResponse.json({ error: 'Invalid key ID' }, { status: 400 });
    }

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Build the query to find the specific device
    const deviceQuery = assignmentId
      ? {
          _id: new ObjectId(keyId),
          'devices.deviceId': deviceId,
          'devices.assignmentId': new ObjectId(assignmentId),
        }
      : {
          _id: new ObjectId(keyId),
          'devices.deviceId': deviceId,
        };

    // Revoke device access by setting isActive to false
    const result = await db.collection('activation_keys').updateOne(deviceQuery, {
      $set: {
        'devices.$.isActive': false,
        'devices.$.revokedAt': new Date(),
        updatedAt: new Date(),
      },
    });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    // If assignmentId is provided, update the assignment device count
    if (assignmentId) {
      await db.collection('user_key_assignments').updateOne(
        { _id: new ObjectId(assignmentId) },
        {
          $inc: { deviceCount: -1 },
          $set: { updatedAt: new Date() },
        }
      );
    }

    // Log the revocation
    await db.collection('audit_logs').insertOne({
      action: 'revoke_device_access',
      userId: 'admin', // You might want to get the actual admin user ID
      resourceType: 'device_revocation',
      resourceId: deviceId,
      details: {
        keyId,
        assignmentId,
        deviceId,
      },
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Device access revoked successfully',
    });
  } catch (error) {
    console.error('Error revoking device access:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
