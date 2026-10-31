const canvas = document.getElementById("zooMap");
const ctx = canvas.getContext("2d");

// Size of the whole map drawing area (in map units)
const MAP_WIDTH = 950;
const MAP_HEIGHT = 1300;

// VIEW BOX: the part of the map that is scaled to fit the screen.
// It is bigger than the path on purpose: there is free grass space
//   ~90 above the top of the path, ~90 below the bottom, ~115 right of the right end
// so you have room for buildings, boards and placeholders there.
// Everything outside the view box is just grass.
const VIEW_X = 50;
const VIEW_Y = 0;
const VIEW_W = 860;     // view box covers x = 50 ... 910
const VIEW_H = 1285;    // view box covers y = 0 ... 1285

// Colors
const GRASS_COLOR = "#8fbd75";
const PATH_COLOR = "#e0cfa9";      // base concrete color (also used if tiles fail to load)
const ROUTE_COLOR = "#168bff";

// ---------- Tile settings (all sizes are in map units) ----------
const TILE_W = 24;                 // width of one tile
const TILE_H = 16;                 // height of one tile
const TILE_COLS = 10;              // tiles across in one repeating block
const TILE_ROWS = 10;              // tiles down in one repeating block
const GROUT_WIDTH = 1.2;           // thickness of the grout lines
const GROUT_COLOR = "#c9b891";     // grout: only slightly darker than the tiles
const TILE_BASE = { r: 224, g: 207, b: 169 };   // same beige as PATH_COLOR
const TILE_VARIATION = 7;          // +/- brightness change per tile (keep small!)
const TILE_RESOLUTION = 6;         // pixels per map unit in the tile image (keeps it sharp)

// ---------- Brick settings for the ticket path ----------
const BRICK_W = 20;                // width of one brick
const BRICK_H = 10;                // height of one brick
const BRICK_COLS = 6;              // bricks across in one repeating block
const BRICK_ROWS = 8;              // brick rows in one repeating block (keep it even)
const BRICK_BASE = { r: 214, g: 140, b: 98 };   // warm red-brown
const BRICK_VARIATION = 10;        // +/- brightness change per brick
const MORTAR_COLOR = "#ead9c0";    // light gaps between bricks
const MORTAR_WIDTH = 1.2;

// Soft shadow around the walkway
const SHADOW_COLOR = "rgba(0, 0, 0, 0.08)";     // one soft shadow layer
const SHADOW_SIZE = 6;                          // how far the shadow spreads outside the path

// Bridge colors and sizes
const DECK_COLOR_A = "#8a5c33";                 // wooden plank (light)
const DECK_COLOR_B = "#7f5430";                 // wooden plank (slightly darker)
const PLANK_SEAM_COLOR = "rgba(40, 20, 5, 0.35)"; // thin gap between planks
const RAIL_COLOR = "#4e3119";                   // railing bar
const POST_COLOR = "#2e1b0b";                   // railing posts
const PLANK_WIDTH = 10;   // width of one plank
const RAIL_HEIGHT = 4;    // thickness of the railing bar
const POST_SIZE = 6;      // size of each square post
const POST_GAPS = 8;      // number of equal gaps between posts on one railing

// Walking path rectangles (every road is 60 wide)
const pathRects = [
    { x: 115, y: 1140, w: 185, h: 60  },
    { x: 240, y: 880,  w: 60,  h: 320 },
    { x: 240, y: 880,  w: 220, h: 60  },   // <-- R3 (this one becomes the bridge)
    { x: 400, y: 620,  w: 60,  h: 320 },
    { x: 400, y: 620,  w: 270, h: 60  },
    { x: 610, y: 400,  w: 60,  h: 280 },
    { x: 610, y: 400,  w: 225, h: 60  },   // extended to reach the museum
    { x: 680, y: 180,  w: 60,  h: 280 }    // top starts lower: room for the Walk-in Aviary label
];

// Small side path to the ticket counter.
// It is a separate array because it is drawn with a different material (red-brown bricks).
const ticketPathRects = [
    { x: 725, y: 215, w: 100, h: 60 }
];

// The bridge uses R3 directly, so it always stays aligned with the path
const bridge = pathRects[2];

// Dotted routes. Each route is its own list of points
// (they run down the middle of the 60-wide roads).
const routes = [
    // Main route: bottom entrance up to the top
    [
        { x: 125, y: 1170 },
        { x: 270, y: 1170 },
        { x: 270, y: 910 },
        { x: 430, y: 910 },
        { x: 430, y: 650 },
        { x: 640, y: 650 },
        { x: 640, y: 430 },
        { x: 710, y: 430 },
        { x: 710, y: 180 }
    ],
    // Right-hand piece of the horizontal path, leading to the museum
    [
        { x: 710, y: 430 },
        { x: 812, y: 430 }
    ],
    // Short piece along the ticket path
    [
        { x: 710, y: 245 },
        { x: 812, y: 245 }
    ]
];

