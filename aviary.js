// ============================================================
// aviary.js  -  the Walk-in Aviary map.
//
// It is built the same way as main-map.js: tiled walkways with a soft shadow,
// a wooden bridge, a blue dotted guide line, the visitor pointer (WASD / arrow keys
// on a PC, joystick on a phone) and a map that fits every screen.
//
// FIXED VISITING SEQUENCE (the layout makes any other order impossible):
//
//     ENTRANCE (bottom)  ->  DOME 1  ->  BRIDGE  ->  DOME 2  ->  CAGE PATH  ->  EXIT (top)
//
//   * Entrance + dome 1 are ONE walkway (walkway 0). It ends under the west end of the bridge.
//     The entrance joins dome 1 at its south-east corner, but the BRIDGE passes OVER that
//     corner, so the visitor can never step from the junction onto the bridge.
//     The only way onto the bridge is to walk all the way round dome 1 to its west door.
//   * Dome 2 + cage path + exit are ONE walkway (walkway 1). It starts under the east end
//     of the bridge. The only way to reach the cages is to walk round dome 2 first.
//   * Walkways 2 and 3 are short side paths into the cage area (same ground, same walkway).
//
// Surfaces:
//   - entry stretch (bottom)  : ground tiles
//   - dome 1, bridge, dome 2  : wooden deck (planks + railings)
//   - cage path + exit        : ground tiles (same tiles as main-map.js, NOT a bridge)
//
// The map sits on a wooden-framed BOARD, like the main map (see "MAP BOARD" below).
// The blue dotted guide line is ONE continuous line from the entrance to the exit.
//
// No trees on this map for now.
// ============================================================

const canvas = document.getElementById("aviarySectionMap");
const screenCtx = canvas.getContext("2d");
let ctx = screenCtx;      // drawing goes to ctx (the screen, or a hidden layer while the map is being cached)

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
const GROUT_COLOR = "#bfae86";     // grout: a little darker than the tiles
const TILE_CORNER = 1.6;           // how round the corners of each stone are
const CURB_COLOR = "#d6c7a0";      // the lighter stone border along both edges of a ground path
const CURB_WIDTH = 4.5;            // thickness of that border (each side)
const TILE_BASE = { r: 224, g: 207, b: 169 };   // same beige as PATH_COLOR
const TILE_VARIATION = 8;          // +/- brightness change per tile (keep small!)
const TILE_RESOLUTION = 6;         // pixels per map unit in the tile image (keeps it sharp)

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

// ---------- Tile pattern ----------

// A repeatable "random" number between 0 and 1.
// The same input always gives the same output, so the tiles never flicker.
function pseudoRandom(n) {
    const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
}

