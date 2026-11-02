// ============================================================
// SMART ZOO GUIDE — AVIARY BIRDS (placeholder data file)
//
// 25 bird species for the Aviary. Same idea as places-data.js:
// one entry per bird, filled from the bird reference file.
//
// Photos: put each photo at the path in "photo" (images/birds/<id>.jpg).
//         Until the file exists, a "Photo coming soon" placeholder should be shown.
// Audio:  put each call at the path in "audio" (audio_birds/<name>.mp3 or .wav).
//         Until the file exists, the card shows "Audio coming soon".
// Notes:  - "white-peacock" is a white colour morph of the Indian Peafowl, not a separate species.
//         - "white-swan" is assumed to be the Mute Swan (Cygnus olor): confirm it matches your photo.
//         - Weights and lifespans are approximate. Verify the numbers and the IUCN category
//           on each species page before publishing.
//
// Conservation codes: LC = Least Concern, NT = Near Threatened,
//                     VU = Vulnerable,    EN = Endangered
// ============================================================

const birdSources = {
    iucn:     { name: "IUCN Red List",                         url: "https://www.iucnredlist.org/" },
    birdlife: { name: "BirdLife International",                url: "https://www.birdlife.org/" },
    cornell:  { name: "Cornell Birds of the World",            url: "https://birdsoftheworld.org/" },
    parrots:  { name: "World Parrot Trust",                    url: "https://parrots.org/encyclopedia/" },
    adw:      { name: "Animal Diversity Web",                  url: "https://animaldiversity.org/" },
    museum:   { name: "Australian Museum",                     url: "https://australian.museum/" },
    bto:      { name: "British Trust for Ornithology",         url: "https://www.bto.org/" },
    wwt:      { name: "Wildfowl & Wetlands Trust",             url: "https://www.wwt.org.uk/" },
    bwa:      { name: "Birds of the World (Cornell Lab)",      url: "https://birdsoftheworld.org/" }
};

const conservationStatus = {
    LC: { label: "Least Concern",   color: "#2e7d32" },
    NT: { label: "Near Threatened", color: "#9e9d24" },
    VU: { label: "Vulnerable",      color: "#ef6c00" },
    EN: { label: "Endangered",      color: "#c62828" }
};