// ---------- Places (placeholders) ----------
// x, y = CENTER of the round badge, in map units (same numbers as pathRects).
// "id" links the place to its information card in data/places-data.js.
// Change x and y to move a place. "type" picks its icon and color:
//   "gate" = zoo entrance, "ticket" = ticket counter, "aviary" = bird,
//   "clock" = clock, "museum" = museum building
const places = [
    { id: "aviary", name: "Walk-in Aviary",  type: "aviary", x: 710, y: 75,  arrive: 135 },
    { id: "ticket", name: "Ticket Counter",  type: "ticket", x: 840, y: 245 },
    { id: "museum", name: "Museum",          type: "museum", x: 835, y: 430 },
    { id: "clock",  name: "Clock",           type: "clock",  x: 755, y: 567, arrive: 120 },
    { id: "gate",   name: "Zoo Entrance",    type: "gate",   x: 130, y: 1165 }
];

const PLACE_RADIUS = 32;                         // size of the round badge

// Label font. This is a "system font stack": the browser uses the first font
// that exists on the device, so the text looks clean on Windows, Mac, iPhone and Android
// without downloading anything.
const PLACE_FONT_FAMILY = '"Segoe UI", "SF Pro Rounded", "Trebuchet MS", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif';
const PLACE_FONT_SIZE = 21;
const PLACE_FONT = `700 ${PLACE_FONT_SIZE}px ${PLACE_FONT_FAMILY}`;
const PLACE_LETTER_SPACING = "0.6px";            // slightly airy letters
const PLACE_LINE_HEIGHT = 25;                    // distance between two lines of a label
const LABEL_PADDING_X = 14;                      // space left and right of the text
const LABEL_TEXT_COLOR = "#263238";              // soft dark slate (easier on the eyes than pure black)

// Color and icon-drawing function for each type of place
const placeStyles = {
    gate:   { color: "#c62828", icon: drawGateIcon },
    ticket: { color: "#f57c00", icon: drawTicketIcon },
    aviary: { color: "#8e24aa", icon: drawBirdIcon },
    clock:  { color: "#37474f", icon: drawClockIcon },
    museum: { color: "#00897b", icon: drawMuseumIcon }
};

// ---------- Arrival popup: only show after reaching a place ----------
const ARRIVAL_DISTANCE = 45; // visitor must reach the actual location area
let arrivedPlace = null;
let popupPlaceId = null;
let popupDismissedFor = null;

let dashOffset = 0;

// Where the map sits on the screen (set in resizeCanvas, used to find what was tapped)
let viewScale = 1;
let viewOffsetX = 0;
let viewOffsetY = 0;

// ---------- Tile pattern ----------

// A repeatable "random" number between 0 and 1.
// The same input always gives the same output, so the tiles never flicker.
function pseudoRandom(n) {
    const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
}

// Build the tile picture ONCE on a hidden (offscreen) canvas,
// then turn it into a pattern that can fill any shape.
function createTilePattern() {
    const tileCanvas = document.createElement("canvas");
    tileCanvas.width = TILE_COLS * TILE_W * TILE_RESOLUTION;
    tileCanvas.height = TILE_ROWS * TILE_H * TILE_RESOLUTION;

    const tctx = tileCanvas.getContext("2d");
    tctx.scale(TILE_RESOLUTION, TILE_RESOLUTION);   // draw in map units

    // 1. Fill everything with grout color (it shows through the gaps)
    tctx.fillStyle = GROUT_COLOR;
    tctx.fillRect(0, 0, TILE_COLS * TILE_W, TILE_ROWS * TILE_H);

    // 2. Draw each tile slightly smaller than its cell, leaving a grout gap
    for (let row = 0; row < TILE_ROWS; row++) {
        for (let col = 0; col < TILE_COLS; col++) {
            // each tile gets a slightly different brightness
            const change = (pseudoRandom(row * TILE_COLS + col) - 0.5) * 2 * TILE_VARIATION;
            const r = Math.round(TILE_BASE.r + change);
            const g = Math.round(TILE_BASE.g + change);
            const b = Math.round(TILE_BASE.b + change);

            const x = col * TILE_W + GROUT_WIDTH / 2;
            const y = row * TILE_H + GROUT_WIDTH / 2;
            const w = TILE_W - GROUT_WIDTH;
            const h = TILE_H - GROUT_WIDTH;

            tctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            tctx.fillRect(x, y, w, h);

            // very faint light edge on top of each tile
            tctx.fillStyle = "rgba(255, 255, 255, 0.18)";
            tctx.fillRect(x, y, w, 0.8);
        }
    }

    // 3. Turn the picture into a repeating pattern
    const pattern = ctx.createPattern(tileCanvas, "repeat");

    // The tile picture is TILE_RESOLUTION times bigger than map units,
    // so shrink it back. Now 1 tile = TILE_W x TILE_H map units,
    // and it scales with the map when the screen size changes.
    pattern.setTransform(new DOMMatrix().scale(1 / TILE_RESOLUTION));

    return pattern;
}

const tilePattern = createTilePattern();

