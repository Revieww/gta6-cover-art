// Vice Nights cover engine: draws a multi-panel poster cover onto a canvas.
// The cover is three photo panels cut by slanted seams, a sunset / neon /
// midnight colour grade, a sun disc with palm silhouettes drawn from scratch,
// and bold poster lettering. Everything here is original art drawn in code:
// no Rockstar logo, artwork or font is used anywhere.

/** The three export sizes, in pixels. */
export const COVER_SIZES = {
  square: { width: 1080, height: 1080, label: 'Square 1080 x 1080' },
  portrait: { width: 1080, height: 1350, label: 'Portrait 1080 x 1350' },
  wide: { width: 1920, height: 1080, label: 'Wide 1920 x 1080' },
};

/** The colour grades: a canvas filter for the photos plus overlay colours. */
export const COVER_GRADES = {
  sunset: {
    label: 'Vice Sunset',
    filter: 'saturate(1.35) contrast(1.08) sepia(0.22) hue-rotate(-14deg)',
    wash: ['rgba(255, 90, 60, 0.10)', 'rgba(255, 45, 130, 0.30)'],
    sun: ['#ffd76a', '#ff7a3c', '#ff2e88'],
    sky: '#2b0f3d',
  },
  neon: {
    label: 'Neon Nights',
    filter: 'saturate(1.7) contrast(1.12) hue-rotate(14deg)',
    wash: ['rgba(40, 220, 255, 0.10)', 'rgba(160, 40, 255, 0.32)'],
    sun: ['#7df9ff', '#c86bff', '#ff2ea6'],
    sky: '#0d0b33',
  },
  midnight: {
    label: 'Midnight Drive',
    filter: 'saturate(0.85) contrast(1.18) brightness(0.82) hue-rotate(190deg)',
    wash: ['rgba(30, 80, 200, 0.12)', 'rgba(8, 10, 60, 0.42)'],
    sun: ['#e8f1ff', '#9db8ff', '#5a6cff'],
    sky: '#05081f',
  },
};

/**
 * Panel polygons for each size. Each panel is a list of [x, y] points in
 * cover pixels: panel 0 is the hero, panels 1 and 2 are the side panels.
 * The seams slant so the poster reads like a cut-up GTA-style cover.
 */
const PANEL_LAYOUTS = {
  square: [
    [[0, 0], [676, 0], [624, 1080], [0, 1080]],
    [[676, 0], [1080, 0], [1080, 548], [650, 548]],
    [[649, 564], [1080, 564], [1080, 1080], [624, 1080]],
  ],
  wide: [
    [[0, 0], [1150, 0], [1090, 1080], [0, 1080]],
    [[1150, 0], [1920, 0], [1920, 548], [1122, 548]],
    [[1121, 564], [1920, 564], [1920, 1080], [1090, 1080]],
  ],
  portrait: [
    [[0, 0], [1080, 0], [1080, 740], [0, 800]],
    [[0, 816], [540, 786], [520, 1350], [0, 1350]],
    [[556, 786], [1080, 756], [1080, 1350], [536, 1350]],
  ],
};

/** Bounding box of a polygon. */
function panelBounds(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** Clips the context to a polygon and calls fn while clipped. */
function clippedTo(ctx, points, fn) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.clip();
  fn();
  ctx.restore();
}

/**
 * Draws one photo into one panel, cover-fitting it with the panel's zoom
 * and pan. photo is { img, zoom, panX, panY }; pan is -1..1 in each axis.
 */
function drawPanelPhoto(ctx, points, photo, grade) {
  const box = panelBounds(points);
  clippedTo(ctx, points, () => {
    ctx.fillStyle = grade.sky;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    if (!photo || !photo.img) return;
    const img = photo.img;
    const zoom = photo.zoom || 1;
    const base = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight) * zoom;
    const dw = img.naturalWidth * base;
    const dh = img.naturalHeight * base;
    const slackX = Math.max(0, (dw - box.w) / 2);
    const slackY = Math.max(0, (dh - box.h) / 2);
    const dx = box.x + (box.w - dw) / 2 - (photo.panX || 0) * slackX;
    const dy = box.y + (box.h - dh) / 2 - (photo.panY || 0) * slackY;
    ctx.filter = grade.filter;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = 'none';
  });
}

