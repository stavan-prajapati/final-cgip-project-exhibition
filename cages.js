// ============================================================
// cages.js  -  the Caged Birds map.
//
// It is built exactly like aviary.js and main-map.js: tiled walkways with a soft shadow and a stone border,
// a blue dotted guide line, the visitor pointer (WASD / arrow keys on a PC, or the "Select Location" list: tap a bird and the pointer walks there), a wooden-framed
// board and a map that fits every screen. Birds are placed in birdSpots (see BIRD SPOTS below); open cages.html?place to find the coordinates.
//
// THE WALK (the cage part of the sketch of the whole aviary):
//
//     ENTRY (top left, coming from the aviary)  ->  bottom edge  ->  right side  ->  top edge  ->  EXIT (top)
//
//   * The two short side paths going down from the bottom edge lead to the cages.
//     The blue dotted guide line goes into both of them.
//   * Every point is written in SKETCH pixels (the same numbers and the same stretch as aviary.js),
//     so the old bird spots of the aviary map can be reused here without changing a number.
// ============================================================

const canvas = document.getElementById("cagesMap");
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
const TILE_RESOLUTION = 3;         // pixels per map unit in the tile image (keeps it sharp)

// Soft shadow around the walkway
const SHADOW_COLOR = "rgba(0, 0, 0, 0.08)";     // one soft shadow layer
const SHADOW_SIZE = 6;                          // how far the shadow spreads outside the path


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
// CAGE MAP: SIZES AND HELPERS
// ======================================================================

const PATH_WIDTH = 60;               // same road width as the main map

// Points are written in SKETCH pixels (exactly as in the sketch image), so you can compare
// them with the drawing. They are converted to map units with the two numbers below.
const CANVA_SCALE = 1.8;             // 1 sketch pixel = 1.8 map units  (bigger = bigger map)
const CANVA_ORIGIN = { x: 380, y: 200 };   // this sketch point becomes map (0, 0)


// ---------- Wider bird walk ----------
// The part of the map from the dome 2 tail (sketch x = 745) to the right edge of the cage area (x = 1080)
// is stretched sideways, so the bottom path is LONGER and every bird along it gets more room.
// Everything (walkways, blue dots, bird spots) is stretched together, and you keep writing the SAME sketch
// numbers in canvaPoint(x, y). 1 = no stretch, 1.35 = 35% longer. (Make it bigger for even more room.)
const STRETCH_FROM = 745;
const STRETCH_TO = 1080;
const STRETCH = 2.35;

function stretchX(x) {
    if (x <= STRETCH_FROM) return x;
    if (x <= STRETCH_TO) return STRETCH_FROM + (x - STRETCH_FROM) * STRETCH;
    return x + (STRETCH_TO - STRETCH_FROM) * (STRETCH - 1);          // right of the cage area: just moved over
}
function unstretchX(x) {                                               // the way back (used by the ?place helper)
    const end = STRETCH_FROM + (STRETCH_TO - STRETCH_FROM) * STRETCH;
    if (x <= STRETCH_FROM) return x;
    if (x <= end) return STRETCH_FROM + (x - STRETCH_FROM) / STRETCH;
    return x - (STRETCH_TO - STRETCH_FROM) * (STRETCH - 1);
}

// ---------- Taller right side ----------
// The same idea, but UP AND DOWN: the part of the map from the top edge (sketch y = 268) to the bottom edge (y = 543)
// is stretched, so the RIGHT-HAND path is longer and its birds (Ring-necked Pheasant, Golden Pheasant, Zebra Finch,
// Diamond Dove) get more room. Everything below y = 543 simply moves down. 1 = no stretch, 1.5 = 50% longer.
const STRETCH_Y_FROM = 268;
const STRETCH_Y_TO = 543;
const STRETCH_Y = 1.35;

function stretchY(y) {
    if (y <= STRETCH_Y_FROM) return y;
    if (y <= STRETCH_Y_TO) return STRETCH_Y_FROM + (y - STRETCH_Y_FROM) * STRETCH_Y;
    return y + (STRETCH_Y_TO - STRETCH_Y_FROM) * (STRETCH_Y - 1);
}
function unstretchY(y) {                                               // the way back (used by the ?place helper)
    const end = STRETCH_Y_FROM + (STRETCH_Y_TO - STRETCH_Y_FROM) * STRETCH_Y;
    if (y <= STRETCH_Y_FROM) return y;
    if (y <= end) return STRETCH_Y_FROM + (y - STRETCH_Y_FROM) / STRETCH_Y;
    return y - (STRETCH_Y_TO - STRETCH_Y_FROM) * (STRETCH_Y - 1);
}

function canvaPoint(x, y) {
    return { x: (stretchX(x) - CANVA_ORIGIN.x) * CANVA_SCALE, y: (stretchY(y) - CANVA_ORIGIN.y) * CANVA_SCALE };
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

// ======================================================================
// CAGE MAP GEOMETRY (the cage part of the sketch of the whole aviary)
// ======================================================================
// This is the "cage walk" that used to be on the aviary map. The visitor comes in from the aviary
// at the top left, walks east along the BOTTOM edge, up the RIGHT side, west along the TOP edge
// and leaves through the exit at the top.  The two short paths going down are the way to the cages.
//
//      EXIT                         (top)
//        |
//        +-------------------------+
//        |                         |
//   entry|                         |
//     +--+-----------+-------------+      <- bottom edge
//                     |             |
//                  cages 1       cages 2
//
// Points are written in SKETCH pixels, exactly like in aviary.js (same numbers, same stretch),
// so a bird spot of the old aviary map (for example "blue-and-golden-macaw (771, 576)") works here
// without changing a number.

// ---------- The walkways ----------
const walkways = [
    // 0. THE CAGE WALK: short entry from the aviary, bottom edge, right side, top edge, exit.
    curvedLine([[745, 480], [745, 543], [1080, 543], [1080, 268], [810, 268], [810, 205]]),

    // 1. and 2. Short side paths straight to the cages (dead ends).
    // Each one starts INSIDE the cage walk (not on its edge), so path and side path are one piece of ground.
    // The right one starts higher up, on the straight part above the rounded corner, so the bend flows
    // into it with no seam.
    curvedLine([[933, 536], [933, 603]]),
    curvedLine([[1080, 470], [1080, 610]])
];

// ---------- Blue dotted guide line ----------
// ONE continuous line from the entry to the exit, plus a short dotted branch into each cage path.
// (Remove the last two entries of guideRoutes to hide the branches.)
const mainRoute = walkways[0];
const branchLeft = sliceLine(walkways[1], distanceAlong(walkways[1], canvaPoint(933, 543)), Infinity);
const branchRight = sliceLine(walkways[2], distanceAlong(walkways[2], canvaPoint(1080, 504)), Infinity);
const guideRoutes = [mainRoute, branchLeft, branchRight];

// ---------- View box: the part of the map that is fitted to the screen ----------
// Worked out from the walkways, plus a free grass border. The border is big on purpose:
// the caged birds will stand on the grass beside the path, and each one needs room for its badge and name.
const VIEW_PADDING = 100;
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

// If this is true, the map is turned a quarter turn on a phone held upright when that makes it
// clearly bigger (the controls turn with it). false = the map always stays upright.
const ROTATE_ON_PORTRAIT = true;

// ======================================================================
// WALKABLE AREA
// ======================================================================

// Each straight piece of a walkway is a rectangle that can be turned to any angle.
// Corners (points between two pieces) get a circle, so they stay walkable.
// All three walkways are ONE connected ground, so the pointer can go from the main walk into a cage path.
const wayPart = { segments: [], joints: [] };
for (const line of walkways) {
    for (let i = 0; i < line.length - 1; i++) {
        const a = line[i], b = line[i + 1];
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        if (length < 0.001) continue;
        wayPart.segments.push({ ax: a.x, ay: a.y, dx: (b.x - a.x) / length, dy: (b.y - a.y) / length, length: length });
    }
    for (let i = 1; i < line.length - 1; i++) wayPart.joints.push(line[i]);
}

// Is the point on a walkway?
function pointOnPath(px, py) {
    const half = PATH_WIDTH / 2;

    for (const s of wayPart.segments) {
        const rx = px - s.ax, ry = py - s.ay;
        const along = rx * s.dx + ry * s.dy;              // distance along the piece
        if (along < 0 || along > s.length) continue;
        const across = Math.abs(rx * s.dy - ry * s.dx);   // distance from its center line
        if (across <= half) return true;
    }
    for (const j of wayPart.joints) {
        if (Math.hypot(px - j.x, py - j.y) <= half) return true;
    }
    return false;
}

// ======================================================================
// VISITOR POINTER
// ======================================================================

// ---------- Visitor pointer settings (same as the main map and the aviary) ----------
const VISITOR_START = canvaPoint(745, 500);   // ENTRY POINT: the top of the entry path (coming in from the aviary)
const VISITOR_RADIUS = 15;                    // size of the pointer (also its collision circle)
const VISITOR_SCREEN_SPEED = 130;             // how fast the pointer moves ON THE SCREEN (pixels per second), the same on every device
const VISITOR_COLOR = "#168bff";

// heading = angle the pointer faces (0 = right, PI = left). It starts facing down the entry path.
const visitor = { x: VISITOR_START.x, y: VISITOR_START.y, heading: Math.PI / 2 };

// ---------- Collision ----------
// The visitor is a circle. It may stand at (x, y) only if the center AND
// 8 points around its edge are all on a walkway.
function canStandAt(x, y) {
    if (!pointOnPath(x, y)) return false;

    for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        if (!pointOnPath(x + Math.cos(a) * VISITOR_RADIUS, y + Math.sin(a) * VISITOR_RADIUS)) {
            return false;
        }
    }
    return true;
}

// Try to move the visitor to (nx, ny). Nothing happens if that spot is not walkable.
function moveVisitorTo(nx, ny) {
    if (canStandAt(nx, ny)) {
        visitor.x = nx;
        visitor.y = ny;
    }
}

// ---------- Controls: keyboard (PC) ----------
const keys = {};
const MOVE_KEYS = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];

