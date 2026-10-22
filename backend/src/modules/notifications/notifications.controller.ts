import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { NotificationService } from './notification.service';

export class NotificationsController {
  public static async getMyNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const notifications = NotificationService.getUserNotifications(user.id);
      const unreadCount = notifications.filter((n) => !n.is_read).length;
      res.json({ unreadCount, notifications });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  public static async markRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;
      const success = NotificationService.markAsRead(id, user.id);
      if (!success) {
        res.status(404).json({ error: 'Not Found', message: 'Notification not found' });
        return;
      }
      res.json({ message: 'Marked as read' });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  public static async markAllRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const count = NotificationService.markAllAsRead(user.id);
      res.json({ message: `Marked ${count} notifications as read` });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
}