// A rectangle with rounded corners, added to the current path of context c
function roundedTile(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
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

    // 2. Lay the stones like a brick wall (every second row is shifted by half a stone).
    //    Each stone is slightly rounded, has its own tone (a little warm or cool), a lit top
    //    edge, a shaded bottom edge and a few specks of grain.
    for (let row = 0; row < TILE_ROWS; row++) {
        const shift = (row % 2) * TILE_W / 2;

        for (let col = -1; col <= TILE_COLS; col++) {
            // wrap the column number, so the pattern repeats without a visible seam
            const wrapped = ((col % TILE_COLS) + TILE_COLS) % TILE_COLS;
            const seed = row * TILE_COLS + wrapped;

            const change = (pseudoRandom(seed) - 0.5) * 2 * TILE_VARIATION;
            const warm = (pseudoRandom(seed + 311) - 0.5) * 7;
            const r = Math.round(TILE_BASE.r + change + warm);
            const g = Math.round(TILE_BASE.g + change);
            const b = Math.round(TILE_BASE.b + change - warm);

            const x = col * TILE_W + shift + GROUT_WIDTH / 2;
            const y = row * TILE_H + GROUT_WIDTH / 2;
            const w = TILE_W - GROUT_WIDTH;
            const h = TILE_H - GROUT_WIDTH;

            tctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            roundedTile(tctx, x, y, w, h, TILE_CORNER);
            tctx.fill();

            // lit top edge and shaded bottom edge
            tctx.fillStyle = "rgba(255, 255, 255, 0.30)";
            tctx.fillRect(x + TILE_CORNER, y, w - 2 * TILE_CORNER, 0.9);
            tctx.fillStyle = "rgba(80, 60, 30, 0.20)";
            tctx.fillRect(x + TILE_CORNER, y + h - 1, w - 2 * TILE_CORNER, 1);

            // a few specks of stone grain
            for (let k = 0; k < 4; k++) {
                const sx = x + 2 + pseudoRandom(seed * 7 + k * 3.1) * (w - 4);
                const sy = y + 2 + pseudoRandom(seed * 5 + k * 1.7 + 9) * (h - 4);
                tctx.fillStyle = (k % 2) ? "rgba(255, 255, 255, 0.22)" : "rgba(90, 70, 40, 0.16)";
                tctx.beginPath();
                tctx.arc(sx, sy, 0.45, 0, Math.PI * 2);
                tctx.fill();
            }
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

// ======================================================================
// AVIARY GEOMETRY (from the sketch of the whole aviary)
// ======================================================================
// Every walkway is a LIST OF POINTS joined by straight lines, drawn as one thick line
// (60 wide, like the main map). The tiles, shadow, bridge, blue dots and visitor are the
// same as in main-map.js.

const PATH_WIDTH = 60;               // same road width as the main map

// Points are written in SKETCH pixels (exactly as in the sketch image), so you can compare
// them with the drawing. They are converted to map units with the two numbers below.
const CANVA_SCALE = 1.8;             // 1 sketch pixel = 1.8 map units  (bigger = bigger map)
const CANVA_ORIGIN = { x: 380, y: 200 };   // this sketch point becomes map (0, 0)

function canvaPoint(x, y) {
    return { x: (x - CANVA_ORIGIN.x) * CANVA_SCALE, y: (y - CANVA_ORIGIN.y) * CANVA_SCALE };
}
function canvaLine(list) {
    return list.map(function (p) { return canvaPoint(p[0], p[1]); });
}

// ---------- Curved corners ----------
// Every corner of a walkway is rounded, so the pointer glides round the bends.
// CORNER_RADIUS is the size of the curve (map units). 0 = sharp corners, bigger = rounder.
// (The road is 60 wide, so keep it at 45 or more, or the inside of a bend gets pinched.)
const CORNER_RADIUS = 70;
const CORNER_STEPS = 12;           // how many small pieces make up one curve

// Replace each corner of a list of points by a smooth curve (a quadratic Bezier curve:
// it starts on the first line, ends on the second one, and the corner is its control point).
function roundCorners(points, radius) {
    const out = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
        const p0 = points[i - 1], p1 = points[i], p2 = points[i + 1];
        const l1 = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        const l2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const u1 = { x: (p1.x - p0.x) / l1, y: (p1.y - p0.y) / l1 };
        const u2 = { x: (p2.x - p1.x) / l2, y: (p2.y - p1.y) / l2 };
        const turn = Math.acos(Math.max(-1, Math.min(1, u1.x * u2.x + u1.y * u2.y)));   // 0 = straight on

        if (turn < 0.02 || radius <= 0) { out.push(p1); continue; }

        // how far before / after the corner the curve starts and ends
        let d = radius * Math.tan(turn / 2);
        d = Math.min(d, l1 * 0.48, l2 * 0.48);
        const a = { x: p1.x - u1.x * d, y: p1.y - u1.y * d };
        const b = { x: p1.x + u2.x * d, y: p1.y + u2.y * d };

        for (let k = 0; k <= CORNER_STEPS; k++) {
            const t = k / CORNER_STEPS, m = 1 - t;
            out.push({
                x: m * m * a.x + 2 * m * t * p1.x + t * t * b.x,
                y: m * m * a.y + 2 * m * t * p1.y + t * t * b.y
            });
        }
    }
    out.push(points[points.length - 1]);
    return out;
}
function curvedLine(list) {
    return roundCorners(canvaLine(list), CORNER_RADIUS);
}

// Length of a line, the distance along it of the point nearest to p, and a piece cut out of it
function lineLength(line) {
    let total = 0;
    for (let i = 0; i < line.length - 1; i++) total += Math.hypot(line[i + 1].x - line[i].x, line[i + 1].y - line[i].y);
    return total;
}
function distanceAlong(line, p) {
    let best = Infinity, bestAlong = 0, walked = 0;
    for (let i = 0; i < line.length - 1; i++) {
        const a = line[i], b = line[i + 1];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (len * len);
        t = Math.max(0, Math.min(1, t));
        const d = Math.hypot(p.x - (a.x + (b.x - a.x) * t), p.y - (a.y + (b.y - a.y) * t));
        if (d < best) { best = d; bestAlong = walked + t * len; }
        walked += len;
    }
    return bestAlong;
}
function sliceLine(line, from, to) {
    const out = [];
    let walked = 0;
    for (let i = 0; i < line.length - 1; i++) {
        const a = line[i], b = line[i + 1];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const s0 = Math.max(from, walked), s1 = Math.min(to, walked + len);
        if (s1 > s0) {
            const at = function (s) {
                const t = (s - walked) / len;
                return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
            };
            if (out.length === 0) out.push(at(s0));
            out.push(at(s1));
        }
        walked += len;
    }
    return out;
}

// ---------- Walkways (ground level) ----------
const walkways = [
    // 0. ENTRANCE + DOME 1.
    //    Up the entrance (bottom), the short diagonal into the south-east corner of dome 1,
    //    then round dome 1 (north, west, south) and east along its bottom edge.
    //    It ends under the WEST end of the bridge.
    curvedLine([[700, 578], [700, 468], [655, 410], [655, 298], [588, 248], [428, 248],
                [375, 315], [375, 380], [455, 405], [540, 405]]),

    // 1. DOME 2 + CAGE PATH + EXIT.
    //    It starts under the EAST end of the bridge, goes round dome 2, then down to the cage
    //    path (bottom edge, right side, top edge) and leaves through the exit at the top.
    curvedLine([[680, 405], [715, 405], [762, 345], [850, 337], [928, 340], [995, 378],
                [990, 452], [915, 485], [835, 483], [745, 460], [745, 543],
                [1080, 543], [1080, 268], [810, 268], [810, 205]]),

    // 2. and 3. Short side paths leading to the cages (dead ends).
    // They start a little INSIDE the cage path (y = 540 / y = 500, not on the corner itself),
    // so they overlap it and join it with no gap, even where the cage path turns a rounded corner.
    curvedLine([[933, 540], [933, 600]]),
    curvedLine([[1080, 500], [1080, 610]])
];

// Which ground "way" each walkway belongs to (walkways 1, 2 and 3 are all connected on the ground)
const WAY_OF_WALKWAY = [0, 1, 1, 1];

// ---------- Bridge (the grey part of the sketch) ----------
// It runs from the west end of dome 1's bottom edge to the start of dome 2, OVER the corner
// where the entrance joins dome 1.
const bridge = (function () {
    const a = canvaPoint(515, 405);
    const b = canvaPoint(715, 405);
    return { x: a.x, y: a.y - PATH_WIDTH / 2, w: b.x - a.x, h: PATH_WIDTH };
})();

// ---------- Wooden deck: the part of the walkway that is a bridge ----------
// Dome 1 and dome 2 are wooden decks. The entry stretch (from y = 578 up to y = 500) stays ground tiles.
// Dome 2's deck runs down its tail and ends a little ABOVE the bend (sketch x = 745, y = 492), on the straight part.
// From there on (the bend, cage path, side paths, exit) it is ground tiles,
// and a dark beam across the path marks the step from the wooden deck onto the tiles.
// To make a stretch longer or shorter, change the sketch point used below.
const deckLines = [
    sliceLine(walkways[0], distanceAlong(walkways[0], canvaPoint(700, 500)), Infinity),
    sliceLine(walkways[1], 0, distanceAlong(walkways[1], canvaPoint(745, 492)))
];

// ---------- Blue dotted guide line ----------
// ONE continuous line from the entrance (bottom) to the exit (top):
//   entrance -> dome 1 -> over the bridge -> dome 2 -> cage path -> exit.
// It is drawn on top of everything, so it never disappears where the path goes under the bridge.
// Plus a short dotted branch into each of the two cage side paths.
const routeToBridge = sliceLine(walkways[0], 0, distanceAlong(walkways[0], canvaPoint(515, 405)));
const routeFromBridge = sliceLine(walkways[1], distanceAlong(walkways[1], canvaPoint(715, 405)), Infinity);
const mainRoute = routeToBridge.concat(
    [{ x: routeFromBridge[0].x, y: routeToBridge[routeToBridge.length - 1].y }],   // straight along the bridge
    routeFromBridge
);
// The dotted branches into the cages must start ON the blue line, so the line looks joined.
// (nearestOnLine finds the point of the main line that is closest to the place where the side path leaves.)
function nearestOnLine(line, p) {
    let best = Infinity, bestPoint = line[0];
    for (let i = 0; i < line.length - 1; i++) {
        const a = line[i], b = line[i + 1];
        const len2 = (b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y);
        let t = len2 === 0 ? 0 : ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / len2;
        t = Math.max(0, Math.min(1, t));
        const q = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < best) { best = d; bestPoint = q; }
    }
    return bestPoint;
}
// from the main line, to the corner where the side path starts, then down the side path (with a soft bend)
function cageBranch(startSketchPoint, endSketchPoint) {
    const start = canvaPoint(startSketchPoint[0], startSketchPoint[1]);
    const end = canvaPoint(endSketchPoint[0], endSketchPoint[1]);
    return roundCorners([nearestOnLine(mainRoute, start), start, end], 40);
}
const cageBranch1 = cageBranch([933, 543], [933, 600]);
const cageBranch2 = cageBranch([1080, 543], [1080, 610]);
const guideRoutes = [mainRoute, cageBranch1, cageBranch2];   // remove the last two to hide the cage branches

// ---------- View box: the part of the map that is fitted to the screen ----------
// Worked out from the walkways, with a free grass border around them.
const VIEW_PADDING = 36;
const view = (function () {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const line of walkways) {
        for (const p of line) {
            minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
        }
    }
    const pad = PATH_WIDTH / 2 + VIEW_PADDING;
    return { x: minX - pad, y: minY - pad, w: maxX - minX + 2 * pad, h: maxY - minY + 2 * pad };
})();

