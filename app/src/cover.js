// Vice Nights — the cover renderer. Given a canvas and the editor state it
// paints a three-panel poster cover: photos cut by slanted seams, a Vice
// City colour grade, a hand-drawn sun and palm silhouettes, and big poster
// lettering. Every visual on the cover is drawn here in code; nothing on it
// comes from Rockstar's logo, artwork or fonts.

/** Export sizes, in pixels, keyed by the editor's size buttons. */
export const COVER_SIZES = {
  square: { width: 1080, height: 1080, label: 'Square 1080 x 1080' },
  portrait: { width: 1080, height: 1350, label: 'Portrait 1080 x 1350' },
  wide: { width: 1920, height: 1080, label: 'Wide 1920 x 1080' },
};

/**
 * Colour grades. Each grade tints the photos through a canvas filter and
 * supplies the overlay washes, the sun's colours and the sky colour used
 * for empty panels.
 */
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

// Panel shapes per size, as [x, y] corners in cover pixels. Panel 0 is the
// wide hero; panels 1 and 2 are the smaller side panels. The seams lean so
// the cover reads like a poster cut into strips.
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

/** Smallest rectangle holding a polygon. */
function boundsOf(points) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** Runs fn with the context clipped to a polygon, then restores it. */
function withClip(ctx, points, fn) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.clip();
  fn();
  ctx.restore();
}

/**
 * Fills one panel with its photo, cover-fitted and shifted by the panel's
 * zoom and pan. photo is { img, zoom, panX, panY } with pan in -1..1.
 * A panel without a photo keeps its grade's sky colour.
 */
function paintPhoto(ctx, points, photo, grade) {
  const box = boundsOf(points);
  withClip(ctx, points, () => {
    ctx.fillStyle = grade.sky;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    if (!photo || !photo.img) return;
    const img = photo.img;
    const scale = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight) * (photo.zoom || 1);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const spareX = Math.max(0, (dw - box.w) / 2);
    const spareY = Math.max(0, (dh - box.h) / 2);
    const dx = box.x + (box.w - dw) / 2 - (photo.panX || 0) * spareX;
    const dy = box.y + (box.h - dh) / 2 - (photo.panY || 0) * spareY;
    ctx.filter = grade.filter;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = 'none';
  });
}

