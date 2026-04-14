export const ONLINE_THRESHOLD_MS = 60_000;

export const isOnline = (lastSeenAt?: string) => {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS;
};

export const formatLastSeen = (lastSeenAt?: string) => {
  if (!lastSeenAt) return "offline";
  const diff = Date.now() - new Date(lastSeenAt).getTime();
  if (diff < ONLINE_THRESHOLD_MS) return "online";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `last seen ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `last seen ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `last seen ${days}d ago`;
  return `last seen ${new Date(lastSeenAt).toLocaleDateString()}`;
};
