import { type NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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
    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'users'; // "users" or "keys"
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || '';
    const department = url.searchParams.get('department') || '';

    if (view === 'users') {
      // Get users with their assigned keys
      const pipeline = [
        {
          $match: {
            role: 'USER',
            ...(search && {
              $or: [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
              ],
            }),
          },
        },
        {
          $lookup: {
            from: 'user_key_assignments',
            localField: '_id',
            foreignField: 'userId',
            as: 'keyAssignments',
            pipeline: [
              ...(status ? [{ $match: { status } }] : []),
              ...(department ? [{ $match: { 'metadata.department': department } }] : []),
              {
                $lookup: {
                  from: 'activation_keys',
                  localField: 'keyId',
                  foreignField: '_id',
                  as: 'keyDetails',
                },
              },
              { $unwind: '$keyDetails' },
            ],
          },
        },
        {
          $addFields: {
            totalKeys: { $size: '$keyAssignments' },
            activeKeys: {
              $size: {
                $filter: {
                  input: '$keyAssignments',
                  cond: { $eq: ['$$this.status', 'ACTIVE'] },
                },
              },
            },
            assignedKeys: {
              $map: {
                input: '$keyAssignments',
                as: 'assignment',
                in: {
                  keyId: '$$assignment.keyId',
                  key: '$$assignment.keyDetails.key',
                  assignedAt: '$$assignment.assignedAt',
                  status: '$$assignment.status',
                  expiresAt: '$$assignment.expiresAt',
                  deviceLimit: '$$assignment.keyDetails.deviceLimit',
                  usedDevices: '$$assignment.keyDetails.usedDevices',
                  isActive: '$$assignment.keyDetails.isActive',
                  notes: '$$assignment.notes',
                  metadata: '$$assignment.metadata',
                },
              },
            },
          },
        },
        { $sort: { createdAt: -1 } },
      ];

      const users = await db.collection('users').aggregate(pipeline).toArray();
      return NextResponse.json({ users });
    } else {
      // Get keys with their assigned user (single user per key)
      const pipeline = [
        {
          $lookup: {
            from: 'user_key_assignments',
            localField: '_id',
            foreignField: 'keyId',
            as: 'assignment',
            pipeline: [
              ...(status ? [{ $match: { status } }] : []),
              ...(department ? [{ $match: { 'metadata.department': department } }] : []),
              {
                $lookup: {
                  from: 'users',
                  localField: 'userId',
                  foreignField: '_id',
                  as: 'userDetails',
                },
              },
              { $unwind: '$userDetails' },
            ],
          },
        },
        {
          $addFields: {
            isAssigned: { $gt: [{ $size: '$assignment' }, 0] },
            assignedUser: {
              $cond: {
                if: { $gt: [{ $size: '$assignment' }, 0] },
                then: {
                  $let: {
                    vars: { assign: { $arrayElemAt: ['$assignment', 0] } },
                    in: {
                      userId: '$$assign.userId',
                      username: '$$assign.userDetails.username',
                      email: '$$assign.userDetails.email',
                      firstName: '$$assign.userDetails.firstName',
                      lastName: '$$assign.userDetails.lastName',
                      assignedAt: '$$assign.assignedAt',
                      status: '$$assign.status',
                      expiresAt: '$$assign.expiresAt',
                      notes: '$$assign.notes',
                      metadata: '$$assign.metadata',
                    },
                  },
                },
                else: null,
              },
            },
          },
        },
        ...(search
          ? [
              {
                $match: {
                  key: { $regex: search, $options: 'i' },
                },
              },
            ]
          : []),
        { $sort: { createdAt: -1 } },
      ];

      const keys = await db.collection('activation_keys').aggregate(pipeline).toArray();
      return NextResponse.json({ keys });
    }
  } catch (error) {
    console.error('Failed to fetch user-key assignments:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId, keyId, expiresAt, notes, metadata } = await request.json();

    if (!userId || !keyId) {
      return NextResponse.json({ error: 'User ID and Key ID are required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Check if key is already assigned to ANY user
    const existingAssignment = await db.collection('user_key_assignments').findOne({
      keyId: new ObjectId(keyId),
    });

    if (existingAssignment) {
      // Get the user details for better error message
      const assignedUser = await db
        .collection('users')
        .findOne({ _id: new ObjectId(existingAssignment.userId) });
      const userName = assignedUser
        ? assignedUser.firstName && assignedUser.lastName
          ? `${assignedUser.firstName} ${assignedUser.lastName}`
          : assignedUser.username
        : 'another user';

      return NextResponse.json(
        {
          error: `This key is already assigned to ${userName}. Each key can only be assigned to one user.`,
        },
        { status: 400 }
      );
    }

    // Verify user and key exist
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    const key = await db.collection('activation_keys').findOne({ _id: new ObjectId(keyId) });

    if (!user || !key) {
      return NextResponse.json({ error: 'User or key not found' }, { status: 404 });
    }

    // Parse and validate expiration date
    let assignmentExpiresAt = null;
    if (expiresAt) {
      try {
        // Handle different date formats
        const parsedDate = new Date(expiresAt);
        if (isNaN(parsedDate.getTime())) {
          return NextResponse.json({ error: 'Invalid expiration date format' }, { status: 400 });
        }

        // Set to end of day to avoid timezone issues
        parsedDate.setHours(23, 59, 59, 999);
        assignmentExpiresAt = parsedDate;

        console.log('Assignment expiry set to:', {
          original: expiresAt,
          parsed: assignmentExpiresAt.toISOString(),
          endOfDay: true,
        });
      } catch (error) {
        console.error('Date parsing error:', error);
        return NextResponse.json({ error: 'Invalid expiration date' }, { status: 400 });
      }
    }

    // Create assignment
    const assignment = {
      userId: new ObjectId(userId),
      keyId: new ObjectId(keyId),
      assignedAt: new Date(),
      assignedBy: decoded.userId,
      status: 'ACTIVE',
      ...(assignmentExpiresAt && { expiresAt: assignmentExpiresAt }),
      ...(notes && { notes }),
      ...(metadata && { metadata }),
    };

    const result = await db.collection('user_key_assignments').insertOne(assignment);

    // Log the assignment
    await db.collection('audit_logs').insertOne({
      action: 'assign_key',
      userId: decoded.userId,
      resourceType: 'user_key_assignment',
      resourceId: result.insertedId,
      details: {
        targetUserId: userId,
        keyId: keyId,
        expiresAt: assignmentExpiresAt,
        metadata,
      },
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      assignment: { ...assignment, _id: result.insertedId },
    });
  } catch (error) {
    console.error('Failed to assign key:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
