// Port of the resource lists in marketing-theme/shortcodes/general-resources-shortcode.php.
// Keeps one source of truth per list; the <GeneralResources> component
// renders either `GENERAL_RESOURCES_NO_IMAGE` or
// `DOCUMENT_RESOURCES_NO_IMAGE` depending on the `useDocuments` flag,
// and always renders `GENERAL_RESOURCES_WITH_IMAGE` above it.

const S3_URL = 'https://s3.doxa.life/'

export interface ResourceWithImage {
  key: string
  title: string
  imageUrl: string
  style?: string
  downloadType: 'file' | 'link'
  downloadLink: (lang: string) => string
  hasTranslation: (lang: string) => boolean
}

export interface ResourceNoImage {
  key: string
  title: string
  downloadType: 'file' | 'link'
  downloadLink: (lang: string) => string
  // Whether the document has a translation for the current lang (used
  // for the "In English" italics hint the shortcode adds).
  hasTranslation: (lang: string) => boolean
}

// Languages each S3 document is available in. Direct port of
// `doxa_resources_translations_manifest()` in
// marketing-theme/functions.php — the single source of truth the
// shortcode consults via `doxa_has_document_translation()` and
// `doxa_get_s3_lang_code()`. Keep in sync when new translated files
// are uploaded to the S3 bucket.
const DOCUMENT_LANGS: Record<string, string[]> = {
  'doxa-playbook':          ['en', 'es'],
  'doxa-playbook-slides':   ['en'],
  'introduction-2025':      ['en'],
  'vision-and-values':      ['en'],
  'definitions':            ['en'],
  'doxa-endowment-policy':  ['en'],
  'initial-proposal':       ['en', 'es', 'fr']
}

// Per-language Vimeo URLs for the promo video — same ids as videoUrls.ts.
const VIDEO_LANGS = ['en', 'es', 'fr']

function s3LangCode(docId: string, lang: string): string {
  const langs = DOCUMENT_LANGS[docId] ?? ['en']
  return langs.includes(lang) ? lang : 'en'
}

function hasDocumentTranslation(docId: string, lang: string): boolean {
  const langs = DOCUMENT_LANGS[docId] ?? ['en']
  return langs.includes(lang)
}

function hasVideoTranslation(lang: string): boolean {
  return VIDEO_LANGS.includes(lang)
}

export function resourcesWithImage(videoUrl: (lang: string) => string): ResourceWithImage[] {
  return [
    {
      key: 'doxa_playbook',
      title: 'DOXA Playbook',
      imageUrl: '/assets/images/playbook.png',
      style: 'width: 55%;',
      downloadType: 'file',
      downloadLink: lang => `${S3_URL}documents/doxa-playbook-${s3LangCode('doxa-playbook', lang)}.pdf`,
      hasTranslation: lang => hasDocumentTranslation('doxa-playbook', lang)
    },
    {
      key: 'doxa_playbook_slides',
      title: 'DOXA Playbook Slides',
      imageUrl: '/assets/images/doxa-slides.png',
      style: 'width: 80%; padding-top: 10%; padding-bottom: 10%;',
      downloadType: 'file',
      downloadLink: lang => `${S3_URL}documents/doxa-playbook-slides-${s3LangCode('doxa-playbook-slides', lang)}.pdf`,
      hasTranslation: lang => hasDocumentTranslation('doxa-playbook-slides', lang)
    },
    {
      key: 'doxa_promo_video',
      title: 'DOXA Promo Video',
      imageUrl: '/assets/images/video.png',
      style: 'width: 80%; padding-top: 10%; padding-bottom: 10%;',
      downloadType: 'link',
      downloadLink: lang => videoUrl(lang),
      hasTranslation: lang => hasVideoTranslation(lang)
    }
  ]
}

export function generalResourcesNoImage(localePath: (p: string) => string): ResourceNoImage[] {
  return [
    {
      key: 'champion_tips',
      title: 'Champion Tips',
      downloadType: 'link',
      downloadLink: () => localePath('/resources/tips-for-prayer-champions/'),
      hasTranslation: () => true
    },
    {
      key: 'discussion_guide',
      title: 'Discussion Guide',
      downloadType: 'link',
      downloadLink: () => localePath('/resources/small-group-discussion-guide/'),
      hasTranslation: () => true
    },
    {
      key: 'talking_points',
      title: 'DOXA Campaign Talking Points',
      downloadType: 'link',
      downloadLink: () => localePath('/resources/talking-points/'),
      hasTranslation: () => true
    },
    {
      key: 'email_templates',
      title: 'Email Templates',
      downloadType: 'link',
      downloadLink: () => localePath('/resources/email-templates/'),
      hasTranslation: () => true
    }
  ]
}

export function documentResourcesNoImage(): ResourceNoImage[] {
  return [
    {
      key: 'introduction_2025',
      title: 'Introduction 2025',
      downloadType: 'file',
      downloadLink: lang => `${S3_URL}documents/introduction-2025-${s3LangCode('introduction-2025', lang)}.pptx`,
      hasTranslation: lang => hasDocumentTranslation('introduction-2025', lang)
    },
    {
      key: 'vision_and_values',
      title: 'Vision and Values',
      downloadType: 'file',
      downloadLink: lang => `${S3_URL}documents/vision-and-values-${s3LangCode('vision-and-values', lang)}.docx`,
      hasTranslation: lang => hasDocumentTranslation('vision-and-values', lang)
    },
    {
      key: 'definitions',
      title: 'Definitions',
      downloadType: 'file',
      downloadLink: lang => `${S3_URL}documents/definitions-${s3LangCode('definitions', lang)}.docx`,
      hasTranslation: lang => hasDocumentTranslation('definitions', lang)
    },
    {
      key: 'investment_policy_statement',
      title: 'Doxa Endowment Investment Policy Statement',
      downloadType: 'file',
      downloadLink: lang => `${S3_URL}documents/doxa-endowment-policy-${s3LangCode('doxa-endowment-policy', lang)}.docx`,
      hasTranslation: lang => hasDocumentTranslation('doxa-endowment-policy', lang)
    },
    {
      key: 'initial_proposal',
      title: 'Initial Proposal',
      downloadType: 'file',
      downloadLink: lang => `${S3_URL}documents/initial-proposal-${s3LangCode('initial-proposal', lang)}.pdf`,
      hasTranslation: lang => hasDocumentTranslation('initial-proposal', lang)
    }
  ]
}
