// Loads the sprite-stacked ships' atlases (ship-stacks.mjs) once and keeps
// their decoded pixels. Until an atlas has loaded, `shipStackAtlas` returns
// null and the renderers draw the code-drawn flat ships instead.

const URLS = {
  battle: new URL('../assets/sprites/ship-stacks-battle.png', import.meta.url).href,
  map: new URL('../assets/sprites/ship-stacks-map.png', import.meta.url).href,
};
const atlases = {};
let loading = null;

export function loadShipStacks() {
  if (loading || typeof Image === 'undefined' || typeof document === 'undefined') return loading ?? Promise.resolve();
  loading = Promise.all(Object.entries(URLS).map(([size, url]) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      atlases[size] = { width: canvas.width, height: canvas.height, pixels: context.getImageData(0, 0, canvas.width, canvas.height).data };
      resolve();
    };
    image.onerror = () => resolve();
    image.src = url;
  }))).then(() => {});
  return loading;
}

// The decoded atlas of a size ('battle' or 'map'), or null until loaded.
export function shipStackAtlas(size) {
  loadShipStacks();
  return atlases[size] ?? null;
}
