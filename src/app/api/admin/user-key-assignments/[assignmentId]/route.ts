/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const assignmentId = url.pathname.split('/').pop(); // lấy từ /api/.../assignments/[assignmentId]

    if (!assignmentId || !ObjectId.isValid(assignmentId)) {
      return NextResponse.json({ error: 'Invalid assignment ID' }, { status: 400 });
    }

    const { status, expiresAt, notes, metadata } = await request.json();
    const { db } = await connectToDatabase();

    const updateData: Record<string, any> = {};
    if (status) updateData.status = status;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (notes !== undefined) updateData.notes = notes;
    if (metadata !== undefined) updateData.metadata = metadata;

    const result = await db
      .collection('user_key_assignments')
      .updateOne({ _id: new ObjectId(assignmentId) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    await db.collection('audit_logs').insertOne({
      action: 'update',
      userId: decoded.userId,
      resourceType: 'user_key_assignment',
      resourceId: assignmentId,
      details: updateData,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update assignment:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const assignmentId = url.pathname.split('/').pop();

    if (!assignmentId || !ObjectId.isValid(assignmentId)) {
      return NextResponse.json({ error: 'Invalid assignment ID' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const assignment = await db.collection('user_key_assignments').findOne({
      _id: new ObjectId(assignmentId),
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    await db.collection('user_key_assignments').deleteOne({
      _id: new ObjectId(assignmentId),
    });

    await db.collection('audit_logs').insertOne({
      action: 'revoke_key',
      userId: decoded.userId,
      resourceType: 'user_key_assignment',
      resourceId: assignmentId,
      details: {
        userId: assignment.userId,
        keyId: assignment.keyId,
      },
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete assignment:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
