import cloudinary from './cloudinary';

// Matches a standard Cloudinary delivery URL and pulls out the resource type
// plus the public_id (with its format extension still attached — the SDK
// separates that itself when building a signed URL).
const CLOUDINARY_URL_RE =
  /^https?:\/\/res\.cloudinary\.com\/[^/]+\/(image|video|raw)\/upload\/(?:v\d+\/)?([^?#]+)$/;

const DEFAULT_TTL_SECONDS = 30 * 60;

// Re-signs a Cloudinary delivery URL with a short-lived, expiring signature.
// Safe to call on any URL: assets still uploaded as access_mode "public"
// simply ignore the signature and keep serving normally, while assets
// uploaded as access_mode "authenticated" require it. Non-Cloudinary URLs
// (or anything already missing) are returned unchanged.
export const toSignedUrl = <T extends string | null | undefined>(
  rawUrl: T,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): T => {
  if (!rawUrl) return rawUrl;
  const match = rawUrl.match(CLOUDINARY_URL_RE);
  if (!match) return rawUrl;
  const [, resourceType, publicIdWithFormat] = match;
  try {
    return cloudinary.url(publicIdWithFormat, {
      resource_type: resourceType,
      type: 'upload',
      sign_url: true,
      secure: true,
      expires_at: Math.floor(Date.now() / 1000) + ttlSeconds,
    }) as T;
  } catch {
    return rawUrl;
  }
};

const MEDIA_FIELDS = ['videoUrl', 'pdfUrl', 'imageUrl', 'modelUrl', 'audioUrl'] as const;

// Returns a shallow copy of any object shaped like a Lesson / LessonPart
// media block with its Cloudinary URL fields re-signed.
export const signMediaFields = <T extends Record<string, any>>(obj: T): T => {
  const copy: any = { ...obj };
  for (const field of MEDIA_FIELDS) {
    if (copy[field]) copy[field] = toSignedUrl(copy[field]);
  }
  return copy;
};
