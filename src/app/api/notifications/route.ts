import { NextResponse } from 'next/server';
import { getRecentNotifications } from '@/lib/sms';

export async function GET() {
  const notifications = getRecentNotifications();
  return NextResponse.json({
    success: true,
    notifications,
    unreadCount: notifications.length,
  });
}
