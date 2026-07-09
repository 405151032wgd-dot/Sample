import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState({ id: 1, name: '申请人', email: 'admin@company.com', role: 'admin', department: '', department_id: 1 });
  const [loading, setLoading] = useState(false);

  // Auto-configure as admin without login
  useEffect(() => {
    getMe().then(data => {
      setUser(data.user);
    }).catch(() => {
      // If server not available, use default
      setUser({ id: 1, name: '申请人', email: 'admin@company.com', role: 'admin', department: '', department_id: 1 });
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin: ['admin','super_admin'].includes(user?.role) }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