// Same idea as the tile pattern, but red-brown bricks laid in a brick-wall
// layout (every second row is shifted by half a brick).
function createBrickPattern() {
    const brickCanvas = document.createElement("canvas");
    brickCanvas.width = BRICK_COLS * BRICK_W * TILE_RESOLUTION;
    brickCanvas.height = BRICK_ROWS * BRICK_H * TILE_RESOLUTION;

    const bctx = brickCanvas.getContext("2d");
    bctx.scale(TILE_RESOLUTION, TILE_RESOLUTION);

    // light mortar color fills everything first
    bctx.fillStyle = MORTAR_COLOR;
    bctx.fillRect(0, 0, BRICK_COLS * BRICK_W, BRICK_ROWS * BRICK_H);

    for (let row = 0; row < BRICK_ROWS; row++) {
        const shift = (row % 2) * BRICK_W / 2;   // odd rows are shifted

        for (let col = -1; col <= BRICK_COLS; col++) {
            // wrap the column number so the pattern repeats without a visible seam
            const wrappedCol = ((col % BRICK_COLS) + BRICK_COLS) % BRICK_COLS;
            const change = (pseudoRandom(100 + row * BRICK_COLS + wrappedCol) - 0.5) * 2 * BRICK_VARIATION;

            const r = Math.round(BRICK_BASE.r + change);
            const g = Math.round(BRICK_BASE.g + change);
            const b = Math.round(BRICK_BASE.b + change);

            bctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            bctx.fillRect(
                col * BRICK_W + shift + MORTAR_WIDTH / 2,
                row * BRICK_H + MORTAR_WIDTH / 2,
                BRICK_W - MORTAR_WIDTH,
                BRICK_H - MORTAR_WIDTH
            );
        }
    }

    const pattern = ctx.createPattern(brickCanvas, "repeat");
    pattern.setTransform(new DOMMatrix().scale(1 / TILE_RESOLUTION));
    return pattern;
}

const brickPattern = createBrickPattern();

// Full-screen canvas: the map is scaled to fit the screen and centered
function resizeCanvas() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;

    // Canvas covers the entire screen
    canvas.style.width = `${screenWidth}px`;
    canvas.style.height = `${screenHeight}px`;
    canvas.width = Math.round(screenWidth * pixelRatio);
    canvas.height = Math.round(screenHeight * pixelRatio);

    // Scale so the whole view box fits the screen, then center it
    const scale = Math.min(screenWidth / VIEW_W, screenHeight / VIEW_H);
    const offsetX = (screenWidth - VIEW_W * scale) / 2 - VIEW_X * scale;
    const offsetY = (screenHeight - VIEW_H * scale) / 2 - VIEW_Y * scale;

    ctx.setTransform(
        pixelRatio * scale, 0,
        0, pixelRatio * scale,
        pixelRatio * offsetX, pixelRatio * offsetY
    );

    // remember the placement (in screen pixels) for tap detection
    viewScale = scale;
    viewOffsetX = offsetX;
    viewOffsetY = offsetY;

    drawMap();
}

// Draw green grass over the whole screen
function drawGrass() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);   // ignore the map scaling
    ctx.fillStyle = GRASS_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
}

// ---------- Walking paths ----------

// Soft shadow around a group of path rectangles so the walkway looks slightly raised.
// Each layer draws ALL the rectangles as ONE shape, so where rectangles
// overlap the shadow is not doubled. Three thin transparent layers stack up:
// dark near the edge, light farther away. The path is drawn on top afterwards,
// so only the part of the shadow that falls on the grass stays visible.
function drawShadow(rects) {
    ctx.fillStyle = SHADOW_COLOR;

    for (let layer = 1; layer <= 3; layer++) {
        const s = SHADOW_SIZE * layer / 3;

        ctx.beginPath();
        for (const r of rects) {
            ctx.rect(r.x - s, r.y - s, r.w + 2 * s, r.h + 2 * s);
        }
        ctx.fill();
    }
}

// Fill a group of rectangles with a pattern (or color).
// Clip: all rectangles become ONE shape, and anything drawn after ctx.clip()
// only appears INSIDE that shape, so it can never spill onto the grass.
function fillRects(rects, fillStyle) {
    ctx.save();

    ctx.beginPath();
    for (const r of rects) {
        ctx.rect(r.x, r.y, r.w, r.h);
    }
    ctx.clip();

    ctx.fillStyle = fillStyle;
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    ctx.restore();
}

// Draw the walking paths
function drawPaths() {
    drawShadow(pathRects);
    drawShadow(ticketPathRects);

    // 1. ticket path (bricks) first...
    fillRects(ticketPathRects, brickPattern || "#d68c62");
    // 2. ...then the main tiled path on top, so the joint between them is clean
    fillRects(pathRects, tilePattern || PATH_COLOR);
}

// ---------- Bridge (R3) ----------

// Wooden deck made of vertical planks (planks lie across the walking direction)
function drawBridgeDeck() {
    let plankNumber = 0;

    for (let px = bridge.x; px < bridge.x + bridge.w; px += PLANK_WIDTH) {
        // alternate two browns so the planks are easy to see
        ctx.fillStyle = (plankNumber % 2 === 0) ? DECK_COLOR_A : DECK_COLOR_B;
        ctx.fillRect(px, bridge.y, PLANK_WIDTH, bridge.h);

        // thin dark line at the start of each plank
        ctx.fillStyle = PLANK_SEAM_COLOR;
        ctx.fillRect(px, bridge.y, 1, bridge.h);

        plankNumber++;
    }
}

