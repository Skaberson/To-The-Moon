const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;

const WORLD = {
  width: canvas.width,
  height: canvas.height,
  gravity: 980,
  airDrag: 0.995,
};

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = window.innerWidth;
  const cssHeight = window.innerHeight;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  WORLD.width = canvas.width / dpr;
  WORLD.height = canvas.height / dpr;
}

const frogImage = new Image();
frogImage.src = "./character/teto.png";
let frogSolidPixels = null;
let frogSolidPixelsBase = null;
let frogSolidPixelsDeformed = null;
let frogHalfWidth = 0;
let frogHalfHeight = 0;
let frogMass = 1;
let frogInertia = 1;
const frogOutlineImage = new Image();
frogOutlineImage.src = "./character/frog-outline.png";
const frogPartsImage = new Image();
frogPartsImage.src = "./character/frog-parts.png";
let frogBaseImageData = null;
let frogSquishMap = null;
let frogSquishCanvas = null;
let frogSquishCtx = null;
let frogSquishOutput = null;
let frogSquishPad = 0;
let frogPartsMap = null;
let frogParts = null;
let frogPartsCollisionMap = null;
let frogPartsCollision = null;
let frogPartsRenderToCollision = null;
const frogSquishScale = 2;

const foregroundImage = new Image();
foregroundImage.src = "./backgrounds/foreground.png";

const foregroundLowerPaths = [
  "./backgrounds/foregroundlower1.png",
  "./backgrounds/foregroundlower2.png",
  "./backgrounds/foregroundlower3.png",
];
const foregroundLowerImages = foregroundLowerPaths.map((src) => {
  const img = new Image();
  img.src = src;
  return img;
});

let foregroundLayers = [];

const bg1Image = new Image();
bg1Image.src = "./backgrounds/bg1.png";
const bg2Image = new Image();
bg2Image.src = "./backgrounds/bg2.png";

const tree1Image = new Image();
tree1Image.src = "./destructables/tree1.png";
const tree2Image = new Image();
tree2Image.src = "./destructables/tree2.png";
const woodImage = new Image();
woodImage.src = "./items/wood.png";

const inventoryBackgroundImage = new Image();
inventoryBackgroundImage.src = "./inventory/inventorybackground.png";
const inventorySlotImage = new Image();
inventorySlotImage.src = "./inventory/slot.png";
const inventoryExitImage = new Image();
inventoryExitImage.src = "./inventory/exitbutton.png";
const inventoryCursorImage = new Image();
inventoryCursorImage.src = "./inventory/cursor.png";

tree1Image.onload = () => {
  propTypes.tree1.mask = buildSolidPixelMap(tree1Image);
  propTypes.tree1.width = tree1Image.width;
  propTypes.tree1.height = tree1Image.height;
};

tree2Image.onload = () => {
  propTypes.tree2.mask = buildSolidPixelMap(tree2Image);
  propTypes.tree2.width = tree2Image.width;
  propTypes.tree2.height = tree2Image.height;
};

const player = {
  x: 200,
  y: 450,
  vx: 0,
  vy: 0,
  angle: 0,
  angularVelocity: 0,
  scale: 2,
  radius: 22,
};
const squishState = {
  timer: 0,
  amount: 0,
  normal: { x: 0, y: -1 },
  maxPixels: 18,
  lastRenderedAmount: 0,
  value: 0,
};

const camera = {
  x: 0,
  y: 0,
  smooth: 6,
  zoom: 1.3,
};

let lastTime = 0;
let isDragging = false;
let dragStart = null;
let dragCurrent = null;
let pointerLocked = false;
let moveAccumX = 0;
let moveAccumY = 0;
let lastMoveAt = 0;
let inventoryOpen = false;
const inventoryCursor = { x: 0, y: 0 };
let lastSwipeAt = 0;
let swipeHeld = false;
let gameMode = null; // "TTM" | "TTC"
let gameState = "title"; // "title" | "play"

let stars = [];

function rebuildStars() {
  const count = Math.max(60, Math.floor((WORLD.width * WORLD.height) / 12000));
  stars = Array.from({ length: count }, () => ({
    x: Math.random() * WORLD.width,
    y: Math.random() * WORLD.height,
    r: Math.random() * 1.5 + 0.5,
  }));
}

const foreground = {
  x: 0,
  y: 0,
  scale: 1,
  overlap: 1,
};

const bg1 = {
  scale: 2.5,
  y: -120,
};
const bg2 = {
  scale: 3.4,
  y: -220,
};

const woodState = {
  count: 0,
};

const props = [];
const woodDrops = [];

const propTypes = {
  tree1: { image: tree1Image, scale: 1.2, hits: 2, wood: 4, mask: null, width: 0, height: 0 },
  tree2: { image: tree2Image, scale: 1.6, hits: 2, wood: 10, mask: null, width: 0, height: 0 },
};

function buildForegroundLayers() {
  foregroundLayers = [];
  let currentY = foreground.y;
  const images = [foregroundImage, ...foregroundLowerImages];
  for (const image of images) {
    const baseMask = buildSolidPixelMap(image);
    const name = image.src.split("/").pop();
    foregroundLayers.push({
      image,
      baseMask,
      chunks: new Map(),
      width: image.width,
      height: image.height,
      name,
      x: foreground.x,
      y: currentY,
      scale: foreground.scale,
      overlap: foreground.overlap,
    });
    currentY += image.height * foreground.scale - foreground.overlap;
  }
}

function spawnProps() {
  props.length = 0;
  const span = 1400;
  const startX = player.x - span / 2;
  const step = 180;
  let toggle = false;
  for (let x = startX; x <= startX + span; x += step) {
    const surfaceY = getSurfaceYAtX(x);
    if (surfaceY === null) continue;
    const type = toggle ? propTypes.tree2 : propTypes.tree1;
    toggle = !toggle;
    const img = type.image;
    if (!img.complete) continue;
    const height = img.height * type.scale;
    props.push({
      type,
      x,
      y: surfaceY - height,
      hits: 0,
      lastHitAt: 0,
    });
  }
}

function getForegroundLayerByName(name) {
  return foregroundLayers.find((layer) => layer.image.src.endsWith(name)) || null;
}

function getCameraBottomLimit() {
  const layer = getForegroundLayerByName("foregroundlower2.png");
  if (!layer) return null;
  const middleY = layer.y + (layer.height * layer.scale) / 2;
  return middleY - WORLD.height / camera.zoom;
}

