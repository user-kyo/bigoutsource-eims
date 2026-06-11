let io = null;

function userRoom(userId) {
  return `user:${userId}`;
}

export function setRealtimeServer(server) {
  io = server;
}

export function emitUserAccessUpdated(userId, user, reason = 'access.updated') {
  if (!io || !userId) return;

  io.to(userRoom(userId)).emit('access:updated', {
    reason,
    user,
    emittedAt: new Date().toISOString(),
  });
}

export function emitUserAccessRevoked(userId, reason = 'access.revoked') {
  if (!io || !userId) return;

  io.to(userRoom(userId)).emit('access:revoked', {
    reason,
    emittedAt: new Date().toISOString(),
  });

  setTimeout(() => {
    io?.in(userRoom(userId)).disconnectSockets(true);
  }, 250);
}