// This map is wide and a phone held upright is tall. If this is true, the map is turned a
// quarter turn on such a screen so it is drawn much bigger. The controls are turned with it,
// so pushing the joystick UP still moves the pointer UP on the screen.
// Desktop and tablets in landscape always show the map upright.
// false = the map always stays upright, on every device.
const ROTATE_ON_PORTRAIT = true;

// ======================================================================
// WALKABLE AREA: ground level and bridge level
// ======================================================================

// Each straight piece of a walkway is a rectangle that can be turned to any angle.
// Corners (points between two pieces) get a circle, so they stay walkable.
// The ground is split into TWO separate ways:
//   way 0 = entrance + dome 1
//   way 1 = dome 2 + cage path + side paths + exit
// so the visitor can never walk from one to the other on the ground, even where they pass
// close to each other under the bridge. The only link between them is the bridge.
const wayParts = [
    { segments: [], joints: [] },
    { segments: [], joints: [] }
];
walkways.forEach(function (line, n) {
    const part = wayParts[WAY_OF_WALKWAY[n]];
    for (let i = 0; i < line.length - 1; i++) {
        const a = line[i], b = line[i + 1];
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        part.segments.push({ ax: a.x, ay: a.y, dx: (b.x - a.x) / length, dy: (b.y - a.y) / length, length: length });
    }
    for (let i = 1; i < line.length - 1; i++) part.joints.push(line[i]);
});

// Is the point on ground walkway number "way"?
function pointOnWay(way, px, py) {
    const half = PATH_WIDTH / 2;
    const part = wayParts[way];

    for (const s of part.segments) {
        const rx = px - s.ax, ry = py - s.ay;
        const along = rx * s.dx + ry * s.dy;              // distance along the piece
        if (along < 0 || along > s.length) continue;
        const across = Math.abs(rx * s.dy - ry * s.dx);   // distance from its center line
        if (across <= half) return true;
    }
    for (const j of part.joints) {
        if (Math.hypot(px - j.x, py - j.y) <= half) return true;
    }
    return false;
}

// Is the point on the bridge deck?
function pointOnBridge(px, py) {
    return px >= bridge.x && px <= bridge.x + bridge.w && py >= bridge.y && py <= bridge.y + bridge.h;
}

// The bridge has exactly TWO doors:
//   west door  <->  way 0 (the end of dome 1)
//   east door  <->  way 1 (the start of dome 2)
// You can only step between the ground and the bridge through the door of the way you are on.
// The part of way 0 that passes UNDER the bridge (where the entrance joins dome 1) has no door,
// so you can never step up from it.
const BRIDGE_END_ZONE = 70;      // how far from each end of the bridge the door area reaches
function inDoorOfWay(way, px, py) {
    if (py < bridge.y - 10 || py > bridge.y + bridge.h + 10) return false;
    return way === 0 ? px < bridge.x + BRIDGE_END_ZONE
                     : px > bridge.x + bridge.w - BRIDGE_END_ZONE;
}

// ======================================================================
// VISITOR POINTER
// ======================================================================

// ---------- Visitor pointer settings (same as the main map) ----------
const VISITOR_START = canvaPoint(700, 560);   // ENTRY POINT: the bottom of the entrance path
const VISITOR_RADIUS = 15;                    // size of the pointer (also its collision circle)
const VISITOR_SCREEN_SPEED = 130;             // how fast the pointer moves ON THE SCREEN (pixels per second), the same on every device
const VISITOR_COLOR = "#168bff";
const JOYSTICK_SPEED_FACTOR = 0.72;           // 1 = same as keyboard, 0.72 = a bit slower on the phone joystick

// heading = angle the pointer faces (0 = right, PI = left)
// level   = "ground" or "bridge": which level the visitor is walking on
// way     = on the ground: which way (0 or 1) the visitor is on
const visitor = { x: VISITOR_START.x, y: VISITOR_START.y, heading: -Math.PI / 2, level: "ground", way: 0 };

// ---------- Collision ----------
// The visitor is a circle. It may stand at (x, y) on a level only if the center AND
// 8 points around its edge are all on that level (and, on the ground, on the SAME way).
function onLevel(level, way, px, py) {
    return level === "bridge" ? pointOnBridge(px, py) : pointOnWay(way, px, py);
}

function canStandOn(level, way, x, y) {
    if (!onLevel(level, way, x, y)) return false;

    for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        if (!onLevel(level, way, x + Math.cos(a) * VISITOR_RADIUS, y + Math.sin(a) * VISITOR_RADIUS)) {
            return false;
        }
    }
    return true;
}

// Try to move the visitor to (nx, ny).
function moveVisitorTo(nx, ny) {
    // 1. stay on the same level / way
    if (canStandOn(visitor.level, visitor.way, nx, ny)) {
        visitor.x = nx;
        visitor.y = ny;
        return;
    }

    if (visitor.level === "ground") {
        // 2. ground -> bridge: only through the door of the way you are standing on
        if (inDoorOfWay(visitor.way, visitor.x, visitor.y) && canStandOn("bridge", 0, nx, ny)) {
            visitor.level = "bridge";
            visitor.x = nx;
            visitor.y = ny;
        }
    } else {
        // 3. bridge -> ground: the west door leads to way 0, the east door to way 1
        for (let way = 0; way <= 1; way++) {
            if (inDoorOfWay(way, visitor.x, visitor.y) && canStandOn("ground", way, nx, ny)) {
                visitor.level = "ground";
                visitor.way = way;
                visitor.x = nx;
                visitor.y = ny;
                return;
            }
        }
    }
}

