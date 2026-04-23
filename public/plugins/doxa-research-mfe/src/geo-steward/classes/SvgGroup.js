/**
 * SvgGroup.js
 *
 * `<g>` container with children. Use for transforming many shapes at once
 * (e.g. the whole legend block can be translated by moving the group).
 *
 * Usage:
 *   const g = new SvgGroup({ transform: 'translate(20, 40)' })
 *   g.add(new SvgCircle({ cx: 10, cy: 10, r: 5, fill: 'red' }))
 *   g.add(new SvgText({ x: 20, y: 14, text: 'Label' }))
 *   document.body.appendChild(g.render())
 */

import { SvgShape } from './SvgShape.js'

/**
 * @typedef {Object} SvgGroupOptions
 * @property {SvgShape[]} [children=[]]
 * @property {string} [transform]
 * @property {number} [opacity]
 * @property {string} [id]
 * @property {string} [className]
 */

export class SvgGroup extends SvgShape {
  /** @param {SvgGroupOptions} [opts={}] */
  constructor(opts = {}) {
    super(opts)
    /** @type {SvgShape[]} */
    this.children = Array.isArray(opts.children) ? [...opts.children] : []
  }

  /**
   * Append a child shape.
   * @param {SvgShape} shape
   * @returns {this}
   */
  add(shape) {
    if (!(shape instanceof SvgShape)) {
      throw new TypeError('SvgGroup.add: argument must be an SvgShape instance')
    }
    this.children.push(shape)
    return this
  }

  /** Remove all children. */
  clear() { this.children = []; return this }

  /** @returns {number} */
  get size() { return this.children.length }

  /** @returns {SVGGElement} */
  render() {
    const el = this._createEl('g')
    this._applyAttrs(el)
    for (const child of this.children) {
      try {
        el.appendChild(child.render())
      } catch (err) {
        console.warn('SvgGroup: child render failed —', err?.message ?? err)
      }
    }
    return el
  }
}
