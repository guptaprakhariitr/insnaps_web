---
slug: repello-ai-agent-security
section: companies
title: Repello started by attacking chatbots. Now it is watching the coding agent on your laptop
dateline: Bengaluru
published: 22 August 2026
summary: Repello AI, founded in 2024 by two IIT Roorkee alumni and seeded with $1.2M in June 2025, has moved from red-teaming GenAI apps to monitoring what Claude Code, Cursor and Copilot actually do on employee machines.
image: news/assets/repello-ai-agent-security-hero.webp
image_alt: Repello AI co-founders Aryaman Behera and Naman Mishra
image_credit: Repello AI co-founders Aryaman Behera (CEO, left) and Naman Mishra (CTO). Photo: Repello AI
about_name: Repello AI
about_url: https://repello.ai/
about_type: Organization
about_desc: AI security company building discovery, autonomous red teaming and runtime protection for AI agents and applications, founded in 2024 by Aryaman Behera and Naman Mishra.
founders: Aryaman Behera; Naman Mishra
keywords: Repello AI; AI security; AI red teaming; ARTEMIS; agentic AI security; prompt injection; LLM security; AI agent monitoring; Claude Code security; Entrepreneur First
fact: What it is | An AI security company covering discovery, automated red teaming and runtime protection for AI systems
fact: Founders | Aryaman Behera (CEO) and Naman Mishra (CTO), both IIT Roorkee alumni
fact: Founded | 2024
fact: Offices | San Francisco and Bengaluru; the registered entity, Repello Inc., is in Dover, Delaware
fact: Funding | $1.2 million seed announced 12 June 2025, led by Venture Highway, with pi Ventures and Entrepreneur First
fact: Named angels | Charlie Songhurst, Vivek Raghavan (Sarvam AI), Neeraj Arora, Matt Clifford
fact: Products | ARTEMIS (red teaming), ARGUS (runtime guardrails), Inventory, Workstation Lens, Agent Wiz, Whistleblower
fact: Compliance | Lists SOC 2 and ISO 27001
fact: Verification status | Funding is press-confirmed; product claims, the customer logo wall and pricing are the company's own and unaudited
source: https://repello.ai/
source: https://repello.ai/about-us
source: https://repello.ai/newsroom
source: https://indianstartupnews.com/funding/ai-security-startup-repello-ai-raises-12-million-in-a-seed-funding-round-led-by-venture-highway-others-9358019
source: https://www.ciol.com/funding-acquistion-merger/repello-ai-raises-12-million-to-advance-red-teaming-and-secure-genai-applications-9359692
---

# Repello started by attacking chatbots. Now it is watching the coding agent on your laptop

The fastest-moving hole in enterprise security right now is not a server. It is a developer's laptop with a coding agent on it that has been told to be helpful.

Repello AI, a two-year-old company founded by two IIT Roorkee alumni, has spent the last year moving toward exactly that. It started where most AI security startups started — throwing adversarial prompts at generative AI applications to see what broke. Its current homepage barely mentions chatbots. It leads instead with a product called **Workstation Lens**, and a pitch that reads: *"Secure AI agents across every employee device."*

That is a meaningful change of target, and it is worth understanding why.

## What the company is

Repello was founded in **2024** by **Aryaman Behera**, who is CEO, and **Naman Mishra**, the CTO. Both are IIT Roorkee alumni. By the account in its funding coverage, Behera came from offensive security — bug bounty work, including time with Microsoft's Azure red team — while Mishra was a founding engineer at an esports startup and has published research in machine-learning security. The company runs out of **San Francisco and Bengaluru**; the registered entity, Repello Inc., sits in Dover, Delaware.

On **12 June 2025** it announced a **$1.2 million seed round** led by **Venture Highway**, since acquired by General Catalyst, with **pi Ventures** and **Entrepreneur First** participating. The angel list is unusually senior for a round that size: **Charlie Songhurst**, formerly head of strategy at Microsoft; **Vivek Raghavan**, the Sarvam AI co-founder; **Matt Clifford**, who chaired the UK AI Safety Summit; and **Neeraj Arora**, previously chief business officer at WhatsApp.

Its own framing of the mission is blunt enough to quote: **"Traditional security can't protect AI. Repello does."**

## The product line, and what it tells you

Repello now lists six or seven things depending on how you count, which for a company this size is either impressive range or a lot of surface area:

| Product | What it does |
|---|---|
| **ARTEMIS** | Automated, continuous adversarial testing of AI applications |
| **ARGUS** | Runtime monitoring and adaptive guardrails |
| **Inventory** | Finds AI systems already running in production |
| **Workstation Lens** | Watches AI agents on employee devices |
| **Agent Wiz** | Threat modelling for agent architectures |
| **Whistleblower** | Extracts an AI agent's system prompt |
| **SkillCheck** | An open-source tool |

ARTEMIS is the original engine — the acronym expands to Automated Red Teaming Engine for Mapping, Identification and Scanning, and the company describes it as running large volumes of adversarial tests across text, image and audio rather than a point-in-time penetration test.

