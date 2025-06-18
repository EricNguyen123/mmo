import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json({ success: true, message: 'Admin logged out successfully' });

    // Clear admin session cookie
    response.cookies.delete('admin_session');

    return response;
  } catch (error) {
    console.error('Admin logout error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
