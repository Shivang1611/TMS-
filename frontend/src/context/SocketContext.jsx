import { createContext, useContext } from 'react';
import useSocket from '../hooks/useSocket';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const token = user ? localStorage.getItem('tms_token') : null;
  const socket = useSocket(token);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useTaskSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useTaskSocket must be used within SocketProvider');
  return ctx;
}
