// Paints terrain chunks off the main thread; each chunk takes tens of
// milliseconds, which would stall sailing frames.
import { buildCoastField, paintTerrainChunk } from './terrain.mjs';

let map = null;
let coast = null;

self.onmessage = ({ data }) => {
  if (data.type === 'map') {
    map = data.map;
    coast = buildCoastField(map);
    return;
  }
  const pixels = paintTerrainChunk(map, coast, data.chunkX, data.chunkY);
  self.postMessage({ key: data.key, pixels }, [pixels.buffer]);
};
