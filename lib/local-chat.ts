export type LocalChatMessage = {
  id: string;
  room: string;
  sender: string;
  text: string;
  at: string; // ISO
};

function norm(room: string) {
  return (room || "").toLowerCase().trim();
}

export function loadLocalRoom(room: string): LocalChatMessage[] {
  try {
    const key = `localChat:${norm(room)}`;
    const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (!raw) return [];
    const arr = JSON.parse(raw) as LocalChatMessage[];
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch {
    return [];
  }
}

export function getLastRead(room: string, role: string): number {
  try {
    const k = `chatLastRead:${norm(room)}:${role}`;
    const v = typeof window !== "undefined" ? localStorage.getItem(k) : null;
    if (!v) return 0;
    return parseInt(v) || 0;
  } catch {
    return 0;
  }
}

export function countUnread(room: string, role: string): number {
  const msgs = loadLocalRoom(room);
  const last = getLastRead(room, role);
  return msgs.filter((m) => new Date(m.at).getTime() > last).length;
}

export function subscribeUnread(
  room: string,
  role: string,
  cb: (unread: number) => void
) {
  const nRoom = norm(room);
  function recalc() {
    cb(countUnread(nRoom, role));
  }
  const storageHandler = (e: StorageEvent) => {
    if (!e.key) return;
    if (
      e.key === `localChat:${nRoom}` ||
      e.key === `chatLastRead:${nRoom}:${role}` ||
      e.key === "chatLastReadPing"
    ) {
      recalc();
    }
  };
  window.addEventListener("storage", storageHandler);
  // Primera invocación
  recalc();
  return () => window.removeEventListener("storage", storageHandler);
}
