/**
 * The three target roles and the zero-trust "channel" each one maps to.
 *
 * Channel grouping (policy / identity / activity) is the author's own grouping
 * of the inputs in NIST SP 800-207, Fig. 2. It is stated as such on the site.
 */

export const ROLE_IDS = ['grc', 'iam', 'soc'] as const;
export type RoleId = (typeof ROLE_IDS)[number];

export type ChannelId = 'policy' | 'identity' | 'activity';

export interface RoleInfo {
  id: RoleId;
  /** Short label used in tags and table headers. */
  short: string;
  /** Full name of the discipline. */
  name: string;
  channel: ChannelId;
  channelLabel: string;
  /** The question this channel answers in an access decision. */
  question: string;
  /** Role page: title, hero lines and meta description. */
  pageTitle: string;
  heroRole: string;
  heroValue: string;
  description: string;
}

export const roles: Record<RoleId, RoleInfo> = {
  grc: {
    id: 'grc',
    short: 'GRC',
    name: 'Governance, risk and compliance',
    channel: 'policy',
    channelLabel: 'Policy',
    question: 'what is allowed',
    pageTitle: 'GRC analyst',
    heroRole: 'Entry-level GRC analyst',
    heroValue: 'Final-year computer science student. I study NIST and ISO/IEC 27001 and build security awareness tooling.',
    description:
      'Satish Kohale, entry-level GRC analyst: security awareness automation, NIST and ISO/IEC 27001 grounding, and documented security work.',
  },
  iam: {
    id: 'iam',
    short: 'IAM',
    name: 'Identity and access management',
    channel: 'identity',
    channelLabel: 'Identity',
    question: 'who is asking',
    pageTitle: 'IAM and PAM analyst',
    heroRole: 'Entry-level IAM and PAM analyst',
    heroValue:
      "Final-year computer science student. I have completed CyberArk University's PAM and Identity Security introductions, grounded in Active Directory and LDAP.",
    description:
      'Satish Kohale, entry-level IAM and privileged access management analyst: CyberArk University coursework, Active Directory and LDAP.',
  },
  soc: {
    id: 'soc',
    short: 'SOC',
    name: 'Security operations',
    channel: 'activity',
    channelLabel: 'Activity',
    question: 'what is happening',
    pageTitle: 'SOC L1 analyst',
    heroRole: 'Entry-level SOC L1 analyst',
    heroValue:
      'Final-year computer science student. I built a malicious-URL classifier and a phishing simulation platform, and I study detection with MITRE ATT&CK.',
    description: 'Satish Kohale, entry-level SOC L1 analyst: malicious-URL detection, phishing simulation, and MITRE ATT&CK grounding.',
  },
};

/** Map a channel back to its role. */
export const channelRole: Record<ChannelId, RoleId> = {
  policy: 'grc',
  identity: 'iam',
  activity: 'soc',
};
