const BUNNY_ZONE = process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE!;
const BUNNY_KEY = process.env.NEXT_PUBLIC_BUNNY_STORAGE_ACCESS_KEY!;
const BUNNY_CDN = process.env.NEXT_PUBLIC_BUNNY_CDN_URL!;

const BUNNY_BASE = BUNNY_CDN;

export async function uploadToBunny(
  path: string,
  file: Buffer,
  contentType: string
): Promise<string> {
  const url = `${BUNNY_BASE}/${path}`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'AccessKey': BUNNY_KEY,
      'Content-Type': contentType,
    },
    body: file,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`Bunny upload failed: ${res.status} - ${text}`);
  }

  return `${BUNNY_CDN}/${path}`;
}

export async function downloadFromBunny(path: string): Promise<Buffer> {
  const res = await fetch(`${BUNNY_BASE}/${path}`, {
    headers: { 'AccessKey': BUNNY_KEY },
  });

  if (!res.ok) {
    throw new Error(`Bunny download failed: ${res.status}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

export async function deleteFromBunny(path: string): Promise<void> {
  const res = await fetch(`${BUNNY_BASE}/${path}`, {
    method: 'DELETE',
    headers: { 'AccessKey': BUNNY_KEY },
  });

  if (!res.ok) {
    throw new Error(`Bunny delete failed: ${res.status}`);
  }
}

export async function listBunnyDirectory(path: string): Promise<BunnyFile[]> {
  const res = await fetch(`${BUNNY_BASE}/${path}`, {
    headers: { 'AccessKey': BUNNY_KEY },
  });

  if (!res.ok) {
    throw new Error(`Bunny list failed: ${res.status}`);
  }

  return res.json();
}

export interface BunnyFile {
  Guid: string;
  Name: string;
  Path: string;
  Length: number;
  Size: number;
  LastChanged: string;
  IsDirectory: boolean;
  ServerId: number;
  ContentType: string;
}

export function getBunnyFileUrl(path: string): string {
  return `${BUNNY_CDN}/${path}`;
}