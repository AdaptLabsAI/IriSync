import { useContext } from 'react';
import { createContext } from 'react';

// User type definition
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'user' | 'admin' | 'editor';
}

// Authentication context type
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

// Create context with default values
export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  login: async () => {},
  logout: async () => {},
  signup: async () => {},
  resetPassword: async () => {},
});

// Hook to use authentication context
export function useAuth() {
  return useContext(AuthContext);
} 