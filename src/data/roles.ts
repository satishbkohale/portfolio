/**
 * The three target roles and the zero-trust "channel" each one maps to.
 *
 * Channel grouping (policy / identity / activity) is the author's own grouping
 * of the inputs in NIST SP 800-207, Fig. 2. It is stated as such on the site.
 */

export const ROLE_IDS = ['grc', 'iam', 'soc'] as const;
export type RoleId = (typeof ROLE_IDS)[number];

/** Order in the header switcher and on the home page. SOC is the default role. */
export const ROLE_ORDER: RoleId[] = ['soc', 'iam', 'grc'];
export const DEFAULT_ROLE: RoleId = 'soc';

/** One step of a role's scroll story. `id` is the 3D stage it lines up with. */
export interface RoleStep {
  id: string;
  /** Scroll progress (0 to 1) at which this stage starts. */
  at: number;
  title: string;
  text: string;
}

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
  /** Role page: one-word headline, statement, story steps, tools, links. */
  headline: string;
  statement: string;
  steps: RoleStep[];
  tools: string[];
  links: { label: string; href: string }[];
}

export const roles: Record<RoleId, RoleInfo> = {
  grc: {
    id: 'grc',
    short: 'GRC',
    name: 'Governance, risk and compliance',
    channel: 'policy',
    channelLabel: 'Policy',
    question: 'what is allowed',
    pageTitle: 'GRC: Govern',
    heroRole: 'Cybersecurity student, GRC focus',
    heroValue: 'I build security awareness tooling and work with NIST and ISO/IEC 27001.',
    description:
      'Satish Kohale, cybersecurity student in Pune: governance, risk and compliance practice mapping risks to ISO/IEC 27001 and NIST CSF controls.',
    headline: 'Govern',
    statement: 'I map risks to controls, policies and proof.',
    steps: [
      { id: 'framework', at: 0, title: 'Start from a framework', text: 'ISO/IEC 27001 themes and NIST CSF functions.' },
      { id: 'risks', at: 0.15, title: 'Register the risks', text: 'Phishing, excess access, malware, unpatched systems, suppliers.' },
      { id: 'mapped', at: 0.3, title: 'Map control, policy and evidence', text: 'Every risk traced to proof an auditor can check.' },
      { id: 'gap', at: 0.62, title: 'Find the gap', text: 'One risk has no control yet. Coverage stops at 80%.' },
      { id: 'remediated', at: 0.72, title: 'Close it', text: 'Add the control and its evidence. Coverage reaches 100%.' },
    ],
    tools: ['ISO/IEC 27001', 'NIST CSF 2.0', 'Risk registers', 'Security awareness'],
    links: [{ label: 'Cybersecurity awareness platform', href: '/projects/awareness-platform/' }],
  },
  iam: {
    id: 'iam',
    short: 'IAM',
    name: 'Identity and access management',
    channel: 'identity',
    channelLabel: 'Identity',
    question: 'who is asking',
    pageTitle: 'IAM: Control',
    heroRole: 'Cybersecurity student, IAM and PAM focus',
    heroValue: 'CyberArk-trained in privileged access, grounded in Active Directory and LDAP.',
    description:
      'Satish Kohale, cybersecurity student in Pune: identity and access management practice with CyberArk PAM, Active Directory, MFA and least privilege.',
    headline: 'Control',
    statement: 'I decide who gets in, with what, and for how long.',
    steps: [
      { id: 'request', at: 0, title: 'Know the identity', text: 'User, role, device and risk, checked on every request.' },
      { id: 'evaluate', at: 0.12, title: 'Check every gate', text: 'MFA, device posture, least privilege, conditional access.' },
      { id: 'granted', at: 0.45, title: 'Grant a time-limited session', text: 'Access expires on its own. Nothing is left standing.' },
      { id: 'vaulted', at: 0.6, title: 'Vault privileged sessions', text: 'Credentials stay in the vault and the session is recorded.' },
      { id: 'denied', at: 0.78, title: 'Stop what fails', text: 'The same user on an unmanaged device is denied at posture.' },
    ],
    tools: ['CyberArk (Vault, PVWA, CPM, PSM)', 'Active Directory', 'LDAP', 'MFA'],
    links: [{ label: 'CyberArk training in the evidence log', href: '#evidence' }],
  },
  soc: {
    id: 'soc',
    short: 'SOC',
    name: 'Security operations',
    channel: 'activity',
    channelLabel: 'Activity',
    question: 'what is happening',
    pageTitle: 'SOC: Detect',
    heroRole: 'Cybersecurity student, SOC focus',
    heroValue: 'I built a malicious-URL classifier and a phishing simulator, and I study MITRE ATT&CK.',
    description:
      'Satish Kohale, cybersecurity student in Pune: security operations practice in log monitoring, alert triage, phishing analysis and MITRE ATT&CK.',
    headline: 'Detect',
    statement: "I watch the logs, spot what doesn't belong and escalate it with context.",
    steps: [
      { id: 'stream', at: 0, title: 'Monitor the stream', text: 'Read SIEM alerts and log events as they arrive.' },
      { id: 'flagged', at: 0.22, title: 'Spot the anomaly', text: 'Odd hours, rare hosts, a suspicious URL.' },
      { id: 'correlated', at: 0.47, title: 'Correlate', text: 'Link related events into one story.' },
      { id: 'escalated', at: 0.72, title: 'Escalate', text: 'Open an incident with severity and an ATT&CK mapping.' },
    ],
    tools: ['SIEM basics', 'Python', 'MITRE ATT&CK', 'ServiceNow / Jira'],
    links: [{ label: 'Malicious URL detection', href: '/projects/malicious-url-detection/' }],
  },
};

/** Map a channel back to its role. */
export const channelRole: Record<ChannelId, RoleId> = {
  policy: 'grc',
  identity: 'iam',
  activity: 'soc',
};
