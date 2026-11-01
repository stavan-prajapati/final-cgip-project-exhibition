// ============================================================
// bird-card.js  -  the pop-up card for one aviary bird.
//   openBirdCard("african-grey-parrot")  -> fills the card from aviaryBirds and shows it
//   closeBirdCard()                      -> hides it (and stops the sound)
// It uses the card HTML in aviary.html, the styles in style.css + aviary.css
// and the data in data/aviary-data.js.
// ============================================================

const birdCardOverlay = document.getElementById("placeCard");
const birdCardIcon    = document.getElementById("cardIcon");
const birdCardTitle   = document.getElementById("cardTitle");
const birdCardTagline = document.getElementById("cardTagline");
const birdCardStatus  = document.getElementById("cardStatus");
const birdCardBody    = document.getElementById("cardBody");
const birdCardImg     = document.getElementById("cardImg");
const birdCardFallback     = document.getElementById("cardFallback");
const birdCardFallbackIcon = document.getElementById("cardFallbackIcon");
const birdCardCredit  = document.getElementById("cardCredit");
const birdCardFacts   = document.getElementById("cardFacts");
const birdCardDyk     = document.getElementById("cardDyk");
const birdCardDykText = document.getElementById("cardDykText");
const birdCardTipBox  = document.getElementById("cardTipBox");
const birdCardSources = document.getElementById("cardSources");
const birdCardClose   = document.getElementById("cardClose");

const birdAudioBox  = document.getElementById("birdAudio");
const birdAudioBtn  = document.getElementById("audioBtn");
const birdAudioNote = document.getElementById("audioNote");
const birdAudioFill = document.getElementById("audioFill");

const BIRD_CARD_ICON = "🐦";

// ---------- Small helpers ----------

// Put a list of text lines into a <ul> (textContent: always shown as plain text, never as HTML)
function fillBirdList(listElement, lines) {
    listElement.innerHTML = "";
    for (const line of lines) {
        const item = document.createElement("li");
        item.textContent = line;
        listElement.appendChild(item);
    }
}

// The quick facts: one tile per fact, with a small icon, a label and the text.
// "wide" tiles use the full card width, the others sit two by two.
function fillBirdFacts(bird) {
    const rows = [
        { icon: "🌿", label: "Habitat",  text: bird.habitat,  wide: true },
        { icon: "🍎", label: "Diet",     text: bird.diet,     wide: true },
        { icon: "⚖️", label: "Weight",   text: bird.weight },
        { icon: "⏳",       label: "Lifespan", text: bird.lifespan }
    ];
    birdCardFacts.innerHTML = "";
    for (const row of rows) {
        if (!row.text) continue;
        const item = document.createElement("li");
        item.className = "fact" + (row.wide ? " wide" : "");

        const icon = document.createElement("span");
        icon.className = "fact-icon";
        icon.textContent = row.icon;

        const box = document.createElement("div");
        const label = document.createElement("b");
        label.textContent = row.label;
        const text = document.createElement("span");
        text.textContent = row.text;
        box.appendChild(label);
        box.appendChild(text);

        item.appendChild(icon);
        item.appendChild(box);
        birdCardFacts.appendChild(item);
    }
}

// ---------- Photo ----------

// Show the photo if it loads, otherwise the "Photo coming soon" tile
function showBirdPhoto(bird) {
    birdCardFallbackIcon.textContent = BIRD_CARD_ICON;
    birdCardImg.hidden = true;
    birdCardFallback.hidden = false;
    birdCardCredit.textContent = "";

    if (!bird.photo) return;

    birdCardImg.onload = function () {
        birdCardImg.hidden = false;
        birdCardFallback.hidden = true;
    };
    birdCardImg.onerror = function () {
        birdCardImg.hidden = true;
        birdCardFallback.hidden = false;
    };
    birdCardImg.alt = bird.name;
    birdCardImg.removeAttribute("src");     // makes sure onload fires again on re-open
    birdCardImg.src = bird.photo;
}

// ---------- Audio ----------
// "audio" in the bird's data is the sound file (audio/<name>.mp3).
// If the file is missing, the player is greyed out and says "Audio coming soon".
let birdSound = null;

