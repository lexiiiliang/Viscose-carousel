// Ring order, not filename order. Reordering these rows moves the ring, the
// project column and the numbering together.
export const EXAMPLE_PROJECTS = [
  {
    file: "gallery/example/10.webp",
    name: "Matchday",
    type: "Motion",
    year: "2025",
  },
  {
    file: "gallery/example/12.webp",
    name: "Nightshift",
    type: "Art Direction",
    year: "2023",
  },
  {
    file: "gallery/example/14.webp",
    name: "Volt",
    type: "Branding",
    year: "2024",
  },
  {
    file: "gallery/example/16.webp",
    name: "Keycard",
    type: "Product Design",
    year: "2026",
  },
  {
    file: "gallery/example/18.webp",
    name: "None",
    type: "Photography",
    year: "2026",
  },
  {
    file: "gallery/example/2.webp",
    name: "Prestige Equine",
    type: "Web Design",
    year: "2025",
  },
  {
    file: "gallery/example/4.webp",
    name: "Blue Room",
    type: "Identity",
    year: "2023",
  },
  {
    file: "gallery/example/6.webp",
    name: "Steininvest",
    type: "Web Design",
    year: "2024",
  },
  {
    file: "gallery/example/8.webp",
    name: "CENE+",
    type: "Branding",
    year: "2026",
  },
  {
    file: "gallery/example/9.webp",
    name: "Snuff",
    type: "Editorial",
    year: "2024",
  },
  {
    file: "gallery/example/7.webp",
    name: "Iris",
    type: "Photography",
    year: "2023",
  },
  {
    file: "gallery/example/5.webp",
    name: "Sevenworlds",
    type: "Development",
    year: "2025",
  },
  {
    file: "gallery/example/3.webp",
    name: "Irse a Volver",
    type: "Art Direction",
    year: "2024",
  },
  {
    file: "gallery/example/1.webp",
    name: "PM24",
    type: "Branding",
    year: "2024",
  },
  {
    file: "gallery/example/17.webp",
    name: "Favor",
    type: "E-commerce",
    year: "2025",
  },
  {
    file: "gallery/example/15.webp",
    name: "Freshweb",
    type: "Web Design",
    year: "2025",
  },
  {
    file: "gallery/example/13.webp",
    name: "Proba",
    type: "Development",
    year: "2026",
  },
  {
    file: "gallery/example/11.webp",
    name: "MVN",
    type: "Identity",
    year: "2025",
  },
];

// Personal photos currently reuse the example labels. The image number is the
// visible carousel order, so replacing 1.jpg changes slot 01 and nothing else.
export const CUSTOM_PROJECTS = EXAMPLE_PROJECTS.map((project, index) => ({
  ...project,
  file: `gallery/custom/${index + 1}.jpg`,
}));

// Switch this one value to "example" for an immediate runtime rollback.
export const ACTIVE_GALLERY = "custom";

const GALLERIES = {
  custom: CUSTOM_PROJECTS,
  example: EXAMPLE_PROJECTS,
};

export const PROJECTS = GALLERIES[ACTIVE_GALLERY];
export const IMAGE_FILES = PROJECTS.map((project) => project.file);
