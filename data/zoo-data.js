// ============================================================
// SMART ZOO GUIDE — ZOO ANIMALS (placeholder card data)
// ============================================================

const animalSources = {
    iucn:      { name: "IUCN Red List", url: "https://www.iucnredlist.org/" },
    sandiego:  { name: "San Diego Zoo Wildlife Alliance", url: "https://animals.sandiegozoo.org/" },
    smithsonian: { name: "Smithsonian National Zoo", url: "https://nationalzoo.si.edu/animals" },
    natgeo:   { name: "National Geographic", url: "https://www.nationalgeographic.com/animals" },
    adw:      { name: "Animal Diversity Web", url: "https://animaldiversity.org/" },
    wwf:      { name: "World Wildlife Fund", url: "https://www.worldwildlife.org/" },
    birdlife: { name: "BirdLife International", url: "https://www.birdlife.org/" },
    cms:      { name: "Convention on Migratory Species", url: "https://www.cms.int/" }
};

const zooAnimals = [
    {
        id: "bengal-tiger", number: 1, name: "Bengal Tiger",
        scientific: "Panthera tigris tigris",
        status: "EN",
        photo: "images/animals/bengal_tiger.jpg",
        habitat: "Tropical and subtropical forests, grasslands, mangroves and forested wetlands.",
        diet: "Deer, wild boar, buffalo and other medium-to-large animals.",
        weight: "Approx. 100–260 kg; males are generally heavier and values vary by region.",
        lifespan: "Approx. 8–10 years in the wild; may live longer in captivity.",
        funFact: "No two tigers have exactly the same stripe pattern. Researchers can use their stripes to identify individual tigers.",
        sources: ["iucn", "wwf", "sandiego"]
    },
    {
        id: "hippopotamus", number: 2, name: "Hippopotamus",
        scientific: "Hippopotamus amphibius",
        status: "VU",
        photo: "images/animals/hippopotamus.jpg",
        habitat: "Rivers, lakes, swamps and other freshwater habitats in sub-Saharan Africa.",
        diet: "Mainly grasses and other plant matter.",
        weight: "Approx. 1,400–4,500 kg; varies by sex and individual.",
        lifespan: "Up to about 40 years in the wild and around 50 years in captivity; varies.",
        funFact: "Hippos move underwater by walking or running along the riverbed rather than swimming like most animals.",
        sources: ["iucn", "sandiego", "natgeo"]
    },
    {
        id: "indian-wolf", number: 3, name: "Indian Wolf",
        scientific: "Canis lupus pallipes",
        status: "VU",
        photo: "images/animals/indian_wolf.jpg",
        habitat: "Dry grasslands, scrublands, semi-arid regions and open landscapes.",
        diet: "Small and medium-sized mammals, rodents, livestock and carrion.",
        weight: "Approx. 18–25 kg; varies.",
        lifespan: "Approx. 8–12 years; varies.",
        funFact: "Indian wolves are adapted to hot, dry landscapes and generally have a lighter, less dense coat than wolves from colder regions.",
        sources: ["iucn", "adw"]
    },
    {
        id: "jackal", number: 4, name: "Jackal",
        scientific: "Canis aureus",
        status: "LC",
        photo: "images/animals/jackal.jpg",
        habitat: "Grasslands, scrublands, forests, wetlands and areas near human settlements.",
        diet: "Small animals, insects, fruits, seeds and carrion.",
        weight: "Approx. 6–15 kg; varies.",
        lifespan: "Approx. 8–12 years; varies.",
        funFact: "Jackals are opportunistic feeders. They may hunt small prey, eat fruit or scavenge depending on what is available.",
        sources: ["iucn", "adw"]
    },
    {
        id: "leopard", number: 5, name: "Leopard",
        scientific: "Panthera pardus",
        status: "VU",
        photo: "images/animals/leopard.jpg",
        habitat: "Forests, grasslands, mountains, scrublands and some human-modified landscapes.",
        diet: "Deer, wild pigs, monkeys, small mammals and birds.",
        weight: "Approx. 30–90 kg; varies by sex and region.",
        lifespan: "Approx. 12–17 years in the wild; may live longer in captivity.",
        funFact: "Leopards often drag their prey into trees, helping protect it from scavengers.",
        sources: ["iucn", "wwf", "sandiego"]
    },
    {
        id: "nilgai", number: 6, name: "Nilgai",
        scientific: "Boselaphus tragocamelus",
        status: "LC",
        photo: "images/animals/nilgai.jpg",
        habitat: "Grasslands, scrub forests, open woodland and agricultural landscapes.",
        diet: "Grasses, herbs, leaves and other vegetation.",
        weight: "Approx. 109–288 kg; varies by sex and individual.",
        lifespan: "Approx. 12–20 years; varies.",
        funFact: "Adult males often have a bluish-grey coat, while females and young nilgai are usually tawny or orange-brown.",
        sources: ["iucn", "adw"]
    },
    {
        id: "red-eared-slider", number: 7, name: "Red-eared Slider",
        scientific: "Trachemys scripta elegans",
        status: "LC",
        photo: "images/animals/red_eared_slider.jpg",
        habitat: "Ponds, lakes, marshes and slow-moving freshwater habitats.",
        diet: "Aquatic plants, insects, worms, small fish and other aquatic animals.",
        weight: "Approx. 1–2 kg; varies.",
        lifespan: "Approx. 20–30 years; varies.",
        funFact: "Red-eared sliders often bask together on logs or rocks. If one turtle suddenly dives into the water, others nearby may follow.",
        sources: ["iucn", "adw", "smithsonian"]
    },
    {
        id: "sloth-bear", number: 8, name: "Sloth Bear",
        scientific: "Melursus ursinus",
        status: "VU",
        photo: "images/animals/sloth_bear.jpg",
        habitat: "Dry and moist forests, scrublands and some grasslands in the Indian subcontinent.",
        diet: "Termites, ants, fruits, honey and other insects or plant matter.",
        weight: "Approx. 90–140 kg; varies.",
        lifespan: "Approx. 20–30 years; varies.",
        funFact: "Sloth bears have a specially adapted lower lip and mouth that help them suck termites and ants from their nests.",
        sources: ["iucn", "sandiego", "natgeo"]
    },
    {
        id: "southern-pig-tailed-macaque", number: 9, name: "Southern Pig-tailed Macaque",
        scientific: "Macaca nemestrina",
        status: "VU",
        photo: "images/animals/southern_pig-tailed_macaque.jpg",
        habitat: "Tropical rainforests and other forested habitats in Southeast Asia.",
        diet: "Fruits, seeds, leaves, insects and small animals.",
        weight: "Approx. 5–15 kg; varies by sex.",
        lifespan: "Approx. 20–30 years; varies.",
        funFact: "Its short, curved tail resembles a pig’s tail, which is why it is called a pig-tailed macaque.",
        sources: ["iucn", "adw"]
    },
    {
        id: "striped-hyena", number: 10, name: "Striped Hyena",
        scientific: "Hyaena hyaena",
        status: "NT",
        photo: "images/animals/striped_hyena.jpg",
        habitat: "Dry grasslands, scrublands, rocky areas and semi-desert landscapes.",
        diet: "Carrion, small animals, insects, fruits and other available food.",
        weight: "Approx. 25–55 kg; varies.",
        lifespan: "Approx. 12–20 years; varies.",
        funFact: "Striped hyenas can raise their long mane when threatened, making themselves appear larger.",
        sources: ["iucn", "adw"]
    },
    {
        id: "white-tiger", number: 11, name: "White Tiger",
        scientific: "Panthera tigris tigris — white colour variation",
        status: "EN",
        photo: "images/animals/white_tiger.jpg",
        habitat: "The same habitat as Bengal tigers: forests, grasslands and mangrove habitats.",
        diet: "Meat, including deer, wild boar and other large prey.",
        weight: "Approx. 100–260 kg; varies by sex and individual.",
        lifespan: "Approx. 8–10 years in the wild; may live longer in captivity.",
        funFact: "White tigers are not albino. Their white coat is caused by a genetic colour variation, and they still have dark stripes.",
        sources: ["iucn", "wwf", "sandiego"]
    },
    {
        id: "wild-dog", number: 12, name: "Wild Dog / Dhole",
        scientific: "Cuon alpinus",
        status: "EN",
        photo: "images/animals/wild_dog.jpg",
        habitat: "Forests, grasslands and mountainous habitats across parts of South and Southeast Asia.",
        diet: "Deer and other medium-sized mammals; dholes hunt cooperatively in packs.",
        weight: "Approx. 10–20 kg; varies.",
        lifespan: "Approx. 10 years in the wild; may live up to around 16 years in zoos.",
        funFact: "Dholes are known as “whistling hunters.” Their whistles help pack members communicate while hunting in dense vegetation.",
        sources: ["iucn", "sandiego", "adw"]
    },
    {
        id: "indian-crested-porcupine", number: 13, name: "Indian Crested Porcupine",
        scientific: "Hystrix indica",
        status: "LC",
        photo: "images/animals/indian_crested_porcupine.jpg",
        habitat: "Rocky hillsides, forests, scrublands, grasslands, agricultural areas and other adaptable habitats across parts of Asia.",
        diet: "Mainly plant material, including roots, tubers, bulbs, fruits, grains and other vegetation. It may also gnaw bones for minerals.",
        weight: "Approx. 11–18 kg; varies.",
        lifespan: "Approx. 20 years; some individuals in captivity have lived around 27 years.",
        funFact: "When threatened, the Indian crested porcupine raises its quills and rattles hollow quills on its tail as a warning. It cannot shoot or throw its quills.",
        sources: ["iucn", "adw"]
    }
];