window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (MOVE_KEYS.includes(k)) {
        keys[k] = true;
        if (autoWalk) cancelAutoWalk();      // the keyboard takes over from the list
        e.preventDefault();
    }
});
window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
});
window.addEventListener("blur", () => {
    for (const k in keys) keys[k] = false;     // forget keys if the tab loses focus
});

// (The joystick was removed: the visitor is moved with the keyboard on a PC, or with the
//  "Select Location" list - see further down.)


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
    if (autoWalk) { stepAutoWalk(dt); return; }                              // walking to a bird chosen in the list

    // 1. read the controls (y grows downward on the screen)
    let ix = 0, iy = 0;
    if (keys["a"] || keys["arrowleft"])  ix -= 1;
    if (keys["d"] || keys["arrowright"]) ix += 1;
    if (keys["w"] || keys["arrowup"])    iy -= 1;
    if (keys["s"] || keys["arrowdown"])  iy += 1;

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
const GRASS_TUFTS = 760;           // grass tufts in one picture (more = thicker grass)
const FLOWER_DENSITY = 0.14;       // petal flowers per 1000 screen pixels squared (0 = none, 0.2 = a flower meadow)
const FLOWER_PETAL_COLORS = ["#f2e9d0", "#e58e92", "#f4c85a", "#b9a3e8"];
let grassPattern = null;
let groundFlowers = null;          // { petals: [one Path2D per colour], centers: Path2D }

// grass and flowers get a little smaller on a small phone screen, and a little bigger on a big one
function grassScale() { return Math.max(0.75, Math.min(1.15, viewScale)); }

function buildGrassPattern(pixelRatio) {
    const size = GRASS_TILE_SIZE;
    const k = grassScale();
    const tile = document.createElement("canvas");
    tile.width = Math.round(size * pixelRatio);
    tile.height = Math.round(size * pixelRatio);
    const g = tile.getContext("2d");
    g.scale(pixelRatio, pixelRatio);

    g.fillStyle = GRASS_COLOR;
    g.fillRect(0, 0, size, size);

    // tufts: 3 blades each, every third tuft is a taller, fuller clump (same shapes as main-map.js)
    const dark = new Path2D(), light = new Path2D();
    for (let i = 0; i < GRASS_TUFTS; i++) {
        const x = 12 + pseudoRandom(i * 1.9 + 11) * (size - 24);
        const y = 14 + pseudoRandom(i * 3.3 + 5) * (size - 28);
        const p = (i % 3 === 0) ? dark : light;
        p.moveTo(x, y); p.lineTo(x - 2 * k, y - 5 * k);
        p.moveTo(x, y); p.lineTo(x + 1 * k, y - 6 * k);
        p.moveTo(x, y); p.lineTo(x + 3 * k, y - 4 * k);
        if (i % 3 === 1) {
            p.moveTo(x, y); p.lineTo(x - 4 * k, y - 9 * k);
            p.moveTo(x, y); p.lineTo(x + 2 * k, y - 10 * k);
            p.moveTo(x, y); p.lineTo(x + 5 * k, y - 7 * k);
        }
    }
    g.lineWidth = 1.2;
    g.lineCap = "round";
    g.strokeStyle = "#68985f"; g.stroke(dark);
    g.strokeStyle = "#bcd69d"; g.stroke(light);

    return ctx.createPattern(tile, "repeat");
}

// Petal flowers: five round petals round a yellow centre (same as main-map.js), scattered over the whole screen
function buildGroundFlowers(screenW, screenH) {
    const k = grassScale();
    const count = Math.round(screenW * screenH / 1000 * FLOWER_DENSITY);
    const petals = FLOWER_PETAL_COLORS.map(function () { return new Path2D(); });
    const centers = new Path2D();
    for (let i = 0; i < count; i++) {
        const x = 14 + pseudoRandom(i * 2.7 + 41) * (screenW - 28);
        const y = 14 + pseudoRandom(i * 4.9 + 17) * (screenH - 28);
        const path = petals[i % petals.length];
        for (let a = 0; a < 5; a++) {
            const ang = a * Math.PI * 2 / 5;
            const px = x + Math.cos(ang) * 4 * k, py = y + Math.sin(ang) * 4 * k;
            path.moveTo(px + 2.3 * k, py);
            path.arc(px, py, 2.3 * k, 0, Math.PI * 2);
        }
        centers.moveTo(x + 2.2 * k, y);
        centers.arc(x, y, 2.2 * k, 0, Math.PI * 2);
    }
    return { petals: petals, centers: centers };
}

function drawGrass() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);          // screen pixels, ignore the map transform
    ctx.fillStyle = grassPattern || GRASS_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // petal flowers on top of the grass (in CSS pixels, so the screen-size numbers of buildGroundFlowers fit)
    if (groundFlowers) {
        ctx.setTransform(pixelRatioNow, 0, 0, pixelRatioNow, 0, 0);
        for (let i = 0; i < groundFlowers.petals.length; i++) {
            ctx.fillStyle = FLOWER_PETAL_COLORS[i];
            ctx.fill(groundFlowers.petals[i]);
        }
        ctx.fillStyle = "#e9b23a";
        ctx.fill(groundFlowers.centers);
    }
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

// Soft shadow around the walkways, so they look slightly raised.
// Three thin transparent layers stack up: dark near the edge, light farther away.
function drawShadow() {
    ctx.save();
    ctx.lineJoin = "miter";
    ctx.lineCap = "butt";
    ctx.strokeStyle = SHADOW_COLOR;

    for (let layer = 1; layer <= 3; layer++) {
        const s = SHADOW_SIZE * layer / 3;
        ctx.lineWidth = PATH_WIDTH + 2 * s;
        traceWalkways();
        ctx.stroke();
    }
    ctx.restore();
}

// Draw the walkways as tiles: a thick line whose "ink" is the tile pattern
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

// ======================================================================
// POND (in the middle of the loop) + a FEW ROCKS
// ======================================================================
// A pond lies on the grass in the middle of each curved walk (dome 1 and dome 2), under the
// water birds. It is drawn once into the base layer (under the paths and the bird markers).
//
// TO MOVE / RESIZE A POND: change "center" and "rx / ry". They are SKETCH pixels, the same numbers as
//   canvaPoint(x, y), so the pond is stretched together with the map.
// TO CHANGE THE ROCKS: every rock has an "angle" (degrees round the pond: 0 = east, 90 = south, 180 = west,
//   270 = north), "out" (1 = on the water's edge, bigger = further out on the bank) and a "size".
//   Delete a line = one rock less. Delete a whole pond block = no pond there.
const PONDS = [];     // no pond on this map (the middle of the loop is a small garden of trees instead)

const POND_WATER_EDGE = "#2f86b5";      // deeper water at the edge
const POND_WATER_MID  = "#58b4d8";      // lighter water in the middle
const POND_SHORE      = "#d9c99a";      // sandy edge
const POND_BANK       = "#6f9f5c";      // darker, wet grass around the pond
const POND_WOBBLE = 0.09;               // how uneven the shore is (0 = perfect oval)

// The outline of a pond (k = 1 the water, bigger = the shore / the bank), in MAP units
function pondOutline(pond, k) {
    const pts = [], n = 18;
    for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2;
        const w = 1 + POND_WOBBLE * Math.sin(3 * a + pond.seed) + POND_WOBBLE * 0.55 * Math.sin(5 * a + pond.seed * 2);
        pts.push(canvaPoint(pond.center[0] + Math.cos(a) * pond.rx * w * k,
                            pond.center[1] + Math.sin(a) * pond.ry * w * k));
    }
    return pts;
}

// Trace a smooth closed curve through the points
function traceSmoothClosed(pts) {
    const n = pts.length;
    const mid = function (a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
    const start = mid(pts[n - 1], pts[0]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    for (let i = 0; i < n; i++) {
        const m = mid(pts[i], pts[(i + 1) % n]);
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, m.x, m.y);
    }
    ctx.closePath();
}

function drawRock(x, y, size, seed) {
    const n = 8, pts = [];
    for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2;
        const r = size * (0.78 + 0.35 * pseudoRandom(seed * 7 + i));
        pts.push({ x: x + Math.cos(a) * r * 1.2, y: y + Math.sin(a) * r * 0.9 });
    }
    // shadow on the ground
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.beginPath(); ctx.ellipse(x + size * 0.15, y + size * 0.75, size * 1.25, size * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    // the stone
    traceSmoothClosed(pts);
    const g = ctx.createLinearGradient(x - size, y - size, x + size, y + size);
    g.addColorStop(0, "#b9bcb5"); g.addColorStop(1, "#7d807a");
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = "#5d605b"; ctx.lineWidth = 1.6; ctx.stroke();
    // a small light spot on top
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.beginPath(); ctx.ellipse(x - size * 0.3, y - size * 0.3, size * 0.4, size * 0.22, -0.4, 0, Math.PI * 2); ctx.fill();
}

function drawPonds() {
    ctx.save();
    for (const pond of PONDS) {
        const c = canvaPoint(pond.center[0], pond.center[1]);

        // wet bank, then the sandy shore
        traceSmoothClosed(pondOutline(pond, 1.2));
        ctx.fillStyle = POND_BANK; ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1;
        traceSmoothClosed(pondOutline(pond, 1.09));
        ctx.fillStyle = POND_SHORE; ctx.fill();

        // the water: lighter in the middle, deeper at the edge
        const rMap = Math.max(pond.rx * CANVA_SCALE, pond.ry * CANVA_SCALE) * 1.2;
        const water = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, rMap);
        water.addColorStop(0, POND_WATER_MID);
        water.addColorStop(1, POND_WATER_EDGE);
        traceSmoothClosed(pondOutline(pond, 1));
        ctx.fillStyle = water; ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)"; ctx.lineWidth = 2; ctx.stroke();

        // a few soft ripples and a glint, inside the water only
        ctx.save();
        traceSmoothClosed(pondOutline(pond, 1));
        ctx.clip();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.30)"; ctx.lineWidth = 1.6; ctx.lineCap = "round";
        const rip = [[-0.35, -0.10, 0.28], [0.25, 0.22, 0.22], [0.45, -0.25, 0.16]];
        for (const r of rip) {
            ctx.beginPath();
            ctx.ellipse(c.x + r[0] * pond.rx * CANVA_SCALE, c.y + r[1] * pond.ry * CANVA_SCALE,
                        r[2] * pond.rx * CANVA_SCALE * 0.6, r[2] * pond.ry * CANVA_SCALE * 0.6, 0, 0.2, Math.PI * 1.2);
            ctx.stroke();
        }
        ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
        ctx.beginPath();
        ctx.ellipse(c.x - pond.rx * CANVA_SCALE * 0.4, c.y - pond.ry * CANVA_SCALE * 0.45,
                    pond.rx * CANVA_SCALE * 0.22, pond.ry * CANVA_SCALE * 0.1, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // the few rocks on the edge
        pond.rocks.forEach(function (rock, i) {
            const a = rock.angle * Math.PI / 180;
            const p = canvaPoint(pond.center[0] + Math.cos(a) * pond.rx * rock.out,
                                 pond.center[1] + Math.sin(a) * pond.ry * rock.out);
            drawRock(p.x, p.y, rock.size * CANVA_SCALE * 0.8, pond.seed * 10 + i);
        });
    }
    ctx.restore();
}

