import { type NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyUserToken, validateUserKeyAccess } from '@/lib/auth-utils';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const decoded = await verifyUserToken(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate user still has access to the key
    const validation = await validateUserKeyAccess(decoded.activationKey, decoded.userId);
    if (!validation.isValid) {
      console.log('Access validation failed for credentials GET:', validation.reason);
      return NextResponse.json({ error: validation.reason }, { status: 403 });
    }

    const { db } = await connectToDatabase();
    const credentials = await db
      .collection('credentials')
      .find({ userId: new ObjectId(decoded.userId) })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ credentials });
  } catch (error) {
    console.error('Error fetching credentials:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = await verifyUserToken(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate user still has access to the key
    const validation = await validateUserKeyAccess(decoded.activationKey, decoded.userId);
    if (!validation.isValid) {
      console.log('Access validation failed for credentials POST:', validation.reason);
      return NextResponse.json({ error: validation.reason }, { status: 403 });
    }

    const { title, username, password, url, notes } = await request.json();

    if (!title?.trim() || !username?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: 'Title, username, and password are required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const credential = {
      userId: new ObjectId(decoded.userId),
      title: title.trim(),
      username: username.trim(),
      password: password.trim(),
      url: url?.trim() || '',
      notes: notes?.trim() || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('credentials').insertOne(credential);

    return NextResponse.json({
      success: true,
      credentialId: result.insertedId,
      message: 'Credential added successfully',
    });
  } catch (error) {
    console.error('Error adding credential:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