// One railing: a long bar from xStart to xEnd with evenly spaced posts on top
function drawRailing(xStart, xEnd, railY) {
    const length = xEnd - xStart;

    // the long bar
    ctx.fillStyle = RAIL_COLOR;
    ctx.fillRect(xStart, railY, length, RAIL_HEIGHT);

    // posts: first post at the start, last post at the end, equal gaps between
    const spacing = (length - POST_SIZE) / POST_GAPS;
    const postY = railY - (POST_SIZE - RAIL_HEIGHT) / 2;   // centers the post on the bar

    ctx.fillStyle = POST_COLOR;
    for (let i = 0; i <= POST_GAPS; i++) {
        ctx.fillRect(xStart + i * spacing, postY, POST_SIZE, POST_SIZE);
    }
}

// Draw the whole bridge: deck, then both railings
// (its shadow is part of drawShadow, so it matches the rest of the walkway)
function drawBridge() {
    drawBridgeDeck();

    // Railings leave the two corner squares open, because that is where
    // the walking path enters and leaves the bridge.
    // Top railing: from the left end to the start of the right-hand corner
    drawRailing(bridge.x, bridge.x + bridge.w - bridge.h, bridge.y + 1);
    // Bottom railing: from the end of the left-hand corner to the right end
    drawRailing(bridge.x + bridge.h, bridge.x + bridge.w, bridge.y + bridge.h - RAIL_HEIGHT - 1);
}

// ---------- Places: icons ----------
// Each icon is drawn around (0, 0) in a badge of radius 26.
// drawPlace() moves and scales the canvas first, so the icons scale with the map.

// Zoo entrance: an arched gate with bars
function drawGateIcon(color, t) {
    ctx.strokeStyle = "#fff";
    ctx.lineCap = "round";

    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -1, 12, Math.PI, 0);          // arch
    ctx.moveTo(-12, -1); ctx.lineTo(-12, 13); // left post
    ctx.moveTo(12, -1);  ctx.lineTo(12, 13);  // right post
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const x of [-6, 0, 6]) {            // gate bars
        ctx.moveTo(x, -10);
        ctx.lineTo(x, 13);
    }
    ctx.stroke();
}

// Ticket counter: a ticket with side notches and a tear line
function drawTicketIcon(color, t) {
    ctx.rotate(-0.25);

    ctx.fillStyle = "#fff";
    ctx.fillRect(-15, -9, 30, 18);

    ctx.fillStyle = color;                   // notches cut into the sides
    ctx.beginPath(); ctx.arc(-15, 0, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(15, 0, 3.5, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2.5, 2.5]);             // dashed tear line
    ctx.beginPath(); ctx.moveTo(5, -8); ctx.lineTo(5, 8); ctx.stroke();
    ctx.setLineDash([]);

    ctx.lineWidth = 2;                       // text lines on the ticket
    ctx.beginPath();
    ctx.moveTo(-10, -3); ctx.lineTo(0, -3);
    ctx.moveTo(-10, 3);  ctx.lineTo(-2, 3);
    ctx.stroke();

    ctx.beginPath(); ctx.arc(10, 0, 2.5, 0, Math.PI * 2); ctx.fill();
}

// Aviary: a bird whose wing flaps
function drawBirdIcon(color, t) {
    ctx.fillStyle = "#fff";

    // body
    ctx.beginPath(); ctx.ellipse(-1, 3, 11, 6.5, -0.15, 0, Math.PI * 2); ctx.fill();
    // tail
    ctx.beginPath(); ctx.moveTo(-10, 3); ctx.lineTo(-19, -1); ctx.lineTo(-18, 8); ctx.closePath(); ctx.fill();
    // head
    ctx.beginPath(); ctx.arc(9, -4, 5, 0, Math.PI * 2); ctx.fill();
    // beak
    ctx.fillStyle = "#ffd54f";
    ctx.beginPath(); ctx.moveTo(13.5, -5); ctx.lineTo(20, -3); ctx.lineTo(13.5, -1.5); ctx.closePath(); ctx.fill();
    // eye
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(10.5, -5.5, 1.3, 0, Math.PI * 2); ctx.fill();

    // wing: rotates up and down around the shoulder
    const flap = Math.sin(t * 7) * 0.45;
    ctx.save();
    ctx.translate(4, 1);
    ctx.rotate(flap);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-6, -17, -21, -15);
    ctx.quadraticCurveTo(-13, -6, -10, 3);
    ctx.closePath();
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
}

// Clock: a real clock face that shows the current time
function drawClockIcon(color, t) {
    // face
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();

    // 12 tick marks
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.lineCap = "round";
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const inner = (i % 3 === 0) ? 9 : 11;   // longer marks at 12, 3, 6, 9
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        ctx.lineTo(Math.cos(angle) * 13.5, Math.sin(angle) * 13.5);
        ctx.stroke();
    }

    // current time
    const now = new Date();
    const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
    const minutes = now.getMinutes() + seconds / 60;
    const hours = (now.getHours() % 12) + minutes / 60;

    drawClockHand(hours / 12, 7, 2.4, color);      // hour hand
    drawClockHand(minutes / 60, 10.5, 1.8, color); // minute hand
    drawClockHand(seconds / 60, 11.5, 1, "#e53935"); // second hand

    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, Math.PI * 2); ctx.fill();
}

