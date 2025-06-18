import { type NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

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

    // Get comprehensive statistics
    const [
      totalUsers,
      activeUsers,
      totalKeys,
      activeKeys,
      assignedKeys, // Keys that have been assigned to users
      unassignedKeys, // Keys that are available for assignment
      totalAssignments,
      activeAssignments,
      expiredAssignments,
      revokedAssignments,
      departmentStats,
      recentAssignments,
    ] = await Promise.all([
      db.collection('users').countDocuments({ role: 'USER' }),
      db.collection('users').countDocuments({ role: 'USER', isActive: true }),
      db.collection('activation_keys').countDocuments(),
      db.collection('activation_keys').countDocuments({ isActive: true }),

      // Count assigned keys
      db
        .collection('user_key_assignments')
        .distinct('keyId')
        .then((keys) => keys.length),

      // Count unassigned keys
      db
        .collection('user_key_assignments')
        .distinct('keyId')
        .then(async (assignedKeyIds) => {
          const totalKeysCount = await db.collection('activation_keys').countDocuments();
          return totalKeysCount - assignedKeyIds.length;
        }),

      db.collection('user_key_assignments').countDocuments(),
      db.collection('user_key_assignments').countDocuments({ status: 'ACTIVE' }),
      db.collection('user_key_assignments').countDocuments({ status: 'EXPIRED' }),
      db.collection('user_key_assignments').countDocuments({ status: 'REVOKED' }),

      // Department statistics
      db
        .collection('user_key_assignments')
        .aggregate([
          { $match: { status: 'ACTIVE' } },
          { $group: { _id: '$metadata.department', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ])
        .toArray(),

      // Recent assignments
      db
        .collection('user_key_assignments')
        .aggregate([
          {
            $lookup: {
              from: 'users',
              localField: 'userId',
              foreignField: '_id',
              as: 'user',
            },
          },
          {
            $lookup: {
              from: 'activation_keys',
              localField: 'keyId',
              foreignField: '_id',
              as: 'key',
            },
          },
          { $unwind: '$user' },
          { $unwind: '$key' },
          { $sort: { assignedAt: -1 } },
          { $limit: 10 },
          {
            $project: {
              assignedAt: 1,
              status: 1,
              'user.username': 1,
              'user.email': 1,
              'key.key': 1,
              metadata: 1,
            },
          },
        ])
        .toArray(),
    ]);

    const stats = {
      overview: {
        totalUsers,
        activeUsers,
        totalKeys,
        activeKeys,
        assignedKeys,
        unassignedKeys,
        totalAssignments,
        activeAssignments,
        expiredAssignments,
        revokedAssignments,
      },
      departmentStats: departmentStats.map((dept) => ({
        department: dept._id || 'Unassigned',
        count: dept.count,
      })),
      recentAssignments,
      utilizationRate: totalKeys > 0 ? Math.round((assignedKeys / totalKeys) * 100) : 0,
      userEngagement: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Failed to fetch statistics:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
