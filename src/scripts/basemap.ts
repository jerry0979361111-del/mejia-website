// 地圖底圖：OpenFreeMap 向量圖資（免費、免金鑰、可商用），用 MapLibre 繪製，放大縮小都清楚。
// 不支援 WebGL 的舊裝置自動改用 OpenStreetMap 一般圖磚。首頁物件地圖與建案內頁位置地圖共用。
import type * as Leaflet from 'leaflet';

// 樣式：bright（彩色、道路與地名清楚）／positron（淺灰極簡）／liberty（細節多、3D 建築）
export const BASEMAP_STYLE = 'https://tiles.openfreemap.org/styles/bright';
const ATTRIBUTION = '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

function webgl() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

export async function addBasemap(L: typeof Leaflet, map: Leaflet.Map) {
  if (webgl()) {
    try {
      const [{ maplibreGL }, maplibre, worker] = await Promise.all([
        import('@maplibre/maplibre-gl-leaflet'),
        import('maplibre-gl'),
        // MapLibre 的背景運算程式是獨立檔案，打包後要明確告訴它在哪裡
        import('maplibre-gl/dist/maplibre-gl-worker.mjs?url'),
        import('maplibre-gl/dist/maplibre-gl.css'),
      ]);
      maplibre.setWorkerUrl(worker.default);
      maplibreGL({ style: BASEMAP_STYLE, attribution: ATTRIBUTION } as any).addTo(map);
      return;
    } catch (e) {
      console.warn('向量底圖載入失敗，改用一般圖磚', e);
    }
  }
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
}
