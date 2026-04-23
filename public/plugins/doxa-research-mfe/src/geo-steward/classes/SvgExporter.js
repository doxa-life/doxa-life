/**
 * SvgExporter.js
 *
 * Static utility class for serializing an `<svg>` element to a string, a
 * data URL, or triggering a file download. Keeps these three concerns in
 * one place so callers don't have to reinvent XMLSerializer + Blob dance.
 *
 * Usage:
 *   const canvas = new SvgCanvas({ width: 400, height: 300 })
 *   canvas.append(new SvgCircle({ cx: 200, cy: 150, r: 50, fill: 'red' }).render())
 *   SvgExporter.download(canvas.el, 'my-svg')
 *   const dataUrl = SvgExporter.toDataUrl(canvas.el)
 */

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n'

/**
 * Base64-encode a UTF-8 string via `btoa` with proper unicode handling.
 * @param {string} str
 * @returns {string}
 */
function utf8ToBase64(str) {
  // TextEncoder produces UTF-8 bytes; btoa works on binary strings.
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

export class SvgExporter {
  /**
   * Serialize an SVG root element to a full XML string with header.
   * @param {SVGElement} svgEl
   * @param {Object} [opts]
   * @param {boolean} [opts.includeHeader=true]
   * @returns {string}
   */
  static toString(svgEl, opts = {}) {
    if (!(svgEl instanceof Element)) {
      throw new TypeError('SvgExporter.toString: svgEl must be an Element')
    }
    const includeHeader = opts.includeHeader ?? true
    const serializer = new XMLSerializer()
    const xml = serializer.serializeToString(svgEl)
    return includeHeader ? (XML_HEADER + xml) : xml
  }

  /**
   * Produce a `data:image/svg+xml;base64,...` URL.
   * @param {SVGElement} svgEl
   * @returns {string}
   */
  static toDataUrl(svgEl) {
    const xml = SvgExporter.toString(svgEl, { includeHeader: false })
    return `data:image/svg+xml;base64,${utf8ToBase64(xml)}`
  }

  /**
   * Produce a Blob of type `image/svg+xml`.
   * @param {SVGElement} svgEl
   * @returns {Blob}
   */
  static toBlob(svgEl) {
    const xml = SvgExporter.toString(svgEl)
    return new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
  }

  /**
   * Trigger a browser download of the SVG as a .svg file.
   * @param {SVGElement} svgEl
   * @param {string} [filename='export']   Without extension
   */
  static download(svgEl, filename = 'export') {
    const blob = SvgExporter.toBlob(svgEl)
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = /\.svg$/i.test(filename) ? filename : `${filename}.svg`
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}
