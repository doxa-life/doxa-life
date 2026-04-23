/**
 * usePrintDialog — assemble the payload for the PrintDialog component:
 * map snapshot (PNG data URL), legend SVG (string), and metadata.
 *
 * @example
 *   const pd = usePrintDialog({ getMap, getLegend });
 *   pd.open();   // opens the dialog
 *   pd.assemble().then(payload => console.log(payload));
 */
import { ref } from 'vue';
import { useMapCapture } from './useMapCapture';

/**
 * @param {{ getMap: ()=>any, getLegend?: ()=>string, getMetadata?: ()=>Object }} opts
 */
export function usePrintDialog(opts) {
  const visible    = ref(false);
  const previewUrl = ref('');
  const legendSvg  = ref('');
  const metadata   = ref({});
  const loading    = ref(false);

  const { captureDataUrl } = useMapCapture(opts.getMap);

  async function assemble() {
    loading.value = true;
    try {
      previewUrl.value = await captureDataUrl();
      legendSvg.value  = opts.getLegend ? opts.getLegend() : '';
      metadata.value   = opts.getMetadata ? opts.getMetadata() : {};
    } finally {
      loading.value = false;
    }
    return {
      preview:  previewUrl.value,
      legend:   legendSvg.value,
      metadata: metadata.value,
    };
  }

  async function open() {
    visible.value = true;
    await assemble();
  }
  function close() { visible.value = false; }

  function triggerPrint() {
    // Naive client-print path: open data url in a new window and call print().
    if (!previewUrl.value) return;
    const w = window.open('');
    if (!w) return;
    w.document.write(`<html><head><title>Print Map</title></head><body style="margin:0">
      <img src="${previewUrl.value}" style="width:100%" onload="setTimeout(()=>print(), 250)" />
    </body></html>`);
    w.document.close();
  }

  return {
    visible,
    previewUrl,
    legendSvg,
    metadata,
    loading,
    open,
    close,
    assemble,
    triggerPrint,
  };
}
