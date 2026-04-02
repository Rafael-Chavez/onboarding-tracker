// Email notification service for shift trades
const ADMIN_EMAIL = 'rchavez@deconetwork.com';

export const EmailNotificationService = {
  /**
   * Send email notification when shifts are traded
   * @param {Object} tradeDetails - Details about the shift trade
   */
  async notifyShiftTrade(tradeDetails) {
    const {
      initiatorName,
      respondentName,
      initiatorShiftDate,
      respondentShiftDate,
      status
    } = tradeDetails;

    const subject = `Night Shift Trade: ${initiatorName} ↔ ${respondentName}`;
    const body = `
Night Shift Trade Notification
==============================

Status: ${status.toUpperCase()}

Trade Details:
- ${initiatorName} trades their shift on ${new Date(initiatorShiftDate).toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})}
- ${respondentName} trades their shift on ${new Date(respondentShiftDate).toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})}

This trade has been ${status === 'accepted' ? 'ACCEPTED' : status === 'pending' ? 'REQUESTED' : status.toUpperCase()}.

---
Onboarding Tracker System
Generated: ${new Date().toLocaleString()}
    `.trim();

    try {
      // Create a mailto link (opens user's email client)
      const mailtoLink = `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      // For production, you would integrate with an email service like SendGrid, Mailgun, or AWS SES
      // For now, we'll log it and optionally open mailto
      console.log('📧 Email notification would be sent:');
      console.log('To:', ADMIN_EMAIL);
      console.log('Subject:', subject);
      console.log('Body:', body);

      // Store notification in localStorage for admin dashboard
      this.storeNotification({
        type: 'shift_trade',
        subject,
        body,
        to: ADMIN_EMAIL,
        timestamp: new Date().toISOString(),
        tradeDetails
      });

      return {
        success: true,
        mailtoLink,
        message: 'Email notification queued'
      };
    } catch (error) {
      console.error('Error sending email notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Send email notification for shift override by admin
   */
  async notifyShiftOverride(overrideDetails) {
    const {
      originalEmployee,
      newEmployee,
      shiftDate,
      reason,
      adminName
    } = overrideDetails;

    const subject = `Night Shift Override: ${shiftDate}`;
    const body = `
Night Shift Override Notification
=================================

An admin has overridden the night shift assignment.

Override Details:
- Date: ${new Date(shiftDate).toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})}
- Original Assignment: ${originalEmployee}
- New Assignment: ${newEmployee}
- Reason: ${reason || 'No reason provided'}
- Overridden by: ${adminName}

---
Onboarding Tracker System
Generated: ${new Date().toLocaleString()}
    `.trim();

    try {
      console.log('📧 Shift override notification:');
      console.log('To:', ADMIN_EMAIL);
      console.log('Subject:', subject);
      console.log('Body:', body);

      this.storeNotification({
        type: 'shift_override',
        subject,
        body,
        to: ADMIN_EMAIL,
        timestamp: new Date().toISOString(),
        overrideDetails
      });

      return {
        success: true,
        message: 'Override notification queued'
      };
    } catch (error) {
      console.error('Error sending override notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Store notification for admin viewing
   */
  storeNotification(notification) {
    try {
      const notifications = JSON.parse(localStorage.getItem('admin_notifications') || '[]');
      notifications.unshift(notification);
      // Keep only last 50 notifications
      localStorage.setItem('admin_notifications', JSON.stringify(notifications.slice(0, 50)));
    } catch (error) {
      console.error('Error storing notification:', error);
    }
  },

  /**
   * Get all stored notifications
   */
  getNotifications() {
    try {
      return JSON.parse(localStorage.getItem('admin_notifications') || '[]');
    } catch (error) {
      console.error('Error retrieving notifications:', error);
      return [];
    }
  },

  /**
   * Clear all notifications
   */
  clearNotifications() {
    localStorage.removeItem('admin_notifications');
  }
};