// fraction: 0 = pointing at 12, 0.25 = at 3, 0.5 = at 6 ...
function drawClockHand(fraction, length, width, color) {
    const angle = fraction * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
    ctx.stroke();
}

// Museum: a building with a triangle roof, columns and steps
function drawMuseumIcon(color, t) {
    ctx.fillStyle = "#fff";

    // triangle roof
    ctx.beginPath(); ctx.moveTo(-17, -3); ctx.lineTo(0, -15); ctx.lineTo(17, -3); ctx.closePath(); ctx.fill();
    // beam under the roof
    ctx.fillRect(-17, -2, 34, 3);
    // 4 columns
    for (let i = 0; i < 4; i++) {
        ctx.fillRect(-12 + i * 8 - 2, 2, 4, 9);
    }
    // steps
    ctx.fillRect(-17, 11, 34, 3.5);

    // small round window in the roof
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, -6.5, 1.8, 0, Math.PI * 2); ctx.fill();
}

// ---------- Places: badge, animation and name label ----------

// Rounded rectangle path (used for the name label)
function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// Draw one place: pulsing ring, floating badge with icon, and a name label
function drawPlace(place, index, t) {
    const style = placeStyles[place.type];
    const R = PLACE_RADIUS;

    // Animation: the badge floats up and down; the ring grows and fades out
    const bob = Math.sin(t * 2.2 + index * 1.4) * 3;
    const phase = (t * 0.7 + index * 0.23) % 1;
    const cx = place.x;
    const cy = place.y + bob;

    // pulsing ring
    ctx.strokeStyle = style.color;
    ctx.globalAlpha = (1 - phase) * 0.5;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, R + 4 + phase * 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // golden glow only when the visitor has reached the location (never Ticket Counter)
    if (hasReachedPlace(place)) {
        ctx.strokeStyle = "#ffd54f";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(cx, cy, R + 9, 0, Math.PI * 2);
        ctx.stroke();
    }

    // soft shadow, white ring, colored badge
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.beginPath(); ctx.arc(cx, cy + 4, R + 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(cx, cy, R + 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = style.color;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    // icon (moved to the badge center and scaled to the badge size)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(R / 26, R / 26);
    style.icon(style.color, t);
    ctx.restore();

    // name label under the badge (long names split into two lines)
    const lines = place.name.split(" ");
    ctx.font = PLACE_FONT;
    if ("letterSpacing" in ctx) ctx.letterSpacing = PLACE_LETTER_SPACING;

    let widest = 0;
    for (const line of lines) {
        widest = Math.max(widest, ctx.measureText(line).width);
    }
    const labelW = widest + LABEL_PADDING_X * 2;
    const labelH = lines.length * PLACE_LINE_HEIGHT + 12;
    const labelX = place.x - labelW / 2;
    const labelY = place.y + R + 14;

    // soft shadow under the label, then the white label with a colored border
    roundedRect(labelX, labelY + 3, labelW, labelH, 10);
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.fill();

    roundedRect(labelX, labelY, labelW, labelH, 10);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = style.color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // tap area = a box around the badge and the label (a little bigger, easier for fingers)
    const left = Math.min(place.x - R - 4, labelX) - 6;
    const right = Math.max(place.x + R + 4, labelX + labelW) + 6;
    place.hitBox = {
        x: left,
        y: place.y - R - 10,
        w: right - left,
        h: labelY + labelH + 6 - (place.y - R - 10)
    };

    // the name itself
    ctx.fillStyle = LABEL_TEXT_COLOR;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], place.x, labelY + 6 + PLACE_LINE_HEIGHT * (i + 0.5));
    }

    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
}

// Draw all places
function drawPlaces() {
    const t = performance.now() / 1000;   // time in seconds, drives the animations

    ctx.save();
    for (let i = 0; i < places.length; i++) {
        drawPlace(places[i], i, t);
    }
    ctx.restore();
}

// ---------- Nearby place popup ----------
// Build the popup in JavaScript so index.html does not need to be changed.
const proximityPopup = document.createElement("div");
proximityPopup.id = "proximityPopup";
proximityPopup.setAttribute("role", "status");
proximityPopup.innerHTML = '<span id="proximityPopupText"></span><button id="proximityPopupButton" type="button">View Details</button>';
Object.assign(proximityPopup.style, {
    position: "fixed",
    left: "50%",
    top: "18px",
    transform: "translateX(-50%)",
    zIndex: "1000",
    display: "none",
    alignItems: "center",
    gap: "12px",
    maxWidth: "calc(100vw - 28px)",
    padding: "12px 14px",
    borderRadius: "14px",
    background: "rgba(255,255,255,0.97)",
    color: "#263238",
    boxShadow: "0 5px 22px rgba(0,0,0,0.2)",
    font: '600 14px/1.35 system-ui, -apple-system, "Segoe UI", sans-serif'
});
const proximityPopupText = proximityPopup.querySelector("#proximityPopupText");
const proximityPopupButton = proximityPopup.querySelector("#proximityPopupButton");
Object.assign(proximityPopupButton.style, {
    border: "0",
    borderRadius: "9px",
    padding: "9px 12px",
    background: "#168bff",
    color: "white",
    font: "700 14px system-ui, sans-serif",
    cursor: "pointer",
    whiteSpace: "nowrap"
});
document.body.appendChild(proximityPopup);

