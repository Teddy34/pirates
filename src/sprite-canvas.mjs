// Turns painted pixel sprites into cached canvases and draws them on the
// device-pixel grid, so every art pixel stays an even square at any zoom.

const canMakeCanvas = () => typeof document !== 'undefined' || typeof OffscreenCanvas !== 'undefined';

// `paint` returns { pixels, width, height, anchor }. Returns null where no
// canvas exists (the Node tests), so callers simply skip the sprite.
export function cachedSprite(cache, key, paint) {
  let sprite = cache.get(key);
  if (sprite === undefined) {
    if (!canMakeCanvas()) return null;
    const { pixels, width, height, anchor } = paint();
    const image = typeof document !== 'undefined' ? document.createElement('canvas') : new OffscreenCanvas(width, height);
    image.width = width; image.height = height;
    image.getContext('2d').putImageData(new ImageData(pixels, width, height), 0, 0);
    sprite = { image, width, height, anchor };
    cache.set(key, sprite);
  }
  return sprite;
}

// Draws `sprite` with its anchor pixel on (x, y) in the context's current
// coordinates, `scale` device pixels per art pixel.
export function drawPixelSprite(context, sprite, x, y, scale) {
  const transform = context.getTransform();
  const left = Math.round(transform.a * x + transform.c * y + transform.e) - sprite.anchor.x * scale;
  const top = Math.round(transform.b * x + transform.d * y + transform.f) - sprite.anchor.y * scale;
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.imageSmoothingEnabled = false;
  context.drawImage(sprite.image, left, top, sprite.width * scale, sprite.height * scale);
  context.restore();
}

// Device pixels per CSS pixel, kept whole so the grid stays even.
export function devicePixelScale() {
  return Math.round(Math.min((typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1, 2));
}
