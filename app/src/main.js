// Vice Nights: wires the editor page. Pick photos for the three panels,
// crop and position each one, write the caption, pick a grade and a size,
// and export the cover as a PNG. A `?shot=` query sets up a fixed scene
// for a screenshot instead (see shots.js). Photos are read on this machine
// and never leave it: the app makes no network request at all.
import { drawCover, COVER_SIZES, COVER_GRADES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const subInput = document.getElementById('sub');
const status = document.getElementById('status');
const zoomInput = document.getElementById('zoom');
const panXInput = document.getElementById('panx');
const panYInput = document.getElementById('pany');
const zoomValue = document.getElementById('zoomvalue');
const samePhoto = document.getElementById('samephoto');

/** One photo slot per panel: the image plus its crop (zoom and pan). */
function emptyPhoto() {
  return { img: null, zoom: 1, panX: 0, panY: 0 };
}

const state = {
  size: 'wide',
  grade: 'sunset',
  caption: 'Sunset Heist',
  sub: 'Vice City · 2026',
  photos: [emptyPhoto(), emptyPhoto(), emptyPhoto()],
  selected: 0,
};

function redraw() {
  drawCover(canvas, state);
  const size = COVER_SIZES[state.size];
  document.getElementById('sizelabel').textContent = `${size.width} x ${size.height}`;
}

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Applies the crop sliders to the currently selected panel. */
function applyCropControls() {
  const photo = state.photos[state.selected];
  zoomInput.value = photo.zoom;
  panXInput.value = photo.panX * 100;
  panYInput.value = photo.panY * 100;
  zoomValue.textContent = `${Math.round(photo.zoom * 100)}%`;
  document.querySelectorAll('[data-panel]').forEach((button) => {
    button.classList.toggle('active', Number(button.dataset.panel) === state.selected);
  });
}

/** Puts an image into a panel; with "same photo" on, into every panel. */
function setPhoto(index, img) {
  const targets = samePhoto.checked ? [0, 1, 2] : [index];
  for (const i of targets) {
    state.photos[i] = { img, zoom: 1, panX: 0, panY: 0 };
  }
  state.selected = index;
  applyCropControls();
  redraw();
}

document.querySelectorAll('[data-panel]').forEach((button) => {
  button.addEventListener('click', () => {
    state.selected = Number(button.dataset.panel);
    applyCropControls();
  });
});

document.querySelectorAll('input[type=file][data-photo]').forEach((input) => {
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const img = await loadImage(URL.createObjectURL(file));
      setPhoto(Number(input.dataset.photo), img);
      status.textContent = `Loaded ${file.name} into panel ${Number(input.dataset.photo) + 1}.`;
    } catch {
      status.textContent = 'That file could not be read as a photo.';
    }
  });
});

document.querySelectorAll('[data-sample]').forEach((button) => {
  button.addEventListener('click', async () => {
    try {
      const img = await loadImage(`samples/${button.dataset.sample}.jpg`);
      setPhoto(Number(button.dataset.panel), img);
      status.textContent = `Loaded sample ${button.dataset.sample} into panel ${Number(button.dataset.panel) + 1}.`;
    } catch {
      status.textContent = 'The sample photo could not be loaded.';
    }
  });
});

zoomInput.addEventListener('input', () => {
  const photo = state.photos[state.selected];
  photo.zoom = Number(zoomInput.value);
  zoomValue.textContent = `${Math.round(photo.zoom * 100)}%`;
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

document.querySelectorAll('[data-grade]').forEach((button) => {
  button.addEventListener('click', () => {
    state.grade = button.dataset.grade;
    document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b === button));
    redraw();
  });
});

document.querySelectorAll('[data-size]').forEach((button) => {
  button.addEventListener('click', () => {
    state.size = button.dataset.size;
    document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b === button));
    redraw();
  });
});

document.getElementById('export').addEventListener('click', () => {
  const size = COVER_SIZES[state.size];
  canvas.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed: the browser could not make the PNG.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-nights-${state.size}-${size.width}x${size.height}.png`;
    a.click();
    status.textContent = `Saved vice-nights-${state.size}-${size.width}x${size.height}.png`;
    window.__exported = { width: size.width, height: size.height, bytes: blob.size };
  }, 'image/png');
});

/** Loads the two bundled sample photos so the editor is never empty. */
async function loadSamples() {
  try {
    const pier = await loadImage('samples/pier.jpg');
    const boulevard = await loadImage('samples/boulevard.jpg');
    state.photos[0] = { img: pier, zoom: 1, panX: 0, panY: 0 };
    state.photos[1] = { img: boulevard, zoom: 1, panX: 0, panY: 0 };
    state.photos[2] = { img: pier, zoom: 1.15, panX: 0.2, panY: -0.1 };
  } catch {
    // Samples are a convenience; the app still works with uploads alone.
  }
  applyCropControls();
  redraw();
}

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), state, loadImage, redraw);
} else {
  loadSamples();
}