// The parts of the map that never move (grass and walkways) are drawn ONCE into a hidden picture (a layer)
// and only copied to the screen every frame. This keeps the map smooth on a phone.
let baseLayer = null;      // grass + walkways
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
        drawPonds();                   // the pond + a few rocks (under the paths)
        drawPaths();                   // shadows + tiled walkways
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

// ---------- EXIT sign ----------
// A small wooden plate on the end of the walk at the top, where the visitor leaves.
// It is drawn in SCREEN pixels, so the word stays upright (also when the map is turned on a phone).
const exitPoint = walkways[0][walkways[0].length - 1];

// The screen rectangle the EXIT sign covers (names keep out of it)
function exitSignRect() {
    const p = exitPoint;
    const sx = (viewMatrix[0] * p.x + viewMatrix[2] * p.y + viewMatrix[4]) / pixelRatioNow;
    const sy = (viewMatrix[1] * p.x + viewMatrix[3] * p.y + viewMatrix[5]) / pixelRatioNow;
    return { x: sx - 27 - 4, y: sy - 11 - 4, w: 54 + 8, h: 22 + 10 };
}

function drawExitSign() {
    const p = exitPoint;
    const sx = (viewMatrix[0] * p.x + viewMatrix[2] * p.y + viewMatrix[4]) / pixelRatioNow;
    const sy = (viewMatrix[1] * p.x + viewMatrix[3] * p.y + viewMatrix[5]) / pixelRatioNow;
    const w = 54, h = 22;

    ctx.save();
    ctx.setTransform(pixelRatioNow, 0, 0, pixelRatioNow, 0, 0);

    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    roundedRect(sx - w / 2, sy - h / 2 + 2, w, h, 7); ctx.fill();
    const wood = ctx.createLinearGradient(0, sy - h / 2, 0, sy + h / 2);
    wood.addColorStop(0, "#96663a"); wood.addColorStop(1, "#6f4524");
    ctx.fillStyle = wood;
    roundedRect(sx - w / 2, sy - h / 2, w, h, 7); ctx.fill();
    ctx.strokeStyle = "#4e3119"; ctx.lineWidth = 2; ctx.stroke();

    ctx.font = "800 12px 'Trebuchet MS', 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff4d6";
    ctx.fillText("EXIT", sx, sy + 0.5);
    ctx.restore();
}

// ======================================================================
// BIRD SPOTS (placeholder markers)
// ======================================================================
// Every bird gets the SAME placeholder marker (a round badge + the bird's name).
// When the visitor walks close to a marker, a popup "You reached ... [View Details]" appears,
// and the button opens the bird card (bird-card.js, data from data/aviary-data.js).
//
// NO BIRD IS PLACED YET. To place one:
//   1. Open cages.html?place in the browser and CLICK the map where the bird should stand.
//      A "New spot" marker appears and a panel shows the exact line to paste here (click the panel to copy).
//   2. Paste that line into birdSpots below and change BIRD-ID to the bird's id from data/aviary-data.js.
//
//   id    = the "id" of the bird in data/aviary-data.js
//   point = canvaPoint(x, y): the same sketch pixels as the walkways. Pick a spot on the grass just NEXT
//           to a path (about 35 px from the path's center line, with free grass for the name label).
//
// Example of one finished line:   { id: "african-grey-parrot", point: canvaPoint(813, 576) },
const birdSpots = [
    // --- bottom row: all on ONE line (y = 578), names in one neat row under the badges ---
    { id: "blue-and-golden-macaw",  point: canvaPoint(754, 578),  tidy: "below" },
    { id: "african-grey-parrot",    point: canvaPoint(797, 578),  tidy: "below" },
    { id: "scarlet-macaw",          point: canvaPoint(846, 578),  tidy: "below" },
    { id: "plum-headed-parakeet",   point: canvaPoint(900, 578),  tidy: "below" },
    { id: "budgerigar",             point: canvaPoint(958, 578),  tidy: "below" },
    { id: "peach-faced-lovebird",   point: canvaPoint(999, 578),  tidy: "below" },
    { id: "cockatiel",              point: canvaPoint(1048, 578), tidy: "below" },
    { id: "blue-crowned-pigeon",    point: canvaPoint(1120, 578), tidy: "below" },   // the corner
    // --- right column: all on ONE line (x = 1120), names in a neat column to the right ---
    { id: "diamond-dove",           point: canvaPoint(1120, 505), tidy: "right" },
    { id: "zebra-finch",            point: canvaPoint(1120, 430), tidy: "right" },
    { id: "golden-pheasant",        point: canvaPoint(1120, 355), tidy: "right" },
    { id: "ring-necked-pheasant",   point: canvaPoint(1120, 290), tidy: "right" },
    // --- top row: all on ONE line (y = 230), names in one neat row above the badges ---
    { id: "white-peacock",          point: canvaPoint(1068, 230), tidy: "above" },
    { id: "indian-peafowl",         point: canvaPoint(976, 230),  tidy: "above" },
    { id: "red-junglefowl",         point: canvaPoint(902, 230),  tidy: "above" },
    { id: "indian-grey-hornbill",   point: canvaPoint(838, 230),  tidy: "above" }
];

// Make sure the view box also holds every bird marker (plus room for its badge), so none of them
// ever touches the wooden frame, whatever the screen size.
(function () {
    const room = 48;                     // map units kept free around a bird spot
    const roomTall = 92;                 // rows with names above / below need space for the name
    let minX = view.x, maxX = view.x + view.w, minY = view.y, maxY = view.y + view.h;
    for (const spot of birdSpots) {
        const roomRight = spot.tidy === "right" ? 215 : room;      // names of the right-hand column need space on the right
        const roomUp = spot.tidy === "above" ? roomTall : room;
        const roomDown = spot.tidy === "below" ? roomTall : room;
        minX = Math.min(minX, spot.point.x - room); maxX = Math.max(maxX, spot.point.x + roomRight);
        minY = Math.min(minY, spot.point.y - roomUp); maxY = Math.max(maxY, spot.point.y + roomDown);
    }
    view.x = minX; view.y = minY; view.w = maxX - minX; view.h = maxY - minY;
})();

// Lift the "You reached ..." popups a little above the bottom edge of the screen (same as the aviary)
(function () {
    const lift = document.createElement("style");
    lift.textContent = ".arrival-popup { bottom: calc(10px + env(safe-area-inset-bottom, 0px)) !important; }";
    document.head.appendChild(lift);
})();

const BIRD_TRIGGER = 80;          // how close the visitor must be (map units) to get the popup

function birdName(id) {
    const bird = (typeof aviaryBirds !== "undefined") && aviaryBirds.find(function (b) { return b.id === id; });
    return bird ? bird.name : id;
}

// ---------- Sizes that follow the screen ----------
// On a big laptop screen the badge is full size; on a small phone it shrinks (and so does the name text),
// so the crowded birds at the start of the walk still fit.
function birdBadgeRadius() { return Math.max(8.5, Math.min(17, viewScale * 20)); }     // screen pixels
function labelFontPx()     { return viewScale < 0.45 ? 10.5 : (viewScale < 0.6 ? 11.5 : (viewScale < 0.8 ? 12.5 : 13.5)); }
function labelFont()       { return "800 " + labelFontPx() + "px 'Trebuchet MS', 'Segoe UI', sans-serif"; }
function labelLineHeight() { return Math.round(labelFontPx() * 1.2); }

// ---------- Bird name label (a small stacked sign) ----------
// The colour is NOT brown, so the label never blends into the wooden bridge. Change these 2 colours freely.
const LABEL_COLOR = "#17575f";     // deep teal
const LABEL_EDGE  = "#0d3b41";     // darker edge
const LABEL_GAP   = 5;             // free space between the badge and its name (screen pixels)
const SCREEN_EDGE = 5;             // markers stay at least this far inside the board

