/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { generateUserToken } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const result = await authenticateUser(username, password);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    // Set HTTP-only cookie for session
    const response = NextResponse.json({
      success: true,
      user: result.user,
      token: result.token,
    });

    response.cookies.set('auth_token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      sameSite: 'strict',
    });

    // Set role-specific session cookies
    if (result.user?.role === 'ADMIN') {
      response.cookies.set('admin_session', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        sameSite: 'strict',
      });
    } else if (result.user?.role === 'USER') {
      // Auto-activate device for regular users
      try {
        const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const userAgent = request.headers.get('user-agent') || 'Unknown';
        const ipAddress =
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown';

        const { db } = await connectToDatabase();

        // Find an active key assignment for this user
        const assignment = await db.collection('user_key_assignments').findOne({
          userId: result.user._id,
          status: 'ACTIVE',
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } },
          ],
        });

        if (assignment) {
          // Get the activation key details
          const keyDoc = await db.collection('activation_keys').findOne({
            _id: assignment.keyId,
            isActive: true,
            $or: [
              { expiresAt: { $exists: false } },
              { expiresAt: null },
              { expiresAt: { $gt: new Date() } },
            ],
          });

          if (keyDoc) {
            // Check if device limit allows new device
            const assignmentDeviceCount =
              keyDoc.devices?.filter(
                (d: any) =>
                  d.assignmentId?.toString() === assignment._id.toString() && d.isActive !== false
              ).length || 0;

            if (assignmentDeviceCount < keyDoc.deviceLimit) {
              // Register new device for this assignment
              const newDevice = {
                deviceId,
                userId: result.user._id.toString(),
                assignmentId: assignment._id,
                registeredAt: new Date(),
                lastActiveAt: new Date(),
                isActive: true,
                deviceInfo: {
                  userAgent,
                  ipAddress,
                  platform: 'Web',
                  autoActivated: true,
                },
              };

              await db.collection('activation_keys').updateOne(
                { _id: keyDoc._id },
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

              // Generate user token for credential access
              const userToken = generateUserToken({
                deviceId,
                activationKey: keyDoc.key,
                userId: result.user._id.toString(),
                assignmentId: assignment._id.toString(),
              });

              response.cookies.set('user_token', userToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60, // 7 days
                sameSite: 'strict',
              });

              // Log the auto-activation
              await db.collection('audit_logs').insertOne({
                action: 'auto_device_activation',
                userId: result.user._id.toString(),
                resourceType: 'device_activation',
                resourceId: deviceId,
                details: {
                  activationKey: keyDoc.key,
                  assignmentId: assignment._id,
                  deviceInfo: newDevice.deviceInfo,
                  autoActivated: true,
                },
                timestamp: new Date(),
              });
            }
          }
        }
      } catch (autoActivationError) {
        console.error('Auto-activation failed:', autoActivationError);
        // Don't fail the login if auto-activation fails
      }
    }

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
