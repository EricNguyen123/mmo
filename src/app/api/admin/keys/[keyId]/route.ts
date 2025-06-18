import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(request: NextRequest, { params }: { params: { keyId: string } }) {
  try {
    // Check admin authentication
    const adminSession = (await cookies()).get('admin_session');
    if (!adminSession || adminSession.value !== 'authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { isActive } = await request.json();
    const { db } = await connectToDatabase();

    await db
      .collection('activation_keys')
      .updateOne({ _id: new ObjectId(params.keyId) }, { $set: { isActive } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { keyId: string } }) {
  try {
    // Check admin authentication
    const adminSession = (await cookies()).get('admin_session');
    if (!adminSession || adminSession.value !== 'authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    // Check if key exists and get details
    const keyToDelete = await db
      .collection('activation_keys')
      .findOne({ _id: new ObjectId(params.keyId) });

    if (!keyToDelete) {
      return NextResponse.json({ error: 'Activation key not found' }, { status: 404 });
    }

    // Delete the activation key
    const result = await db
      .collection('activation_keys')
      .deleteOne({ _id: new ObjectId(params.keyId) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Failed to delete activation key' }, { status: 500 });
    }

    // Optionally, you might want to also delete associated user credentials
    // Uncomment the following lines if you want to delete user data when key is deleted
    /*
    if (keyToDelete.devices && keyToDelete.devices.length > 0) {
      const userIds = keyToDelete.devices.map(device => device.userId)
      await db.collection("credentials").deleteMany({ userId: { $in: userIds } })
    }
    */

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
