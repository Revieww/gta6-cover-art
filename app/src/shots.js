// Fixed scenes for screenshots. `?shot=editor` shows the editor with a
// sample photo loaded; `?shot=cover` shows the finished cover alone,
// filling the viewport. Query params: photo (pier|boulevard), caption, sub,
// grade (sunset|neon|midnight), size (square|portrait|wide).
// window.__shotReady is set once the scene has been painted.
import { COVER_SIZES, COVER_GRADES } from './cover.js';

export async function runShot(shot, query, state, loadImage, redraw) {
  const photoName = query.get('photo') ?? 'pier';
  const caption = query.get('caption') ?? 'Sunset Heist';
  const sub = query.get('sub') ?? 'Vice City · 2026';
  const grade = query.get('grade') ?? 'sunset';
  const size = query.get('size') ?? 'wide';
  if (COVER_GRADES[grade]) state.grade = grade;
  if (COVER_SIZES[size]) state.size = size;
  state.caption = caption;
  state.sub = sub;
  document.getElementById('caption').value = caption;
  document.getElementById('sub').value = sub;
  document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b.dataset.size === state.size));

  const hero = await loadImage(`samples/${photoName}.jpg`);
  const other = await loadImage(`samples/${photoName === 'pier' ? 'boulevard' : 'pier'}.jpg`);
  state.photos = [
    { img: hero, zoom: 1, panX: 0, panY: 0 },
    { img: other, zoom: 1, panX: 0, panY: 0 },
    { img: hero, zoom: 1.2, panX: 0.15, panY: -0.1 },
  ];
  if (shot === 'cover') document.body.classList.add('shot-cover');
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
