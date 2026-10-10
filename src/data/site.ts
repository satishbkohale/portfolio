/**
 * Site-wide facts. Everything here is shown publicly, so keep it to facts you
 * are happy to publish. Never add a phone number or street address.
 *
 * Fields set to `null` are hidden on the site until you fill them in.
 * Source for the current values: the IAM resume provided on 2026-10-10.
 */

export interface SiteLinks {
  linkedin: string | null;
  github: string | null;
  hackerrank: string | null;
}

export const site = {
  name: 'Satish Kohale',
  /** Used in the <title> of the homepage. */
  headline: 'Cybersecurity student (SOC, IAM, GRC)',

  roleLine: 'Cybersecurity student',
  /** The hero h1: covers all three target roles. */
  heroTitle: 'Cybersecurity student open to SOC, IAM and GRC roles.',
  /** Hero supporting line on "/" (role URLs use the role's own line). */
  valueStatement:
    'CyberArk-trained in privileged access management, with hands-on phishing simulation and malicious-URL detection projects.',
  homeDescription:
    'Satish Kohale, final-year computer science student in Pune, India, looking for cybersecurity internships and entry-level SOC, IAM and GRC roles.',

  /** Three verifiable facts shown under the hero. */
  proofFacts: ['B.Tech CSE, final year', 'CyberArk PAM trained', 'Google Cybersecurity Certificate'],

  location: 'Pune, India',
  /** Public contact address. Swap for a domain alias (e.g. hello@yourdomain) when you have one. */
  email: 'satishbkohale44@gmail.com',

  // TODO(satish): add your public profile URLs; links render only when set.
  links: {
    linkedin: null,
    github: null,
    hackerrank: null,
  } as SiteLinks,

  education: {
    summary: 'B.Tech CSE, final year',
    /** Month and year, e.g. "June 2027". Hidden while null. */
    graduation: null as string | null,
  },

  availability: 'Open to opportunities',
  rolesOpenTo: 'internships and entry-level roles in SOC, IAM and GRC',

  /**
   * Resume PDFs (paths under /public). Must be scrubbed versions WITHOUT phone
   * number or street address. The "Download PDF" buttons appear once set.
   */
  resumePdf: {
    general: null as string | null,
    grc: null as string | null,
    iam: null as string | null,
    soc: null as string | null,
  },

  /** Public source repository, shown in the footer once set. */
  repoUrl: null as string | null,

  /** Question 3 in the plan: say the site was built with AI assistance. */
  aiAssistedNote: null as string | null,
} as const;

/** Section anchors used by the header and footer navigation. */
export const nav = [
  { label: 'Work', href: '/#work' },
  { label: 'Evidence', href: '/#evidence' },
  { label: 'Background', href: '/#background' },
  { label: 'Contact', href: '/contact/' },
] as const;
