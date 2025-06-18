/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextRequest, NextResponse } from 'next/server';
import { connectWithSetup } from '@/lib/mongodb';
import { validateUserKeyAccess, generateUserToken } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const { activationKey, deviceId, userId } = await request.json();

    if (!activationKey || !deviceId || !userId) {
      return NextResponse.json(
        {
          error: 'Missing required fields: activation key, device ID, and user ID are required',
        },
        { status: 400 }
      );
    }

    // Validate that the user has access to this key
    const validation = await validateUserKeyAccess(activationKey, userId);

    if (!validation.isValid) {
      return NextResponse.json({ error: validation.reason }, { status: 403 });
    }

    const { db } = await connectWithSetup();
    const keyDoc = validation.keyData;
    const assignment = validation.assignment;

    // Check if device is already registered for this assignment
    const existingDevice = keyDoc.devices?.find(
      (d: any) =>
        d.deviceId === deviceId && d.assignmentId?.toString() === assignment._id.toString()
    );

    if (existingDevice) {
      // Update last active time and reactivate if needed
      await db.collection('activation_keys').updateOne(
        {
          key: activationKey,
          'devices.deviceId': deviceId,
          'devices.assignmentId': assignment._id,
        },
        {
          $set: {
            'devices.$.lastActiveAt': new Date(),
            'devices.$.isActive': true,
            updatedAt: new Date(),
          },
        }
      );

      // Generate token with assignment info
      const token = generateUserToken({
        deviceId,
        activationKey,
        userId: existingDevice.userId,
        assignmentId: assignment._id.toString(),
      });

      const response = NextResponse.json({ success: true, token });
      response.cookies.set('user_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        sameSite: 'strict',
      });

      return response;
    }

    // Check device limit for this specific assignment
    const assignmentDeviceCount =
      keyDoc.devices?.filter(
        (d: any) => d.assignmentId?.toString() === assignment._id.toString() && d.isActive !== false
      ).length || 0;

    if (assignmentDeviceCount >= keyDoc.deviceLimit) {
      return NextResponse.json(
        {
          error: `Device limit reached for your key assignment (${assignmentDeviceCount}/${keyDoc.deviceLimit})`,
        },
        { status: 400 }
      );
    }

    // Register new device for this assignment
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const ipAddress =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown';

    const newDevice = {
      deviceId,
      userId,
      assignmentId: assignment._id,
      registeredAt: new Date(),
      lastActiveAt: new Date(),
      isActive: true,
      deviceInfo: {
        userAgent,
        ipAddress,
        platform: 'Web',
      },
    };

    await db.collection('activation_keys').updateOne(
      { key: activationKey },
      {
        $push: { devices: newDevice as any },
        $inc: { usedDevices: 1 },
        $set: { updatedAt: new Date() },
      }
    );

    // Update assignment with device info
    await db.collection('user_key_assignments').updateOne(
      { _id: assignment._id },
      {
        $inc: { deviceCount: 1 },
        $set: { lastUsedAt: new Date() },
      }
    );

    // Generate JWT token with assignment info
    const token = generateUserToken({
      deviceId,
      activationKey,
      userId,
      assignmentId: assignment._id.toString(),
    });

    const response = NextResponse.json({ success: true, token });
    response.cookies.set('user_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      sameSite: 'strict',
    });

    // Log the activation
    await db.collection('audit_logs').insertOne({
      action: 'device_activation',
      userId: userId,
      resourceType: 'device_activation',
      resourceId: newDevice.deviceId,
      details: {
        activationKey,
        assignmentId: assignment._id,
        deviceInfo: newDevice.deviceInfo,
      },
      timestamp: new Date(),
    });

    return response;
  } catch (error) {
    console.error('Activation error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
