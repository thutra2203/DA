import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const PermissionContext = createContext({});

export const PermissionProvider = ({ children }) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setPermissions({}); setLoading(false); return; }
    api.get('/phan-quyen/my')
      .then(res => setPermissions(res.data))
      .catch(() => setPermissions({}))
      .finally(() => setLoading(false));
  }, [user]);

  const can = (module, action = 'xem') => {
    if (user?.role === 'ADMIN') return true;
    const p = permissions[module];
    if (!p) return false;
    const map = { xem: 'CoTheXem', them: 'CoTheThemMoi', sua: 'CoTheSua', xoa: 'CoTheXoa' };
    return !!p[map[action]];
  };

  return (
    <PermissionContext.Provider value={{ permissions, loading, can }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermission = () => useContext(PermissionContext);
