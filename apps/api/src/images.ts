/**
 * Photos are stored as data URLs in the database. API responses carry a short
 * link (`/api/images/:kind/:id?v=...`) instead of the whole image, so lists stay
 * light; the `v` query changes whenever the row changes, so clients can cache.
 */
export type ImageKind = "items" | "stock" | "users";

const IMAGE_LINK = /^\/api\/images\/(items|stock|users)\/[0-9a-f-]{36}(\?.*)?$/i;
const DATA_URL = /^data:([a-z]+\/[a-z0-9.+-]+);base64,(.*)$/is;
// Raster formats only: an SVG served from this origin could run scripts.
const SERVED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/heic"]);

export function imageLink(kind: ImageKind, id: string, stored: string | null | undefined, updatedAt?: Date | null) {
  if (!stored) {
    return null;
  }

  if (!stored.startsWith("data:")) {
    // Links saved before photos were uploaded (e.g. an external https URL).
    return stored;
  }

  return `/api/images/${kind}/${id}?v=${updatedAt ? updatedAt.getTime() : 0}`;
}

/**
 * Normalizes an `imageUrl` sent by a client. A client that echoes back the
 * link it received means "keep the current photo", so it becomes `undefined`.
 */
export function resolveImageInput(value: string | null | undefined) {
  if (typeof value === "string" && IMAGE_LINK.test(value)) {
    return undefined;
  }

  return value;
}

export function decodeDataUrl(value: string) {
  const match = DATA_URL.exec(value);

  const contentType = match?.[1]?.toLowerCase();

  if (!contentType || match?.[2] === undefined || !SERVED_TYPES.has(contentType)) {
    return null;
  }

  return {
    contentType,
    body: Buffer.from(match[2], "base64")
  };
}