function hideProximityPopup() {
    proximityPopup.style.display = "none";
    popupPlaceId = null;
}

proximityPopupButton.addEventListener("click", function () {
    if (!popupPlaceId || typeof openPlaceCard !== "function") return;
    const id = popupPlaceId;
    popupDismissedFor = id;
    hideProximityPopup();
    openPlaceCard(id);
});

// ---------- Dotted route ----------

// Draw blue dotted navigation routes
function drawDottedRoute() {
    ctx.save();

    ctx.strokeStyle = ROUTE_COLOR;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash([2, 13]);
    ctx.lineDashOffset = -dashOffset;

    for (const points of routes) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }

        ctx.stroke();
    }

    ctx.restore();
}

// ======================================================================
// VISITOR POINTER
// ======================================================================

// ---------- Visitor pointer settings ----------
const VISITOR_START = { x: 800, y: 245 };   // ENTRY POINT: the ticket path, next to the Ticket Counter
const VISITOR_RADIUS = 15;                  // size of the pointer (also its collision circle)
const VISITOR_SPEED = 140;                  // map units per second
const VISITOR_COLOR = "#168bff";

// The visitor may walk on every path rectangle (the bridge is R3, so it is included)
const walkableRects = pathRects.concat(ticketPathRects);

// heading = angle the pointer faces (0 = right, PI = left)
const visitor = { x: VISITOR_START.x, y: VISITOR_START.y, heading: Math.PI };

// ---------- Collision (boundary / clipping test) ----------
// Is the point (px, py) inside at least one walkable rectangle?
function pointOnPath(px, py) {
    for (const r of walkableRects) {
        if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) {
            return true;
        }
    }
    return false;
}

// The visitor is a circle. It may stand at (x, y) only if the center AND
// 8 points around its edge are all on the path. Testing against ALL rectangles
// together means the pointer can move smoothly through corners and joints.
function canWalk(x, y) {
    if (!pointOnPath(x, y)) return false;

    for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        if (!pointOnPath(x + Math.cos(a) * VISITOR_RADIUS, y + Math.sin(a) * VISITOR_RADIUS)) {
            return false;
        }
    }
    return true;
}

// ---------- Controls: keyboard (PC) ----------
const keys = {};
const MOVE_KEYS = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];

window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (MOVE_KEYS.includes(k)) {
        keys[k] = true;
        e.preventDefault();
    }
});
window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
});
window.addEventListener("blur", () => {
    for (const k in keys) keys[k] = false;     // forget keys if the tab loses focus
});

// ---------- Controls: joystick (mobile + tablet, right side) ----------
const JOY_SIZE = 130;          // diameter of the joystick base (screen pixels)
const JOY_DEAD_ZONE = 0.15;    // tiny thumb movements are ignored
const joy = { x: 0, y: 0 };    // joystick direction, each from -1 to 1

function createJoystick() {
    // The joystick is always created, but only SHOWN on phones / tablets
    // (PC users use WASD). It re-checks when the screen changes, so it also appears
    // when you switch to a phone in the browser's device toolbar.
    let sawTouch = false;

    const knobSize = JOY_SIZE * 0.45;
    const maxDist = JOY_SIZE * 0.3;           // how far the knob can move from the center

    // z-index 5 keeps the joystick BELOW the information card (the card uses 10)
    const base = document.createElement("div");
    base.style.cssText =
        "position:fixed; z-index:5; border-radius:50%;" +
        `right:env(safe-area-inset-right, 0px);` +
        `bottom:calc(28px + env(safe-area-inset-bottom, 0px));` +
        `width:${JOY_SIZE}px; height:${JOY_SIZE}px;` +
        "opacity:0.45; background:rgba(255,255,255,0.35); border:3px solid rgba(255,255,255,0.85);" +
        "box-shadow:0 2px 10px rgba(0,0,0,0.25);" +
        "touch-action:none; user-select:none; -webkit-user-select:none; -webkit-touch-callout:none;";

    const knob = document.createElement("div");
    knob.style.cssText =
        "position:absolute; left:50%; top:50%; border-radius:50%; pointer-events:none;" +
        `width:${knobSize}px; height:${knobSize}px;` +
        `margin:${-knobSize / 2}px 0 0 ${-knobSize / 2}px;` +
        "background:rgba(22,139,255,0.92); border:3px solid #fff;" +
        "box-shadow:0 2px 6px rgba(0,0,0,0.3);";

    base.appendChild(knob);
    document.body.appendChild(base);

    // Show the joystick ONLY on phone / tablet type devices.
    // A normal PC (mouse + keyboard) never matches, even if the window is narrow.
    function wantJoystick() {
        const coarse = window.matchMedia("(pointer: coarse)").matches;   // finger is the main pointer
        const noHover = window.matchMedia("(hover: none)").matches;      // no mouse hover (phones, tablets)
        const mobileAgent = typeof navigator !== "undefined" &&
                            /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
        return coarse || noHover || mobileAgent || sawTouch;
    }

    function updateJoystickVisibility() {
        base.style.display = wantJoystick() ? "block" : "none";
        if (base.style.display === "none") { joy.x = 0; joy.y = 0; }
    }

    updateJoystickVisibility();
    window.addEventListener("resize", updateJoystickVisibility);
    for (const q of ["(pointer: coarse)", "(hover: none)"]) {
        const query = window.matchMedia(q);
        if (query.addEventListener) query.addEventListener("change", updateJoystickVisibility);
    }
    window.addEventListener("touchstart", () => {
        sawTouch = true;
        updateJoystickVisibility();
    }, { passive: true, once: true });

    let activePointer = null;

    function moveKnob(e) {
        const rect = base.getBoundingClientRect();
        let dx = e.clientX - (rect.left + rect.width / 2);
        let dy = e.clientY - (rect.top + rect.height / 2);

        const dist = Math.hypot(dx, dy);
        if (dist > maxDist) {                  // keep the knob inside the base
            dx *= maxDist / dist;
            dy *= maxDist / dist;
        }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;

        const nx = dx / maxDist;
        const ny = dy / maxDist;
        if (Math.hypot(nx, ny) < JOY_DEAD_ZONE) {
            joy.x = 0; joy.y = 0;
        } else {
            joy.x = nx; joy.y = ny;
        }
    }

    function releaseKnob() {
        activePointer = null;
        knob.style.transform = "translate(0px, 0px)";
        joy.x = 0; joy.y = 0;
    }

    base.addEventListener("pointerdown", (e) => {
        activePointer = e.pointerId;
        base.setPointerCapture(e.pointerId);
        moveKnob(e);
        e.preventDefault();
    });
    base.addEventListener("pointermove", (e) => {
        if (e.pointerId === activePointer) moveKnob(e);
    });
    base.addEventListener("pointerup", releaseKnob);
    base.addEventListener("pointercancel", releaseKnob);
}

