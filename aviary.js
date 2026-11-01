// ============================================================
// aviary.js  -  the Aviary map (placeholder for now).
// The canvas below is ready: draw the aviary map here later.
// ============================================================
const aviaryCanvas = document.getElementById("aviarySectionMap");
const aviaryCtx = aviaryCanvas.getContext("2d");

function sizeAviaryCanvas() {
    const ratio = window.devicePixelRatio || 1;
    aviaryCanvas.width = Math.round(aviaryCanvas.clientWidth * ratio);
    aviaryCanvas.height = Math.round(aviaryCanvas.clientHeight * ratio);
    aviaryCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawAviarySection();
}

function drawAviarySection() {
    aviaryCtx.fillStyle = "#a9c791";                       // grass
    aviaryCtx.fillRect(0, 0, aviaryCanvas.clientWidth, aviaryCanvas.clientHeight);
}

window.addEventListener("resize", sizeAviaryCanvas);
sizeAviaryCanvas();