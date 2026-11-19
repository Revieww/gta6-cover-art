// Vice Nights — the editor page. Pick a photo per panel, crop and position
// each one, write the caption, choose a grade and a post size, then export
// the cover as a PNG. A `?shot=` query instead sets up a fixed scene for a
// screenshot (see shots.js). Photos are read on this machine and never
// leave it: the app makes no network request at all.
import { drawCover, COVER_SIZES, COVER_GRADES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const subInput = document.getElementById('sub');
const statusEl = document.getElementById('status');
const zoomInput = document.getElementById('zoom');
const panXInput = document.getElementById('panx');
const panYInput = document.getElementById('pany');
const zoomLabel = document.getElementById('zoomvalue');
const samePhotoBox = document.getElementById('samephoto');

/** A fresh photo slot: the image plus its crop (zoom and pan). */
function newPhoto() {
  return { img: null, zoom: 1, panX: 0, panY: 0 };
}

const state = {
  size: 'wide',
  grade: 'sunset',
  caption: 'Sunset Heist',
  sub: 'Vice City · 2026',
  photos: [newPhoto(), newPhoto(), newPhoto()],
  selected: 0,
};

function redraw() {
  drawCover(canvas, state);
  const size = COVER_SIZES[state.size];
  document.getElementById('sizelabel').textContent = `${size.width} x ${size.height}`;
}

/** Loads an image from a URL; resolves once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Syncs the crop sliders with the selected panel's crop. */
function syncCropControls() {
  const photo = state.photos[state.selected];
  zoomInput.value = photo.zoom;
  panXInput.value = photo.panX * 100;
  panYInput.value = photo.panY * 100;
  zoomLabel.textContent = `${Math.round(photo.zoom * 100)}%`;
  document.querySelectorAll('[data-panel]').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.panel) === state.selected);
  });
}

/** Puts an image into a panel — or into all three when "same photo" is on. */
function placePhoto(index, img) {
  const targets = samePhotoBox.checked ? [0, 1, 2] : [index];
  for (const i of targets) state.photos[i] = { img, zoom: 1, panX: 0, panY: 0 };
  state.selected = index;
  syncCropControls();
  redraw();
}

document.querySelectorAll('[data-panel]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.selected = Number(btn.dataset.panel);
    syncCropControls();
  });
});

document.querySelectorAll('input[type=file][data-photo]').forEach((input) => {
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const img = await loadImage(URL.createObjectURL(file));
      placePhoto(Number(input.dataset.photo), img);
      statusEl.textContent = `Loaded ${file.name} into panel ${Number(input.dataset.photo) + 1}.`;
    } catch {
      statusEl.textContent = 'That file could not be read as a photo.';
    }
  });
});

document.querySelectorAll('[data-sample]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    try {
      const img = await loadImage(`samples/${btn.dataset.sample}.jpg`);
      placePhoto(Number(btn.dataset.panel), img);
      statusEl.textContent = `Loaded sample ${btn.dataset.sample} into panel ${Number(btn.dataset.panel) + 1}.`;
    } catch {
      statusEl.textContent = 'The sample photo could not be loaded.';
    }
  });
});

zoomInput.addEventListener('input', () => {
  const photo = state.photos[state.selected];
  photo.zoom = Number(zoomInput.value);
  zoomLabel.textContent = `${Math.round(photo.zoom * 100)}%`;
  redraw();
});
panXInput.addEventListener('input', () => {
  state.photos[state.selected].panX = Number(panXInput.value) / 100;
  redraw();
});
panYInput.addEventListener('input', () => {
  state.photos[state.selected].panY = Number(panYInput.value) / 100;
  redraw();
});

captionInput.addEventListener('input', () => {
  state.caption = captionInput.value;
  redraw();
});
subInput.addEventListener('input', () => {
  state.sub = subInput.value;
  redraw();
});

document.querySelectorAll('[data-grade]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.grade = btn.dataset.grade;
    document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b === btn));
    redraw();
  });
});

document.querySelectorAll('[data-size]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.size = btn.dataset.size;
    document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b === btn));
    redraw();
  });
});

document.getElementById('export').addEventListener('click', () => {
  const size = COVER_SIZES[state.size];
  canvas.toBlob((blob) => {
    if (!blob) {
      statusEl.textContent = 'Export failed: the browser could not make the PNG.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-nights-${state.size}-${size.width}x${size.height}.png`;
    a.click();
    statusEl.textContent = `Saved vice-nights-${state.size}-${size.width}x${size.height}.png`;
    window.__exported = { width: size.width, height: size.height, bytes: blob.size };
  }, 'image/png');
});

/** Fills the three panels with the bundled sample photos on first load. */
async function loadSamples() {
  try {
    const pier = await loadImage('samples/pier.jpg');
    const boulevard = await loadImage('samples/boulevard.jpg');
    state.photos[0] = { img: pier, zoom: 1, panX: 0, panY: 0 };
    state.photos[1] = { img: boulevard, zoom: 1, panX: 0, panY: 0 };
    state.photos[2] = { img: pier, zoom: 1.15, panX: 0.2, panY: -0.1 };
  } catch {
    // Samples are a convenience; uploads alone still work without them.
  }
  syncCropControls();
  redraw();
}

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), state, loadImage, redraw);
} else {
  loadSamples();
}
