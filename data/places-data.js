// ============================================================
// SMART ZOO GUIDE — PLACE DETAILS
//
// Each key must match the place ID in main-map.js.
// Ticket Counter, Aviary and Zoo Entrance are excluded.
// Aviary and Zoo Entrance will open their own maps.
//
// Images:
// Museum: images/museum.jpg
// Clock:  images/clock-tower.jpg
// ============================================================

const placeDetails = {

    museum: {
        icon: "🏛️",
        color: "#00897b",
        title: "Baroda Museum & Picture Gallery",
        tagline: "Art, history and heritage in Sayaji Baug",

        facts: [
            "The museum was founded by Maharaja Sayajirao Gaekwad III. Its foundation stone was laid in 1887, and the museum building was completed in 1894.",
            "The museum and Picture Gallery preserve collections of art, sculpture, archaeology, ethnography and natural history.",
            "The Picture Gallery displays European paintings, including works by British painters J. M. W. Turner and John Constable.",
            "The museum's notable exhibits include an Egyptian mummy, a blue whale skeleton and the Akota Bronzes.",
            "The museum complex is located within Sayaji Baug, also known as Kamati Baug."
        ],

        didYouKnow: "",

        visitTip: "Allow time to explore both the museum and the Picture Gallery. Check current visiting hours before your visit.",

        photos: [
            {
                file: "images/museum.jpg",
                alt: "Baroda Museum and Picture Gallery in Vadodara",
                credit: "",
                license: ""
            }
        ],

        sources: [
            "Museum of India — Baroda Museum and Picture Gallery",
            "Gujarat Tourism — Baroda Museum and Picture Gallery",
            "History of Vadodara — Sayaji Baug"
        ]
    },

    clock: {
        icon: "🕰️",
        color: "#37474f",
        title: "Sayaji Baug Floral Clock",
        tagline: "A living landmark of Vadodara",

        facts: [
            "The Floral Clock is located inside Sayaji Baug, also known as Kamati Baug. The garden was commissioned by Maharaja Sayajirao Gaekwad III in 1879.",
            "The clock was designed by Shri Prakash Pethe and inaugurated on January 25, 1976.",
            "Its dial measures 20 feet in diameter and features alternating triangular sections planted with red and green Alternanthera grass.",
            "The clock's machinery is housed underground in a specially constructed pit. A concrete enclosure protects its motor and rotating mechanism.",
            "A master clock sends signals to the mechanism that moves the hands."
        ],

        didYouKnow: "",

        visitTip: "Take a moment to view the planted dial and its surrounding garden.",

        photos: [
            {
                file: "images/clock-tower.jpg",
                alt: "The Floral Clock at Sayaji Baug in Vadodara",
                credit: "",
                license: ""
            }
        ],

        sources: [
            "History of Vadodara — Sayaji Baug"
        ]
    }

};