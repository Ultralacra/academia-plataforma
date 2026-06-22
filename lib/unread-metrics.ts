"use client";

const STORAGE_KEY = "emmaUnreadMetrics";

export interface UnreadMetrics {
  totalUnread: number;
  sessions: { date: string; count: number }[];
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function loadMetrics(): UnreadMetrics {
  if (typeof window === "undefined") return { totalUnread: 0, sessions: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { totalUnread: 0, sessions: [] };
}

export function trackUnreadReceived(count: number) {
  if (typeof window === "undefined" || count <= 0) return;
  try {
    const metrics = loadMetrics();
    metrics.totalUnread += count;

    const today = getToday();
    const todaySession = metrics.sessions.find((s) => s.date === today);
    if (todaySession) {
      todaySession.count += count;
    } else {
      metrics.sessions.push({ date: today, count });
    }

    // Keep last 90 days only
    if (metrics.sessions.length > 90) {
      metrics.sessions = metrics.sessions.slice(-90);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics));
  } catch {
    // ignore
  }
}

export function trackUnreadRead(count: number) {
  if (typeof window === "undefined" || count <= 0) return;
  try {
    const metrics = loadMetrics();
    const today = getToday();
    const todaySession = metrics.sessions.find((s) => s.date === today);
    if (todaySession) {
      todaySession.read = (todaySession.read || 0) + count;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics));
  } catch {
    // ignore
  }
}

export function getUnreadStats() {
  const metrics = loadMetrics();
  const today = getToday();
  const todaySession = metrics.sessions.find((s) => s.date === today);
  return {
    totalReceived: metrics.totalUnread,
    todayReceived: todaySession?.count || 0,
    todayRead: todaySession?.read || 0,
    todayUnreadRate:
      todaySession?.count
        ? ((todaySession.count - (todaySession.read || 0)) / todaySession.count) * 100
        : 0,
    sessions: metrics.sessions,
  };
}
