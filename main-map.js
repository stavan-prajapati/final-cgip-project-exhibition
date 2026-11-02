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
// Places that open ANOTHER page (their own map) instead of an information card.
// The prompt text and button come from here; "page" is the file that opens.
const PAGE_LINKS = {
    aviary: { page: "aviary.html", question: "Visit the Walk-in Aviary?", button: "Visit Aviary" },
    gate:   { page: "zoo.html",     question: "Visit the Zoo?",            button: "Visit Zoo" }
};

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

// ---------- Map board: the framed area where the map is shown ----------
// The map is drawn inside a wooden frame. Outside the frame is a forest (trees, bushes,
// fireflies), so on a wide PC screen the map looks like a game board in a forest clearing.
// On a phone the frame just hugs the screen and there is almost no forest to draw.
const OUTSIDE_COLOR_TOP = "#78b062";      // forest floor around the board (top)
const OUTSIDE_COLOR_BOTTOM = "#4b8648";   // (bottom)
const FRAME_WOOD_LIGHT = "#a8743f";
const FRAME_WOOD_DARK = "#7a4f2a";
const FRAME_EDGE = "#4a2f18";
const FRAME_HIGHLIGHT = "#d9ad72";

// the board rectangle in MAP units, plus how thick the frame is (screen pixels)
let boardX = VIEW_X, boardY = VIEW_Y, boardW = VIEW_W, boardH = VIEW_H;
let boardCorner = 16;      // rounded corner radius in map units
let frameBand = 10;        // frame thickness in screen pixels

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

    // Space kept free around the map for the frame (screen pixels):
    // small on phones, bigger on big screens
    const margin = Math.round(Math.max(6, Math.min(24, Math.min(screenWidth, screenHeight) * 0.022)));
    frameBand = Math.round(margin * 0.8);

    // Scale so the whole view box fits INSIDE the margins, then center it
    const scale = Math.min((screenWidth - 2 * margin) / VIEW_W, (screenHeight - 2 * margin) / VIEW_H);
    const offsetX = (screenWidth - VIEW_W * scale) / 2 - VIEW_X * scale;
    const offsetY = (screenHeight - VIEW_H * scale) / 2 - VIEW_Y * scale;

    // The board: as wide as the map, as tall as the screen allows.
    // (On a tall phone it is taller than the map, so extra grass shows above and below.)
    boardX = VIEW_X;
    boardW = VIEW_W;
    boardY = (margin - offsetY) / scale;
    boardH = (screenHeight - 2 * margin) / scale;
    boardCorner = 16 / scale;

    ctx.setTransform(
        pixelRatio * scale, 0,
        0, pixelRatio * scale,
        pixelRatio * offsetX, pixelRatio * offsetY
    );

    // remember the placement (in screen pixels) for tap detection
    viewScale = scale;
    viewOffsetX = offsetX;
    viewOffsetY = offsetY;

    buildOutside(screenWidth, screenHeight, pixelRatio);   // forest around the board (wide screens)

    drawMap();
}

// ---------- Small grass tufts and little petal flowers ----------
// Built ONCE as shapes (Path2D), then drawn every frame right after the grass.
// They are drawn BEFORE the water, paths and trees, so those simply cover them:
// nothing needs to be cut out around the path.
const TUFT_COUNT = 2600;
const FLOWER_COUNT = 110;    // number of little petal flowers on the grass (0 = none)
const FLOWER_PETAL_COLORS = ["#f2e9d0", "#e58e92", "#f4c85a", "#b9a3e8"];
let groundTuftsDark = null, groundTuftsLight = null;
let groundFlowerPaths = null, groundFlowerCenters = null;

function buildGroundDetails() {
    groundTuftsDark = new Path2D();
    groundTuftsLight = new Path2D();
    for (let i = 0; i < TUFT_COUNT; i++) {
        const x = VIEW_X + 8 + pseudoRandom(i * 1.9 + 11) * (VIEW_W - 16);
        const y = VIEW_Y + 8 + pseudoRandom(i * 3.3 + 5) * (VIEW_H - 16);
        const p = i % 3 === 0 ? groundTuftsDark : groundTuftsLight;
        p.moveTo(x, y); p.lineTo(x - 2, y - 5);
        p.moveTo(x, y); p.lineTo(x + 1, y - 6);
        p.moveTo(x, y); p.lineTo(x + 3, y - 4);
        if (i % 3 === 1) {                 // every third tuft is a taller, fuller clump
            p.moveTo(x, y); p.lineTo(x - 4, y - 9);
            p.moveTo(x, y); p.lineTo(x + 2, y - 10);
            p.moveTo(x, y); p.lineTo(x + 5, y - 7);
        }
    }

    groundFlowerPaths = FLOWER_PETAL_COLORS.map(function () { return new Path2D(); });
    groundFlowerCenters = new Path2D();
    for (let i = 0; i < FLOWER_COUNT; i++) {
        const x = VIEW_X + 14 + pseudoRandom(i * 2.7 + 41) * (VIEW_W - 28);
        const y = VIEW_Y + 14 + pseudoRandom(i * 4.9 + 17) * (VIEW_H - 28);
        const petals = groundFlowerPaths[i % FLOWER_PETAL_COLORS.length];
        for (let a = 0; a < 5; a++) {
            const ang = a * Math.PI * 2 / 5;
            const px = x + Math.cos(ang) * 4, py = y + Math.sin(ang) * 4;
            petals.moveTo(px + 2.3, py);
            petals.arc(px, py, 2.3, 0, Math.PI * 2);
        }
        groundFlowerCenters.moveTo(x + 2.2, y);
        groundFlowerCenters.arc(x, y, 2.2, 0, Math.PI * 2);
    }
}