// Is the visitor walking on the ground UNDER the bridge deck? (then it is hidden by the deck)
function visitorIsUnderBridge() {
    return visitor.level === "ground" &&
           pointOnBridge(visitor.x, visitor.y) &&
           !inDoorOfWay(visitor.way, visitor.x, visitor.y);
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

// ---------- Controls: joystick (mobile + tablet only, right side) ----------
const JOY_SIZE = 130;          // diameter of the joystick base (screen pixels)
const JOY_DEAD_ZONE = 0.15;    // tiny thumb movements are ignored
const joy = { x: 0, y: 0 };    // joystick direction, each from -1 to 1

function createJoystick() {
    // The joystick is always created, but only SHOWN while touch is being used
    // (PC users use WASD). See "When is the joystick visible?" below.

    const knobSize = JOY_SIZE * 0.45;
    const maxDist = JOY_SIZE * 0.3;           // how far the knob can move from the center

    // z-index 5 keeps the joystick BELOW the information card (the card uses 10)
    const base = document.createElement("div");
    base.style.cssText =
        "position:fixed; z-index:5; border-radius:50%;" +
        `right:35px;` +
        `bottom:calc(110px + env(safe-area-inset-bottom, 0px));` +
        `width:${JOY_SIZE}px; height:${JOY_SIZE}px;` +
        "opacity:0.6; background:rgba(255,244,214,0.35); border:3px solid rgba(138,92,51,0.9);" +
        "box-shadow:0 2px 10px rgba(0,0,0,0.25);" +
        "touch-action:none; user-select:none; -webkit-user-select:none; -webkit-touch-callout:none;";

    const knob = document.createElement("div");
    knob.style.cssText =
        "position:absolute; left:50%; top:50%; border-radius:50%; pointer-events:none;" +
        `width:${knobSize}px; height:${knobSize}px;` +
        `margin:${-knobSize / 2}px 0 0 ${-knobSize / 2}px;` +
        "background:rgba(63,143,74,0.95); border:3px solid #fff4d6;" +
        "box-shadow:0 2px 6px rgba(0,0,0,0.3);";

    base.appendChild(knob);
    document.body.appendChild(base);

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
    });

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
    if (typeof isBirdCardOpen === "function" && isBirdCardOpen()) return;   // the visitor stands still while a card is open

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

    // If the map is shown turned a quarter turn, turn the controls back:
    // "up" on the screen must always walk "up" on the screen.
    if (viewRotated) {
        const screenX = ix;
        ix = iy;
        iy = -screenX;
    }

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
        moveVisitorTo(movedX.x, visitor.y);
        const movedY = transformPoint(translationMatrix(0, iy * step), visitor);
        moveVisitorTo(visitor.x, movedY.y);
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
// DRAWING
// ======================================================================

let dashOffset = 0;

// ---------- Grass ----------
// A small picture of grass with tufts and petal flowers is built ONCE and repeated over the
// whole screen. It is drawn on the screen (not on the map), so the blades always stand
// upright, even when the map is turned.
const GRASS_TILE_SIZE = 600;       // size of the repeating grass picture (screen pixels)
const GRASS_TUFTS = 560;
const GRASS_FLOWERS = 18;
const FLOWER_PETAL_COLORS = ["#f2e9d0", "#e58e92", "#f4c85a", "#b9a3e8"];
let grassPattern = null;

function buildGrassPattern(pixelRatio) {
    const size = GRASS_TILE_SIZE;
    const tile = document.createElement("canvas");
    tile.width = Math.round(size * pixelRatio);
    tile.height = Math.round(size * pixelRatio);
    const g = tile.getContext("2d");
    g.scale(pixelRatio, pixelRatio);

    g.fillStyle = GRASS_COLOR;
    g.fillRect(0, 0, size, size);

    g.lineWidth = 0.9;
    g.lineCap = "round";
    for (let i = 0; i < GRASS_TUFTS; i++) {
        const x = 8 + pseudoRandom(i * 1.9 + 11) * (size - 16);
        const y = 10 + pseudoRandom(i * 3.3 + 5) * (size - 20);
        g.strokeStyle = (i % 3 === 0) ? "#68985f" : "#bcd69d";
        g.beginPath();
        g.moveTo(x, y); g.lineTo(x - 1, y - 2.5);
        g.moveTo(x, y); g.lineTo(x + 0.5, y - 3);
        g.moveTo(x, y); g.lineTo(x + 1.5, y - 2);
        if (i % 3 === 1) {
            g.moveTo(x, y); g.lineTo(x - 2, y - 4.5);
            g.moveTo(x, y); g.lineTo(x + 1, y - 5);
            g.moveTo(x, y); g.lineTo(x + 2.5, y - 3.5);
        }
        g.stroke();
    }

    for (let i = 0; i < GRASS_FLOWERS; i++) {
        const x = 10 + pseudoRandom(i * 2.7 + 41) * (size - 20);
        const y = 10 + pseudoRandom(i * 4.9 + 17) * (size - 20);
        g.fillStyle = FLOWER_PETAL_COLORS[i % FLOWER_PETAL_COLORS.length];
        for (let a = 0; a < 5; a++) {
            const ang = a * Math.PI * 2 / 5;
            g.beginPath();
            g.arc(x + Math.cos(ang) * 2, y + Math.sin(ang) * 2, 1.2, 0, Math.PI * 2);
            g.fill();
        }
        g.fillStyle = "#e9b23a";
        g.beginPath(); g.arc(x, y, 1.1, 0, Math.PI * 2); g.fill();
    }

    return ctx.createPattern(tile, "repeat");
}

function drawGrass() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);          // screen pixels, ignore the map transform
    ctx.fillStyle = grassPattern || GRASS_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
}

// ---------- Walking paths ----------

// Add every walkway to the current path (one long line per walkway)
function traceWalkways() {
    ctx.beginPath();
    for (const line of walkways) {
        ctx.moveTo(line[0].x, line[0].y);
        for (let i = 1; i < line.length; i++) ctx.lineTo(line[i].x, line[i].y);
    }
}

// Soft shadow around the walkways and the bridge, so they look slightly raised.
// Three thin transparent layers stack up: dark near the edge, light farther away.
function drawShadow() {
    ctx.save();
    ctx.lineJoin = "miter";
    ctx.lineCap = "butt";

    for (let layer = 1; layer <= 3; layer++) {
        const s = SHADOW_SIZE * layer / 3;

        ctx.strokeStyle = SHADOW_COLOR;
        ctx.lineWidth = PATH_WIDTH + 2 * s;
        traceWalkways();
        ctx.stroke();

        ctx.fillStyle = SHADOW_COLOR;
        ctx.fillRect(bridge.x - s, bridge.y - s, bridge.w + 2 * s, bridge.h + 2 * s);
    }
    ctx.restore();
}

