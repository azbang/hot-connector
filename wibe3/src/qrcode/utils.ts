// @ts-nocheck

import { qrcode } from "./core";

function createQRCode(text, level, version, quiet) {
  const qr = {};
  const vqr = qrcode(version, level);
  vqr.addData(text);
  vqr.make();

  quiet = quiet || 0;

  const qrModuleCount = vqr.getModuleCount();
  const quietModuleCount = vqr.getModuleCount() + 2 * quiet;

  function isDark(row, col) {
    row -= quiet;
    col -= quiet;

    if (row < 0 || row >= qrModuleCount || col < 0 || col >= qrModuleCount) {
      return false;
    }
    return vqr.isDark(row, col);
  }

  qr.text = text;
  qr.level = level;
  qr.version = version;
  qr.moduleCount = quietModuleCount;
  qr.isDark = isDark;
  return qr;
}

// Returns a minimal QR code for the given text starting with version `minVersion`.
// Returns `undefined` if `text` is too long to be encoded in `maxVersion`.
export function createMinQRCode(text, level, minVersion, maxVersion, quiet) {
  minVersion = Math.max(1, minVersion || 1);
  maxVersion = Math.min(40, maxVersion || 40);
  for (let version = minVersion; version <= maxVersion; version += 1) {
    try {
      return createQRCode(text, level, version, quiet);
    } catch (err) {}
  }
  return undefined;
}

// used when center is filled
export function drawModuleRoundedDark(ctx, l, t, r, b, rad, nw, ne, se, sw) {
  //let moveTo = (x, y) => ctx.moveTo(Math.floor(x), Math.floor(y));
  if (nw) {
    ctx.moveTo(l + rad, t);
  } else {
    ctx.moveTo(l, t);
  }

  function lal(b, x0, y0, x1, y1, r0, r1) {
    if (b) {
      ctx.lineTo(x0 + r0, y0 + r1);
      ctx.arcTo(x0, y0, x1, y1, rad);
    } else {
      ctx.lineTo(x0, y0);
    }
  }

  lal(ne, r, t, r, b, -rad, 0);
  lal(se, r, b, l, b, 0, -rad);
  lal(sw, l, b, l, t, rad, 0);
  lal(nw, l, t, r, t, 0, rad);
}

// used when center is empty
export function drawModuleRoundendLight(ctx, l, t, r, b, rad, nw, ne, se, sw) {
  function mlla(x, y, r0, r1) {
    ctx.moveTo(x + r0, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + r1);
    ctx.arcTo(x, y, x + r0, y, rad);
  }

  if (nw) mlla(l, t, rad, rad);
  if (ne) mlla(r, t, -rad, rad);
  if (se) mlla(r, b, -rad, -rad);
  if (sw) mlla(l, b, rad, -rad);
}

export function drawModuleRounded(qr, context, settings, left, top, width, row, col) {
  let isDark = qr.isDark,
    right = left + width,
    bottom = top + width,
    rowT = row - 1,
    rowB = row + 1,
    colL = col - 1,
    colR = col + 1,
    radius = Math.floor(Math.min(0.5, Math.max(0, settings.radius)) * width),
    center = isDark(row, col),
    northwest = isDark(rowT, colL),
    north = isDark(rowT, col),
    northeast = isDark(rowT, colR),
    east = isDark(row, colR),
    southeast = isDark(rowB, colR),
    south = isDark(rowB, col),
    southwest = isDark(rowB, colL),
    west = isDark(row, colL);

  left = Math.round(left);
  top = Math.round(top);
  right = Math.round(right);
  bottom = Math.round(bottom);

  if (center) {
    drawModuleRoundedDark(context, left, top, right, bottom, radius, !north && !west, !north && !east, !south && !east, !south && !west);
  } else {
    drawModuleRoundendLight(context, left, top, right, bottom, radius, north && west && northwest, north && east && northeast, south && east && southeast, south && west && southwest);
  }
}

export function drawModules(qr, context, settings) {
  let moduleCount = qr.moduleCount,
    moduleSize = settings.size / moduleCount,
    row,
    col;

  context.beginPath();
  for (row = 0; row < moduleCount; row += 1) {
    for (col = 0; col < moduleCount; col += 1) {
      let l = col * moduleSize,
        t = row * moduleSize,
        w = moduleSize;

      drawModuleRounded(qr, context, settings, l, t, w, row, col);
    }
  }

  setFill(context, settings.fill, settings.size);
  context.fill();
}

export function setFill(context, fill, size) {
  if (typeof fill === "string") {
    // solid color
    context.fillStyle = fill;
    return;
  }
  const type = fill["type"],
    position = fill["position"],
    colorStops = fill["colorStops"];
  let gradient;
  const absolutePosition = position.map((coordinate) => Math.round(coordinate * size));
  if (type === "linear-gradient") {
    gradient = context.createLinearGradient.apply(context, absolutePosition);
  } else if (type === "radial-gradient") {
    gradient = context.createRadialGradient.apply(context, absolutePosition);
  } else {
    throw new Error("Unsupported fill");
  }
  colorStops.forEach(([offset, color]) => {
    gradient.addColorStop(offset, color);
  });
  context.fillStyle = gradient;
}
