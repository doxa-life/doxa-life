/**
 * useMapCapture — capture the Mapbox canvas to PNG / data URL.
 *
 * Important: `preserveDrawingBuffer: true` MUST be set on the Mapbox map
 * init for `getCanvas().toDataURL()` to work in Chrome/Safari. Otherwise
 * the canvas is cleared after each frame.
 *
 * @example
 *   const { captureDataUrl, captureBlob, downloadPng } = useMapCapture(getMap);
 *   const url = await captureDataUrl();
 */
export function useMapCapture(getMap) {
  /**
   * Returns a data URL for the current map view.
   * @param {string} [type='image/png']
   * @returns {Promise<string>}
   */
  async function captureDataUrl(type = 'image/png') {
    const map = getMap();
    if (!map) throw new Error('useMapCapture: no map');
    await waitForIdle(map);
    return map.getCanvas().toDataURL(type);
  }

  /**
   * Returns a Blob for the current map view.
   * @param {string} [type='image/png']
   * @returns {Promise<Blob>}
   */
  async function captureBlob(type = 'image/png') {
    const map = getMap();
    if (!map) throw new Error('useMapCapture: no map');
    await waitForIdle(map);
    return new Promise((resolve, reject) => {
      map.getCanvas().toBlob((b) => b ? resolve(b) : reject(new Error('toBlob failed')), type);
    });
  }

  /**
   * Trigger a browser download of the current view as PNG.
   * @param {string} [filename='map.png']
   */
  async function downloadPng(filename = 'map.png') {
    const blob = await captureBlob('image/png');
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return { captureDataUrl, captureBlob, downloadPng };
}

function waitForIdle(map) {
  return new Promise((resolve) => {
    if (map.loaded() && !map.isMoving()) {
      requestAnimationFrame(() => resolve());
    } else {
      map.once('idle', () => resolve());
    }
  });
}