// Draw the walkways as tiles: a thick line whose "ink" is the tile pattern
// (this is also the finished look of the entry stretch, the cage path, the side paths and the exit)
function drawPaths() {
    drawShadow();

    ctx.save();
    ctx.lineJoin = "miter";
    ctx.lineCap = "butt";
    // 1. the lighter stone border (curb) along both edges
    ctx.lineWidth = PATH_WIDTH;
    ctx.strokeStyle = CURB_COLOR;
    traceWalkways();
    ctx.stroke();
    // 2. the stones, a little narrower, so the curb shows on both sides
    ctx.lineWidth = PATH_WIDTH - 2 * CURB_WIDTH;
    ctx.strokeStyle = tilePattern || PATH_COLOR;
    traceWalkways();
    ctx.stroke();
    ctx.restore();
}

// ---------- Bridge ----------

// Wooden deck made of planks that lie across the walking direction
function drawBridgeDeck() {
    let plankNumber = 0;

    for (let px = bridge.x; px < bridge.x + bridge.w; px += PLANK_WIDTH) {
        const width = Math.min(PLANK_WIDTH, bridge.x + bridge.w - px);

        // alternate two browns so the planks are easy to see
        ctx.fillStyle = (plankNumber % 2 === 0) ? DECK_COLOR_A : DECK_COLOR_B;
        ctx.fillRect(px, bridge.y, width, bridge.h);

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

    // posts: first post at the start, last post at the end, equal gaps between (about 40 apart)
    const gaps = Math.max(1, Math.round(length / 40));
    const spacing = (length - POST_SIZE) / gaps;
    const postY = railY - (POST_SIZE - RAIL_HEIGHT) / 2;   // centers the post on the bar

    ctx.fillStyle = POST_COLOR;
    for (let i = 0; i <= gaps; i++) {
        ctx.fillRect(xStart + i * spacing, postY, POST_SIZE, POST_SIZE);
    }
}

// Draw the whole bridge: deck, then both railings
function drawBridge() {
    drawBridgeDeck();

    // Top railing stops where the railing of dome 2's walkway starts (it bends away upwards).
    const railD = PATH_WIDTH / 2 - RAIL_HEIGHT / 2 - 1;
    const sideA = offsetLine(deckLines[1], railD), sideB = offsetLine(deckLines[1], -railD);
    const topSide = (sideA[0].y < sideB[0].y) ? sideA : sideB;
    let railEnd = bridge.x + bridge.w - 4;
    for (const p of topSide) {                      // first point where the top edge starts to bend upwards
        if (Math.abs(p.y - topSide[0].y) > 0.5) { railEnd = Math.min(railEnd, p.x + POST_SIZE / 2); break; }
    }
    drawRailing(bridge.x + 4, railEnd, bridge.y + 1);
    // Bottom railing runs the whole length.
    drawRailing(bridge.x + 4, bridge.x + bridge.w - 4, bridge.y + bridge.h - RAIL_HEIGHT - 1);
}

// ---------- Wooden deck of the walkway ----------

// Planks: the whole line is first painted with one wood color, then every second plank is
// painted a little darker. Planks lie ACROSS the walking direction, also on diagonal parts.
function drawDeckPlanks(line) {
    const half = PATH_WIDTH / 2;

    ctx.save();
    ctx.lineJoin = "miter";
    ctx.lineCap = "butt";
    ctx.miterLimit = 10;
    ctx.lineWidth = PATH_WIDTH;
    ctx.strokeStyle = DECK_COLOR_A;
    ctx.beginPath();
    ctx.moveTo(line[0].x, line[0].y);
    for (let i = 1; i < line.length; i++) ctx.lineTo(line[i].x, line[i].y);
    ctx.stroke();

    const leftSide = offsetLine(line, half);
    const rightSide = offsetLine(line, -half);

    let walked = 0;                                   // distance from the start of the deck line
    for (let i = 0; i < line.length - 1; i++) {
        const a = line[i], b = line[i + 1];
        const length = Math.hypot(b.x - a.x, b.y - a.y);

        ctx.save();

        // this piece only: the area between the two corner cuts (so planks never overlap at corners)
        ctx.beginPath();
        ctx.moveTo(leftSide[i].x, leftSide[i].y);
        ctx.lineTo(leftSide[i + 1].x, leftSide[i + 1].y);
        ctx.lineTo(rightSide[i + 1].x, rightSide[i + 1].y);
        ctx.lineTo(rightSide[i].x, rightSide[i].y);
        ctx.closePath();
        ctx.clip();

        ctx.translate(a.x, a.y);
        ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x));    // x axis now runs along this piece

        // planks are counted along the whole line, so they alternate smoothly round the curves
        const first = Math.floor((walked - PATH_WIDTH) / PLANK_WIDTH);
        const last = Math.ceil((walked + length + PATH_WIDTH) / PLANK_WIDTH);
        for (let k = first; k <= last; k++) {
            const t = k * PLANK_WIDTH - walked;           // where this plank starts on this piece
            if (k % 2 !== 0) {
                ctx.fillStyle = DECK_COLOR_B;
                ctx.fillRect(t, -half, PLANK_WIDTH, PATH_WIDTH);
            }
            ctx.fillStyle = PLANK_SEAM_COLOR;             // thin dark gap between planks
            ctx.fillRect(t, -half, 1, PATH_WIDTH);
        }
        ctx.restore();
        walked += length;
    }
    ctx.restore();
}

// A line moved sideways by d (left of the walking direction if d > 0).
// Corners are joined with a miter, so the result stays parallel to the walkway.
function offsetLine(line, d) {
    const normals = [];
    for (let i = 0; i < line.length - 1; i++) {
        const dx = line[i + 1].x - line[i].x, dy = line[i + 1].y - line[i].y;
        const len = Math.hypot(dx, dy);
        normals.push({ x: -dy / len, y: dx / len });
    }
    const out = [];
    for (let i = 0; i < line.length; i++) {
        const p = line[i];
        if (i === 0) {
            out.push({ x: p.x + normals[0].x * d, y: p.y + normals[0].y * d });
        } else if (i === line.length - 1) {
            const n = normals[i - 1];
            out.push({ x: p.x + n.x * d, y: p.y + n.y * d });
        } else {
            const n1 = normals[i - 1], n2 = normals[i];
            let mx = n1.x + n2.x, my = n1.y + n2.y;
            const ml = Math.hypot(mx, my);
            mx /= ml; my /= ml;
            const k = d / (mx * n1.x + my * n1.y);
            out.push({ x: p.x + mx * k, y: p.y + my * k });
        }
    }
    return out;
}

