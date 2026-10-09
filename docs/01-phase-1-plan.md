# Phase 1: Plan

Security portfolio site for an entry-level GRC, IAM and SOC candidate.

- **Status:** awaiting your approval. No project code has been written.
- **Prepared** 2026-10-09; **revised** 2026-10-10 after two independent reviews (a technical fact-check and a hiring-manager/design review).
- Version numbers, standards and platform behaviour were checked against primary sources. Sources and implementation gotchas are in [01b-technical-notes.md](01b-technical-notes.md).

---

## 0. Questions for you

**[P2]** means I need it before Phase 2 (design). **[M0]** etc. means before that build milestone. Everything else in this plan works with placeholders until then.

### A. Timing and how we work
1. **[P2] Deadline.** When must the site be live? This decides whether the first release ships with the 2D figure and adds 3D a week later (Section 9.1).
2. **[P2] Who builds what.** Should I build everything, or build alongside you so you learn specific parts (for example the contact Worker, the security headers, or CI)? Interviewers will ask about anything on `/security`, so you should be able to explain it.
3. **[P2] AI disclosure.** Should the site say it was built with AI assistance? My recommendation is yes: one line in the colophon, with every decision recorded in `docs/adr/`. Being open about it is safer than being found out.
4. **Time.** How many hours a week can you spend writing content and reviewing milestones?

### B. Evidence (the most important input)
5. **[P2] Projects and labs.** One template per project (Section 3.7): title, problem, approach, tools, outcome with numbers, links, public or private, and roles.
6. **[P2] Certifications.** Earned (with date and verification link), in progress (with exam month), and planned.
7. **[P2] Experience.** Internships, part-time work, IT support, research, club leadership, volunteering. Include dates, the employer names you may publish, and any NDA limits.
8. **[P2] Training platforms.** TryHackMe, Hack The Box, LetsDefend, CyberDefenders, Blue Team Labs Online: ranks, public profile URLs, CTF placements with dates. These can become proof facts in the hero.
9. **Writing.** Do you have published write-ups? I recommend a Writing section only if you have at least two solid pieces at launch.
10. **[P2] Tool honesty check.** For each tool you listed (Splunk, Wazuh, Sentinel, Okta, Entra ID and others): did you use it hands-on (lab or internship), or only study it? This sets the labels in Section 3.4.

### C. Positioning and identity
11. **[P2] Role priority.** Rank GRC, IAM and SOC. Until you answer, this plan uses your order (GRC, IAM, SOC) everywhere.
12. **Adjacent titles.** Are you open to Security Analyst, Cyber Risk Analyst, junior Identity Engineer or junior Detection Engineer?
13. **[P2] Name.** Your full name as it should appear, and a short form if different.
14. **[P2] Education.** Degree, university, graduation month and year.
15. **[P2] Location.** City and country, or country only? Do you want to state work authorisation, relocation or remote preferences?
16. **[P2] Markets.** Which countries are you applying in? This changes the frameworks to emphasise, the resume conventions, and whether the site uses US or British spelling.

### D. Assets, accounts and your computer
17. **[M3] Resume.** The current PDF and its source file. One resume, or one per role? Confirm the public version can omit your phone number and street address.
18. **Headshot.** Yes or no? I recommend it as optional, small, and not in the hero.
19. **[M0] Domain.** Do you own one? Which name? I recommend `firstnamelastname.com` or `.dev`, about US$10–15 a year. It is needed from M0 because the email alias and spam protection depend on it.
20. **[M0] Links and inbox.** GitHub and LinkedIn URLs, and which inbox should receive messages. Is an alias such as `hello@yourdomain` acceptable?
21. **Replying from the alias.** The alias only receives mail. Your replies would come from your personal address unless we set up outbound mail for the domain, which is more setup and cost. My recommendation for launch: receive at the alias, reply from your personal inbox.
22. **[M0] Accounts.** Do you have GitHub and Cloudflare accounts, or will you create them? Do you have a passkey or hardware security key for MFA?
23. **[M0] Installs.** May I install pnpm (through npm), exiftool and qpdf (through winget or Chocolatey) on this PC?
24. **[M5] Hardware.** What GPU and laptop model do you have? Profiling the 3D needs a real GPU.

### E. Preferences
25. **[P2] Theme.** Dark only, or dark plus a light "paper" variant? The "published standard" concept (Section 4.1) suits a light variant well. A light theme adds about 1.5 days.
26. **[P2] References.** Any sites you like or dislike? Links are enough.
27. **Public repository.** Are you comfortable keeping the site's source public? I recommend it, because it is evidence of how you work.
28. **Analytics.** Is it acceptable to have no tracking scripts, only Cloudflare's server-side page counts?

### Assumptions until you answer
| ID | Assumption | Effect if wrong |
|---|---|---|
| A1 | All three roles get equal weight on the homepage, and role pages handle targeting. | Section order and hero copy change. |
| A2 | You have at least three projects or labs you can publish. | With fewer, the work section shows labs in progress with dated plans. |
| A3 | You will buy a domain and use Cloudflare's free tiers. | Hosting changes (Section 6.6). |
| A4 | The site is English only. | Localisation is added. |
| A5 | Dark theme only, plus print styles. | Light variant adds about 1.5 days. |
| A6 | Location is shown at city or country level at most. | Nothing more precise is ever shown. |

---

## Summary of recommendations

| Area | Recommendation | Reason |
|---|---|---|
| Positioning | Lead with evidence in the hero. Use one idea to connect the roles in About: in a zero-trust design, each access request is a decision that draws on **policy (GRC), identity (IAM) and activity (SOC)**. | Evidence earns the shortlist. The idea shows the three roles are one interest, not three. |
| 3D concept | **"The Access Decision"**: a simplified, labelled 3D rendering of the zero-trust components in NIST SP 800-207, Fig. 2. The grouping into three channels is mine and the caption says so. | Grounded in a standard security leads know, and defensive in tone. Not a "network constellation". |
| Release plan | **v1** (live in about 11 working days) ships everything except the 3D, using a designed 2D figure. **v1.1** adds the 3D and extra hardening about a week later. | You get a live URL quickly, and the 3D never blocks job applications. |
| Stack | **Astro 7** (static) + **TypeScript** + vanilla **three.js** + plain **CSS** tokens. Hosted on **Cloudflare Workers static assets**, with one small Worker for the contact form. | Ships no JavaScript by default and nothing inline, so a strict CSP is possible. One runtime dependency. |
| Not using | React Three Fiber/drei, GSAP, Tailwind, Next.js | Measured cost and CSP conflicts (Section 6.2). |
| Mobile and low-end | A static SVG figure built from the same data. No WebGL. | Keeps mobile Lighthouse at 90+ and saves battery. |
| Security | A strict CSP with no `unsafe-*`, a per-route exception for Turnstile on `/contact/`, Trusted Types from day one, an A+ header set, supply-chain controls, and a short `/security` page that you write. | The site is itself a GRC work sample, and you can explain every part of it. |
| Content | Evidence over adjectives. Every skill links to proof. Honest proficiency labels, no skill bars. | Hiring managers trust evidence and distrust self-ratings. |
| Role targeting | Static role pages `/grc/`, `/iam/`, `/soc/`, plus a role-by-project coverage table on the homepage. | A targeted link for every application, and a side-by-side view at a glance. |

