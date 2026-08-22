---
slug: sarvam-ai-sovereign-stack
section: companies
title: Sarvam took the government's compute and gave the weights away
dateline: Bengaluru
published: 22 August 2026
summary: Sarvam AI reached a $1.5 billion valuation in June 2026 on a $234 million Series B led by HCLTech, four months after open-sourcing two foundation models trained on IndiaAI Mission compute under Apache 2.0.
image: news/assets/sarvam-ai-sovereign-stack-hero.webp
image_alt: Sarvam AI Series B announcement graphic reading "Announcing Series B, $300 Million"
image_credit: Sarvam's own announcement graphic for the round. Image: Sarvam AI
about_name: Sarvam AI
about_url: https://www.sarvam.ai/
about_type: Organization
about_desc: Bengaluru AI company building multilingual foundation models and voice systems for Indian languages, founded in 2023 by Vivek Raghavan and Pratyush Kumar, and selected under the IndiaAI Mission to build a sovereign foundation model.
about_same: https://en.wikipedia.org/wiki/Sarvam_AI
founders: Vivek Raghavan; Pratyush Kumar
keywords: Sarvam AI; sovereign AI India; IndiaAI Mission; Sarvam 105B; Sarvam 30B; Indic LLM; open weights; Apache 2.0; HCLTech; Indian language AI
fact: What it is | An Indian AI company building multilingual foundation models, speech systems and voice agents for Indian languages
fact: Founders | Vivek Raghavan and Pratyush Kumar, both previously with AI4Bharat at IIT Madras
fact: Founded | August 2023, headquartered in Bengaluru
fact: Series B | $234 million first close of a $300 million round, June 2026, at a $1.5 billion post-money valuation
fact: HCLTech stake | $150 million for 10.46%, reported at Rs 1,427.25 crore
fact: Stated usage | Company says its conversational platform handles 2 million-plus interactions a day and its inference platform over 10 million API calls a day
fact: Earlier funding | $41 million seed and Series A in December 2023, led by Lightspeed with Peak XV and Khosla Ventures
fact: Government selection | Chosen by MeitY in April 2025 under the IndiaAI Mission to build an indigenous foundation model with subsidised GPU access
fact: Flagship models | Sarvam 30B (32B parameters, MoE, 65K context) and Sarvam 105B (106B parameters, MoE, 9B active, 128K context), both February 2026, both Apache 2.0
fact: Other products | Saaras V3 speech-to-text, Sarvam Vision, the Indus consumer app, and Sarvam Kaze AI glasses
fact: Verification status | Funding, valuation and model releases are press- and company-confirmed; usage figures are self-reported and revenue is not disclosed
source: https://www.sarvam.ai/
source: https://en.wikipedia.org/wiki/Sarvam_AI
source: https://slator.com/sarvam-raises-234m-sovereign-multilingual-ai/
source: https://inc42.com/features/sarvam-and-the-sovereign-ai-dream/
source: https://www.arcweb.com/blog/sarvam-building-indias-sovereign-ai-stack-rising-unicorn-status
source: https://www.sarvam.ai/announcing-series-b
source: https://techcrunch.com/2026/06/15/sarvam-becomes-indias-newest-ai-unicorn-with-234-million-funding-round-led-by-hcltech/
source: https://www.hcltech.com/en-us/press-releases/sarvam-raises-234-million-first-close-300-million-series-b-15-billion-valuation
---

# Sarvam took the government's compute and gave the weights away

In April 2025 India's Ministry of Electronics and Information Technology picked a startup less than two years old to build the country's first homegrown foundation model, and handed it subsidised access to national GPU capacity to do it.

The obvious risk in that arrangement is the one every state-backed technology programme runs: public compute goes in, and what comes out is a product nobody outside the procurement chain can use.

That is not what happened. In **February 2026** Sarvam released **two** models trained on IndiaAI Mission compute — **Sarvam 30B** and **Sarvam 105B** — and published both under **Apache 2.0**. Anyone can download the weights, run them commercially, and fork them. Four months later the company closed **$234 million** at a **$1.5 billion** valuation.

