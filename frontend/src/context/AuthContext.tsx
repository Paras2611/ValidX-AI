import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<User>;
  register: (email: string, password: string, fullName: string) => Promise<User>;
  logout: () => void;
  switchRole: (role: UserRole) => Promise<User | undefined>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SEED_USERS: Record<UserRole, { email: string; pass: string }> = {
  applicant: { email: 'applicant@validx.ai', pass: 'Password@123' },
  officer: { email: 'officer@validx.ai', pass: 'Password@123' },
  compliance: { email: 'compliance@validx.ai', pass: 'Password@123' },
  admin: { email: 'admin@validx.ai', pass: 'Password@123' },
  auditor: { email: 'auditor@validx.ai', pass: 'Password@123' },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('validx_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await api.auth.me();
          setUser(res.user);
        } catch (err) {
          console.error('Session expired or invalid:', err);
          localStorage.removeItem('validx_token');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email: string, password: string = 'Password@123'): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await api.auth.login({ email, password });
      localStorage.setItem('validx_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, fullName: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await api.auth.register({ email, password, full_name: fullName });
      localStorage.setItem('validx_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('validx_token');
    setToken(null);
    setUser(null);
  };

  const switchRole = async (targetRole: UserRole): Promise<User | undefined> => {
    const seed = SEED_USERS[targetRole];
    if (seed) {
      return await login(seed.email, seed.pass);
    }
    return undefined;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
