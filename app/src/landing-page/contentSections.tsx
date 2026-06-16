import daBoiAvatar from "../client/static/da-boi.webp";
import kivo from "../client/static/examples/kivo.webp";
import type { GridFeature } from "./components/FeaturesGrid";

export const features: GridFeature[] = [
  {
    name: "Klantbeheer",
    description: "Beheer al uw klanten en hun contactgegevens op één plek.",
    emoji: "👥",
    href: "#",
    size: "small",
  },
  {
    name: "Projecten & Objecten",
    description: "Koppel inspecties aan projecten, objecten en adressen.",
    emoji: "🏢",
    href: "#",
    size: "small",
  },
  {
    name: "Inspecties Uitvoeren",
    description: "Gestructureerde inspecties met bevindingen per categorie en ernst.",
    emoji: "🔍",
    href: "#",
    size: "medium",
  },
  {
    name: "Foto's & Bijlagen",
    description: "Voeg foto's toe aan bevindingen — veilig opgeslagen en snel toegankelijk.",
    emoji: "📸",
    href: "#",
    size: "large",
  },
  {
    name: "Rapportages",
    description: "Genereer professionele inspectierapporten met één klik.",
    emoji: "📋",
    href: "#",
    size: "large",
  },
  {
    name: "AI-Assistentie",
    description: "Laat AI helpen bij het schrijven van aanbevelingen en conclusies.",
    emoji: "🤖",
    href: "#",
    size: "small",
  },
  {
    name: "Digitale Handtekeningen",
    description: "Laat klanten en inspecteurs digitaal ondertekenen.",
    emoji: "✍️",
    href: "#",
    size: "small",
  },
  {
    name: "Templates",
    description: "Herbruikbare inspectiesjablonen per sector en type.",
    emoji: "📝",
    href: "#",
    size: "medium",
  },
  {
    name: "Teamwerk",
    description: "Werk samen met meerdere inspecteurs in één account.",
    emoji: "🤝",
    href: "#",
    size: "medium",
  },
];

export const testimonials = [
  {
    name: "Jan de Vries",
    role: "Zelfstandig Bouwkundig Inspecteur",
    avatarSrc: daBoiAvatar,
    socialUrl: "#",
    quote: "Eindelijk een tool die begrijpt hoe een bouwkundige inspectie werkt. Van klant tot rapport — alles in één flow.",
  },
  {
    name: "Petra Bakker",
    role: "Eigenaar @ BouwInspect BV",
    avatarSrc: daBoiAvatar,
    socialUrl: "#",
    quote: "Mijn team van 5 inspecteurs werkt nu eindelijk in één systeem. Geen losse Excel-sheets meer.",
  },
  {
    name: "Mohammed El Amrani",
    role: "Inspecteur & Adviseur",
    avatarSrc: daBoiAvatar,
    socialUrl: "#",
    quote: "De AI-suggesties besparen mij uren per week aan rapporten schrijven.",
  },
];

export const faqs = [
  {
    id: 1,
    question: "Voor wie is Inspection App bedoeld?",
    answer: "Voor zelfstandige bouwkundig inspecteurs en kleine inspectiebedrijven (1-10 medewerkers) die hun inspecties, klanten en rapporten willen digitaliseren.",
    href: "#",
  },
  {
    id: 2,
    question: "Kan ik rapporten exporteren?",
    answer: "Ja, u kunt inspectierapporten genereren en exporteren als PDF, compleet met bevindingen, foto's en aanbevelingen.",
    href: "#",
  },
  {
    id: 3,
    question: "Werkt het ook op mobiel?",
    answer: "Inspection App is volledig responsive en werkt op uw smartphone of tablet via de browser — geen aparte app nodig.",
    href: "#",
  },
];

export const footerNavigation = {
  app: [
    { name: "Features", href: "/#features" },
    { name: "Prijzen", href: "#" },
  ],
  company: [
    { name: "Over Ons", href: "#" },
    { name: "Privacy", href: "#" },
    { name: "Voorwaarden", href: "#" },
  ],
};

export const examples = [
  {
    name: "Bouwkundige Keuring",
    description: "Volledige bouwkundige inspectie met bevindingen per element.",
    imageSrc: kivo,
    href: "#",
  },
  {
    name: "Opleveringsrapport",
    description: "Opleveringsinspectie met foto's en herstelpunten.",
    imageSrc: kivo,
    href: "#",
  },
  {
    name: "Energielabel Opname",
    description: "Inspectie ter voorbereiding van een energielabel.",
    imageSrc: kivo,
    href: "#",
  },
];