// Split a name into 1 to 3 short lines. Breaks are allowed at spaces and after hyphens, and the
// breaks are chosen so the longest line is as short as possible ("Blue-and-" / "Golden Macaw").
function stackName(name, limit) {
    const k = labelFontPx() / 12;                       // smaller text on small screens
    ctx.save();
    ctx.font = labelFont();
    const width = function (t) { return ctx.measureText(t).width; };

    // pieces + what goes between them ("" after a hyphen, " " after a space)
    const pieces = [], glue = [];
    const words = name.split(" ");
    words.forEach(function (word, wi) {
        const parts = word.split(/(?<=-)/);
        parts.forEach(function (part, pi) {
            pieces.push(part);
            glue.push(pi < parts.length - 1 ? "" : (wi < words.length - 1 ? " " : ""));
        });
    });
    const join = function (from, to) {           // pieces from..to-1 as one line
        let t = "";
        for (let i = from; i < to; i++) t += pieces[i] + (i < to - 1 ? glue[i] : "");
        return t;
    };

    let best = [name];
    if (limit && pieces.length > 1) {
        // fixed width wanted: use the FEWEST lines whose longest line still fits, otherwise the narrowest split
        const options = [[name]];
        const n = pieces.length;
        for (let i = 1; i < n; i++) options.push([join(0, i), join(i, n)]);
        for (let i = 1; i < n; i++) for (let j = i + 1; j < n; j++) options.push([join(0, i), join(i, j), join(j, n)]);
        const wide = function (l) { return Math.max.apply(null, l.map(width)); };
        let pick = null;
        for (const o of options) {
            if (wide(o) <= limit && (!pick || o.length < pick.length || (o.length === pick.length && wide(o) < wide(pick)))) pick = o;
        }
        if (!pick) pick = options.reduce(function (a, b) { return wide(b) < wide(a) ? b : a; });
        ctx.restore();
        return pick;
    }
    if (width(name) > 84 * k && pieces.length > 1) {
        let bestMax = Infinity;
        const n = pieces.length;
        for (let i = 1; i < n; i++) {                       // 2 lines
            const l = [join(0, i), join(i, n)];
            const m = Math.max(width(l[0]), width(l[1]));
            if (m < bestMax) { bestMax = m; best = l; }
        }
        if (bestMax > 100 * k) {                            // still wide: try 3 lines
            for (let i = 1; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    const l = [join(0, i), join(i, j), join(j, n)];
                    const m = Math.max(width(l[0]), width(l[1]), width(l[2]));
                    if (m < bestMax - 4) { bestMax = m; best = l; }
                }
            }
        }
    }
    ctx.restore();
    return best;
}

// ---------- Screen <-> map ----------
function mapToScreen(p) {
    return {
        x: (viewMatrix[0] * p.x + viewMatrix[2] * p.y + viewMatrix[4]) / pixelRatioNow,
        y: (viewMatrix[1] * p.x + viewMatrix[3] * p.y + viewMatrix[5]) / pixelRatioNow
    };
}
function screenToMap(x, y) {
    const X = x * pixelRatioNow, Y = y * pixelRatioNow;
    const [a, b, c, d, tx, ty] = viewMatrix;
    const det = a * d - b * c;
    return { x: (d * (X - tx) - c * (Y - ty)) / det, y: (-b * (X - tx) + a * (Y - ty)) / det };
}

// ---------- Label placement ----------
// The markers are crowded in places, so every name tries several spots around its badge
// (below, above, right, left, then further out with a thin line back to the badge) and takes the first
// one that: stays inside the board, does not cover another badge or name, and covers as little
// walkway as possible. It is worked out ONCE per screen size (in resizeCanvas), not every frame.

function buildBirdItem(spot, textLimit) {
    const R = birdBadgeRadius();
    const p = mapToScreen(spot.point);
    // the badge itself always stays inside the board, even on a very small screen
    const sx = Math.max(board.x + R + SCREEN_EDGE, Math.min(p.x, board.x + board.w - R - SCREEN_EDGE));
    const sy = Math.max(board.y + R + SCREEN_EDGE, Math.min(p.y, board.y + board.h - R - SCREEN_EDGE));

    const lines = stackName(birdName(spot.id), textLimit);
    ctx.save();
    ctx.font = labelFont();
    let w = 0;
    for (const line of lines) w = Math.max(w, ctx.measureText(line).width);
    ctx.restore();
    const pk = labelFontPx() / 12;                          // less padding on small screens
    w += 14 * pk;
    const h = lines.length * labelLineHeight() + 7 * pk;
    return { id: spot.id, sx: sx, sy: sy, R: R, lines: lines, w: w, h: h, lx: sx - w / 2, ly: sy + R + LABEL_GAP, leader: null, placed: false, tidy: spot.tidy || false };
}

function circleHitsRect(cx, cy, r, rx, ry, rw, rh) {
    const nx = Math.max(rx, Math.min(cx, rx + rw));
    const ny = Math.max(ry, Math.min(cy, ry + rh));
    return Math.hypot(cx - nx, cy - ny) < r;
}
function rectsHit(ax, ay, aw, ah, bx, by, bw, bh, pad) {
    return ax < bx + bw + pad && ax + aw + pad > bx && ay < by + bh + pad && ay + ah + pad > by;
}
function labelOnWalkway(x, y, w, h) {                  // share (0 to 1) of the label that lies over a walkway
    let hits = 0, total = 0;
    for (let i = 0; i <= 5; i++) {
        for (let j = 0; j <= 2; j++) {
            const m = screenToMap(x + w * i / 5, y + h * j / 2);
            total++;
            if (pointOnPath(m.x, m.y)) hits++;
        }
    }
    return hits / total;
}

// Screen areas the names must stay out of: the wooden sign and the Back button
function keepOutAreas() {
    const out = [];
    for (const sel of [".zoo-title", ".zoo-back", ".select-toggle"]) {
        const el = document.querySelector(sel);
        if (el) out.push({ x: el.offsetLeft - 4, y: el.offsetTop - 12, w: el.offsetWidth + 8, h: el.offsetHeight + 16 });
    }
    out.push(exitSignRect());
    return out;
}

function placeLabel(item, all) {
    const keepOut = keepOutAreas();
    const R = item.R, w = item.w, h = item.h, g = LABEL_GAP;
    const stepY = h + 3, stepX = w + 3;
    const cx = item.sx - w / 2, cy = item.sy - h / 2;
    const cands = [];
    const add = function (lx, ly, cost) { cands.push({ lx: lx, ly: ly, cost: cost }); };

    // next to the badge
    add(cx, item.sy + R + g, 0);                          // below
    add(cx, item.sy - R - g - h, 8);                      // above
    add(item.sx + R + g, cy, 12);                         // right
    add(item.sx - R - g - w, cy, 12);                     // left
    // slid sideways (still just below / above)
    for (const dx of [-0.55, 0.55, -1.1, 1.1]) {
        add(cx + dx * w, item.sy + R + g, 18 + Math.abs(dx) * 4);
        add(cx + dx * w, item.sy - R - g - h, 24 + Math.abs(dx) * 4);
    }
    // further out (a thin line leads back to the badge)
    for (let tier = 1; tier <= 4; tier++) {
        add(cx, item.sy + R + g + tier * stepY, 30 + tier * 12);
        add(cx, item.sy - R - g - h - tier * stepY, 36 + tier * 12);
        add(item.sx + R + g + tier * stepX, cy, 40 + tier * 12);
        add(item.sx - R - g - w - tier * stepX, cy, 40 + tier * 12);
        for (const dy of [-0.6, 0.6]) {
            add(item.sx + R + g + tier * stepX, cy + dy * h, 46 + tier * 12);
            add(item.sx - R - g - w - tier * stepX, cy + dy * h, 46 + tier * 12);
        }
        for (const dx of [-0.55, 0.55, -1.1, 1.1]) {
            add(cx + dx * w, item.sy + R + g + tier * stepY, 50 + tier * 12);
            add(cx + dx * w, item.sy - R - g - h - tier * stepY, 56 + tier * 12);
        }
    }

    const x0 = board.x + SCREEN_EDGE, y0 = board.y + SCREEN_EDGE;
    const x1 = board.x + board.w - SCREEN_EDGE, y1 = board.y + board.h - SCREEN_EDGE;

    let best = null, bestScore = Infinity;
    for (const c of cands) {
        let score = c.cost;
        if (c.lx < x0 || c.ly < y0 || c.lx + w > x1 || c.ly + h > y1) score += 3000;   // would leave the board

        for (const k of keepOut) if (rectsHit(c.lx, c.ly, w, h, k.x, k.y, k.w, k.h, 0)) score += 6000;       // under the sign / Back button
        for (const o of all) {
            if (o !== item && circleHitsRect(o.sx, o.sy, o.R + 3, c.lx, c.ly, w, h)) score += 1500;        // covers another badge
            if (o !== item && o.placed && rectsHit(c.lx, c.ly, w, h, o.lx, o.ly, o.w, o.h, 2)) score += 1500;   // covers another name
        }

        // thin line back to the badge, when the name is not right next to it
        const nx = Math.max(c.lx, Math.min(item.sx, c.lx + w));
        const ny = Math.max(c.ly, Math.min(item.sy, c.ly + h));
        const far = Math.hypot(nx - item.sx, ny - item.sy) > R + g + 2;
        score += Math.max(0, Math.hypot(nx - item.sx, ny - item.sy) - R - g) * 0.35;      // shorter lines look tidier
        if (far) {
            const len = Math.hypot(nx - item.sx, ny - item.sy);
            for (let i = 1; i <= 10; i++) {
                const px = item.sx + (nx - item.sx) * (R + 2 + (len - R - 2) * i / 10) / len;
                const py = item.sy + (ny - item.sy) * (R + 2 + (len - R - 2) * i / 10) / len;
                const mp = screenToMap(px, py);
                if (pointOnPath(mp.x, mp.y)) score += 9;   // a line over the walkway looks messy
                let hit = false;
                for (const o of all) {
                    if (o === item) continue;
                    if (Math.hypot(px - o.sx, py - o.sy) < o.R + 2) hit = true;
                    if (o.placed && px > o.lx - 1 && px < o.lx + o.w + 1 && py > o.ly - 1 && py < o.ly + o.h + 1) hit = true;
                }
                if (hit) { score += 800; break; }
            }
        }

        score += labelOnWalkway(c.lx, c.ly, w, h) * 380;       // prefer grass over the walkway

        if (score < bestScore) { bestScore = score; best = { lx: c.lx, ly: c.ly, nx: nx, ny: ny, far: far }; }
    }

    // last safety: whatever was chosen is pushed fully inside the board
    item.lx = Math.max(x0, Math.min(best.lx, x1 - w));
    item.ly = Math.max(y0, Math.min(best.ly, y1 - h));
    item.leader = best.far ? { x: Math.max(item.lx, Math.min(item.sx, item.lx + w)), y: Math.max(item.ly, Math.min(item.sy, item.ly + h)) } : null;
    item.placed = true;
}

let birdLayout = [];

