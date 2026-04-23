/**
 * SvgCanvas.js
 *
 * Root `<svg>` element factory. Holds the viewBox and pixel dimensions and
 * provides `.append(child)` for composing children shapes/groups.
 *
 * Usage:
 *   const canvas = new SvgCanvas({ width: 800, height: 600 })
 *   canvas.append(new SvgPolygon({ points: [...] }).render())
 *   document.body.appendChild(canvas.el)
 */

import { SVG_NAMESPACE } from './SvgShape.js'

/**
 * @typedef {Object} SvgCanvasOptions
 * @property {number} [width=800]
 * @property {number} [height=600]
 * @property {string} [viewBox]         Defaults to `0 0 width height`
 * @property {string} [background]      Optional background color
 * @property {string} [preserveAspectRatio='xMidYMid meet']
 */

export class SvgCanvas {
  /** @param {SvgCanvasOptions} [opts={}] */
  constructor(opts = {}) {
    this.width  = opts.width  ?? 800
    this.height = opts.height ?? 600
    this.viewBox = opts.viewBox ?? `0 0 ${this.width} ${this.height}`
    this.background = opts.background ?? null
    this.preserveAspectRatio = opts.preserveAspectRatio ?? 'xMidYMid meet'

    this.el = document.createElementNS(SVG_NAMESPACE, 'svg')
    this.el.setAttribute('xmlns',    SVG_NAMESPACE)
    this.el.setAttribute('width',    String(this.width))
    this.el.setAttribute('height',   String(this.height))
    this.el.setAttribute('viewBox',  this.viewBox)
    this.el.setAttribute('preserveAspectRatio', this.preserveAspectRatio)

    if (this.background) {
      const bg = document.createElementNS(SVG_NAMESPACE, 'rect')
      bg.setAttribute('x', '0')
      bg.setAttribute('y', '0')
      bg.setAttribute('width',  '100%')
      bg.setAttribute('height', '100%')
      bg.setAttribute('fill', this.background)
      this.el.appendChild(bg)
    }
  }

  /**
   * Append a child element (from any shape's `.render()`).
   * @param {SVGElement|SVGElement[]} child
   * @returns {this}
   */
  append(child) {
    if (Array.isArray(child)) {
      for (const c of child) this.el.appendChild(c)
    } else {
      this.el.appendChild(child)
    }
    return this
  }

  /** Remove every child (but keep the root `<svg>`). */
  clear() {
    while (this.el.firstChild) this.el.removeChild(this.el.firstChild)
    return this
  }

  /**
   * Update the viewBox.
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   */
  setViewBox(x, y, w, h) {
    this.viewBox = `${x} ${y} ${w} ${h}`
    this.el.setAttribute('viewBox', this.viewBox)
    return this
  }
}
