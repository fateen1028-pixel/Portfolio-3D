export type Project = {
  index: string;
  title: string;
  description: string;
  year: string;
  technologies: string[];
  image: string;
  liveUrl: string;
  githubUrl: string;
};

export const site = {
  name: "Mohamed Fateen",
  role: "Software Engineer",
  tagline: "Building systems, products, and interactive experiences.",
  nav: [
    { label: "Work", href: "#work" },
    { label: "About", href: "#about" },
    { label: "Contact", href: "#contact" },
  ],
  email: "hello@fateen.dev",
  github: "https://github.com",
  linkedin: "https://linkedin.com/in/fateen",
  about: [
    "I build software systems and interactive products.",
    "Engineer by training, designer by instinct — I care about how systems behave under load and how interfaces feel under a finger.",
  ],
};

export const projects: Project[] = [
  {
    index: "01",
    title: "DeployForge",
    description:
      "Developer deployment automation. Push-to-deploy pipelines, preview environments, zero-downtime rollouts.",
    year: "2025",
    technologies: ["TypeScript", "Docker", "Spring Boot", "PostgreSQL"],
    image: "/images/projects/deployforge.svg",
    liveUrl: "#work",
    githubUrl: "https://github.com",
  },
  {
    index: "02",
    title: "ChatY",
    description:
      "Encrypted communication platform. Real-time messaging with end-to-end encryption, presence, and file sharing.",
    year: "2024",
    technologies: ["TypeScript", "Next.js", "WebSockets", "PostgreSQL"],
    image: "/images/projects/chaty.svg",
    liveUrl: "#work",
    githubUrl: "https://github.com",
  },
  {
    index: "03",
    title: "SkillForge AI",
    description:
      "AI-powered learning and knowledge system. Adaptive paths, retrieval over your own documents, progress analytics.",
    year: "2024",
    technologies: ["Python", "FastAPI", "React", "PostgreSQL"],
    image: "/images/projects/skillforge.svg",
    liveUrl: "#work",
    githubUrl: "https://github.com",
  },
];