function layoutBirdSpots() {
    let items = birdSpots.map(function (spot) { return buildBirdItem(spot); });

    // TIDY BIRDS (tidy: "below" | "above" | "right" in birdSpots): the names of a line of birds stand in ONE neat
    // line too: below the badges (same height), above them (same height) or in a column to the right of them.
    // Each name is wrapped to fit the space between its neighbours. (On a turned phone screen a row would run
    // up and down, so there the normal placement is used.)
    if (!viewRotated) {
        const pk = labelFontPx() / 12;
        const ex = exitSignRect();
        const x0 = board.x + SCREEN_EDGE, x1 = board.x + board.w - SCREEN_EDGE;
        for (const mode of ["below", "above", "right"]) {
            const group = items.filter(function (it) { return it.tidy === mode || (mode === "below" && it.tidy === true); });
            if (group.length < 2) continue;
            const horizontal = mode !== "right";
            group.sort(function (a, c) { return horizontal ? a.sx - c.sx : a.sy - c.sy; });

            // Lay the group out in one neat line (stagger = false) or in two neat lines, one name higher, one lower
            // (stagger = true: every second name drops down, so each name may be twice as wide). Returns true if it fits.
            const lay = function (stagger) {
                group.forEach(function (it, i) {
                    const left = i > 0 ? it.sx - group[i - 1].sx : Infinity;
                    const right = i < group.length - 1 ? group[i + 1].sx - it.sx : Infinity;
                    const gap = Math.min(left, right);
                    it.limit = !horizontal ? 200 : (stagger ? 2 * gap - 14 : gap - 8) - 14 * pk;
                    if (horizontal && it.limit < 34) it.limit = 34;
                    const fresh = buildBirdItem(birdSpots.find(function (b) { return b.id === it.id; }), it.limit);
                    it.lines = fresh.lines; it.w = fresh.w; it.h = fresh.h;
                    it.tier = stagger ? i % 2 : 0;
                });
                const tierH = [0, 1].map(function (t) {
                    return Math.max.apply(null, group.filter(function (it) { return it.tier === t; }).map(function (it) { return it.h; }).concat([0]));
                });
                const belowY = Math.max.apply(null, group.map(function (it) { return it.sy + it.R + LABEL_GAP; }));
                const aboveY = Math.min.apply(null, group.map(function (it) { return it.sy - it.R - LABEL_GAP; }));
                const rightX = Math.max.apply(null, group.map(function (it) { return it.sx + it.R + LABEL_GAP; }));
                for (const it of group) {
                    const drop = it.tier ? tierH[0] + 6 : 0;
                    if (mode === "below")      { it.lx = it.sx - it.w / 2; it.ly = belowY + drop; }
                    else if (mode === "above") { it.lx = it.sx - it.w / 2; it.ly = aboveY - it.h - drop; }
                    else                       { it.lx = rightX;            it.ly = it.sy - it.h / 2; }
                    if (horizontal) it.lx = Math.max(x0, Math.min(it.lx, x1 - it.w));       // never outside the board
                    // a neat name never sits on the EXIT sign: slide it sideways, just past the sign
                    if (rectsHit(it.lx, it.ly, it.w, it.h, ex.x, ex.y, ex.w, ex.h, 0)) {
                        it.lx = (it.sx >= ex.x + ex.w / 2) ? ex.x + ex.w + 2 : ex.x - it.w - 2;
                    }
                    // the lowered / raised names are joined to their badge by a thin line
                    it.leader = it.tier ? { x: Math.max(it.lx + 6, Math.min(it.sx, it.lx + it.w - 6)), y: mode === "below" ? it.ly : it.ly + it.h } : null;
                    it.placed = true; it.fixed = true;
                }
                // every name must stay fully inside the board (a second line of names needs more room)
                const y0 = board.y + SCREEN_EDGE, y1 = board.y + board.h - SCREEN_EDGE;
                for (const it of group) if (it.ly < y0 || it.ly + it.h > y1) return false;
                // names on the same line must not touch
                for (let k = 0; k < group.length; k++) {
                    for (let m = k + 1; m < group.length; m++) {
                        const p = group[k], q = group[m];
                        if (p.tier !== q.tier) continue;
                        if (rectsHit(p.lx, p.ly, p.w, p.h, q.lx, q.ly, q.w, q.h, 2)) return false;
                    }
                }
                return true;
            };

            if (!lay(false) && horizontal && !lay(true)) {
                // too tight even for two lines: this group uses the normal placement instead
                for (const it of group) {
                    Object.assign(it, buildBirdItem(birdSpots.find(function (b) { return b.id === it.id; })));
                    it.fixed = false; it.placed = false; it.leader = null;
                }
            }
        }
    }

    // the most crowded birds choose their label spot first
    const crowd = items.map(function (a) {
        return items.filter(function (b) { return b !== a && Math.hypot(a.sx - b.sx, a.sy - b.sy) < 130; }).length;
    });
    const order = items.map(function (_, i) { return i; }).sort(function (a, b) { return crowd[b] - crowd[a]; });
    for (const i of order) { if (!items[i].fixed) placeLabel(items[i], items); }
    // second and third look: every name is re-placed once the others have settled, which untangles leftovers
    for (let pass = 0; pass < 4; pass++) {
        for (const i of order) { if (items[i].fixed) continue; items[i].placed = false; placeLabel(items[i], items); }
    }
    return items;
}

// The marker is drawn in SCREEN pixels, so the badge and the name always stay upright and the same
// size, even when the map is turned a quarter turn on a phone.
function drawBirdSpots() {
    const t = performance.now() / 1000;
    const items = birdLayout.slice();
    if (placePreview) {                                      // the "New spot" marker of the placement helper
        const extra = buildBirdItem(placePreview);
        placeLabel(extra, items.concat([extra]));
        items.push(extra);
    }

    ctx.save();
    ctx.setTransform(pixelRatioNow, 0, 0, pixelRatioNow, 0, 0);

    // 1. thin lines from a badge to its name (only when the name had to move away)
    ctx.strokeStyle = LABEL_EDGE;
    ctx.lineWidth = 1.5;
    for (const it of items) {
        if (!it.leader) continue;
        ctx.beginPath();
        ctx.moveTo(it.sx, it.sy);
        ctx.lineTo(it.leader.x, it.leader.y);
        ctx.stroke();
    }

    // 2. badges
    const pulse = (t * 0.8) % 1;
    for (const it of items) {
        const R = it.R, sx = it.sx, sy = it.sy;

        // soft pulsing ring
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
        ctx.font = Math.round(R * 1.06) + "px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#000";
        ctx.fillText("🐦", sx, sy + 1);
    }

    // 3. names (on top of every badge and line): a teal sign with a soft shadow, a light outline
    //    and a small pointer tip that points at its badge
    ctx.font = labelFont();
    const rad = 8;
    for (const it of items) {
        const lx = it.lx, ly = it.ly, w = it.w, lh = it.h;

        // which side faces the badge? (not needed when a thin line leads to the badge)
        let tip = null;
        if (!it.leader) {
            if (ly >= it.sy)            tip = { x: Math.max(lx + 12, Math.min(it.sx, lx + w - 12)), y: ly, dx: 0, dy: -1 };       // name below
            else if (ly + lh <= it.sy)  tip = { x: Math.max(lx + 12, Math.min(it.sx, lx + w - 12)), y: ly + lh, dx: 0, dy: 1 };  // name above
            else if (lx >= it.sx)       tip = { x: lx, y: Math.max(ly + 10, Math.min(it.sy, ly + lh - 10)), dx: -1, dy: 0 };     // name to the right
            else                        tip = { x: lx + w, y: Math.max(ly + 10, Math.min(it.sy, ly + lh - 10)), dx: 1, dy: 0 };  // name to the left
        }
        const body = function () {
            ctx.beginPath();
            ctx.moveTo(lx + rad, ly);
            ctx.arcTo(lx + w, ly, lx + w, ly + lh, rad);
            ctx.arcTo(lx + w, ly + lh, lx, ly + lh, rad);
            ctx.arcTo(lx, ly + lh, lx, ly, rad);
            ctx.arcTo(lx, ly, lx + w, ly, rad);
            ctx.closePath();
            if (tip) {                                   // the little triangle (6 px high)
                const px = -tip.dy, py = tip.dx;         // along the edge
                ctx.moveTo(tip.x + px * 6, tip.y + py * 6);
                ctx.lineTo(tip.x + tip.dx * 6, tip.y + tip.dy * 6);
                ctx.lineTo(tip.x - px * 6, tip.y - py * 6);
                ctx.closePath();
            }
        };

        ctx.save();
        ctx.shadowOffsetY = 2;
        body();
        ctx.fillStyle = LABEL_COLOR;
        ctx.fill();
        ctx.restore();

        // a light top glow makes the sign look like a smooth board
        const glow = ctx.createLinearGradient(0, ly, 0, ly + lh);
        glow.addColorStop(0, "rgba(255, 255, 255, 0.20)");
        glow.addColorStop(0.5, "rgba(255, 255, 255, 0)");
        body();
        ctx.fillStyle = glow;
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 244, 214, 0.85)";
        ctx.lineWidth = 1.6;
        ctx.lineJoin = "round";
        ctx.stroke();

        ctx.fillStyle = "#fff4d6";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 1;
        for (let i = 0; i < it.lines.length; i++) {
            ctx.fillText(it.lines[i], lx + w / 2, ly + 3.5 * (labelFontPx() / 12) + labelLineHeight() * (i + 0.5) + 0.5);
        }
        ctx.shadowColor = "transparent";
        ctx.shadowOffsetY = 0;
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
    // just walked to a bird from the list: show THAT bird (until the visitor moves away)
    if (forcedBird) {
        if (Math.hypot(visitor.x - forcedBird.x, visitor.y - forcedBird.y) < 1) found = forcedBird.id;
        else forcedBird = null;
    }
    if (autoWalk) found = null;                    // no popup while walking past
    if (found === birdNearby) return;              // nothing changed
    birdNearby = found;
    if (found) {
        // start loading the photo and sound now, so the card opens instantly
        const pre = (typeof aviaryBirds !== "undefined") && aviaryBirds.find(function (x) { return x.id === found; });
        if (pre) { if (pre.photo) new Image().src = pre.photo; if (pre.audio) fetch(pre.audio).catch(function () {}); }
        birdPopup.querySelector(".arrival-popup-text").textContent = "You reached " + birdName(found);
        birdPopup.style.display = "flex";
    } else {
        birdPopup.style.display = "none";
    }
}