function getSurfaceYAtX(worldX) {
  if (!foregroundLayers.length) return null;
  const invScale = 1 / foreground.scale;

  for (const layer of foregroundLayers) {
    for (let fy = 0; fy < layer.height; fy += 1) {
      const wy = layer.y + fy * layer.scale;
      if (sampleLayerAtWorld(layer, worldX, wy)) {
        return layer.y + fy * layer.scale;
      }
    }
  }

  return null;
}

function spawnWoodDrops(x, y, amount) {
  for (let i = 0; i < amount; i += 1) {
    woodDrops.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 40,
      vy: -Math.random() * 60,
    });
  }
}

function resetPlayer() {
  player.x = 200;
  const surfaceY = getSurfaceYAtX(player.x);
  player.y = surfaceY !== null ? surfaceY - 40 : 450;
  player.vx = 0;
  player.vy = 0;
  player.angle = 0;
  player.angularVelocity = 0;

  camera.x = player.x - WORLD.width / 2;
  camera.y = player.y - WORLD.height / 2;
}

function drawParallax(offsetY) {
  ctx.fillStyle = "#0b0d17";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.fillStyle = "#cfd7ff";
  for (const s of stars) {
    const y = (s.y + offsetY * 0.05) % WORLD.height;
    ctx.beginPath();
    ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#1a2140";
  ctx.fillRect(0, WORLD.height * 0.65 + offsetY * 0.1, WORLD.width, WORLD.height);

  ctx.fillStyle = "#24305a";
  ctx.fillRect(0, WORLD.height * 0.75 + offsetY * 0.2, WORLD.width, WORLD.height);

  ctx.fillStyle = "#2f3b6a";
  ctx.fillRect(0, WORLD.height * 0.85 + offsetY * 0.4, WORLD.width, WORLD.height);
}

function drawPlayer() {
  if (!frogImage.complete) return;
  const w = frogImage.width * player.scale;
  const h = frogImage.height * player.scale;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  if (frogSquishCanvas && squishState.value > 0 && frogSquishOutput) {
    const padWorld = (frogSquishPad / frogSquishScale) * player.scale;
    const drawW = w + padWorld * 2;
    const drawH = h + padWorld * 2;
    ctx.drawImage(frogSquishCanvas, -w / 2 - padWorld, -h / 2 - padWorld, drawW, drawH);
  } else {
    ctx.drawImage(frogImage, -w / 2, -h / 2, w, h);
  }
  ctx.restore();
}

function buildSolidPixelMask(image) {
  const offscreen = document.createElement("canvas");
  offscreen.width = image.width;
  offscreen.height = image.height;
  const octx = offscreen.getContext("2d");
  octx.drawImage(image, 0, 0);

  const { data } = octx.getImageData(0, 0, image.width, image.height);
  const solid = [];
  const alphaThreshold = 10;
  const density = 1;
  let mass = 0;
  let inertia = 0;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const idx = (y * image.width + x) * 4;
      if (data[idx + 3] > alphaThreshold) {
        solid.push({ x, y });
        const lx = x - image.width / 2;
        const ly = y - image.height / 2;
        mass += density;
        inertia += density * (lx * lx + ly * ly);
      }
    }
  }

  frogHalfWidth = image.width / 2;
  frogHalfHeight = image.height / 2;
  frogMass = Math.max(1, mass);
  frogInertia = Math.max(1, inertia);
  frogSolidPixelsBase = solid;
  frogSolidPixels = solid;
  return solid;
}

function buildSquishMap(image, scale) {
  const offscreen = document.createElement("canvas");
  offscreen.width = image.width * scale;
  offscreen.height = image.height * scale;
  const octx = offscreen.getContext("2d");
  octx.imageSmoothingEnabled = false;
  octx.drawImage(image, 0, 0, offscreen.width, offscreen.height);

  const { data } = octx.getImageData(0, 0, offscreen.width, offscreen.height);
  const map = new Float32Array(offscreen.width * offscreen.height);

  for (let i = 0; i < offscreen.width * offscreen.height; i += 1) {
    const r = data[i * 4 + 0];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const a = data[i * 4 + 3];
    if (a === 0) {
      map[i] = 0;
      continue;
    }
    const luminance = (r + g + b) / (3 * 255);
    map[i] = 1 - luminance;
  }

  return map;
}

function buildPartsMap(image, scale, squishMap) {
  const offscreen = document.createElement("canvas");
  offscreen.width = image.width * scale;
  offscreen.height = image.height * scale;
  const octx = offscreen.getContext("2d");
  octx.imageSmoothingEnabled = false;
  octx.drawImage(image, 0, 0, offscreen.width, offscreen.height);

  const { data } = octx.getImageData(0, 0, offscreen.width, offscreen.height);
  const map = new Int32Array(offscreen.width * offscreen.height);
  const colorToId = new Map();
  const parts = [];
  const connectors = [];

  for (let y = 0; y < offscreen.height; y += 1) {
    for (let x = 0; x < offscreen.width; x += 1) {
      const idx = (y * offscreen.width + x) * 4;
      const r = data[idx + 0];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      const pIdx = y * offscreen.width + x;

      if (a === 0) {
        map[pIdx] = -1;
        continue;
      }

      if (r < 5 && g < 5 && b < 5) {
        map[pIdx] = -1;
        connectors.push({ x, y });
        continue;
      }

      const key = `${r},${g},${b},${a}`;
      let id = colorToId.get(key);
      if (id === undefined) {
        id = parts.length;
        colorToId.set(key, id);
        parts.push({
          key,
          count: 0,
          sumX: 0,
          sumY: 0,
          flexSum: 0,
          hingeSumX: 0,
          hingeSumY: 0,
          hingeCount: 0,
          pivot: { x: 0, y: 0 },
          lever: { x: 0, y: 0 },
          leverLen: 0,
          flex: 1,
          cos: 1,
          sin: 0,
        });
      }

      map[pIdx] = id;
      const part = parts[id];
      part.count += 1;
      part.sumX += x;
      part.sumY += y;
      if (squishMap && squishMap.length === map.length) {
        part.flexSum += squishMap[pIdx];
      } else {
        part.flexSum += 1;
      }
    }
  }

  for (const c of connectors) {
    const { x, y } = c;
    const neighborOffsets = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
    for (const off of neighborOffsets) {
      const nx = x + off.dx;
      const ny = y + off.dy;
      if (nx < 0 || ny < 0 || nx >= offscreen.width || ny >= offscreen.height) continue;
      const nIdx = ny * offscreen.width + nx;
      const partId = map[nIdx];
      if (partId < 0) continue;
      const part = parts[partId];
      part.hingeSumX += x;
      part.hingeSumY += y;
      part.hingeCount += 1;
    }
  }

  for (const part of parts) {
    if (part.count === 0) continue;
    const cx = part.sumX / part.count;
    const cy = part.sumY / part.count;
    if (part.hingeCount > 0) {
      part.pivot.x = part.hingeSumX / part.hingeCount;
      part.pivot.y = part.hingeSumY / part.hingeCount;
    } else {
      part.pivot.x = cx;
      part.pivot.y = cy;
    }
    part.lever.x = cx - part.pivot.x;
    part.lever.y = cy - part.pivot.y;
    part.leverLen = Math.hypot(part.lever.x, part.lever.y);
    part.flex = Math.min(1, Math.max(0.15, part.flexSum / part.count));
  }

  return { map, parts, width: offscreen.width, height: offscreen.height };
}