---

## 1. Requirements

### 1.1 Functional requirements
| ID | Requirement |
|---|---|
| F1 | The homepage shows the hero (name, role focus, value statement, proof, CTAs), Selected work with a coverage table, About, Skills, Certifications and learning path, Experience and education, Writing (only if it has content), and Contact. |
| F2 | Each project has a case study page: context, problem, approach, tools, outcome, artifacts, frameworks mapped, and what you would do next. |
| F3 | Role pages `/grc/`, `/iam/` and `/soc/` reuse the same content with role-first ordering, a role hero line, and a role resume link. |
| F4 | `/resume/` provides an HTML resume plus PDF downloads (general and per role) with metadata scrubbed. |
| F5 | A skills matrix grouped GRC, IAM, SOC, Tools and Frameworks, with proficiency labels and evidence links. |
| F6 | Certifications with status (earned, in progress, planned), dates and verification links. |
| F7 | `/contact/` provides a form with validation, spam protection and rate limiting that forwards to your inbox. Email and LinkedIn are also shown directly. |
| F8 | `/security/` is a half-page summary of how the site is built and secured, mapped to NIST CSF 2.0 functions, in your own words. |
| F9 | `/.well-known/security.txt` follows RFC 9116, with Contact and Expires. |
| F10 | A custom 404 page that returns HTTP 404. |
| F11 | Fig. 1 appears in the hero and About sections: a 2D SVG in v1, plus 3D on capable desktops in v1.1. A visible motion on/off control is included. |
| F12 | Mobile navigation works with and without JavaScript. |
| F13 | Every page has a unique title, meta description, canonical URL, Open Graph and Twitter tags, JSON-LD (`ProfilePage` and `Person`), a sitemap entry and robots.txt coverage. |
| F14 | Content lives in Markdown/JSON with schema validation. The build fails on missing fields or broken evidence references. Placeholders only warn on preview builds and fail production builds. |

### 1.2 Non-functional requirements
| Area | Requirement |
|---|---|
| Performance | Mobile Lighthouse Performance ≥ 90 (target 95+). Desktop ≥ 95. Mobile lab LCP < 2.0 s, CLS < 0.05, TBT < 150 ms. |
| Payload budgets (homepage) | HTML ≤ 35 KB gzip, CSS ≤ 20 KB gzip, fonts ≤ 110 KB (three files), non-3D JS ≤ 15 KB gzip. 3D chunk ≤ 150 KB gzip, loaded only on capable desktops after page load. No hero image. |
| Accessibility | WCAG 2.2 AA (published as ISO/IEC 40500:2025). Lighthouse Accessibility target 100, floor 95. Zero axe violations. Full keyboard use. Tested with NVDA and Chrome. |
| Security | No `unsafe-inline` or `unsafe-eval`. Mozilla HTTP Observatory A+. Zero known high or critical dependency issues at release. |
| Privacy | No cookies or tracking. No phone number or street address anywhere, including PDF metadata, image EXIF and git history. |
| Best Practices / SEO | Lighthouse Best Practices 100 and SEO 100 on the homepage and case studies. `/contact/` loads Turnstile, so its exceptions are documented and tested separately. |
| Compatibility | Last two versions of Chrome, Edge, Firefox and Safari, plus iOS Safari 17+ and Android Chrome. Usable without JavaScript and when WebGL fails. |
| Maintainability | TypeScript strict. Content separate from code. A README covering setup, structure and deployment. One runtime dependency (`three`). Decisions recorded as ADRs. |

### 1.3 Success metrics
| Metric | Target | How measured |
|---|---|---|
| 10-second test | 4 of 5 testers can state your name, target roles and one proof point. At least 2 testers work in security (for example from a local ISC2, ISACA or OWASP chapter). | Run before the v1 launch |
| Lighthouse | Performance ≥ 90 mobile and ≥ 95 desktop. Accessibility ≥ 95 (aim 100). Best Practices 100. SEO 100. | Lighthouse CI on every PR (homepage and one case study) |
| Security posture | Observatory A+. No CSP `unsafe-*`. 0 high or critical advisories. | CI header tests, Observatory scan after deploy, OSV-Scanner |
| Accessibility | 0 axe violations; manual keyboard and NVDA checklist passes. | Playwright + axe; manual checklist |
| **Outcome (the metric that matters)** | Interview callbacks per applications sent, split by which role page you linked | A simple tracker you keep (I will provide a template) |

Per-file resume download counts are not available on Cloudflare's free analytics without extra code. That can be added in v1.1 if you want it.

### 1.4 Your 20-item checklist as release criteria
| # | Item | How it is met | Automated check |
|---|---|---|---|
| 1 | No horizontal scroll | Fluid grid; long strings such as hashes and URLs wrap; tables scroll inside keyboard-focusable containers | Playwright at 320, 375, 768, 1024 and 1440 px: `scrollWidth <= clientWidth` on every page |
| 2 | No broken links | Links generated from data | Link checker: internal links on every PR, external links weekly |
| 3 | Mobile menu | `popover`-based menu that works without JS. JS adds Escape-to-close and returns focus to the button. | Playwright keyboard test |
| 4 | Favicon | SVG favicon, 180 px apple-touch-icon, web manifest | HTTP 200 test |
| 5 | Page titles | "Page \| Name" pattern, unique per page | Test: titles unique across the sitemap |
| 6 | Meta descriptions | Required by the content schema (70–160 characters) | Build fails if missing |
| 7 | Footer links | Generated from the same data as the nav | Link checker |
| 8 | Custom 404 | `404.html` served for unmatched paths with status 404 | Status and content test |
| 9 | Copyright year | Year from the build date; "Last updated" from the last content commit | Scheduled rebuild on 1 January |
| 10 | Compressed images | AVIF/WebP, responsive sizes, metadata stripped | CI fails if any image in `dist/` exceeds 200 KB |
| 11 | No broken buttons | Every `<button>` has a `type` and a behaviour; no `href="#"` | e2e clicks every CTA; lint rule |
| 12 | Success messages | Form success announced in an `aria-live` region, with next steps | e2e |
| 13 | Error messages | Field errors linked to their inputs, an error summary, and a network-error message with an email fallback | e2e |
| 14 | No placeholder text | Build scan for `[Your`, `lorem`, `TODO`, `TBD`, `example.com` | Fails production builds; warns on previews |
| 15 | No unused nav | Nav generated from sections that have content | Unit test |
| 16 | No mobile overflow | Same as #1, plus tests with long strings | Playwright |
| 17 | Clickable logo | Wordmark links to `/` and has an accessible name | e2e |
| 18 | Clickable phone | **Left out on purpose.** Your brief forbids publishing a phone number. | Test asserts there are no `tel:` links |
| 19 | Clickable email | `mailto:` link to your alias, plus a copy button | e2e |
| 20 | Mobile optimised | Mobile-first CSS, 2D figure on phones, primary controls at least 44 px | Lighthouse mobile ≥ 90 |

