import { useState, useEffect, useCallback } from 'react';
import axios, { AxiosRequestConfig, AxiosError } from 'axios';

interface ApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  isFetching: boolean;
}

export function useApi<T = any>(
  url: string,
  config: AxiosRequestConfig = {},
  immediate = true
) {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    isLoading: immediate,
    error: null,
    isFetching: immediate
  });

  const fetchData = useCallback(async (customConfig: AxiosRequestConfig = {}) => {
    setState(prev => ({
      ...prev,
      isLoading: prev.data === null,
      isFetching: true,
      error: null
    }));

    try {
      const mergedConfig = { ...config, ...customConfig };
      const response = await axios(url, mergedConfig);

      setState({
        data: response.data,
        isLoading: false,
        error: null,
        isFetching: false
      });

      return response.data;
    } catch (err) {
      const error = err as AxiosError;
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch data';

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: new Error(errorMessage),
        isFetching: false
      }));

      // Log the error with the endpoint information
      console.error(`API Error [${url}]:`, error);
      
      throw new Error(errorMessage);
    }
  }, [url, config]);

  useEffect(() => {
    if (immediate) {
      fetchData();
    }
  }, [fetchData, immediate]);

  // Refetch function
  const refetch = useCallback((customConfig: AxiosRequestConfig = {}) => {
    return fetchData(customConfig);
  }, [fetchData]);

  // Mutation function for POST/PUT/DELETE operations
  const mutate = useCallback(async (
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    data?: any,
    customConfig: AxiosRequestConfig = {}
  ) => {
    setState(prev => ({
      ...prev,
      isFetching: true,
      error: null
    }));

    try {
      const mergedConfig = { 
        ...config,
        ...customConfig,
        method,
        data
      };
      
      const response = await axios(url, mergedConfig);

      // Automatically refetch GET data after a mutation if it's not a DELETE
      if (method !== 'DELETE' && config.method !== 'DELETE') {
        await fetchData();
      } else if (method === 'DELETE') {
        setState({
          data: null,
          isLoading: false,
          error: null,
          isFetching: false
        });
      }

      return response.data;
    } catch (err) {
      const error = err as AxiosError;
      const errorMessage = error.response?.data?.message || error.message || `Failed to ${method.toLowerCase()} data`;

      setState(prev => ({
        ...prev,
        error: new Error(errorMessage),
        isFetching: false
      }));

      console.error(`API ${method} Error [${url}]:`, error);
      throw new Error(errorMessage);
    }
  }, [url, config, fetchData]);

  return {
    ...state,
    refetch,
    post: (data?: any, customConfig?: AxiosRequestConfig) => mutate('POST', data, customConfig),
    put: (data?: any, customConfig?: AxiosRequestConfig) => mutate('PUT', data, customConfig),
    patch: (data?: any, customConfig?: AxiosRequestConfig) => mutate('PATCH', data, customConfig),
    delete: (customConfig?: AxiosRequestConfig) => mutate('DELETE', undefined, customConfig)
  };
}

export default useApi; 