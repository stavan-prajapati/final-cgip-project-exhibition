// ============================================================
// animal-card.js  -  the pop-up card for one aviary animal.
//   openAnimalCard("bengal-tiger")  -> fills the card from zooAnimals and shows it
//   closeAnimalCard()                      -> hides it (and stops the sound)
// It uses the card HTML in zoo.html, the styles in style.css + aviary.css
// and the data in data/zoo-data.js.
// ============================================================

const animalCardOverlay = document.getElementById("placeCard");
const animalCardIcon    = document.getElementById("cardIcon");
const animalCardTitle   = document.getElementById("cardTitle");
const animalCardTagline = document.getElementById("cardTagline");
const animalCardStatus  = document.getElementById("cardStatus");
const animalCardBody    = document.getElementById("cardBody");
const animalCardImg     = document.getElementById("cardImg");
const animalCardFallback     = document.getElementById("cardFallback");
const animalCardFallbackIcon = document.getElementById("cardFallbackIcon");
const animalCardCredit  = document.getElementById("cardCredit");
const animalCardFacts   = document.getElementById("cardFacts");
const animalCardDyk     = document.getElementById("cardDyk");
const animalCardDykText = document.getElementById("cardDykText");
const animalCardTipBox  = document.getElementById("cardTipBox");
const animalCardSources = document.getElementById("cardSources");
const animalCardClose   = document.getElementById("cardClose");

const animalAudioBox  = document.getElementById("birdAudio");
const animalAudioBtn  = document.getElementById("audioBtn");
const animalAudioNote = document.getElementById("audioNote");
const animalAudioFill = document.getElementById("audioFill");

const ANIMAL_CARD_ICON = "🐾";

// ---------- Small helpers ----------

// Put a list of text lines into a <ul> (textContent: always shown as plain text, never as HTML)
function fillAnimalList(listElement, lines) {
    listElement.innerHTML = "";
    for (const line of lines) {
        const item = document.createElement("li");
        item.textContent = line;
        listElement.appendChild(item);
    }
}

// The quick facts: one tile per fact, with a small icon, a label and the text.
// "wide" tiles use the full card width, the others sit two by two.
function fillAnimalFacts(animal) {
    const rows = [
        { icon: "🌿", label: "Habitat",  text: animal.habitat,  wide: true },
        { icon: "🍎", label: "Diet",     text: animal.diet,     wide: true },
        { icon: "⚖️", label: "Weight",   text: animal.weight },
        { icon: "⏳",       label: "Lifespan", text: animal.lifespan }
    ];
    animalCardFacts.innerHTML = "";
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
        animalCardFacts.appendChild(item);
    }
}

// ---------- Photo ----------

// Show the photo if it loads, otherwise the "Photo coming soon" tile
function showAnimalPhoto(animal) {
    animalCardFallbackIcon.textContent = ANIMAL_CARD_ICON;
    animalCardImg.hidden = true;
    animalCardFallback.hidden = false;
    animalCardCredit.textContent = "";

    if (!animal.photo) return;

    animalCardImg.onload = function () {
        animalCardImg.hidden = false;
        animalCardFallback.hidden = true;
    };
    animalCardImg.onerror = function () {
        animalCardImg.hidden = true;
        animalCardFallback.hidden = false;
    };
    animalCardImg.alt = animal.name;
    animalCardImg.removeAttribute("src");     // makes sure onload fires again on re-open
    animalCardImg.src = animal.photo;
}

// ---------- Audio ----------
// "audio" in the animal's data is the sound file (audio_animals/<name>.mp3 / .wav).
// If the file is missing, the player is greyed out and says "Audio coming soon".
let animalSound = null;

function setAudioLook(state) {
    animalAudioBox.classList.toggle("ready", state === "ready" || state === "playing");
    animalAudioBox.classList.toggle("playing", state === "playing");
    animalAudioBtn.textContent = state === "playing" ? "❚❚" : "▶";
    animalAudioBtn.setAttribute("aria-label", state === "playing" ? "Pause the animal sound" : "Play the animal sound");
}