createJoystick();

// ---------- 2D transformation matrices (homogeneous coordinates) ----------
// A point (x, y) is written as the column (x, y, 1), so translation, rotation and
// scaling can ALL be done by multiplying with a 3x3 matrix.
//
//   Translation T(tx, ty)      Rotation R(a)               Scaling S(sx, sy)
//   | 1  0  tx |               | cos a  -sin a  0 |        | sx  0   0 |
//   | 0  1  ty |               | sin a   cos a  0 |        | 0   sy  0 |
//   | 0  0  1  |               | 0       0      1 |        | 0   0   1 |
//
// Multiplying out gives the formulas from class:
//   translation:  x' = x + tx          y' = y + ty
//   rotation:     x' = x cos a - y sin a      y' = x sin a + y cos a
//   scaling:      x' = x * sx          y' = y * sy

function translationMatrix(tx, ty) {
    return [[1, 0, tx],
            [0, 1, ty],
            [0, 0, 1]];
}

function rotationMatrix(angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return [[c, -s, 0],
            [s,  c, 0],
            [0,  0, 1]];
}

function scalingMatrix(sx, sy) {
    return [[sx, 0,  0],
            [0,  sy, 0],
            [0,  0,  1]];
}

// Matrix x matrix (used to combine several transformations into one)
function multiplyMatrices(A, B) {
    const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            for (let k = 0; k < 3; k++) {
                C[i][j] += A[i][k] * B[k][j];
            }
        }
    }
    return C;
}

// Matrix x point: returns the transformed point (x', y')
function transformPoint(M, p) {
    return {
        x: M[0][0] * p.x + M[0][1] * p.y + M[0][2],
        y: M[1][0] * p.x + M[1][1] * p.y + M[1][2]
    };
}

// ---------- Move the visitor ----------
function updateVisitor(dt) {
    // While an information card is open the visitor stands still
    if (typeof isPlaceCardOpen === "function" && isPlaceCardOpen()) return;

    // 1. read the controls (y grows downward on the screen)
    let ix = 0, iy = 0;
    if (keys["a"] || keys["arrowleft"])  ix -= 1;
    if (keys["d"] || keys["arrowright"]) ix += 1;
    if (keys["w"] || keys["arrowup"])    iy -= 1;
    if (keys["s"] || keys["arrowdown"])  iy += 1;
    ix += joy.x;
    iy += joy.y;

    const len = Math.hypot(ix, iy);
    if (len < 0.01) return;                    // not moving
    if (len > 1) { ix /= len; iy /= len; }     // diagonal is not faster

    // 2. TRANSLATION:  x' = x + tx,  y' = y + ty   (done with the matrix T(tx, ty)).
    //    X and Y are tried separately, so the pointer slides along walls
    //    instead of getting stuck.
    const step = VISITOR_SPEED * dt;
    const movedX = transformPoint(translationMatrix(ix * step, 0), visitor);
    if (canWalk(movedX.x, visitor.y)) visitor.x = movedX.x;
    const movedY = transformPoint(translationMatrix(0, iy * step), visitor);
    if (canWalk(visitor.x, movedY.y)) visitor.y = movedY.y;

    // 3. ROTATION: turn smoothly to face the direction of the controls
    const target = Math.atan2(iy, ix);
    let diff = target - visitor.heading;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));   // shortest way round (-PI ... PI)
    visitor.heading += diff * Math.min(1, dt * 14);
}

