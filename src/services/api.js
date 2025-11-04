// API service for communicating with PostgreSQL backend

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  // Generic fetch wrapper with error handling
  static async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Employee endpoints
  static async getEmployees() {
    return this.request('/employees');
  }

  static async getEmployee(id) {
    return this.request(`/employees/${id}`);
  }

  static async createEmployee(employeeData) {
    return this.request('/employees', {
      method: 'POST',
      body: JSON.stringify(employeeData),
    });
  }

  static async updateEmployee(id, employeeData) {
    return this.request(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(employeeData),
    });
  }

  static async deleteEmployee(id) {
    return this.request(`/employees/${id}`, {
      method: 'DELETE',
    });
  }

  // Onboarding endpoints
  static async getOnboardings(filters = {}) {
    const params = new URLSearchParams();

    if (filters.employee_id) params.append('employee_id', filters.employee_id);
    if (filters.month) params.append('month', filters.month);
    if (filters.attendance) params.append('attendance', filters.attendance);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);

    const queryString = params.toString();
    return this.request(`/onboardings${queryString ? `?${queryString}` : ''}`);
  }

  static async getOnboarding(id) {
    return this.request(`/onboardings/${id}`);
  }

  static async createOnboarding(onboardingData) {
    return this.request('/onboardings', {
      method: 'POST',
      body: JSON.stringify(onboardingData),
    });
  }

  static async updateOnboarding(id, onboardingData) {
    return this.request(`/onboardings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(onboardingData),
    });
  }

  static async deleteOnboarding(id) {
    return this.request(`/onboardings/${id}`, {
      method: 'DELETE',
    });
  }

  static async bulkCreateOnboardings(onboardings) {
    return this.request('/onboardings/bulk', {
      method: 'POST',
      body: JSON.stringify({ onboardings }),
    });
  }

  // Health check
  static async healthCheck() {
    try {
      const response = await fetch(`${API_URL.replace('/api', '')}/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      return { status: 'error', error: error.message };
    }
  }
}

export default ApiService;