function buildSolidPixelMap(image) {
  const offscreen = document.createElement("canvas");
  offscreen.width = image.width;
  offscreen.height = image.height;
  const octx = offscreen.getContext("2d");
  octx.drawImage(image, 0, 0);

  const { data } = octx.getImageData(0, 0, image.width, image.height);
  const solid = new Uint8Array(image.width * image.height);
  const alphaThreshold = 10;

  for (let i = 0; i < image.width * image.height; i += 1) {
    solid[i] = data[i * 4 + 3] > alphaThreshold ? 1 : 0;
  }

  return solid;
}

function drawTiledImageHorizontal(image, offsetX, y, scale = 1, viewLeft = 0, viewRight = WORLD.width) {
  if (typeof image.complete === "boolean" && !image.complete) return;
  const w = image.width * scale;
  const h = image.height * scale;
  if (!w || !h) return;

  const startX = Math.floor((viewLeft - offsetX) / w) * w + offsetX - w;
  const endX = viewRight + w;

  for (let x = startX; x < endX; x += w) {
    ctx.drawImage(image, x, y, w, h);
  }
}

function getLayerAtWorldY(worldY) {
  const invScale = 1 / foreground.scale;
  for (const layer of foregroundLayers) {
    const fy = Math.round((worldY - layer.y) * invScale);
    if (fy >= 0 && fy < layer.height) {
      return { layer, fy };
    }
    if (gameMode === "TTC" && layer.name === "foregroundlower3.png" && worldY >= layer.y) {
      const wrappedFy = ((fy % layer.height) + layer.height) % layer.height;
      return { layer, fy: wrappedFy };
    }
  }
  return null;
}

function sampleLayer(layer, fx, fy) {
  if (fy < 0 || fy >= layer.height) return 0;
  if (fx < 0 || fx >= layer.width) return 0;
  return layer.baseMask[fy * layer.width + fx] ? 1 : 0;
}

function getLayerTileIndex(layer, worldX) {
  const invScale = 1 / foreground.scale;
  const fxUnwrapped = (worldX - layer.x) * invScale;
  return Math.floor(fxUnwrapped / layer.width);
}

function getLayerLocalX(layer, worldX, tileIndex) {
  const invScale = 1 / foreground.scale;
  const fxUnwrapped = (worldX - layer.x) * invScale;
  return Math.round(fxUnwrapped - tileIndex * layer.width);
}

function getLayerChunk(layer, tileIndex, rowIndex, create) {
  const key = `${tileIndex}:${rowIndex}`;
  if (layer.chunks.has(key)) return layer.chunks.get(key);
  if (!create) return null;

  const canvas = document.createElement("canvas");
  canvas.width = layer.width;
  canvas.height = layer.height;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(layer.image, 0, 0);
  const mask = new Uint8Array(layer.baseMask);
  const chunk = { canvas, ctx, mask };
  layer.chunks.set(key, chunk);
  return chunk;
}

function sampleLayerAtWorld(layer, worldX, worldY) {
  const invScale = 1 / foreground.scale;
  let fy = Math.round((worldY - layer.y) * invScale);
  const tileH = layer.height * layer.scale;
  const rowIndex = Math.floor((worldY - layer.y) / tileH);
  if (gameMode === "TTC" && layer.name === "foregroundlower3.png" && worldY >= layer.y) {
    fy = ((fy % layer.height) + layer.height) % layer.height;
  } else if (fy < 0 || fy >= layer.height) {
    return 0;
  }
  const tileIndex = getLayerTileIndex(layer, worldX);
  const fx = getLayerLocalX(layer, worldX, tileIndex);
  if (fx < 0 || fx >= layer.width) return 0;
  const chunk = getLayerChunk(
    layer,
    tileIndex,
    gameMode === "TTC" && layer.name === "foregroundlower3.png" ? rowIndex : 0,
    false
  );
  const mask = chunk ? chunk.mask : layer.baseMask;
  return mask[fy * layer.width + fx] ? 1 : 0;
}

function digAtWorld(worldX, worldY, radius) {
  if (!foregroundLayers.length) return;
  const invScale = 1 / foreground.scale;
  const r = Math.max(1, Math.round(radius * invScale));

  for (const layer of foregroundLayers) {
    const fyCenter = Math.round((worldY - layer.y) * invScale);
    if (fyCenter < -r || fyCenter >= layer.height + r) continue;

    const tileIndex = getLayerTileIndex(layer, worldX);
    const fxCenter = getLayerLocalX(layer, worldX, tileIndex);
    const tileH = layer.height * layer.scale;
    const rowIndex =
      gameMode === "TTC" && layer.name === "foregroundlower3.png"
        ? Math.floor((worldY - layer.y) / tileH)
        : 0;
    const chunk = getLayerChunk(layer, tileIndex, rowIndex, true);
    for (let dy = -r; dy <= r; dy += 1) {
      const fy = fyCenter + dy;
      if (fy < 0 || fy >= layer.height) continue;
      for (let dx = -r; dx <= r; dx += 1) {
        if (dx * dx + dy * dy > r * r) continue;
        const fx = fxCenter + dx;
        if (fx < 0 || fx >= layer.width) continue;
        const idx = fy * layer.width + fx;
        if (!chunk.mask[idx]) continue;
        chunk.mask[idx] = 0;
        chunk.ctx.clearRect(fx, fy, 1, 1);
      }
    }
  }
}

function samplePropMask(type, fx, fy) {
  if (!type.mask) return 0;
  if (fx < 0 || fy < 0 || fx >= type.width || fy >= type.height) return 0;
  return type.mask[fy * type.width + fx] ? 1 : 0;
}

function samplePropMaskLoose(type, fx, fy, radius) {
  for (let oy = -radius; oy <= radius; oy += 1) {
    for (let ox = -radius; ox <= radius; ox += 1) {
      if (samplePropMask(type, fx + ox, fy + oy)) return 1;
    }
  }
  return 0;
}

function getInvMass() {
  return 1 / (frogMass * player.scale * player.scale);
}