function drawGroundDetails() {
    if (!groundTuftsDark) buildGroundDetails();

    ctx.save();
    ctx.lineWidth = 1.2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#68985f"; ctx.stroke(groundTuftsDark);
    ctx.strokeStyle = "#bcd69d"; ctx.stroke(groundTuftsLight);

    for (let i = 0; i < groundFlowerPaths.length; i++) {
        ctx.fillStyle = FLOWER_PETAL_COLORS[i];
        ctx.fill(groundFlowerPaths[i]);
    }
    ctx.fillStyle = "#e9b23a";
    ctx.fill(groundFlowerCenters);
    ctx.restore();
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
// Built in JavaScript so index.html does not need it. Its look (wooden sign, leaf-green
// button, pop-in animation) is in style.css under ".arrival-popup".
const proximityPopup = document.createElement("div");
proximityPopup.id = "proximityPopup";
proximityPopup.className = "arrival-popup";
proximityPopup.setAttribute("role", "status");
proximityPopup.innerHTML =
    '<span class="arrival-popup-icon" aria-hidden="true">&#128062;</span>' +
    '<span id="proximityPopupText"></span>' +
    '<button id="proximityPopupButton" type="button">View Details</button>';
const proximityPopupText = proximityPopup.querySelector("#proximityPopupText");
const proximityPopupButton = proximityPopup.querySelector("#proximityPopupButton");
document.body.appendChild(proximityPopup);

function hideProximityPopup() {
    proximityPopup.style.display = "none";
    popupPlaceId = null;
}

proximityPopupButton.addEventListener("click", function () {
    if (!popupPlaceId) return;
    const link = PAGE_LINKS[popupPlaceId];
    if (link) {                              // Aviary / Zoo: open that page
        window.location.href = link.page;
        return;
    }
    if (typeof openPlaceCard !== "function") return;
    const id = popupPlaceId;
    popupDismissedFor = id;
    hideProximityPopup();
    openPlaceCard(id);
});


// ---------- Bridge popup: watch the animals of the Vishwamitri ----------
// Shown while the visitor stands on the bridge (over the stream). The button opens the
// "vishwamitri" information card (crocodile and turtle placeholders, see data/places-data.js).
const BRIDGE_SPOT = { x: 350, y: 910, halfW: 46, halfH: 32 };
let bridgeDismissed = false;

const bridgePopup = document.createElement("div");
bridgePopup.id = "bridgePopup";
bridgePopup.className = "arrival-popup";
bridgePopup.setAttribute("role", "status");
bridgePopup.innerHTML =
    '<span class="arrival-popup-icon" aria-hidden="true">&#128010;</span>' +
    '<span>Want to see crocs of Vishwamitri river?</span>' +
    '<button id="bridgePopupButton" type="button">Watch</button>';
document.body.appendChild(bridgePopup);
bridgePopup.style.display = "none";

bridgePopup.querySelector("#bridgePopupButton").addEventListener("click", function () {
    bridgeDismissed = true;                 // do not show it again until the visitor leaves the bridge
    bridgePopup.style.display = "none";
    if (typeof openPlaceCard === "function") openPlaceCard("vishwamitri");
});

function checkBridge() {
    const onBridge = Math.abs(visitor.x - BRIDGE_SPOT.x) <= BRIDGE_SPOT.halfW &&
                     Math.abs(visitor.y - BRIDGE_SPOT.y) <= BRIDGE_SPOT.halfH;

    if (!onBridge) {
        bridgePopup.style.display = "none";
        bridgeDismissed = false;
        return;
    }
    const cardOpen = typeof isPlaceCardOpen === "function" && isPlaceCardOpen();
    bridgePopup.style.display = (cardOpen || bridgeDismissed) ? "none" : "flex";
}

// ======================================================================
// SCENERY: lake, trees, bushes, flowers, rocks, lily pads and butterflies
// Everything is drawn with Canvas shapes (no images). Move things by changing
// the numbers in the lists below, or use the editor (open the page with ?edit).
// ======================================================================

// ---------- Lake: two ponds joined by a stream that flows UNDER the bridge ----------
// "ellipse": x, y = CENTER of the shape,    w, h = full width and height
// "rect":    x, y = TOP-LEFT of the shape,  w, h = size,  r = how round the corners are
// All the shapes are joined into ONE lake.
const waterShapes = [
    { shape: "ellipse", x: 250, y: 735,  w: 270, h: 190 },            // north pond
    { shape: "rect",    x: 315, y: 770,  w: 70,  h: 365, r: 35 },     // stream (passes under the bridge)
    { shape: "ellipse", x: 440, y: 1100, w: 230, h: 150 }             // south pond
];

const SHORE_COLOR = "#e6dab4";     // sandy bank around the lake
const WATER_TOP = "#74c7e3";       // water color at the top of the lake
const WATER_BOTTOM = "#2e86b4";    // water color at the bottom of the lake

// Places where ripples spread out on the water
const ripples = [
    { x: 200, y: 700 }, { x: 290, y: 690 }, { x: 320, y: 760 }, { x: 160, y: 765 },
    { x: 350, y: 985 }, { x: 350, y: 1070 },
    { x: 440, y: 1085 }, { x: 505, y: 1110 }, { x: 410, y: 1130 }
];

// ---------- Trees, bushes, flowers, rocks, lily pads ----------
// type: "tree", "bush", "flowers", "rock", "lily"
// x, y = the spot where the object touches the ground (its base), in map units
// size = 1 is normal, 1.3 is bigger, 0.8 is smaller (optional)
const scenery = [
    // forest in the top-left
    { type: "tree", x: 110, y: 150, size: 1.2 },  
    { type: "tree", x: 270, y: 70, size: 1.1 },   { type: "tree", x: 350, y: 140, size: 1.2 },
    { type: "tree", x: 430, y: 80 },              { type: "tree", x: 520, y: 130, size: 1.1 },
    { type: "tree", x: 95, y: 260, size: 1.1 },   { type: "tree", x: 170, y: 330, size: 1.2 },
    { type: "tree", x: 260, y: 250, size: 1.3 },  { type: "tree", x: 340, y: 310 },
    { type: "tree", x: 430, y: 230, size: 1.1 },  { type: "tree", x: 510, y: 300, size: 1.2 },
    { type: "tree", x: 590, y: 220 },
    { type: "tree", x: 210, y: 470 },
    
    { type: "tree", x: 480, y: 440 },             { type: "tree", x: 560, y: 520, size: 1.1 },

    // around the north pond
    { type: "tree", x: 200, y: 585 },
    { type: "tree", x: 380, y: 590, size: 0.9 },
    { type: "rock", x: 118, y: 800 },             { type: "rock", x: 165, y: 835 },
    { type: "rock", x: 210, y: 848, size: 1.2 },  { type: "rock", x: 285, y: 850 },
    { type: "lily", x: 200, y: 700 },             { type: "lily", x: 255, y: 770, size: 1.2 },
    { type: "lily", x: 170, y: 740 },             { type: "lily", x: 315, y: 705, size: 0.9 },

    // left of the stream, below the bridge
    { type: "tree", x: 110, y: 905, size: 1.2 },
    { type: "tree", x: 175, y: 1035, size: 1.1 },

    // stream and south pond
    { type: "lily", x: 350, y: 1015 },            { type: "lily", x: 345, y: 1065, size: 0.9 },
    { type: "lily", x: 480, y: 1085, size: 1.2 }, { type: "lily", x: 520, y: 1112 },
    { type: "lily", x: 440, y: 1122, size: 0.9 },
    { type: "rock", x: 560, y: 1092 },            { type: "rock", x: 430, y: 1190, size: 1.2 },

    // forest in the bottom-right
    { type: "tree", x: 620, y: 745 },
    
    { type: "tree", x: 865, y: 805, size: 1.1 },
    { type: "tree", x: 520, y: 885, size: 1.2 },  
    { type: "tree", x: 700, y: 905, size: 1.1 },  
    { type: "tree", x: 860, y: 905 },
    { type: "tree", x: 715, y: 1055, size: 1.2 },
    { type: "tree", x: 860, y: 1105, size: 1.1 },
    { type: "tree", x: 645, y: 1135 },            
    
    { type: "tree", x: 690, y: 1250 },            { type: "tree", x: 535, y: 1245, size: 1.1 },
    
    

    // near the aviary road and the clock
    
    { type: "tree", x: 880, y: 165 },
    { type: "tree", x: 880, y: 700 },

    // a few rocks along the pond edge
    { type: "rock", x: 91, y: 750, size: 1.0 },
    { type: "rock", x: 341, y: 656, size: 1.2 },
    { type: "rock", x: 402, y: 1198, size: 0.9 },
    { type: "rock", x: 400, y: 1014, size: 1.0 },
    ];
scenery.sort(function (a, b) { return a.y - b.y; });

// Butterflies fly around a centre point (cx, cy) in a lazy figure-eight
const butterflies = [
    { cx: 330, cy: 400, ax: 70, ay: 40, speed: 0.55, color: "#ffb300" },
    { cx: 560, cy: 410, ax: 60, ay: 35, speed: 0.65, color: "#ff7ab6" },
    { cx: 600, cy: 850, ax: 80, ay: 45, speed: 0.5,  color: "#ffffff" },
    { cx: 200, cy: 980, ax: 40, ay: 45, speed: 0.6,  color: "#ffd54f" },
    { cx: 500, cy: 1215, ax: 60, ay: 25, speed: 0.7, color: "#a58fd6" },
    { cx: 250, cy: 230, ax: 55, ay: 35, speed: 0.6, color: "#8fc2ee" },
    { cx: 770, cy: 650, ax: 50, ay: 40, speed: 0.52, color: "#ff9f43" },
    { cx: 720, cy: 1100, ax: 65, ay: 40, speed: 0.58, color: "#fff176" }
];

const TREE_PALETTES = [
    { dark: "#2e7d32", mid: "#43a047", light: "#6fbf73" },
    { dark: "#33691e", mid: "#558b2f", light: "#8bc34a" },
    { dark: "#1b5e20", mid: "#2e7d32", light: "#56a95b" }
];
const FLOWER_COLORS = ["#ff6f91", "#ffd54f", "#ffffff", "#ff9f43", "#b388ff", "#ff6f91", "#ffd54f"];

// ---------- Lake drawing ----------

// A rounded rectangle added to the CURRENT path (so it can be joined with other shapes)
function addRoundedRect(x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// One path made of ALL the water shapes (overlapping shapes join into one lake)
function waterPath() {
    ctx.beginPath();
    for (const s of waterShapes) {
        if (s.shape === "ellipse") {
            ctx.moveTo(s.x + s.w / 2, s.y);
            ctx.ellipse(s.x, s.y, s.w / 2, s.h / 2, 0, 0, Math.PI * 2);
        } else {
            addRoundedRect(s.x, s.y, s.w, s.h, s.r);
        }
    }
}

// ---------- Crocodile ----------
// It swims along a closed route: round the north pond, down the stream UNDER the bridge,
// round the south pond, and back up the stream. The body follows the head along the route,
// so it bends naturally. It is drawn inside the water clip, so it never leaves the water.
const CROC_ROUTE = [
    [345, 745], [300, 690], [230, 675], [170, 700], [150, 745], [190, 785], [255, 790], [310, 785],   // north pond
    [338, 830], [338, 910], [338, 985],                                                              // down the stream (left lane)
    [375, 1060], [440, 1078], [505, 1100], [470, 1140], [405, 1135], [368, 1090],                    // south pond
    [362, 1020], [362, 940], [362, 870], [362, 810]                                                  // up the stream (right lane)
];
const CROC_SPEED = 17;          // map units per second (lower = slower)
const CROC_SEGMENTS = 24;       // body is made of this many slices
const CROC_SPACING = 4.2;       // distance between slices
const CROC_OUTLINE = "#2c3d24", CROC_BODY = "#56743f", CROC_BACK = "#6f8f50";
let crocPoints = null, crocCum = null, crocLength = 0;

// Smooth closed curve through the route points (Catmull-Rom), stored with running lengths
function buildCrocRoute() {
    const P = CROC_ROUTE, n = P.length;
    crocPoints = []; crocCum = [0];
    for (let i = 0; i < n; i++) {
        const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
        for (let k = 0; k < 20; k++) {
            const u = k / 20, u2 = u * u, u3 = u2 * u;
            crocPoints.push([
                0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
                0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)
            ]);
        }
    }
    for (let i = 1; i < crocPoints.length; i++) {
        crocCum.push(crocCum[i - 1] + Math.hypot(crocPoints[i][0] - crocPoints[i - 1][0], crocPoints[i][1] - crocPoints[i - 1][1]));
    }
    const last = crocPoints[crocPoints.length - 1], first = crocPoints[0];
    crocLength = crocCum[crocCum.length - 1] + Math.hypot(first[0] - last[0], first[1] - last[1]);
}

// The point on the route after travelling distance d (the route repeats)
function crocPointAt(d) {
    d = ((d % crocLength) + crocLength) % crocLength;
    let lo = 0, hi = crocPoints.length - 1;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (crocCum[mid] <= d) lo = mid; else hi = mid - 1;
    }
    const a = crocPoints[lo], b = crocPoints[(lo + 1) % crocPoints.length];
    const end = lo + 1 < crocCum.length ? crocCum[lo + 1] : crocLength;
    const f = end > crocCum[lo] ? (d - crocCum[lo]) / (end - crocCum[lo]) : 0;
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

// half-width of the body at slice k (0 = tip of the snout, last = tip of the tail)
function crocHalfWidth(k) {
    const w = [2.0, 2.4, 2.9, 3.4, 4.0, 5.2, 6.3, 5.8, 7.0, 8.0, 8.4, 8.4, 8.4, 8.3, 8.0, 7.4, 6.6];
    if (k < w.length) return w[k];
    return 6.6 * (CROC_SEGMENTS - 1 - k) / (CROC_SEGMENTS - 1 - (w.length - 1)) + 0.9;
}

// startFraction: where on the route it starts (0 to 1).  size: 1 = normal, 0.8 = a bit smaller.
function drawCrocodile(t, startFraction, size) {
    if (!crocPoints) buildCrocRoute();
    const n = CROC_SEGMENTS;
    const S = size || 1;
    const head = t * CROC_SPEED + (startFraction || 0) * crocLength;

    // 1. slice positions along the route, then a sideways wiggle that grows toward the tail
    const base = [];
    for (let k = 0; k < n; k++) base.push(crocPointAt(head - k * CROC_SPACING * S));
    const pos = [], ang = [], nor = [];
    for (let k = 0; k < n; k++) {
        const a = base[Math.max(k - 1, 0)], b = base[Math.min(k + 1, n - 1)];
        const angle = Math.atan2(a[1] - b[1], a[0] - b[0]);      // direction towards the head
        const nx = -Math.sin(angle), ny = Math.cos(angle);
        const wiggle = Math.sin(t * 3 - k * 0.55) * Math.min(k, 14) * 0.16 * S;
        ang.push(angle); nor.push([nx, ny]);
        pos.push([base[k][0] + nx * wiggle, base[k][1] + ny * wiggle]);
    }

    function slices(color, grow, shrink, dx, dy) {
        ctx.fillStyle = color;
        for (let k = n - 1; k >= 0; k--) {
            ctx.beginPath();
            ctx.ellipse(pos[k][0] + dx, pos[k][1] + dy, CROC_SPACING * 1.15 * S, Math.max(0.6, (crocHalfWidth(k) * shrink + grow) * S), ang[k], 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // soft shadow in the water
    slices("rgba(10, 40, 60, 0.16)", 1, 1, 3, 4);

    // four paddling legs (drawn under the body, only the feet stick out)
    ctx.fillStyle = CROC_BODY;
    ctx.strokeStyle = CROC_OUTLINE;
    ctx.lineWidth = 0.8;
    for (const k of [8, 15]) {
        for (const side of [-1, 1]) {
            const x = pos[k][0] + nor[k][0] * side * crocHalfWidth(k) * 0.8 * S;
            const y = pos[k][1] + nor[k][1] * side * crocHalfWidth(k) * 0.8 * S;
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(S, S);
            ctx.rotate(ang[k] + side * (0.95 + Math.sin(t * 3.2 + k + side) * 0.3));
            ctx.beginPath(); ctx.ellipse(5.5, 0, 6.5, 2.5, 0, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
            ctx.restore();
        }
    }

    // body: dark outline, green body, lighter back
    slices(CROC_OUTLINE, 1.3, 1, 0, 0);
    slices(CROC_BODY, 0, 1, 0, 0);
    slices(CROC_BACK, 0, 0.5, 0, 0);

    // bony ridges along the back
    ctx.fillStyle = "rgba(35, 55, 30, 0.7)";
    for (let k = 7; k < n - 3; k += 2) {
        ctx.beginPath(); ctx.arc(pos[k][0], pos[k][1], 1.2 * S, 0, Math.PI * 2); ctx.fill();
    }

    // eyes and nostrils
    for (const side of [-1, 1]) {
        const ex = pos[5][0] + nor[5][0] * side * 3.9 * S, ey = pos[5][1] + nor[5][1] * side * 3.9 * S;
        ctx.fillStyle = CROC_BODY; ctx.beginPath(); ctx.arc(ex, ey, 2.3 * S, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#d9b83c"; ctx.beginPath(); ctx.arc(ex, ey, 1.2 * S, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#1c2616"; ctx.beginPath(); ctx.arc(ex, ey, 0.5 * S, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#1c2616";
        ctx.beginPath();
        ctx.arc(pos[0][0] + nor[0][0] * side * 0.9 * S, pos[0][1] + nor[0][1] * side * 0.9 * S, 0.6 * S, 0, Math.PI * 2);
        ctx.fill();
    }

    // little ring spreading from the snout
    const phase = (t * 0.9 + (startFraction || 0) * 3) % 1;
    ctx.strokeStyle = "rgba(255, 255, 255, " + ((1 - phase) * 0.45) + ")";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(pos[0][0], pos[0][1], (5 + phase * 16) * S, (5 + phase * 16) * 0.6 * S, ang[0], 0, Math.PI * 2);
    ctx.stroke();
}

function drawWater() {
    const t = performance.now() / 1000;

    ctx.save();

    // 1. sandy bank: the lake outline drawn thick, so a border sticks out around the water
    waterPath();
    ctx.lineJoin = "round";
    ctx.lineWidth = 20;
    ctx.strokeStyle = SHORE_COLOR;
    ctx.stroke();

    // white foam ring: also drawn before the water, so the water hides its inner half
    // and only a thin white line is left right at the water edge
    waterPath();
    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.stroke();

    // 2. the water, a little lighter at the top
    const gradient = ctx.createLinearGradient(0, 640, 0, 1175);
    gradient.addColorStop(0, WATER_TOP);
    gradient.addColorStop(1, WATER_BOTTOM);
    waterPath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // 3. things that only show INSIDE the water (the clip cuts everything at the lake edge)
    ctx.save();
    waterPath();
    ctx.clip();

    // ripples: rings that grow and fade out, one after another
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.6;
    for (let i = 0; i < ripples.length; i++) {
        const phase = (t * 0.35 + i * 0.173) % 1;
        const radius = 6 + phase * 26;
        ctx.globalAlpha = (1 - phase) * 0.5;
        ctx.beginPath();
        ctx.ellipse(ripples[i].x, ripples[i].y, radius, radius * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // two crocodiles swimming through the ponds and under the bridge
    drawCrocodile(t, 0, 1);         // big crocodile
    drawCrocodile(t, 0.5, 0.82);    // second, slightly smaller, half a loop away
    ctx.restore();

    ctx.restore();
}

// ---------- Scenery drawing ----------
// Every object is designed around (0, 0) = its base on the ground.
// drawSceneryItem() then does:  translate (move to x, y), scale (size), rotate (sway in the wind).

function blob(x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
}

function groundShadow(rx, ry) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.beginPath();
    ctx.ellipse(3, 2, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
}

// Round tree in the style of the aviary map: soft shadow, brown trunk, and a canopy of
// overlapping green blobs with a small highlight. Drawn around (0, 0) = base on the ground.
// No pink trees: every round tree is green (3 slightly different greens for variety).
const ROUND_TREE_COLORS = [
    ["#3f7a46", "#5f9a58", "#356b3e", "#74ab66"],
    ["#3b7340", "#58934f", "#306338", "#6ea35f"],
    ["#437f49", "#64a05b", "#3a7141", "#7bb06b"]
];
function drawRoundTree(seed) {
    const c = ROUND_TREE_COLORS[Math.floor((seed || 0) * 3) % 3];
    ctx.save();
    ctx.translate(0, -22);
    ctx.scale(1.3, 1.3);

    // soft ground shadow
    ctx.fillStyle = "rgba(47, 74, 44, 0.19)";
    ctx.beginPath(); ctx.ellipse(6, 16, 22, 11, 0, 0, Math.PI * 2); ctx.fill();

    // trunk
    ctx.fillStyle = "#78593c";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-4, -2, 8, 24, 3); else ctx.rect(-4, -2, 8, 24);
    ctx.fill();

    // canopy: four overlapping blobs [dx, dy, radius]
    const blobs = [[0, -8, 18, c[0]], [-9, -13, 11, c[1]], [9, -3, 12, c[2]], [2, -17, 9, c[3]]];
    for (const b of blobs) {
        ctx.fillStyle = b[3];
        ctx.beginPath(); ctx.arc(b[0], b[1], b[2], 0, Math.PI * 2); ctx.fill();
    }

    // highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.13)";
    ctx.beginPath(); ctx.arc(-6, -16, 5, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
}

// Bush: a low cluster of circles (some bushes carry berries)
function drawBush(seed) {
    blob(-14, -10, 13, "#2e7d32"); blob(14, -10, 13, "#2e7d32"); blob(0, -16, 17, "#2e7d32");
    blob(-12, -13, 10, "#4caf50"); blob(12, -13, 10, "#4caf50"); blob(0, -20, 12, "#66bb6a");

    if (seed > 0.55) {
        for (const b of [[-12, -14], [6, -24], [14, -10], [-2, -8]]) {
            blob(b[0], b[1], 2.6, "#e53935");
        }
    }
}

// Flower patch: green leaves with colorful flowers that each sway a little
function drawFlowers(t) {
    ctx.fillStyle = "#3f8f4a";
    ctx.beginPath(); ctx.ellipse(0, -3, 22, 6, 0, 0, Math.PI * 2); ctx.fill();

    const spots = [[-14, -9], [-6, -17], [4, -11], [12, -18], [17, -8], [-1, -5], [-19, -17]];
    for (let i = 0; i < spots.length; i++) {
        const sway = Math.sin(t * 2 + i) * 0.12;
        ctx.save();
        ctx.translate(spots[i][0], 0);
        ctx.rotate(sway);
        const height = -spots[i][1];

        ctx.strokeStyle = "#2e7d32";
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -height); ctx.stroke();
        blob(0, -height, 4.6, FLOWER_COLORS[i]);
        blob(0, -height, 1.8, "#fff3b0");
        ctx.restore();
    }
}

// Rock: a rounded gray stone
function drawRock() {
    ctx.fillStyle = "#8d989b";
    ctx.beginPath();
    ctx.moveTo(-15, 0); ctx.quadraticCurveTo(-17, -10, -5, -14);
    ctx.quadraticCurveTo(7, -17, 14, -8);
    ctx.quadraticCurveTo(18, -2, 14, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#b5bec0";                   // lit side
    ctx.beginPath();
    ctx.moveTo(-12, -3); ctx.quadraticCurveTo(-13, -10, -4, -12);
    ctx.quadraticCurveTo(2, -13, 3, -8);
    ctx.quadraticCurveTo(-5, -8, -12, -3);
    ctx.fill();
}

// Lily pad floating on the water (some have a pink flower)
function drawLily(seed, t) {
    ctx.scale(1, 0.6);                           // flattened, as if seen from above at an angle
    ctx.fillStyle = "#3f9b4b";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 13, 0.45, Math.PI * 2);        // a circle with a small notch cut out
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#2e7d32";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-9, -3); ctx.moveTo(0, 0); ctx.lineTo(-3, 9); ctx.stroke();

    if (seed > 0.5) {
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + t * 0.1;
            blob(Math.cos(a) * 4, Math.sin(a) * 4 - 2, 3, "#ffb3d1");
        }
        blob(0, -2, 2.2, "#fff176");
    }
}

// Draw one scenery object
function drawSceneryItem(item, t) {
    const size = item.size || 1;
    const seed = pseudoRandom(item.x * 0.37 + item.y * 0.11);      // different for every object, never changes

    // wind: the swing grows and shrinks slowly (gusts)
    const gust = 0.5 + 0.5 * Math.sin(t * 0.35 + item.x * 0.01);
    const sway = Math.sin(t * 1.3 + seed * 6.28) * (0.012 + 0.016 * gust);

    ctx.save();
    ctx.translate(item.x, item.y);        // TRANSLATION: move to the object's spot
    ctx.scale(size, size);                // SCALING: make it bigger or smaller

    switch (item.type) {
        case "blossom":      // old pink tree type: now just a green tree
        case "tree":
            ctx.rotate(sway);             // ROTATION: sway around the base
            drawRoundTree(seed);
            break;
        case "bush":
            groundShadow(24, 6);
            ctx.rotate(sway * 1.5);
            drawBush(seed);
            break;
        case "flowers":
            drawFlowers(t);
            break;
        case "rock":
            groundShadow(15, 4);
            drawRock();
            break;
        case "lily":
            ctx.translate(0, Math.sin(t * 1.5 + seed * 6) * 0.8);   // gently bobs on the water
            drawLily(seed, t);
            break;
    }

    ctx.restore();
}

function drawScenery() {
    const t = performance.now() / 1000;

    for (const item of scenery) {
        drawSceneryItem(item, t);
    }

    // editor only: ring around the selected object
    if (EDIT_MODE && selectedItem) {
        const size = selectedItem.size || 1;
        ctx.save();
        ctx.strokeStyle = "#ffd54f";
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.arc(selectedItem.x, selectedItem.y - 28 * size, 40 * size, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

// Butterflies: they drift around and flap their wings
function drawButterflies() {
    const t = performance.now() / 1000;

    for (let i = 0; i < butterflies.length; i++) {
        const b = butterflies[i];
        const phase = i * 1.7;

        // position (a lazy figure-eight) and the direction it is flying
        const x = b.cx + b.ax * Math.sin(t * b.speed + phase);
        const y = b.cy + b.ay * Math.sin(t * b.speed * 2 + phase);
        const vx = b.ax * b.speed * Math.cos(t * b.speed + phase);
        const vy = b.ay * b.speed * 2 * Math.cos(t * b.speed * 2 + phase);

        const flap = 0.25 + 0.75 * Math.abs(Math.sin(t * 13 + phase));   // wings open and close

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.atan2(vy, vx) + Math.PI / 2);      // face the flying direction

        ctx.fillStyle = b.color;
        ctx.strokeStyle = "rgba(60, 40, 20, 0.6)";
        ctx.lineWidth = 0.8;
        for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.ellipse(side * 5 * flap, -3, 5 * flap, 6.5, side * 0.4, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(side * 4 * flap, 4, 3.5 * flap, 4.5, side * -0.3, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
        }
        ctx.fillStyle = "#3b2a14";
        ctx.beginPath(); ctx.ellipse(0, 0, 1.4, 6, 0, 0, Math.PI * 2); ctx.fill();   // body

        ctx.restore();
    }
}

// Warn (in the browser console) if something was placed on a walking path
function warnAboutSceneryOnPaths() {
    const roads = pathRects.concat(ticketPathRects);

    for (const item of scenery) {
        if (item.type === "lily") continue;
        const pad = 8 * (item.size || 1);

        for (const r of roads) {
            if (item.x > r.x - pad && item.x < r.x + r.w + pad &&
                item.y > r.y - pad && item.y < r.y + r.h + pad) {
                console.warn("Scenery '" + item.type + "' at (" + item.x + ", " + item.y + ") is on or next to a walking path.");
                break;
            }
        }
    }
}

// ---------- Scenery editor (only when the page is opened with ?edit) ----------
// Click the grass to add the selected object, drag an object to move it,
// Delete removes it, + and - change its size, "Copy" gives you the finished list.
const EDIT_MODE = new URLSearchParams(window.location.search).has("edit");
let selectedItem = null;

function setupEditor() {
    let editType = "tree";
    let dragging = false;

    canvas.style.touchAction = "none";

    const panel = document.createElement("div");
    panel.className = "edit-panel";
    panel.innerHTML =
        "<strong>Scenery editor</strong>" +
        '<div class="edit-types"></div>' +
        '<div class="edit-hint">Click = add &middot; Drag = move<br>Delete = remove &middot; + / - = size</div>' +
        '<div class="edit-coords" id="editCoords">x: -&nbsp; y: -</div>' +
        '<button type="button" id="editCopy">Copy scenery list</button>';
    document.body.appendChild(panel);

    const coords = panel.querySelector("#editCoords");
    const typeBox = panel.querySelector(".edit-types");

    for (const type of ["tree", "bush", "flowers", "rock", "lily"]) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = type;
        if (type === editType) button.className = "active";
        button.addEventListener("click", function () {
            editType = type;
            for (const other of typeBox.children) other.className = "";
            button.className = "active";
        });
        typeBox.appendChild(button);
    }

    // screen position -> map position
    function mapPoint(event) {
        const box = canvas.getBoundingClientRect();
        return {
            x: (event.clientX - box.left - viewOffsetX) / viewScale,
            y: (event.clientY - box.top - viewOffsetY) / viewScale
        };
    }

    // the object closest to this point (or null)
    function itemAt(p) {
        let best = null;
        let bestDistance = Infinity;
        for (const item of scenery) {
            const size = item.size || 1;
            const d = Math.hypot(p.x - item.x, p.y - (item.y - 20 * size));
            if (d < 34 * size && d < bestDistance) { best = item; bestDistance = d; }
        }
        return best;
    }

    canvas.addEventListener("pointerdown", function (event) {
        const p = mapPoint(event);
        let item = itemAt(p);

        if (!item) {                                   // empty spot: add a new object
            item = { type: editType, x: Math.round(p.x), y: Math.round(p.y) };
            scenery.push(item);
        }
        selectedItem = item;
        dragging = true;
        coords.textContent = "x: " + Math.round(item.x) + "  y: " + Math.round(item.y);
    });

    canvas.addEventListener("pointermove", function (event) {
        if (!dragging || !selectedItem) return;
        const p = mapPoint(event);
        selectedItem.x = Math.round(p.x);
        selectedItem.y = Math.round(p.y);
        coords.textContent = "x: " + selectedItem.x + "  y: " + selectedItem.y;
    });

    window.addEventListener("pointerup", function () {
        if (dragging) scenery.sort(function (a, b) { return a.y - b.y; });
        dragging = false;
    });

    function copyList() {
        const lines = scenery.map(function (i) {
            const size = i.size && i.size !== 1 ? ", size: " + i.size.toFixed(1) : "";
            return '    { type: "' + i.type + '", x: ' + Math.round(i.x) + ", y: " + Math.round(i.y) + size + " }";
        });
        const text = "const scenery = [\n" + lines.join(",\n") + "\n];";

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(
                function () { coords.textContent = "Copied! Paste it over the scenery list in main-map.js"; },
                function () { window.prompt("Copy this list:", text); }
            );
        } else {
            window.prompt("Copy this list:", text);
        }
    }
    panel.querySelector("#editCopy").addEventListener("click", copyList);

    window.addEventListener("keydown", function (event) {
        if (!selectedItem) return;
        const key = event.key;

        if (key === "Delete" || key === "Backspace") {
            scenery.splice(scenery.indexOf(selectedItem), 1);
            selectedItem = null;
        } else if (key === "+" || key === "=") {
            selectedItem.size = Math.min(2.5, (selectedItem.size || 1) + 0.1);
        } else if (key === "-" || key === "_") {
            selectedItem.size = Math.max(0.4, (selectedItem.size || 1) - 0.1);
        }
    });
}

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
const VISITOR_SCREEN_SPEED = 130;            // how fast the pointer moves ON THE SCREEN (pixels per second), the same on every device
const VISITOR_COLOR = "#168bff";
const JOYSTICK_SPEED_FACTOR = 0.72;           // 1 = same as keyboard, 0.72 = a bit slower on the phone joystick (lower = slower)

// The visitor may walk on every path rectangle (the bridge is R3, so it is included)
const walkableRects = pathRects.concat(ticketPathRects);

// heading = angle the pointer faces (0 = right, PI = left)
const visitor = { x: VISITOR_START.x, y: VISITOR_START.y, heading: Math.PI };

// Coming back from another page (aviary.html?  zoo.html): start just outside that place,
// so the visitor does not get the "Visit ..." prompt again straight away.
const RETURN_SPOTS = { aviary: { x: 710, y: 270 }, zoo: { x: 215, y: 1170 } };
const returnedFrom = new URLSearchParams(window.location.search).get("from");
if (RETURN_SPOTS[returnedFrom]) {
    visitor.x = RETURN_SPOTS[returnedFrom].x;
    visitor.y = RETURN_SPOTS[returnedFrom].y;
}

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

// ---------- Controls: joystick (mobile + tablet only, bottom right) ----------
const JOY_SIZE = 110;          // biggest diameter of the joystick pad (screen pixels); smaller screens use less
const JOY_DEAD_ZONE = 0.15;    // tiny thumb movements are ignored
const joy = { x: 0, y: 0 };    // joystick direction, each from -1 to 1

function createJoystick() {
    // The joystick is always created, but only SHOWN while touch is being used
    // (PC users use WASD). See "When is the joystick visible?" below.
    //
    // Look: a round wooden-and-cream pad with FOUR ARROWS and a big green thumb knob, and a small hint
    // "Drag to move" that disappears after the first use. The arrow you push toward lights up.

    // The pad size follows the screen: big enough for a thumb, never too big for a small phone.
    function joySize() {
        return Math.round(Math.max(84, Math.min(JOY_SIZE, Math.min(window.innerWidth, window.innerHeight) * 0.27)));
    }
    const JOY_BOTTOM = 36;        // gap below the pad (screen pixels): leaves room for the hint under it
    const IDLE_OPACITY = 0.5;     // see-through while nobody touches it, so paths and signs stay visible
    const HELD_OPACITY = 0.9;     // clearer while it is held
    const KNOB_SHARE = 0.42;      // knob diameter, as a share of the pad
    const TRAVEL_SHARE = 0.32;    // how far the knob may leave the centre, as a share of the pad

    // z-index 5 keeps the joystick BELOW the information card (the card uses 10)
    const base = document.createElement("div");
    base.id = "joystick";
    base.setAttribute("role", "application");
    base.setAttribute("aria-label", "Joystick: drag to move the pointer");
    base.style.cssText =
        "position:fixed; z-index:5; border-radius:50%;" +
        "right:calc(14px + env(safe-area-inset-right, 0px));" +
        `bottom:calc(${JOY_BOTTOM}px + env(safe-area-inset-bottom, 0px));` +
        "background:radial-gradient(circle at 50% 35%, #fff8e3 0%, #f1dfb4 58%, #c9a56e 100%);" +
        "border:3px solid #6f4524; opacity:" + IDLE_OPACITY + ";" +
        "box-shadow:0 0 0 2px rgba(255,244,214,0.9), 0 4px 10px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.55);" +
        "touch-action:none; user-select:none; -webkit-user-select:none; -webkit-touch-callout:none;" +
        "-webkit-tap-highlight-color:transparent; cursor:grab;" +
        "transition:transform 0.15s ease, box-shadow 0.15s ease, opacity 0.2s ease;";

    // a thin inner ring: "the knob travels inside here"
    const track = document.createElement("div");
    track.style.cssText =
        "position:absolute; inset:19%; border-radius:50%; pointer-events:none;" +
        "border:2px solid rgba(78,49,25,0.22); background:rgba(78,49,25,0.06);";
    base.appendChild(track);

    // four chevron arrows (up is always up on the screen, even when the map is turned a quarter turn on a phone)
    const ARROWS = [
        { dir: "up",    rot: 0,   css: "top:5%; left:50%; margin-left:-9%;" },
        { dir: "down",  rot: 180, css: "bottom:5%; left:50%; margin-left:-9%;" },
        { dir: "left",  rot: -90, css: "left:5%; top:50%; margin-top:-9%;" },
        { dir: "right", rot: 90,  css: "right:5%; top:50%; margin-top:-9%;" }
    ];
    const arrowEls = {};
    for (const a of ARROWS) {
        const el = document.createElement("span");
        el.innerHTML =
            '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">' +
            '<path d="M4.5 15.5 L12 8 L19.5 15.5" fill="none" stroke="#fff4d6" stroke-width="6.2" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<path d="M4.5 15.5 L12 8 L19.5 15.5" fill="none" stroke="#5b3d20" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>' +
            "</svg>";
        el.style.cssText =
            "position:absolute; width:20%; height:20%; pointer-events:none; opacity:0.8;" +
            `transform:rotate(${a.rot}deg); transition:opacity 0.1s ease, filter 0.1s ease;` + a.css;
        base.appendChild(el);
        arrowEls[a.dir] = el;
    }

    // the thumb knob
    const knob = document.createElement("div");
    knob.style.cssText =
        "position:absolute; left:50%; top:50%; border-radius:50%; pointer-events:none;" +
        "background:radial-gradient(circle at 35% 28%, #8fe09a 0%, #3f8f4a 58%, #2a6a35 100%);" +
        "border:3px solid #fff4d6;" +
        "box-shadow:0 5px 10px rgba(0,0,0,0.4), inset 0 -4px 6px rgba(0,0,0,0.25), inset 0 3px 5px rgba(255,255,255,0.35);" +
        "transition:transform 0.14s ease-out;";
    const grip = document.createElement("div");           // small ring on the knob: looks like a thumb rest
    grip.style.cssText =
        "position:absolute; inset:27%; border-radius:50%; pointer-events:none;" +
        "border:2px solid rgba(255,244,214,0.55);";
    knob.appendChild(grip);
    base.appendChild(knob);

    // the hint under the pad, until the person has used the joystick once
    let hintSeen = false;
    try { hintSeen = localStorage.getItem("zooJoystickUsed") === "1"; } catch (err) { /* private mode: just show it */ }
    const hint = document.createElement("div");
    hint.textContent = "Drag to move";
    hint.style.cssText =
        "position:absolute; top:100%; left:50%; transform:translateX(-50%); margin-top:9px; pointer-events:none;" +
        "white-space:nowrap; padding:3px 9px; border-radius:999px;" +
        "font:800 11px 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif; letter-spacing:0.03em;" +
        "color:#fff4d6; background:rgba(78,49,25,0.9); border:2px solid #fff4d6;" +
        "box-shadow:0 2px 6px rgba(0,0,0,0.3); transition:opacity 0.4s ease;" +
        (hintSeen ? "opacity:0; display:none;" : "");
    base.appendChild(hint);

    document.body.appendChild(base);

    // Size everything from the screen size (called now and on every resize)
    let maxDist = 0;
    const popupStyle = document.createElement("style");   // keeps the "You reached ..." popup ABOVE the pad
    document.head.appendChild(popupStyle);

    function layoutJoystick() {
        const size = joySize();
        base.style.width = size + "px";
        base.style.height = size + "px";
        const knobSize = Math.round(size * KNOB_SHARE);
        knob.style.width = knobSize + "px";
        knob.style.height = knobSize + "px";
        knob.style.margin = (-knobSize / 2) + "px 0 0 " + (-knobSize / 2) + "px";
        maxDist = size * TRAVEL_SHARE;
        hint.style.fontSize = "11px";
        popupStyle.textContent = touchMode
            ? `.arrival-popup { bottom: calc(${JOY_BOTTOM + size + 16}px + env(safe-area-inset-bottom, 0px)) !important; }`
            : "";
    }

    // ---- When is the joystick visible? ----
    // We follow the input the person is REALLY using:
    //   a finger touches the screen          -> show the joystick (phone / tablet)
    //   the mouse moves, or WASD / arrows    -> hide it (PC: keyboard is enough)
    // Before any input, the first guess comes from the device type.
    function isPhoneLike() {
        return typeof navigator !== "undefined" &&
               /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    }
    function guessTouchDevice() {
        return window.matchMedia("(pointer: coarse)").matches || isPhoneLike();
    }

    let touchMode = guessTouchDevice();

    function applyJoystickVisibility() {
        base.style.display = touchMode ? "block" : "none";
        if (!touchMode) { joy.x = 0; joy.y = 0; }
        layoutJoystick();
    }

    function setTouchMode(on) {
        if (touchMode === on) return;
        touchMode = on;
        applyJoystickVisibility();
    }

    applyJoystickVisibility();

    // finger / pen -> touch mode.  Mouse -> PC mode (but never on a phone-like device,
    // because the browser's phone emulation also produces mouse events).
    window.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "touch" || e.pointerType === "pen") setTouchMode(true);
        else if (!isPhoneLike()) setTouchMode(false);
    }, true);
    window.addEventListener("pointermove", (e) => {
        if (e.pointerType === "mouse" && !isPhoneLike()) setTouchMode(false);
    }, { passive: true });
    window.addEventListener("keydown", (e) => {
        if (MOVE_KEYS.includes(e.key.toLowerCase())) setTouchMode(false);
    });

    // switching between PC and phone in the browser's device toolbar
    window.matchMedia("(pointer: coarse)").addEventListener?.("change", () => setTouchMode(guessTouchDevice()));
    window.addEventListener("resize", () => {
        if (isPhoneLike()) setTouchMode(true);
        layoutJoystick();
    });

    // ---- Dragging ----
    let activePointer = null;
    let centerX = 0, centerY = 0;

    function lightArrows(nx, ny) {                         // the arrow you push toward lights up
        const amount = { up: Math.max(0, -ny), down: Math.max(0, ny), left: Math.max(0, -nx), right: Math.max(0, nx) };
        for (const dir in arrowEls) {
            const v = Math.min(1, amount[dir] * 1.4);
            arrowEls[dir].style.opacity = String(0.8 + 0.2 * v);
            arrowEls[dir].style.filter = v > 0.35 ? "drop-shadow(0 0 4px #3f8f4a) brightness(1.15)" : "none";
        }
    }

    function moveKnob(e) {
        let dx = e.clientX - centerX;
        let dy = e.clientY - centerY;

        const dist = Math.hypot(dx, dy);
        if (dist > maxDist) {                  // keep the knob inside the pad
            dx *= maxDist / dist;
            dy *= maxDist / dist;
        }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;

        const nx = dx / maxDist;
        const ny = dy / maxDist;
        if (Math.hypot(nx, ny) < JOY_DEAD_ZONE) {
            joy.x = 0; joy.y = 0;
            lightArrows(0, 0);
        } else {
            joy.x = nx; joy.y = ny;
            lightArrows(nx, ny);
        }
    }

    function releaseKnob() {
        activePointer = null;
        knob.style.transition = "transform 0.14s ease-out";     // the knob springs back to the centre
        knob.style.transform = "translate(0px, 0px)";
        base.style.transform = "none";
        base.style.opacity = String(IDLE_OPACITY);          // see-through again
        base.style.cursor = "grab";
        joy.x = 0; joy.y = 0;
        lightArrows(0, 0);
    }

    base.addEventListener("pointerdown", (e) => {
        activePointer = e.pointerId;
        base.setPointerCapture(e.pointerId);
        const rect = base.getBoundingClientRect();           // measured once, so the knob does not jump while dragging
        centerX = rect.left + rect.width / 2;
        centerY = rect.top + rect.height / 2;
        knob.style.transition = "none";                      // the knob follows the finger without delay
        base.style.transform = "scale(1.04)";                // the pad grows a little: "you are holding it"
        base.style.opacity = String(HELD_OPACITY);           // and becomes clearer while it is held
        base.style.cursor = "grabbing";
        if (navigator.vibrate) navigator.vibrate(8);         // tiny buzz on phones that support it
        if (!hintSeen) {                                     // the hint has done its job
            hintSeen = true;
            hint.style.opacity = "0";
            setTimeout(() => { hint.style.display = "none"; }, 450);
            try { localStorage.setItem("zooJoystickUsed", "1"); } catch (err) { /* ignore */ }
        }
        moveKnob(e);
        e.preventDefault();
    });
    base.addEventListener("pointermove", (e) => {
        if (e.pointerId === activePointer) moveKnob(e);
    });
    base.addEventListener("pointerup", releaseKnob);
    base.addEventListener("pointercancel", releaseKnob);
    base.addEventListener("lostpointercapture", releaseKnob);
    base.addEventListener("contextmenu", (e) => e.preventDefault());   // no long-press menu on the pad
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
    ix += joy.x * JOYSTICK_SPEED_FACTOR;     // phone / tablet joystick: a bit slower than the keyboard
    iy += joy.y * JOYSTICK_SPEED_FACTOR;

    const len = Math.hypot(ix, iy);
    if (len < 0.01) return;                    // not moving
    if (len > 1) { ix /= len; iy /= len; }     // diagonal is not faster

    // 2. TRANSLATION:  x' = x + tx,  y' = y + ty   (done with the matrix T(tx, ty)).
    //    X and Y are tried separately, so the pointer slides along walls
    //    instead of getting stuck.
    // The speed is set in screen pixels, so the pointer feels equally fast on a small phone
    // (where the map is drawn small) and on a big PC screen. It is converted to map units here.
    const totalStep = (VISITOR_SCREEN_SPEED / viewScale) * dt;
    // The move is cut into small pieces, so even one slow frame can never jump over a wall edge.
    const pieces = Math.max(1, Math.ceil(totalStep / 8));
    const step = totalStep / pieces;

    for (let i = 0; i < pieces; i++) {
        const movedX = transformPoint(translationMatrix(ix * step, 0), visitor);
        if (canWalk(movedX.x, visitor.y)) visitor.x = movedX.x;
        const movedY = transformPoint(translationMatrix(0, iy * step), visitor);
        if (canWalk(visitor.x, movedY.y)) visitor.y = movedY.y;
    }

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
        const link = PAGE_LINKS[arrivedPlace.id];
        proximityPopupText.textContent = link ? link.question : "You reached " + arrivedPlace.name + ".";
        proximityPopupButton.textContent = link ? link.button : "View Details";
        proximityPopup.style.display = "flex";
    }
}

// ---------- Map board: outside area and wooden frame ----------

// ---------- Outside the board: a forest backdrop ----------
// Everything here is measured in SCREEN pixels. The grass, the trees and the dark edge
// shade are painted ONCE into a hidden canvas (cached), so each frame only copies that one
// picture. This keeps the page light. Only the fireflies are drawn live, because they glow.
let outsideBackdrop = null;     // cached picture: grass + forest + dark edge shade
let outsideItems = [];          // trees / bushes / flowers / rocks on both sides
let outsideFireflies = [];      // glowing dots

function buildOutside(screenW, screenH, pixelRatio) {
    // ---- 1. grass picture ----
    const grassPic = document.createElement("canvas");
    grassPic.width = canvas.width;
    grassPic.height = canvas.height;
    const c = grassPic.getContext("2d");
    c.scale(pixelRatio, pixelRatio);

    const grass = c.createLinearGradient(0, 0, 0, screenH);
    grass.addColorStop(0, OUTSIDE_COLOR_TOP);
    grass.addColorStop(1, OUTSIDE_COLOR_BOTTOM);
    c.fillStyle = grass;
    c.fillRect(0, 0, screenW, screenH);

    // mown-lawn stripes (slanted)
    c.fillStyle = "rgba(255, 255, 255, 0.05)";
    for (let x = -screenH * 0.5; x < screenW; x += 96) {
        c.beginPath();
        c.moveTo(x, 0); c.lineTo(x + 48, 0);
        c.lineTo(x + 48 + screenH * 0.5, screenH); c.lineTo(x + screenH * 0.5, screenH);
        c.fill();
    }

    // little grass tufts
    c.strokeStyle = "rgba(25, 85, 40, 0.3)";
    c.lineWidth = 1.4;
    c.lineCap = "round";
    for (let i = 0; i < 320; i++) {
        const gx = pseudoRandom(i * 1.7 + 3) * screenW;
        const gy = pseudoRandom(i * 3.1 + 9) * screenH;
        c.beginPath();
        c.moveTo(gx - 3, gy); c.lineTo(gx - 4.5, gy - 6);
        c.moveTo(gx, gy);     c.lineTo(gx, gy - 8);
        c.moveTo(gx + 3, gy); c.lineTo(gx + 4.5, gy - 6);
        c.stroke();
    }

    // ---- 2. dark edge shade (darker towards the corners of the screen) ----
    const shadePic = document.createElement("canvas");
    shadePic.width = canvas.width;
    shadePic.height = canvas.height;
    const sh = shadePic.getContext("2d");
    sh.scale(pixelRatio, pixelRatio);
    const shade = sh.createRadialGradient(screenW / 2, screenH / 2, Math.min(screenW, screenH) * 0.3,
                                          screenW / 2, screenH / 2, Math.hypot(screenW, screenH) * 0.55);
    shade.addColorStop(0, "rgba(6, 28, 14, 0.14)");   // slightly darker forest so the map board stands out
    shade.addColorStop(1, "rgba(6, 28, 14, 0.6)");
    sh.fillStyle = shade;
    sh.fillRect(0, 0, screenW, screenH);

    // ---- 3. forest on both sides of the board (only if there is room) ----
    outsideItems = [];
    outsideFireflies = [];

    const boardLeft = viewOffsetX + boardX * viewScale;
    const boardRight = boardLeft + boardW * viewScale;
    const keepOut = frameBand + 12;                  // trees stay this far away from the frame
    const cell = Math.max(110, 200 * viewScale);      // one forest "cell" in pixels (bigger = fewer trees)
    const MAX_DEPTH = 560;                           // forest is not drawn farther than this from the frame

    for (const side of [-1, 1]) {
        const free = side < 0 ? boardLeft - keepOut : screenW - boardRight - keepOut;   // free width on this side
        if (free < 70) continue;                      // phones / narrow screens: nothing to draw

        const depth = Math.min(free, MAX_DEPTH);
        const cols = Math.ceil(depth / cell);
        const rows = Math.ceil((screenH + 80) / cell);

        for (let r = 0; r < rows; r++) {
            for (let k = 0; k < cols; k++) {
                const seed = r * 31 + k * 7 + (side < 0 ? 0 : 1000);
                const pick = pseudoRandom(seed + 2.3);

                // only green trees and a few rocks
                // (no bushes or pink trees outside the frame)
                let type = "tree";
                if (pick > 0.92) type = "rock";

                // leave some cells empty so the forest is not crowded
                if (pseudoRandom(seed + 7.7) < 0.58) continue;

                const size = viewScale * (0.85 + 0.45 * pseudoRandom(seed + 3.1));
                let d = (k + 0.2 + 0.6 * pseudoRandom(seed)) * cell;     // distance from the frame
                d = Math.max(d, 34 * size);                              // never touch the frame
                if (d > free) continue;

                const y = (r + 0.2 + 0.6 * pseudoRandom(seed + 0.5)) * cell + 10;
                const x = side < 0 ? boardLeft - keepOut - d : boardRight + keepOut + d;
                outsideItems.push({ type: type, x: x, y: y, size: size });
            }
        }

        // fireflies float in the forest
        for (let i = 0; i < 9; i++) {
            const fx = side < 0 ? boardLeft - keepOut - pseudoRandom(i * 5.3 + side) * depth
                                : boardRight + keepOut + pseudoRandom(i * 5.3 + side) * depth;
            outsideFireflies.push({
                x: fx,
                y: pseudoRandom(i * 7.7 + side * 2) * screenH,
                phase: pseudoRandom(i * 2.9 + 1) * 6.28,
                speed: 0.4 + pseudoRandom(i * 4.1) * 0.6
            });
        }
    }

    outsideItems.sort((a, b) => a.y - b.y);          // lower objects are drawn later (they stand in front)

    // ---- 4. paint grass + forest + shade ONCE and keep the result ----
    // (the forest is drawn on the main canvas here, then copied into the cached picture;
    //  drawMap() paints over the main canvas right after, so nothing stays visible)
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(grassPic, 0, 0);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    for (const item of outsideItems) {
        drawSceneryItem(item, 0);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(shadePic, 0, 0);
    ctx.restore();

    outsideBackdrop = document.createElement("canvas");
    outsideBackdrop.width = canvas.width;
    outsideBackdrop.height = canvas.height;
    outsideBackdrop.getContext("2d").drawImage(canvas, 0, 0);
}

function drawOutside() {
    const dpr = window.devicePixelRatio || 1;
    const t = performance.now() / 1000;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // grass + forest + shade: one cached picture
    if (outsideBackdrop) {
        ctx.drawImage(outsideBackdrop, 0, 0);
    } else {
        ctx.fillStyle = OUTSIDE_COLOR_BOTTOM;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // fireflies: drift slowly and twinkle
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const f of outsideFireflies) {
        const x = f.x + Math.sin(t * f.speed + f.phase) * 14;
        const y = f.y + Math.cos(t * f.speed * 0.8 + f.phase) * 10;
        const glow = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 2.2 + f.phase * 3));
        ctx.fillStyle = "rgba(255, 235, 140, " + (0.16 * glow) + ")";
        ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255, 248, 190, " + glow + ")";
        ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
}

// Make the board shape the only place where drawing is visible (CLIPPING again)
function clipToBoard() {
    roundedRect(boardX, boardY, boardW, boardH, boardCorner);
    ctx.clip();
}

// Soft shadow just inside the frame, so the map looks set into the board
function drawBoardInnerShadow() {
    const px = 1 / viewScale;
    roundedRect(boardX, boardY, boardW, boardH, boardCorner);
    ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
    ctx.lineWidth = 12 * px;
    ctx.stroke();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.16)";
    ctx.lineWidth = 4 * px;
    ctx.stroke();
}

// The wooden frame around the board (all sizes come from screen pixels, so it looks
// the same thickness on every device)
function drawFrame() {
    const px = 1 / viewScale;               // one screen pixel, in map units
    const band = frameBand * px;            // frame thickness in map units

    // soft shadow on the dark green outside
    for (let i = 3; i >= 1; i--) {
        roundedRect(boardX - band - 1 * px, boardY - band - 1 * px,
                    boardW + 2 * band + 2 * px, boardH + 2 * band + 2 * px, boardCorner + band);
        ctx.strokeStyle = "rgba(0, 0, 0, 0.10)";
        ctx.lineWidth = i * 5 * px;
        ctx.stroke();
    }

    // the wood band (stroked half a band outside the board)
    const wood = ctx.createLinearGradient(boardX, boardY, boardX + boardW, boardY + boardH);
    wood.addColorStop(0, FRAME_WOOD_LIGHT);
    wood.addColorStop(1, FRAME_WOOD_DARK);
    roundedRect(boardX - band / 2, boardY - band / 2, boardW + band, boardH + band, boardCorner + band / 2);
    ctx.strokeStyle = wood;
    ctx.lineWidth = band;
    ctx.stroke();

    // dark outer edge and light inner edge give the frame some depth
    roundedRect(boardX - band, boardY - band, boardW + 2 * band, boardH + 2 * band, boardCorner + band);
    ctx.strokeStyle = FRAME_EDGE;
    ctx.lineWidth = 2 * px;
    ctx.stroke();

    roundedRect(boardX - 0.5 * px, boardY - 0.5 * px, boardW + px, boardH + px, boardCorner);
    ctx.strokeStyle = FRAME_HIGHLIGHT;
    ctx.lineWidth = 1.5 * px;
    ctx.stroke();

    // four little rivets in the corners
    const r = Math.max(1.6, band * 0.16) * px;
    const cx = band * 0.5;
    const corners = [
        [boardX - cx + boardCorner * 0.18, boardY - cx + boardCorner * 0.18],
        [boardX + boardW + cx - boardCorner * 0.18, boardY - cx + boardCorner * 0.18],
        [boardX - cx + boardCorner * 0.18, boardY + boardH + cx - boardCorner * 0.18],
        [boardX + boardW + cx - boardCorner * 0.18, boardY + boardH + cx - boardCorner * 0.18]
    ];
    for (const [x, y] of corners) {
        ctx.fillStyle = FRAME_EDGE;
        ctx.beginPath(); ctx.arc(x, y + r * 0.25, r * 1.15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = FRAME_HIGHLIGHT;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
}

// Draw complete map (order matters: later drawings appear on top)
function drawMap() {
    drawOutside();      // 0. forest outside the board
    ctx.save();
    clipToBoard();      //    everything below is only visible inside the board
    drawGrass();        // 1. grass
    drawGroundDetails();//    small grass tufts and petal flowers (covered by water, paths and trees)
    drawWater();        // 2. lake and stream (under the paths and the bridge)
    drawPaths();        // 3. shadows + ticket brick path + tiled walking paths
    drawBridge();       // 4. bridge on top of R3
    drawScenery();      // 5. trees, bushes, flowers, rocks, lily pads
    drawButterflies();  // 6. butterflies fly over the scenery
    drawDottedRoute();  // 7. blue dots on top of the path and bridge
    drawPlaces();       // 8. place badges and labels (they stand beside the path)
    drawVisitor();      // 9. visitor pointer, always on top
    drawBoardInnerShadow();
    ctx.restore();      //    end of the clip
    drawFrame();        // 10. wooden frame around the board
}

// Animation loop: move things, then redraw
let lastTime = null;

function animateRoute(now) {
    // dt = seconds since the last frame (capped, so a paused tab doesn't make a big jump)
    const dt = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    dashOffset += 0.5;
    if (dashOffset >= 15) {
        dashOffset = 0;
    }

    updateVisitor(dt);                   // the visitor moves with WASD / joystick
    checkNearbyPlace();                  // show View Details only after reaching a place
    checkBridge();                       // on the bridge: offer to watch the Vishwamitri animals

    drawMap();
    requestAnimationFrame(animateRoute);
}

// Map marker clicks do not reveal information. The arrival popup appears only
// at the location; the visitor must click View Details to open the full card.

// Resize canvas when window changes
window.addEventListener("resize", resizeCanvas);

// Start map. No arrival popup or information card appears on page load.
hideProximityPopup();
warnAboutSceneryOnPaths();          // prints a warning in the console if something stands on a path
if (EDIT_MODE) setupEditor();       // scenery editor: open the page with ?edit
resizeCanvas();
requestAnimationFrame(animateRoute);

// Opening screen: fades away after a moment (see ".splash" in style.css)
const splash = document.getElementById("splash");
if (splash) {
    setTimeout(function () { splash.classList.add("hide"); }, 1700);
}