// ======================================================================
// SELECT LOCATION LIST (replaces the joystick)
// ======================================================================
// A "View Birds" button at the top opens a list of the birds. Tapping a bird in the list (or tapping
// its badge / name on the map) makes the visitor pointer WALK there along the blue guide line. When it
// arrives, the normal popup appears ("You reached ... / View Details"), and that opens the bird card.
// The keyboard (WASD / arrows) still works on a PC and stops the automatic walk.

const AUTOWALK_SCREEN_SPEED = 300;   // pointer speed during the automatic walk (screen pixels per second)

// The walking track = the blue guide line of the main walk (entry -> bottom edge -> right side -> top edge -> exit).
const walkTrack = (function () {
    const pts = mainRoute, cum = [0];
    for (let i = 0; i < pts.length - 1; i++) {
        cum.push(cum[i] + Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y));
    }
    return { pts: pts, cum: cum, length: cum[cum.length - 1] };
})();

// Closest point of the track to (x, y)
function nearestOnTrack(x, y) {
    const T = walkTrack;
    let best = { d: Infinity, s: 0, x: x, y: y };
    for (let i = 0; i < T.pts.length - 1; i++) {
        const a = T.pts[i], b = T.pts[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy;
        const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len2));
        const qx = a.x + t * dx, qy = a.y + t * dy;
        const d = Math.hypot(x - qx, y - qy);
        if (d < best.d) best = { d: d, s: T.cum[i] + t * Math.sqrt(len2), x: qx, y: qy };
    }
    return best;
}

// The point at distance s along the track and the direction of that piece
function trackPoint(s) {
    const T = walkTrack;
    s = Math.max(0, Math.min(T.length, s));
    let i = 0;
    while (i < T.pts.length - 2 && s > T.cum[i + 1]) i++;
    const a = T.pts[i], b = T.pts[i + 1];
    const len = T.cum[i + 1] - T.cum[i];
    const t = len > 0 ? (s - T.cum[i]) / len : 0;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: Math.atan2(b.y - a.y, b.x - a.x) };
}

// Where the visitor stops for every bird: the closest point of the track to the bird.
// Listed in walking order (entrance first), which is also the order of the list.
const birdStops = birdSpots.map(function (spot) {
    return { id: spot.id, name: birdName(spot.id), s: nearestOnTrack(spot.point.x, spot.point.y).s };
}).sort(function (a, b) { return a.s - b.s; });

let autoWalk = null;      // null = not walking, otherwise { id, name, s, targetS, dir, lead }
let forcedBird = null;    // the bird we just walked to: its popup is shown even if another bird is a little closer

function turnVisitorTo(angle, dt) {
    let diff = angle - visitor.heading;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    visitor.heading += diff * Math.min(1, dt * 14);
}

function startAutoWalk(stop) {
    const here = nearestOnTrack(visitor.x, visitor.y);
    autoWalk = {
        id: stop.id,
        name: stop.name,
        s: here.s,
        targetS: stop.s,
        dir: stop.s >= here.s ? 1 : -1,
        lead: here.d > 0.5 ? { x: here.x, y: here.y } : null     // first step back onto the guide line
    };
    forcedBird = null;
    if (window.hideSelectHint) window.hideSelectHint(true);
    updateSelectToggle();
}

function cancelAutoWalk() {
    if (!autoWalk) return;
    autoWalk = null;
    updateSelectToggle();
}

// Called every frame while walking (from updateVisitor)
function stepAutoWalk(dt) {
    const w = autoWalk;
    let move = (AUTOWALK_SCREEN_SPEED / viewScale) * dt;       // screen pixels -> map units

    if (w.lead) {                                              // step onto the guide line first
        const dx = w.lead.x - visitor.x, dy = w.lead.y - visitor.y, d = Math.hypot(dx, dy);
        if (d > 0.01) turnVisitorTo(Math.atan2(dy, dx), dt);
        if (d > move) {
            visitor.x += (dx / d) * move;
            visitor.y += (dy / d) * move;
            return;
        }
        visitor.x = w.lead.x;
        visitor.y = w.lead.y;
        move -= d;
        w.lead = null;
    }

    w.s += w.dir * Math.min(move, Math.abs(w.targetS - w.s));
    const p = trackPoint(w.s);
    visitor.x = p.x;
    visitor.y = p.y;
    turnVisitorTo(p.angle + (w.dir < 0 ? Math.PI : 0), dt);

    if (Math.abs(w.targetS - w.s) < 0.01) {                    // arrived
        forcedBird = { id: w.id, x: visitor.x, y: visitor.y };
        autoWalk = null;
        updateSelectToggle();                                  // updateBirdPopup() now shows "You reached ..."
    }
}

// ---------- The "View Birds" button and the list ----------
const SELECT_HINT_KEY = "zooCagesSelectSeen";
const SELECT_PIN = '<svg viewBox="0 0 24 24" width="1.15em" height="1.15em" aria-hidden="true" style="vertical-align:-0.2em">'
    + '<path d="M12 1.5C8 1.5 4.8 4.7 4.8 8.7c0 5.4 7.2 13.8 7.2 13.8s7.2-8.4 7.2-13.8c0-4-3.2-7.2-7.2-7.2z" fill="#ea4335" stroke="#a52714" stroke-width="1"/>'
    + '<circle cx="12" cy="8.7" r="2.9" fill="#fff"/></svg>';

function createSelectList() {
    const toggle = document.createElement("button");
    toggle.id = "selectToggle";
    toggle.className = "places-toggle select-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-haspopup", "true");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "selectPanel");

    const panel = document.createElement("div");
    panel.id = "selectPanel";
    panel.className = "places-panel";
    panel.setAttribute("role", "menu");
    panel.setAttribute("aria-label", "Caged birds");
    panel.hidden = true;

    const heading = document.createElement("div");
    heading.className = "places-heading";
    heading.textContent = "Select a bird to visit";
    panel.appendChild(heading);

    for (const stop of birdStops) {
        const bird = (typeof aviaryBirds !== "undefined") && aviaryBirds.find(function (b) { return b.id === stop.id; });
        const status = bird && typeof conservationStatus !== "undefined" ? conservationStatus[bird.status] : null;

        const row = document.createElement("button");
        row.type = "button";
        row.className = "places-item";
        row.setAttribute("role", "menuitem");
        row.style.setProperty("--place-color", status ? status.color : "#8e24aa");

        const icon = document.createElement("span");
        icon.className = "places-item-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = "\uD83D\uDC26";

        const text = document.createElement("span");
        text.className = "places-item-text";
        const name = document.createElement("b");
        name.textContent = stop.name;
        text.appendChild(name);
        if (status) {
            const note = document.createElement("small");
            note.textContent = status.label;
            text.appendChild(note);
        }

        const go = document.createElement("span");
        go.className = "places-item-go";
        go.setAttribute("aria-hidden", "true");
        go.textContent = "\u203A";

        row.appendChild(icon);
        row.appendChild(text);
        row.appendChild(go);
        row.addEventListener("click", function () {
            setSelectOpen(false);
            startAutoWalk(stop);
        });
        panel.appendChild(row);
    }

    // Close button at the bottom of the list (stays visible while the list scrolls)
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "places-close";
    closeBtn.textContent = "\u2715  Close";
    closeBtn.addEventListener("click", function () { setSelectOpen(false); });
    panel.appendChild(closeBtn);

    // The list opens in the CENTRE of the screen, over a dimmed background. It stands above the
    // "You reached ..." popups (z-index 8), so a popup can never cover it.
    const backdrop = document.createElement("div");
    backdrop.style.cssText = "position:fixed; inset:0; z-index:9; background:rgba(20,12,4,0.5); display:none;";
    document.body.appendChild(backdrop);
    Object.assign(panel.style, {
        left: "0", right: "0", top: "0", bottom: "0", margin: "auto",
        height: "fit-content", zIndex: "10", transformOrigin: "50% 50%"
    });
    panel.style.maxHeight = "calc(100vh - 32px)";
    panel.style.maxHeight = "calc(100dvh - 32px)";      // (ignored by old browsers, which keep the line above)

    document.body.appendChild(panel);
    document.body.appendChild(toggle);

    // pulsing ring around the button until it is tapped for the first time
    let seen = false;
    try { seen = localStorage.getItem(SELECT_HINT_KEY) === "1"; } catch (err) { /* private mode: just show it */ }
    if (!seen) toggle.classList.add("attention");
    window.hideSelectHint = function (remember) {
        toggle.classList.remove("attention");
        if (remember) { try { localStorage.setItem(SELECT_HINT_KEY, "1"); } catch (err) { /* ignore */ } }
    };

    function setSelectOpen(open) {
        panel.hidden = !open;
        backdrop.style.display = open ? "block" : "none";
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }
    window.setSelectOpen = setSelectOpen;

    toggle.addEventListener("click", function () {
        window.hideSelectHint(true);
        setSelectOpen(panel.hidden);
    });
    // tap outside the list, or press Escape: close it
    document.addEventListener("pointerdown", function (e) {
        if (!panel.hidden && !panel.contains(e.target) && !toggle.contains(e.target)) setSelectOpen(false);
    });
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") setSelectOpen(false);
    });

    updateSelectToggle();
}

// Where the button stands: top centre, next to the sign and the Back button.
// On a narrow phone there is no room between them, so it gets its own row under them.
function positionSelectButton() {
    const toggle = document.getElementById("selectToggle");
    if (!toggle) return;
    const sign = document.querySelector(".zoo-title"), back = document.querySelector(".zoo-back");
    let top;
    if (window.innerWidth <= 600) {
        top = 0;
        for (const el of [sign, back]) if (el) top = Math.max(top, el.offsetTop + el.offsetHeight);
        top += 8;
    } else {
        top = back ? back.offsetTop + (back.offsetHeight - toggle.offsetHeight) / 2 : 10;
    }
    toggle.style.top = Math.round(top) + "px";
    toggle.style.left = Math.round(Math.max(4, (window.innerWidth - toggle.offsetWidth) / 2)) + "px";
}

