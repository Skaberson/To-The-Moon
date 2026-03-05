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

const MAPS = {
  grassland: {
    id: "grassland",
    label: "Grassland",
    root: "./grassland",
    hasBg1Lower: true,
    hasMiddleground: true,
    hasClouds: false,
  },
  beach: {
    id: "beach",
    label: "Beach",
    root: "./beach",
    hasBg1Lower: true,
    hasMiddleground: false,
    hasClouds: true,
  },
};
const enableMiddleground = false;
const transparentPixel =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2NkYGD4DwABAwEAffwC0QAAAABJRU5ErkJggg==";

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
frogImage.src = "./character/frog.png";
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
const arrowImages = [1, 2, 3, 4].map((n) => {
  const img = new Image();
  img.src = `./character/arrow${n}.png`;
  return img;
});
const skins = [
  {
    id: "frog",
    label: "Frog",
    base: "./character/frog.png",
    outline: "./character/frog-outline.png",
    parts: "./character/frog-parts.png",
  },
  {
    id: "teto",
    label: "Teto",
    base: "./character/teto.png",
    outline: "./character/teto-outline.png",
    parts: "./character/teto-parts.png",
  },
];
let currentSkin = "frog";
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
let skinScale = 1;
const tetoSize = { w: 0, h: 0 };
const tetoSizeImage = new Image();
tetoSizeImage.src = "./character/teto.png";

const foregroundImage = new Image();
const foregroundLowerNames = ["foregroundlower1.png", "foregroundlower2.png", "foregroundlower3.png"];
const foregroundLowerImages = foregroundLowerNames.map(() => new Image());

let foregroundLayers = [];

const bg1Image = new Image();
const bg1LowerImage = new Image();
const middlegroundImage = new Image();
const bg2Image = new Image();
bg2Image.src = "";
const cloudImages = [new Image(), new Image()];
const earthImage = new Image();
earthImage.src = "./space/earth.png";
const asteroidImage = new Image();
asteroidImage.src = "./space/asteroid.png";
let asteroidMask = null;
let asteroidWidth = 0;
let asteroidHeight = 0;
const asteroidField = {
  startY: -5100,
  height: 12000,
  width: 5000,
};
const asteroidGravity = {
  radiusMultiplier: 4,
  strength: 520,
  enabled: false,
};

const tree1Image = new Image();
tree1Image.src = "./grassland/destructables/tree1.png";
const tree2Image = new Image();
tree2Image.src = "./grassland/destructables/tree2.png";
const woodImage = new Image();
woodImage.src = "./grassland/items/wood.png";
const coinImage = new Image();
coinImage.src = "./money/coin.png";

const inventoryBackgroundImage = new Image();
inventoryBackgroundImage.src = "./inventory/inventorybackground.png";
const inventorySlotImage = new Image();
inventorySlotImage.src = "./inventory/slot.png";
const inventoryExitImage = new Image();
inventoryExitImage.src = "./inventory/exitbutton.png";
const inventoryCursorImage = new Image();
inventoryCursorImage.src = "./inventory/cursor.png";
const titleBackgroundImage = new Image();
titleBackgroundImage.src = "./titlescreen/background.png";

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
function getPlayerScale() {
  return player.scale * skinScale;
}
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
const maxSwipeVelocity = 1200;
let maxSwipeDistance = 220;
let inventoryOpen = false;
const inventoryCursor = { x: 0, y: 0 };
let lastSwipeAt = 0;
let swipeHeld = false;
let gameMode = null; // "TTM" | "TTC"
let gameState = "title"; // "title" | "mapSelect" | "loading" | "play"
let pendingMode = null;
let currentMap = null;
let pendingStart = false;
const shopState = {
  open: false,
  anim: 0,
  level: 0,
};
let inventoryAnim = 0;
const titleParallax = { x: 0, y: 0 };
let inventoryTab = "items"; // "items" | "packs"
const skinTabState = {
  open: false,
  anim: 0,
};
const debugState = {
  legDay: false,
  noHinges: false,
  noSquish: false,
  noRotation: false,
  noSwipeCap: false,
  flyMode: false,
  flySpeed: 260,
  showHitboxes: false,
};
const inputState = {
  left: false,
  right: false,
  up: false,
  down: false,
};

let stars = [];
const asteroids = [];

function rebuildStars() {
  const count = Math.max(60, Math.floor((WORLD.width * WORLD.height) / 12000));
  stars = Array.from({ length: count }, () => ({
    x: Math.random() * WORLD.width,
    y: Math.random() * WORLD.height,
    r: Math.random() * 1.5 + 0.5,
  }));
}

function rebuildFrogRenderData() {
  if (!frogImage.complete || !frogOutlineImage.complete) return;
  const offscreen = document.createElement("canvas");
  offscreen.width = frogImage.width * frogSquishScale;
  offscreen.height = frogImage.height * frogSquishScale;
  const octx = offscreen.getContext("2d");
  octx.imageSmoothingEnabled = false;
  octx.drawImage(frogImage, 0, 0, offscreen.width, offscreen.height);
  frogBaseImageData = octx.getImageData(0, 0, offscreen.width, offscreen.height);
  frogSquishCanvas = document.createElement("canvas");
  frogSquishPad = Math.ceil(squishState.maxPixels * 2);
  frogSquishCanvas.width = offscreen.width + frogSquishPad * 2;
  frogSquishCanvas.height = offscreen.height + frogSquishPad * 2;
  frogSquishCtx = frogSquishCanvas.getContext("2d");
  frogSquishOutput = frogSquishCtx.createImageData(frogSquishCanvas.width, frogSquishCanvas.height);
  frogSquishMap = buildSquishMap(frogOutlineImage, frogSquishScale);
}

function rebuildFrogPartsData() {
  if (!frogPartsImage.complete || !frogSquishMap) return;
  const result = buildPartsMap(frogPartsImage, frogSquishScale, frogSquishMap);
  frogPartsMap = result.map;
  frogParts = result.parts;
  const resultCollision = buildPartsMap(frogPartsImage, 1, null);
  frogPartsCollisionMap = resultCollision;
  frogPartsCollision = resultCollision.parts;
  const colorToCollision = new Map();
  frogPartsCollision.forEach((part, index) => {
    colorToCollision.set(part.key, index);
  });
  frogPartsRenderToCollision = frogParts.map((part) => colorToCollision.get(part.key));
}

function updateSkinScale() {
  if (tetoSize.w && frogImage.complete && frogImage.width) {
    skinScale = tetoSize.w / frogImage.width;
  } else {
    skinScale = 1;
  }
}

function loadSkin(skinId) {
  const skin = skins.find((s) => s.id === skinId);
  if (!skin) return;
  currentSkin = skin.id;
  frogImage.src = skin.base;
  frogOutlineImage.src = skin.outline;
  frogPartsImage.src = skin.parts;
  frogSolidPixels = null;
  frogSolidPixelsBase = null;
  frogSolidPixelsDeformed = null;
  frogBaseImageData = null;
  frogSquishMap = null;
  frogSquishCanvas = null;
  frogSquishCtx = null;
  frogSquishOutput = null;
  frogSquishPad = 0;
  frogPartsMap = null;
  frogParts = null;
  frogPartsCollisionMap = null;
  frogPartsCollision = null;
  frogPartsRenderToCollision = null;
  updateSkinScale();
}

function ensureAsteroids() {
  if (!asteroidImage.complete || asteroids.length) return;
  const count = 72;
  const fieldWidth = asteroidField.width;
  const startY = asteroidField.startY;
  const fieldHeight = asteroidField.height;
  const centerX = camera.x + WORLD.width / 2;
  for (let i = 0; i < count; i += 1) {
    asteroids.push({
      x: centerX + (Math.random() - 0.5) * fieldWidth,
      y: startY - Math.random() * fieldHeight,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 12,
      angle: Math.random() * Math.PI * 2,
      angularVelocity: (Math.random() - 0.5) * 0.6,
    });
  }
}

