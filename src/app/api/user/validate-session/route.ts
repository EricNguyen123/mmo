/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextRequest, NextResponse } from 'next/server';
import { verifyUserToken, updateDeviceLastActive } from '@/lib/auth-utils';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const decoded = await verifyUserToken(request);

    if (!decoded) {
      console.log('No valid token found');
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    console.log('Session validation for:', {
      userId: decoded.userId,
      deviceId: decoded.deviceId,
      activationKey: decoded.activationKey,
      assignmentId: decoded.assignmentId,
    });

    const { db } = await connectToDatabase();

    // Get the assignment
    const assignment = await db.collection('user_key_assignments').findOne({
      _id: new ObjectId(decoded.assignmentId),
      userId: new ObjectId(decoded.userId),
      status: 'ACTIVE',
    });

    if (!assignment) {
      console.log('Assignment not found or inactive:', decoded.assignmentId);
      return NextResponse.json(
        {
          error: 'Your key assignment is no longer active',
          shouldReauth: true,
        },
        { status: 403 }
      );
    }

    // Check assignment expiry
    if (assignment.expiresAt && new Date() > new Date(assignment.expiresAt)) {
      console.log('Assignment expired:', assignment.expiresAt);
      return NextResponse.json(
        {
          error: 'Your key assignment has expired',
          shouldReauth: true,
        },
        { status: 403 }
      );
    }

    // Get the key
    const keyDoc = await db.collection('activation_keys').findOne({
      _id: assignment.keyId,
      key: decoded.activationKey,
    });

    if (!keyDoc) {
      console.log('Key not found:', decoded.activationKey);
      return NextResponse.json(
        {
          error: 'Activation key not found',
          shouldReauth: true,
        },
        { status: 403 }
      );
    }

    if (!keyDoc.isActive) {
      console.log('Key is inactive:', decoded.activationKey);
      return NextResponse.json(
        {
          error: 'Activation key has been deactivated',
          shouldReauth: true,
        },
        { status: 403 }
      );
    }

    // Check key expiry
    if (keyDoc.expiresAt && new Date() > new Date(keyDoc.expiresAt)) {
      console.log('Key expired:', keyDoc.expiresAt);
      return NextResponse.json(
        {
          error: 'Activation key has expired',
          shouldReauth: true,
        },
        { status: 403 }
      );
    }

    // Check if device is registered for this assignment
    const deviceExists = keyDoc.devices?.find(
      (d: any) =>
        d.deviceId === decoded.deviceId &&
        d.assignmentId?.toString() === decoded.assignmentId &&
        d.isActive !== false
    );

    if (!deviceExists) {
      console.log('Device not registered or inactive:', {
        deviceId: decoded.deviceId,
        assignmentId: decoded.assignmentId,
        registeredDevices: keyDoc.devices?.map((d: any) => ({
          deviceId: d.deviceId,
          assignmentId: d.assignmentId?.toString(),
          isActive: d.isActive,
        })),
      });
      return NextResponse.json(
        {
          error: 'Device not registered or access has been revoked',
          shouldReauth: true,
        },
        { status: 403 }
      );
    }

    // Update device last active time
    await updateDeviceLastActive(decoded.activationKey, decoded.deviceId, decoded.assignmentId);

    console.log('Session validation successful for user:', decoded.userId);
    return NextResponse.json({
      valid: true,
      user: {
        userId: decoded.userId,
        deviceId: decoded.deviceId,
        activationKey: decoded.activationKey,
        assignmentId: decoded.assignmentId,
      },
    });
  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
