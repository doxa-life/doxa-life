/**
 * SvgShape.js
 *
 * Base class for every SVG shape in this library. Holds stroke/fill/transform
 * state and an `applyAttrs(el)` helper that subclasses call in `render()`.
 *
 * Not instantiated directly. Subclasses are SvgPolygon, SvgCircle, etc.
 */

const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * @typedef {Object} SvgShapeOptions
 * @property {string} [stroke='none']
 * @property {number} [strokeWidth=1]
 * @property {string} [fill='none']
 * @property {number} [opacity=1]
 * @property {string} [transform='']
 * @property {string} [id]
 * @property {string} [className]
 */

export class SvgShape {
  /** @param {SvgShapeOptions} [opts={}] */
  constructor(opts = {}) {
    this.stroke      = opts.stroke      ?? 'none'
    this.strokeWidth = opts.strokeWidth ?? 1
    this.fill        = opts.fill        ?? 'none'
    this.opacity     = opts.opacity     ?? 1
    this.transform   = opts.transform   ?? ''
    this.id          = opts.id          ?? null
    this.className   = opts.className   ?? null
  }

  /**
   * Create an SVG element in the correct namespace.
   * @protected
   * @param {string} tag
   * @returns {SVGElement}
   */
  _createEl(tag) {
    return document.createElementNS(SVG_NS, tag)
  }

  /**
   * Apply the shared stroke/fill/transform attributes to an SVGElement.
   * @protected
   * @param {SVGElement} el
   */
  _applyAttrs(el) {
    if (this.stroke !== 'none')                    el.setAttribute('stroke', this.stroke)
    if (this.strokeWidth !== 1)                    el.setAttribute('stroke-width', String(this.strokeWidth))
    if (this.fill !== 'none')                      el.setAttribute('fill', this.fill)
    if (this.opacity !== 1)                        el.setAttribute('opacity', String(this.opacity))
    if (this.transform)                            el.setAttribute('transform', this.transform)
    if (this.id)                                   el.setAttribute('id', this.id)
    if (this.className)                            el.setAttribute('class', this.className)
  }

  /** Fluent setters — all return `this`. */
  setStroke(color)      { this.stroke = color;       return this }
  setStrokeWidth(w)     { this.strokeWidth = w;      return this }
  setFill(color)        { this.fill = color;         return this }
  setOpacity(o)         { this.opacity = o;          return this }
  setTransform(t)       { this.transform = t;        return this }
  setId(id)             { this.id = id;              return this }
  setClass(cls)         { this.className = cls;      return this }

  /**
   * Produce the SVGElement. Subclasses MUST override.
   * @returns {SVGElement}
   */
  render() {
    throw new Error('SvgShape.render() must be overridden by subclass')
  }
}

export const SVG_NAMESPACE = SVG_NS
