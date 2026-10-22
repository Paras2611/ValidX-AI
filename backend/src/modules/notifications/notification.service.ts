import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database';
import { Notification } from '../../types';

export class NotificationService {
  public static create(params: {
    userId: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'action_required';
    metadata?: Record<string, any>;
  }): Notification {
    const notification: Notification = {
      id: uuidv4(),
      user_id: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      is_read: false,
      metadata: params.metadata || {},
      created_at: new Date().toISOString(),
    };

    return db.insert('notifications', notification);
  }

  public static getUserNotifications(userId: string) {
    const list = db.find('notifications', (n) => n.user_id === userId);
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public static markAsRead(notificationId: string, userId: string): boolean {
    const notification = db.findOne('notifications', (n) => n.id === notificationId && n.user_id === userId);
    if (!notification) return false;
    db.update('notifications', notificationId, { is_read: true });
    return true;
  }

  public static markAllAsRead(userId: string): number {
    const unread = db.find('notifications', (n) => n.user_id === userId && !n.is_read);
    for (const item of unread) {
      db.update('notifications', item.id, { is_read: true });
    }
    return unread.length;
  }
}
