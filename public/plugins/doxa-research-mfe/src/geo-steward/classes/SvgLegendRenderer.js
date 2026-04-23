/**
 * SvgLegendRenderer.js
 *
 * Builds a legend SVG from a strategy description. Used by the print
 * workflow to produce an SVG legend embedded in the final output.
 *
 * Usage:
 *   const renderer = new SvgLegendRenderer()
 *   const canvas = renderer.render({
 *     title: 'Teams',
 *     entries: [
 *       { color: '#ff4757', label: 'Team A', symbol: 'square' },
 *       { color: '#2ed573', label: 'Team B', symbol: 'circle' }
 *     ]
 *   })
 *   document.body.appendChild(canvas.el)
 */

import { SvgCanvas }  from './SvgCanvas.js'
import { SvgGroup }   from './SvgGroup.js'
import { SvgText }    from './SvgText.js'
import { SvgCircle }  from './SvgCircle.js'
import { SvgPolygon } from './SvgPolygon.js'

/**
 * @typedef {Object} LegendEntry
 * @property {string} color
 * @property {string} label
 * @property {'square'|'circle'|'triangle'} [symbol='square']
 */

/**
 * @typedef {Object} LegendStrategy
 * @property {string} [title]
 * @property {LegendEntry[]} entries
 * @property {number} [columns=1]
 * @property {number} [fontSize=14]
 * @property {string} [fontFamily='sans-serif']
 * @property {number} [swatchSize=16]
 * @property {number} [rowHeight=24]
 * @property {number} [padding=12]
 * @property {string} [textColor='#000']
 */

export class SvgLegendRenderer {
  /** @param {{ defaults?: Partial<LegendStrategy> }} [opts={}] */
  constructor(opts = {}) {
    this.defaults = opts.defaults ?? {}
  }

  /**
   * Build a legend canvas from a strategy.
   * @param {LegendStrategy} strategy
   * @returns {SvgCanvas}
   */
  render(strategy) {
    const s = { ...this._baseDefaults(), ...this.defaults, ...strategy }
    if (!Array.isArray(s.entries) || s.entries.length === 0) {
      throw new TypeError('SvgLegendRenderer: strategy.entries must be a non-empty array')
    }

    const columns     = Math.max(1, s.columns)
    const rows        = Math.ceil(s.entries.length / columns)
    const rowH        = s.rowHeight
    const swatch      = s.swatchSize
    const pad         = s.padding
    const colWidth    = 180    // fixed — legends are narrow by design
    const titleHeight = s.title ? rowH + 4 : 0

    const width  = pad * 2 + colWidth * columns
    const height = pad * 2 + titleHeight + rowH * rows

    const canvas = new SvgCanvas({
      width, height,
      viewBox: `0 0 ${width} ${height}`,
      background: '#ffffff'
    })

    const group = new SvgGroup({
      transform: `translate(${pad}, ${pad + titleHeight})`
    })

    if (s.title) {
      canvas.append(new SvgText({
        x: pad,
        y: pad + s.fontSize,
        text: s.title,
        fontSize: s.fontSize + 2,
        fontWeight: 'bold',
        fontFamily: s.fontFamily,
        fill: s.textColor
      }).render())
    }

    s.entries.forEach((entry, i) => {
      const col = i % columns
      const row = Math.floor(i / columns)
      const x   = col * colWidth
      const y   = row * rowH
      group.add(this._symbol(entry, x, y + swatch / 2, swatch))
      group.add(new SvgText({
        x: x + swatch + 8,
        y: y + swatch - 2,
        text: entry.label,
        fontSize: s.fontSize,
        fontFamily: s.fontFamily,
        fill: s.textColor
      }))
    })

    canvas.append(group.render())
    return canvas
  }

  /**
   * @private
   * @returns {LegendStrategy}
   */
  _baseDefaults() {
    return {
      entries:    [],
      columns:    1,
      fontSize:   14,
      fontFamily: 'sans-serif',
      swatchSize: 16,
      rowHeight:  24,
      padding:    12,
      textColor:  '#000'
    }
  }

  /**
   * @private
   * @param {LegendEntry} entry
   * @param {number} x
   * @param {number} cy  Vertical center of the swatch
   * @param {number} size
   */
  _symbol(entry, x, cy, size) {
    const half = size / 2
    const color = entry.color
    const symbol = entry.symbol ?? 'square'
    if (symbol === 'circle') {
      return new SvgCircle({ cx: x + half, cy, r: half, fill: color, stroke: '#000', strokeWidth: 0.5 })
    }
    if (symbol === 'triangle') {
      return new SvgPolygon({
        points: [
          [x + half,    cy - half],
          [x + size,    cy + half],
          [x,           cy + half]
        ],
        fill: color, stroke: '#000', strokeWidth: 0.5
      })
    }
    // square (default)
    return new SvgPolygon({
      points: [
        [x,        cy - half],
        [x + size, cy - half],
        [x + size, cy + half],
        [x,        cy + half]
      ],
      fill: color, stroke: '#000', strokeWidth: 0.5
    })
  }
}