const aviaryBirds = [

    {
        id: "african-grey-parrot", number: 1, name: "African Grey Parrot", scientific: "Psittacus erithacus",
        status: "EN", photo: "images/birds/african_grey_parrot.jpg", audio: "audio_birds/african_grey_parrot.mp3",
        habitat: "West/Central African rainforest, forest edges, mangroves and wooded savanna.",
        diet: "Fruits, nuts, seeds, palm fruits and other plant matter.",
        weight: "Approx. 400–500 g", lifespan: "Approx. 40–60 years in captivity; varies",
        funFact: "African Greys are renowned for vocal learning and can imitate many sounds from their surroundings.",
        sources: ["iucn", "parrots", "cornell"]
    },
    {
        id: "alexandrine-parakeet", number: 2, name: "Alexandrine Parakeet", scientific: "Psittacula eupatria",
        status: "LC", photo: "images/birds/alexandrine_parakeet.jpg", audio: "audio_birds/alexandrine_parakeet.mp3",
        habitat: "Deciduous forests, woodlands, mangroves, plantations and gardens in South/Southeast Asia.",
        diet: "Fruits, seeds, grains, nuts, flowers and buds.",
        weight: "Approx. 250–260 g", lifespan: "Approx. 25–30 years; varies",
        funFact: "It is one of the larger parakeets; adult males usually show a coloured neck ring.",
        sources: ["iucn", "parrots", "cornell"]
    },
    {
        id: "black-swan", number: 3, name: "Black Swan", scientific: "Cygnus atratus",
        status: "LC", photo: "images/birds/black_swan.jpg", audio: "audio_birds/black_swan.mp3",
        habitat: "Freshwater lakes, wetlands, estuaries and coastal lagoons in Australia.",
        diet: "Aquatic plants, algae and submerged vegetation.",
        weight: "Approx. 3.7–9 kg", lifespan: "Approx. 10–20 years; varies",
        funFact: "Black Swans are native to Australia and have striking red bills against their black plumage.",
        sources: ["iucn", "cornell", "museum"]
    },
    {
        id: "blue-and-golden-macaw", number: 4, name: "Blue-and-Golden Macaw", scientific: "Ara ararauna",
        status: "LC", photo: "images/birds/blue_and_golden_macaw.jpg", audio: "audio_birds/blue_and_golden_macaw.mp3",
        habitat: "Tropical forests, palm swamps and riverine woodland in South America.",
        diet: "Nuts, seeds, fruits, palm fruits and berries.",
        weight: "Approx. 900–1,300 g", lifespan: "Approx. 30–50 years in captivity; sometimes longer",
        funFact: "Its powerful beak helps it crack hard nuts and seeds.",
        sources: ["iucn", "parrots", "cornell"]
    },
    {
        id: "blue-crowned-pigeon", number: 5, name: "Blue-crowned Pigeon", scientific: "Goura cristata",
        status: "VU", photo: "images/birds/blue_crowned_pigeon.jpg", audio: "audio_birds/blue_crowned_pigeon.mp3",
        habitat: "Lowland rainforest and swamp forest of New Guinea.",
        diet: "Fallen fruits, seeds, berries and other plant material.",
        weight: "Approx. 1.8–2.4 kg", lifespan: "Approx. 15–20 years; reports vary",
        funFact: "It is one of the largest living pigeon species and has an ornate, lacy crest.",
        sources: ["iucn", "birdlife", "cornell"]
    },
    {
        id: "budgerigar", number: 6, name: "Budgerigar", scientific: "Melopsittacus undulatus",
        status: "LC", photo: "images/birds/budgerigar.jpg", audio: "audio_birds/budgerigar.mp3",
        habitat: "Arid/semi-arid Australia: grasslands, scrub, open woodland and farmland.",
        diet: "Grass seeds and other small seeds.",
        weight: "Approx. 22–32 g", lifespan: "Approx. 5–10 years in captivity; varies with care",
        funFact: "Wild budgerigars are typically green and yellow; many other colour varieties are bred in captivity.",
        sources: ["iucn", "parrots", "cornell"]
    },
    {
        id: "cockatiel", number: 7, name: "Cockatiel", scientific: "Nymphicus hollandicus",
        status: "LC", photo: "images/birds/cockatiel.jpg", audio: "audio_birds/cockatiel.mp3",
        habitat: "Open woodland, savanna, scrubland and farmland in Australia.",
        diet: "Grass seeds, crop seeds and other seeds.",
        weight: "Approx. 80–100 g", lifespan: "Approx. 15–20 years in captivity; varies",
        funFact: "Its movable crest can communicate alertness and other behavioural states.",
        sources: ["iucn", "parrots", "cornell"]
    },
    {
        id: "comb-duck", number: 8, name: "Comb Duck", scientific: "Sarkidiornis melanotos",
        status: "LC", photo: "images/birds/comb_duck.jpg", audio: "audio_birds/comb_duck.mp3",
        habitat: "Tropical wetlands, lakes, rivers, marshes and flooded grasslands.",
        diet: "Seeds, aquatic plants, grasses and small aquatic animals.",
        weight: "Approx. 1–1.3 kg; varies", lifespan: "Approx. 10–15 years; records vary",
        funFact: "Adult males have a distinctive fleshy knob, or “comb,” on the bill.",
        sources: ["iucn", "birdlife", "cornell"]
    },
    {
        id: "diamond-dove", number: 9, name: "Diamond Dove", scientific: "Geopelia cuneata",
        status: "LC", photo: "images/birds/diamond_dove.jpg", audio: "audio_birds/diamond_dove.mp3",
        habitat: "Dry open woodland, scrub and grassland in Australia.",
        diet: "Small seeds, usually collected from the ground.",
        weight: "Approx. 35–50 g", lifespan: "Approx. 10 years in captivity; varies",
        funFact: "Its pale blue eye-ring and spotted wings give it a distinctive “diamond” appearance.",
        sources: ["iucn", "cornell", "museum"]
    },
    {
        id: "eclectus-parrot", number: 10, name: "Eclectus Parrot", scientific: "Eclectus roratus",
        status: "LC", photo: "images/birds/eclectus.jpg", audio: "audio_birds/eclectus.mp3",
        habitat: "Tropical rainforest and forest edges of New Guinea and nearby islands.",
        diet: "Fruits, berries, seeds, nuts, flowers and nectar.",
        weight: "Approx. 400–600 g", lifespan: "Approx. 30–50 years in captivity; varies",
        funFact: "The sexes look dramatically different: males are mainly green, females mainly red and blue.",
        sources: ["iucn", "parrots", "cornell"]
    },
    {
        id: "golden-pheasant", number: 11, name: "Golden Pheasant", scientific: "Chrysolophus pictus",
        status: "LC", photo: "images/birds/golden_pheasant.jpg", audio: "audio_birds/golden_pheasant.mp3",
        habitat: "Dense forests and wooded mountain slopes in China.",
        diet: "Seeds, leaves, berries, insects and other small invertebrates.",
        weight: "Approx. 500–700 g", lifespan: "Approx. 5–10 years; varies",
        funFact: "The male’s golden crest and colourful plumage feature in courtship displays.",
        sources: ["iucn", "birdlife", "cornell"]
    },
    {
        id: "indian-grey-hornbill", number: 12, name: "Indian Grey Hornbill", scientific: "Ocyceros birostris",
        status: "LC", photo: "images/birds/indian_grey_hornbill.jpg", audio: "audio_birds/indian_grey_hornbill.mp3",
        habitat: "Dry deciduous forests, open woodland, gardens and tree-rich urban areas in the Indian subcontinent.",
        diet: "Mainly fruits and figs, plus insects and small animals.",
        weight: "Approx. 250–350 g", lifespan: "Approx. 15–20 years; reports vary",
        funFact: "Despite its large bill, a hornbill’s bill is relatively lightweight because much of its structure is hollow.",
        sources: ["iucn", "birdlife", "cornell"]
    },
    {
        id: "indian-peafowl", number: 13, name: "Indian Peafowl", scientific: "Pavo cristatus",
        status: "LC", photo: "images/birds/indian_peafowl.jpg", audio: "audio_birds/indian_peafowl.mp3",
        habitat: "Forest edges, scrubland, open woodland, farmland and grassland in the Indian subcontinent.",
        diet: "Seeds, grains, fruits, insects, reptiles and other small animals.",
        weight: "Males often 4–6 kg; females often 2.7–4 kg", lifespan: "Approx. 10–25 years; varies",
        funFact: "The male’s spectacular train consists of elongated upper-tail coverts, not the true tail feathers.",
        sources: ["iucn", "birdlife", "cornell"]
    },
    {
        id: "painted-stork", number: 14, name: "Painted Stork", scientific: "Mycteria leucocephala",
        status: "NT", photo: "images/birds/painted_stork.jpg", audio: "audio_birds/painted_stork.mp3",
        habitat: "Wetlands, marshes, shallow lakes, flooded fields and reservoirs in South/Southeast Asia.",
        diet: "Fish, frogs, aquatic invertebrates and small reptiles.",
        weight: "Approx. 2–3.5 kg", lifespan: "Approx. 15–20 years; varies",
        funFact: "Pink tertial feathers give the bird its distinctive “painted” look, especially when its wings are folded.",
        sources: ["iucn", "birdlife", "cornell"]
    },
    {
        id: "peach-faced-lovebird", number: 15, name: "Peach-faced Lovebird", scientific: "Agapornis roseicollis",
        status: "LC", photo: "images/birds/peach_faced_lovebird.jpg", audio: "audio_birds/peach_faced_lovebird.wav",
        habitat: "Dry woodland, savanna and semi-arid southwestern Africa.",
        diet: "Seeds, grasses, berries and fruits.",
        weight: "Approx. 45–60 g", lifespan: "Approx. 10–15 years in captivity; varies",
        funFact: "Lovebirds commonly form strong pair bonds and often remain close to their mate.",
        sources: ["iucn", "parrots", "cornell"]
    },
    {
        id: "plum-headed-parakeet", number: 16, name: "Plum-headed Parakeet", scientific: "Psittacula cyanocephala",
        status: "LC", photo: "images/birds/plum_headed_parakeet.jpg", audio: "audio_birds/plum_headed_parakeet.mp3",
        habitat: "Open forests, woodland, forest edges and cultivated areas in the Indian subcontinent.",
        diet: "Fruits, seeds, berries, flowers and grains.",
        weight: "Approx. 60–80 g", lifespan: "Approx. 15–20 years; varies",
        funFact: "Adult males have a plum-coloured head, while females have a greyer head.",
        sources: ["iucn", "parrots", "cornell"]
    },
    {
        id: "red-junglefowl", number: 17, name: "Red Junglefowl", scientific: "Gallus gallus",
        status: "LC", photo: "images/birds/red_junglefowl.jpg", audio: "audio_birds/red_junglefowl.wav",
        habitat: "Tropical/subtropical forests, forest edges, scrub and bamboo thickets in South/Southeast Asia.",
        diet: "Seeds, fruits, insects, leaves and small invertebrates.",
        weight: "Approx. 500–1,300 g; males are typically heavier", lifespan: "Approx. 10–15 years; varies",
        funFact: "The Red Junglefowl is the wild ancestor of the domestic chicken.",
        sources: ["iucn", "birdlife", "cornell"]
    },
    {
        id: "ring-necked-pheasant", number: 18, name: "Ring-necked Pheasant", scientific: "Phasianus colchicus",
        status: "LC", photo: "images/birds/ringed_necked_pheasant.jpg", audio: "audio_birds/ringed_necked_pheasant.wav",
        habitat: "Grasslands, agricultural fields, woodland edges and scrub.",
        diet: "Seeds, grains, fruits, insects and other small invertebrates.",
        weight: "Approx. 700–1,800 g; varies by sex/subspecies", lifespan: "Often approx. 3–5 years in the wild; varies",
        funFact: "Native to Asia, this pheasant has been introduced to many other regions for game-bird management.",
        sources: ["iucn", "cornell", "adw"]
    },
    {
        id: "rose-ringed-parakeet", number: 19, name: "Rose-ringed Parakeet", scientific: "Psittacula krameri",
        status: "LC", photo: "images/birds/rose_ringed_parakeet.jpg", audio: "",
        habitat: "Open woodland, savanna, farmland, parks and gardens in Africa and South Asia.",
        diet: "Seeds, fruits, nuts, buds, flowers and grains.",
        weight: "Approx. 100–140 g", lifespan: "Approx. 20–30 years; varies",
        funFact: "Rose-ringed Parakeets have established wild populations in several cities outside their native range.",
        sources: ["iucn", "parrots", "cornell"]
    },
    {
        id: "rosy-pelican", number: 20, name: "Rosy Pelican", scientific: "Pelecanus onocrotalus",
        status: "LC", photo: "images/birds/rosy_pelican.jpg", audio: "audio_birds/rosy_pelican.mp3",
        habitat: "Lakes, lagoons, marshes, deltas and coastal wetlands.",
        diet: "Mainly fish.",
        weight: "Approx. 5–11 kg", lifespan: "Approx. 15–25 years; varies",
        funFact: "The expandable throat pouch helps it catch and hold prey; it is not a pouch for carrying fish over long distances.",
        sources: ["iucn", "birdlife", "cornell"]
    },
    {
        id: "scarlet-macaw", number: 21, name: "Scarlet Macaw", scientific: "Ara macao",
        status: "LC", photo: "images/birds/scarlet_macaw.jpg", audio: "audio_birds/scarlet_macaw.mp3",
        habitat: "Tropical rainforest and humid lowland forest in Central/South America.",
        diet: "Fruits, nuts, seeds, berries and palm fruits.",
        weight: "Approx. 900–1,500 g", lifespan: "Approx. 30–50 years in captivity; sometimes longer",
        funFact: "Scarlet Macaws may visit natural clay licks, possibly to obtain minerals or help counter compounds in their food.",
        sources: ["iucn", "parrots", "cornell"]
    },
    {
        id: "sun-conure", number: 22, name: "Sun Conure", scientific: "Aratinga solstitialis",
        status: "EN", photo: "images/birds/sun_conure.jpg", audio: "audio_birds/sun_conure.mp3",
        habitat: "Tropical forest, woodland edges and savanna in northern South America.",
        diet: "Fruits, seeds, nuts, flowers and berries.",
        weight: "Approx. 100–130 g", lifespan: "Approx. 20–30 years in captivity; varies",
        funFact: "Sun Conures are social birds whose loud calls help them keep contact with flock members.",
        sources: ["iucn", "parrots", "cornell"]
    },
    {
        id: "white-peacock", number: 23, name: "White Peacock", scientific: "Pavo cristatus (white colour morph)",
        status: "LC", photo: "images/birds/white_peacock.jpg", audio: "audio_birds/white_peacock.mp3",
        habitat: "As for Indian Peafowl: forest edges, scrub, open woodland, farmland and grassland in South Asia.",
        diet: "Seeds, grains, fruits, insects, reptiles and other small animals.",
        weight: "Similar to Indian Peafowl; males often 4–6 kg, females often 2.7–4 kg", lifespan: "Approx. 10–25 years; varies",
        funFact: "White peafowl are not automatically albinos; the white appearance is commonly linked to a genetic colour variation such as leucism.",
        sources: ["iucn", "cornell"]
    },
    {
        id: "white-swan", number: 24, name: "White Swan (Mute Swan)", scientific: "Cygnus olor",
        status: "LC", photo: "images/birds/white_swan.jpg", audio: "audio_birds/white_swan.mp3",
        habitat: "Lakes, ponds, rivers and sheltered coastal waters in Europe and parts of Asia; introduced populations elsewhere.",
        diet: "Aquatic plants, algae and submerged vegetation.",
        weight: "Approx. 8–12 kg; females are generally smaller", lifespan: "Approx. 10–20 years; varies",
        funFact: "“Mute” means this swan is generally less vocal than many other swans, not that it is completely silent.",
        sources: ["iucn", "cornell", "bto"]
    },
    {
        id: "zebra-finch", number: 25, name: "Zebra Finch", scientific: "Taeniopygia guttata",
        status: "LC", photo: "images/birds/zebra_finch.jpg", audio: "audio_birds/zebra_finch.mp3",
        habitat: "Dry grasslands, scrub, open woodland and farmland in Australia.",
        diet: "Grass seeds and other small seeds.",
        weight: "Approx. 10–16 g", lifespan: "Approx. 5–10 years in captivity; varies",
        funFact: "Zebra Finches are widely studied because they learn songs, making them useful for research on vocal learning.",
        sources: ["iucn", "cornell", "adw"]
    },
    {
        id: "common-crane", number: 26, name: "Common Crane", scientific: "Grus grus",
        status: "LC", photo: "images/birds/common_crane.jpg", audio: "audio_birds/common_crane.mp3",
        habitat: "Wetlands, marshes, grasslands and agricultural fields across parts of Europe and Asia.",
        diet: "Plants, seeds, roots, grains, insects, worms and small animals.",
        weight: "Approx. 4–7 kg; varies",
        lifespan: "Approx. 13 years on average; may live 30–40 years in exceptional cases",
        funFact: "Common cranes perform elaborate courtship dances, leaping and spreading their wings while calling to one another.",
        sources: ["iucn", "birdlife", "cornell", "wwt"]
    },
    {
        id: "indian-spotted-billed-duck", number: 27, name: "Indian Spotted-billed Duck", scientific: "Anas poecilorhyncha",
        status: "LC", photo: "images/birds/indian_spotted_billed_duck.jpg", audio: "audio_birds/indian_spotted_billed_duck.mp3",
        habitat: "Lakes, ponds, marshes, rivers and other freshwater wetlands, often with shallow water and vegetation.",
        diet: "Mainly aquatic plants and seeds, along with insects and small aquatic animals.",
        weight: "Approx. 790–1,500 g; varies",
        lifespan: "Approx. 5–10 years; varies",
        funFact: "Its bill has a bright yellow tip and red spots near the base, making it easy to recognize. The red spots are especially noticeable in the nominate Indian form.",
        sources: ["iucn", "birdlife", "cornell", "bwa"]
    }
];