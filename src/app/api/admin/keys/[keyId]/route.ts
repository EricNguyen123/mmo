import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const adminSession = cookieStore.get('admin_session');
    if (!adminSession || adminSession.value !== 'authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const keyId = url.pathname.split('/').pop(); // lấy [keyId] từ URL

    if (!keyId || !ObjectId.isValid(keyId)) {
      return NextResponse.json({ error: 'Invalid key ID' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const keyToDelete = await db
      .collection('activation_keys')
      .findOne({ _id: new ObjectId(keyId) });

    if (!keyToDelete) {
      return NextResponse.json({ error: 'Activation key not found' }, { status: 404 });
    }

    const result = await db.collection('activation_keys').deleteOne({ _id: new ObjectId(keyId) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Failed to delete activation key' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Activation key deleted successfully',
      deletedKey: keyToDelete.key,
    });
  } catch (error) {
    console.error('Error deleting activation key:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