function loadMapAssets(mapId) {
  const map = MAPS[mapId];
  if (!map) return;
  const root = map.root;
  bg1Image.src = `${root}/backgrounds/bg1.png`;
  bg2Image.src = `${root}/backgrounds/bg2.png`;
  foregroundImage.src = `${root}/backgrounds/foreground.png`;
  foregroundLowerNames.forEach((name, index) => {
    foregroundLowerImages[index].src = `${root}/backgrounds/${name}`;
  });

  if (map.hasBg1Lower) {
    bg1LowerImage.src = `${root}/backgrounds/bg1lower.png`;
  } else {
    bg1LowerImage.src = transparentPixel;
  }

  if (enableMiddleground && map.hasMiddleground) {
    middlegroundImage.src = `${root}/backgrounds/middleground.png`;
  } else {
    middlegroundImage.src = transparentPixel;
  }

  if (map.hasClouds) {
    cloudImages[0].src = `${root}/backgrounds/cloud1.png`;
    cloudImages[1].src = `${root}/backgrounds/clouds2.png`;
  } else {
    cloudImages[0].src = transparentPixel;
    cloudImages[1].src = transparentPixel;
  }
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
const middleground = {
  scale: 2.8,
  y: 40,
  parallax: 0.8,
};

const woodState = {
  count: 0,
};
const coinState = {
  count: 0,
};
const rarities = ["common", "uncommon", "rare", "epic", "legendary"];
const rarityWeights = {
  common: 60,
  uncommon: 25,
  rare: 10,
  epic: 4,
  legendary: 1,
};
const packs = [
  { id: "pack1", label: "Pack 1", price: 5, items: [
    { id: "leaf_charm", name: "Leaf Charm", rarity: "common" },
    { id: "mud_badge", name: "Mud Badge", rarity: "common" },
    { id: "sprout_pin", name: "Sprout Pin", rarity: "uncommon" },
    { id: "dewdrop", name: "Dewdrop", rarity: "rare" },
    { id: "moon_shard", name: "Moon Shard", rarity: "epic" },
  ]},
  { id: "pack2", label: "Pack 2", price: 8, items: [
    { id: "shell_token", name: "Shell Token", rarity: "common" },
    { id: "sand_tag", name: "Sand Tag", rarity: "common" },
    { id: "tide_pin", name: "Tide Pin", rarity: "uncommon" },
    { id: "pearl_chip", name: "Pearl Chip", rarity: "rare" },
    { id: "sun_crest", name: "Sun Crest", rarity: "epic" },
  ]},
  { id: "pack3", label: "Pack 3", price: 10, items: [
    { id: "bark_coin", name: "Bark Coin", rarity: "common" },
    { id: "sap_wax", name: "Sap Wax", rarity: "common" },
    { id: "branch_token", name: "Branch Token", rarity: "uncommon" },
    { id: "forest_glow", name: "Forest Glow", rarity: "rare" },
    { id: "ancient_ring", name: "Ancient Ring", rarity: "epic" },
  ]},
  { id: "pack4", label: "Pack 4", price: 12, items: [
    { id: "stone_chip", name: "Stone Chip", rarity: "common" },
    { id: "clay_tag", name: "Clay Tag", rarity: "common" },
    { id: "gravel_pin", name: "Gravel Pin", rarity: "uncommon" },
    { id: "canyon_rune", name: "Canyon Rune", rarity: "rare" },
    { id: "ember_core", name: "Ember Core", rarity: "epic" },
  ]},
  { id: "pack5", label: "Pack 5", price: 15, items: [
    { id: "breeze_charm", name: "Breeze Charm", rarity: "common" },
    { id: "feather_pin", name: "Feather Pin", rarity: "common" },
    { id: "sky_badge", name: "Sky Badge", rarity: "uncommon" },
    { id: "storm_etch", name: "Storm Etch", rarity: "rare" },
    { id: "aurora_gem", name: "Aurora Gem", rarity: "epic" },
  ]},
  { id: "pack6", label: "Pack 6", price: 18, items: [
    { id: "reef_chip", name: "Reef Chip", rarity: "common" },
    { id: "kelp_tag", name: "Kelp Tag", rarity: "common" },
    { id: "foam_pin", name: "Foam Pin", rarity: "uncommon" },
    { id: "deep_pearl", name: "Deep Pearl", rarity: "rare" },
    { id: "trench_core", name: "Trench Core", rarity: "epic" },
  ]},
  { id: "pack7", label: "Pack 7", price: 22, items: [
    { id: "fossil_bit", name: "Fossil Bit", rarity: "common" },
    { id: "dust_tag", name: "Dust Tag", rarity: "common" },
    { id: "amber_pin", name: "Amber Pin", rarity: "uncommon" },
    { id: "eclipse_rune", name: "Eclipse Rune", rarity: "rare" },
    { id: "comet_crest", name: "Comet Crest", rarity: "epic" },
  ]},
  { id: "pack8", label: "Pack 8", price: 26, items: [
    { id: "crystal_chip", name: "Crystal Chip", rarity: "common" },
    { id: "glint_tag", name: "Glint Tag", rarity: "common" },
    { id: "flare_pin", name: "Flare Pin", rarity: "uncommon" },
    { id: "nova_shard", name: "Nova Shard", rarity: "rare" },
    { id: "stellar_core", name: "Stellar Core", rarity: "epic" },
  ]},
  { id: "pack9", label: "Pack 9", price: 30, items: [
    { id: "ember_coin", name: "Ember Coin", rarity: "common" },
    { id: "ash_tag", name: "Ash Tag", rarity: "common" },
    { id: "cinder_pin", name: "Cinder Pin", rarity: "uncommon" },
    { id: "flame_rune", name: "Flame Rune", rarity: "rare" },
    { id: "phoenix_mark", name: "Phoenix Mark", rarity: "legendary" },
  ]},
  { id: "pack10", label: "Pack 10", price: 40, items: [
    { id: "orbit_chip", name: "Orbit Chip", rarity: "common" },
    { id: "signal_tag", name: "Signal Tag", rarity: "common" },
    { id: "pulse_pin", name: "Pulse Pin", rarity: "uncommon" },
    { id: "gravity_rune", name: "Gravity Rune", rarity: "rare" },
    { id: "event_horizon", name: "Event Horizon", rarity: "legendary" },
  ]},
];
const itemInventory = {
  counts: new Map(),
  lastOpened: null,
};
const raritySellValue = {
  common: 1,
  uncommon: 2,
  rare: 4,
  epic: 8,
  legendary: 16,
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
      vy: -Math.random() * 60 - 40,
      angle: Math.random() * Math.PI * 2,
      angularVelocity: (Math.random() - 0.5) * 6,
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
  const heightT = Math.min(1, Math.max(0, -camera.y / 4800));
  const skyTop = { r: 120, g: 185, b: 255 };
  const skyBottom = { r: 8, g: 16, b: 38 };
  const r = Math.round(skyTop.r + (skyBottom.r - skyTop.r) * heightT);
  const g = Math.round(skyTop.g + (skyBottom.g - skyTop.g) * heightT);
  const b = Math.round(skyTop.b + (skyBottom.b - skyTop.b) * heightT);
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  const starAlpha = Math.min(1, Math.max(0, (heightT - 0.2) / 0.6));
  ctx.fillStyle = `rgba(207, 215, 255, ${starAlpha})`;
  for (const s of stars) {
    const y = (s.y + offsetY * 0.05) % WORLD.height;
    ctx.beginPath();
    ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

}

function drawPlayer() {
  if (!frogImage.complete) return;
  const scale = getPlayerScale();
  const w = frogImage.width * scale;
  const h = frogImage.height * scale;

  ctx.save();
  ctx.translate(player.x, player.y);
  if (!debugState.noRotation) {
    ctx.rotate(player.angle);
  }
  ctx.drawImage(frogImage, -w / 2, -h / 2, w, h);
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
          angle: 0,
          targetAngle: 0,
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

function buildImageMaskInfo(image) {
  const mask = buildSolidPixelMap(image);
  return { mask, width: image.width, height: image.height };
}

function rollRarity() {
  const total = Object.values(rarityWeights).reduce((sum, v) => sum + v, 0);
  let r = Math.random() * total;
  for (const rarity of rarities) {
    r -= rarityWeights[rarity];
    if (r <= 0) return rarity;
  }
  return "common";
}

function openPack(pack) {
  if (!pack) return null;
  const rarity = rollRarity();
  const candidates = pack.items.filter((it) => it.rarity === rarity);
  const pool = candidates.length ? candidates : pack.items;
  const item = pool[Math.floor(Math.random() * pool.length)];
  const prev = itemInventory.counts.get(item.id) || 0;
  itemInventory.counts.set(item.id, prev + 1);
  itemInventory.lastOpened = item;
  return item;
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

function drawTiledImage(image, offsetX, offsetY, scale = 1, viewLeft = 0, viewRight = WORLD.width, viewTop = 0, viewBottom = WORLD.height) {
  if (typeof image.complete === "boolean" && !image.complete) return;
  const w = image.width * scale;
  const h = image.height * scale;
  if (!w || !h) return;

  const startX = Math.floor((viewLeft - offsetX) / w) * w + offsetX - w;
  const endX = viewRight + w;
  const startY = Math.floor((viewTop - offsetY) / h) * h + offsetY - h;
  const endY = viewBottom + h;

  for (let y = startY; y < endY; y += h) {
    for (let x = startX; x < endX; x += w) {
      ctx.drawImage(image, x, y, w, h);
    }
  }
}

function drawTiledImageDown(image, offsetX, startY, scale = 1, viewLeft = 0, viewRight = WORLD.width, viewBottom = WORLD.height) {
  if (typeof image.complete === "boolean" && !image.complete) return;
  const w = image.width * scale;
  const h = image.height * scale;
  if (!w || !h) return;

  const startX = Math.floor((viewLeft - offsetX) / w) * w + offsetX - w;
  const endX = viewRight + w;
  const endY = viewBottom + h;

  for (let y = startY; y < endY; y += h) {
    for (let x = startX; x < endX; x += w) {
      ctx.drawImage(image, x, y, w, h);
    }
  }
}

function drawMiddlegroundVoxelConnector(image, parallax, scale, bg1BottomY) {
  if (!image.complete || !foregroundLayers.length) return;
  const viewWidth = WORLD.width;
  const imgW = image.width;
  const imgH = image.height;
  if (!imgW || !imgH) return;

  const mgX = -camera.x * parallax;
  const step = 2;

  for (let screenX = 0; screenX < viewWidth; screenX += step) {
    const worldX = camera.x + screenX / camera.zoom;
    const surfaceY = getSurfaceYAtX(worldX);
    if (surfaceY === null) continue;

    const topY = (surfaceY - camera.y) * camera.zoom;
    const bottomY = bg1BottomY;
    if (bottomY <= topY) continue;

    let texX = (screenX - mgX) / scale;
    texX = ((texX % imgW) + imgW) % imgW;
    const srcW = 1;

    ctx.drawImage(image, texX, 0, srcW, imgH, screenX, topY, step, bottomY - topY);
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

function sampleAsteroidMask(fx, fy) {
  if (!asteroidMask) return 0;
  if (fx < 0 || fy < 0 || fx >= asteroidWidth || fy >= asteroidHeight) return 0;
  return asteroidMask[fy * asteroidWidth + fx] ? 1 : 0;
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
  const s = getPlayerScale();
  return 1 / (frogMass * s * s);
}

function getInvInertia() {
  const s = getPlayerScale();
  const s2 = s * s;
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
  const scale = getPlayerScale();

  const solidPixels = frogSolidPixelsDeformed || frogSolidPixels;
  for (const p of solidPixels) {
    const lx = (p.x - frogHalfWidth) * scale;
    const ly = (p.y - frogHalfHeight) * scale;

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

function getAsteroidCollisionInfo(asteroid, testX, testY) {
  if (!asteroidMask || !frogSolidPixels) return { hit: false };
  const cos = Math.cos(player.angle);
  const sin = Math.sin(player.angle);
  const cosA = Math.cos(asteroid.angle);
  const sinA = Math.sin(asteroid.angle);
  const scale = 3;
  const invScale = 1 / scale;
  const halfW = asteroidWidth / 2;
  const halfH = asteroidHeight / 2;
  const padding = 1;
  const playerScale = getPlayerScale();
  const solidPixels = frogSolidPixelsDeformed || frogSolidPixels;

  for (const p of solidPixels) {
    const lx = (p.x - frogHalfWidth) * playerScale;
    const ly = (p.y - frogHalfHeight) * playerScale;
    const wx = testX + lx * cos - ly * sin;
    const wy = testY + lx * sin + ly * cos;

    const dx = wx - asteroid.x;
    const dy = wy - asteroid.y;
    const rx = (dx * cosA + dy * sinA) * invScale + halfW;
    const ry = (-dx * sinA + dy * cosA) * invScale + halfH;
    const fx = Math.round(rx);
    const fy = Math.round(ry);
    if (!sampleAsteroidMask(fx, fy)) continue;
    if (
      !sampleAsteroidMask(fx - padding, fy) &&
      !sampleAsteroidMask(fx + padding, fy) &&
      !sampleAsteroidMask(fx, fy - padding) &&
      !sampleAsteroidMask(fx, fy + padding)
    ) {
      continue;
    }

    const nx = sampleAsteroidMask(fx - 1, fy) - sampleAsteroidMask(fx + 1, fy);
    const ny = sampleAsteroidMask(fx, fy - 1) - sampleAsteroidMask(fx, fy + 1);
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
      source: "asteroid",
      asteroid,
    };
  }

  return { hit: false };
}

function getCollisionInfo(testX, testY) {
  if (!frogSolidPixels || !foregroundLayers.length) return { hit: false };
  const cos = Math.cos(player.angle);
  const sin = Math.sin(player.angle);
  const invScale = 1 / foreground.scale;
  const scale = getPlayerScale();

  const solidPixels = frogSolidPixelsDeformed || frogSolidPixels;
  for (const p of solidPixels) {
    const lx = (p.x - frogHalfWidth) * scale;
    const ly = (p.y - frogHalfHeight) * scale;

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
  if (debugState.noSquish) {
    squishState.value = 0;
    frogSolidPixelsDeformed = null;
    return;
  }
  // Smoothly decay squish over time.
  squishState.value *= Math.exp(-8 * dt);
  if (squishState.value < 0.001) {
    squishState.value = 0;
    if (frogPartsCollision) {
      const hingeSmooth = 18;
      const hingeT = 1 - Math.exp(-hingeSmooth * dt);
      for (const part of frogPartsCollision) {
        part.targetAngle = 0;
        part.angle += (part.targetAngle - part.angle) * hingeT;
        part.cos = Math.cos(part.angle);
        part.sin = Math.sin(part.angle);
      }
    }
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

  if (useCollisionParts && !debugState.noHinges) {
    const maxAngle = 1.35;
    const angleAmount = Math.pow(currentAmount, 0.7);
    const hingeSmooth = 18;
    const hingeT = 1 - Math.exp(-hingeSmooth * dt);
    for (const part of frogPartsCollision) {
      const leverLen = part.leverLen || 1;
      const alignment = (part.lever.x * normalLocal.x + part.lever.y * normalLocal.y) / leverLen;
      const flexBoost = 0.5 + part.flex * 0.9;
      part.targetAngle = -alignment * maxAngle * angleAmount * flexBoost;
      part.angle += (part.targetAngle - part.angle) * hingeT;
      part.cos = Math.cos(part.angle);
      part.sin = Math.sin(part.angle);
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

      if (useParts && !debugState.noHinges && frogPartsRenderToCollision) {
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

  if (useCollisionParts && !debugState.noHinges) {
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
  let dx = 0;
  let dy = 0;
  let mag = 0;
  let forceScale = 1;

  if (isDragging && dragStart && dragCurrent) {
    ctx.strokeStyle = "#9fb2ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(dragStart.x, dragStart.y);
    ctx.lineTo(dragCurrent.x, dragCurrent.y);
    ctx.stroke();

    const worldStart = screenToWorld(dragStart);
    const worldCurrent = screenToWorld(dragCurrent);
    dx = worldStart.x - worldCurrent.x;
    dy = worldStart.y - worldCurrent.y;
    mag = Math.hypot(dx, dy);
    forceScale = 1.5;
  } else if (pointerLocked && swipeHeld) {
    dx = -moveAccumX;
    dy = -moveAccumY;
    mag = Math.hypot(dx, dy);
    forceScale = 0.8;
  } else {
    return;
  }

  if (mag < 2) return;

  const maxCharge = 160;
  const clampedMag = Math.min(maxCharge, mag);
  const chargeRatio = clampedMag / maxCharge;

  let level = 1;
  if (chargeRatio >= 1) level = 4;
  else if (chargeRatio >= 0.5) level = 3;
  else if (chargeRatio >= 0.25) level = 2;

  const arrow = arrowImages[level - 1];
  if (!arrow.complete || !arrow.width || !arrow.height) return;

  const dirX = dx / mag;
  const dirY = dy / mag;
  const angle = Math.atan2(dirY, dirX) + Math.PI / 2;

  const playerScreenX = (player.x - camera.x) * camera.zoom;
  const playerScreenY = (player.y - camera.y) * camera.zoom;
  const forceMag = clampedMag * forceScale;
  const playerScale = getPlayerScale();
  const maxOffset = 48 * playerScale;
  const offsetWorld = 8 * playerScale + chargeRatio * maxOffset;
  const offsetScreen = offsetWorld * camera.zoom;
  const arrowX = playerScreenX + dirX * offsetScreen;
  const arrowY = playerScreenY + dirY * offsetScreen;
  const scale = playerScale * camera.zoom;
  const w = arrow.width * scale;
  const h = arrow.height * scale;

  ctx.save();
  ctx.translate(arrowX, arrowY);
  ctx.rotate(angle);
  ctx.drawImage(arrow, -w / 2, -h / 2, w, h);
  ctx.restore();

  // Trajectory preview
  const gravityT = Math.min(1, Math.max(0, -camera.y / 4800));
  const gravityScale = 1 - gravityT * 0.99;
  const gravity = WORLD.gravity * gravityScale;
  const step = 0.08;
  const steps = 18;
  let px = player.x;
  let py = player.y;
  let vx = dx * forceScale;
  let vy = dy * forceScale;

  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  for (let i = 0; i < steps; i += 1) {
    vx *= WORLD.airDrag;
    vy *= WORLD.airDrag;
    vy += gravity * step;
    px += vx * step;
    py += vy * step;
    let propHit = false;
    for (const prop of props) {
      if (getPropCollisionInfo(prop, px, py).hit) {
        propHit = true;
        break;
      }
    }
    if (propHit) break;
    if (getCollisionInfo(px, py).hit) break;
    if (asteroids.length) {
      for (const asteroid of asteroids) {
        if (getAsteroidCollisionInfo(asteroid, px, py).hit) {
          propHit = true;
          break;
        }
      }
      if (propHit) break;
    }
    const sx = (px - camera.x) * camera.zoom;
    const sy = (py - camera.y) * camera.zoom;
    ctx.fillRect(sx - 2, sy - 2, 3, 3);
  }
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
      ctx.save();
      ctx.translate(drop.x, drop.y);
      ctx.rotate(drop.angle);
      ctx.drawImage(woodImage, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
  }
}

function drawHitboxes() {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 64, 64, 0.9)";
  ctx.fillStyle = "rgba(255, 64, 64, 0.5)";
  ctx.lineWidth = 1;

  // Player (sampled solid pixels)
  const solidPixels = frogSolidPixelsDeformed || frogSolidPixels;
  if (solidPixels) {
    const cos = Math.cos(player.angle);
    const sin = Math.sin(player.angle);
    for (let i = 0; i < solidPixels.length; i += 1) {
      const p = solidPixels[i];
      const scale = getPlayerScale();
      const lx = (p.x - frogHalfWidth) * scale;
      const ly = (p.y - frogHalfHeight) * scale;
      const wx = player.x + lx * cos - ly * sin;
      const wy = player.y + lx * sin + ly * cos;
      ctx.fillRect(wx, wy, 1, 1);
    }
  }

  // Props (rect bounds)
  for (const prop of props) {
    const w = prop.type.width * prop.type.scale;
    const h = prop.type.height * prop.type.scale;
    ctx.strokeRect(prop.x, prop.y, w, h);
  }

  // Asteroids (sampled mask)
  if (asteroidMask && asteroidImage.complete) {
    const scale = 3;
    const halfW = asteroidWidth / 2;
    const halfH = asteroidHeight / 2;
    const radius = (asteroidWidth * scale) / 2;
    const pullRadius = radius * asteroidGravity.radiusMultiplier;
    for (const asteroid of asteroids) {
      const cosA = Math.cos(asteroid.angle);
      const sinA = Math.sin(asteroid.angle);
      if (asteroidGravity.enabled) {
        ctx.strokeStyle = "rgba(255, 64, 64, 0.35)";
        ctx.beginPath();
        ctx.arc(asteroid.x, asteroid.y, pullRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let y = 0; y < asteroidHeight; y += 1) {
        for (let x = 0; x < asteroidWidth; x += 1) {
          if (!asteroidMask[y * asteroidWidth + x]) continue;
          const lx = (x - halfW) * scale;
          const ly = (y - halfH) * scale;
          const wx = asteroid.x + lx * cosA - ly * sinA;
          const wy = asteroid.y + lx * sinA + ly * cosA;
          ctx.fillRect(wx, wy, 1, 1);
        }
      }
    }
  }

  ctx.restore();
}

function drawInventoryUI() {
  const invTarget = inventoryOpen ? 1 : 0;
  inventoryAnim += (invTarget - inventoryAnim) * 0.2;
  if (inventoryAnim < 0.01 && !inventoryOpen) return;

  const panelW = Math.min(560, WORLD.width * 0.78);
  const panelH = Math.min(360, WORLD.height * 0.62);
  const panelX = (WORLD.width - panelW) / 2;
  const hiddenY = -panelH - 20;
  const visibleY = (WORLD.height - panelH) / 2;
  const t = 1 - Math.pow(1 - inventoryAnim, 3);
  const panelY = hiddenY + (visibleY - hiddenY) * t;

  ctx.fillStyle = "rgba(12, 16, 28, 0.92)";
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = "#8fd3ff";
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX, panelY, panelW, panelH);
  ctx.fillStyle = "#121a2f";
  ctx.fillRect(panelX, panelY, panelW, 40);
  ctx.fillStyle = "#ffffff";
  ctx.font = "18px \"IBM Plex Mono\", ui-monospace, monospace";
  ctx.fillText("Inventory", panelX + 16, panelY + 26);

  const tabW = 110;
  const tabH = 24;
  const tabY = panelY + 8;
  const itemsTabX = panelX + panelW - tabW * 2 - 16;
  const packsTabX = panelX + panelW - tabW - 8;
  ctx.fillStyle = inventoryTab === "items" ? "#1d2233" : "#0f1424";
  ctx.fillRect(itemsTabX, tabY, tabW, tabH);
  ctx.strokeStyle = "#9fb2ff";
  ctx.strokeRect(itemsTabX, tabY, tabW, tabH);
  ctx.fillStyle = "#ffffff";
  ctx.font = "12px \"IBM Plex Mono\", ui-monospace, monospace";
  ctx.fillText("Items", itemsTabX + 30, tabY + 16);
  ctx.fillStyle = inventoryTab === "packs" ? "#1d2233" : "#0f1424";
  ctx.fillRect(packsTabX, tabY, tabW, tabH);
  ctx.strokeStyle = "#9fb2ff";
  ctx.strokeRect(packsTabX, tabY, tabW, tabH);
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Packs", packsTabX + 30, tabY + 16);
  drawInventoryUI.itemsTabBounds = { x: itemsTabX, y: tabY, w: tabW, h: tabH };
  drawInventoryUI.packsTabBounds = { x: packsTabX, y: tabY, w: tabW, h: tabH };

  const slotW = 90;
  const slotH = 90;
  const slotX = panelX + 28;
  const slotY = panelY + 72;
  ctx.fillStyle = "#0f1424";
  ctx.fillRect(slotX, slotY, slotW, slotH);
  ctx.strokeStyle = "#3a476b";
  ctx.strokeRect(slotX, slotY, slotW, slotH);
  drawInventoryUI.slotBounds = { x: slotX, y: slotY, w: slotW, h: slotH };

  if (woodImage.complete) {
    const iconScale = 2;
    const iconW = woodImage.width * iconScale;
    const iconH = woodImage.height * iconScale;
    ctx.drawImage(woodImage, slotX + 10, slotY + 10, iconW, iconH);
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "16px \"IBM Plex Mono\", ui-monospace, monospace";
  ctx.fillText(`${woodState.count}`, slotX + slotW - 22, slotY + slotH - 10);
  ctx.font = "12px \"IBM Plex Mono\", ui-monospace, monospace";
  ctx.fillStyle = "#9fb2ff";
  ctx.fillText("Sell", slotX + slotW / 2 - 12, slotY + slotH + 16);

  if (inventoryTab === "items") {
    const listX = slotX + slotW + 24;
    const listY = slotY;
    const lineH = 20;
    ctx.fillStyle = "#ffffff";
    ctx.font = "13px \"IBM Plex Mono\", ui-monospace, monospace";
    drawInventoryUI.itemRowBounds = [];
    let row = 0;
    for (const [itemId, count] of itemInventory.counts.entries()) {
      if (count <= 0) continue;
      const item = packs.flatMap((p) => p.items).find((it) => it.id === itemId);
      const name = item ? item.name : itemId;
      const rowY = listY + row * lineH;
      ctx.fillText(`${name} x${count}`, listX, rowY);
      drawInventoryUI.itemRowBounds.push({
        x: listX,
        y: rowY - 12,
        w: 260,
        h: lineH,
        itemId,
        rarity: item ? item.rarity : "common",
      });
      row += 1;
      if (row > 8) break;
    }
    if (row === 0) {
      ctx.fillStyle = "#9fb2ff";
      ctx.fillText("No items yet.", listX, listY + lineH);
    } else {
      ctx.fillStyle = "#9fb2ff";
      ctx.fillText("Click item to sell", listX, listY + lineH * (row + 0.5));
    }
  } else {
    const listX = slotX + slotW + 24;
    const listY = slotY;
    const lineH = 20;
    ctx.fillStyle = "#ffffff";
    ctx.font = "13px \"IBM Plex Mono\", ui-monospace, monospace";
    drawInventoryUI.itemRowBounds = [];
    let row = 0;
    for (const pack of packs) {
      ctx.fillText(`${pack.label} - ${pack.price}c`, listX, listY + row * lineH);
      row += 1;
      if (row > 8) break;
    }
  }

  const exitW = 26;
  const exitH = 26;
  const exitX = panelX + panelW - exitW - 12;
  const exitY = panelY + 8;
  ctx.fillStyle = "#1d2233";
  ctx.fillRect(exitX, exitY, exitW, exitH);
  ctx.strokeStyle = "#9fb2ff";
  ctx.strokeRect(exitX, exitY, exitW, exitH);
  ctx.strokeStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(exitX + 7, exitY + 7);
  ctx.lineTo(exitX + exitW - 7, exitY + exitH - 7);
  ctx.moveTo(exitX + exitW - 7, exitY + 7);
  ctx.lineTo(exitX + 7, exitY + exitH - 7);
  ctx.stroke();
  drawInventoryUI.exitBounds = { x: exitX, y: exitY, w: exitW, h: exitH };

  const coinScale = 2;
  if (coinImage.complete) {
    const coinW = coinImage.width * coinScale;
    const coinH = coinImage.height * coinScale;
    const coinX = panelX + panelW - 140;
    const coinY = panelY + 10;
    ctx.drawImage(coinImage, coinX, coinY, coinW, coinH);
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px \"IBM Plex Mono\", ui-monospace, monospace";
    ctx.fillText(`${coinState.count}`, coinX + coinW + 8, coinY + coinH - 4);
  }

  const shopTabW = 28;
  const shopTabH = 90;
  const shopW = WORLD.width;
  const shopH = WORLD.height;
  const shopX = 0;
  const shopY = 0;
  const tabX = WORLD.width - shopTabW + (1 - shopState.anim) * 6;
  const shopTabY = panelY + panelH * 0.25;
  const shopTarget = shopState.open ? 1 : 0;
  shopState.anim += (shopTarget - shopState.anim) * 0.18;

  ctx.fillStyle = "#101522";
  ctx.fillRect(tabX, shopTabY, shopTabW, shopTabH);
  ctx.strokeStyle = "#9fb2ff";
  ctx.strokeRect(tabX, shopTabY, shopTabW, shopTabH);
  ctx.fillStyle = "#ffffff";
  ctx.font = "12px \"IBM Plex Mono\", ui-monospace, monospace";
  ctx.save();
  ctx.translate(tabX + shopTabW / 2, shopTabY + shopTabH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("SHOP", 0, 4);
  ctx.restore();
  drawInventoryUI.shopTabBounds = { x: tabX, y: shopTabY, w: shopTabW, h: shopTabH };

  const skinTabW = 28;
  const skinTabH = 90;
  const skinTabX = skinTabState.anim * (skinTabW + 12) - 8;
  const skinTabY = panelY + panelH * 0.25;
  const skinTarget = skinTabState.open ? 1 : 0;
  skinTabState.anim += (skinTarget - skinTabState.anim) * 0.18;
  ctx.fillStyle = "#101522";
  ctx.fillRect(skinTabX, skinTabY, skinTabW, skinTabH);
  ctx.strokeStyle = "#9fb2ff";
  ctx.strokeRect(skinTabX, skinTabY, skinTabW, skinTabH);
  ctx.fillStyle = "#ffffff";
  ctx.font = "12px \"IBM Plex Mono\", ui-monospace, monospace";
  ctx.save();
  ctx.translate(skinTabX + skinTabW / 2, skinTabY + skinTabH / 2);
  ctx.rotate(Math.PI / 2);
  ctx.fillText("SKIN", 0, 4);
  ctx.restore();
  drawInventoryUI.skinTabBounds = { x: skinTabX, y: skinTabY, w: skinTabW + 8, h: skinTabH };

  if (skinTabState.anim > 0.01) {
    const skinPanelW = 240;
    const skinPanelH = panelH;
    const skinPanelX = -skinPanelW + skinTabState.anim * skinPanelW;
    const skinPanelY = panelY;
    ctx.save();
    ctx.globalAlpha = skinTabState.anim;
    ctx.fillStyle = "#0f1422";
    ctx.fillRect(skinPanelX, skinPanelY, skinPanelW, skinPanelH);
    ctx.strokeStyle = "#9fb2ff";
    ctx.strokeRect(skinPanelX, skinPanelY, skinPanelW, skinPanelH);
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px \"IBM Plex Mono\", ui-monospace, monospace";
    ctx.fillText("Skins", skinPanelX + 16, skinPanelY + 28);

    const buttonW = skinPanelW - 32;
    const buttonH = 34;
    const startY = skinPanelY + 52;
    const gap = 10;
    drawInventoryUI.skinRowBounds = [];
    skins.forEach((skin, index) => {
      const y = startY + index * (buttonH + gap);
      ctx.fillStyle = skin.id === currentSkin ? "#1b3b2f" : "#1d2233";
      ctx.fillRect(skinPanelX + 16, y, buttonW, buttonH);
      ctx.strokeStyle = "#9fb2ff";
      ctx.strokeRect(skinPanelX + 16, y, buttonW, buttonH);
      ctx.fillStyle = "#ffffff";
      ctx.font = "13px \"IBM Plex Mono\", ui-monospace, monospace";
      ctx.fillText(skin.label, skinPanelX + 28, y + 22);
      drawInventoryUI.skinRowBounds.push({
        x: skinPanelX + 16,
        y,
        w: buttonW,
        h: buttonH,
        skinId: skin.id,
      });
    });
    ctx.restore();
  } else {
    drawInventoryUI.skinRowBounds = null;
  }

  if (shopState.anim > 0.01) {
    ctx.save();
    ctx.globalAlpha = shopState.anim;
    ctx.fillStyle = "rgba(8, 12, 20, 0.96)";
    ctx.fillRect(shopX, shopY, shopW, shopH);

    ctx.fillStyle = "#ffffff";
    ctx.font = "22px \"IBM Plex Mono\", ui-monospace, monospace";
    ctx.fillText("Shop", 24, 44);

    const rowX = 24;
    const rowW = shopW - 48;
    const rowH = 96;
    const rowGap = 18;
    const upgradesY = 80;
    const skinsY = upgradesY + rowH + rowGap;

    ctx.fillStyle = "#111a2b";
    ctx.fillRect(rowX, upgradesY, rowW, rowH);
    ctx.strokeStyle = "#9fb2ff";
    ctx.strokeRect(rowX, upgradesY, rowW, rowH);
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px \"IBM Plex Mono\", ui-monospace, monospace";
    ctx.fillText("Upgrades", rowX + 16, upgradesY + 28);

    const basePrice = 10;
    const price = Math.floor(basePrice * Math.pow(2, shopState.level));
    const buttonW = 220;
    const buttonH = 44;
    const buttonX = rowX + 16;
    const buttonY = upgradesY + 40;
    ctx.fillStyle = "#1d2233";
    ctx.fillRect(buttonX, buttonY, buttonW, buttonH);
    ctx.strokeStyle = "#9fb2ff";
    ctx.strokeRect(buttonX, buttonY, buttonW, buttonH);
    ctx.fillStyle = "#ffffff";
    ctx.font = "14px \"IBM Plex Mono\", ui-monospace, monospace";
    ctx.fillText("Swipe +40", buttonX + 12, buttonY + 28);
    if (coinImage.complete) {
      const coinW = coinImage.width * 1.5;
      const coinH = coinImage.height * 1.5;
      ctx.drawImage(coinImage, buttonX + buttonW - 58, buttonY + 12, coinW, coinH);
    }
    ctx.fillText(`${price}`, buttonX + buttonW - 28, buttonY + 28);
    drawInventoryUI.shopBuyBounds = { x: buttonX, y: buttonY, w: buttonW, h: buttonH, price };

    ctx.fillStyle = "#111a2b";
    ctx.fillRect(rowX, skinsY, rowW, rowH);
    ctx.strokeStyle = "#9fb2ff";
    ctx.strokeRect(rowX, skinsY, rowW, rowH);
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px \"IBM Plex Mono\", ui-monospace, monospace";
    ctx.fillText("Skins", rowX + 16, skinsY + 28);
    ctx.fillStyle = "#9fb2ff";
    ctx.font = "13px \"IBM Plex Mono\", ui-monospace, monospace";
    ctx.fillText("Coming soon", rowX + 16, skinsY + 60);

    const debugY = skinsY + rowH + rowGap;
    ctx.fillStyle = "#111a2b";
    ctx.fillRect(rowX, debugY, rowW, rowH);
    ctx.strokeStyle = "#9fb2ff";
    ctx.strokeRect(rowX, debugY, rowW, rowH);
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px \"IBM Plex Mono\", ui-monospace, monospace";
    ctx.fillText("Debug", rowX + 16, debugY + 28);

    const toggleW = 190;
    const toggleH = 34;
    const toggleX = rowX + 16;
    const toggleY = debugY + 44;
    const toggleGap = 10;

    ctx.fillStyle = debugState.legDay ? "#1b3b2f" : "#1d2233";
    ctx.fillRect(toggleX, toggleY, toggleW, toggleH);
    ctx.strokeStyle = "#9fb2ff";
    ctx.strokeRect(toggleX, toggleY, toggleW, toggleH);
    ctx.fillStyle = "#ffffff";
    ctx.font = "13px \"IBM Plex Mono\", ui-monospace, monospace";
    ctx.fillText(`Leg Day: ${debugState.legDay ? "ON" : "OFF"}`, toggleX + 10, toggleY + 22);
    drawInventoryUI.legDayBounds = { x: toggleX, y: toggleY, w: toggleW, h: toggleH };

    const squishX = toggleX + toggleW + toggleGap;
    ctx.fillStyle = debugState.noSquish ? "#3b1b1b" : "#1d2233";
    ctx.fillRect(squishX, toggleY, toggleW, toggleH);
    ctx.strokeStyle = "#9fb2ff";
    ctx.strokeRect(squishX, toggleY, toggleW, toggleH);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`Squish: ${debugState.noSquish ? "OFF" : "ON"}`, squishX + 10, toggleY + 22);
    drawInventoryUI.noSquishBounds = { x: squishX, y: toggleY, w: toggleW, h: toggleH };

    const hingeY = toggleY + toggleH + toggleGap;
    ctx.fillStyle = debugState.noHinges ? "#3b1b1b" : "#1d2233";
    ctx.fillRect(toggleX, hingeY, toggleW, toggleH);
    ctx.strokeStyle = "#9fb2ff";
    ctx.strokeRect(toggleX, hingeY, toggleW, toggleH);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`Hinges: ${debugState.noHinges ? "OFF" : "ON"}`, toggleX + 10, hingeY + 22);
    drawInventoryUI.noHingesBounds = { x: toggleX, y: hingeY, w: toggleW, h: toggleH };

    ctx.fillStyle = debugState.noRotation ? "#3b1b1b" : "#1d2233";
    ctx.fillRect(squishX, hingeY, toggleW, toggleH);
    ctx.strokeStyle = "#9fb2ff";
    ctx.strokeRect(squishX, hingeY, toggleW, toggleH);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`Rotation: ${debugState.noRotation ? "OFF" : "ON"}`, squishX + 10, hingeY + 22);
    drawInventoryUI.noRotationBounds = { x: squishX, y: hingeY, w: toggleW, h: toggleH };

    const swipeY = hingeY + toggleH + toggleGap;
    ctx.fillStyle = debugState.noSwipeCap ? "#3b1b1b" : "#1d2233";
    ctx.fillRect(toggleX, swipeY, toggleW, toggleH);
    ctx.strokeStyle = "#9fb2ff";
    ctx.strokeRect(toggleX, swipeY, toggleW, toggleH);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`Swipe Cap: ${debugState.noSwipeCap ? "OFF" : "ON"}`, toggleX + 10, swipeY + 22);
    drawInventoryUI.noSwipeCapBounds = { x: toggleX, y: swipeY, w: toggleW, h: toggleH };

    const flyY = swipeY + toggleH + toggleGap;
    ctx.fillStyle = debugState.flyMode ? "#1b3b2f" : "#1d2233";
    ctx.fillRect(toggleX, flyY, toggleW, toggleH);
    ctx.strokeStyle = "#9fb2ff";
    ctx.strokeRect(toggleX, flyY, toggleW, toggleH);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`Fly: ${debugState.flyMode ? "ON" : "OFF"}`, toggleX + 10, flyY + 22);
    drawInventoryUI.flyModeBounds = { x: toggleX, y: flyY, w: toggleW, h: toggleH };

    const speedX = squishX;
    const speedW = toggleW;
    const speedH = toggleH;
    ctx.fillStyle = "#1d2233";
    ctx.fillRect(speedX, flyY, speedW, speedH);
    ctx.strokeStyle = "#9fb2ff";
    ctx.strokeRect(speedX, flyY, speedW, speedH);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`Speed: ${Math.round(debugState.flySpeed)}`, speedX + 10, flyY + 22);
    drawInventoryUI.flySpeedBounds = { x: speedX, y: flyY, w: speedW, h: speedH };

    const hitboxY = flyY + toggleH + toggleGap;
    ctx.fillStyle = debugState.showHitboxes ? "#1b3b2f" : "#1d2233";
    ctx.fillRect(toggleX, hitboxY, toggleW, toggleH);
    ctx.strokeStyle = "#9fb2ff";
    ctx.strokeRect(toggleX, hitboxY, toggleW, toggleH);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`Hitboxes: ${debugState.showHitboxes ? "ON" : "OFF"}`, toggleX + 10, hitboxY + 22);
    drawInventoryUI.hitboxBounds = { x: toggleX, y: hitboxY, w: toggleW, h: toggleH };

    const packsY = hitboxY + toggleH + toggleGap;
    ctx.fillStyle = "#111a2b";
    ctx.fillRect(rowX, packsY, rowW, rowH);
    ctx.strokeStyle = "#9fb2ff";
    ctx.strokeRect(rowX, packsY, rowW, rowH);
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px \"IBM Plex Mono\", ui-monospace, monospace";
    ctx.fillText("Packs", rowX + 16, packsY + 28);

    const packButtonW = 220;
    const packButtonH = 44;
    const packButtonX = rowX + 16;
    const packButtonY = packsY + 40;
    const currentPack = packs[shopState.level % packs.length];
    const packPrice = currentPack.price;
    ctx.fillStyle = "#1d2233";
    ctx.fillRect(packButtonX, packButtonY, packButtonW, packButtonH);
    ctx.strokeStyle = "#9fb2ff";
    ctx.strokeRect(packButtonX, packButtonY, packButtonW, packButtonH);
    ctx.fillStyle = "#ffffff";
    ctx.font = "14px \"IBM Plex Mono\", ui-monospace, monospace";
    ctx.fillText(`Open ${currentPack.label}`, packButtonX + 10, packButtonY + 28);
    if (coinImage.complete) {
      const coinW = coinImage.width * 1.5;
      const coinH = coinImage.height * 1.5;
      ctx.drawImage(coinImage, packButtonX + packButtonW - 58, packButtonY + 12, coinW, coinH);
    }
    ctx.fillText(`${packPrice}`, packButtonX + packButtonW - 28, packButtonY + 28);
    drawInventoryUI.packOpenBounds = { x: packButtonX, y: packButtonY, w: packButtonW, h: packButtonH, packId: currentPack.id };

    const closeW = 28;
    const closeH = 28;
    const closeX = shopW - closeW - 16;
    const closeY = 16;
    ctx.fillStyle = "#1d2233";
    ctx.fillRect(closeX, closeY, closeW, closeH);
    ctx.strokeStyle = "#9fb2ff";
    ctx.strokeRect(closeX, closeY, closeW, closeH);
    ctx.strokeStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(closeX + 7, closeY + 7);
    ctx.lineTo(closeX + closeW - 7, closeY + closeH - 7);
    ctx.moveTo(closeX + closeW - 7, closeY + 7);
    ctx.lineTo(closeX + 7, closeY + closeH - 7);
    ctx.stroke();
    drawInventoryUI.shopCloseBounds = { x: closeX, y: closeY, w: closeW, h: closeH };

    ctx.restore();
  } else {
    drawInventoryUI.shopBuyBounds = null;
    drawInventoryUI.shopCloseBounds = null;
    drawInventoryUI.legDayBounds = null;
    drawInventoryUI.noSquishBounds = null;
    drawInventoryUI.noHingesBounds = null;
    drawInventoryUI.noRotationBounds = null;
    drawInventoryUI.noSwipeCapBounds = null;
    drawInventoryUI.flyModeBounds = null;
    drawInventoryUI.flySpeedBounds = null;
    drawInventoryUI.hitboxBounds = null;
    drawInventoryUI.packOpenBounds = null;
    drawInventoryUI.itemRowBounds = null;
    drawInventoryUI.skinRowBounds = null;
    drawInventoryUI.skinTabBounds = null;
  }

  if (inventoryCursorImage.complete) {
    const cursorW = inventoryCursorImage.width;
    const cursorH = inventoryCursorImage.height;
    ctx.drawImage(inventoryCursorImage, inventoryCursor.x, inventoryCursor.y, cursorW, cursorH);
  }
}

function drawTitleScreen() {
  if (titleBackgroundImage.complete) {
    const speed = performance.now() * 0.02;
    const scale = 2;
    const tileW = titleBackgroundImage.width * scale;
    const tileH = titleBackgroundImage.height * scale;
    const tileX = -((speed) % tileW) + titleParallax.x;
    const tileY = -((speed * 0.6) % tileH) + titleParallax.y;
    drawTiledImage(titleBackgroundImage, tileX, tileY, scale, 0, WORLD.width, 0, WORLD.height);

    const tileX2 = ((speed * 0.8) % tileW) + titleParallax.x * 0.5;
    const tileY2 = ((speed * 0.45) % tileH) + titleParallax.y * 0.5;
    ctx.save();
    ctx.globalAlpha = 0.5;
    drawTiledImage(titleBackgroundImage, tileX2, tileY2, scale, 0, WORLD.width, 0, WORLD.height);
    ctx.restore();
  } else {
    ctx.fillStyle = "#0b0d17";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  }

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

function drawMapSelectScreen() {
  ctx.fillStyle = "#0b0d17";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.fillStyle = "#cfd7ff";
  ctx.font = "36px \"IBM Plex Mono\", ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText("Choose a Map", WORLD.width / 2, WORLD.height * 0.22);

  const buttonW = Math.min(420, WORLD.width * 0.7);
  const buttonH = 64;
  const centerX = WORLD.width / 2;
  const startY = WORLD.height * 0.42;
  const gap = 18;

  const grassland = {
    x: centerX - buttonW / 2,
    y: startY,
    w: buttonW,
    h: buttonH,
    label: "Grassland",
    mapId: "grassland",
  };
  const beach = {
    x: centerX - buttonW / 2,
    y: startY + buttonH + gap,
    w: buttonW,
    h: buttonH,
    label: "Beach",
    mapId: "beach",
  };

  ctx.fillStyle = "#1d2233";
  ctx.fillRect(grassland.x, grassland.y, grassland.w, grassland.h);
  ctx.fillRect(beach.x, beach.y, beach.w, beach.h);
  ctx.strokeStyle = "#9fb2ff";
  ctx.lineWidth = 2;
  ctx.strokeRect(grassland.x, grassland.y, grassland.w, grassland.h);
  ctx.strokeRect(beach.x, beach.y, beach.w, beach.h);

  ctx.fillStyle = "#ffffff";
  ctx.font = "20px \"IBM Plex Mono\", ui-monospace, monospace";
  ctx.fillText(grassland.label, centerX, grassland.y + grassland.h * 0.65);
  ctx.fillText(beach.label, centerX, beach.y + beach.h * 0.65);

  ctx.font = "14px \"IBM Plex Mono\", ui-monospace, monospace";
  ctx.fillStyle = "#9fb2ff";
  ctx.fillText("Press 1 or 2.", centerX, WORLD.height * 0.8);

  drawMapSelectScreen.buttons = [grassland, beach];
}

function drawLoadingScreen() {
  ctx.fillStyle = "#0b0d17";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.fillStyle = "#cfd7ff";
  ctx.font = "22px \"IBM Plex Mono\", ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText("Loading...", WORLD.width / 2, WORLD.height * 0.5);
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

  const gravityT = Math.min(1, Math.max(0, -camera.y / 4800));
  const gravityScale = 1 - gravityT * 0.99;
  const currentGravity = WORLD.gravity * gravityScale;
  const spaceT = Math.min(1, Math.max(0, (gravityT - 0.5) / 0.5));

  if (debugState.flyMode) {
    const moveX = (inputState.right ? 1 : 0) - (inputState.left ? 1 : 0);
    const moveY = (inputState.down ? 1 : 0) - (inputState.up ? 1 : 0);
    const speed = debugState.flySpeed;
    player.vx = moveX * speed;
    player.vy = moveY * speed;
  } else if (debugState.legDay) {
    const move = (inputState.right ? 1 : 0) - (inputState.left ? 1 : 0);
    const walkAccel = 520;
    player.vx += move * walkAccel * dt;
    player.vx *= 0.9;
    if (inputState.up && isGrounded()) {
      player.vy = -360 * gravityScale;
    }
  }

  if (!debugState.flyMode) {
    player.vy += currentGravity * dt;
  }
  if (asteroids.length && asteroidMask && asteroidGravity.enabled) {
    const scale = 3;
    const radius = (asteroidWidth * scale) / 2;
    const pullRadius = radius * asteroidGravity.radiusMultiplier;
    let ax = 0;
    let ay = 0;
    for (const asteroid of asteroids) {
      const dx = asteroid.x - player.x;
      const dy = asteroid.y - player.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > pullRadius) continue;
      const t = 1 - dist / pullRadius;
      const pull = asteroidGravity.strength * t;
      ax += (dx / dist) * pull;
      ay += (dy / dist) * pull;
    }
    player.vx += ax * dt;
    player.vy += ay * dt;
  }
  player.vx *= WORLD.airDrag;
  player.vy *= WORLD.airDrag;

  const targetX = player.x + player.vx * dt;
  const targetY = player.y + player.vy * dt;

  if (!debugState.noRotation) {
    player.angle += player.angularVelocity * dt;
    player.angularVelocity *= 0.985;
  }

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

  if (asteroids.length) {
    let asteroidHit = null;
    for (const asteroid of asteroids) {
      const info = getAsteroidCollisionInfo(asteroid, player.x, player.y);
      if (info.hit) {
        asteroidHit = info;
        break;
      }
    }

    if (asteroidHit) {
      let lo = 0;
      let hi = 1;
      let lastSafeX = prevX;
      let lastSafeY = prevY;
      let hitInfo = asteroidHit;
      for (let i = 0; i < 8; i += 1) {
        const mid = (lo + hi) / 2;
        const mx = prevX + (player.x - prevX) * mid;
        const my = prevY + (player.y - prevY) * mid;
        const info = getAsteroidCollisionInfo(asteroidHit.asteroid, mx, my);
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
      resolveCollision(hitInfo, 0.35, 0.2);
      positionalCorrection(hitInfo);
      player.angularVelocity *= 0.9;
    }
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
    const gravityT = Math.min(1, Math.max(0, -camera.y / 4800));
    const gravityScale = 1 - gravityT * 0.99;
    drop.vy += WORLD.gravity * 0.35 * gravityScale * dt;
    drop.vx *= 0.98;
    drop.vy *= 0.98;
    drop.x += drop.vx * dt;
    drop.y += drop.vy * dt;
    drop.angle += drop.angularVelocity * dt;
    drop.angularVelocity *= 0.985;

    const surfaceY = getSurfaceYAtX(drop.x);
    if (surfaceY !== null && drop.y > surfaceY - 6) {
      drop.y = surfaceY - 6;
      const prevVy = drop.vy;
      drop.vx *= 0.5;
      drop.vy = -prevVy * 0.2;
      drop.angularVelocity += (Math.random() - 0.5) * 2;
      if (Math.abs(drop.vy) < 4) {
        drop.vy = 0;
        drop.angularVelocity *= 0.8;
      }
    }

    const dx = player.x - drop.x;
    const dy = player.y - drop.y;
    if (Math.hypot(dx, dy) < 20) {
      woodState.count += 1;
      woodDrops.splice(i, 1);
    }
  }

  if (woodDrops.length > 1 && woodImage.complete) {
    const radius = Math.max(4, woodImage.width * 0.4);
    const minDist = radius * 2;
    const minDistSq = minDist * minDist;
    for (let i = 0; i < woodDrops.length; i += 1) {
      for (let j = i + 1; j < woodDrops.length; j += 1) {
        const a = woodDrops[i];
        const b = woodDrops[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;
        if (distSq === 0 || distSq > minDistSq) continue;
        const dist = Math.sqrt(distSq) || 1;
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;
        const half = overlap * 0.5;
        a.x -= nx * half;
        a.y -= ny * half;
        b.x += nx * half;
        b.y += ny * half;

        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const velAlongNormal = rvx * nx + rvy * ny;
        if (velAlongNormal > 0) continue;
        const restitution = 0.2;
        const jImpulse = -(1 + restitution) * velAlongNormal * 0.5;
        const impX = jImpulse * nx;
        const impY = jImpulse * ny;
        a.vx -= impX;
        a.vy -= impY;
        b.vx += impX;
        b.vy += impY;
      }
    }
  }

  if (asteroids.length && asteroidImage.complete) {
    for (const asteroid of asteroids) {
      asteroid.x += asteroid.vx * dt;
      asteroid.y += asteroid.vy * dt;
      asteroid.angle += asteroid.angularVelocity * dt;

      if (asteroid.y > camera.y + WORLD.height + 800) {
        asteroid.y = camera.y - 3000 - Math.random() * 2000;
        asteroid.x = camera.x + WORLD.width / 2 + (Math.random() - 0.5) * asteroidField.width;
      }
      const centerX = camera.x + WORLD.width / 2;
      if (asteroid.x < centerX - asteroidField.width) asteroid.x += asteroidField.width * 2;
      if (asteroid.x > centerX + asteroidField.width) asteroid.x -= asteroidField.width * 2;
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
  if (gameState === "mapSelect") {
    drawMapSelectScreen();
    requestAnimationFrame(frame);
    return;
  }
  if (gameState === "loading") {
    drawLoadingScreen();
    requestAnimationFrame(frame);
    return;
  }

  update(dt);
  updatePropsAndDrops(dt);
  updateCamera(dt);

  drawParallax(-camera.y * 0.5);
  if (currentMap === "beach" && MAPS[currentMap].hasClouds) {
    const cloudScale = 2.8;
    if (cloudImages[0].complete) {
      const cloud1X = -camera.x * 0.2;
      const cloud1Y = -camera.y * 0.15 - 120;
      drawTiledImageHorizontal(cloudImages[0], cloud1X, cloud1Y, cloudScale, 0, WORLD.width);
    }
    if (cloudImages[1].complete) {
      const cloud2X = -camera.x * 0.25;
      const cloud2Y = -camera.y * 0.18 - 40;
      drawTiledImageHorizontal(cloudImages[1], cloud2X, cloud2Y, cloudScale, 0, WORLD.width);
    }
  }
  const bg2X = -camera.x * 0.4;
  const beachBg2Offset = currentMap === "beach" ? 150 : 0;
  const bg2Y = -camera.y * 0.4 + bg2.y + beachBg2Offset;
  drawTiledImageHorizontal(bg2Image, bg2X, bg2Y, bg2.scale, 0, WORLD.width);
  if (bg1Image.complete) {
    const bg1X = -camera.x * 0.6;
    const bg1Y = -camera.y * 0.6 + bg1.y;
    const bg1H = bg1Image.height * bg1.scale;
    drawTiledImageHorizontal(bg1Image, bg1X, bg1Y, bg1.scale, 0, WORLD.width);
    if (currentMap && MAPS[currentMap].hasBg1Lower) {
      drawTiledImageDown(bg1LowerImage, bg1X, bg1Y + bg1H, bg1.scale, 0, WORLD.width, WORLD.height);
    }
  }
  const heightT = Math.min(1, Math.max(0, -camera.y / 4800));
  if (earthImage.complete) {
    const earthAlpha = Math.min(1, Math.max(0, (heightT - 0.5) / 0.5));
    if (earthAlpha > 0) {
      const w = WORLD.width;
      const h = (earthImage.height / earthImage.width) * w;
      const x = 0;
      const y = -camera.y * 0.04 - h * 0.55 + 500;
      ctx.save();
      ctx.globalAlpha = earthAlpha;
      ctx.drawImage(earthImage, x, y, w, h);
      ctx.restore();
    }
  }
  if (asteroids.length && asteroidImage.complete) {
    const scale = 3;
    const w = asteroidImage.width * scale;
    const h = asteroidImage.height * scale;
    for (const asteroid of asteroids) {
      const sx = (asteroid.x - camera.x) * camera.zoom;
      const sy = (asteroid.y - camera.y) * camera.zoom;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(asteroid.angle);
      ctx.drawImage(asteroidImage, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
  }
  if (enableMiddleground && currentMap && MAPS[currentMap].hasMiddleground && middlegroundImage.complete) {
    const bg1Y = -camera.y * 0.6 + bg1.y;
    const bg1H = bg1Image.height * bg1.scale;
    const bg1BottomY = bg1Y + bg1H;
    drawMiddlegroundVoxelConnector(middlegroundImage, 1, middleground.scale, bg1BottomY);
  }
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
  if (debugState.showHitboxes) {
    drawHitboxes();
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
  if (gameState === "title" || gameState === "mapSelect" || gameState === "loading") {
    return;
  }
  if (!pointerLocked) {
    if (document.fullscreenElement !== document.documentElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    canvas.requestPointerLock({ unadjustedMovement: true });
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
      const now = performance.now();
      const dt = Math.max(1, now - lastMoveAt);
      const vx = (event.movementX || 0) / dt;
      const vy = (event.movementY || 0) / dt;
      const speed = Math.hypot(vx, vy);
      const clamp = speed > 0 ? Math.min(1, maxSwipeVelocity / speed) : 1;
      moveAccumX += (event.movementX || 0) * clamp;
      moveAccumY += (event.movementY || 0) * clamp;
      if (!debugState.noSwipeCap) {
        const accumMag = Math.hypot(moveAccumX, moveAccumY);
        if (accumMag > maxSwipeDistance) {
          const s = maxSwipeDistance / accumMag;
          moveAccumX *= s;
          moveAccumY *= s;
        }
      }
      lastMoveAt = performance.now();
    }
    return;
  }
  if (!isDragging) return;
  const rect = canvas.getBoundingClientRect();
  dragCurrent = { x: event.clientX - rect.left, y: event.clientY - rect.top };
});

window.addEventListener("mousemove", (event) => {
  if (pointerLocked) return;
  const rect = canvas.getBoundingClientRect();
  const cx = event.clientX - rect.left;
  const cy = event.clientY - rect.top;
  const nx = (cx / rect.width) * 2 - 1;
  const ny = (cy / rect.height) * 2 - 1;
  const strength = 18;
  titleParallax.x = nx * strength;
  titleParallax.y = ny * strength;
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
        beginMapSelect(btn.mode);
        return;
      }
    }
  }
  if (gameState === "mapSelect") {
    const buttons = drawMapSelectScreen.buttons || [];
    const rect = canvas.getBoundingClientRect();
    const cx = event.clientX - rect.left;
    const cy = event.clientY - rect.top;
    for (const btn of buttons) {
      if (cx >= btn.x && cx <= btn.x + btn.w && cy >= btn.y && cy <= btn.y + btn.h) {
        selectMap(btn.mapId);
        return;
      }
    }
  }
  if (!inventoryOpen || !pointerLocked) return;
  const bounds = drawInventoryUI.exitBounds;
  if (!bounds) return;
  const cx = inventoryCursor.x;
  const cy = inventoryCursor.y;
  const itemsTab = drawInventoryUI.itemsTabBounds;
  if (itemsTab && cx >= itemsTab.x && cx <= itemsTab.x + itemsTab.w && cy >= itemsTab.y && cy <= itemsTab.y + itemsTab.h) {
    inventoryTab = "items";
    return;
  }
  const packsTab = drawInventoryUI.packsTabBounds;
  if (packsTab && cx >= packsTab.x && cx <= packsTab.x + packsTab.w && cy >= packsTab.y && cy <= packsTab.y + packsTab.h) {
    inventoryTab = "packs";
    return;
  }
  const skinTab = drawInventoryUI.skinTabBounds;
  if (skinTab && cx >= skinTab.x && cx <= skinTab.x + skinTab.w && cy >= skinTab.y && cy <= skinTab.y + skinTab.h) {
    skinTabState.open = !skinTabState.open;
    return;
  }
  const closeBounds = drawInventoryUI.shopCloseBounds;
  if (closeBounds && cx >= closeBounds.x && cx <= closeBounds.x + closeBounds.w && cy >= closeBounds.y && cy <= closeBounds.y + closeBounds.h) {
    shopState.open = false;
    return;
  }
  const tabBounds = drawInventoryUI.shopTabBounds;
  if (tabBounds && cx >= tabBounds.x && cx <= tabBounds.x + tabBounds.w && cy >= tabBounds.y && cy <= tabBounds.y + tabBounds.h) {
    shopState.open = true;
    return;
  }
  const legBounds = drawInventoryUI.legDayBounds;
  if (legBounds && cx >= legBounds.x && cx <= legBounds.x + legBounds.w && cy >= legBounds.y && cy <= legBounds.y + legBounds.h) {
    debugState.legDay = !debugState.legDay;
    return;
  }
  const squishBounds = drawInventoryUI.noSquishBounds;
  if (squishBounds && cx >= squishBounds.x && cx <= squishBounds.x + squishBounds.w && cy >= squishBounds.y && cy <= squishBounds.y + squishBounds.h) {
    debugState.noSquish = !debugState.noSquish;
    return;
  }
  const hingeBounds = drawInventoryUI.noHingesBounds;
  if (hingeBounds && cx >= hingeBounds.x && cx <= hingeBounds.x + hingeBounds.w && cy >= hingeBounds.y && cy <= hingeBounds.y + hingeBounds.h) {
    debugState.noHinges = !debugState.noHinges;
    return;
  }
  const rotationBounds = drawInventoryUI.noRotationBounds;
  if (rotationBounds && cx >= rotationBounds.x && cx <= rotationBounds.x + rotationBounds.w && cy >= rotationBounds.y && cy <= rotationBounds.y + rotationBounds.h) {
    debugState.noRotation = !debugState.noRotation;
    return;
  }
  const swipeBounds = drawInventoryUI.noSwipeCapBounds;
  if (swipeBounds && cx >= swipeBounds.x && cx <= swipeBounds.x + swipeBounds.w && cy >= swipeBounds.y && cy <= swipeBounds.y + swipeBounds.h) {
    debugState.noSwipeCap = !debugState.noSwipeCap;
    return;
  }
  const flyBounds = drawInventoryUI.flyModeBounds;
  if (flyBounds && cx >= flyBounds.x && cx <= flyBounds.x + flyBounds.w && cy >= flyBounds.y && cy <= flyBounds.y + flyBounds.h) {
    debugState.flyMode = !debugState.flyMode;
    return;
  }
  const flySpeedBounds = drawInventoryUI.flySpeedBounds;
  if (flySpeedBounds && cx >= flySpeedBounds.x && cx <= flySpeedBounds.x + flySpeedBounds.w && cy >= flySpeedBounds.y && cy <= flySpeedBounds.y + flySpeedBounds.h) {
    if (cx < flySpeedBounds.x + flySpeedBounds.w / 2) {
      debugState.flySpeed = Math.max(60, debugState.flySpeed - 40);
    } else {
      debugState.flySpeed = Math.min(900, debugState.flySpeed + 40);
    }
    return;
  }
  const hitboxBounds = drawInventoryUI.hitboxBounds;
  if (hitboxBounds && cx >= hitboxBounds.x && cx <= hitboxBounds.x + hitboxBounds.w && cy >= hitboxBounds.y && cy <= hitboxBounds.y + hitboxBounds.h) {
    debugState.showHitboxes = !debugState.showHitboxes;
    return;
  }
  const buyBounds = drawInventoryUI.shopBuyBounds;
  if (buyBounds && cx >= buyBounds.x && cx <= buyBounds.x + buyBounds.w && cy >= buyBounds.y && cy <= buyBounds.y + buyBounds.h) {
    if (coinState.count >= buyBounds.price) {
      coinState.count -= buyBounds.price;
      shopState.level += 1;
      maxSwipeDistance += 40;
    }
    return;
  }
  const packBounds = drawInventoryUI.packOpenBounds;
  if (packBounds && cx >= packBounds.x && cx <= packBounds.x + packBounds.w && cy >= packBounds.y && cy <= packBounds.y + packBounds.h) {
    const pack = packs.find((p) => p.id === packBounds.packId);
    if (pack && coinState.count >= pack.price) {
      coinState.count -= pack.price;
      openPack(pack);
    }
    return;
  }
  const itemRows = drawInventoryUI.itemRowBounds || [];
  for (const row of itemRows) {
    if (cx >= row.x && cx <= row.x + row.w && cy >= row.y && cy <= row.y + row.h) {
      const count = itemInventory.counts.get(row.itemId) || 0;
      if (count > 0) {
        itemInventory.counts.set(row.itemId, count - 1);
        const value = raritySellValue[row.rarity] || 1;
        coinState.count += value;
      }
      return;
    }
  }
  const skinRows = drawInventoryUI.skinRowBounds || [];
  for (const row of skinRows) {
    if (cx >= row.x && cx <= row.x + row.w && cy >= row.y && cy <= row.y + row.h) {
      loadSkin(row.skinId);
      return;
    }
  }
  const slotBounds = drawInventoryUI.slotBounds;
  if (slotBounds && cx >= slotBounds.x && cx <= slotBounds.x + slotBounds.w && cy >= slotBounds.y && cy <= slotBounds.y + slotBounds.h) {
    if (woodState.count > 0) {
      woodState.count -= 1;
      coinState.count += 1;
    }
    return;
  }
  if (cx >= bounds.x && cx <= bounds.x + bounds.w && cy >= bounds.y && cy <= bounds.y + bounds.h) {
    inventoryOpen = false;
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "a") inputState.left = true;
  if (event.key.toLowerCase() === "d") inputState.right = true;
  if (event.key.toLowerCase() === "w") inputState.up = true;
  if (event.key.toLowerCase() === "s") {
    inputState.down = true;
    if (inventoryOpen) {
      skinTabState.open = !skinTabState.open;
    }
  }
  if (event.key.toLowerCase() === "t") {
    loadSkin("teto");
  }
  if (event.key.toLowerCase() === "r") resetPlayer();
  if (event.key.toLowerCase() === "e") {
    inventoryOpen = !inventoryOpen;
    if (inventoryOpen) {
      inventoryCursor.x = WORLD.width / 2;
      inventoryCursor.y = WORLD.height / 2;
      if (!pointerLocked) {
        canvas.requestPointerLock({ unadjustedMovement: true });
      }
    }
    if (!inventoryOpen) {
      shopState.open = false;
      skinTabState.open = false;
    }
  }
  if (gameState === "title") {
    if (event.key === "1") beginMapSelect("TTM");
    if (event.key === "2") beginMapSelect("TTC");
  } else if (gameState === "mapSelect") {
    if (event.key === "1") selectMap("grassland");
    if (event.key === "2") selectMap("beach");
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key.toLowerCase() === "a") inputState.left = false;
  if (event.key.toLowerCase() === "d") inputState.right = false;
  if (event.key.toLowerCase() === "w") inputState.up = false;
  if (event.key.toLowerCase() === "s") inputState.down = false;
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

function beginMapSelect(mode) {
  pendingMode = mode;
  gameState = "mapSelect";
}

function selectMap(mapId) {
  if (!MAPS[mapId]) return;
  currentMap = mapId;
  gameState = "loading";
  pendingStart = true;
  loadMapAssets(mapId);
  maybeStart();
}

function startGame(mode) {
  gameMode = mode;
  gameState = "play";
  inventoryOpen = false;
  resetPlayer();
  if (document.fullscreenElement !== document.documentElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
  canvas.requestPointerLock({ unadjustedMovement: true });
}

frogImage.onload = () => {
  frogSolidPixels = buildSolidPixelMask(frogImage);
  updateSkinScale();
  rebuildFrogRenderData();
  rebuildFrogPartsData();
};
frogOutlineImage.onload = () => {
  rebuildFrogRenderData();
  rebuildFrogPartsData();
};
frogPartsImage.onload = () => {
  rebuildFrogPartsData();
};
tetoSizeImage.onload = () => {
  tetoSize.w = tetoSizeImage.width;
  tetoSize.h = tetoSizeImage.height;
  updateSkinScale();
};


function allForegroundImagesLoaded() {
  if (!foregroundImage.complete) return false;
  return foregroundLowerImages.every((img) => img.complete);
}

function maybeStart() {
  if (!pendingStart || !currentMap) return;
  if (
    !frogImage.complete ||
    !bg1Image.complete ||
    !bg2Image.complete
  )
    return;
  if (MAPS[currentMap].hasBg1Lower && !bg1LowerImage.complete) return;
  if (MAPS[currentMap].hasClouds && (!cloudImages[0].complete || !cloudImages[1].complete)) return;
  if (enableMiddleground && MAPS[currentMap].hasMiddleground && !middlegroundImage.complete) return;
  if (!tree1Image.complete || !tree2Image.complete || !woodImage.complete) return;
  if (!coinImage.complete) return;
  if (!asteroidImage.complete) return;
  if (!asteroidMask) {
    const info = buildImageMaskInfo(asteroidImage);
    asteroidMask = info.mask;
    asteroidWidth = info.width;
    asteroidHeight = info.height;
  }
  if (!frogPartsImage.complete) return;
  if (!inventoryCursorImage.complete) {
    return;
  }
  if (!allForegroundImagesLoaded()) return;
  if (!frogSolidPixels || !frogOutlineImage.complete) return;
  if (!propTypes.tree1.mask || !propTypes.tree2.mask) return;
  if (!frogBaseImageData || !frogSquishMap) {
    rebuildFrogRenderData();
  }
  if (!frogPartsMap || !frogParts || !frogPartsCollisionMap || !frogPartsCollision || !frogPartsRenderToCollision) {
    rebuildFrogPartsData();
  }
  buildForegroundLayers();
  ensureAsteroids();
  spawnProps();
  handleResize();
  resetPlayer();
  pendingStart = false;
  startGame(pendingMode);
}

frogImage.addEventListener("load", maybeStart);
frogOutlineImage.addEventListener("load", maybeStart);
frogPartsImage.addEventListener("load", maybeStart);
bg1Image.addEventListener("load", maybeStart);
bg1LowerImage.addEventListener("load", maybeStart);
middlegroundImage.addEventListener("load", maybeStart);
bg2Image.addEventListener("load", maybeStart);
for (const img of cloudImages) {
  img.addEventListener("load", maybeStart);
}
earthImage.addEventListener("load", maybeStart);
asteroidImage.addEventListener("load", maybeStart);
titleBackgroundImage.addEventListener("load", maybeStart);
asteroidImage.onload = () => {
  const info = buildImageMaskInfo(asteroidImage);
  asteroidMask = info.mask;
  asteroidWidth = info.width;
  asteroidHeight = info.height;
};
tree1Image.addEventListener("load", maybeStart);
tree2Image.addEventListener("load", maybeStart);
woodImage.addEventListener("load", maybeStart);
inventoryBackgroundImage.addEventListener("load", maybeStart);
inventorySlotImage.addEventListener("load", maybeStart);
inventoryExitImage.addEventListener("load", maybeStart);
inventoryCursorImage.addEventListener("load", maybeStart);
foregroundImage.addEventListener("load", maybeStart);
coinImage.addEventListener("load", maybeStart);
for (const img of foregroundLowerImages) {
  img.addEventListener("load", maybeStart);
}
maybeStart();
requestAnimationFrame(frame);
