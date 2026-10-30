// ============================================================
//  EDIT THIS FILE ONLY — all text, links and projects live here.
//  Theme colours are at the top of src/styles.css (:root).
// ============================================================

export const profile = {
  name: "Rakesh Meshua",
  firstName: "Rakesh",            // shown big in script font
  role: "Senior Data Analyst",
  typedIntro:
    "I turn messy data into investment decisions: Power BI, SQL, BigQuery and AI-assisted pipelines.",
  heroBio: "At Peak XV Partners I build Power BI dashboards, SQL and BigQuery models, and AI-assisted pipelines that help investors decide faster.",
  github: "https://github.com/rakeshmeshua",
  linkedin: "https://linkedin.com/in/rakesh023",
  email: "rakeshmeshua@gmail.com",
  resume: "Rakesh_Meshua_Resume.pdf", // file in public/ (no leading slash, so it works on GitHub Pages sub-paths); "" falls back to an email link
};

export const nav = [
  { label: "Work", href: "#work" },
  { label: "About", href: "#about" },
  { label: "Skills", href: "#skills" },
  { label: "Contact", href: "#contact" },
];

export const projects = [
  {
    title: "PMO Portfolio: From Strategy to Success",
    blurb: "Power BI decision board for 57 in-flight projects: health, SPI/CPI, risk and a Terminate / Pause / Recover / Accelerate call on each. Built for FP20 Analytics Challenge 41.",
    tags: ["Power BI", "DAX", "ZoomCharts"],
    link: "",
    image: "/projects/pmo-1.png",
  },
  {
    title: "Business Insights 360",
    blurb: "Multi-view Power BI suite covering Finance (P&L), Sales, Marketing, Supply Chain forecast accuracy and an Executive summary.",
    tags: ["Power BI", "DAX", "Finance Analytics"],
    link: "",
    image: "/projects/bi360.png",
  },
  {
    title: "AI Web Scraping Tool",
    blurb: "Claude Code-built scraper that cut per-company research from a day to 2-3 hours (~65%).",
    tags: ["Claude Code", "Python", "Web Scraping"],
    link: "",
    image: "/projects/scraper.svg",
  },
  {
    title: "AI Classification Pipelines",
    blurb: "Prompt-engineered classification of 3,000+ menu items and 600+ locations at 92% audited precision.",
    tags: ["Prompt Engineering", "BigQuery", "SQL"],
    link: "",
    image: "/projects/classification.svg",
  },
];

// Horizontal-scroll cards in the About section. Add/remove freely.
export const aboutCards = [
  {
    kicker: "01 // IDENTITY",
    badge: "PROFILE",
    title: "Rakesh Meshua",
    subtitle: "Senior Data Analyst",
    chips: ["Power BI", "DAX", "SQL", "BigQuery", "Python", "Claude Code"],
  },
  {
    kicker: "02 // NARRATIVE",
    badge: "NOW / HOME",
    title: "From news ops to investment analytics",
    body: "I spent five years at TRACXN, rising to lead a 20-person news operations team, before moving into data at Peak XV Partners. There I build dashboards and AI-assisted pipelines that help the investment team benchmark startups.",
    footer: ["Currently: Peak XV Partners", "Based in: Bengaluru, India"],
  },
  {
    kicker: "03 // EXPERIENCE",
    badge: "CAREER",
    title: "Peak XV Partners · TRACXN",
    body: "Senior Data Analyst at Peak XV since Sep 2022 with 10+ Power BI dashboards. Before that, Jun 2017 to Sep 2022 at TRACXN, from Information Executive to AVP, News Operations.",
    footer: ["10+ dashboards shipped", "Led a team of 20"],
  },
  {
    kicker: "04 // EDUCATION",
    badge: "ACADEMICS",
    title: "Where I’ve learned",
    body: "B.Tech in Electronics & Telecommunications, C.V. Raman College of Engineering, Bhubaneswar.",
    footer: ["Status: Graduated"],
  },
  {
    kicker: "05 // CERTIFICATIONS",
    badge: "LEARNING",
    title: "Always upskilling",
    body: "Google Data Analytics and IBM Data Science (Coursera). Currently working through 100 Days of Python, and picking up beginner Japanese.",
    footer: ["Ongoing: 100 Days of Python"],
  },
];

export const skills = {
  heading: "Skills & Technologies",
  groupLabel: "More comfortable",
  groupSub: "The tools I feel most at home with.",
  items: [
    { name: "Power BI & DAX", desc: "Data models, dashboards and row-level security via Tabular Editor.", meta: "BI", level: "Daily driver" },
    { name: "SQL & BigQuery", desc: "Joins and filtering to prepare competitive datasets for analysis.", meta: "querying", level: "Daily driver" },
    { name: "AI-Assisted Workflows", desc: "Claude Code and prompt engineering for scraping and classification.", meta: "automation", level: "Daily driver" },
    { name: "Python (Pandas)", desc: "Data wrangling and scripting for analysis pipelines.", meta: "scripting", level: "Proficient" },
    { name: "Advanced Excel & VBA", desc: "Cleaning, transformation and quick modelling.", meta: "spreadsheets", level: "Proficient" },
    { name: "Japanese", desc: "Beginner-level conversation and reading.", meta: "language", level: "Learning" },
  ],
};

export const contact = {
  heading: "Let's talk data",
  button: "Email me",
};