// ---------- Draw the visitor pointer ----------
// A blue "you are here" dot with a white arrow that shows the facing direction.
// The pointer is designed around (0, 0) facing right. Every point of its arrow
// and view cone is moved to the map with ONE composite matrix:
//
//        M = T(x, y) * R(heading) * S(k, k)
//
// (read from the right: first SCALE it, then ROTATE it, then TRANSLATE it).
function fillPolygon(points, fill) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
}

function drawVisitor() {
    const t = performance.now() / 1000;
    const pulse = (t * 0.9) % 1;
    const k = VISITOR_RADIUS / 11;             // the design below is made for radius 11

    // the composite matrix
    const M = multiplyMatrices(
        translationMatrix(visitor.x, visitor.y),
        multiplyMatrices(rotationMatrix(visitor.heading), scalingMatrix(k, k))
    );
    const toMap = (x, y) => transformPoint(M, { x: x, y: y });   // design point -> map point
    const c = toMap(0, 0);                                        // pointer center on the map

    ctx.save();

    // pulsing ring (a circle looks the same when rotated, so it only needs the position)
    ctx.strokeStyle = VISITOR_COLOR;
    ctx.globalAlpha = (1 - pulse) * 0.5;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(c.x, c.y, VISITOR_RADIUS + 4 + pulse * 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // soft view cone in front of the pointer: a wedge made of points,
    // every point goes through the matrix
    const cone = [toMap(0, 0)];
    for (let i = 0; i <= 12; i++) {
        const a = -0.55 + (1.1 * i) / 12;
        cone.push(toMap(Math.cos(a) * 38, Math.sin(a) * 38));
    }
    const fade = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 38 * k);
    fade.addColorStop(0, "rgba(22, 139, 255, 0.45)");
    fade.addColorStop(1, "rgba(22, 139, 255, 0)");
    fillPolygon(cone, fade);

    // shadow, white ring, blue dot
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.beginPath(); ctx.arc(c.x, c.y + 2, VISITOR_RADIUS + 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(c.x, c.y, VISITOR_RADIUS + 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = VISITOR_COLOR;
    ctx.beginPath(); ctx.arc(c.x, c.y, VISITOR_RADIUS - 1, 0, Math.PI * 2); ctx.fill();

    // white arrow showing the facing direction (4 points through the matrix)
    fillPolygon([toMap(6.5, 0), toMap(-3.5, -5.5), toMap(-1, 0), toMap(-3.5, 5.5)], "#fff");

    ctx.restore();
}

// ======================================================================
// ARRIVAL: show a prompt only when the visitor reaches a location.
// The full information card opens only when View Details is clicked.
// Ticket Counter is intentionally excluded.
// ======================================================================

function distanceToPlace(place) {
    return Math.hypot(place.x - visitor.x, place.y - visitor.y);
}

function hasReachedPlace(place) {
    return place.id !== "ticket" && distanceToPlace(place) <= (place.arrive || ARRIVAL_DISTANCE);
}

function findReachedPlace() {
    let best = null;
    let bestDistance = Infinity;

    for (const place of places) {
        if (place.id === "ticket") continue;

        const distance = distanceToPlace(place);
        if (hasReachedPlace(place) && distance < bestDistance) {
            best = place;
            bestDistance = distance;
        }
    }
    return best;
}

// Called each frame. No notification is shown at the nearby distance.
// Reaching a place shows the View Details prompt; it never opens the card itself.
function checkNearbyPlace() {
    arrivedPlace = findReachedPlace();

    if (!arrivedPlace) {
        hideProximityPopup();
        popupDismissedFor = null;
        return;
    }

    if (typeof isPlaceCardOpen === "function" && isPlaceCardOpen()) {
        hideProximityPopup();
        return;
    }

    if (popupDismissedFor === arrivedPlace.id) {
        hideProximityPopup();
        return;
    }

    if (popupPlaceId !== arrivedPlace.id) {
        popupPlaceId = arrivedPlace.id;
        proximityPopupText.textContent = "You reached " + arrivedPlace.name + ".";
        proximityPopup.style.display = "flex";
    }
}

// Draw complete map (order matters: later drawings appear on top)
function drawMap() {
    drawGrass();        // 1. grass
    drawPaths();        // 2. shadows + ticket brick path + tiled walking paths
    drawBridge();       // 3. bridge on top of R3
    drawDottedRoute();  // 4. blue dots on top of the path and bridge
    drawPlaces();       // 5. place badges and labels (they stand beside the path)
    drawVisitor();      // 6. visitor pointer, always on top
}

// Animation loop: move things, then redraw
let lastTime = null;

function animateRoute(now) {
    // dt = seconds since the last frame (capped, so a paused tab doesn't make a big jump)
    const dt = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    dashOffset += 0.5;
    if (dashOffset >= 15) {
        dashOffset = 0;
    }

    updateVisitor(dt);                   // the visitor moves with WASD / joystick
    checkNearbyPlace();                  // show View Details only after reaching a place

    drawMap();
    requestAnimationFrame(animateRoute);
}

// Map marker clicks do not reveal information. The arrival popup appears only
// at the location; the visitor must click View Details to open the full card.

// Resize canvas when window changes
window.addEventListener("resize", resizeCanvas);

// Start map. No arrival popup or information card appears on page load.
hideProximityPopup();
resizeCanvas();
requestAnimationFrame(animateRoute);