/** Paints the grade wash and a dark vignette over the whole cover. */
function drawGradeWash(ctx, w, h, grade) {
  const wash = ctx.createLinearGradient(0, 0, w * 0.4, h);
  wash.addColorStop(0, grade.wash[0]);
  wash.addColorStop(1, grade.wash[1]);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(10, 0, 25, 0.45)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

/** Draws one palm-tree silhouette: a leaning trunk and six curved fronds. */
function drawPalm(ctx, x, y, s, lean, colour) {
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineCap = 'round';
  // Trunk, leaning by `lean` pixels over its height.
  ctx.lineWidth = Math.max(4, s * 0.07);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * 0.4, y - s * 0.55, x + lean, y - s);
  ctx.stroke();
  const topX = x + lean;
  const topY = y - s;
  // Fronds: arcs drooping out from the crown.
  ctx.lineWidth = Math.max(3, s * 0.045);
  for (let i = 0; i < 6; i++) {
    const a = (-Math.PI * (0.08 + i * 0.17)) - 0.25;
    const len = s * (0.42 + (i % 2) * 0.08);
    const cx = topX + Math.cos(a) * len * 0.55;
    const cy = topY + Math.sin(a) * len * 0.55 - len * 0.12;
    const ex = topX + Math.cos(a) * len;
    const ey = topY + Math.sin(a) * len + len * 0.38;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();
  }
  // A small cluster of coconuts under the crown.
  ctx.beginPath();
  ctx.arc(topX - s * 0.03, topY + s * 0.05, s * 0.045, 0, Math.PI * 2);
  ctx.arc(topX + s * 0.05, topY + s * 0.07, s * 0.04, 0, Math.PI * 2);
  ctx.fill();
}

/** Draws the sun disc and palm silhouettes inside the hero panel. */
function drawSunAndPalms(ctx, heroPoints, grade, w) {
  const box = panelBounds(heroPoints);
  clippedTo(ctx, heroPoints, () => {
    const sunR = Math.min(box.w, box.h) * 0.26;
    const sunX = box.x + box.w * 0.66;
    const sunY = box.y + box.h * 0.30;
    const sun = ctx.createRadialGradient(sunX, sunY, sunR * 0.1, sunX, sunY, sunR);
    sun.addColorStop(0, grade.sun[0]);
    sun.addColorStop(0.55, grade.sun[1]);
    sun.addColorStop(1, grade.sun[2]);
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();
    // Thin horizon glow band under the sun.
    const glow = ctx.createLinearGradient(0, sunY + sunR, 0, sunY + sunR * 2.2);
    glow.addColorStop(0, grade.sun[1] + '55');
    glow.addColorStop(1, grade.sun[1] + '00');
    ctx.fillStyle = glow;
    ctx.fillRect(box.x, sunY + sunR, box.w, sunR * 1.2);
  });
  // Palms stand on the hero's lower edge, silhouetted against the sky.
  const base = box.y + box.h;
  drawPalm(ctx, box.x + box.w * 0.16, base - 6, box.h * 0.34, -box.w * 0.05, '#14082b');
  drawPalm(ctx, box.x + box.w * 0.34, base - 4, box.h * 0.24, box.w * 0.04, '#1c0b33');
}