// One railing along a list of points: a long bar with square posts about 40 apart
function drawRailAlong(points) {
    ctx.save();
    ctx.lineJoin = "miter";
    ctx.lineCap = "butt";
    ctx.lineWidth = RAIL_HEIGHT;
    ctx.strokeStyle = RAIL_COLOR;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();

    ctx.fillStyle = POST_COLOR;
    const post = function (x, y) {
        ctx.fillRect(x - POST_SIZE / 2, y - POST_SIZE / 2, POST_SIZE, POST_SIZE);
    };
    // posts are placed by distance along the rail (about 40 apart), so curves don't get crowded
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) total += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
    const gaps = Math.max(1, Math.round(total / 40));
    let walked = 0, next = 0;
    for (let i = 0; i < points.length - 1; i++) {
        const a = points[i], b = points[i + 1];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        while (next <= gaps && next * total / gaps <= walked + len + 0.001) {
            const t = len > 0 ? (next * total / gaps - walked) / len : 0;
            post(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
            next++;
        }
        walked += len;
    }
    ctx.restore();
}

// Both railings of a deck line
function drawDeckRails(line) {
    const d = PATH_WIDTH / 2 - RAIL_HEIGHT / 2 - 1;
    drawRailAlong(offsetLine(line, d));
    drawRailAlong(offsetLine(line, -d));
}

// A dark beam across each open end of a deck (where you step onto / off the bridge)
function drawDeckEnds(line) {
    const half = PATH_WIDTH / 2;
    const ends = [
        { p: line[0], q: line[1] },
        { p: line[line.length - 1], q: line[line.length - 2] }
    ];
    ctx.save();
    ctx.fillStyle = RAIL_COLOR;
    for (const e of ends) {
        ctx.save();
        ctx.translate(e.p.x, e.p.y);
        ctx.rotate(Math.atan2(e.p.y - e.q.y, e.p.x - e.q.x));   // x axis points OUT of the deck
        ctx.fillRect(-3, -half, 3, PATH_WIDTH);
        ctx.restore();
    }
    ctx.restore();
}

// The bridge that crosses over the walkway lies above it, so it throws a shadow on it
function drawBridgeShadow() {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
    ctx.fillRect(bridge.x - 4, bridge.y - 2, bridge.w + 8, bridge.h + 10);
    ctx.restore();
}

// ---------- Dotted route ----------

// Draw blue dotted lines along a list of routes
function drawDottedRoute(routes) {
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

// The parts of the map that never move are drawn ONCE into two hidden pictures (layers)
// and only copied to the screen every frame. This keeps the map smooth on a phone.
let baseLayer = null;      // grass, walkways, wooden deck, railings
let bridgeLayer = null;    // the bridge that crosses over (and its shadow)
let viewMatrix = [1, 0, 0, 1, 0, 0];

function makeLayer(drawIt) {
    const layer = document.createElement("canvas");
    layer.width = canvas.width;
    layer.height = canvas.height;
    const layerCtx = layer.getContext("2d");
    layerCtx.setTransform(viewMatrix[0], viewMatrix[1], viewMatrix[2], viewMatrix[3], viewMatrix[4], viewMatrix[5]);
    ctx = layerCtx;                    // everything the drawing functions draw now goes into the layer
    drawIt();
    ctx = screenCtx;
    return layer;
}

function buildLayers() {
    baseLayer = makeLayer(function () {
        drawGrass();
        drawPaths();                                           // shadows + tiled walkways (entry, cage path, side paths and exit stay tiles)
        for (const line of deckLines) drawDeckPlanks(line);    // wooden deck of dome 1 and dome 2
        for (const line of deckLines) { drawDeckEnds(line); drawDeckRails(line); }
    });
    bridgeLayer = makeLayer(function () {
        drawBridgeShadow();
        drawBridge();
    });
}

function drawLayer(layer) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
}

// ======================================================================
// MAP BOARD (same look as the main map)
// ======================================================================
// The map is shown on a board with a wooden frame, on a dark forest-green backdrop.
// Everything here is measured in SCREEN pixels, so the frame is the same thickness on every device
// (also when the map itself is turned a quarter turn on a phone).
const OUTSIDE_COLOR_TOP = "#78b062";      // backdrop around the board (top)
const OUTSIDE_COLOR_BOTTOM = "#4b8648";   // (bottom)
const FRAME_WOOD_LIGHT = "#a8743f";
const FRAME_WOOD_DARK = "#7a4f2a";
const FRAME_EDGE = "#4a2f18";
const FRAME_HIGHLIGHT = "#d9ad72";
const BOARD_CORNER = 16;                  // rounded corner of the board (screen pixels)

let board = { x: 0, y: 0, w: 0, h: 0, band: 10 };   // the board rectangle + frame thickness
let pixelRatioNow = 1;
let outsideBackdrop = null;               // cached picture of the backdrop

// Rounded rectangle path (used for the board, its shadow and the frame)
function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// The backdrop is painted ONCE into a hidden picture and only copied every frame
function buildOutside(screenW, screenH, pixelRatio) {
    const pic = document.createElement("canvas");
    pic.width = canvas.width;
    pic.height = canvas.height;
    const c = pic.getContext("2d");
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

    // dark edge shade (darker towards the corners of the screen)
    const shade = c.createRadialGradient(screenW / 2, screenH / 2, Math.min(screenW, screenH) * 0.3,
                                         screenW / 2, screenH / 2, Math.hypot(screenW, screenH) * 0.55);
    shade.addColorStop(0, "rgba(6, 28, 14, 0.14)");
    shade.addColorStop(1, "rgba(6, 28, 14, 0.6)");
    c.fillStyle = shade;
    c.fillRect(0, 0, screenW, screenH);

    outsideBackdrop = pic;
}

function drawOutside() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (outsideBackdrop) {
        ctx.drawImage(outsideBackdrop, 0, 0);
    } else {
        ctx.fillStyle = OUTSIDE_COLOR_BOTTOM;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.restore();
}

// Soft shadow just inside the frame, so the map looks set into the board
function drawBoardInnerShadow() {
    roundedRect(board.x, board.y, board.w, board.h, BOARD_CORNER);
    ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.16)";
    ctx.lineWidth = 4;
    ctx.stroke();
}

