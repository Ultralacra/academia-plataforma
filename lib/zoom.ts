import { NextRequest, NextResponse } from "next/server";

const ZOOM_BASE = "https://api.zoom.us/v2";

// ─── OAuth Cookie Helpers ──────────────────────────────────────────────────

interface ZoomTokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user?: { id: string; email: string; display_name: string };
}

function parseZoomCookie(req: NextRequest): ZoomTokenData | null {
  const raw = req.cookies.get("zoom_tokens")?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function doRefreshZoomToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const credentials = Buffer.from(
    `${getClientId()}:${getClientSecret()}`,
  ).toString("base64");

  const res = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zoom token refresh failed: ${res.status} ${err}`);
  }

  return res.json();
}

/**
 * Gets a valid access token: tries S2S first, falls back to OAuth cookie with auto-refresh.
 * Returns { accessToken, setCookieHeader? }.
 * Caller should forward setCookieHeader on the response to persist refreshed tokens.
 */
export async function getAccessToken(
  req: NextRequest,
): Promise<{ accessToken: string; setCookieHeader?: string }> {
  // 1. Try OAuth from cookie first (has user-level scopes for recordings)
  const data = parseZoomCookie(req);
  if (data) {
    const FIVE_MIN = 5 * 60 * 1000;

    if (Date.now() < data.expires_at - FIVE_MIN) {
      return { accessToken: data.access_token };
    }

    // Token expired or about to expire — refresh
    try {
      const refreshed = await doRefreshZoomToken(data.refresh_token);
      const newCookieData = JSON.stringify({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: Date.now() + refreshed.expires_in * 1000,
        user: data.user,
      });
      const cookieHeader = `zoom_tokens=${encodeURIComponent(newCookieData)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
      return { accessToken: refreshed.access_token, setCookieHeader: cookieHeader };
    } catch (err) {
      console.error("[zoom] OAuth refresh failed, trying S2S:", err);
    }
  }

  // 2. Fallback: S2S (no user login needed — limited scopes)
  try {
    const s2sToken = await getS2SToken();
    return { accessToken: s2sToken };
  } catch (err) {
    console.warn("[zoom] S2S auth also failed:", err);
  }

  throw new Error("No hay token de acceso válido. Conecta tu cuenta Zoom.");
}

function getClientId() {
  return process.env.ZOOM_CLIENT_ID ?? "";
}

function getClientSecret() {
  return process.env.ZOOM_CLIENT_SECRET ?? "";
}

function getRedirectUri() {
  return process.env.ZOOM_REDIRECT_URI ?? "";
}

function getAccountId() {
  return process.env.ZOOM_ACCOUNT_ID ?? "";
}

// ─── Server-to-Server Auth ──────────────────────────────────────────────────

export async function getS2SToken(): Promise<string> {
  const accountId = getAccountId();
  const clientId = getClientId();
  const clientSecret = getClientSecret();

  if (!accountId || !clientId || !clientSecret) {
    throw new Error("Faltan variables ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID o ZOOM_CLIENT_SECRET");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "account_credentials",
      account_id: accountId,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zoom S2S token failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.access_token;
}

// ─── OAuth (General app) ────────────────────────────────────────────────────

export function getZoomAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    state: state || "academia",
    scope: "meeting:read:list_meetings cloud_recording:read:list_user_recordings cloud_recording:read:list_recording_files cloud_recording:read:meeting_transcript user:read:user",
  });
  return `https://zoom.us/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}> {
  const credentials = Buffer.from(
    `${getClientId()}:${getClientSecret()}`,
  ).toString("base64");

  const res = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zoom token exchange failed: ${res.status} ${err}`);
  }

  return res.json();
}

export async function getZoomUser(accessToken: string): Promise<{
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
}> {
  const res = await fetch(`${ZOOM_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error(`Zoom user fetch failed: ${res.status}`);
  return res.json();
}

export interface ZoomRecordingFile {
  id: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: string;
  file_size: number;
  download_url: string;
  status: string;
  recording_type: string;
}

export interface ZoomRecording {
  id: string;
  meeting_id: string;
  topic: string;
  start_time: string;
  end_time: string;
  duration: number;
  total_size: number;
  recording_count: number;
  recording_files: ZoomRecordingFile[];
}

export interface ZoomMeeting {
  id: string;
  topic: string;
  start_time: string;
  end_time: string;
  duration: number;
  status: string;
  type: number;
}

export async function listUserRecordings(
  accessToken: string,
  userId: string = "me",
  params?: { from?: string; to?: string; page_size?: number },
): Promise<{ meetings: ZoomRecording[]; next_page_token?: string }> {
  const query = new URLSearchParams();
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  if (params?.page_size) query.set("page_size", String(params.page_size));

  const qs = query.toString();
  const url = `${ZOOM_BASE}/users/${userId}/recordings${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zoom recordings list failed: ${res.status} ${err}`);
  }

  return res.json();
}

export async function getMeetingRecordings(
  accessToken: string,
  meetingId: string,
): Promise<ZoomRecording> {
  const res = await fetch(`${ZOOM_BASE}/meetings/${meetingId}/recordings`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zoom meeting recordings failed: ${res.status} ${err}`);
  }

  return res.json();
}

export async function downloadRecordingFile(
  downloadUrl: string,
  accessToken: string,
): Promise<ArrayBuffer> {
  const res = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`Zoom download failed: ${res.status}`);
  }

  return res.arrayBuffer();
}

export async function listMeetings(
  accessToken: string,
  userId: string = "me",
  params?: { type?: string; page_size?: number; next_page_token?: string },
): Promise<{ meetings: ZoomMeeting[]; next_page_token?: string }> {
  const query = new URLSearchParams();
  if (params?.type) query.set("type", params.type);
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.next_page_token)
    query.set("next_page_token", params.next_page_token);

  const qs = query.toString();
  const url = `${ZOOM_BASE}/users/${userId}/meetings${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zoom meetings list failed: ${res.status} ${err}`);
  }

  return res.json();
}

// ─── Users ───────────────────────────────────────────────────────────────────

export interface ZoomUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  type: number;
  role_name: string;
  status: string;
  pmi: number;
  timezone: string;
  created_at: string;
  last_login_time: string;
  plan_type: string;
  dept: string;
}

export async function listUsers(
  accessToken: string,
  params?: { page_size?: number; next_page_token?: string; role_id?: string },
): Promise<{ users: ZoomUser[]; next_page_token?: string }> {
  const query = new URLSearchParams();
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.next_page_token) query.set("next_page_token", params.next_page_token);
  if (params?.role_id) query.set("role_id", params.role_id);

  const qs = query.toString();
  const url = `${ZOOM_BASE}/users${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zoom users list failed: ${res.status} ${err}`);
  }

  return res.json();
}

export async function listSubAccounts(
  accessToken: string,
): Promise<{ accounts: Array<{ id: string; account_name: string; account_number: string; owner_email: string; subscription_type: number }> }> {
  const url = `${ZOOM_BASE}/accounts`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zoom sub-accounts list failed: ${res.status} ${err}`);
  }

  return res.json();
}
