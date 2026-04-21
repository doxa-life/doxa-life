// Port of doxa_get_video_urls() / doxa_get_video_url() from
// marketing-theme/functions.php. Returns the Vimeo embed URL for the
// current language, falling back to English.

const VIDEO_URLS: Record<string, string> = {
  en: 'https://player.vimeo.com/video/1143355099?h=39f8c1f131&badge=0&autopause=0&player_id=0&app_id=58479',
  es: 'https://player.vimeo.com/video/1183374525?h=003bb3e2c0&badge=0&autopause=0&player_id=0&app_id=58479',
  fr: 'https://player.vimeo.com/video/1174779547?h=8c00c1c764&badge=0&autopause=0&player_id=0&app_id=58479'
}

export function getVideoUrl(langCode: string): string {
  return VIDEO_URLS[langCode] ?? VIDEO_URLS.en!
}