---

## 2. Information architecture

### 2.1 Sitemap
```
/                         Home (all roles)
/grc/  /iam/  /soc/       Role pages: same content, role-first order, role resume
/projects/                All projects and labs, grouped by role
/projects/[slug]/         Case study
/writing/ + /writing/[slug]/   Only if 2+ pieces at launch
/resume/                  HTML resume + PDF downloads
/contact/                 Direct channels + form (only page that loads Turnstile)
/security/                How this site is built and secured (half a page)
/.well-known/security.txt
404                       Custom not-found page
/robots.txt  /sitemap-index.xml
```
Role pages work without JavaScript, can be shared and indexed, and let each application link to a focused page.

### 2.2 Homepage section order
| # | Section | Purpose |
|---|---|---|
| 0 | Header | Wordmark (links home), section links, Resume button. Compact and sticky, with scroll padding so focused content is never hidden. |
| 1 | Hero + Fig. 1 | Name, role line, evidence-based value statement, three proof facts, CTAs, and the document-control block (education, availability, location, roles). The figure sits to the right on desktop and below the text on mobile. |
| 2 | Selected work | 3–4 featured projects as an editorial list, plus a **coverage table** (projects × GRC, IAM, SOC). This is the 30-second evidence. |
| 3 | About: "Three inputs" | The zero-trust idea in about 120 words. On desktop with 3D (v1.1), the figure pins beside the text for at most 1.5 screen heights. |
| 4 | Skills | Evidence-linked matrix |
| 5 | Certifications and learning path | — |
| 6 | Experience and education | Compact timeline |
| 7 | Writing (only with content) | 2–3 recent pieces |
| 8 | Contact | Email, LinkedIn, a "Send a message" link to `/contact/`, availability |
| 9 | Footer | Resume, `/security/`, source code, security.txt, last updated, © year, AI-assistance line (if Q3 is yes) |

Selected work now comes **before** About. The first review found that a long scroll-driven figure between the hero and the evidence would slow down exactly the readers who matter most.

### 2.3 What a recruiter learns, and when
| Time | What they see | Elements |
|---|---|---|
| **10 s** | Who you are, the roles, entry level, availability date, a value statement backed by three proof facts, the resume button | Hero text and document-control block. All HTML, no dependence on 3D. |
| **30 s** | Your three strongest projects with measurable outcomes, and which roles they cover | Selected work + coverage table |
| **2 min** | How you think (About), the skills evidence, certifications with verification links, experience, one case study, how carefully the site itself is built | About, Skills, Certifications, a case study, `/security/` |

---

## 3. Content strategy

### 3.1 Principles
1. **Evidence over adjectives.** Every claim points to an artifact: a project, certificate, write-up or repository.
2. **Honest proficiency labels instead of bars.**
   - **Applied:** used in an internship or real project.
   - **Practised:** built in a lab.
   - **Studied:** coursework or certification only.
3. **Numbers that are true for lab work.** Use counts and scope, not invented business impact.
   - Good: "14 Sigma rules for 9 ATT&CK techniques. Tested with Atomic Red Team: 11 fired; 3 did not because of logging gaps, which I documented. Tuned 2 rules that fired on routine admin activity."
   - Bad: "Reduced organisational risk by 40%".
4. **Plain, short sentences.** A lint script in the build blocks filler words (passionate, results-driven, cutting-edge, leverage, synergy, robust, seamless). It also blocks em dashes in site copy, because they now read as machine-written.
5. **Current names and versions.**
   - Current: NIST CSF 2.0, ISO/IEC 27001:2022, CIS Controls v8.1, NIST SP 800-61 Rev. 3, MITRE ATT&CK v19.
   - In ATT&CK v19, "Defense Evasion" was split into **Stealth** and **Defense Impairment**. Old labels look dated to a SOC lead.
6. **Redact before publishing.** Remove tenant IDs, internal IPs, usernames, keys, real emails and hostnames from screenshots and logs.

### 3.2 Showing three roles without looking unfocused
- **Evidence first, idea second.** The hero leads with what you have built. About then explains why the three roles belong together, using the zero-trust idea.
- **Bridge projects first.** Feature projects that touch two or three roles. For example: an Entra ID Conditional Access lab, with sign-in logs sent to Sentinel, two detections for risky sign-ins, and an access-review procedure mapped to ISO/IEC 27001 control 5.18.
- **A coverage table** under Selected work makes the spread visible at a glance:

  | Project | GRC | IAM | SOC |
  |---|---|---|---|
  | [Project 1] | Primary | Supporting | — |
  | [Project 2] | — | Primary | Supporting |

  It uses text plus a role-coloured marker, never colour alone.
- **One primary role.** Your answer to Q11 sets the homepage order. The role pages handle targeted applications.

### 3.3 Section-by-section guidance
| Section | What to write | Length | Example (placeholders in brackets) |
|---|---|---|---|
| Hero role line | Level and roles | ≤ 8 words | "Entry-level security analyst: GRC, IAM, SOC." |
| Hero value statement | What you have built, concretely | ≤ 22 words | "Final-year [degree] student. I build and document security labs: control mappings, access reviews and detections." |
| Proof facts | Three verifiable facts | 3 × ≤ 8 words | "[Security+, 2026]" · "[Home SOC: Wazuh, 4 endpoints]" · "[Internship: Company, 3 months]" |
| Document-control block | Hard facts only | 4 fields | EDUCATION [Degree], [Mon YYYY] · AVAILABLE [Mon YYYY] · LOCATION [City, Country] · ROLES GRC, IAM, SOC |
| Selected work row | Role tags, title, outcome line, tools, links | 1-line outcome | "SOC · Detection lab: Wazuh and Sigma. 14 rules for 9 ATT&CK techniques; logging gaps documented." |
| About | The idea, then you | 100–140 words | "Zero trust treats each access request as a decision. The decision draws on three kinds of input: policy, or what is allowed; identity, or who is asking; and activity, or what is happening. I am a final-year [degree] student at [university], graduating [Mon YYYY]. I have built labs in each: [one clause each]." |
| Case study | Context, problem, approach, tools, outcome, artifacts, frameworks, next steps | 400–900 words | Template in 3.7 |
| Skills row | Skill, label, evidence | 1 row | "KQL hunting queries · Practised · [P2] [P4]" |
| Certification row | Name, status, date, link | 1 line | "CompTIA Security+ (SY0-701): earned [Mon YYYY]. Verify." |
| Experience | Role, organisation, dates, 2–3 outcome bullets | ≤ 3 bullets | "Reviewed access for [N] accounts in [system]. Found [N] orphaned accounts. Drafted the removal procedure." |
| Contact | How to reach you, response time, availability | ≤ 40 words | "Email is fastest. I reply within two working days. Available from [Mon YYYY]." |
| 404 | Calm and useful | ≤ 20 words | "No page at this address. Try the homepage or the project index." |