function stopAnimalSound() {
    if (!animalSound) return;
    animalSound.pause();
    animalSound.removeAttribute("src");
    animalSound.load();
    animalSound = null;
}

function setupAnimalSound(src) {
    stopAnimalSound();
    setAudioLook("none");
    animalAudioBtn.disabled = true;
    animalAudioFill.style.width = "0%";
    animalAudioNote.textContent = src ? "Loading the sound…" : "Audio coming soon";
    if (!src) return;

    const sound = new Audio();
    sound.preload = "auto";
    sound.addEventListener("canplay", function () {
        if (sound !== animalSound) return;
        animalAudioBtn.disabled = false;
        animalAudioNote.textContent = "Tap play to hear it";
        setAudioLook("ready");
    });
    sound.addEventListener("error", function () {
        if (sound !== animalSound) return;
        animalAudioBtn.disabled = true;
        animalAudioNote.textContent = "Audio coming soon";
        setAudioLook("none");
    });
    sound.addEventListener("play", function () { setAudioLook("playing"); animalAudioNote.textContent = "Playing…"; });
    sound.addEventListener("pause", function () {
        if (sound !== animalSound) return;
        setAudioLook("ready");
        animalAudioNote.textContent = "Tap play to hear it";
    });
    sound.addEventListener("timeupdate", function () {
        if (sound.duration) animalAudioFill.style.width = (100 * sound.currentTime / sound.duration) + "%";
    });
    sound.addEventListener("ended", function () {
        animalAudioFill.style.width = "0%";
        setAudioLook("ready");
        animalAudioNote.textContent = "Tap play to hear it again";
    });

    animalSound = sound;
    sound.src = src;
}

animalAudioBtn.addEventListener("click", function () {
    if (!animalSound) return;
    if (animalSound.paused) animalSound.play().catch(function () {});
    else animalSound.pause();
});

// ---------- Open / close ----------

function openAnimalCard(id) {
    const animal = zooAnimals.find(function (b) { return b.id === id; });
    if (!animal) return;

    const status = conservationStatus[animal.status] || { label: animal.status, color: "#00897b" };

    animalCardOverlay.style.setProperty("--accent", status.color);

    // the animal's own emoji; if this device cannot show it: the paw; if not even that: the first letter of the name
    const works = function (e) { return typeof emojiSupported === "function" ? emojiSupported(e) : true; };
    let own = (typeof animalInfo !== "undefined" && animalInfo[id]) ? animalInfo[id].icon : ANIMAL_CARD_ICON;
    if (!works(own)) own = works(ANIMAL_CARD_ICON) ? ANIMAL_CARD_ICON : animal.name.charAt(0);
    animalCardIcon.textContent = own;
    animalCardTitle.textContent = animal.name;
    animalCardTagline.textContent = animal.scientific;
    animalCardStatus.textContent = status.label + " (" + animal.status + ")";

    showAnimalPhoto(animal);
    setupAnimalSound(animal.audio);
    fillAnimalFacts(animal);

    animalCardDyk.hidden = !animal.funFact;
    animalCardDykText.textContent = animal.funFact || "";

    animalCardTipBox.hidden = true;

    fillAnimalList(animalCardSources, (animal.sources || []).map(function (key) {
        return animalSources[key] ? animalSources[key].name : key;
    }));

    animalCardBody.scrollTop = 0;
    animalCardOverlay.classList.add("open");
    animalCardOverlay.setAttribute("aria-hidden", "false");
    animalCardClose.focus();
}

// Used by the map: the visitor stands still while a card is open
function isAnimalCardOpen() {
    return animalCardOverlay.classList.contains("open");
}

function closeAnimalCard() {
    stopAnimalSound();
    setAudioLook("none");
    animalCardOverlay.classList.remove("open");
    animalCardOverlay.setAttribute("aria-hidden", "true");
}

// Ways to close the card: the X button, tapping outside it, or the Escape key
animalCardClose.addEventListener("click", closeAnimalCard);
animalCardOverlay.addEventListener("click", function (event) {
    if (event.target === animalCardOverlay) closeAnimalCard();
});
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeAnimalCard();
});