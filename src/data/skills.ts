/**
 * Skills matrix data.
 *
 * Proficiency labels (be honest; interviewers will probe these):
 *   applied   = used in a real project or internship
 *   practised = built or configured in a lab
 *   studied   = coursework or certification only
 *
 * `evidence` lists project (P#) and certificate (C#) refs. The build fails if a
 * ref does not exist. Refs to draft entries are hidden in production builds.
 *
 * TODO(satish): confirm every "studied" row. If you used something hands-on in
 * a lab, change it to "practised" and add the project ref that shows it.
 */

export type Proficiency = 'applied' | 'practised' | 'studied';
export type SkillBand = 'grc' | 'iam' | 'soc' | 'tools' | 'frameworks';

export interface Skill {
  name: string;
  band: SkillBand;
  proficiency: Proficiency;
  evidence: string[];
}

export const bands: { id: SkillBand; title: string; note: string }[] = [
  { id: 'grc', title: 'GRC', note: 'Governance, risk and compliance practices' },
  { id: 'iam', title: 'IAM', note: 'Identity and privileged access practices' },
  { id: 'soc', title: 'SOC', note: 'Security operations practices' },
  { id: 'tools', title: 'Tools', note: 'Products and languages' },
  { id: 'frameworks', title: 'Frameworks', note: 'Standards and models' },
];

export const proficiencyLabel: Record<Proficiency, string> = {
  applied: 'Applied',
  practised: 'Practised',
  studied: 'Studied',
};

export const proficiencyHelp: Record<Proficiency, string> = {
  applied: 'used in a real project',
  practised: 'built in a lab',
  studied: 'coursework or certification',
};

export const skills: Skill[] = [
  // GRC
  { band: 'grc', name: 'Security awareness automation', proficiency: 'applied', evidence: ['P1'] },
  { band: 'grc', name: 'Policies and compliance', proficiency: 'studied', evidence: ['C3'] },

  // IAM
  {
    band: 'iam',
    name: 'Privileged access management',
    proficiency: 'studied',
    evidence: ['C1', 'C2'],
  },
  { band: 'iam', name: 'Account onboarding (safes, platforms)', proficiency: 'studied', evidence: ['C1'] },
  { band: 'iam', name: 'Least privilege', proficiency: 'studied', evidence: ['C1', 'C2'] },
  { band: 'iam', name: 'Active Directory and LDAP', proficiency: 'studied', evidence: [] },

  // SOC
  { band: 'soc', name: 'Phishing simulation', proficiency: 'applied', evidence: ['P1'] },
  { band: 'soc', name: 'Malicious URL detection (ML)', proficiency: 'applied', evidence: ['P2'] },
  { band: 'soc', name: 'Monitoring and incident response', proficiency: 'studied', evidence: ['C3'] },
  { band: 'soc', name: 'Ticketing: ServiceNow, Jira', proficiency: 'studied', evidence: [] },

  // Tools
  { band: 'tools', name: 'Python', proficiency: 'applied', evidence: ['P1', 'P2'] },
  { band: 'tools', name: 'n8n', proficiency: 'applied', evidence: ['P1'] },
  { band: 'tools', name: 'REST APIs and JSON', proficiency: 'applied', evidence: ['P1'] },
  { band: 'tools', name: 'CyberArk (Vault, PVWA, CPM, PSM)', proficiency: 'studied', evidence: ['C1'] },
  { band: 'tools', name: 'Git, Postman, SQL', proficiency: 'studied', evidence: [] },
  { band: 'tools', name: 'Windows, Linux, networking', proficiency: 'studied', evidence: ['C3'] },

  // Frameworks
  { band: 'frameworks', name: 'NIST CSF', proficiency: 'studied', evidence: ['C3'] },
  { band: 'frameworks', name: 'ISO/IEC 27001', proficiency: 'studied', evidence: [] },
  { band: 'frameworks', name: 'MITRE ATT&CK, Kill Chain', proficiency: 'studied', evidence: [] },
  { band: 'frameworks', name: 'OWASP Top 10', proficiency: 'studied', evidence: [] },
];
