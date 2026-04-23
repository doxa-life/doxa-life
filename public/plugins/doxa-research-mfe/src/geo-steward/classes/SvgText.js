/**
 * SvgText.js
 *
 * `<text>` primitive with anchor, rotation, and font controls.
 * Text content is escaped-on-render (pulled via `.textContent`) so callers
 * can freely pass untrusted strings.
 *
 * Usage:
 *   const t = new SvgText({
 *     x: 100, y: 50,
 *     text: 'Team A',
 *     fontSize: 18,
 *     fontFamily: 'Arial',
 *     anchor: 'middle',
 *     fill: '#000'
 *   })
 *   document.body.appendChild(t.render())
 */

import { SvgShape } from './SvgShape.js'

/**
 * @typedef {Object} SvgTextOptions
 * @property {number} x
 * @property {number} y
 * @property {string} text
 * @property {number} [fontSize=14]
 * @property {string} [fontFamily='sans-serif']
 * @property {string} [fontWeight='normal']
 * @property {'start'|'middle'|'end'} [anchor='start']
 * @property {'auto'|'middle'|'hanging'} [baseline='alphabetic']
 * @property {number} [rotation=0]          Degrees, rotated around (x,y)
 * @property {string} [fill='#000']
 * @property {string} [stroke]
 * @property {number} [opacity]
 * @property {string} [id]
 * @property {string} [className]
 */

export class SvgText extends SvgShape {
  /** @param {SvgTextOptions} opts */
  constructor(opts) {
    super({ fill: '#000', ...opts })
    if (typeof opts?.x !== 'number' || typeof opts?.y !== 'number') {
      throw new TypeError('SvgText: x and y must be numbers')
    }
    this.x          = opts.x
    this.y          = opts.y
    this.text       = String(opts.text ?? '')
    this.fontSize   = opts.fontSize   ?? 14
    this.fontFamily = opts.fontFamily ?? 'sans-serif'
    this.fontWeight = opts.fontWeight ?? 'normal'
    this.anchor     = opts.anchor     ?? 'start'
    this.baseline   = opts.baseline   ?? 'alphabetic'
    this.rotation   = opts.rotation   ?? 0
  }

  /** @returns {SVGTextElement} */
  render() {
    const el = this._createEl('text')
    el.setAttribute('x', String(this.x))
    el.setAttribute('y', String(this.y))
    el.setAttribute('font-size', String(this.fontSize))
    el.setAttribute('font-family', this.fontFamily)
    if (this.fontWeight !== 'normal') el.setAttribute('font-weight', this.fontWeight)
    if (this.anchor !== 'start')      el.setAttribute('text-anchor', this.anchor)
    if (this.baseline !== 'alphabetic') el.setAttribute('dominant-baseline', this.baseline)
    if (this.rotation) {
      // If caller supplied a transform, append ours; otherwise just set it
      const rot = `rotate(${this.rotation} ${this.x} ${this.y})`
      this.transform = this.transform ? `${this.transform} ${rot}` : rot
    }
    this._applyAttrs(el)
    el.textContent = this.text
    return el
  }
}
