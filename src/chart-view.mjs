// The full-screen sea chart's screen: draws the chart canvas, pans and zooms
// it, and runs the gazetteer (search, flag filter, sort) and the selected
// town's panel. The game hands it the map, towns and text; it owns no rules.

import {
  CHART_BORDER, CHART_SHIP_ANCHOR, CHART_SHIP_SIZE, MARKER_ANCHOR, MARKER_SIZE,
  compassPointTo, filterTowns, layoutLabels, paintChartBase, paintChartShip, paintTownMarker,
} from './sea-chart.mjs';
import { devicePixelScale } from './sprite-canvas.mjs';

const MAX_SCALE_CSS = 10;
const DRAG_THRESHOLD_CSS = 5;
const HIT_RADIUS_CSS = 14;
const SELECT_SCALE_CSS = 3;

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function toCanvas({ pixels, width, height }) {
  const image = document.createElement('canvas');
  image.width = width;
  image.height = height;
  image.getContext('2d').putImageData(new ImageData(pixels, width, height), 0, 0);
  return image;
}

export function createChartView(root) {
  const stage = root.querySelector('.chart-stage');
  const canvas = root.querySelector('#chart-canvas');
  const ctx = canvas.getContext('2d');
  const eraLabel = root.querySelector('#chart-era');
  const detail = root.querySelector('#chart-detail');
  const gazetteer = root.querySelector('#chart-gazetteer');
  const search = root.querySelector('#chart-search');
  const nationGroup = root.querySelector('#chart-nations');
  const sortButton = root.querySelector('#chart-sort');
  const list = root.querySelector('#chart-towns');
  const closeButton = root.querySelector('#chart-close');

  const baseCache = new WeakMap();
  const markerCache = new Map();
  const shipSprites = new Map();
  let data = null;
  let base = null;
  let dpr = 1;
  let view = { scale: 1, offsetX: 0, offsetY: 0 };
  let selected = -1;
  let hovered = -1;
  let filter = { query: '', nation: '' };
  let sortByDistance = false;
  let dirty = false;
  let returnFocus = null;
  const pointers = new Map();
  let drag = null;

  const chartWidth = () => base.width;
  const chartHeight = () => base.height;
  // World cell coordinates to device pixels on the chart canvas.
  const toDevice = (x, y) => [view.offsetX + (x + CHART_BORDER) * view.scale, view.offsetY + (y + CHART_BORDER) * view.scale];
  const fitScale = () => Math.min(canvas.width / chartWidth(), canvas.height / chartHeight());
  // The whole chart fills the screen at any size; zooming in steps through
  // whole device pixels per chart pixel, where every pixel is an even square.
  const scaleLevels = () => {
    const fit = fitScale();
    const levels = [fit];
    for (let scale = Math.floor(fit) + 1; scale <= MAX_SCALE_CSS * dpr; scale += 1) levels.push(scale);
    return levels;
  };

  function clampView() {
    for (const [axis, size, chart] of [['offsetX', canvas.width, chartWidth()], ['offsetY', canvas.height, chartHeight()]]) {
      const extent = chart * view.scale;
      view[axis] = extent <= size ? Math.round((size - extent) / 2) : Math.round(Math.min(0, Math.max(size - extent, view[axis])));
    }
  }

  // Zooms to `scale` keeping the chart point under device (fx, fy) fixed.
  function zoomTo(scale, fx = canvas.width / 2, fy = canvas.height / 2) {
    const chartX = (fx - view.offsetX) / view.scale;
    const chartY = (fy - view.offsetY) / view.scale;
    view.scale = scale;
    view.offsetX = fx - chartX * scale;
    view.offsetY = fy - chartY * scale;
    clampView();
    requestDraw();
  }

  function zoomStep(direction, fx, fy) {
    const levels = scaleLevels();
    const index = levels.findIndex((level) => level >= view.scale - 1e-6);
    const next = levels[Math.max(0, Math.min(levels.length - 1, (index === -1 ? levels.length - 1 : index) + direction))];
    if (next !== view.scale) zoomTo(next, fx, fy);
  }

  function centreOn(town, minimumScale) {
    const scale = Math.max(view.scale, Math.min(minimumScale, scaleLevels().at(-1)));
    view.scale = scale;
    view.offsetX = canvas.width / 2 - (town.x + .5 + CHART_BORDER) * scale;
    view.offsetY = canvas.height / 2 - (town.y + .5 + CHART_BORDER) * scale;
    clampView();
    requestDraw();
  }

  function resize() {
    if (!data) return;
    const rect = stage.getBoundingClientRect();
    const previousCentre = canvas.width ? [(canvas.width / 2 - view.offsetX) / view.scale, (canvas.height / 2 - view.offsetY) / view.scale] : null;
    const wasFit = !canvas.width || view.scale <= fitScale() + 1e-6;
    dpr = devicePixelScale();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    if (wasFit || !previousCentre) view.scale = fitScale();
    else view.scale = Math.max(view.scale, fitScale());
    if (previousCentre && !wasFit) {
      view.offsetX = canvas.width / 2 - previousCentre[0] * view.scale;
      view.offsetY = canvas.height / 2 - previousCentre[1] * view.scale;
    }
    clampView();
    requestDraw();
  }

  function requestDraw() {
    if (dirty) return;
    dirty = true;
    requestAnimationFrame(draw);
  }

  function markerSprite(town, isSelected) {
    const nation = data.nations[town.nation] ?? data.nations.pirate;
    const fortified = town.forts > 0;
    const key = `${town.nation}|${fortified}|${isSelected}`;
    if (!markerCache.has(key)) markerCache.set(key, toCanvas({ pixels: paintTownMarker({ ...nation, fortified, selected: isSelected }), width: MARKER_SIZE, height: MARKER_SIZE }));
    return markerCache.get(key);
  }

  function shipSprite(onFoot) {
    if (!shipSprites.has(onFoot)) shipSprites.set(onFoot, toCanvas({ pixels: paintChartShip({ onFoot }), width: CHART_SHIP_SIZE, height: CHART_SHIP_SIZE }));
    return shipSprites.get(onFoot);
  }

  // Marker art pixels grow with the zoom, one to four screen pixels each.
  const markerScale = () => {
    const css = view.scale / dpr;
    return dpr * (css >= 6 ? 4 : css >= 3.5 ? 3 : css >= 1.2 ? 2 : 1);
  };

  const matches = () => new Set(filterTowns(data.towns, filter).map(({ index }) => index));
  const filtering = () => Boolean(filter.query.trim() || filter.nation);

  function draw() {
    dirty = false;
    if (!data) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#20160d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawBase();

    const shown = matches();
    const towns = data.towns;
    const ship = data.ship;
    const pixel = Math.max(dpr, Math.round(view.scale / 2));

    // The course to the selected town, dotted in red ink on the pixel grid.
    if (selected >= 0 && ship) {
      const [sx, sy] = toDevice(ship.x, ship.y);
      const [tx, ty] = toDevice(towns[selected].x + .5, towns[selected].y + .5);
      const length = Math.hypot(tx - sx, ty - sy);
      const spacing = Math.max(pixel * 3, 6 * dpr);
      ctx.fillStyle = 'rgba(150,46,26,.85)';
      for (let step = spacing; step < length - spacing; step += spacing) {
        const x = sx + ((tx - sx) * step) / length;
        const y = sy + ((ty - sy) * step) / length;
        ctx.fillRect(Math.round(x - pixel / 2), Math.round(y - pixel / 2), pixel, pixel);
      }
    }

    const scale = markerScale();
    const markers = [];
    towns.forEach((town, index) => {
      const [x, y] = toDevice(town.x + .5, town.y + .5);
      const isSelected = index === selected;
      ctx.globalAlpha = filtering() && !shown.has(index) && !isSelected ? .35 : 1;
      ctx.drawImage(markerSprite(town, isSelected), Math.round(x) - MARKER_ANCHOR.x * scale, Math.round(y) - MARKER_ANCHOR.y * scale, MARKER_SIZE * scale, MARKER_SIZE * scale);
      markers.push({ x, y: y - scale * 1.5, radius: scale * 3.5 });
    });
    ctx.globalAlpha = 1;

    if (ship) {
      const [x, y] = toDevice(ship.x, ship.y);
      ctx.drawImage(shipSprite(ship.onFoot), Math.round(x) - CHART_SHIP_ANCHOR.x * scale, Math.round(y) - CHART_SHIP_ANCHOR.y * scale, CHART_SHIP_SIZE * scale, CHART_SHIP_SIZE * scale);
      markers.push({ x, y: y - scale * 3, radius: scale * 4.5 });
    }

    // Labels, most wanted first: the selection, the hovered town, then
    // matches, larger towns before smaller.
    const fontSize = Math.round(13 * dpr);
    const font = (bold) => `italic ${bold ? 700 : 400} ${fontSize}px "IM Fell English", Georgia, serif`;
    const order = towns.map((_, index) => index)
      .filter((index) => index === selected || index === hovered || !filtering() || shown.has(index))
      .sort((a, b) => (b === selected) - (a === selected) || (b === hovered) - (a === hovered) || towns[b].population - towns[a].population);
    const items = order.map((index) => {
      ctx.font = font(index === selected || index === hovered);
      return {
        id: index, x: markers[index].x, y: markers[index].y,
        width: ctx.measureText(towns[index].name).width + 6 * dpr, height: fontSize + 4 * dpr, gap: markers[index].radius + 2 * dpr,
      };
    });
    // Labels stay on the chart, inside its frame.
    const [left, top] = toDevice(0, 0);
    const [right, bottom] = toDevice(chartWidth() - CHART_BORDER * 2, chartHeight() - CHART_BORDER * 2);
    const labels = layoutLabels(items, markers, {
      left: Math.max(0, left), top: Math.max(0, top), right: Math.min(canvas.width, right), bottom: Math.min(canvas.height, bottom),
    });
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const item of items) {
      const spot = labels.get(item.id);
      if (!spot) continue;
      const strong = item.id === selected || item.id === hovered;
      ctx.font = font(strong);
      const textX = spot.x + 3 * dpr;
      const textY = spot.y + item.height / 2;
      ctx.lineWidth = 3 * dpr;
      ctx.strokeStyle = 'rgba(236,220,178,.9)';
      ctx.strokeText(towns[item.id].name, textX, textY);
      ctx.fillStyle = strong ? '#7a2a1a' : '#2e1f11';
      ctx.fillText(towns[item.id].name, textX, textY);
    }
  }

  // Between whole scales the chart is first enlarged without smoothing to
  // the next whole scale, then shrunk smoothly: pixels stay square and sharp
  // with only their edges softened.
  function drawBase() {
    const width = chartWidth() * view.scale;
    const height = chartHeight() * view.scale;
    if (Number.isInteger(view.scale) || view.scale < 1) {
      ctx.imageSmoothingEnabled = view.scale < 1;
      ctx.drawImage(base.image, view.offsetX, view.offsetY, width, height);
      return;
    }
    const whole = Math.ceil(view.scale);
    if (!base.enlarged.has(whole)) {
      const image = document.createElement('canvas');
      image.width = chartWidth() * whole;
      image.height = chartHeight() * whole;
      const context = image.getContext('2d');
      context.imageSmoothingEnabled = false;
      context.drawImage(base.image, 0, 0, image.width, image.height);
      base.enlarged.clear();
      base.enlarged.set(whole, image);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(base.enlarged.get(whole), view.offsetX, view.offsetY, width, height);
    ctx.imageSmoothingEnabled = false;
  }

  function townAt(deviceX, deviceY) {
    let best = -1;
    let bestDistance = HIT_RADIUS_CSS * dpr;
    const scale = markerScale();
    data.towns.forEach((town, index) => {
      const [x, y] = toDevice(town.x + .5, town.y + .5);
      const distance = Math.hypot(deviceX - x, deviceY - (y - scale * 1.5));
      if (distance < bestDistance) { best = index; bestDistance = distance; }
    });
    return best;
  }

  function devicePoint(event) {
    const rect = canvas.getBoundingClientRect();
    return [(event.clientX - rect.left) * (canvas.width / rect.width), (event.clientY - rect.top) * (canvas.height / rect.height)];
  }

  function townLine({ town, index }) {
    const distance = data.distanceTo?.(town);
    const point = data.ship && compassPointTo(data.ship.x, data.ship.y, town.x + .5, town.y + .5);
    const away = distance === undefined ? '' : ` · ${distance} ${point ?? ''}`.trimEnd();
    const nation = data.nations[town.nation] ?? data.nations.pirate;
    return `<li><button type="button" data-town="${index}" aria-pressed="${index === selected}">`
      + `<span class="chart-flag" style="--flag:${nation.color};--flag-dark:${nation.dark}" aria-hidden="true"></span>`
      + `<b>${escapeHtml(town.name)}</b><small>${escapeHtml(town.nation)}${away}</small></button></li>`;
  }

  function renderList() {
    let entries = filterTowns(data.towns, filter);
    if (sortByDistance && data.distanceTo) entries = entries.sort((a, b) => data.distanceTo(a.town) - data.distanceTo(b.town));
    list.innerHTML = entries.length ? entries.map(townLine).join('') : '<li class="chart-empty">No town by that name.</li>';
    sortButton.textContent = sortByDistance ? 'Nearest first' : 'A to Z';
    sortButton.setAttribute('aria-label', `Sort: ${sortByDistance ? 'nearest first' : 'alphabetical'}. Change`);
    for (const button of nationGroup.querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.nation === filter.nation));
  }

  function renderDetail() {
    root.classList.toggle('has-selection', selected >= 0);
    if (selected < 0) {
      detail.classList.add('hidden');
      detail.innerHTML = '';
      return;
    }
    const town = data.towns[selected];
    const { kicker, body } = data.describe(town, selected);
    let course = '';
    if (data.ship) {
      const distance = data.distanceTo?.(town);
      const point = compassPointTo(data.ship.x, data.ship.y, town.x + .5, town.y + .5);
      course = `<p class="chart-course">${data.ship.onFoot ? 'From your landing party' : 'From your ship'}: ${distance} cells${point ? ` to the ${point}` : ''}.</p>`;
    }
    detail.innerHTML = `<p class="eyebrow">${escapeHtml(kicker)}</p><h3>${escapeHtml(town.name)}</h3>${course}${body}`
      + '<div class="chart-detail-actions"><button type="button" data-action="centre">Centre on chart</button><button type="button" class="secondary" data-action="list">All towns</button></div>';
    detail.classList.remove('hidden');
  }

  function select(index, { centre = false } = {}) {
    selected = index;
    if (centre && index >= 0) centreOn(data.towns[index], SELECT_SCALE_CSS * dpr);
    renderDetail();
    renderList();
    requestDraw();
  }

  function onKeyDown(event) {
    if (!data) return;
    // Browser shortcuts (copy, page zoom) pass through untouched.
    if ((event.ctrlKey || event.metaKey || event.altKey) && event.key !== 'Escape') return;
    const typing = event.target === search;
    if (event.key === 'Escape') {
      event.preventDefault();
      if (typing && search.value) { search.value = ''; filter.query = ''; renderList(); requestDraw(); return; }
      close();
      return;
    }
    if (typing) return;
    const step = Math.round(canvas.width / 8);
    const pans = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (pans[event.key] && !event.target.closest?.('#chart-towns')) {
      event.preventDefault();
      view.offsetX += pans[event.key][0];
      view.offsetY += pans[event.key][1];
      clampView();
      requestDraw();
    } else if (event.key === '+' || event.key === '=') { event.preventDefault(); zoomStep(1); }
    else if (event.key === '-' || event.key === '_') { event.preventDefault(); zoomStep(-1); }
    else if (event.key.toLowerCase() === 'c' && !event.repeat) { event.preventDefault(); close(); }
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, devicePoint(event));
    if (pointers.size === 1) {
      drag = { start: devicePoint(event), offsetX: view.offsetX, offsetY: view.offsetY, moved: false };
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      drag = { pinch: Math.hypot(a[0] - b[0], a[1] - b[1]), moved: true };
    }
  });
  canvas.addEventListener('pointermove', (event) => {
    const point = devicePoint(event);
    if (!pointers.has(event.pointerId)) {
      const town = townAt(...point);
      canvas.style.cursor = town >= 0 ? 'pointer' : 'grab';
      if (town !== hovered) { hovered = town; requestDraw(); }
      return;
    }
    pointers.set(event.pointerId, point);
    if (!drag) return;
    if (drag.pinch !== undefined && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const span = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (span / drag.pinch > 1.25 || span / drag.pinch < .8) {
        zoomStep(span > drag.pinch ? 1 : -1, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        drag.pinch = span;
      }
      return;
    }
    if (drag.start) {
      const dx = point[0] - drag.start[0];
      const dy = point[1] - drag.start[1];
      if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_CSS * dpr) return;
      drag.moved = true;
      canvas.style.cursor = 'grabbing';
      view.offsetX = drag.offsetX + dx;
      view.offsetY = drag.offsetY + dy;
      clampView();
      requestDraw();
    }
  });
  const endPointer = (event) => {
    if (!pointers.has(event.pointerId)) return;
    const point = pointers.get(event.pointerId);
    pointers.delete(event.pointerId);
    if (event.type === 'pointerup' && drag && !drag.moved && pointers.size === 0) {
      const town = townAt(...point);
      if (town >= 0) select(town);
    }
    if (pointers.size === 0) { drag = null; canvas.style.cursor = 'grab'; }
    else if (pointers.size === 1) {
      const [remaining] = pointers.values();
      drag = { start: remaining, offsetX: view.offsetX, offsetY: view.offsetY, moved: true };
    }
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', () => { if (hovered !== -1 && !pointers.size) { hovered = -1; requestDraw(); } });
  let wheelDelta = 0;
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    wheelDelta += event.deltaY;
    if (Math.abs(wheelDelta) < 50) return;
    zoomStep(wheelDelta < 0 ? 1 : -1, ...devicePoint(event));
    wheelDelta = 0;
  }, { passive: false });

  root.querySelector('.chart-zoom').addEventListener('click', (event) => {
    const action = event.target.closest('button')?.dataset.zoom;
    if (action === 'in') zoomStep(1);
    if (action === 'out') zoomStep(-1);
    if (action === 'fit') zoomTo(fitScale());
  });
  list.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-town]');
    if (button) {
      select(Number(button.dataset.town), { centre: true });
      detail.querySelector('button')?.focus({ preventScroll: true });
    }
  });
  detail.addEventListener('click', (event) => {
    const action = event.target.closest('button')?.dataset.action;
    if (action === 'centre') centreOn(data.towns[selected], SELECT_SCALE_CSS * dpr);
    if (action === 'list') {
      const index = selected;
      select(-1);
      list.querySelector(`[data-town="${index}"]`)?.focus();
    }
  });
  search.addEventListener('input', () => { filter.query = search.value; renderList(); requestDraw(); });
  search.addEventListener('keydown', (event) => {
    // Enter picks the first match.
    if (event.key !== 'Enter') return;
    const [first] = filterTowns(data.towns, filter);
    if (first) { event.preventDefault(); select(first.index, { centre: true }); }
  });
  nationGroup.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-nation]');
    if (!button) return;
    filter.nation = filter.nation === button.dataset.nation ? '' : button.dataset.nation;
    renderList();
    requestDraw();
  });
  sortButton.addEventListener('click', () => { sortByDistance = !sortByDistance; renderList(); });
  closeButton.addEventListener('click', () => close());
  new ResizeObserver(resize).observe(stage);
  // Registered before the game's own key handler, so while the chart is open
  // no key reaches the voyage underneath (and C does not reopen it).
  addEventListener('keydown', (event) => {
    if (!data) return;
    onKeyDown(event);
    event.stopImmediatePropagation();
  });

  // `options`: { map, towns, nations, ship: { x, y, onFoot } | null,
  // nearestIndex, era, distanceTo(town), describe(town, index) -> { kicker,
  // body }, onClose }.
  // While the chart is open the page under it is inert, so neither Tab nor a
  // focused control's own Enter or Space can reach the voyage beneath.
  const underneath = () => [...root.parentElement.children].filter((element) => element !== root);

  function open(options) {
    if (data) return;
    data = options;
    if (!baseCache.has(options.map)) {
      const painted = paintChartBase(options.map);
      baseCache.set(options.map, { image: toCanvas(painted), width: painted.width, height: painted.height, enlarged: new Map() });
    }
    base = baseCache.get(options.map);
    eraLabel.textContent = `Anno ${options.era}`;
    nationGroup.innerHTML = Object.keys(options.nations).filter((key) => options.towns.some(({ nation }) => nation === key)).map((key) => {
      const { color, dark } = options.nations[key];
      return `<button type="button" data-nation="${key}" aria-pressed="false"><span class="chart-flag" style="--flag:${color};--flag-dark:${dark}" aria-hidden="true"></span>${escapeHtml(key)}</button>`;
    }).join('');
    selected = -1;
    hovered = -1;
    returnFocus = document.activeElement;
    for (const element of underneath()) element.inert = true;
    root.classList.remove('hidden');
    canvas.width = 0;
    canvas.height = 0;
    resize();
    renderDetail();
    renderList();
    if (matchMedia('(pointer: fine)').matches) search.focus({ preventScroll: true });
    else closeButton.focus({ preventScroll: true });
  }

  function close() {
    if (!data) return;
    const { onClose } = data;
    data = null;
    pointers.clear();
    drag = null;
    root.classList.add('hidden');
    root.classList.remove('has-selection');
    for (const element of underneath()) element.inert = false;
    // The enlarged copy can be large on a big high-density screen.
    base?.enlarged.clear();
    canvas.width = 0;
    canvas.height = 0;
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    onClose?.();
  }

  return { open, close, isOpen: () => data !== null, selectTown: (index) => data && select(index, { centre: true }) };
}
