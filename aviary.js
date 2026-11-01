// ============================================================
// aviary.js  -  the Walk-in Aviary map.
//
// It is built the same way as main-map.js: tiled walkways with a soft shadow,
// a wooden bridge, a blue dotted guide line, the visitor pointer (WASD / arrow keys
// on a PC, joystick on a phone) and a map that fits every screen.
// The Canva design has diagonal parts, so the walkways are drawn as thick lines
// through a list of points (see "AVIARY GEOMETRY" below).
// ============================================================

const canvas = document.getElementById("aviarySectionMap");
const ctx = canvas.getContext("2d");

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

// ======================================================================
// AVIARY GEOMETRY (from the Canva file "walkin_aviary_map")
// ======================================================================
// The Canva design has diagonal parts, so this map cannot be drawn with
// upright rectangles only. Instead every walkway is a LIST OF POINTS joined by
// straight lines, drawn as one thick line (60 wide, like the main map).
// The tiles, shadow, bridge, blue dots and visitor are the same as in main-map.js.

const PATH_WIDTH = 60;               // same road width as the main map

// Points are written in CANVA pixels (exactly as in the Canva file), so you can compare
// them with the design. They are converted to map units with the two numbers below.
const CANVA_SCALE = 1.8;             // 1 Canva pixel = 1.8 map units  (bigger = bigger map)
const CANVA_ORIGIN = { x: 380, y: 200 };   // this Canva point becomes map (0, 0)

function canvaPoint(x, y) {
    return { x: (x - CANVA_ORIGIN.x) * CANVA_SCALE, y: (y - CANVA_ORIGIN.y) * CANVA_SCALE };
}
function canvaLine(list) {
    return list.map(function (p) { return canvaPoint(p[0], p[1]); });
}

// ---------- Walkways (ground level) ----------
const walkways = [
    // 1. Entrance (bottom), up to the junction, then round the LEFT lobe.
    //    It ends under the west end of the bridge.
    canvaLine([[743, 568], [743, 472], [698, 408], [698, 300], [630, 251], [468, 250],
               [420, 313], [420, 378], [495, 404], [600, 405]]),

    // 2. The RIGHT lobe. It starts under the east end of the bridge and ends at the exit.
    canvaLine([[720, 405], [755, 405], [808, 339], [967, 340], [1038, 378], [1030, 452],
               [958, 484], [880, 484], [786, 462], [786, 534]])
];

// ---------- Bridge (the grey part of the Canva file) ----------
// It runs from the left lobe to the right lobe, OVER the junction at x = 698
// (the ground path of the entrance passes underneath it).
const bridge = (function () {
    const a = canvaPoint(575, 405);
    const b = canvaPoint(755, 405);
    return { x: a.x, y: a.y - PATH_WIDTH / 2, w: b.x - a.x, h: PATH_WIDTH };
})();

// ---------- Blue dotted guide line ----------
// The part that goes UNDER the bridge is drawn before the bridge, so the deck hides it.
const groundRoutes = [
    canvaLine([[743, 568], [743, 472], [698, 408], [698, 300], [630, 251], [468, 250],
               [420, 313], [420, 378], [495, 404], [575, 405]]),
    canvaLine([[755, 405], [808, 339], [967, 340], [1038, 378], [1030, 452],
               [958, 484], [880, 484], [786, 462], [786, 534]])
];
// The part ON the bridge is drawn after the deck.
const bridgeRoutes = [
    canvaLine([[575, 405], [755, 405]])
];

// ---------- View box: the part of the map that is fitted to the screen ----------
// Worked out from the walkways, with a free grass border around them.
const VIEW_PADDING = 60;
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

// This map is wide, a phone held upright is tall. On such a screen the whole map is
// turned a quarter turn, so it fills the screen and everything is drawn much bigger.
// (The controls are turned with it, so "up" on the joystick is still "up" on the screen.)
const ROTATE_ON_PORTRAIT = true;

// ======================================================================
// WALKABLE AREA: ground level and bridge level
// ======================================================================

// Each straight piece of a walkway is a rectangle that can be turned to any angle.
// Corners (points between two pieces) get a circle, so they stay walkable.
const groundSegments = [];
const groundJoints = [];
for (const line of walkways) {
    for (let i = 0; i < line.length - 1; i++) {
        const a = line[i], b = line[i + 1];
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        groundSegments.push({ ax: a.x, ay: a.y, dx: (b.x - a.x) / length, dy: (b.y - a.y) / length, length: length });
    }
    for (let i = 1; i < line.length - 1; i++) groundJoints.push(line[i]);
}

// Is the point on a ground walkway?
function pointOnGround(px, py) {
    const half = PATH_WIDTH / 2;

    for (const s of groundSegments) {
        const rx = px - s.ax, ry = py - s.ay;
        const along = rx * s.dx + ry * s.dy;              // distance along the piece
        if (along < 0 || along > s.length) continue;
        const across = Math.abs(rx * s.dy - ry * s.dx);   // distance from its center line
        if (across <= half) return true;
    }
    for (const j of groundJoints) {
        if (Math.hypot(px - j.x, py - j.y) <= half) return true;
    }
    return false;
}

