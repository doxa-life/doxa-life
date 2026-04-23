/**
 * SvgPolygon.js
 *
 * Renders a closed polygon from an array of [x, y] screen-space points.
 * Callers are responsible for projecting GeoJSON coords to screen space
 * before handing them here — this class does NOT do geo math.
 *
 * Usage:
 *   const poly = new SvgPolygon({
 *     points: [[10,10],[100,10],[100,100],[10,100]],
 *     fill: '#ff4757',
 *     stroke: '#000',
 *     strokeWidth: 2
 *   })
 *   document.body.appendChild(poly.render())
 */

import { SvgShape } from './SvgShape.js'

/**
 * @typedef {Object} SvgPolygonOptions
 * @property {[number, number][]} points   Screen-space [x,y] pairs
 * @property {string} [stroke]
 * @property {number} [strokeWidth]
 * @property {string} [fill]
 * @property {number} [opacity]
 * @property {string} [transform]
 * @property {string} [id]
 * @property {string} [className]
 */

export class SvgPolygon extends SvgShape {
  /** @param {SvgPolygonOptions} opts */
  constructor(opts) {
    super(opts)
    if (!Array.isArray(opts?.points)) {
      throw new TypeError('SvgPolygon: `points` must be an array of [x,y] pairs')
    }
    if (opts.points.length < 3) {
      throw new TypeError(`SvgPolygon: need >= 3 points, got ${opts.points.length}`)
    }
    this.points = opts.points
  }

  /**
   * Serialize points array to the SVG `points` attribute format: "x,y x,y …".
   * @returns {string}
   */
  _serializePoints() {
    return this.points.map(([x, y]) => `${x},${y}`).join(' ')
  }

  /**
   * @returns {SVGPolygonElement}
   */
  render() {
    const el = this._createEl('polygon')
    el.setAttribute('points', this._serializePoints())
    this._applyAttrs(el)
    return el
  }

  /**
   * Compute the geometric centroid of the polygon (useful for label placement).
   * Not the pole-of-inaccessibility — see SvgLabelPlacer for that.
   * @returns {[number, number]}
   */
  centroid() {
    let sx = 0, sy = 0
    for (const [x, y] of this.points) { sx += x; sy += y }
    const n = this.points.length
    return [sx / n, sy / n]
  }

  /**
   * Axis-aligned bounding box.
   * @returns {{minX:number,minY:number,maxX:number,maxY:number}}
   */
  bbox() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const [x, y] of this.points) {
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
    return { minX, minY, maxX, maxY }
  }
}