### 3.4 Skills matrix
A real HTML table with row and column headers, in five bands. List only rows you can back with evidence.

| Band | Example rows |
|---|---|
| GRC (practices) | Control mapping (ISO/IEC 27001:2022 Annex A to NIST CSF 2.0), risk register and treatment, policy writing, gap assessment, vendor risk questionnaires, audit evidence collection |
| IAM (practices) | SSO setup (SAML 2.0, OIDC), user provisioning (SCIM), Conditional Access design, MFA and passkeys, joiner-mover-leaver process, access reviews, role design |
| SOC (practices) | Alert triage, SIEM queries (SPL, KQL), detection writing (Sigma), ATT&CK mapping, phishing analysis, incident write-ups |
| Tools (products) | Splunk, Wazuh, Microsoft Sentinel, Elastic, Okta, Entra ID, Wireshark, Sysmon, Python, PowerShell, Git |
| Frameworks | Only those a project actually uses, for example NIST CSF 2.0, ISO/IEC 27001:2022, CIS Controls v8.1, MITRE ATT&CK v19 |

The columns are **Skill**, **Proficiency** (Applied, Practised or Studied) and **Evidence** (links such as [P2] for project 2 or [C1] for certificate 1). The build checks that every evidence link resolves.

### 3.5 Certifications: facts to get right (as of October 2026)
- **CompTIA Security+:** V7 (SY0-701) is current. V8 (SY0-801) is expected around 17 November 2026. SY0-701 stays valid; list it as it is.
- **CompTIA CySA+:** V4 (CS0-004) launched 23 June 2026. V3 retires in English on 22 December 2026.
- **ISC2 CC:** a new exam outline took effect 1 September 2026.
- **Microsoft SC-900, SC-300 and SC-200** are active.

If you have gaps, here are possible paths to discuss:

| Role | Path |
|---|---|
| SOC | Security+ → SC-200 or BTL1 → CySA+ (later) |
| IAM | SC-900 → SC-300 → Okta Certified Professional |
| GRC | ISC2 CC or Security+ → ISO/IEC 27001 Lead Implementer or Lead Auditor |

Show "in progress" items with an exam month. Never list a certificate before you pass it.

### 3.6 Writing the `/security/` page yourself
I will give you a scaffold and the facts. You write the half page in your own words. It should cover:
- what could go wrong with this site;
- which controls address each risk, grouped by the six NIST CSF 2.0 functions;
- the latest scan grade;
- how to report an issue.

Because you wrote it, you can defend it in an interview.

### 3.7 Project template (one per project)
```
Title:
Roles: GRC | IAM | SOC (one or more; mark the primary one)
Context (lab, coursework or internship; 1–2 sentences):
Problem:
Approach (3–6 steps you actually took):
Tools:
Outcome (counts, coverage, time, findings; say what did not work too):
Artifacts (repo, report, rules, diagrams; public or private):
Frameworks mapped (ATT&CK IDs, CSF 2.0 subcategories, ISO 27001 controls):
What I would do next:
Dates:
```

---

## 4. Design system (proposal; final tokens are a Phase 2 deliverable)

### 4.1 Concept and mood
**"Published standard."** The site reads like a well-made technical standard. It has:
- numbered sections set in the serif;
- figures with captions and sources;
- evidence citations;
- a document-control block, of the kind that opens standards documents.

It deliberately avoids:
- the hacker look: matrix green, neon, glitch effects, terminal typing;
- the template look: gradients, glass cards, centred gradient names, a three-column card grid, and the mono `01 / About` numbering common in developer templates.

Mood words: measured, legible, documented, evidential, quiet.

### 4.2 Colour palette (dark default; contrast computed against WCAG 2.x)
| Token | Hex | Use | Contrast on `bg` |
|---|---|---|---|
| `--bg` | `#0D1114` | Page background | — |
| `--surface` | `#141A1E` | Panels, tables | — |
| `--surface-raised` | `#1C2429` | Inputs, hover rows | — |
| `--hairline` | `#2A333A` | Decorative rules only | decorative |
| `--boundary` | `#6B7882` | Input and outline-button borders | 4.18 (3.47 on raised; 3:1 needed) |
| `--text` | `#E8E4DC` | Body, headings, focus ring, primary button fill | **14.96** |
| `--text-2` | `#B4BABE` | Secondary text | 9.67 |
| `--text-3` | `#919AA1` | Captions, labels | 6.63 (5.50 on raised) |
| `--grc` | `#B5D6AE` | Policy channel | 11.91 |
| `--iam` | `#7BA4DB` | Identity channel | 7.38 |
| `--soc` | `#E6AE5E` | Activity channel | 9.55 |
| `--deny` | `#F2A193` | Errors, deny state | 9.30 |
| `--on-light` | `#0D1114` | Text on light fills | 14.96 on `--text`; ≥ 7.38 on role colours |

Rules:
- **Role colours identify roles only. They never signal status.** Success and "allowed" use `--text` plus a check icon. Errors and "denied" use `--deny` plus an alert icon. Every coloured element also carries a text label.
- The three role colours stay distinguishable under the three common types of colour blindness (checked with standard simulations).
- No pure black or white. Body text sits near 15:1, readable without glare.

### 4.3 Typography (all SIL Open Font License, self-hosted)
| Role | Family | Why | File size (Latin, variable, upright) |
|---|---|---|---|
| Headings | **Newsreader** | An editorial serif with optical sizes. It gives the "published standard" voice. | ≈ 58 KB |
| Body and UI | **Atkinson Hyperlegible Next** (Braille Institute, 2025) | Built for legibility, and it separates easily confused letters such as I/l/1 and O/0. Rarely seen on portfolios. | ≈ 34 KB |
| Labels and data | **Atkinson Hyperlegible Mono** | The same letter separation, which helps with hashes, IP addresses and control IDs | ≈ 18 KB |

- All three upright files are preloaded, because all three appear above the fold. That is about 110 KB in total. Italics load only when used.
- `font-display: swap` with metric-matched fallback fonts keeps layout shift near zero.
- Body text is 17–18 px with line height 1.6, at most 68 characters per line. Labels are 13–14 px.
- The type scale is fluid: ratio 1.2 on mobile rising to 1.333 on desktop, from 13 px labels up to 44–72 px for your name.
- Alternative if you dislike the serif: Source Serif 4 (same licence).

### 4.4 Spacing, grid, breakpoints, shape
- **Spacing scale (4 px base):** 4, 8, 12, 16, 24, 32, 48, 64, 96, 128. Sections are separated by 96 px on desktop and 64 px on mobile.
- **Grid:** 12 columns, 1200 px maximum content width, 24 px gutters (16 px below 768 px), outer margin `clamp(16px, 5vw, 64px)`.
- **Breakpoints:** 480, 768, 1024 and 1280 px.
- **Hero on desktop:** text in columns 1–6, figure in columns 7–12. The figure never sits behind text.
- **Shape:** 2 px radius on controls, square panels, 1 px hairlines. No shadows, blur or glass.

