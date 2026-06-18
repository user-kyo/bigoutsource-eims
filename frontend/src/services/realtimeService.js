import { io } from 'socket.io-client';
import { getAuthToken } from '../lib/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function socketBaseUrl() {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return String(API_BASE_URL || '').replace(/\/api\/?$/, '');
  }
}

export function connectAccessSocket({ onAccessUpdated, onAccessRevoked }) {
  const token = getAuthToken();
  if (!token) return () => {};

  const socket = io(socketBaseUrl(), {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('access:updated', onAccessUpdated);
  socket.on('access:revoked', onAccessRevoked);

  return () => {
    socket.off('access:updated', onAccessUpdated);
    socket.off('access:revoked', onAccessRevoked);
    socket.disconnect();
  };
}