function setAudioLook(state) {
    birdAudioBox.classList.toggle("ready", state === "ready" || state === "playing");
    birdAudioBox.classList.toggle("playing", state === "playing");
    birdAudioBtn.textContent = state === "playing" ? "❚❚" : "▶";
    birdAudioBtn.setAttribute("aria-label", state === "playing" ? "Pause the bird sound" : "Play the bird sound");
}

function stopBirdSound() {
    if (!birdSound) return;
    birdSound.pause();
    birdSound.removeAttribute("src");
    birdSound.load();
    birdSound = null;
}

function setupBirdSound(src) {
    stopBirdSound();
    setAudioLook("none");
    birdAudioBtn.disabled = true;
    birdAudioFill.style.width = "0%";
    birdAudioNote.textContent = src ? "Loading the sound…" : "Audio coming soon";
    if (!src) return;

    const sound = new Audio();
    sound.preload = "auto";
    sound.addEventListener("canplay", function () {
        if (sound !== birdSound) return;
        birdAudioBtn.disabled = false;
        birdAudioNote.textContent = "Tap play to hear it";
        setAudioLook("ready");
    });
    sound.addEventListener("error", function () {
        if (sound !== birdSound) return;
        birdAudioBtn.disabled = true;
        birdAudioNote.textContent = "Audio coming soon";
        setAudioLook("none");
    });
    sound.addEventListener("play", function () { setAudioLook("playing"); birdAudioNote.textContent = "Playing…"; });
    sound.addEventListener("pause", function () {
        if (sound !== birdSound) return;
        setAudioLook("ready");
        birdAudioNote.textContent = "Tap play to hear it";
    });
    sound.addEventListener("timeupdate", function () {
        if (sound.duration) birdAudioFill.style.width = (100 * sound.currentTime / sound.duration) + "%";
    });
    sound.addEventListener("ended", function () {
        birdAudioFill.style.width = "0%";
        setAudioLook("ready");
        birdAudioNote.textContent = "Tap play to hear it again";
    });

    birdSound = sound;
    sound.src = src;
}

birdAudioBtn.addEventListener("click", function () {
    if (!birdSound) return;
    if (birdSound.paused) birdSound.play().catch(function () {});
    else birdSound.pause();
});

// ---------- Open / close ----------

function openBirdCard(id) {
    const bird = aviaryBirds.find(function (b) { return b.id === id; });
    if (!bird) return;

    const status = conservationStatus[bird.status] || { label: bird.status, color: "#00897b" };

    birdCardOverlay.style.setProperty("--accent", status.color);

    birdCardIcon.textContent = BIRD_CARD_ICON;
    birdCardTitle.textContent = bird.name;
    birdCardTagline.textContent = bird.scientific;
    birdCardStatus.textContent = status.label + " (" + bird.status + ")";

    showBirdPhoto(bird);
    setupBirdSound(bird.audio);
    fillBirdFacts(bird);

    birdCardDyk.hidden = !bird.funFact;
    birdCardDykText.textContent = bird.funFact || "";

    birdCardTipBox.hidden = true;

    fillBirdList(birdCardSources, (bird.sources || []).map(function (key) {
        return birdSources[key] ? birdSources[key].name : key;
    }));

    birdCardBody.scrollTop = 0;
    birdCardOverlay.classList.add("open");
    birdCardOverlay.setAttribute("aria-hidden", "false");
    birdCardClose.focus();
}

// Used by the map: the visitor stands still while a card is open
function isBirdCardOpen() {
    return birdCardOverlay.classList.contains("open");
}

function closeBirdCard() {
    stopBirdSound();
    setAudioLook("none");
    birdCardOverlay.classList.remove("open");
    birdCardOverlay.setAttribute("aria-hidden", "true");
}

// Ways to close the card: the X button, tapping outside it, or the Escape key
birdCardClose.addEventListener("click", closeBirdCard);
birdCardOverlay.addEventListener("click", function (event) {
    if (event.target === birdCardOverlay) closeBirdCard();
});
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeBirdCard();
});