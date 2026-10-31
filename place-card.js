// ============================================================
// place-card.js  -  the pop-up information card.
//   openPlaceCard("museum")  -> fills the card from placeDetails and shows it
//   closePlaceCard()         -> hides it
// It only uses plain HTML elements (see index.html) and the data in
// data/places-data.js. It knows nothing about the map drawing.
// ============================================================

const cardOverlay = document.getElementById("placeCard");
const cardIcon    = document.getElementById("cardIcon");
const cardTitle   = document.getElementById("cardTitle");
const cardTagline = document.getElementById("cardTagline");
const cardBody    = document.getElementById("cardBody");
const cardImg     = document.getElementById("cardImg");
const cardFallback     = document.getElementById("cardFallback");
const cardFallbackIcon = document.getElementById("cardFallbackIcon");
const cardCredit  = document.getElementById("cardCredit");
const cardFacts   = document.getElementById("cardFacts");
const cardDyk     = document.getElementById("cardDyk");
const cardDykText = document.getElementById("cardDykText");
const cardTipBox  = document.getElementById("cardTipBox");
const cardTip     = document.getElementById("cardTip");
const cardSources = document.getElementById("cardSources");
const cardClose   = document.getElementById("cardClose");

// Put a list of text lines into a <ul>
// (textContent is used on purpose: it shows text as plain text, never as HTML)
function fillList(listElement, lines) {
    listElement.innerHTML = "";
    for (const line of lines) {
        const item = document.createElement("li");
        item.textContent = line;
        listElement.appendChild(item);
    }
}

// Show the photo if it loads, otherwise show the "Photo coming soon" tile.
// The image is only requested when the card opens, so the map starts fast.
function showPhoto(photo, icon) {
    cardFallbackIcon.textContent = icon;
    cardImg.hidden = true;
    cardFallback.hidden = false;
    cardCredit.textContent = "";

    if (!photo) return;

    cardImg.onload = function () {
        cardImg.hidden = false;
        cardFallback.hidden = true;
        cardCredit.textContent = [photo.credit, photo.license].filter(Boolean).join(" · ");
    };
    cardImg.onerror = function () {
        cardImg.hidden = true;
        cardFallback.hidden = false;
        cardCredit.textContent = "";
    };

    cardImg.alt = photo.alt || "";
    cardImg.removeAttribute("src");   // makes sure onload fires again on re-open
    cardImg.src = photo.file;
}

function openPlaceCard(id) {
    const data = placeDetails[id];
    if (!data) return;

    cardOverlay.style.setProperty("--accent", data.color);

    cardIcon.textContent = data.icon;
    cardTitle.textContent = data.title;
    cardTagline.textContent = data.tagline;

    showPhoto(data.photos && data.photos[0], data.icon);

    fillList(cardFacts, data.facts || []);

    cardDyk.hidden = !data.didYouKnow;
    cardDykText.textContent = data.didYouKnow || "";

    cardTipBox.hidden = !data.visitTip;
    cardTip.textContent = data.visitTip || "";

    fillList(cardSources, data.sources || []);

    cardBody.scrollTop = 0;
    cardOverlay.classList.add("open");
    cardOverlay.setAttribute("aria-hidden", "false");
    cardClose.focus();
}

function closePlaceCard() {
    cardOverlay.classList.remove("open");
    cardOverlay.setAttribute("aria-hidden", "true");
}

// Ways to close the card: the X button, tapping outside it, or the Escape key
cardClose.addEventListener("click", closePlaceCard);
cardOverlay.addEventListener("click", function (event) {
    if (event.target === cardOverlay) closePlaceCard();
});
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closePlaceCard();
});