// ============================================================
// cages.js  -  the Caged Birds map.
//
// It is built exactly like aviary.js and main-map.js: tiled walkways with a soft shadow and a stone border,
// a blue dotted guide line, the visitor pointer (WASD / arrow keys on a PC, joystick on a phone), a wooden-framed
// board and a map that fits every screen. There are no birds, trees or other extras yet: this page is the MAP.
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
const TILE_RESOLUTION = 6;         // pixels per map unit in the tile image (keeps it sharp)

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
const STRETCH = 1.35;

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

function canvaPoint(x, y) {
    return { x: (stretchX(x) - CANVA_ORIGIN.x) * CANVA_SCALE, y: (y - CANVA_ORIGIN.y) * CANVA_SCALE };
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
const JOYSTICK_SPEED_FACTOR = 0.72;           // 1 = same as keyboard, 0.72 = a bit slower on the phone joystick

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

    // Four arrows on the base show which way each push moves the pointer (up is always up on the screen,
    // even when the map is turned a quarter turn on a phone).
    const ARROWS = [
        { text: "\u25B2", css: "top:5px; left:50%; transform:translateX(-50%);" },
        { text: "\u25BC", css: "bottom:5px; left:50%; transform:translateX(-50%);" },
        { text: "\u25C0", css: "left:6px; top:50%; transform:translateY(-50%);" },
        { text: "\u25B6", css: "right:6px; top:50%; transform:translateY(-50%);" }
    ];
    for (const arrow of ARROWS) {
        const mark = document.createElement("span");
        mark.textContent = arrow.text;
        mark.style.cssText =
            "position:absolute; pointer-events:none; line-height:1; font-size:15px;" +
            "color:#4e3119; text-shadow:0 1px 0 rgba(255,244,214,0.9);" + arrow.css;
        base.appendChild(mark);
    }

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

// Draw complete map (order matters: later drawings appear on top)
function drawMap() {
    if (!baseLayer) return;

    drawOutside();                                   // 0. backdrop around the board

    ctx.save();
    ctx.setTransform(pixelRatioNow, 0, 0, pixelRatioNow, 0, 0);
    roundedRect(board.x, board.y, board.w, board.h, BOARD_CORNER);
    ctx.clip();                                      //    everything below is only visible inside the board
    ctx.setTransform(viewMatrix[0], viewMatrix[1], viewMatrix[2], viewMatrix[3], viewMatrix[4], viewMatrix[5]);

    drawLayer(baseLayer);                            // 1. grass, tiled walkways
    drawDottedRoute(guideRoutes);                    // 2. the blue dotted guide line (entry to exit + the two cage paths)
    drawExitSign();                                  // 3. the EXIT sign at the end of the walk
    drawVisitor();                                   // 4. visitor pointer, on top
    // (bird markers will be drawn here later, between the dotted line and the visitor)

    ctx.setTransform(pixelRatioNow, 0, 0, pixelRatioNow, 0, 0);
    drawBoardInnerShadow();
    ctx.restore();                                   //    end of the clip

    drawFrame();                                     // 5. wooden frame around the board
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

    // On a narrow screen the wooden sign (top) and the Back button (bottom) lie over the board, so the map is
    // fitted into the free space between them. Then nothing on the map can ever hide behind them.
    const titleEl = document.querySelector(".zoo-title"), backEl = document.querySelector(".zoo-back");
    const narrow = screenWidth <= 600;
    const reserveTop = (narrow && titleEl) ? Math.max(0, titleEl.offsetTop + titleEl.offsetHeight + 8 - margin) : 0;
    const reserveBottom = (narrow && backEl) ? Math.max(0, screenHeight - backEl.offsetTop + 40 - margin) : 0;
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

    drawMap();
    requestAnimationFrame(animateRoute);
}

// Resize canvas when window changes
window.addEventListener("resize", resizeCanvas);

// Start map
resizeCanvas();
requestAnimationFrame(animateRoute);