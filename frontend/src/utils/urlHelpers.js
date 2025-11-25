/**
 * Get the base URL for static file uploads.
 * Uploads are served from the backend root (/uploads), not under /api.
 *
 * Examples:
 * - VITE_API_BASE_URL="https://api.example.com/api" -> "https://api.example.com"
 * - VITE_API_BASE_URL="/api" -> ""
 * - VITE_API_BASE_URL="https://api.example.com" -> "https://api.example.com"
 */
export const getUploadsBaseUrl = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  // If API URL ends with /api, remove it to get the backend root
  if (apiBaseUrl.endsWith('/api')) {
    return apiBaseUrl.slice(0, -4);
  }
  // If it's a full URL like "https://api.example.com", use as-is
  if (apiBaseUrl.startsWith('http')) {
    return apiBaseUrl;
  }
  return '';
};

// Pre-computed base URL for static uploads
export const UPLOADS_BASE_URL = getUploadsBaseUrl();

/**
 * Get the full URL for an uploaded image
 * @param {string} path - The path returned from API (e.g., "/uploads/images/abc.jpg")
 * @returns {string} Full URL to the image
 */
export const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${UPLOADS_BASE_URL}${path}`;
};
