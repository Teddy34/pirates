// Navigation map decoding and per-pixel terrain lookup. DOM-free.
// Format written by tools/build_world_map.py (after gunzip): magic 'PNM2',
// 640x480 2-bit cell classes, then one 64-byte block of 16x16 2-bit pixel
// classes for every mixed cell in row-major order.

export const CELL = Object.freeze({ WATER: 0, LAND: 1, MIXED: 2, TOWN: 3 });
export const PIXEL = Object.freeze({ WATER: 0, SHALLOW: 1, LAND: 2 });
export const PIXELS_PER_CELL = 16;

const MAGIC = [0x50, 0x4e, 0x4d, 0x32];
const BLOCK_BYTES = PIXELS_PER_CELL * PIXELS_PER_CELL / 4;

export function decodeNavigationMap(bytes, width, height) {
  if (!MAGIC.every((value, index) => bytes[index] === value)) throw new Error('unsupported navigation map format');
  const cellCount = width * height;
  const cells = new Uint8Array(cellCount);
  const blockIndex = new Int32Array(cellCount).fill(-1);
  let mixed = 0;
  for (let index = 0; index < cellCount; index += 1) {
    cells[index] = (bytes[4 + (index >> 2)] >> ((index & 3) * 2)) & 3;
    if (cells[index] === CELL.MIXED) blockIndex[index] = mixed++;
  }
  const blocksStart = 4 + cellCount / 4;
  if (bytes.length !== blocksStart + mixed * BLOCK_BYTES) throw new Error('unexpected navigation map size');
  return { width, height, cells, blockIndex, blocks: bytes.subarray(blocksStart) };
}

// x and y are world-cell coordinates; each cell covers 16x16 original map
// pixels, and the original classifies the single pixel under the position.
export function pixelClassAt(map, x, y) {
  const pixelX = Math.floor(x * PIXELS_PER_CELL);
  const pixelY = Math.floor(y * PIXELS_PER_CELL);
  const col = pixelX >> 4;
  const row = pixelY >> 4;
  if (col < 0 || row < 0 || col >= map.width || row >= map.height) return PIXEL.LAND;
  const cell = row * map.width + col;
  switch (map.cells[cell]) {
    case CELL.WATER: return PIXEL.WATER;
    case CELL.MIXED: {
      const pixel = (pixelY & 15) * PIXELS_PER_CELL + (pixelX & 15);
      return (map.blocks[map.blockIndex[cell] * BLOCK_BYTES + (pixel >> 2)] >> ((pixel & 3) * 2)) & 3;
    }
    default: return PIXEL.LAND;
  }
}

// Shallow water is sea for navigation: the original treats a position as land
// only when its class is land (0x4113C class 2).
export function isNavigableAt(map, x, y) {
  return pixelClassAt(map, x, y) !== PIXEL.LAND;
}

export async function gunzip(arrayBuffer) {
  const stream = new Blob([arrayBuffer]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
