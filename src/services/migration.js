import ApiService from './api.js';

/**
 * Migration utility to transfer data from localStorage to PostgreSQL
 */
class MigrationService {
  /**
   * Migrate all onboardings from localStorage to PostgreSQL
   */
  static async migrateOnboardingsToDatabase() {
    try {
      // Get data from localStorage
      const localStorageData = localStorage.getItem('onboardings');

      if (!localStorageData) {
        return {
          success: true,
          message: 'No data found in localStorage to migrate',
          migrated: 0
        };
      }

      const onboardings = JSON.parse(localStorageData);

      if (!Array.isArray(onboardings) || onboardings.length === 0) {
        return {
          success: true,
          message: 'No onboardings to migrate',
          migrated: 0
        };
      }

      console.log(`🔄 Migrating ${onboardings.length} onboardings to PostgreSQL...`);

      // Transform localStorage format to API format
      const transformedOnboardings = onboardings.map(ob => ({
        employeeId: ob.employeeId,
        clientName: ob.clientName,
        accountNumber: ob.accountNumber,
        sessionNumber: ob.sessionNumber || 1,
        attendance: ob.attendance || 'pending',
        date: ob.date
      }));

      // Bulk import to database
      const result = await ApiService.bulkCreateOnboardings(transformedOnboardings);

      console.log(`✅ Successfully migrated ${result.count} onboardings`);

      return {
        success: true,
        message: `Successfully migrated ${result.count} onboardings to database`,
        migrated: result.count
      };

    } catch (error) {
      console.error('❌ Migration failed:', error);
      return {
        success: false,
        message: `Migration failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Check if backend is available
   */
  static async checkBackendConnection() {
    try {
      const health = await ApiService.healthCheck();
      return health.status === 'ok' && health.database === 'connected';
    } catch (error) {
      console.error('Backend connection check failed:', error);
      return false;
    }
  }

  /**
   * Get data source status
   */
  static async getDataSourceStatus() {
    const backendAvailable = await this.checkBackendConnection();
    const localStorageData = localStorage.getItem('onboardings');
    const hasLocalData = localStorageData && JSON.parse(localStorageData).length > 0;

    return {
      backendAvailable,
      hasLocalData,
      recommended: backendAvailable ? 'database' : 'localStorage'
    };
  }
}

export default MigrationService;
