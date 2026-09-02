/**
 * Helper utility to convert any Google Drive sharing or view link 
 * into a direct embeddable image URL.
 * 
 * Supports:
 * - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID
 * - https://lh3.googleusercontent.com/d/FILE_ID
 */
export function formatGoogleDriveImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();

  // If already a direct lh3 googleusercontent link
  if (trimmed.includes('lh3.googleusercontent.com/d/')) {
    return trimmed;
  }

  // Check for standard drive.google.com/file/d/<id>
  const fileIdMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileIdMatch && fileIdMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
  }

  // Check for ?id=<id> or &id=<id>
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${idParamMatch[1]}`;
  }

  // Return original url if not a google drive link (e.g. standard http or base64)
  return trimmed;
}

/**
 * Official Google Drive link for Sovannaphumi School logo provided by user:
 * https://drive.google.com/file/d/1AHlIse7sV5KwQ9EOzhLl6ZPuJhvUz1km/view?usp=sharing
 */
export const DEFAULT_GOOGLE_DRIVE_LOGO_LINK = 'https://drive.google.com/file/d/1AHlIse7sV5KwQ9EOzhLl6ZPuJhvUz1km/view?usp=sharing';
export const DEFAULT_DIRECT_LOGO_URL = formatGoogleDriveImageUrl(DEFAULT_GOOGLE_DRIVE_LOGO_LINK);