// The button text: "View Birds", or "Walking..." while the pointer is on its way
function updateSelectToggle() {
    const toggle = document.getElementById("selectToggle");
    if (!toggle) return;
    toggle.innerHTML = autoWalk ? "\uD83D\uDEB6 Walking\u2026" : SELECT_PIN + " View Birds";
    toggle.setAttribute("aria-label", autoWalk ? "Walking to " + autoWalk.name + ". Open the list of birds" : "Open the list of birds");
    toggle.classList.toggle("walking", !!autoWalk);
    positionSelectButton();
}

createSelectList();

// ---------- Click to visit: tap a bird badge or its name on the map ----------
function birdAtScreenPoint(x, y) {
    for (let i = birdLayout.length - 1; i >= 0; i--) {
        const it = birdLayout[i];
        if (Math.hypot(x - it.sx, y - it.sy) <= it.R + 6) return it.id;
        if (x >= it.lx - 4 && x <= it.lx + it.w + 4 && y >= it.ly - 4 && y <= it.ly + it.h + 4) return it.id;
    }
    return null;
}

canvas.addEventListener("click", function (e) {
    if (new URLSearchParams(location.search).has("place")) return;                 // the placement helper uses clicks
    if (typeof isBirdCardOpen === "function" && isBirdCardOpen()) return;
    const r = canvas.getBoundingClientRect();
    const id = birdAtScreenPoint(e.clientX - r.left, e.clientY - r.top);
    const stop = id && birdStops.find(function (b) { return b.id === id; });
    if (stop) startAutoWalk(stop);
});

canvas.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    const r = canvas.getBoundingClientRect();
    canvas.style.cursor = birdAtScreenPoint(e.clientX - r.left, e.clientY - r.top) ? "pointer" : "";
}, { passive: true });


// ---------- Placement helper: open cages.html?place ----------
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
        const sx = Math.round(unstretchX(mx / CANVA_SCALE + CANVA_ORIGIN.x));
        const sy = Math.round(unstretchY(my / CANVA_SCALE + CANVA_ORIGIN.y));

        placePreview = { id: "New spot", point: canvaPoint(sx, sy) };
        const line = '{ id: "BIRD-ID", point: canvaPoint(' + sx + ', ' + sy + ') },';
        panel.innerHTML = "<b>Paste this into birdSpots</b> (click here to copy):<br>" +
                          "<code style='color:#ffd54f'>" + line + "</code><br>" +
                          "Change BIRD-ID to the bird's id from data/aviary-data.js (the caged birds are in that file too).";
        panel.onclick = function () {
            if (navigator.clipboard) navigator.clipboard.writeText(line).catch(function () {});
        };
    });
}

// ======================================================================
// TREES (round trees from main-map.js, swaying in the wind)
// ======================================================================
// Trees are scattered over the free grass by the computer: one candidate per grid cell, and a candidate is
// DROPPED when it would stand on / too near a walkway or the bridge, in a pond, on a bird badge or its name,
// under the sign / Back button, or too close to another tree.
// So a tree can never hide a path or a label. (It is checked on the SCREEN, because a tree is drawn upright
// on the screen, also when the map is turned on a phone.)
//
// TO CHANGE:  TREE_CELL    bigger number = fewer trees (smaller = a denser forest)
//             TREE_CHANCE  share of cells that try to grow a tree (0 = no trees, 1 = every cell)
//             EXTRA_TREES  trees you place yourself: [sketch x, sketch y, size]  (same numbers as canvaPoint;
//                          size 1 = normal). If one of them is dropped, the browser console tells you why.
const TREE_CELL = 160;           // map units between two tree candidates
const TREE_CHANCE = 0.72;
const TREE_MIN_SIZE = 0.85;      // random tree size goes from this ...
const TREE_MAX_SIZE = 1.2;       // ... to this
const TREE_PATH_GAP = 6;         // free grass (map units) that must stay between a tree and a walkway
const TREE_SPACING = 58;         // closest two trees may stand (map units)
const EXTRA_TREES = [
    [935, 395, 1.45],     // the big tree in the middle of the loop
    [868, 425, 1.05],
    [1005, 380, 1.15]
];

// Same three greens and the same tree as main-map.js (no pink trees)
const ROUND_TREE_COLORS = [
    ["#3f7a46", "#5f9a58", "#356b3e", "#74ab66"],
    ["#3b7340", "#58934f", "#306338", "#6ea35f"],
    ["#437f49", "#64a05b", "#3a7141", "#7bb06b"]
];
// Drawn around (0, 0) = the base of the trunk on the ground
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

    // canopy: four overlapping blobs [dx, dy, radius, colour]
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

// ---- helpers for the "is there room for a tree here?" check ----
const walkSegments = [];
for (const line of walkways) {
    for (let i = 0; i < line.length - 1; i++) walkSegments.push([line[i].x, line[i].y, line[i + 1].x, line[i + 1].y]);
}

// How much free grass lies between the point and the nearest walkway / bridge edge (map units; 0 or less = on it)
function grassGapToPaths(x, y) {
    let best = Infinity;
    for (const s of walkSegments) {
        const dx = s[2] - s[0], dy = s[3] - s[1];
        const len2 = dx * dx + dy * dy;
        let t = len2 > 0 ? ((x - s[0]) * dx + (y - s[1]) * dy) / len2 : 0;
        t = Math.max(0, Math.min(1, t));
        const d = Math.hypot(x - (s[0] + dx * t), y - (s[1] + dy * t)) - PATH_WIDTH / 2;
        if (d < best) best = d;
    }
    return best;
}

// Is the map point inside a pond (k = 1 the water, bigger = with its shore and wet bank)?
function insidePond(x, y, k) {
    const sx = unstretchX(x / CANVA_SCALE + CANVA_ORIGIN.x);
    const sy = unstretchY(y / CANVA_SCALE + CANVA_ORIGIN.y);
    for (const pond of PONDS) {
        const ex = (sx - pond.center[0]) / (pond.rx * k), ey = (sy - pond.center[1]) / (pond.ry * k);
        if (ex * ex + ey * ey < 1) return true;
    }
    return false;
}

// Points of a tree (screen pixels, tree size 1, base at 0,0): the foot of the trunk and the canopy
const TREE_BODY = [[0, 8], [-14, 3], [14, 3], [0, -26], [-24, -30], [24, -30], [-16, -46], [16, -46], [0, -56]];

// Why can a tree NOT stand here? Returns null when it can, otherwise a short reason.
function treeProblem(sx, sy, k, others) {
    // inside the board (a little of the canopy may be cut by the frame, but the trunk must be visible)
    if (sx < board.x + 6 || sx > board.x + board.w - 6 || sy < board.y + 26 * k || sy > board.y + board.h - 4) return "outside the board";

    for (const p of TREE_BODY) {
        const m = screenToMap(sx + p[0] * k, sy + p[1] * k);
        if (grassGapToPaths(m.x, m.y) < TREE_PATH_GAP) return "on or beside a walkway";
        if (insidePond(m.x, m.y, 1.35)) return "in a pond";
    }

    const cx = sx, cy = sy - 32 * k, r = 28 * k;      // the canopy as one circle
    for (const o of others.items) {
        if (Math.hypot(cx - o.sx, cy - o.sy) < r + o.R + 4 || Math.hypot(sx - o.sx, sy - o.sy) < 12 * k + o.R + 4) return "on a bird badge";
        if (circleHitsRect(cx, cy, r + 3, o.lx, o.ly, o.w, o.h) || circleHitsRect(sx, sy, 12 * k + 3, o.lx, o.ly, o.w, o.h)) return "on a bird name";
    }
    for (const a of others.keepOut) {
        if (circleHitsRect(cx, cy, r, a.x, a.y, a.w, a.h)) return "under the sign / Back button";
    }
    return null;
}

let treeList = [];                // trees for this screen size, sorted so the lower ones stand in front

function layoutTrees() {
    // the joystick (phones / tablets) and its "Drag to move" hint are kept free of trees too
    const keepOut = keepOutAreas();
    const pad = document.getElementById("joystick");
    if (pad && pad.style.display !== "none") {
        const r = pad.getBoundingClientRect();
        keepOut.push({ x: r.left - 6, y: r.top - 6, w: r.width + 12, h: r.height + 52 });
    }
    const others = { items: birdLayout, keepOut: keepOut };
    const trees = [];
    const farEnough = function (mx, my) {
        for (const t of trees) if (Math.hypot(t.mx - mx, t.my - my) < TREE_SPACING) return false;
        return true;
    };
    const tryTree = function (mx, my, size, seed, label) {
        const p = mapToScreen({ x: mx, y: my });
        const k = viewScale * size;
        const problem = treeProblem(p.x, p.y, k, others) || (farEnough(mx, my) ? null : "too close to another tree");
        if (problem) { if (label) console.warn("Extra tree " + label + " was not drawn: " + problem + "."); return; }
        trees.push({ mx: mx, my: my, sx: p.x, sy: p.y, k: k, seed: seed });
    };

    // the trees you placed yourself come first
    EXTRA_TREES.forEach(function (t, i) {
        const m = canvaPoint(t[0], t[1]);
        tryTree(m.x, m.y, t[2] || 1, pseudoRandom(i * 5.1 + 2), "#" + (i + 1) + " (" + t[0] + ", " + t[1] + ")");
    });

    // then one candidate per grid cell, nudged by a repeatable random amount
    const cols = Math.ceil(view.w / TREE_CELL), rows = Math.ceil(view.h / TREE_CELL);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const seed = r * 53 + c * 11 + 3;
            if (pseudoRandom(seed * 1.7 + 0.5) > TREE_CHANCE) continue;
            const mx = view.x + (c + 0.15 + 0.7 * pseudoRandom(seed * 2.3 + 1)) * TREE_CELL;
            const my = view.y + (r + 0.15 + 0.7 * pseudoRandom(seed * 3.1 + 2)) * TREE_CELL;
            const size = TREE_MIN_SIZE + (TREE_MAX_SIZE - TREE_MIN_SIZE) * pseudoRandom(seed * 4.3 + 3);
            tryTree(mx, my, size, pseudoRandom(seed * 6.1 + 4), null);
        }
    }

    trees.sort(function (a, b) { return a.sy - b.sy; });     // lower on the screen = in front
    return trees;
}