### 4.5 Interaction states
- **Focus:** a 2 px solid `--text` ring with a 2 px offset. The offset shows a strip of background, so the ring stays visible even on the light primary button.
- **Every control has defined states:** default, hover, active, focus-visible, disabled and loading. The full table is a Phase 2 deliverable.
- **Links in body text are underlined.** Colour alone does not mark a link.

### 4.6 Motion principles
1. **Motion follows scroll or intent.** Nothing loops on its own, and the figure renders only while something changes.
2. **Short and eased.**
   - 120 ms for hover, 200 ms for menus and focus, 320 ms for section entrances.
   - About 700 ms for the 3D camera to settle, with no overshoot.
   - Easing `cubic-bezier(0.2, 0, 0, 1)`. No bounce.
3. **Reversible.** Scrolling back reverses the figure exactly.
4. **Optional.** `prefers-reduced-motion` shows the static figure. A visible "Motion: On/Off" control in the figure caption remembers the choice. This meets WCAG 2.2.2 and supports 2.3.3.
5. **No scroll hijacking.** Native scrolling only. No custom cursor, no preloader.

### 4.7 Components
SkipLink · SiteHeader · MobileNav · Hero · DocControlBlock · ProofFacts · SectionHeader · Figure (canvas host, SVG, caption, legend, motion toggle) · FigureLegend · ProjectList · CoverageTable · CaseStudyLayout · RoleTag · EvidenceRef · SkillsMatrix · CertList · Timeline · WritingList · ContactChannels · ContactForm · Button · ExternalLink · CopyButton · Callout · CodeBlock (classes only, no inline styles) · Footer · NotFound.

Icons are about 12 vendored **Lucide** SVGs (ISC licence), used only where they carry meaning: external link, download, copy, mail, arrow, check, alert.

---

## 5. 3D concept: "The Access Decision"

### 5.1 The idea
NIST SP 800-207 (Zero Trust Architecture, 2020), Figure 2, shows the core logical components of a zero-trust system:
- A **Subject** uses a **System** to request an **Enterprise Resource**.
- The request passes a **Policy Enforcement Point (PEP)**.
- The PEP consults the **Policy Decision Point**: the **Policy Engine** together with the **Policy Administrator**.
- The Policy Engine draws on eight inputs.

For the figure, I group those eight inputs into three channels. **The grouping is mine, not NIST's**, and the caption says so: *"Fig. 1. Core zero trust components, simplified from NIST SP 800-207, Fig. 2. The grouping into three channels is the author's."*

| Channel | Inputs from Fig. 2 | Your role |
|---|---|---|
| **Policy**: what is allowed | Industry Compliance, Data Access Policy | GRC |
| **Identity**: who is asking | ID Management, PKI | IAM |
| **Activity**: what is happening | Threat Intelligence, Activity Logs, SIEM System, CDM System (device and asset state) | SOC |

The lines between channels are blurry in real systems. For example, governance writes access policy and identity systems enforce it. That nuance is good material for an interview.

NIST publications are not subject to US copyright. The caption credits the source.

### 5.2 Visual language
- **Labelled boxes**, as in the NIST figure, not unlabelled dots. Two faint planes are marked "control plane" and "data plane". Edges are thin lines.
- **Labels are HTML placed over the canvas.** They are moved with CSS transforms, which the CSP allows. WebGL renders no text.
- **Light, colour and motion:** flat colour, no glow. The request is one small marker. Input signals are short pulses in the channel colours.
- **The SVG version uses the same layout and labels.** On phones it uses a vertical layout so the labels stay readable (designed in Phase 2).

### 5.3 Scroll behaviour (v1.1; the storyboard is Phase 2)
On desktop, the figure pins beside About for **at most 1.5 screen heights**, and each beat pairs with one sentence of About.

| Beat | Trigger | What moves |
|---|---|---|
| 0 | Page load | Nothing. A composed three-quarter view is shown. |
| 1 | About enters the view | The request travels Subject → System → PEP and waits. |
| 2 | "policy, identity, activity" sentence | The three channels pulse into the Policy Engine in turn. |
| 3 | "decision" sentence | The Policy Engine decides, the Administrator signals the PEP, the gate opens, and the request reaches the resource along a narrow path. |
| 4 (optional) | End of About | The SIEM flags an anomaly and the session closes again. This is kept only if it fits within the 1.5-screen limit. |

Every beat is a function of scroll position, so it is reversible. When the section ends, the canvas unpins and stops rendering.

### 5.4 Pointer and focus
- **Parallax:** the camera shifts by at most ±2° with the pointer. Turned off when motion is off.
- **Legend:** hovering over or focusing a legend item (for example "SIEM System") highlights that box. Keyboard users get the same result as mouse users.
- **Role pages:** each role page emphasises its own channel by default.
- **No orbit, drag or zoom.** It is an illustration, not a toy.

### 5.5 Where it appears
| Situation | What is shown |
|---|---|
| **3D tier** (v1.1): screens ≥ 1024 px with capable hardware | The figure in the hero, pinned through About |
| Everything else (phones, low-end devices, reduced motion, Save-Data, WebGL failure) | The SVG figure, with legend highlighting through CSS |
| **No JavaScript** | The SVG figure plus a full text equivalent |

---

## 6. Technical architecture

### 6.1 Stack
| Layer | Choice | Reason |
|---|---|---|
| Framework | **Astro 7.3** (static output). The newest 7.3.x release that is at least 7 days old is used (Section 8.5). | Ships no JavaScript by default. Content collections are validated at build time. Can be configured so nothing is inlined: `build.inlineStylesheets: 'never'`, `vite.build.assetsInlineLimit: 0`, and Prism instead of Shiki for code blocks. |
| Language | **TypeScript** (strict), pinned to the version Astro's checker supports | Typed content and scene code |
| 3D | **three.js r186**, `WebGLRenderer`, vanilla modules (v1.1) | About 133 KB gzip measured for this scene. three.js recommends `WebGLRenderer` for plain WebGL 2 work. |
| Styling | **Plain CSS** with custom-property tokens and Astro scoped styles, compiled to external files | Small, bespoke system. Tokens in one file. No dependency. |
| Fonts | Self-hosted WOFF2 with `@font-face` rules in the external CSS | Astro's `<Font>` component writes an inline `<style>`, which the CSP would block. |
| Contact API | One **Cloudflare Worker** route. Turnstile, the Rate Limiting binding, and Email Routing's `send_email` binding. | Free tier; sending to your own verified address is free. |
| Validation | A small hand-written validator shared by the browser and the Worker. Zod is used only at build time for content. | Keeps the runtime dependency count at one. |
| Package manager | **pnpm 12** | Supply-chain controls (Section 8.5) |
| Tooling | Biome, `astro check`, Vitest, Playwright, axe-core, Lighthouse CI, a link checker | — |
| Hosting | **Cloudflare Workers static assets** | Free, unlimited static requests. Per-route headers. DNS, registrar, Turnstile and email in one account. |

