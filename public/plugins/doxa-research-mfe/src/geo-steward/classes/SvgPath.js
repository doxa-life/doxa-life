/**
 * SvgPath.js
 *
 * Arbitrary `<path d="...">` element. Accepts a raw `d` string OR uses
 * fluent builders (moveTo, lineTo, arc, close) to construct `d` step by step.
 *
 * Usage:
 *   const p = new SvgPath()
 *     .moveTo(10,10)
 *     .lineTo(100,10)
 *     .lineTo(100,100)
 *     .close()
 *     .setStroke('#000')
 *   document.body.appendChild(p.render())
 */

import { SvgShape } from './SvgShape.js'

/**
 * @typedef {Object} SvgPathOptions
 * @property {string} [d]    Raw SVG path `d` string
 * @property {string} [stroke]
 * @property {number} [strokeWidth]
 * @property {string} [fill]
 * @property {number} [opacity]
 * @property {string} [transform]
 * @property {string} [id]
 * @property {string} [className]
 */

export class SvgPath extends SvgShape {
  /** @param {SvgPathOptions} [opts={}] */
  constructor(opts = {}) {
    super(opts)
    /** @type {string[]} */
    this._segments = []
    if (opts.d) this._segments.push(opts.d)
  }

  /** @returns {string} Current `d` attribute value */
  get d() { return this._segments.join(' ') }

  /** @param {number} x @param {number} y @returns {this} */
  moveTo(x, y) { this._segments.push(`M${x},${y}`); return this }

  /** @param {number} x @param {number} y @returns {this} */
  lineTo(x, y) { this._segments.push(`L${x},${y}`); return this }

  /** @param {number} x @returns {this} */
  horizontalTo(x) { this._segments.push(`H${x}`); return this }

  /** @param {number} y @returns {this} */
  verticalTo(y) { this._segments.push(`V${y}`); return this }

  /**
   * Elliptical arc.
   * @param {number} rx
   * @param {number} ry
   * @param {number} xAxisRot
   * @param {0|1} largeArc
   * @param {0|1} sweep
   * @param {number} x
   * @param {number} y
   * @returns {this}
   */
  arc(rx, ry, xAxisRot, largeArc, sweep, x, y) {
    this._segments.push(`A${rx},${ry} ${xAxisRot} ${largeArc},${sweep} ${x},${y}`)
    return this
  }

  /** @returns {this} */
  close() { this._segments.push('Z'); return this }

  /** @returns {SVGPathElement} */
  render() {
    const el = this._createEl('path')
    el.setAttribute('d', this.d || 'M0,0')
    this._applyAttrs(el)
    return el
  }
}
