/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { generateUserToken } from '@/lib/auth-utils';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const { username, password, deviceId } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const result = await authenticateUser(username, password);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    let isDeviceActivated = false;
    let userToken = null;

    // Tạo hoặc sử dụng deviceId có sẵn
    const finalDeviceId =
      deviceId || `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (result.user?.role === 'ADMIN') {
      // Admin users don't need device activation
    } else if (result.user?.role === 'USER') {
      try {
        const userAgent = request.headers.get('user-agent') || 'Unknown';
        const ipAddress =
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown';

        const { db } = await connectToDatabase();

        // Tìm assignment của user
        const assignment = await db.collection('user_key_assignments').findOne({
          userId: new ObjectId(result.user._id),
          status: 'ACTIVE',
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } },
          ],
        });

        if (assignment) {
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
            // Kiểm tra xem user đã có device nào được activate cho assignment này chưa
            const existingUserDevice = keyDoc.devices?.find(
              (d: any) =>
                d.userId === result.user?._id?.toString() &&
                d.assignmentId?.toString() === assignment._id.toString() &&
                d.isActive !== false
            );

            if (existingUserDevice) {
              // User đã có device được activate, sử dụng lại device đó
              const deviceIdToUse = existingUserDevice.deviceId;

              // Update last active time
              await db.collection('activation_keys').updateOne(
                {
                  _id: keyDoc._id,
                  'devices.deviceId': deviceIdToUse,
                  'devices.assignmentId': assignment._id,
                },
                {
                  $set: {
                    'devices.$.lastActiveAt': new Date(),
                    'devices.$.deviceInfo.userAgent': userAgent,
                    'devices.$.deviceInfo.ipAddress': ipAddress,
                    updatedAt: new Date(),
                  },
                }
              );

              // Generate token với deviceId hiện có
              userToken = generateUserToken({
                deviceId: deviceIdToUse,
                activationKey: keyDoc.key,
                userId: result.user._id.toString(),
                assignmentId: assignment._id.toString(),
              });

              isDeviceActivated = true;
            }
            // REMOVED: Auto-activation logic
            // User chưa có device nào được activate cho assignment này
            // Không tự động tạo device mới, để isDeviceActivated = false
            // để chuyển user đến trang activate
          }
        }
      } catch (error) {
        console.error('Device check failed:', error);
      }
    }

    // Create consistent response structure
    const responseData: any = {
      success: true,
      user: result.user,
      isDeviceActivated,
      deviceId: isDeviceActivated
        ? userToken && JSON.parse(atob(userToken.split('.')[1])).deviceId
        : finalDeviceId,
    };

    // For activated users, return userToken; for others, return auth token
    if (isDeviceActivated && userToken) {
      responseData.token = userToken;
    } else {
      responseData.token = result.token;
    }

    const response = NextResponse.json(responseData);

    // Set auth token cookie for session management
    response.cookies.set('auth_token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60,
      sameSite: 'strict',
    });

    if (result.user?.role === 'ADMIN') {
      response.cookies.set('admin_session', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60,
        sameSite: 'strict',
      });
    } else if (result.user?.role === 'USER' && isDeviceActivated && userToken) {
      // Set user token cookie for activated devices
      response.cookies.set('user_token', userToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60,
        sameSite: 'strict',
      });
    }

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