## The company

Sarvam AI was founded in **August 2023** in Bengaluru by **Vivek Raghavan** and **Pratyush Kumar**, both previously associated with **AI4Bharat** at IIT Madras — the group behind much of the open Indic-language dataset work the rest of the field now builds on. That lineage matters: Sarvam did not start by deciding Indian languages were a market, it started from the people who had spent years assembling the data.

The funding history is short and steep:

| Round | Amount | Date | Led by |
|---|---|---|---|
| Seed + Series A | $41 million | December 2023 | Lightspeed, with Peak XV and Khosla Ventures |
| Series B (first close) | $234 million | June 2026 | HCLTech, committing $150 million |

The Series B is reported as a first close against a target of around **$300 million**, with **Bessemer Venture Partners** joining and existing backers **Khosla Ventures** and **Peak XV** following on. Post-money valuation: **$1.5 billion**.

The lead is the part worth pausing on. HCLTech is not a venture fund — it is a $13-billion-revenue IT services company. A strategic investor of that shape writing $150 million into a foundation-model startup is buying a supply relationship as much as equity: Indian-language models it can put in front of its own enterprise and government clients.

## What they actually shipped

| Model | Size | Released | Licence |
|---|---|---|---|
| Sarvam-1 | — | October 2024 | Sarvam AI Research |
| Sarvam-M | 24B | May 2025 | Apache 2.0 |
| Sarvam 30B | 32B, Mixture-of-Experts, 65K context | February 2026 | Apache 2.0 |
| Sarvam 105B | 106B MoE, ~9B active, 128K context | February 2026 | Apache 2.0 |

Both February models are **Mixture-of-Experts**, which is the pragmatic choice when compute is the binding constraint: 105B total parameters with roughly 9B active per token means you pay for a large model's knowledge at closer to a small model's inference cost. For a company serving a price-sensitive market on subsidised hardware, that is the architecture the situation demands.

Around the models sits a product surface aimed at deployment rather than benchmarks: **Saaras V3** for speech-to-text across Indian languages, **Sarvam Vision** for document understanding and OCR, a consumer app called **Indus** built on the 105B model, a startup programme handing out API credits, and — announced for May 2026 — a pair of AI glasses called **Sarvam Kaze**. There is also a **UIDAI** collaboration from March 2025 on voice interaction for Aadhaar services.

The hardware is the odd one out. Everything else follows from "we have models and Indian-language data, sell access to them." Consumer eyewear is a different company.

## The thing that makes this interesting

Open-weighting a model built on public compute is the correct outcome and a genuinely unusual one. India put roughly **$1.25 billion** into the IndiaAI Mission; the direct return on the Sarvam portion is two Apache-2.0 models that any Indian company, university or competitor can build on without asking permission or paying rent to a US lab. Measured as industrial policy rather than as a venture investment, that is a real result.

It also creates the strategic problem Sarvam now has to answer. If the weights are free, the business is not the model — it is inference, tooling, support, distribution and whatever the enterprise actually needs wrapped around it. That is a services-shaped business, which is presumably part of why the round was led by a services company.

Sarvam's own framing is "full-stack sovereign AI" — training and inference infrastructure, models across text and other modalities, and products for enterprises, developers and government, with named focus verticals in **banking, insurance, govtech and defence**. That is a systems-integrator's target list, and it lines up with who led the round.

The open question is whether "best model for Indian languages" is a defensible position or a temporary one. Frontier labs are multilingual and improving; the gap on Hindi, Tamil or Marathi narrows with every general release. Sarvam's durable advantage, if there is one, is unlikely to be raw quality on a leaderboard. It is more likely the data pipeline, the voice stack, and being the vendor a state or a bank can actually procure from.

## What we could not verify

**Usage is self-reported; revenue is not disclosed at all.** Sarvam does publish volume: it says its conversational platform handles **more than 2 million interactions a day** and its inference platform serves **over 10 million API calls a day**. Those are the company's own numbers, with no methodology attached — an "interaction" is whatever Sarvam counts as one. What is genuinely absent is money: no revenue, no paying-customer count, no headcount. A $1.5 billion valuation four months after two open-weight releases is priced on a national position, not on published financials.

