/* eslint-disable @typescript-eslint/no-explicit-any */
import jwt from 'jsonwebtoken';
import { connectToDatabase } from './mongodb';
import type { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface DecodedToken {
  deviceId: string;
  activationKey: string;
  userId: string;
  assignmentId?: string;
  iat: number;
  exp: number;
}

export async function verifyUserToken(request: NextRequest): Promise<DecodedToken | null> {
  try {
    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('user_token')?.value;

    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookieToken;

    if (!token) {
      console.log('No token found in request');
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    console.log('Token decoded successfully:', {
      userId: decoded.userId,
      deviceId: decoded.deviceId,
    });
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

function isDateExpired(expiryDate: any): boolean {
  if (!expiryDate) {
    console.log('No expiry date set, treating as non-expired');
    return false;
  }

  try {
    const expiry = new Date(expiryDate);
    const now = new Date();

    // Add some buffer to avoid timezone issues (5 minutes)
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    const adjustedExpiry = new Date(expiry.getTime() + bufferTime);

    const isExpired = now > adjustedExpiry;

    console.log('Date expiry check:', {
      expiryDate: expiryDate,
      parsedExpiry: expiry.toISOString(),
      currentTime: now.toISOString(),
      adjustedExpiry: adjustedExpiry.toISOString(),
      isExpired: isExpired,
      timezoneOffset: now.getTimezoneOffset(),
    });

    return isExpired;
  } catch (error) {
    console.error('Error parsing expiry date:', error, 'Original date:', expiryDate);
    return false;
  }
}

export async function validateUserKeyAccess(
  activationKey: string,
  userId: string
): Promise<{
  isValid: boolean;
  reason?: string;
  assignment?: any;
  keyData?: any;
}> {
  try {
    const { db } = await connectToDatabase();

    console.log('Validating key access for user:', userId, 'key:', activationKey);

    // Find the activation key
    const keyDoc = await db.collection('activation_keys').findOne({
      key: activationKey,
    });

    if (!keyDoc) {
      console.log('Key not found:', activationKey);
      return { isValid: false, reason: 'Activation key not found' };
    }

    console.log('Key found:', {
      keyId: keyDoc._id,
      isActive: keyDoc.isActive,
      expiresAt: keyDoc.expiresAt,
    });

    if (!keyDoc.isActive) {
      console.log('Key is inactive:', activationKey);
      return { isValid: false, reason: 'Activation key is deactivated' };
    }

    // Check if key itself is expired (key-level expiration)
    if (isDateExpired(keyDoc.expiresAt)) {
      console.log('Key expired:', activationKey, 'Expires at:', keyDoc.expiresAt);
      return { isValid: false, reason: 'Activation key has expired' };
    }

    // Check if this key is assigned to the requesting user
    const assignment = await db.collection('user_key_assignments').findOne({
      keyId: keyDoc._id,
      userId: new ObjectId(userId),
      status: 'ACTIVE',
    });

    console.log('Assignment lookup:', {
      keyId: keyDoc._id,
      userId: userId,
      assignmentFound: !!assignment,
      assignmentId: assignment?._id,
      assignmentStatus: assignment?.status,
      assignmentExpiresAt: assignment?.expiresAt,
    });

    if (!assignment) {
      console.log('No active assignment found for user:', userId, 'key:', keyDoc._id);
      return {
        isValid: false,
        reason: 'This key is not assigned to you or assignment is inactive',
      };
    }

    // Check if assignment is expired (assignment-level expiration)
    if (isDateExpired(assignment.expiresAt)) {
      console.log('Assignment expired:', assignment._id, 'Expires at:', assignment.expiresAt);
      return { isValid: false, reason: 'Your key assignment has expired' };
    }

    console.log('Key validation successful for user:', userId, 'key:', activationKey);
    return { isValid: true, assignment, keyData: keyDoc };
  } catch (error) {
    console.error('Key validation error:', error);
    return { isValid: false, reason: 'Validation error' };
  }
}

export async function validateActivationKey(
  activationKey: string,
  deviceId: string,
  userId?: string
): Promise<{
  isValid: boolean;
  reason?: string;
  keyData?: any;
  assignment?: any;
}> {
  try {
    const { db } = await connectToDatabase();

    console.log('Validating activation key:', { activationKey, deviceId, userId });

    // Find the activation key
    const keyDoc = await db.collection('activation_keys').findOne({
      key: activationKey,
    });

    if (!keyDoc) {
      console.log('Key not found:', activationKey);
      return { isValid: false, reason: 'Activation key not found' };
    }

    console.log('Key found:', {
      keyId: keyDoc._id,
      isActive: keyDoc.isActive,
      expiresAt: keyDoc.expiresAt,
    });

    if (!keyDoc.isActive) {
      console.log('Key is inactive:', activationKey);
      return { isValid: false, reason: 'Activation key is deactivated' };
    }

    // Check if key is expired using improved date validation
    if (isDateExpired(keyDoc.expiresAt)) {
      console.log('Key expired:', activationKey, 'Expires at:', keyDoc.expiresAt);
      return { isValid: false, reason: 'Activation key has expired' };
    }

    // If userId is provided, validate assignment
    if (userId) {
      const assignment = await db.collection('user_key_assignments').findOne({
        keyId: keyDoc._id,
        userId: new ObjectId(userId),
        status: 'ACTIVE',
      });

      console.log('Assignment check:', {
        keyId: keyDoc._id,
        userId: userId,
        assignmentFound: !!assignment,
        assignmentStatus: assignment?.status,
      });

      if (!assignment) {
        console.log('No assignment found for user:', userId, 'key:', keyDoc._id);
        return { isValid: false, reason: 'This key is not assigned to you' };
      }

      // Check if assignment is expired using improved date validation
      if (isDateExpired(assignment.expiresAt)) {
        console.log('Assignment expired:', assignment._id, 'Expires at:', assignment.expiresAt);
        return { isValid: false, reason: 'Your key assignment has expired' };
      }

      // Check device limit for this specific assignment
      const assignmentDevices =
        keyDoc.devices?.filter(
          (d: any) =>
            d.assignmentId?.toString() === assignment._id.toString() && d.isActive !== false
        ) || [];

      console.log('Device limit check:', {
        assignmentId: assignment._id,
        currentDeviceCount: assignmentDevices.length,
        deviceLimit: keyDoc.deviceLimit,
        existingDevices: assignmentDevices.map((d: any) => d.deviceId),
      });

      if (assignmentDevices.length >= keyDoc.deviceLimit) {
        // Check if this specific device is already registered
        const existingDevice = assignmentDevices.find((d: any) => d.deviceId === deviceId);

        if (!existingDevice) {
          console.log('Device limit reached for assignment:', assignment._id);
          return { isValid: false, reason: 'Device limit reached for your key assignment' };
        }
      }

      return { isValid: true, keyData: keyDoc, assignment };
    }

    // Legacy validation for existing devices (backward compatibility)
    const deviceExists = keyDoc.devices?.find((d: any) => d.deviceId === deviceId);
    if (!deviceExists) {
      console.log('Device not registered with key:', deviceId);
      return { isValid: false, reason: 'Device not registered with this key' };
    }

    if (deviceExists.isActive === false) {
      console.log('Device access revoked:', deviceId);
      return { isValid: false, reason: 'Device access has been revoked' };
    }

    return { isValid: true, keyData: keyDoc };
  } catch (error) {
    console.error('Key validation error:', error);
    return { isValid: false, reason: 'Validation error' };
  }
}

export async function updateDeviceLastActive(
  activationKey: string,
  deviceId: string,
  assignmentId?: string
) {
  try {
    const { db } = await connectToDatabase();

    const updateQuery = assignmentId
      ? {
          key: activationKey,
          'devices.deviceId': deviceId,
          'devices.assignmentId': new ObjectId(assignmentId),
        }
      : {
          key: activationKey,
          'devices.deviceId': deviceId,
        };

    await db.collection('activation_keys').updateOne(updateQuery, {
      $set: {
        'devices.$.lastActiveAt': new Date(),
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Failed to update device last active:', error);
  }
}

export function generateUserToken(payload: {
  deviceId: string;
  activationKey: string;
  userId: string;
  assignmentId?: string;
}) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