### 6.2 What is not used, and why
| Suggested in brief | Decision | Evidence |
|---|---|---|
| React Three Fiber + drei | Not used | three alone is 132.5 KB gzip; three + React 19 + R3F is 302.6 KB gzip (measured). The scene is small with no UI inside the canvas, so React would add weight without benefit. Vanilla modules can also move into a Web Worker. |
| GSAP / Framer Motion | Not used | GSAP with ScrollTrigger is 44 KB gzip. Scroll-linked camera movement takes about 30 lines of code. Framer Motion needs React. |
| Tailwind | Not used | Fine in general, but tokens in plain CSS are clearer for a small bespoke system. If you prefer Tailwind v4, the tokens map directly. |
| Next.js | Not used | A static export needs `'unsafe-inline'` for its inline scripts. Nonces would force server rendering, according to Next.js's own CSP guide. Both conflict with the strict-CSP goal. |

### 6.3 Folder structure
```
portfolio/
├─ .github/workflows/        ci.yml, deploy.yml, security.yml
├─ .github/dependabot.yml
├─ docs/                     plans, design, adr/, threat-model.md, talking-points.md
├─ public/
│  ├─ _headers               per-route security and cache headers
│  ├─ .well-known/security.txt
│  ├─ resume/                scrubbed PDFs only (sources never committed)
│  └─ favicon.svg, apple-touch-icon.png, site.webmanifest, robots.txt
├─ src/
│  ├─ content.config.ts      collections + schemas
│  ├─ content/               projects/, certifications/, experience/, writing/
│  ├─ data/                  site.ts, skills.ts, topology.ts (shared by SVG and 3D), nav.ts
│  ├─ layouts/               BaseLayout.astro, CaseStudyLayout.astro
│  ├─ pages/                 index, [role], projects/, writing/, resume, contact, security, 404
│  ├─ components/            ui/, sections/, figure/
│  ├─ scene/                 (v1.1) loader.ts, scene.ts, graph.ts, timeline.ts, input.ts, quality.ts, worker.ts
│  ├─ scripts/               nav.ts, legend.ts, contact-form.ts, copy.ts
│  ├─ styles/                tokens.css, base.css, type.css, layout.css, components.css, prism.css
│  ├─ icons/                 vendored Lucide SVGs + licence
│  └─ lib/                   contact-validation.ts (shared with Worker), seo.ts, capability.ts
├─ worker/                   index.ts (/api/contact), tests
├─ scripts/                  check-dist.ts, og-images.ts, font-metrics.ts, scrub-pdf
├─ tests/                    unit/, e2e/, a11y/, headers/
├─ astro.config.ts  tsconfig.json  biome.json  wrangler.jsonc  pnpm-workspace.yaml
├─ playwright.config.ts  vitest.config.ts  lighthouserc.json
└─ README.md  SECURITY.md  LICENSE
```

### 6.4 Asset pipeline
- **3D assets: none.** Geometry is generated in code from `topology.ts`. No GLB files and no texture images.
  - Avoiding model files also avoids decoder WebAssembly, which would need a weaker CSP.
  - If a model is ever added, the pipeline would be gltf-transform with meshopt compression and KTX2 textures of at most 1024 px. That would be a recorded exception.
- **Images:** AVIF and WebP at 480, 768 and 1200 px widths, with explicit dimensions, lazy loading below the fold, and metadata stripped. Screenshots are redacted before commit.
- **Social preview images:** 1200 × 630, generated at build from SVG templates using `sharp`, which Astro already includes.
- **Resume PDFs:** exported from your source file, scrubbed with exiftool and qpdf, then checked in CI for metadata and phone numbers. The source files stay off the repository.

### 6.5 State and data flow
- **The URL is the state** for role views. There is no global store.
- **Scene connection:** a small typed event channel links page scripts (scroll progress, legend focus, motion toggle) to the scene.
- **Visitor preferences:** the motion and 3D choices are stored in the browser's `localStorage`, wrapped in error handling, with safe defaults.
- **The scene never touches the page DOM**, so it can run in a Web Worker if profiling shows the main thread is too busy. The worker is created from a `?worker&url` import so the build picks it up, and it is passed through a Trusted Types policy (details in the technical notes).

### 6.6 Deployment
- **Environments:** local (`astro dev`, `wrangler dev`), a preview URL per pull request, and production on your domain. Preview URLs send `noindex`.
- **On every pull request, CI runs, in order:**
  1. install from the locked dependency file
  2. lint and type checks
  3. unit tests
  4. build
  5. dist checks (no inline code, budgets, image sizes, placeholders on production builds)
  6. Playwright and axe
  7. Lighthouse CI
  8. internal link check
  9. dependency scan (OSV) and CodeQL
- **On merge to `main`:** deploy, then check headers and run a Mozilla Observatory scan.
- **Domain (M0):** Cloudflare Registrar, or any registrar pointing at Cloudflare nameservers, which Workers custom domains require. Enable DNSSEC, CAA records, SPF and DMARC, registrar lock and auto-renew. Email Routing is set up for the alias. Email Sending onboarding is **not** needed and is not enabled.
- **Why not other hosts:**
  - GitHub Pages cannot set response headers, so the CSP and HSTS plan is impossible there.
  - Vercel and Netlify would need extra vendors for spam protection and email.

### 6.7 Prerequisites on your PC (M0)
- **Already installed:** Node 24.12 (LTS) and git 2.53.
- **To add:** pnpm 12 (`npm i -g pnpm`), plus exiftool and qpdf (winget or Chocolatey).
- **Cloudflare tooling:** `wrangler` is installed per project as a development dependency.
- **Git identity:** set to your GitHub noreply address, so your personal email never appears in public history.

---

## 7. Performance and fallback plan

### 7.1 Two tiers
| Tier | Who | What |
|---|---|---|
| **3D** (v1.1) | Viewport ≥ 1024 px, WebGL2 available, no reduced-motion preference, no Save-Data, at least 4 CPU cores, at least 4 GB memory where the browser reports it | The 3D figure |
| **Static** | Everyone else, and everyone in v1 | The SVG figure |

### 7.2 Loading sequence (3D tier)
1. HTML, CSS and fonts load. The largest visible element is the H1 text, not the canvas.
2. The SVG figure is already in the page and reserves the exact space, so nothing shifts.
3. After the page has loaded and the browser is idle, the capability check runs. Only if it passes is the 3D code downloaded.
4. Shaders compile in the background. A few warm-up frames are rendered and timed **before the figure is revealed**, so any downgrade is decided before the visitor sees a switch.
5. The 3D fades in over the SVG in 200 ms.

### 7.3 3D budget
| Budget | Limit |
|---|---|
| 3D JavaScript (including three.js) | ≤ 150 KB gzip |
| Draw calls | ≤ 30 |
| Triangles | ≤ 20,000 |
| Textures | none |
| Pixel ratio | at most 1.5 |
| Main-thread start-up | no single task over 50 ms; otherwise rendering moves to a Web Worker |
| Steady state | Renders only when something changes. Pauses off-screen and in background tabs. |
| Downgrade | Warm-up frames slower than 20 ms → lower resolution. Slower than 24 ms → stay on the SVG for the session. |