**Benchmark claims are not independently settled.** Sarvam's own evaluations of its models against comparable open models are the company's; we have not reproduced them, and Indic-language benchmarking is contested enough that leaderboard placement should be treated as a claim rather than a fact.

**The Series B is a first close.** Sarvam announced the round as $300 million and disclosed $234 million as the first close; the balance had not been confirmed as closed at the time of writing.

**Sarvam Kaze had not been independently reviewed.** The glasses were announced for May 2026; we found no hands-on coverage establishing what shipped.

## Why this is on our desk

Because it is the clearest test case anywhere of a specific proposition: that a country can fund its own foundation models, keep the output open, and still end up with a company worth something.

There is also a small connection to another story on this desk. Vivek Raghavan is among the angels who backed [Repello AI](/news/repello-ai-agent-security/), the AI-security startup we wrote about this week — the same cohort, one layer up, funding the people securing the systems it is building.

## FAQ

### What is Sarvam AI?

An Indian AI company founded in Bengaluru in August 2023, building multilingual foundation models, speech recognition and voice agents for Indian languages. It was selected by MeitY under the IndiaAI Mission in April 2025 to build an indigenous foundation model using government-supported GPU capacity.

### Who founded Sarvam AI?

Vivek Raghavan and Pratyush Kumar, both previously associated with AI4Bharat at IIT Madras, the research group behind much of the open Indic-language dataset work.

### How much has Sarvam AI raised, and what is it worth?

$41 million across seed and Series A in December 2023 (led by Lightspeed, with Peak XV and Khosla Ventures), then a $234 million Series B first close in June 2026 led by HCLTech with a $150 million commitment. That round put it at a $1.5 billion post-money valuation, making it a unicorn.

### Are Sarvam's models actually open source?

The weights of Sarvam-M, Sarvam 30B and Sarvam 105B are released under Apache 2.0, which permits commercial use and modification. Sarvam-1, from October 2024, used a more restrictive Sarvam AI Research licence. Open weights are not the same as open training data, which has not been released.

### What are Sarvam 30B and Sarvam 105B?

Two Mixture-of-Experts models released in February 2026 and trained on IndiaAI Mission compute. Sarvam 30B has around 32 billion parameters and a 65K context window; Sarvam 105B has around 106 billion total parameters with roughly 9 billion active per token and a 128K context window.

## Sources

Checked on 22 August 2026. Funding, valuation and model details are drawn from press coverage and the company's own publications; nothing here is an independent evaluation of model quality.

- Sarvam AI — products, model line and positioning: <https://www.sarvam.ai/>
- Wikipedia, "Sarvam AI" — founding, funding table, model releases, IndiaAI Mission selection, partnerships: <https://en.wikipedia.org/wiki/Sarvam_AI>
- Slator — Series B amount, lead investor and valuation: <https://slator.com/sarvam-raises-234m-sovereign-multilingual-ai/>
- Inc42 — analysis of the sovereign-AI positioning: <https://inc42.com/features/sarvam-and-the-sovereign-ai-dream/>
- ARC Advisory Group — the sovereign AI stack and unicorn status: <https://www.arcweb.com/blog/sarvam-building-indias-sovereign-ai-stack-rising-unicorn-status>
- Sarvam AI, "Announcing Series B" — the company's own account of the round, its full-stack framing and its usage figures: <https://www.sarvam.ai/announcing-series-b>
- TechCrunch — unicorn status and round details: <https://techcrunch.com/2026/06/15/sarvam-becomes-indias-newest-ai-unicorn-with-234-million-funding-round-led-by-hcltech/>
- HCLTech press release — the $150 million commitment and 10.46% stake: <https://www.hcltech.com/en-us/press-releases/sarvam-raises-234-million-first-close-300-million-series-b-15-billion-valuation>

Sarvam AI was not contacted before publication and has not commented. Corrections are welcome and we will make them on the page.