/** Draws the dark seams between panels and a white frame around the cover. */
function drawSeamsAndFrame(ctx, panels, w, h) {
  ctx.strokeStyle = '#12061f';
  ctx.lineWidth = Math.max(6, w * 0.008);
  ctx.lineJoin = 'round';
  for (const points of panels) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    ctx.stroke();
  }
  // Diagonal accent stripe: a hot pink-to-orange slash across the cover.
  const stripe = ctx.createLinearGradient(0, h * 0.75, w, h * 0.25);
  stripe.addColorStop(0, '#ff2e88');
  stripe.addColorStop(0.5, '#ff7a3c');
  stripe.addColorStop(1, '#ffd76a');
  ctx.fillStyle = stripe;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, h * 0.86);
  ctx.lineTo(w, h * 0.30);
  ctx.lineTo(w, h * 0.30 + h * 0.012);
  ctx.lineTo(0, h * 0.86 + h * 0.012);
  ctx.closePath();
  ctx.globalAlpha = 0.9;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(8, w * 0.009);
  ctx.strokeRect(0, 0, w, h);
}

/** Fits a font size so `text` fits inside maxWidth, starting from `start`. */
function fitFont(ctx, text, start, maxWidth, weight, family) {
  let size = start;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 14 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/** Draws the poster's lettering: kicker, big caption, and sub-caption. */
function drawLettering(ctx, w, h, caption, sub, grade) {
  const family = `'Arial Black', 'Helvetica Neue', Arial, sans-serif`;
  // Kicker, top left.
  const kick = 'VICE NIGHTS';
  ctx.save();
  ctx.font = `900 ${Math.round(h * 0.022)}px ${family}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 8;
  ctx.fillText(kick, w * 0.035, h * 0.055);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(w * 0.035, h * 0.068, ctx.measureText(kick).width, h * 0.008);
  ctx.restore();

  // Caption, big and slanted, across the foot of the cover.
  const text = (caption || '').trim().toUpperCase();
  if (text) {
    const start = Math.round(h * 0.115);
    const size = fitFont(ctx, text, start, w * 0.92, 'italic 900', family);
    ctx.save();
    ctx.translate(w / 2, h - h * 0.045);
    ctx.transform(1, 0, -0.07, 1, 0, 0);
    ctx.font = `italic 900 ${size}px ${family}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.14;
    ctx.strokeStyle = '#14082b';
    ctx.shadowColor = grade.sun[2];
    ctx.shadowBlur = size * 0.22;
    ctx.strokeText(text, 0, 0);
    ctx.shadowBlur = 0;
    const fill = ctx.createLinearGradient(0, -size, 0, size * 0.25);
    fill.addColorStop(0, '#ffffff');
    fill.addColorStop(1, '#ffd76a');
    ctx.fillStyle = fill;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  // Sub-caption, spaced small caps above the caption.
  const subText = (sub || '').trim().toUpperCase();
  if (subText) {
    ctx.save();
    ctx.font = `700 ${Math.round(h * 0.024)}px ${family}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 6;
    try { ctx.letterSpacing = `${Math.round(h * 0.006)}px`; } catch { /* older canvas: no letter spacing */ }
    ctx.fillText(subText, w / 2, h - h * 0.155);
    ctx.restore();
  }
}

/**
 * Draws the whole cover onto `canvas` at its own pixel size.
 * state: { size: 'square'|'portrait'|'wide', grade: 'sunset'|'neon'|'midnight',
 *   photos: [{ img, zoom, panX, panY } x3], caption, sub }.
 * A panel with no photo keeps its grade sky so the cover is never blank.
 */
export function drawCover(canvas, state) {
  const size = COVER_SIZES[state.size] || COVER_SIZES.square;
  const grade = COVER_GRADES[state.grade] || COVER_GRADES.sunset;
  const w = size.width;
  const h = size.height;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext('2d');
  const panels = PANEL_LAYOUTS[state.size] || PANEL_LAYOUTS.square;
  ctx.fillStyle = grade.sky;
  ctx.fillRect(0, 0, w, h);
  const photos = state.photos || [];
  panels.forEach((points, i) => {
    drawPanelPhoto(ctx, points, photos[i] || null, grade);
  });
  drawSunAndPalms(ctx, panels[0], grade, w);
  drawGradeWash(ctx, w, h, grade);
  drawSeamsAndFrame(ctx, panels, w, h);
  drawLettering(ctx, w, h, state.caption, state.sub, grade);
}