function getInvInertia() {
  const s2 = player.scale * player.scale;
  return 1 / (frogInertia * s2 * s2);
}

function resolveCollision(hitInfo, restitution, friction) {
  if (!hitInfo || !hitInfo.hit) return;
  const normal = hitInfo.normal;
  const r = {
    x: hitInfo.contact.x - player.x,
    y: hitInfo.contact.y - player.y,
  };
  const vcx = player.vx - player.angularVelocity * r.y;
  const vcy = player.vy + player.angularVelocity * r.x;
  const velAlongNormal = vcx * normal.x + vcy * normal.y;
  if (velAlongNormal > 0) return;

  const invMass = getInvMass();
  const invInertia = getInvInertia();
  const rn = r.x * normal.y - r.y * normal.x;
  const denom = invMass + (rn * rn) * invInertia;
  if (denom <= 0) return;

  const j = -(1 + restitution) * velAlongNormal / denom;
  const impX = normal.x * j;
  const impY = normal.y * j;
  player.vx += impX * invMass;
  player.vy += impY * invMass;
  player.angularVelocity += rn * j * invInertia;

  const tangent = { x: -normal.y, y: normal.x };
  const velAlongT = vcx * tangent.x + vcy * tangent.y;
  const rt = r.x * tangent.y - r.y * tangent.x;
  const denomT = invMass + (rt * rt) * invInertia;
  if (denomT > 0) {
    let jt = -velAlongT / denomT;
    const maxF = j * friction;
    if (jt > maxF) jt = maxF;
    if (jt < -maxF) jt = -maxF;
    const fX = tangent.x * jt;
    const fY = tangent.y * jt;
    player.vx += fX * invMass;
    player.vy += fY * invMass;
    player.angularVelocity += rt * jt * invInertia;
  }

  const impactSpeed = Math.max(0, -velAlongNormal);
  squishState.amount = Math.min(1, impactSpeed / 500);
  squishState.value = Math.max(squishState.value, squishState.amount);
  squishState.normal = { x: normal.x, y: normal.y };

  // Kill tiny oscillations along the normal.
  const postVn = player.vx * normal.x + player.vy * normal.y;
  if (Math.abs(postVn) < 6) {
    player.vx -= postVn * normal.x;
    player.vy -= postVn * normal.y;
  }

  if (
    gameMode === "TTC" &&
    hitInfo.source === "ground" &&
    impactSpeed > 80 &&
    performance.now() - lastSwipeAt < 300
  ) {
    digAtWorld(hitInfo.contact.x, hitInfo.contact.y, 18);
  }
}

function positionalCorrection(hitInfo) {
  if (!hitInfo || !hitInfo.hit) return;
  const n = hitInfo.normal;
  const correction = 0.4;
  player.x += n.x * correction;
  player.y += n.y * correction;
}

function getPropCollisionInfo(prop, testX, testY) {
  const type = prop.type;
  if (!frogSolidPixels || !type.mask) return { hit: false };
  const cos = Math.cos(player.angle);
  const sin = Math.sin(player.angle);
  const invScale = 1 / type.scale;
  const padding = 1;

  const solidPixels = frogSolidPixelsDeformed || frogSolidPixels;
  for (const p of solidPixels) {
    const lx = (p.x - frogHalfWidth) * player.scale;
    const ly = (p.y - frogHalfHeight) * player.scale;

    const wx = testX + lx * cos - ly * sin;
    const wy = testY + lx * sin + ly * cos;

    const fx = Math.round((wx - prop.x) * invScale);
    const fy = Math.round((wy - prop.y) * invScale);
    if (!samplePropMaskLoose(type, fx, fy, padding)) continue;

    const nx = samplePropMask(type, fx - 1, fy) - samplePropMask(type, fx + 1, fy);
    const ny = samplePropMask(type, fx, fy - 1) - samplePropMask(type, fx, fy + 1);
    let normalX = nx;
    let normalY = ny;
    const nLen = Math.hypot(normalX, normalY);
    if (nLen > 0) {
      normalX /= nLen;
      normalY /= nLen;
    } else {
      const vx = testX - player.x;
      const vy = testY - player.y;
      const vLen = Math.hypot(vx, vy) || 1;
      normalX = -vx / vLen;
      normalY = -vy / vLen;
    }

    return {
      hit: true,
      contact: { x: wx, y: wy },
      normal: { x: normalX, y: normalY },
      source: "prop",
      prop,
    };
  }

  return { hit: false };
}

function getCollisionInfo(testX, testY) {
  if (!frogSolidPixels || !foregroundLayers.length) return { hit: false };
  const cos = Math.cos(player.angle);
  const sin = Math.sin(player.angle);
  const invScale = 1 / foreground.scale;

  const solidPixels = frogSolidPixelsDeformed || frogSolidPixels;
  for (const p of solidPixels) {
    const lx = (p.x - frogHalfWidth) * player.scale;
    const ly = (p.y - frogHalfHeight) * player.scale;

    const wx = testX + lx * cos - ly * sin;
    const wy = testY + lx * sin + ly * cos;

    const layerInfo = getLayerAtWorldY(wy);
    if (!layerInfo) continue;
    const { layer, fy } = layerInfo;
    const tileIndex = getLayerTileIndex(layer, wx);
    const fx = getLayerLocalX(layer, wx, tileIndex);

    if (!sampleLayerAtWorld(layer, wx, wy)) continue;

    const nx =
      sampleLayerAtWorld(layer, wx - foreground.scale, wy) -
      sampleLayerAtWorld(layer, wx + foreground.scale, wy);
    const ny =
      sampleLayerAtWorld(layer, wx, wy - foreground.scale) -
      sampleLayerAtWorld(layer, wx, wy + foreground.scale);
    let normalX = nx;
    let normalY = ny;
    const nLen = Math.hypot(normalX, normalY);
    if (nLen > 0) {
      normalX /= nLen;
      normalY /= nLen;
    } else {
      // Fallback normal pointing away from movement.
      const vx = testX - player.x;
      const vy = testY - player.y;
      const vLen = Math.hypot(vx, vy) || 1;
      normalX = -vx / vLen;
      normalY = -vy / vLen;
    }

    return {
      hit: true,
      contact: { x: wx, y: wy },
      normal: { x: normalX, y: normalY },
      source: "ground",
    };
  }

  return { hit: false };
}

function isGrounded() {
  const probeOffset = 2;
  if (getCollisionInfo(player.x, player.y + probeOffset).hit) return true;
  for (const prop of props) {
    if (getPropCollisionInfo(prop, player.x, player.y).hit) return true;
  }
  return false;
}