// Is the point on the bridge deck?
function pointOnBridge(px, py) {
    return px >= bridge.x && px <= bridge.x + bridge.w && py >= bridge.y && py <= bridge.y + bridge.h;
}

// Is the point within the two ends of the bridge (where you walk onto / off it)?
const BRIDGE_END_ZONE = 70;
function nearBridgeEnd(px, py) {
    if (py < bridge.y - 10 || py > bridge.y + bridge.h + 10) return false;
    return px < bridge.x + BRIDGE_END_ZONE || px > bridge.x + bridge.w - BRIDGE_END_ZONE;
}

// ======================================================================
// VISITOR POINTER
// ======================================================================

// ---------- Visitor pointer settings (same as the main map) ----------
const VISITOR_START = canvaPoint(743, 548);   // ENTRY POINT: the bottom of the entrance path
const VISITOR_RADIUS = 15;                    // size of the pointer (also its collision circle)
const VISITOR_SCREEN_SPEED = 130;             // how fast the pointer moves ON THE SCREEN (pixels per second), the same on every device
const VISITOR_COLOR = "#168bff";
const JOYSTICK_SPEED_FACTOR = 0.72;           // 1 = same as keyboard, 0.72 = a bit slower on the phone joystick

// heading = angle the pointer faces (0 = right, PI = left)
// level   = "ground" or "bridge": which level the visitor is walking on
const visitor = { x: VISITOR_START.x, y: VISITOR_START.y, heading: -Math.PI / 2, level: "ground" };

// ---------- Collision ----------
// The visitor is a circle. It may stand at (x, y) on a level only if the center AND
// 8 points around its edge are all on that level.
function onLevel(level, px, py) {
    return level === "bridge" ? pointOnBridge(px, py) : pointOnGround(px, py);
}

function canStandOn(level, x, y) {
    if (!onLevel(level, x, y)) return false;

    for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        if (!onLevel(level, x + Math.cos(a) * VISITOR_RADIUS, y + Math.sin(a) * VISITOR_RADIUS)) {
            return false;
        }
    }
    return true;
}

// Try to move the visitor to (nx, ny).
// You can only change level at the two ends of the bridge: so the walkway that passes
// UNDER the bridge can never be entered from the bridge, and the other way round.
function moveVisitorTo(nx, ny) {
    if (canStandOn(visitor.level, nx, ny)) {
        visitor.x = nx;
        visitor.y = ny;
        return;
    }

    if (nearBridgeEnd(visitor.x, visitor.y)) {
        const other = visitor.level === "ground" ? "bridge" : "ground";
        if (canStandOn(other, nx, ny)) {
            visitor.level = other;
            visitor.x = nx;
            visitor.y = ny;
        }
    }
}

// Is the visitor walking on the ground UNDER the bridge deck? (then it is hidden by the deck)
function visitorIsUnderBridge() {
    return visitor.level === "ground" &&
           pointOnBridge(visitor.x, visitor.y) &&
           !nearBridgeEnd(visitor.x, visitor.y);
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
function drawPaths() {
    drawShadow();

    ctx.save();
    ctx.lineJoin = "miter";
    ctx.lineCap = "butt";
    ctx.lineWidth = PATH_WIDTH;
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

    // Top railing stops before the east end, where the right-lobe walkway bends away upwards.
    drawRailing(bridge.x + 4, bridge.x + bridge.w - 70, bridge.y + 1);
    // Bottom railing runs the whole length.
    drawRailing(bridge.x + 4, bridge.x + bridge.w - 4, bridge.y + bridge.h - RAIL_HEIGHT - 1);
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

// Draw complete map (order matters: later drawings appear on top)
function drawMap() {
    drawGrass();                       // 1. grass
    drawPaths();                       // 2. shadows + tiled walkways
    drawDottedRoute(groundRoutes);     // 3. blue dots on the walkways (the bridge will cover the part under it)

    if (visitorIsUnderBridge()) drawVisitor();   // 4. a visitor walking UNDER the bridge is drawn before the deck
    drawBridge();                      // 5. the bridge lies over everything below it
    drawDottedRoute(bridgeRoutes);     // 6. blue dots on the bridge deck
    if (!visitorIsUnderBridge()) drawVisitor();  // 7. visitor pointer, on top
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
        ctx.setTransform(
            0, pixelRatio * s,
            -pixelRatio * s, 0,
            pixelRatio * (screenWidth / 2 + s * cy),
            pixelRatio * (screenHeight / 2 - s * cx)
        );
    } else {
        ctx.setTransform(
            pixelRatio * s, 0,
            0, pixelRatio * s,
            pixelRatio * (screenWidth / 2 - s * cx),
            pixelRatio * (screenHeight / 2 - s * cy)
        );
    }

    grassPattern = buildGrassPattern(pixelRatio);
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