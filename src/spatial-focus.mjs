// Arrow-key focus moves between buttons by their position on screen.
// DOM-free: works on plain rectangles { left, top, right, bottom }.

export const ARROW_STEPS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };

const centre = (rect) => ({ x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 });

// The index in `rects` of the button the arrow `key` moves to from `from`,
// or -1 when nothing lies that way. A button in line with `from` (sharing
// some of its row for left and right, of its column for up and down) wins
// over any other, nearest edge first: in a wrapped row of buttons of
// different widths, right from the second line stays on the second line
// (#108). Left and right never leave a line of buttons, so at its end they
// stop. Otherwise the nearest one that way wins, the sideways offset
// counting three times as much as the distance.
const rowOverlap = (a, b) => Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
const columnOverlap = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left);

export function spatialNeighbour(from, rects, key) {
  const [dx, dy] = ARROW_STEPS[key] ?? [];
  if (dx === undefined) return -1;
  const start = centre(from);
  const onALine = dx !== 0 && rects.some((rect) => rect !== from && rowOverlap(from, rect) > 0);
  let best = -1;
  let bestRank = null;
  rects.forEach((rect, index) => {
    if (rect === from) return;
    const to = centre(rect);
    const along = (to.x - start.x) * dx + (to.y - start.y) * dy;
    if (along <= 1) return;
    const across = Math.abs((to.x - start.x) * dy) + Math.abs((to.y - start.y) * dx);
    const overlap = dx ? rowOverlap(from, rect) : columnOverlap(from, rect);
    if (onALine && overlap <= 0) return;
    // The gap between the facing edges, for buttons in line.
    const gap = Math.max(0, dx > 0 ? rect.left - from.right : dx < 0 ? from.left - rect.right
      : dy > 0 ? rect.top - from.bottom : from.top - rect.bottom);
    const rank = overlap > 0 ? [0, gap, across] : [1, along + across * 3, 0];
    const better = !bestRank || rank[0] < bestRank[0]
      || (rank[0] === bestRank[0] && (rank[1] < bestRank[1] || (rank[1] === bestRank[1] && rank[2] < bestRank[2])));
    if (better) { best = index; bestRank = rank; }
  });
  return best;
}
