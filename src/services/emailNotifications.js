// Email notification service for shift trades
import { auth } from '../config/firebase';

export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'rchavez@deconetwork.com';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const EmailNotificationService = {
  /**
   * Internal method to send email via backend API
   */
  async _sendEmailViaBackend({ to, subject, body }) {
    try {
      // Get the current user's ID token from Firebase
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User must be logged in to send notifications');
      }

      const token = await user.getIdToken();

      const response = await fetch(`${API_URL}/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ to, subject, body }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || data.message || `HTTP ${response.status}` };
      }
      return data;
    } catch (error) {
      console.error('Failed to send email via backend:', error);
      return { success: false, error: error.message };
    }
  },

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
      // Send via backend API
      const result = await this._sendEmailViaBackend({
        to: ADMIN_EMAIL,
        subject,
        body
      });

      // Double check success flag even if status was 200
      const isActuallySuccessful = result && result.success === true;

      // Create a mailto link as fallback/alternative
      const mailtoLink = `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      console.log('%c📧 EMAIL NOTIFICATION ATTEMPTED', `background: ${isActuallySuccessful ? '#10b981' : '#ef4444'}; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;`);
      console.log('%cTo:', 'font-weight: bold;', ADMIN_EMAIL);
      console.log('%cSubject:', 'font-weight: bold;', subject);
      console.log('%cBackend Result:', 'font-weight: bold;', isActuallySuccessful ? 'SUCCESS' : 'FAILED: ' + (result?.error || 'Unknown error'));
      console.log('%c─────────────────────────────────────', 'color: #6b7280;');

      // Store notification in localStorage for admin dashboard
      this.storeNotification({
        type: 'shift_trade',
        subject,
        body,
        to: ADMIN_EMAIL,
        timestamp: new Date().toISOString(),
        tradeDetails,
        backendSent: isActuallySuccessful,
        error: isActuallySuccessful ? null : (result?.error || 'Unknown error')
      });

      return {
        success: isActuallySuccessful,
        mailtoLink,
        error: isActuallySuccessful ? null : (result?.error || 'Unknown error'),
        message: isActuallySuccessful ? 'Email sent successfully' : `Failed: ${result?.error || 'Unknown error'}`
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
      const result = await this._sendEmailViaBackend({
        to: ADMIN_EMAIL,
        subject,
        body
      });

      const isActuallySuccessful = result && result.success === true;

      console.log('%c📧 SHIFT OVERRIDE NOTIFICATION', `background: ${isActuallySuccessful ? '#f97316' : '#ef4444'}; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;`);
      console.log('%cTo:', 'font-weight: bold;', ADMIN_EMAIL);
      console.log('%cSubject:', 'font-weight: bold;', subject);
      console.log('%cBackend Result:', 'font-weight: bold;', isActuallySuccessful ? 'SUCCESS' : 'FAILED: ' + (result?.error || 'Unknown error'));
      console.log('%c─────────────────────────────────────', 'color: #6b7280;');

      this.storeNotification({
        type: 'shift_override',
        subject,
        body,
        to: ADMIN_EMAIL,
        timestamp: new Date().toISOString(),
        overrideDetails,
        backendSent: isActuallySuccessful,
        error: isActuallySuccessful ? null : (result?.error || 'Unknown error')
      });

      return {
        success: isActuallySuccessful,
        error: isActuallySuccessful ? null : (result?.error || 'Unknown error'),
        message: isActuallySuccessful ? 'Override notification sent' : `Failed: ${result?.error || 'Unknown error'}`
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