function updateSquish(dt) {
  if (!frogBaseImageData || !frogSquishMap || !frogSquishCanvas) return;
  // Smoothly decay squish over time.
  squishState.value *= Math.exp(-8 * dt);
  if (squishState.value < 0.001) {
    squishState.value = 0;
    frogSolidPixelsDeformed = null;
    return;
  }

  const currentAmount = squishState.value;
  squishState.lastRenderedAmount = currentAmount;

  const cos = Math.cos(player.angle);
  const sin = Math.sin(player.angle);
  const n = squishState.normal;
  const normalLocal = {
    x: n.x * cos + n.y * sin,
    y: -n.x * sin + n.y * cos,
  };

  const w = frogImage.width * frogSquishScale;
  const h = frogImage.height * frogSquishScale;
  const src = frogBaseImageData.data;
  const out = frogSquishOutput.data;
  const maxSquish = squishState.maxPixels * currentAmount;
  const outW = frogSquishCanvas.width;
  const outH = frogSquishCanvas.height;
  const useParts =
    frogPartsMap && frogParts && frogPartsMap.length === frogSquishMap.length && frogParts.length > 0;
  const useCollisionParts =
    frogPartsCollisionMap &&
    frogPartsCollision &&
    frogPartsCollisionMap.map &&
    frogPartsCollision.length > 0 &&
    frogSolidPixelsBase;

  if (useCollisionParts) {
    const maxAngle = 1.35;
    const angleAmount = Math.pow(currentAmount, 0.7);
    for (const part of frogPartsCollision) {
      const leverLen = part.leverLen || 1;
      const alignment = (part.lever.x * normalLocal.x + part.lever.y * normalLocal.y) / leverLen;
      const flexBoost = 0.5 + part.flex * 0.9;
      const angle = -alignment * maxAngle * angleAmount * flexBoost;
      part.cos = Math.cos(angle);
      part.sin = Math.sin(angle);
    }
  }

  for (let i = 0; i < out.length; i += 4) {
    out[i + 0] = 0;
    out[i + 1] = 0;
    out[i + 2] = 0;
    out[i + 3] = 0;
  }

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const idx = y * w + x;
      const squish = frogSquishMap[idx];
      if (squish <= 0) continue;

      const srcIdx = idx * 4;
      if (src[srcIdx + 3] === 0) continue;

      let sx = x;
      let sy = y;
      let shift = squish * maxSquish;

      if (useParts && frogPartsRenderToCollision) {
        const partId = frogPartsMap[idx];
        if (partId >= 0) {
          const renderPart = frogParts[partId];
          const collisionId = frogPartsRenderToCollision[partId];
          const collisionPart = collisionId !== undefined ? frogPartsCollision[collisionId] : null;
          const cosR = collisionPart ? collisionPart.cos : 1;
          const sinR = collisionPart ? collisionPart.sin : 0;
          const flexR = collisionPart ? collisionPart.flex : renderPart.flex;
          const dx = x - renderPart.pivot.x;
          const dy = y - renderPart.pivot.y;
          sx = renderPart.pivot.x + dx * cosR + dy * sinR;
          sy = renderPart.pivot.y - dx * sinR + dy * cosR;
          shift *= flexR;
        } else {
          shift = 0;
        }
      }

      sx += normalLocal.x * shift;
      sy += normalLocal.y * shift;

      const ox = Math.round(sx + frogSquishPad);
      const oy = Math.round(sy + frogSquishPad);
      if (ox < 0 || oy < 0 || ox >= outW || oy >= outH) continue;
      const outIdx = (oy * outW + ox) * 4;
      out[outIdx + 0] = src[srcIdx + 0];
      out[outIdx + 1] = src[srcIdx + 1];
      out[outIdx + 2] = src[srcIdx + 2];
      out[outIdx + 3] = src[srcIdx + 3];
    }
  }

  frogSquishCtx.putImageData(frogSquishOutput, 0, 0);

  if (useCollisionParts) {
    const maxSquishBase = (squishState.maxPixels * currentAmount) / frogSquishScale;
    const deformed = [];
    for (const p of frogSolidPixelsBase) {
      let x = p.x;
      let y = p.y;
      const idx = y * frogPartsCollisionMap.width + x;
      const partId = frogPartsCollisionMap.map[idx];
      let shift = maxSquishBase;
      if (partId >= 0) {
        const part = frogPartsCollision[partId];
        const dx = x - part.pivot.x;
        const dy = y - part.pivot.y;
        const rx = part.pivot.x + dx * part.cos + dy * part.sin;
        const ry = part.pivot.y - dx * part.sin + dy * part.cos;
        x = rx;
        y = ry;
        shift *= part.flex;
      } else {
        shift = 0;
      }
      x += normalLocal.x * shift;
      y += normalLocal.y * shift;
      deformed.push({ x, y });
    }
    frogSolidPixelsDeformed = deformed;
  } else {
    frogSolidPixelsDeformed = null;
  }
}

function drawAimLine() {
  if (!isDragging || !dragStart || !dragCurrent) return;
  ctx.strokeStyle = "#9fb2ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(dragStart.x, dragStart.y);
  ctx.lineTo(dragCurrent.x, dragCurrent.y);
  ctx.stroke();
}

function drawPropsAndDrops() {
  for (const prop of props) {
    const img = prop.type.image;
    if (!img.complete) continue;
    const w = img.width * prop.type.scale;
    const h = img.height * prop.type.scale;
    ctx.drawImage(img, prop.x, prop.y, w, h);
  }

  if (woodImage.complete) {
    for (const drop of woodDrops) {
      const w = woodImage.width;
      const h = woodImage.height;
      ctx.drawImage(woodImage, drop.x - w / 2, drop.y - h / 2, w, h);
    }
  }
}

