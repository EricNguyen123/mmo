import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    // Check admin authentication
    const cookieStore = await cookies();
    const adminSession = cookieStore.get('admin_session');
    if (!adminSession || adminSession.value !== 'authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const keys = await db.collection('activation_keys').find({}).sort({ createdAt: -1 }).toArray();

    return NextResponse.json({ keys });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const cookieStore = await cookies();
    const adminSession = cookieStore.get('admin_session');
    if (!adminSession || adminSession.value !== 'authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deviceLimit } = await request.json();
    const { db } = await connectToDatabase();

    // Generate unique activation key
    const activationKey = `KEY_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;

    const newKey = {
      key: activationKey,
      deviceLimit: deviceLimit || 10,
      usedDevices: 0,
      createdAt: new Date(),
      isActive: true,
      devices: [],
    };

    await db.collection('activation_keys').insertOne(newKey);

    return NextResponse.json({ success: true, key: newKey });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
