// The pixel half of the RetroPirates! title: "Retro" in original arcade
// block letters, drawn one art pixel per glyph cell (DOM-free; the page
// scales the canvas up with `image-rendering: pixelated`). "Pirates!" is set
// beside it in a script typeface, so the logo shows the game's two sides:
// arcade sprites and historical comic-book vignettes.

const OUTLINE = '#21180f';
const SHADOW = '#5a3b22';
// Arcade-logo bands from top to bottom, in the brass and gold of the dialogs.
const BANDS = ['#fbe39a', '#f2c55c', '#f2c55c', '#d6a447', '#d6a447', '#b8772e', '#a8331f', '#a8331f'];

const GLYPHS = {
  R: ['######.', '##...##', '##...##', '######.', '####...', '##.##..', '##..##.', '##...##'],
  E: ['######', '##....', '##....', '#####.', '##....', '##....', '##....', '######'],
  T: ['######', '######', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..'],
  O: ['.#####.', '##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '.#####.'],
};
const WORD = 'RETRO';
const GLYPH_HEIGHT = 8;
const LETTER_GAP = 1;
// One pixel of outline all round, plus a one-pixel drop shadow down-right.
const MARGIN = 1;
const SHADOW_OFFSET = 1;

function glyphCells(word = WORD) {
  const cells = [];
  let x = 0;
  for (const letter of word) {
    const rows = GLYPHS[letter];
    rows.forEach((row, y) => [...row].forEach((cell, column) => { if (cell === '#') cells.push([x + column, y]); }));
    x += rows[0].length + LETTER_GAP;
  }
  return { cells, width: x - LETTER_GAP };
}

export const RETRO_LOGO_SIZE = (() => {
  const { width } = glyphCells();
  return { width: width + 2 * MARGIN + SHADOW_OFFSET, height: GLYPH_HEIGHT + 2 * MARGIN + SHADOW_OFFSET };
})();

// Draws the word into a context of RETRO_LOGO_SIZE: shadow, then outline,
// then the banded fill, so the outline only shows on the silhouette's edge.
export function drawRetroLogo(ctx) {
  const { cells } = glyphCells();
  const at = (x, y, dx, dy, color) => { ctx.fillStyle = color; ctx.fillRect(x + MARGIN + dx, y + MARGIN + dy, 1, 1); };
  ctx.clearRect(0, 0, RETRO_LOGO_SIZE.width, RETRO_LOGO_SIZE.height);
  for (const [x, y] of cells) at(x, y, SHADOW_OFFSET, SHADOW_OFFSET + 1, SHADOW);
  for (const [x, y] of cells) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) at(x, y, dx, dy, OUTLINE);
  for (const [x, y] of cells) at(x, y, 0, 0, BANDS[y]);
}
