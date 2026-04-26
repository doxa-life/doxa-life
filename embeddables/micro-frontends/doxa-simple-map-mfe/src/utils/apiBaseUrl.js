/**
 * apiBaseUrl.js — Resolve the API base URL at runtime.
 *
 * Priority order:
 *   1. window.DOXA_MAP_API_URL   — set by WordPress theme/plugin at runtime (no rebuild needed)
 *   2. import.meta.env.VITE_API_BASE_URL — baked in at Vite build time (.env file)
 *   3. '' (empty string)          — relative URLs; REST calls will 404 on WordPress
 *
 * WordPress usage (add to wp_head or theme functions.php):
 *   <script>window.DOXA_MAP_API_URL = 'https://pray.doxa.life';</script>
 *
 * This lets WordPress set the API URL in PHP without requiring a Vite rebuild:
 *   wp_add_inline_script('doxa-map', "window.DOXA_MAP_API_URL='" . get_option('doxa_api_url') . "';", 'before');
 */
export function getApiBaseUrl() {
  return (typeof window !== 'undefined' && window.DOXA_MAP_API_URL)
    || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
    || '';
}