The interesting one is Workstation Lens, because of what it implies about where Repello thinks the risk has moved. The company names the tools it watches: **Claude Code, Cursor, Codex CLI, GitHub Copilot, ChatGPT Desktop, Windsurf** and browser agents. The failure modes it lists are specific and, to anyone who has actually run these tools, recognisable: agents reading files that contain credentials, running commands unsupervised, sending data to external destinations, and MCP server configurations changing without anyone approving it.

It also claims integrations with the endpoint stack security teams already run — CrowdStrike, SentinelOne, Microsoft Defender, Jamf, Kandji, JumpCloud — which is the difference between a product a CISO can deploy and a dashboard nobody opens.

## Why the pivot makes sense

Two years ago "AI security" mostly meant prompt injection against a customer-support bot. The blast radius was embarrassment.

That is no longer where the exposure is. An enterprise's most privileged AI system today is not its chatbot; it is the coding agent running on an engineer's machine with repository access, shell access and a plausible reason to read every file in the tree. It has credentials in reach, it acts without a human in the loop between steps, and it was installed by the developer rather than provisioned by IT — so security often does not know it is there.

Repello's older pitch — test your GenAI app before shipping it — addresses a real but narrowing slice of that. Its newer pitch addresses the part that is growing. Whether it can hold both is a different question: ARTEMIS competes with a crowded AI red-teaming field, while workstation monitoring puts it up against endpoint vendors with far deeper enterprise distribution.

## What we could not verify

**The customer wall is uncorroborated.** The site displays logos including Groww, PhysicsWallah, Docusign, Thomson Reuters, Microsoft Azure, Lyzr AI, Open Interpreter, General Catalyst and pi Ventures. Some of those are investors rather than customers, and the page does not distinguish which are paying users, which are integrations and which are programme affiliations. We are not able to confirm any individual commercial relationship.

**No funding since the seed is public.** The newsroom's most recent dated item is still the June 2025 round. For a company that has shipped several products since, that either means a raise it has not announced or fourteen months on a $1.2 million seed. We could not establish which.

**Product efficacy is untested here.** SOC 2 and ISO 27001 are process certifications, not evidence that the detection works. We did not run the product, and there is no independent benchmark of AI red-teaming tools worth citing yet.

**Pricing is undisclosed.** The site offers a seven-day pilot and a demo booking; there is no published price.

## Why this is on our desk

Because it is a story about where a real risk moved faster than the tools built to watch it, and because the people building for it are two years out of an engineering degree.

It is also a small illustration of how tight this cohort is. Vivek Raghavan, who put money into Repello's seed, co-founded [Sarvam AI](/news/sarvam-ai-sovereign-stack/) — and Repello's founders came out of the same institute as the founders of [deSal](/news/desal-hard-water-hair-care/), a hard-water shampoo brand we wrote about this week. Nothing connects a chelating shampoo to an AI red-teaming engine except that Indian technical founders are currently starting companies in every direction at once, and only some of that gets written down.

## FAQ

### What does Repello AI do?

It sells AI security across three stages: finding AI systems already running in an organisation, attacking them automatically to find weaknesses (ARTEMIS), and monitoring them at runtime with guardrails (ARGUS). Its newest product, Workstation Lens, monitors AI coding agents such as Claude Code, Cursor and GitHub Copilot on employee laptops.

### Who founded Repello AI and when?

Aryaman Behera (CEO) and Naman Mishra (CTO) founded it in 2024. Both are IIT Roorkee alumni; Behera's background is offensive security, including work with Microsoft's Azure red team, and Mishra has published machine-learning security research.

### How much funding has Repello AI raised?

A $1.2 million seed round announced on 12 June 2025, led by Venture Highway with pi Ventures and Entrepreneur First, plus angels including Charlie Songhurst, Vivek Raghavan, Matt Clifford and Neeraj Arora. No later round has been announced publicly as of August 2026.

### What is ARTEMIS?

Repello's automated red-teaming engine — Automated Red Teaming Engine for Mapping, Identification and Scanning. The company describes it as continuously running large volumes of adversarial tests against an AI application across text, image and audio, rather than a one-off assessment.

## Sources

All facts were taken from Repello's own public pages and from press coverage of its funding round, checked on 22 August 2026. Where a claim is the company's own, the article says so.

- Repello AI homepage — product line, supported agents, integrations, customer logos, taglines: <https://repello.ai/>
- Repello AI, "About us" — founder roles, mission, investors and programmes: <https://repello.ai/about-us>
- Repello AI newsroom — dated announcements: <https://repello.ai/newsroom>
- Indian Startup News — seed round amount, date, investors, founder backgrounds, founder quotes: <https://indianstartupnews.com/funding/ai-security-startup-repello-ai-raises-12-million-in-a-seed-funding-round-led-by-venture-highway-others-9358019>
- CIOL — corroborating coverage of the same round: <https://www.ciol.com/funding-acquistion-merger/repello-ai-raises-12-million-to-advance-red-teaming-and-secure-genai-applications-9359692>

Repello AI was not contacted before publication and has not commented. If the company wants to clarify anything — the customer list, funding since the seed, or pricing — we will update this page.
