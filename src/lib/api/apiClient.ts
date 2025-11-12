import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { signOut } from 'next-auth/react';

// Helper function to handle API errors consistently
const handleApiError = (error: AxiosError) => {
  // Log the error
  console.error('API Error:', error);

  // Handle specific error cases
  if (error.response) {
    // The request was made and the server responded with a status code outside the 2xx range
    const status = error.response.status;
    const data = error.response.data as any;

    // Handle authentication errors
    if (status === 401) {
      // Logout the user if token is invalid/expired
      signOut({ callbackUrl: '/auth/login' });
      return Promise.reject(new Error('Authentication required. Please sign in again.'));
    }

    // Handle permission errors
    if (status === 403) {
      return Promise.reject(new Error(data.message || 'You do not have permission to perform this action.'));
    }

    // Handle validation errors
    if (status === 422 || status === 400) {
      const message = data.message || 'Validation failed';
      return Promise.reject(new Error(message));
    }

    // Handle not found errors
    if (status === 404) {
      return Promise.reject(new Error(data.message || 'Resource not found'));
    }

    // Handle server errors
    if (status >= 500) {
      return Promise.reject(new Error('Server error. Please try again later.'));
    }

    // Handle other error responses
    return Promise.reject(new Error(data.message || 'An error occurred'));
  } else if (error.request) {
    // The request was made but no response was received
    return Promise.reject(new Error('No response from server. Please check your connection.'));
  } else {
    // Something happened in setting up the request
    return Promise.reject(new Error(error.message || 'An unexpected error occurred'));
  }
};

class ApiClient {
  private client: AxiosInstance;

  constructor(config: AxiosRequestConfig = {}) {
    // Create axios instance with default configuration
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      ...config,
    });

    // Add request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // You could add auth tokens or other headers here
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error: AxiosError) => {
        return handleApiError(error);
      }
    );
  }

  // GET request
  async get<T = any>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.get<T>(url, { ...config, params });
      return response.data;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  // POST request
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.post<T>(url, data, config);
      return response.data;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  // PUT request
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.put<T>(url, data, config);
      return response.data;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  // PATCH request
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.patch<T>(url, data, config);
      return response.data;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  // DELETE request
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.delete<T>(url, config);
      return response.data;
    } catch (error) {
      return Promise.reject(error);
    }
  }
}

// Create and export singleton instance
const apiClient = new ApiClient();
export default apiClient; 