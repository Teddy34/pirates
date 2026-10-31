// Shared helpers for the procedural pixel-art sprites (towns and ships).
// DOM-free: sprites are painted into arrays of colour strings, then turned
// into RGBA with one dark outline and a soft shadow to the south-east.

export const OUTLINE = '#21180f';

// The second colour of each flag: a stripe or cross that keeps flags apart.
export const FLAG_DARK = { Spain: '#a8331f', England: '#f4f0e4', France: '#f4f0e4', Holland: '#2f4f9a', pirate: '#1b1b1b' };

const rgb = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));

export function createArt(width, height) {
  const pixels = new Array(width * height).fill(null);
  const set = (x, y, color) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    pixels[y * width + x] = color;
  };
  const rect = (x, y, w, h, color) => {
    for (let row = y; row < y + h; row += 1) for (let col = x; col < x + w; col += 1) set(col, row, color);
  };
  // Fills the pixels whose centres fall inside the polygon (even-odd rule).
  const polygon = (points, color) => {
    const ys = points.map(([, y]) => y);
    const top = Math.max(0, Math.floor(Math.min(...ys)));
    const bottom = Math.min(height - 1, Math.ceil(Math.max(...ys)));
    for (let row = top; row <= bottom; row += 1) {
      const y = row + .5;
      const crossings = [];
      for (let index = 0; index < points.length; index += 1) {
        const [x1, y1] = points[index];
        const [x2, y2] = points[(index + 1) % points.length];
        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) crossings.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
      }
      crossings.sort((a, b) => a - b);
      for (let index = 0; index + 1 < crossings.length; index += 2) {
        for (let col = Math.ceil(crossings[index] - .5); col <= Math.floor(crossings[index + 1] - .5); col += 1) set(col, row, color);
      }
    }
  };
  // A one-pixel line between two points (in pixel coordinates).
  const line = ([x1, y1], [x2, y2], color) => {
    const steps = Math.max(1, Math.round(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))));
    for (let step = 0; step <= steps; step += 1) {
      set(Math.floor(x1 + ((x2 - x1) * step) / steps), Math.floor(y1 + ((y2 - y1) * step) / steps), color);
    }
  };
  return { width, height, pixels, set, rect, polygon, line };
}

// Outline every painted pixel, then drop a soft shadow to the south-east.
export function rasterize({ pixels, width, height }) {
  const painted = (x, y) => x >= 0 && y >= 0 && x < width && y < height && pixels[y * width + x] !== null;
  const out = new Uint8ClampedArray(width * height * 4);
  const outline = rgb(OUTLINE);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const color = pixels[y * width + x];
      if (color !== null) {
        const [r, g, b] = rgb(color);
        out[offset] = r; out[offset + 1] = g; out[offset + 2] = b; out[offset + 3] = 255;
      } else if (painted(x - 1, y) || painted(x + 1, y) || painted(x, y - 1) || painted(x, y + 1)) {
        out[offset] = outline[0]; out[offset + 1] = outline[1]; out[offset + 2] = outline[2]; out[offset + 3] = 255;
      } else if (painted(x - 2, y - 1) || painted(x - 1, y - 2)) {
        out[offset + 3] = 80;
      }
    }
  }
  return out;
}