function drawInventoryUI() {
  if (!inventoryOpen) return;

  const panelScale = 2;
  const panelW = inventoryBackgroundImage.width * panelScale;
  const panelH = inventoryBackgroundImage.height * panelScale;
  const panelX = (WORLD.width - panelW) / 2;
  const panelY = (WORLD.height - panelH) / 2;

  if (inventoryBackgroundImage.complete) {
    ctx.drawImage(inventoryBackgroundImage, panelX, panelY, panelW, panelH);
  }

  const slotScale = 2;
  const slotW = inventorySlotImage.width * slotScale;
  const slotH = inventorySlotImage.height * slotScale;
  const slotX = panelX + panelW * 0.2;
  const slotY = panelY + panelH * 0.35;

  if (inventorySlotImage.complete) {
    ctx.drawImage(inventorySlotImage, slotX, slotY, slotW, slotH);
  }

  if (woodImage.complete) {
    const iconScale = 2;
    const iconW = woodImage.width * iconScale;
    const iconH = woodImage.height * iconScale;
    ctx.drawImage(woodImage, slotX + 6, slotY + 6, iconW, iconH);
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "16px \"IBM Plex Mono\", ui-monospace, monospace";
  ctx.fillText(`${woodState.count}`, slotX + slotW - 24, slotY + slotH - 10);

  if (inventoryExitImage.complete) {
    const exitScale = 2;
    const exitW = inventoryExitImage.width * exitScale;
    const exitH = inventoryExitImage.height * exitScale;
    const exitX = panelX + panelW - exitW - 12;
    const exitY = panelY + 12;
    ctx.drawImage(inventoryExitImage, exitX, exitY, exitW, exitH);
    drawInventoryUI.exitBounds = { x: exitX, y: exitY, w: exitW, h: exitH };
  } else {
    drawInventoryUI.exitBounds = null;
  }

  if (inventoryCursorImage.complete) {
    const cursorW = inventoryCursorImage.width;
    const cursorH = inventoryCursorImage.height;
    ctx.drawImage(inventoryCursorImage, inventoryCursor.x, inventoryCursor.y, cursorW, cursorH);
  }
}

function drawTitleScreen() {
  ctx.fillStyle = "#0b0d17";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.fillStyle = "#cfd7ff";
  ctx.font = "48px \"IBM Plex Mono\", ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText("To The Moon!", WORLD.width / 2, WORLD.height * 0.25);

  const buttonW = Math.min(420, WORLD.width * 0.7);
  const buttonH = 64;
  const centerX = WORLD.width / 2;
  const startY = WORLD.height * 0.45;
  const gap = 18;

  const ttm = {
    x: centerX - buttonW / 2,
    y: startY,
    w: buttonW,
    h: buttonH,
    label: "To The Moon! (TTM)",
    mode: "TTM",
  };
  const ttc = {
    x: centerX - buttonW / 2,
    y: startY + buttonH + gap,
    w: buttonW,
    h: buttonH,
    label: "To The Core! (TTC)",
    mode: "TTC",
  };

  ctx.fillStyle = "#1d2233";
  ctx.fillRect(ttm.x, ttm.y, ttm.w, ttm.h);
  ctx.fillRect(ttc.x, ttc.y, ttc.w, ttc.h);
  ctx.strokeStyle = "#9fb2ff";
  ctx.lineWidth = 2;
  ctx.strokeRect(ttm.x, ttm.y, ttm.w, ttm.h);
  ctx.strokeRect(ttc.x, ttc.y, ttc.w, ttc.h);

  ctx.fillStyle = "#ffffff";
  ctx.font = "20px \"IBM Plex Mono\", ui-monospace, monospace";
  ctx.fillText(ttm.label, centerX, ttm.y + ttm.h * 0.65);
  ctx.fillText(ttc.label, centerX, ttc.y + ttc.h * 0.65);

  ctx.font = "14px \"IBM Plex Mono\", ui-monospace, monospace";
  ctx.fillStyle = "#9fb2ff";
  ctx.fillText("Click a mode to start. Press 1 or 2.", centerX, WORLD.height * 0.8);

  drawTitleScreen.buttons = [ttm, ttc];
}

function updateCamera(dt) {
  const targetX = player.x - WORLD.width / (2 * camera.zoom);
  const targetY = player.y - WORLD.height / (2 * camera.zoom);
  const t = 1 - Math.exp(-camera.smooth * dt);
  camera.x += (targetX - camera.x) * t;
  camera.y += (targetY - camera.y) * t;

  const bottomLimit = getCameraBottomLimit();
  if (gameMode !== "TTC" && bottomLimit !== null && camera.y > bottomLimit) {
    camera.y = bottomLimit;
  }
}

function screenToWorld(point) {
  return {
    x: point.x / camera.zoom + camera.x,
    y: point.y / camera.zoom + camera.y,
  };
}

function update(dt) {
  const prevX = player.x;
  const prevY = player.y;

  player.vy += WORLD.gravity * dt;
  player.vx *= WORLD.airDrag;
  player.vy *= WORLD.airDrag;

  const targetX = player.x + player.vx * dt;
  const targetY = player.y + player.vy * dt;

  player.angle += player.angularVelocity * dt;
  player.angularVelocity *= 0.985;

  if (!getCollisionInfo(targetX, targetY).hit) {
    player.x = targetX;
    player.y = targetY;
  } else {
    // Binary search along the movement vector for a smooth contact point.
    let lo = 0;
    let hi = 1;
    let lastSafeX = prevX;
    let lastSafeY = prevY;
    let hitInfo = { hit: false };
    for (let i = 0; i < 8; i += 1) {
      const mid = (lo + hi) / 2;
      const mx = prevX + (targetX - prevX) * mid;
      const my = prevY + (targetY - prevY) * mid;
      const info = getCollisionInfo(mx, my);
      if (info.hit) {
        hitInfo = info;
        hi = mid;
      } else {
        lo = mid;
        lastSafeX = mx;
        lastSafeY = my;
      }
    }

    player.x = lastSafeX;
    player.y = lastSafeY;

    // Simple axis resolution to keep motion smooth.
    resolveCollision(hitInfo, 0.1, 0.25);
    positionalCorrection(hitInfo);
    player.angularVelocity *= 0.8;
  }

  // Tree collisions (pixel-perfect)
  let propHit = null;
  for (const prop of props) {
    const info = getPropCollisionInfo(prop, player.x, player.y);
    if (info.hit) {
      propHit = info;
      break;
    }
  }

  if (propHit) {
    let lo = 0;
    let hi = 1;
    let lastSafeX = prevX;
    let lastSafeY = prevY;
    let hitInfo = propHit;
    for (let i = 0; i < 8; i += 1) {
      const mid = (lo + hi) / 2;
      const mx = prevX + (player.x - prevX) * mid;
      const my = prevY + (player.y - prevY) * mid;
      const info = getPropCollisionInfo(propHit.prop, mx, my);
      if (info.hit) {
        hitInfo = info;
        hi = mid;
      } else {
        lo = mid;
        lastSafeX = mx;
        lastSafeY = my;
      }
    }

    player.x = lastSafeX;
    player.y = lastSafeY;

    resolveCollision(hitInfo, 0.15, 0.3);
    positionalCorrection(hitInfo);
    player.angularVelocity *= 0.85;
  }

  // Extra safeguard against spin-driven tunneling.
  for (let i = 0; i < 1; i += 1) {
    const info = getCollisionInfo(player.x, player.y);
    if (info.hit) {
      positionalCorrection(info);
      player.vx *= 0.95;
      player.vy *= 0.95;
      player.angularVelocity *= 0.92;
    } else {
      break;
    }
  }

  // Rest stabilization to stop jitter at low speeds.
  if (isGrounded()) {
    if (Math.abs(player.vx) < 2 && Math.abs(player.vy) < 2 && Math.abs(player.angularVelocity) < 0.02) {
      player.vx = 0;
      player.vy = 0;
      player.angularVelocity = 0;
    }
  }

}

function updatePropsAndDrops(dt) {
  const now = performance.now();

  for (let i = props.length - 1; i >= 0; i -= 1) {
    const prop = props[i];
    if (now - prop.lastHitAt > 250 && getPropCollisionInfo(prop, player.x, player.y).hit) {
      prop.lastHitAt = now;
      prop.hits += 1;
      if (prop.hits >= prop.type.hits) {
        const img = prop.type.image;
        const w = img.width * prop.type.scale;
        const h = img.height * prop.type.scale;
        spawnWoodDrops(prop.x + w / 2, prop.y + h * 0.2, prop.type.wood);
        props.splice(i, 1);
      }
    }
  }

  for (let i = woodDrops.length - 1; i >= 0; i -= 1) {
    const drop = woodDrops[i];
    drop.vy += WORLD.gravity * 0.35 * dt;
    drop.vx *= 0.98;
    drop.vy *= 0.98;
    drop.x += drop.vx * dt;
    drop.y += drop.vy * dt;

    const surfaceY = getSurfaceYAtX(drop.x);
    if (surfaceY !== null && drop.y > surfaceY - 6) {
      drop.y = surfaceY - 6;
      drop.vx *= 0.3;
      drop.vy = 0;
    }

    const dx = player.x - drop.x;
    const dy = player.y - drop.y;
    if (Math.hypot(dx, dy) < 20) {
      woodState.count += 1;
      woodDrops.splice(i, 1);
    }
  }
}

function frame(time) {
  const t = time / 1000;
  const dt = Math.min(0.033, t - lastTime);
  lastTime = t;

  if (gameState === "title") {
    drawTitleScreen();
    requestAnimationFrame(frame);
    return;
  }

  update(dt);
  updateSquish(dt);
  updatePropsAndDrops(dt);
  updateCamera(dt);

  drawParallax(-camera.y * 0.5);
  drawTiledImageHorizontal(
    bg2Image,
    -camera.x * 0.4,
    -camera.y * 0.4 + bg2.y,
    bg2.scale,
    0,
    WORLD.width
  );
  drawTiledImageHorizontal(
    bg1Image,
    -camera.x * 0.6,
    -camera.y * 0.6 + bg1.y,
    bg1.scale,
    0,
    WORLD.width
  );
  ctx.save();
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
  for (const layer of foregroundLayers) {
    if (!layer.image.complete) continue;
    const tileW = layer.width * layer.scale;
    const viewLeft = camera.x;
    const viewRight = camera.x + WORLD.width / camera.zoom;
    const startTile = Math.floor((viewLeft - layer.x) / tileW) - 1;
    const endTile = Math.floor((viewRight - layer.x) / tileW) + 1;
    const tileH = layer.height * layer.scale;
    const viewTop = camera.y;
    const viewBottom = camera.y + WORLD.height / camera.zoom;
    const startRow =
      gameMode === "TTC" && layer.name === "foregroundlower3.png"
        ? Math.max(0, Math.floor((viewTop - layer.y) / tileH) - 1)
        : 0;
    const endRow =
      gameMode === "TTC" && layer.name === "foregroundlower3.png"
        ? Math.floor((viewBottom - layer.y) / tileH) + 1
        : 0;

    for (let tile = startTile; tile <= endTile; tile += 1) {
      const x = layer.x + tile * tileW;
      if (gameMode === "TTC" && layer.name === "foregroundlower3.png") {
        for (let row = startRow; row <= endRow; row += 1) {
          const chunk = getLayerChunk(layer, tile, row, false);
          const source = chunk ? chunk.canvas : layer.image;
          const y = layer.y + row * tileH;
          ctx.drawImage(source, x, y, tileW, tileH);
        }
      } else {
        const chunk = getLayerChunk(layer, tile, 0, false);
        const source = chunk ? chunk.canvas : layer.image;
        ctx.drawImage(source, x, layer.y, tileW, tileH);
      }
    }
  }
  drawPropsAndDrops();
  drawPlayer();
  ctx.restore();
  if (!inventoryOpen) {
    drawAimLine();
  }
  drawInventoryUI();

  requestAnimationFrame(frame);
}

canvas.addEventListener("mousedown", (event) => {
  if (gameState === "title") {
    return;
  }
  if (!pointerLocked) {
    if (document.fullscreenElement !== document.documentElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    canvas.requestPointerLock();
    return;
  }
  if (inventoryOpen) {
    return;
  }
  if (pointerLocked) {
    swipeHeld = true;
    moveAccumX = 0;
    moveAccumY = 0;
    lastMoveAt = performance.now();
    return;
  }
  const rect = canvas.getBoundingClientRect();
  isDragging = true;
  const screenPoint = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  dragStart = screenPoint;
  dragCurrent = { ...screenPoint };
});

canvas.addEventListener("mousemove", (event) => {
  if (pointerLocked) {
    if (inventoryOpen) {
      inventoryCursor.x += event.movementX || 0;
      inventoryCursor.y += event.movementY || 0;
      inventoryCursor.x = Math.max(0, Math.min(WORLD.width - 1, inventoryCursor.x));
      inventoryCursor.y = Math.max(0, Math.min(WORLD.height - 1, inventoryCursor.y));
      return;
    }
    if (swipeHeld) {
      moveAccumX += event.movementX || 0;
      moveAccumY += event.movementY || 0;
      lastMoveAt = performance.now();
    }
    return;
  }
  if (!isDragging) return;
  const rect = canvas.getBoundingClientRect();
  dragCurrent = { x: event.clientX - rect.left, y: event.clientY - rect.top };
});

canvas.addEventListener("mouseup", () => {
  if (pointerLocked) {
    if (!swipeHeld) return;
    swipeHeld = false;
    const mag = Math.hypot(moveAccumX, moveAccumY);
    if (mag > 12 && isGrounded()) {
      player.vx += -moveAccumX * 0.8;
      player.vy += -moveAccumY * 0.8;
      player.angularVelocity += -(moveAccumX + moveAccumY) * 0.00125;
      lastSwipeAt = performance.now();
    }
    moveAccumX = 0;
    moveAccumY = 0;
    lastMoveAt = 0;
    return;
  }
  if (!isDragging || !dragStart || !dragCurrent) return;
  if (inventoryOpen) {
    isDragging = false;
    return;
  }
  if (!isGrounded()) {
    isDragging = false;
    return;
  }
  const worldStart = screenToWorld(dragStart);
  const worldCurrent = screenToWorld(dragCurrent);
  const dx = worldStart.x - worldCurrent.x;
  const dy = worldStart.y - worldCurrent.y;
  player.vx += dx * 1.5;
  player.vy += dy * 1.5;
  player.angularVelocity += (dx + dy) * 0.008;
  lastSwipeAt = performance.now();
  isDragging = false;
});

canvas.addEventListener("click", (event) => {
  if (gameState === "title") {
    const buttons = drawTitleScreen.buttons || [];
    const rect = canvas.getBoundingClientRect();
    const cx = event.clientX - rect.left;
    const cy = event.clientY - rect.top;
    for (const btn of buttons) {
      if (cx >= btn.x && cx <= btn.x + btn.w && cy >= btn.y && cy <= btn.y + btn.h) {
        startGame(btn.mode);
        return;
      }
    }
  }
  if (!inventoryOpen || !pointerLocked) return;
  const bounds = drawInventoryUI.exitBounds;
  if (!bounds) return;
  const cx = inventoryCursor.x;
  const cy = inventoryCursor.y;
  if (cx >= bounds.x && cx <= bounds.x + bounds.w && cy >= bounds.y && cy <= bounds.y + bounds.h) {
    inventoryOpen = false;
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "r") resetPlayer();
  if (event.key.toLowerCase() === "e") {
    inventoryOpen = !inventoryOpen;
    if (inventoryOpen) {
      inventoryCursor.x = WORLD.width / 2;
      inventoryCursor.y = WORLD.height / 2;
      if (!pointerLocked) {
        canvas.requestPointerLock();
      }
    }
  }
  if (gameState === "title") {
    if (event.key === "1") startGame("TTM");
    if (event.key === "2") startGame("TTC");
  }
});

document.addEventListener("pointerlockchange", () => {
  pointerLocked = document.pointerLockElement === canvas;
  moveAccumX = 0;
  moveAccumY = 0;
  lastMoveAt = 0;
  swipeHeld = false;
  if (!pointerLocked) {
    inventoryOpen = false;
  }
});

function handleResize() {
  resizeCanvas();
  rebuildStars();
  camera.x = player.x - WORLD.width / (2 * camera.zoom);
  camera.y = player.y - WORLD.height / (2 * camera.zoom);
  const bottomLimit = getCameraBottomLimit();
  if (gameMode !== "TTC" && bottomLimit !== null && camera.y > bottomLimit) {
    camera.y = bottomLimit;
  }
}

window.addEventListener("resize", handleResize);
handleResize();

function startGame(mode) {
  gameMode = mode;
  gameState = "play";
  inventoryOpen = false;
  resetPlayer();
  if (document.fullscreenElement !== document.documentElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
  canvas.requestPointerLock();
}

frogImage.onload = () => {
  frogSolidPixels = buildSolidPixelMask(frogImage);
};


function allForegroundImagesLoaded() {
  if (!foregroundImage.complete) return false;
  return foregroundLowerImages.every((img) => img.complete);
}

function maybeStart() {
  if (!frogImage.complete || !bg1Image.complete || !bg2Image.complete) return;
  if (!tree1Image.complete || !tree2Image.complete || !woodImage.complete) return;
  if (!frogPartsImage.complete) return;
  if (
    !inventoryBackgroundImage.complete ||
    !inventorySlotImage.complete ||
    !inventoryExitImage.complete ||
    !inventoryCursorImage.complete
  ) {
    return;
  }
  if (!allForegroundImagesLoaded()) return;
  if (!frogSolidPixels || !frogOutlineImage.complete) return;
  if (!propTypes.tree1.mask || !propTypes.tree2.mask) return;
  if (!frogBaseImageData) {
    const offscreen = document.createElement("canvas");
    offscreen.width = frogImage.width * frogSquishScale;
    offscreen.height = frogImage.height * frogSquishScale;
    const octx = offscreen.getContext("2d");
    octx.imageSmoothingEnabled = false;
    octx.drawImage(frogImage, 0, 0, offscreen.width, offscreen.height);
    frogBaseImageData = octx.getImageData(0, 0, offscreen.width, offscreen.height);
    frogSquishPad = Math.ceil(squishState.maxPixels * 2);
    frogSquishCanvas = document.createElement("canvas");
    frogSquishCanvas.width = offscreen.width + frogSquishPad * 2;
    frogSquishCanvas.height = offscreen.height + frogSquishPad * 2;
    frogSquishCtx = frogSquishCanvas.getContext("2d");
    frogSquishOutput = frogSquishCtx.createImageData(frogSquishCanvas.width, frogSquishCanvas.height);
  }
  if (!frogSquishMap) {
    frogSquishMap = buildSquishMap(frogOutlineImage, frogSquishScale);
  }
  if (!frogPartsMap || !frogParts) {
    const result = buildPartsMap(frogPartsImage, frogSquishScale, frogSquishMap);
    frogPartsMap = result.map;
    frogParts = result.parts;
  }
  if (!frogPartsCollisionMap || !frogPartsCollision) {
    const result = buildPartsMap(frogPartsImage, 1, null);
    frogPartsCollisionMap = result;
    frogPartsCollision = result.parts;
  }
  if (!frogPartsRenderToCollision && frogParts && frogPartsCollision) {
    const colorToCollision = new Map();
    frogPartsCollision.forEach((part, index) => {
      colorToCollision.set(part.key, index);
    });
    frogPartsRenderToCollision = frogParts.map((part) => colorToCollision.get(part.key));
  }
  buildForegroundLayers();
  spawnProps();
  handleResize();
  resetPlayer();
  requestAnimationFrame(frame);
}

frogImage.addEventListener("load", maybeStart);
frogOutlineImage.addEventListener("load", maybeStart);
frogPartsImage.addEventListener("load", maybeStart);
bg1Image.addEventListener("load", maybeStart);
bg2Image.addEventListener("load", maybeStart);
tree1Image.addEventListener("load", maybeStart);
tree2Image.addEventListener("load", maybeStart);
woodImage.addEventListener("load", maybeStart);
inventoryBackgroundImage.addEventListener("load", maybeStart);
inventorySlotImage.addEventListener("load", maybeStart);
inventoryExitImage.addEventListener("load", maybeStart);
inventoryCursorImage.addEventListener("load", maybeStart);
foregroundImage.addEventListener("load", maybeStart);
for (const img of foregroundLowerImages) {
  img.addEventListener("load", maybeStart);
}
maybeStart();
