/**
 * SvgCircle.js
 *
 * Simple circle primitive. Used for legend swatches, point markers, and
 * decorations in the print layout.
 *
 * Usage:
 *   const c = new SvgCircle({ cx: 50, cy: 50, r: 20, fill: '#1ee6ff' })
 *   document.body.appendChild(c.render())
 */

import { SvgShape } from './SvgShape.js'

/**
 * @typedef {Object} SvgCircleOptions
 * @property {number} cx
 * @property {number} cy
 * @property {number} r
 * @property {string} [stroke]
 * @property {number} [strokeWidth]
 * @property {string} [fill]
 * @property {number} [opacity]
 * @property {string} [transform]
 * @property {string} [id]
 * @property {string} [className]
 */

export class SvgCircle extends SvgShape {
  /** @param {SvgCircleOptions} opts */
  constructor(opts) {
    super(opts)
    if (typeof opts?.cx !== 'number' || typeof opts?.cy !== 'number') {
      throw new TypeError('SvgCircle: cx and cy must be numbers')
    }
    if (typeof opts?.r !== 'number' || opts.r < 0) {
      throw new TypeError('SvgCircle: r must be a non-negative number')
    }
    this.cx = opts.cx
    this.cy = opts.cy
    this.r  = opts.r
  }

  /** @returns {SVGCircleElement} */
  render() {
    const el = this._createEl('circle')
    el.setAttribute('cx', String(this.cx))
    el.setAttribute('cy', String(this.cy))
    el.setAttribute('r',  String(this.r))
    this._applyAttrs(el)
    return el
  }

  /**
   * Move the center.
   * @param {number} cx
   * @param {number} cy
   * @returns {this}
   */
  moveTo(cx, cy) {
    this.cx = cx
    this.cy = cy
    return this
  }
}