// The wooden frame around the board
function drawFrame() {
    const b = board, band = b.band;

    ctx.save();
    ctx.setTransform(pixelRatioNow, 0, 0, pixelRatioNow, 0, 0);

    // soft shadow on the dark green outside
    for (let i = 3; i >= 1; i--) {
        roundedRect(b.x - band - 1, b.y - band - 1, b.w + 2 * band + 2, b.h + 2 * band + 2, BOARD_CORNER + band);
        ctx.strokeStyle = "rgba(0, 0, 0, 0.10)";
        ctx.lineWidth = i * 5;
        ctx.stroke();
    }

    // the wood band (stroked half a band outside the board)
    const wood = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
    wood.addColorStop(0, FRAME_WOOD_LIGHT);
    wood.addColorStop(1, FRAME_WOOD_DARK);
    roundedRect(b.x - band / 2, b.y - band / 2, b.w + band, b.h + band, BOARD_CORNER + band / 2);
    ctx.strokeStyle = wood;
    ctx.lineWidth = band;
    ctx.stroke();

    // dark outer edge and light inner edge give the frame some depth
    roundedRect(b.x - band, b.y - band, b.w + 2 * band, b.h + 2 * band, BOARD_CORNER + band);
    ctx.strokeStyle = FRAME_EDGE;
    ctx.lineWidth = 2;
    ctx.stroke();

    roundedRect(b.x - 0.5, b.y - 0.5, b.w + 1, b.h + 1, BOARD_CORNER);
    ctx.strokeStyle = FRAME_HIGHLIGHT;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // four little rivets in the corners
    const r = Math.max(1.6, band * 0.16);
    const cx = band * 0.5;
    const corners = [
        [b.x - cx + BOARD_CORNER * 0.18, b.y - cx + BOARD_CORNER * 0.18],
        [b.x + b.w + cx - BOARD_CORNER * 0.18, b.y - cx + BOARD_CORNER * 0.18],
        [b.x - cx + BOARD_CORNER * 0.18, b.y + b.h + cx - BOARD_CORNER * 0.18],
        [b.x + b.w + cx - BOARD_CORNER * 0.18, b.y + b.h + cx - BOARD_CORNER * 0.18]
    ];
    for (const [x, y] of corners) {
        ctx.fillStyle = FRAME_EDGE;
        ctx.beginPath(); ctx.arc(x, y + r * 0.25, r * 1.15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = FRAME_HIGHLIGHT;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

// ======================================================================
// BIRD SPOTS (placeholder markers)
// ======================================================================
// Every bird gets the SAME placeholder marker (a round badge + the bird's name).
// When the visitor walks close to a marker, a popup "You reached ... [View Details]" appears,
// and the button opens the bird card (bird-card.js, data from data/aviary-data.js).
//
// TO ADD ANOTHER BIRD: add one line to birdSpots.
//   id    = the "id" of the bird in data/aviary-data.js
//   point = where the marker stands. canvaPoint(x, y) uses the same sketch pixels as the walkways,
//           so pick a spot on the grass just NEXT to a path (about 35 px from the path's center line,
//           and with free grass below it, because the name label is drawn under the badge).
const birdSpots = [
    { id: "african-grey-parrot",    point: canvaPoint(831, 585) },
    { id: "blue-and-golden-macaw",  point: canvaPoint(780, 583) }
];

const BIRD_TRIGGER = 80;          // how close the visitor must be (map units) to get the popup
const BIRD_BADGE_RADIUS = 17;     // size of the round badge (screen pixels)

function birdName(id) {
    const bird = (typeof aviaryBirds !== "undefined") && aviaryBirds.find(function (b) { return b.id === id; });
    return bird ? bird.name : id;
}

// The marker is drawn in SCREEN pixels, so the badge and the name always stay upright and the same
// size, even when the map is turned a quarter turn on a phone.
function drawBirdSpots() {
    const t = performance.now() / 1000;

    ctx.save();
    ctx.setTransform(pixelRatioNow, 0, 0, pixelRatioNow, 0, 0);

    const placedMarkers = [];
    for (const spot of placePreview ? birdSpots.concat([placePreview]) : birdSpots) {
        const p = spot.point;
        const sx = (viewMatrix[0] * p.x + viewMatrix[2] * p.y + viewMatrix[4]) / pixelRatioNow;
        const sy = (viewMatrix[1] * p.x + viewMatrix[3] * p.y + viewMatrix[5]) / pixelRatioNow;
        const R = BIRD_BADGE_RADIUS;

        // soft pulsing ring
        const pulse = (t * 0.8) % 1;
        ctx.strokeStyle = "rgba(63, 143, 74, " + ((1 - pulse) * 0.55) + ")";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(sx, sy, R + 3 + pulse * 12, 0, Math.PI * 2); ctx.stroke();

        // badge: shadow, wooden ring, cream face, bird
        ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
        ctx.beginPath(); ctx.arc(sx, sy + 2, R + 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#6f4524";
        ctx.beginPath(); ctx.arc(sx, sy, R + 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff4d6";
        ctx.beginPath(); ctx.arc(sx, sy, R - 1, 0, Math.PI * 2); ctx.fill();
        ctx.font = "18px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#000";
        ctx.fillText("🐦", sx, sy + 1);

        // name label under the badge
        const name = birdName(spot.id);
        ctx.font = "700 12px 'Trebuchet MS', 'Segoe UI', sans-serif";
        const w = ctx.measureText(name).width + 16;
        // the name goes under the badge; if another bird stands close by, it goes ABOVE the badge instead,
        // so two neighbouring names never print on top of each other
        const crowded = placedMarkers.some(function (q) { return Math.abs(q.x - sx) < 150 && Math.abs(q.y - sy) < 56; });
        placedMarkers.push({ x: sx, y: sy });
        const lh = 20;
        const lx = sx - w / 2, ly = crowded ? sy - R - 6 - lh : sy + R + 6;
        ctx.fillStyle = "#6f4524";
        ctx.beginPath();
        ctx.moveTo(lx + 8, ly);
        ctx.arcTo(lx + w, ly, lx + w, ly + lh, 8);
        ctx.arcTo(lx + w, ly + lh, lx, ly + lh, 8);
        ctx.arcTo(lx, ly + lh, lx, ly, 8);
        ctx.arcTo(lx, ly, lx + w, ly, 8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#4e3119";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#fff4d6";
        ctx.fillText(name, sx, ly + lh / 2 + 0.5);
    }
    ctx.restore();
}

// ---------- "You reached ..." popup (same look as the main map) ----------
const birdPopup = document.createElement("div");
birdPopup.className = "arrival-popup";
birdPopup.innerHTML =
    '<span class="arrival-popup-icon">🐦</span>' +
    '<span class="arrival-popup-text"></span>' +
    '<button type="button">View Details</button>';
document.body.appendChild(birdPopup);

let birdNearby = null;            // the bird id the popup is showing now (or null)

birdPopup.querySelector("button").addEventListener("click", function () {
    if (birdNearby) openBirdCard(birdNearby);
});

function updateBirdPopup() {
    // the CLOSEST bird within range wins (two birds can stand near each other)
    let found = null, best = BIRD_TRIGGER;
    for (const spot of birdSpots) {
        const dist = Math.hypot(visitor.x - spot.point.x, visitor.y - spot.point.y);
        if (dist <= best) { best = dist; found = spot.id; }
    }
    if (found === birdNearby) return;              // nothing changed
    birdNearby = found;
    if (found) {
        birdPopup.querySelector(".arrival-popup-text").textContent = "You reached " + birdName(found);
        birdPopup.style.display = "flex";
    } else {
        birdPopup.style.display = "none";
    }
}

// ---------- Placement helper: open aviary.html?place ----------
// Click the map where a bird should stand. A "New spot" marker appears there and a panel shows the
// exact line to paste into birdSpots (click the panel to copy it). Nothing is saved by itself.
let placePreview = null;

if (new URLSearchParams(location.search).has("place")) {
    const panel = document.createElement("div");
    panel.style.cssText =
        "position:fixed; left:14px; bottom:calc(14px + env(safe-area-inset-bottom, 0px)); z-index:6;" +
        "max-width:min(420px, calc(100vw - 28px)); padding:12px 14px; cursor:pointer;" +
        "color:#fff; font:600 13px/1.45 'Trebuchet MS', 'Segoe UI', sans-serif;" +
        "background:rgba(38,50,56,0.94); border-radius:14px; box-shadow:0 8px 22px rgba(0,0,0,0.35);";
    panel.innerHTML = "<b>Placement helper</b><br>Click the map where the bird should stand.";
    document.body.appendChild(panel);

    canvas.addEventListener("click", function (e) {
        // screen -> map: undo the view matrix (it also covers the quarter turn on phones)
        const rect = canvas.getBoundingClientRect();
        const X = (e.clientX - rect.left) * (canvas.width / rect.width);
        const Y = (e.clientY - rect.top) * (canvas.height / rect.height);
        const [a, b, c, d, tx, ty] = viewMatrix;
        const det = a * d - b * c;
        const mx = (d * (X - tx) - c * (Y - ty)) / det;
        const my = (-b * (X - tx) + a * (Y - ty)) / det;

        // map -> sketch pixels (the numbers canvaPoint() takes)
        const sx = Math.round(mx / CANVA_SCALE + CANVA_ORIGIN.x);
        const sy = Math.round(my / CANVA_SCALE + CANVA_ORIGIN.y);

        placePreview = { id: "New spot", point: canvaPoint(sx, sy) };
        const line = '{ id: "BIRD-ID", point: canvaPoint(' + sx + ', ' + sy + ') },';
        panel.innerHTML = "<b>Paste this into birdSpots</b> (click here to copy):<br>" +
                          "<code style='color:#ffd54f'>" + line + "</code><br>" +
                          "Change BIRD-ID to the bird's id from data/aviary-data.js.";
        panel.onclick = function () {
            if (navigator.clipboard) navigator.clipboard.writeText(line).catch(function () {});
        };
    });
}

// Draw complete map (order matters: later drawings appear on top)
function drawMap() {
    if (!baseLayer) return;

    drawOutside();                                   // 0. backdrop around the board

    ctx.save();
    ctx.setTransform(pixelRatioNow, 0, 0, pixelRatioNow, 0, 0);
    roundedRect(board.x, board.y, board.w, board.h, BOARD_CORNER);
    ctx.clip();                                      //    everything below is only visible inside the board
    ctx.setTransform(viewMatrix[0], viewMatrix[1], viewMatrix[2], viewMatrix[3], viewMatrix[4], viewMatrix[5]);

    drawLayer(baseLayer);                            // 1-3. grass, walkways, wooden deck, railings
    if (visitorIsUnderBridge()) drawVisitor();       // 4. a visitor walking UNDER the bridge is drawn before the bridge
    drawLayer(bridgeLayer);                          // 5. the bridge lies over everything below it
    drawDottedRoute(guideRoutes);                    // 6. ONE continuous blue dotted line, entrance to exit
    drawBirdSpots();                                 // 7. bird placeholder markers
    if (!visitorIsUnderBridge()) drawVisitor();      // 8. visitor pointer, on top

    ctx.setTransform(pixelRatioNow, 0, 0, pixelRatioNow, 0, 0);
    drawBoardInnerShadow();
    ctx.restore();                                   //    end of the clip

    drawFrame();                                     // 8. wooden frame around the board
}

// ======================================================================
// SCREEN FITTING (responsive)
// ======================================================================

// How the map sits on the screen (set in resizeCanvas)
let viewScale = 1;          // map unit -> screen pixel
let viewRotated = false;    // true = the map is shown turned a quarter turn

function resizeCanvas() {
    const pixelRatio = window.devicePixelRatio || 1;
    const screenWidth = canvas.clientWidth;
    const screenHeight = canvas.clientHeight;

    canvas.width = Math.round(screenWidth * pixelRatio);
    canvas.height = Math.round(screenHeight * pixelRatio);

    // Free space kept around the map (screen pixels): small on phones, bigger on big screens
    const margin = Math.round(Math.max(6, Math.min(24, Math.min(screenWidth, screenHeight) * 0.022)));
    const freeW = screenWidth - 2 * margin;
    const freeH = screenHeight - 2 * margin;

    // The board: the whole screen minus the margin. The wooden frame is drawn in that margin.
    pixelRatioNow = pixelRatio;
    board = { x: margin, y: margin, w: freeW, h: freeH, band: Math.round(margin * 0.8) };
    buildOutside(screenWidth, screenHeight, pixelRatio);

    // How big can the map be drawn upright, and how big when turned a quarter turn?
    const uprightScale = Math.min(freeW / view.w, freeH / view.h);
    const turnedScale = Math.min(freeW / view.h, freeH / view.w);

    // Turn it only when that makes it clearly bigger (a tall phone screen)
    viewRotated = ROTATE_ON_PORTRAIT && turnedScale > uprightScale * 1.15;
    viewScale = viewRotated ? turnedScale : uprightScale;

    const s = viewScale;
    const cx = view.x + view.w / 2;       // center of the map's view box
    const cy = view.y + view.h / 2;

    if (viewRotated) {
        // turned 90 degrees clockwise: map "down" points to the left of the screen
        viewMatrix = [
            0, pixelRatio * s,
            -pixelRatio * s, 0,
            pixelRatio * (screenWidth / 2 + s * cy),
            pixelRatio * (screenHeight / 2 - s * cx)
        ];
    } else {
        viewMatrix = [
            pixelRatio * s, 0,
            0, pixelRatio * s,
            pixelRatio * (screenWidth / 2 - s * cx),
            pixelRatio * (screenHeight / 2 - s * cy)
        ];
    }
    screenCtx.setTransform(viewMatrix[0], viewMatrix[1], viewMatrix[2], viewMatrix[3], viewMatrix[4], viewMatrix[5]);

    grassPattern = buildGrassPattern(pixelRatio);
    buildLayers();
    drawMap();
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
    updateBirdPopup();                   // "You reached ..." popup near a bird

    drawMap();
    requestAnimationFrame(animateRoute);
}

// Resize canvas when window changes
window.addEventListener("resize", resizeCanvas);

// Start map
resizeCanvas();
requestAnimationFrame(animateRoute);