/** Tints the whole cover with the grade wash, then darkens the corners. */
function paintWash(ctx, w, h, grade) {
  const wash = ctx.createLinearGradient(0, 0, w * 0.4, h);
  wash.addColorStop(0, grade.wash[0]);
  wash.addColorStop(1, grade.wash[1]);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  const vig = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.35,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(10, 0, 25, 0.45)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

/**
 * One palm silhouette: a leaning trunk, six drooping fronds and a pair of
 * coconuts. (x, y) is the base of the trunk, s its height, lean how far
 * the crown drifts sideways.
 */
function paintPalm(ctx, x, y, s, lean, colour) {
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(4, s * 0.07);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * 0.4, y - s * 0.55, x + lean, y - s);
  ctx.stroke();
  const crownX = x + lean;
  const crownY = y - s;
  ctx.lineWidth = Math.max(3, s * 0.045);
  for (let i = 0; i < 6; i++) {
    const angle = -Math.PI * (0.08 + i * 0.17) - 0.25;
    const len = s * (0.42 + (i % 2) * 0.08);
    const midX = crownX + Math.cos(angle) * len * 0.55;
    const midY = crownY + Math.sin(angle) * len * 0.55 - len * 0.12;
    const endX = crownX + Math.cos(angle) * len;
    const endY = crownY + Math.sin(angle) * len + len * 0.38;
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(crownX - s * 0.03, crownY + s * 0.05, s * 0.045, 0, Math.PI * 2);
  ctx.arc(crownX + s * 0.05, crownY + s * 0.07, s * 0.04, 0, Math.PI * 2);
  ctx.fill();
}

/** Sun disc in the hero's top corner, plus palms along its lower edge. */
function paintSunAndPalms(ctx, heroPoints, grade) {
  const box = boundsOf(heroPoints);
  withClip(ctx, heroPoints, () => {
    // Small sun, tucked high in the corner with a soft glowing rim, so it
    // never sits on top of the subject's face.
    const r = Math.min(box.w, box.h) * 0.14;
    const cx = box.x + box.w * 0.76;
    const cy = box.y + box.h * 0.13;
    const sun = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
    sun.addColorStop(0, grade.sun[0]);
    sun.addColorStop(0.55, grade.sun[1]);
    sun.addColorStop(0.85, grade.sun[2]);
    sun.addColorStop(1, grade.sun[2] + '00');
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // Faint horizon glow fading out beneath the sun.
    const glow = ctx.createLinearGradient(0, cy + r, 0, cy + r * 2.2);
    glow.addColorStop(0, grade.sun[1] + '55');
    glow.addColorStop(1, grade.sun[1] + '00');
    ctx.fillStyle = glow;
    ctx.fillRect(box.x, cy + r, box.w, r * 1.2);
  });
  const base = box.y + box.h;
  paintPalm(ctx, box.x + box.w * 0.16, base - 6, box.h * 0.34, -box.w * 0.05, '#14082b');
  paintPalm(ctx, box.x + box.w * 0.34, base - 4, box.h * 0.24, box.w * 0.04, '#1c0b33');
}

/** Dark seams between the panels, the diagonal accent stripe, white frame. */
function paintSeamsAndFrame(ctx, panels, w, h) {
  ctx.strokeStyle = '#12061f';
  ctx.lineWidth = Math.max(6, w * 0.008);
  ctx.lineJoin = 'round';
  for (const points of panels) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (const [x, y] of points.slice(1)) ctx.lineTo(x, y);
    ctx.closePath();
    ctx.stroke();
  }
  // Thin hot pink-to-orange slash running diagonally across the cover.
  const stripe = ctx.createLinearGradient(0, h * 0.75, w, h * 0.25);
  stripe.addColorStop(0, '#ff2e88');
  stripe.addColorStop(0.5, '#ff7a3c');
  stripe.addColorStop(1, '#ffd76a');
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, h * 0.86);
  ctx.lineTo(w, h * 0.30);
  ctx.lineTo(w, h * 0.30 + h * 0.008);
  ctx.lineTo(0, h * 0.86 + h * 0.008);
  ctx.closePath();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = stripe;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(8, w * 0.009);
  ctx.strokeRect(0, 0, w, h);
}

/** Shrinks a font until `text` fits in maxWidth, starting from `start`. */
function fitSize(ctx, text, start, maxWidth, style, family) {
  let size = start;
  ctx.font = `${style} ${size}px ${family}`;
  while (size > 14 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${style} ${size}px ${family}`;
  }
  return size;
}

/** The poster's lettering: kicker, big slanted caption, sub-caption. */
function paintLettering(ctx, w, h, caption, sub, grade) {
  const family = `'Arial Black', 'Helvetica Neue', Arial, sans-serif`;

  // Kicker in the top-left corner, with a pink underline bar.
  ctx.save();
  ctx.font = `900 ${Math.round(h * 0.022)}px ${family}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 8;
  ctx.fillText('VICE NIGHTS', w * 0.035, h * 0.055);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(w * 0.035, h * 0.068, ctx.measureText('VICE NIGHTS').width, h * 0.008);
  ctx.restore();

  // The caption, big and slightly sheared, across the foot of the cover.
  const text = (caption || '').trim().toUpperCase();
  if (text) {
    const size = fitSize(ctx, text, Math.round(h * 0.115), w * 0.92, 'italic 900', family);
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

  // Sub-caption in spaced small caps, just above the caption.
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
 * Paints the whole cover onto `canvas` at full export pixels.
 * state: { size: 'square' | 'portrait' | 'wide', grade, photos:
 *   [{ img, zoom, panX, panY } x 3], caption, sub }.
 * A panel with no photo keeps its grade sky, so the cover is never blank.
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
  panels.forEach((points, i) => paintPhoto(ctx, points, photos[i] || null, grade));
  paintSunAndPalms(ctx, panels[0], grade);
  paintWash(ctx, w, h, grade);
  paintSeamsAndFrame(ctx, panels, w, h);
  paintLettering(ctx, w, h, state.caption, state.sub, grade);
}
