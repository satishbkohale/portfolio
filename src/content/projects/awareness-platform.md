---
ref: P1
title: Cybersecurity awareness platform with phishing simulation
summary: Simulated phishing and awareness emails run as automated workflows, from sequencing to notifications and logging.
description: Case study by Satish Kohale. An automated security awareness platform with simulated phishing, built with Python, n8n and REST APIs.
roles:
  - role: grc
    weight: primary
  - role: soc
    weight: supporting
context: Built end to end, from the platform design to the automation workflows and integrations.
problem: Running phishing simulations and awareness emails by hand is repetitive. Each campaign needs scheduling, sending, follow-up messages and a record of what happened.
approach:
  - Designed a platform that runs simulated phishing and awareness mail workflows.
  - Built the automation in n8n for email sequencing, notifications and data logging.
  - Connected the platform modules through REST APIs, exchanging JSON.
  - Wrote the supporting logic in Python.
tools:
  - Python
  - n8n
  - REST APIs
  - JSON
  - Email automation
outcome: Campaign emails, notifications and logging run as automated workflows instead of manual steps.
frameworks:
  - "ISO/IEC 27001:2022 Annex A 6.3: information security awareness, education and training"
featured: true
order: 1
todo:
  - "Add numbers: campaigns run, emails sent, number of users, time saved per campaign."
  - Add a repository, demo video or screenshots (redact real email addresses).
  - "Say what kind of project this was: academic, freelance or personal, and when."
  - "Add a 'what I would do next' line, for example measuring report rates per campaign."
---
