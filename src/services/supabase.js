import { supabase } from '../config/supabase';

export class SupabaseService {
  // ==================== EMPLOYEES ====================

  static async getAllEmployees() {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('id');

      if (error) throw error;
      return { success: true, employees: data };
    } catch (error) {
      console.error('Error fetching employees:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== ONBOARDINGS ====================

  static async createOnboarding(onboarding) {
    try {
      const { data, error } = await supabase
        .from('onboardings')
        .insert([{
          employee_id: onboarding.employeeId,
          employee_name: onboarding.employeeName,
          client_name: onboarding.clientName,
          account_number: onboarding.accountNumber,
          session_number: onboarding.sessionNumber,
          date: onboarding.date,
          month: onboarding.month,
          attendance: onboarding.attendance || 'pending',
          notes: onboarding.notes || null
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, onboarding: this.formatOnboarding(data) };
    } catch (error) {
      console.error('Error creating onboarding:', error);
      return { success: false, error: error.message };
    }
  }

  static async getAllOnboardings() {
    try {
      const { data, error } = await supabase
        .from('onboardings')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      return {
        success: true,
        onboardings: data.map(this.formatOnboarding)
      };
    } catch (error) {
      console.error('Error fetching onboardings:', error);
      return { success: false, error: error.message };
    }
  }

  static async getOnboardingsByEmployee(employeeId) {
    try {
      const { data, error } = await supabase
        .from('onboardings')
        .select('*')
        .eq('employee_id', employeeId)
        .order('date', { ascending: false });

      if (error) throw error;
      return {
        success: true,
        onboardings: data.map(this.formatOnboarding)
      };
    } catch (error) {
      console.error('Error fetching employee onboardings:', error);
      return { success: false, error: error.message };
    }
  }

  static async getOnboardingsByMonth(month) {
    try {
      const { data, error } = await supabase
        .from('onboardings')
        .select('*')
        .eq('month', month)
        .order('date', { ascending: false });

      if (error) throw error;
      return {
        success: true,
        onboardings: data.map(this.formatOnboarding)
      };
    } catch (error) {
      console.error('Error fetching monthly onboardings:', error);
      return { success: false, error: error.message };
    }
  }

  static async updateOnboardingStatus(id, attendance, noShowData = {}) {
    try {
      const updateData = { attendance };

      // If marking as no-show and providing reached out data
      if (attendance === 'no-show' && noShowData.reachedOut !== undefined) {
        updateData.no_show_reached_out = noShowData.reachedOut;
        if (noShowData.reachedOut) {
          updateData.no_show_reached_out_date = new Date().toISOString();
        }
        if (noShowData.notes) {
          updateData.no_show_notes = noShowData.notes;
        }
      }

      // Reset no-show fields if changing from no-show to another status
      if (attendance !== 'no-show') {
        updateData.no_show_reached_out = false;
        updateData.no_show_reached_out_date = null;
        updateData.no_show_notes = null;
      }

      const { data, error } = await supabase
        .from('onboardings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, onboarding: this.formatOnboarding(data) };
    } catch (error) {
      console.error('Error updating onboarding status:', error);
      return { success: false, error: error.message };
    }
  }

  static async markNoShowReachedOut(id, reachedOut = true, notes = '') {
    try {
      const { data, error } = await supabase
        .from('onboardings')
        .update({
          no_show_reached_out: reachedOut,
          no_show_reached_out_date: reachedOut ? new Date().toISOString() : null,
          no_show_notes: notes || null
        })
        .eq('id', id)
        .eq('attendance', 'no-show')
        .select()
        .single();

      if (error) throw error;
      return { success: true, onboarding: this.formatOnboarding(data) };
    } catch (error) {
      console.error('Error updating no-show status:', error);
      return { success: false, error: error.message };
    }
  }

  static async getNoShowFollowUps() {
    try {
      const { data, error } = await supabase
        .from('no_show_follow_ups')
        .select('*');

      if (error) throw error;
      return { success: true, followUps: data };
    } catch (error) {
      console.error('Error fetching no-show follow-ups:', error);
      return { success: false, error: error.message };
    }
  }

  // Team member requests completion — sets attendance to 'pending_approval'
  static async requestCompletion(id) {
    try {
      const { data, error } = await supabase
        .from('onboardings')
        .update({ attendance: 'pending_approval' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, onboarding: this.formatOnboarding(data) };
    } catch (error) {
      console.error('Error requesting completion:', error);
      return { success: false, error: error.message };
    }
  }

  // Admin approves a completion request
  static async approveCompletion(id) {
    try {
      const { data, error } = await supabase
        .from('onboardings')
        .update({ attendance: 'completed' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, onboarding: this.formatOnboarding(data) };
    } catch (error) {
      console.error('Error approving completion:', error);
      return { success: false, error: error.message };
    }
  }

  // Admin rejects a completion request — sends back to pending
  static async rejectCompletion(id) {
    try {
      const { data, error } = await supabase
        .from('onboardings')
        .update({ attendance: 'pending' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, onboarding: this.formatOnboarding(data) };
    } catch (error) {
      console.error('Error rejecting completion:', error);
      return { success: false, error: error.message };
    }
  }

  static async deleteOnboarding(id) {
    try {
      const { error } = await supabase
        .from('onboardings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting onboarding:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== STATS ====================

  static async getMonthlyStats(month) {
    try {
      const { data, error } = await supabase
        .rpc('get_monthly_stats', { target_month: month });

      if (error) throw error;
      return { success: true, stats: data };
    } catch (error) {
      console.error('Error fetching monthly stats:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== UTILITIES ====================

  static formatOnboarding(data) {
    if (!data) return null;

    return {
      id: data.id,
      employeeId: data.employee_id,
      employeeName: data.employee_name,
      clientName: data.client_name,
      accountNumber: data.account_number,
      sessionNumber: data.session_number,
      date: data.date,
      month: data.month,
      attendance: data.attendance,
      notes: data.notes,
      noShowReachedOut: data.no_show_reached_out,
      noShowReachedOutDate: data.no_show_reached_out_date,
      noShowNotes: data.no_show_notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  // Sync localStorage data to Supabase (migration helper)
  static async syncLocalStorageToSupabase() {
    try {
      const localData = localStorage.getItem('onboardings');
      if (!localData) {
        return { success: true, message: 'No local data to sync' };
      }

      const onboardings = JSON.parse(localData);
      let successCount = 0;
      let errorCount = 0;

      for (const ob of onboardings) {
        const result = await this.createOnboarding(ob);
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
          console.error('Failed to sync:', ob, result.error);
        }
      }

      return {
        success: true,
        message: `Synced ${successCount} sessions, ${errorCount} failed`,
        successCount,
        errorCount
      };
    } catch (error) {
      console.error('Error syncing localStorage to Supabase:', error);
      return { success: false, error: error.message };
    }
  }

  // Real-time subscription for onboardings
  static subscribeToOnboardings(callback) {
    const subscription = supabase
      .channel('onboardings-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'onboardings' },
        (payload) => {
          console.log('Onboarding change detected:', payload);
          callback(payload);
        }
      )
      .subscribe();

    return subscription;
  }

  static unsubscribe(subscription) {
    supabase.removeChannel(subscription);
  }
}
