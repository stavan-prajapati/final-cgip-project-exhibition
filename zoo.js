// ============================================================
// zoo.js  -  the Zoo section map (placeholder for now).
// The canvas below is ready: draw the zoo map here later.
// ============================================================
const zooCanvas = document.getElementById("zooSectionMap");
const zooCtx = zooCanvas.getContext("2d");

function sizeZooCanvas() {
    const ratio = window.devicePixelRatio || 1;
    zooCanvas.width = Math.round(zooCanvas.clientWidth * ratio);
    zooCanvas.height = Math.round(zooCanvas.clientHeight * ratio);
    zooCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawZooSection();
}

function drawZooSection() {
    zooCtx.fillStyle = "#a9c791";                       // grass
    zooCtx.fillRect(0, 0, zooCanvas.clientWidth, zooCanvas.clientHeight);
}

window.addEventListener("resize", sizeZooCanvas);
sizeZooCanvas();