### 7.4 Failure handling
- WebGL is tested before three.js loads. If it is unavailable, the SVG stays and nothing is written to the console. three.js's own logging is routed through its `setConsoleFunction` hook.
- If the graphics context is lost, or the 3D code fails to download, the page returns to the SVG.

### 7.5 Lighthouse: realistic trade-offs
- **Lighthouse and PageSpeed Insights will measure the static tier, not the 3D.** They run headless Chrome without a GPU. Since Chrome 139, desktop Chrome no longer falls back to software WebGL, so creating the graphics context simply fails. The published scores therefore describe the 2D page.
- **I will profile the 3D tier separately** on your real GPU with the DevTools Performance panel against the budgets in 7.3, and report the numbers at M5.
- **Mobile 90+ is realistic** because phones never load 3D. **Desktop 95+ is realistic** because 3D loads only after the page is idle.
- **Best Practices 100 needs a clean console.** CSP violations, including report-only ones, fail Lighthouse's "Issues" audit. So policies are tested by end-to-end tests that fail on any violation, not by report-only trials on deployed previews.
- **Test runs use a pinned tier.** Playwright quietly enables software WebGL, so tests force one tier through a switch that exists only in test builds. Otherwise results would vary from run to run.

---

## 8. Security plan

### 8.1 Threat model (summary; you write the full version, Section 3.6)
| What we protect | Threat | Main controls |
|---|---|---|
| Site content and your reputation | Defacement through script injection or a compromised dependency | Strict CSP, Trusted Types, one runtime dependency, 7-day release-age delay, reviewed updates |
| Contact channel | Spam, abuse, cross-site posting, email header injection | Turnstile, honeypot, timing check, Origin check, rate limit, validation, plain-text email |
| Your personal data | Harvesting, metadata leaks | Email alias, no phone or address, scrubbed PDFs and images, noreply git identity |
| Domain and accounts | Hijack, expiry, account takeover | Passkeys or hardware keys on GitHub, Cloudflare, the registrar and email; registrar lock; auto-renew; DNSSEC |
| Build pipeline | Malicious CI action, secret leak | Actions pinned to exact commits, least-privilege tokens, secret scanning with push protection, branch protection |

### 8.2 Content Security Policy
Nothing is inlined, so the policy is a **fixed header with no hashes or nonces**. These Astro features are not used because they write inline code: islands, view-transition directives, `define:vars`, `is:inline`, the `<Font>` and `<Code>` components, and Shiki highlighting. A CI check enforces this.

**All pages** (`/*` in `_headers`):
```
Content-Security-Policy:
  default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self';
  font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self';
  form-action 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none';
  upgrade-insecure-requests;
  require-trusted-types-for 'script'; trusted-types 'none'
```

**Contact page only.** Cloudflare combines matching rules, and two CSP headers would both apply. The contact rule therefore **removes** the global policy first and then sets its own:
```
/contact/
  ! Content-Security-Policy
  Content-Security-Policy:
    default-src 'none'; script-src 'self' https://challenges.cloudflare.com;
    frame-src https://challenges.cloudflare.com; style-src 'self'; img-src 'self';
    font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none';
    base-uri 'none'; object-src 'none'; upgrade-insecure-requests
```
- Turnstile's script is not compatible with Trusted Types, so this one page leaves Trusted Types out. The exception is scoped to one route, documented, and tested.
- A test asserts that `/contact/` returns exactly one CSP header.

**Trusted Types** has been supported in every major browser since February 2026.
- It is on from the first commit with `trusted-types 'none'`, because none of our code uses dangerous DOM APIs.
- In v1.1, one named policy is added for the 3D worker URL, with a feature check for older Safari and Firefox.
- End-to-end tests in Chromium, Firefox and WebKit fail on any violation.

**Violation reporting** (`report-to`) is optional in v1.1. It adds a public endpoint that must itself be defended, so it is only worth adding if you want it as a talking point.

### 8.3 Other headers
```
/*
  Strict-Transport-Security: max-age=63072000; includeSubDomains
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), midi=(), magnetometer=(), gyroscope=(), accelerometer=(), display-capture=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  X-Frame-Options: DENY
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```
- **HSTS without the `preload` flag.** hstspreload.org now advises against preloading: browsers already upgrade to HTTPS, and removal from the list is slow. If you choose a `.dev` domain, the whole TLD is preloaded anyway.
- **Permissions-Policy** uses only long-standing feature names.
  - Unknown names cause console warnings, not errors, so they do not affect Lighthouse. CI still fails on Permissions-Policy warnings to keep the console clean.
  - `browsing-topics` is left out because Google announced its retirement in October 2025.
- **Cache-Control is set only for `/_astro/*`.** Cloudflare's default (revalidate every time) already suits HTML, and two merged values would conflict.
- **COEP is not set.** It is only needed for features this site does not use, and it would break Turnstile.
- **Worker responses** (`/api/*`) set their own headers in code, because `_headers` does not apply to them.

### 8.4 Contact form
| Control | Detail |
|---|---|
| Transport | `POST /api/contact` only, JSON, body ≤ 8 KB, `Origin` must match the site |
| Bot protection | Turnstile, loaded only on `/contact/` and verified on the server. Tokens are single-use and expire after 5 minutes. Also a hidden honeypot field and a minimum fill time. |
| Rate limiting | Workers Rate Limiting binding: about 3 requests per minute per visitor. It is approximate and per data centre by design. Backed by one free WAF rule on `/api/*`. |
| Validation | The same validator in the browser and the Worker. Name ≤ 100 characters, valid email ≤ 254, message 20–2000. Line breaks are rejected in name and email, which blocks header injection. |
| Delivery | `send_email` binding fixed to one destination: your verified inbox. The sender is an address on your domain. Plain text. `Reply-To` is set only after validation. The visitor is never emailed. |
| Data minimisation | Messages are forwarded, not stored. Logs never contain message text. A one-line privacy note sits next to the form. |
| Responses | Generic success or failure that never reveals which check failed. A clear error state with your email as the fallback. |
| Without JavaScript | Your email address is shown instead of the form, because Turnstile needs JavaScript. |

### 8.5 Dependencies and supply chain
- **Runtime dependencies:** one in the browser (`three`, v1.1) and none in the Worker.
- **pnpm settings:**
  - `minimumReleaseAge` of 7 days. New package versions wait a week, the window in which most malicious releases are caught. Note: this means the newest Astro is often a few days behind.
  - `allowBuilds`: only named packages may run install scripts.
  - `strictDepBuilds` (on by default).
  - `trustPolicy: no-downgrade`.
