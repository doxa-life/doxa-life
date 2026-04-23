/**
 * SvgLabelPlacer.js
 *
 * Computes label positions for a set of polygons. Two strategies:
 *   - 'centroid'  — fast geometric centroid (can fall outside concave shapes)
 *   - 'polylabel' — pole of inaccessibility (accurate for all shapes)
 *
 * Optional collision filtering (simple AABB overlap test) drops labels that
 * would overlap previously-placed ones.
 *
 * Usage:
 *   const placer = new SvgLabelPlacer({ strategy: 'polylabel' })
 *   const labels = placer.place([
 *     { id: 'A', ring: [[0,0],[10,0],[10,10],[0,10]], text: 'Team A' }
 *   ])
 *   // → [{ id:'A', x:5, y:5, text:'Team A', priority:1 }]
 */

/**
 * @typedef {Object} LabelInput
 * @property {string|number} id
 * @property {[number, number][]} ring    Polygon exterior ring (closed or open)
 * @property {string} text
 * @property {number} [priority=1]         Higher = resolved first in collisions
 * @property {number} [boxWidth]           Estimated label width (for collision)
 * @property {number} [boxHeight]          Estimated label height
 */

/**
 * @typedef {Object} LabelOutput
 * @property {string|number} id
 * @property {number} x
 * @property {number} y
 * @property {string} text
 * @property {number} priority
 */

/**
 * @typedef {Object} SvgLabelPlacerOptions
 * @property {'centroid'|'polylabel'} [strategy='polylabel']
 * @property {boolean} [avoidOverlaps=false]
 * @property {number} [padding=0]         Collision padding
 */

export class SvgLabelPlacer {
  /** @param {SvgLabelPlacerOptions} [opts={}] */
  constructor(opts = {}) {
    this.strategy      = opts.strategy      ?? 'polylabel'
    this.avoidOverlaps = opts.avoidOverlaps ?? false
    this.padding       = opts.padding       ?? 0
  }

  /**
   * Place labels on the given polygons.
   * @param {LabelInput[]} inputs
   * @returns {LabelOutput[]}
   */
  place(inputs) {
    const sorted = [...inputs].sort(
      (a, b) => (b.priority ?? 1) - (a.priority ?? 1)
    )
    const placed = []
    const boxes  = []
    for (const input of sorted) {
      const pt = this._computePoint(input.ring)
      if (!pt) continue
      const [x, y] = pt

      if (this.avoidOverlaps) {
        const w = input.boxWidth  ?? 40
        const h = input.boxHeight ?? 16
        const box = {
          minX: x - w / 2 - this.padding,
          minY: y - h / 2 - this.padding,
          maxX: x + w / 2 + this.padding,
          maxY: y + h / 2 + this.padding
        }
        if (boxes.some(b => this._overlap(b, box))) continue
        boxes.push(box)
      }

      placed.push({
        id: input.id,
        x, y,
        text: input.text,
        priority: input.priority ?? 1
      })
    }
    return placed
  }

  /**
   * @private
   * @param {[number,number][]} ring
   * @returns {[number,number]|null}
   */
  _computePoint(ring) {
    if (!Array.isArray(ring) || ring.length < 3) return null
    if (this.strategy === 'centroid') return this._centroid(ring)
    return this._polylabel(ring)
  }

  /** @private */
  _centroid(ring) {
    let sx = 0, sy = 0
    for (const [x, y] of ring) { sx += x; sy += y }
    return [sx / ring.length, sy / ring.length]
  }

  /**
   * Pole of inaccessibility via grid subdivision (simplified polylabel).
   * Not as accurate as Mapbox's priority-queue version but dependency-free
   * and good enough for label placement at small polygon counts.
   * @private
   */
  _polylabel(ring, precision = 1.0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const [x, y] of ring) {
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
    const w = maxX - minX, h = maxY - minY
    const cellSize = Math.min(w, h)
    if (cellSize === 0) return [minX, minY]

    let best = null
    let bestDist = -Infinity
    const step = Math.max(cellSize / 10, precision)
    for (let x = minX; x <= maxX; x += step) {
      for (let y = minY; y <= maxY; y += step) {
        if (!this._pointInRing(x, y, ring)) continue
        const d = this._distToEdge(x, y, ring)
        if (d > bestDist) { bestDist = d; best = [x, y] }
      }
    }
    return best ?? this._centroid(ring)
  }

  /** @private */
  _pointInRing(px, py, ring) {
    let inside = false
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j]
      const intersect = ((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / (yj - yi + 1e-12) + xi)
      if (intersect) inside = !inside
    }
    return inside
  }

  /** @private */
  _distToEdge(px, py, ring) {
    let best = Infinity
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const d = this._segDist(px, py, ring[j], ring[i])
      if (d < best) best = d
    }
    return best
  }

  /** @private */
  _segDist(px, py, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1]
    const lenSq = dx * dx + dy * dy || 1e-12
    let t = ((px - a[0]) * dx + (py - a[1]) * dy) / lenSq
    t = Math.max(0, Math.min(1, t))
    const qx = a[0] + t * dx, qy = a[1] + t * dy
    return Math.hypot(px - qx, py - qy)
  }

  /** @private */
  _overlap(a, b) {
    return !(a.maxX < b.minX || a.minX > b.maxX ||
             a.maxY < b.minY || a.minY > b.maxY)
  }
}
