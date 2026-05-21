// Vimeo embed node — the editor counterpart to @tiptap/extension-youtube,
// so an authored Vimeo URL becomes a player iframe in both the editor and
// the server-side renderer (server/utils/renderTiptap.ts via generateHTML).
// Adapted from campaigns-sever's Vimeo extension, trimmed to the options
// marketing content needs.
//
// `src` stores only the numeric Vimeo video id; renderHTML builds the
// player.vimeo.com URL from it. Keeping the stored value digits-only lets
// server/utils/tiptapValidate.ts accept it without any URL parsing.
//
// No node view — like the Verse extension we keep this framework-agnostic
// (no @tiptap/vue-3, no DOM) so generateHTML stays Vue-free on the server.
// ProseMirror renders the node straight from renderHTML in the editor.

import { Node, mergeAttributes } from '@tiptap/core'

export interface VimeoOptions {
  width: number
  height: number
  allowFullscreen: boolean
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    vimeo: {
      // Insert a Vimeo embed from any Vimeo URL. Returns false (no-op)
      // when the URL has no recognizable numeric video id.
      setVimeoVideo: (options: { src: string }) => ReturnType
    }
  }
}

// Pull the numeric video id out of the common Vimeo URL shapes:
// vimeo.com/123456789, player.vimeo.com/video/123456789, and the
// channels / groups / album paths. Returns null when none match.
export function getVimeoVideoId(url: string): string | null {
  if (!url) return null
  const patterns = [
    /(?:www\.|player\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^/]*\/videos\/|album\/\d+\/video\/|video\/|)(\d+)/i,
    /vimeo\.com\/(\d+)/i
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

export const Vimeo = Node.create<VimeoOptions>({
  name: 'vimeo',
  group: 'block',
  draggable: true,

  addOptions() {
    return {
      width: 640,
      height: 360,
      allowFullscreen: true,
      HTMLAttributes: {}
    }
  },

  addAttributes() {
    return {
      src: { default: null },
      width: { default: this.options.width },
      height: { default: this.options.height }
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-vimeo-video]' }]
  },

  addCommands() {
    return {
      setVimeoVideo:
        (options: { src: string }) =>
          ({ commands }) => {
            const videoId = getVimeoVideoId(options.src)
            if (!videoId) return false
            return commands.insertContent({
              type: this.name,
              attrs: { src: videoId }
            })
          }
    }
  },

  renderHTML({ HTMLAttributes }) {
    const videoId = HTMLAttributes.src
    const width = HTMLAttributes.width ?? this.options.width
    const height = HTMLAttributes.height ?? this.options.height
    return [
      'div',
      { 'data-vimeo-video': '' },
      [
        'iframe',
        mergeAttributes(this.options.HTMLAttributes, {
          src: videoId ? `https://player.vimeo.com/video/${videoId}` : '',
          width,
          height,
          frameborder: '0',
          allow: 'autoplay; fullscreen; picture-in-picture',
          allowfullscreen: this.options.allowFullscreen ? 'true' : null
        })
      ]
    ]
  }
})