- **Urgent security fixes:** a short runbook adds a version-pinned exception. The reason is recorded in an ADR.
- **Dependabot:** 7-day cooldown, grouped updates.
- **Scanning:** OSV-Scanner on every PR, CodeQL, GitHub secret scanning with push protection, OpenSSF Scorecard.
- **CI workflows:** actions pinned to full commit hashes, read-only default permissions, and the deploy secret available only to the deploy job.
- **v1.1:** a CycloneDX SBOM attached to each release.

### 8.6 Personal data and privacy
- **Location:** city or country only. Never a phone number or street address, including in the resume, file metadata, structured data, images and git history.
- **Email:** an alias on your domain, forwarded to your inbox. SPF and DMARC are set for the domain.
- **Privacy note in the footer:** "No cookies or tracking. Your motion setting is saved in your browser and never sent to me. The contact page uses Cloudflare Turnstile to block spam."
- **No embedded third-party widgets** (Credly, YouTube, GitHub cards). Link out instead.

### 8.7 The `/security/` page
Half a page, written by you (Section 3.6), with the controls grouped under the six NIST CSF 2.0 functions. One framework done well reads as competent. Mapping a small static site to three frameworks would read as padding.

---

## 9. Task breakdown and testing plan

### 9.1 Release plan
| Release | Contents | Build time (mine) |
|---|---|---|
| **v1** | M0, M1, M2, M3, M4, M6, L1. The complete site with the SVG figure, the secure contact form, the full header set and Trusted Types. | ≈ 11 working days |
| **v1.1** | M5 (3D) and M7 (the remaining hardening: optional CSP reporting, ZAP scans, SBOM, full cross-browser pass, worker rendering if needed) | ≈ 5–6 working days |

Build days are my implementation time. Calendar time depends on how quickly you review each milestone.

### 9.2 Milestones
Each milestone ends with:
- `pnpm check`, `pnpm test` and `pnpm build` passing;
- a preview deployed and its checklist complete;
- a **15-minute walkthrough for you**: what was built, why, and how to explain it in an interview. Decisions go into `docs/adr/` and interview points into `docs/talking-points.md`.

| Milestone | Scope | Exit criteria | Days |
|---|---|---|---|
| **M0 Foundations** | Install pnpm; git with your noreply identity; Astro + TypeScript strict; pnpm security settings; Biome; test skeletons; CI; `_headers` with the **full strict CSP and Trusted Types from day one**; dist checks; Cloudflare project; domain, DNS and Email Routing; preview deploy | Empty page live on preview with A+ headers; CI green | 1 |
| **M1 Design system** | Tokens, fonts and fallbacks, base CSS, grid, header, footer, mobile menu, buttons and states, focus styles, 404, an internal style guide page | axe clean, keyboard navigation works, 404 returns 404 | 1.5 |
| **M2 Content model** | Collections and schemas, skills with evidence checks, topology data, placeholder scan (warn on preview, fail on production) | Tests prove bad data fails the build | 1 |
| **M3 Homepage** | Hero, document-control block, Selected work and coverage table, About, **SVG figure**, skills matrix, certifications, experience, contact section | Fully usable without JavaScript; Lighthouse mobile ≥ 95 | 3 |
| **M4 Pages and SEO** | Case studies, role pages, resume page, `/security/` scaffold, security.txt, writing (if any), metadata, sitemap, social images | Link, title and description tests pass; SEO 100 | 2 |
| **M6 Contact** | Worker route, validation, Turnstile, rate limit, honeypot and timing, email delivery including a **real send test**, success and error states | Unit and e2e tests pass; abuse cases rejected | 1.5 |
| **L1 v1 launch** | Full accessibility audit (NVDA, zoom, keyboard), header and Observatory checks, PDF scrub check, copy review, the 10-second test, production deploy | Every Section 1 target met; live URL | 1 |
| **M5 3D (v1.1)** | Capability check, scene from topology data, scroll timeline, labels, legend linking, motion toggle, quality manager, warm-up, fade-in; profiling; worker decision | Meets the 7.3 budgets on your GPU; static tier unchanged; console clean | 3–4 |
| **M7 Hardening (v1.1)** | Optional CSP reporting, weekly ZAP baseline scan, SBOM, Scorecard, cross-browser pass, final `/security/` text from you | No medium-or-higher ZAP findings without a written reason | 2 |

Total: about 16–17 days of build time.

### 9.3 Testing plan
| Type | Tool | Scope | When | Pass criteria |
|---|---|---|---|---|
| Static checks | Biome, `astro check` | All source | Every PR | Zero errors |
| Unit | Vitest | Validator, evidence links, nav, capability check, scroll mapping | Every PR | All pass |
| Build integrity | `check-dist.ts` | Built site | Every PR | No inline code; budgets met; placeholders fail production builds |
| End-to-end | Playwright (Chromium, Firefox, WebKit) | Navigation, mobile menu, CTAs, legend, motion toggle, form states, 404, horizontal scroll at 5 widths, zero first-party console errors, CSP/Trusted Types violations | Every PR | All pass |
| Accessibility (automated) | axe with WCAG 2.2 rules | Every page, both tiers | Every PR | 0 violations |
| Accessibility (manual) | Keyboard only, NVDA + Chrome, 400% zoom, text spacing, reduced motion | Key flows | M3, L1, M5 | Checklist passes |
| Performance | Lighthouse CI; DevTools traces for the 3D tier | Homepage, one case study | Every PR; M5 | Section 1.2 and 7.3 targets |
| Security headers | Header tests against the preview; Mozilla Observatory | All routes | Every deploy | Exact header set; one CSP per route; A+ |
| Dependencies | OSV-Scanner, Dependabot, CodeQL | Lockfile and source | Every PR and weekly | 0 high or critical |
| Dynamic scan | OWASP ZAP baseline | Production | Weekly from v1.1 | No unexplained medium or higher alerts |
| Links | Link checker | Internal and external | PR (internal), weekly (external) | 0 broken |
| Copy | Banned-words lint, spell check, your proofread | All copy | L1 | Clean |

---

## Appendix A: decisions for you to approve
1. **The positioning idea:** evidence-first hero; About connects the roles through zero trust (policy, identity, activity), with the grouping credited as yours (Sections 3.2 and 5.1).
2. **3D concept:** "The Access Decision", as labelled 3D on capable desktops and SVG everywhere else (Section 5).
3. **Release plan:** v1 without 3D, about 11 build days; 3D in v1.1 (Section 9.1).
4. **Stack:** Astro + vanilla three.js + plain CSS. No R3F, GSAP or Tailwind (Section 6.2).
5. **Hosting:** Cloudflare Workers plus a custom domain bought at M0 (Section 6.6).
6. **Contact form:** on its own `/contact/` page with Turnstile, and the only CSP exception (Sections 8.2 and 8.4).
7. **Role pages and per-role resumes:** `/grc/`, `/iam/`, `/soc/` (Section 2.1).
8. **Visual direction:** "Published standard", with the palette in 4.2 (role colours never used for status) and Newsreader with Atkinson Hyperlegible Next and Mono.
9. Your answers to Q2 (who builds what), Q3 (AI disclosure), Q25 (theme) and Q27 (public repository).