// Drawn every frame (they sway), in SCREEN pixels so they stay upright on a turned phone map
function drawTrees() {
    if (!treeList.length) return;
    const t = performance.now() / 1000;

    ctx.save();
    ctx.setTransform(pixelRatioNow, 0, 0, pixelRatioNow, 0, 0);
    for (const tree of treeList) {
        // wind: the swing grows and shrinks slowly (gusts), same as main-map.js
        const gust = 0.5 + 0.5 * Math.sin(t * 0.35 + tree.sx * 0.01);
        const sway = Math.sin(t * 1.3 + tree.seed * 6.28) * (0.012 + 0.016 * gust);

        ctx.save();
        ctx.translate(tree.sx, tree.sy);     // TRANSLATION: to the foot of the tree
        ctx.scale(tree.k, tree.k);           // SCALING: the map size times the tree's own size
        ctx.rotate(sway);                    // ROTATION: sway round the base
        drawRoundTree(tree.seed);
        ctx.restore();
    }
    ctx.restore();
}

// ======================================================================
// BUTTERFLIES (from main-map.js)
// ======================================================================
// Each butterfly drifts round a centre point in a lazy figure-eight and flaps its wings.
// cx, cy = centre, ax, ay = how far it drifts sideways / up and down. All four are SKETCH pixels (same numbers as
// canvaPoint). Add a line = one more butterfly, delete a line = one less.
const BUTTERFLY_SIZE = 0.55;     // size of every butterfly: 1 = old size, 0.55 = about half. Lower = smaller.
const butterflies = [
    { cx: 935,  cy: 380, ax: 60, ay: 26, speed: 0.55, color: "#ffb300" },    // over the pond
    { cx: 880,  cy: 330, ax: 40, ay: 20, speed: 0.62, color: "#ff7ab6" },    // inside the loop
    { cx: 1000, cy: 470, ax: 38, ay: 18, speed: 0.58, color: "#ffffff" },    // inside the loop, low
    { cx: 700,  cy: 400, ax: 30, ay: 40, speed: 0.50, color: "#ffd54f" },    // left of the walk
    { cx: 860,  cy: 640, ax: 60, ay: 14, speed: 0.70, color: "#a58fd6" },    // below the cages
    { cx: 1230, cy: 300, ax: 24, ay: 38, speed: 0.52, color: "#8fc2ee" }     // right of the walk
];

function drawButterflies() {
    const t = performance.now() / 1000;
    const s = BUTTERFLY_SIZE * Math.max(0.8, Math.min(1.3, viewScale * 1.2));      // a little smaller on a small phone screen

    ctx.save();
    ctx.setTransform(pixelRatioNow, 0, 0, pixelRatioNow, 0, 0);

    for (let i = 0; i < butterflies.length; i++) {
        const b = butterflies[i];
        const phase = i * 1.7;
        // where it is at time tt (a lazy figure-eight), turned into a screen position
        const where = function (tt) {
            return mapToScreen(canvaPoint(b.cx + b.ax * Math.sin(tt * b.speed + phase),
                                          b.cy + b.ay * Math.sin(tt * b.speed * 2 + phase)));
        };
        const p = where(t), q = where(t + 0.05);               // q is a moment later: it shows the flying direction

        const flap = 0.25 + 0.75 * Math.abs(Math.sin(t * 13 + phase));   // wings open and close

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(q.y - p.y, q.x - p.x) + Math.PI / 2);      // face the flying direction
        ctx.scale(s, s);

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
    ctx.restore();
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

    drawLayer(baseLayer);                            // 1. grass, pond, tiled walkways
    drawTrees();                                     // 1b. swaying trees (never on a path or a label, see layoutTrees)
    drawButterflies();                               // 1c. butterflies
    drawDottedRoute(guideRoutes);                    // 2. the blue dotted guide line (entry to exit + the two cage paths)
    drawExitSign();                                  // 3. the EXIT sign at the end of the walk
    drawBirdSpots();                                 // 4. bird placeholder markers
    drawVisitor();                                   // 5. visitor pointer, on top

    ctx.setTransform(pixelRatioNow, 0, 0, pixelRatioNow, 0, 0);
    drawBoardInnerShadow();
    ctx.restore();                                   //    end of the clip

    drawFrame();                                     // 6. wooden frame around the board
}

// ======================================================================
// SCREEN FITTING (responsive)
// ======================================================================

// How the map sits on the screen (set in resizeCanvas)
let viewScale = 1;          // map unit -> screen pixel
let viewRotated = false;    // true = the map is shown turned a quarter turn

function resizeCanvas() {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const screenWidth = canvas.clientWidth;
    const screenHeight = canvas.clientHeight;

    canvas.width = Math.round(screenWidth * pixelRatio);
    canvas.height = Math.round(screenHeight * pixelRatio);

    // Free space kept around the map (screen pixels): small on phones, bigger on big screens
    const margin = Math.round(Math.max(6, Math.min(24, Math.min(screenWidth, screenHeight) * 0.022)));
    const freeW = screenWidth - 2 * margin;
    const freeH = screenHeight - 2 * margin;

    // On a narrow screen the wooden sign (top) and the Back button (bottom) lie over the board, so the map is
    // fitted into the free space between them. Then nothing on the map can ever hide behind them.
    positionSelectButton();                                             // the Select Location button (top centre)
    const titleEl = document.querySelector(".zoo-title"), backEl = document.querySelector(".zoo-back");
    const selectEl = document.getElementById("selectToggle");
    const narrow = screenWidth <= 600 || screenHeight <= 500;           // a phone, upright or on its side
    // the sign (top left) and the Back button (top right) are both at the top: keep the map below the lower one
    let reserveTop = 0;
    if (narrow) {
        for (const el of [titleEl, backEl, selectEl]) {
            if (el) reserveTop = Math.max(reserveTop, el.offsetTop + el.offsetHeight + 8 - margin);
        }
    }
    const reserveBottom = narrow ? 70 : 0;                          // room for the "You reached ..." popup
    const fitH = freeH - reserveTop - reserveBottom;                    // height the map may use
    const fitCenterY = margin + reserveTop + fitH / 2;                  // where its middle sits on the screen

    // The board: the whole screen minus the margin. The wooden frame is drawn in that margin.
    pixelRatioNow = pixelRatio;
    board = { x: margin, y: margin, w: freeW, h: freeH, band: Math.round(margin * 0.8) };
    buildOutside(screenWidth, screenHeight, pixelRatio);

    // How big can the map be drawn upright, and how big when turned a quarter turn?
    const uprightScale = Math.min(freeW / view.w, fitH / view.h);
    const turnedScale = Math.min(freeW / view.h, fitH / view.w);

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
            pixelRatio * (fitCenterY - s * cx)
        ];
    } else {
        viewMatrix = [
            pixelRatio * s, 0,
            0, pixelRatio * s,
            pixelRatio * (screenWidth / 2 - s * cx),
            pixelRatio * (fitCenterY - s * cy)
        ];
    }
    screenCtx.setTransform(viewMatrix[0], viewMatrix[1], viewMatrix[2], viewMatrix[3], viewMatrix[4], viewMatrix[5]);

    grassPattern = buildGrassPattern(pixelRatio);
    groundFlowers = buildGroundFlowers(screenWidth, screenHeight);
    buildLayers();
    birdLayout = layoutBirdSpots();      // badge + name positions for this screen size
    treeList = layoutTrees();            // trees go where no path, pond, badge or name is
    drawMap();
}

// Animation loop: move things, then redraw
let lastTime = null;

const FRAME_MS = 1000 / 30;           // draw at most 30 frames per second (smoother on phones, less heat)
let lastDraw = 0;
function animateRoute(now) {
    const cardOpen = typeof isBirdCardOpen === "function" && isBirdCardOpen();
    if (document.hidden || cardOpen || now - lastDraw < FRAME_MS) {
        if (cardOpen || document.hidden) lastTime = null;   // stop drawing while a card is open or the tab is hidden
        requestAnimationFrame(animateRoute);
        return;
    }
    lastDraw = now;
    // dt = seconds since the last frame (capped, so a paused tab doesn't make a big jump)
    const dt = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    dashOffset += 0.5;
    if (dashOffset >= 15) {
        dashOffset = 0;
    }

    updateVisitor(dt);                   // the visitor moves with WASD, or walks to the bird chosen in the list
    updateBirdPopup();                   // "You reached ..." popup near a bird

    drawMap();
    requestAnimationFrame(animateRoute);
}

// Resize canvas when window changes
window.addEventListener("resize", resizeCanvas);

// Start map
resizeCanvas();
requestAnimationFrame(animateRoute);

// ---------- Opening another page: instant feedback + no double taps ----------
// The button shows "Opening..." right away (the next page can take a moment on slow Wi-Fi), and
// a second tap is ignored. If the visitor comes back with the Back button, everything is reset.
let pageOpening = false;
let pageOpeningButton = null, pageOpeningLabel = "";
function openPage(url, button) {
    if (pageOpening) return;
    pageOpening = true;
    if (button) {
        pageOpeningButton = button;
        pageOpeningLabel = button.textContent;
        button.textContent = "Opening\u2026";
        button.style.opacity = "0.75";
    }
    window.location.href = url;
}
window.addEventListener("pageshow", function (e) {
    if (!e.persisted) return;                       // page restored from the back/forward cache
    pageOpening = false;
    if (pageOpeningButton) { pageOpeningButton.textContent = pageOpeningLabel; pageOpeningButton.style.opacity = ""; }
});

// ---------- Warm up the next page(s) while the visitor is still on this one ----------
// The browser quietly downloads them after this page has finished loading, so tapping the
// button opens the next page almost instantly. Skipped when Data Saver / a 2G connection is on.
function prefetchPages(urls) {
    const c = navigator.connection;
    if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ""))) return;
    urls.forEach(function (u) {
        const l = document.createElement("link");
        l.rel = "prefetch";
        l.href = u;
        document.head.appendChild(l);
    });
}
window.addEventListener("load", function () {
    setTimeout(function () { prefetchPages(["aviary.html", "aviary.js"]); }, 1500);
});