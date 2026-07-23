# How this app works — complete workflow

<!-- Last updated: 2026-04-14 -->

---

## Overview

This app is a marketing analysis tool built for copywriters, conversion specialists, and marketing teams who need a fast, structured audit of any landing page or web page. The user provides a URL. The app fetches the full content of that page, then runs three independent AI-powered analyses — a conversion rate audit, an SEO audit, and a copy quality analysis — each producing a scored, prioritised report. All results can be packaged into a ready-to-use brief for an external copywriting tool called CopyZap, and the entire report can be exported as a standalone HTML file. The problem it solves is simple: getting a thorough, expert-level review of a web page in minutes rather than hours, without needing a specialist on hand.

---

## Step 1 — Scraping

The user provides a single URL — typically a landing page, homepage, sales page, or service page.

The app sends that URL to a service called **Firecrawl**, which is a specialised web scraping tool that can render pages the way a real browser would, including pages that load their content dynamically with JavaScript. Firecrawl is not a simple copy-and-paste of source code — it actually loads the page and returns a clean version of what a visitor would see.

Three types of content are extracted in a single request:

- **Markdown** — The full body text of the page, converted into clean, readable plain text. This is what gets sent to the AI for content analysis. It strips away layout and focuses purely on what is written.
- **HTML** — The structured page code, used to extract heading tags (H1, H2, H3), image references, and social meta tags (Open Graph). This is more reliable than the markdown for structural elements because the markdown conversion can occasionally merge or reorder things.
- **Raw HTML** — The unprocessed source code of the page, used specifically to extract meta tags (title tag, meta description, canonical URL, robots directives, schema markup types). These tags are invisible to visitors but critical for SEO.

After this step, the app has available: the full body text, the heading structure, every image and whether it has descriptive alt text, all meta tags, social sharing tags, and any structured data types the page already uses.

---

## Step 2 — CRO Audit

**What information this module uses:**
The markdown body text, the heading structure extracted from HTML, and the meta tags (title, canonical, schema types, robots). The user also provides the brand name, the page type (e.g. landing page, homepage, product page), and optionally up to three competitor URLs and any personal notes.

**What it analyzes — scored dimensions:**

1. **Value Proposition Clarity (20%)** — Does the page clearly explain what the offer is, who it is for, and why it is better than alternatives? Is the focus on outcomes rather than product features?
2. **Headline and Subheadline (15%)** — Does the main headline communicate core value in under ten words? Does the subheadline add new information rather than repeat the headline?
3. **CTA Placement, Copy, and Hierarchy (15%)** — Is there one clear primary call-to-action visible before the user scrolls? Are secondary CTAs clearly subordinate? Are there "dead zones" — sections with no clear next step?
4. **Above-the-Fold Heatmap (10%)** — What captures attention first, and does that match what should capture attention? How does the eye path evolve over 1, 3, and 5 seconds? On a 375px mobile screen, is the CTA visible without scrolling?
5. **Narrative Flow (10%)** — Does the page follow a logical sequence: Problem → Solution → Proof → Action? Are there abrupt jumps that break the persuasive story?
6. **Trust Signals and Social Proof (10%)** — Are there logos, testimonials, reviews, or credentials? Are they placed near the CTAs where they can reduce hesitation?
7. **Objection Handling and Friction (10%)** — Does the page pre-empt the top reasons a visitor would not convert? Are forms short? Is there any unnecessary friction on mobile?
8. **Micro-Copy (5%)** — Are button labels specific and action-oriented? Is there reassurance text near CTAs ("No credit card required", "Cancel anytime")? Are form placeholders helpful?
9. **Accessibility as CRO (5%)** — Do CTAs have sufficient colour contrast to be readable? Are tap targets at least 44 pixels? Do form fields have proper labels?

Beyond scores, the audit also produces: a buyer journey analysis (how a cold, warm, and hot visitor would experience the page differently), an assessment of eight emotional triggers (urgency, scarcity, social proof, authority, reciprocity, loss aversion, curiosity, belonging), a pricing psychology analysis (if pricing is visible), an AI and voice search readiness assessment, a mobile-specific analysis, a full page wireframe showing the current section order and a recommended reordering, copy rewrites for the weakest elements, and a minimum of three specific A/B tests to run.

**What it does NOT consider:**
Page load speed, technical performance, actual traffic data, heatmap or session recording data, real user behaviour, competitor analysis (unless competitor URLs are manually provided), ad campaigns driving traffic to the page, or anything outside the page's visible text and structure.

**What the user receives:**
A scored summary across all nine dimensions with a weighted total, an executive summary, a prioritised table of recommendations with effort and impact ratings, detailed findings per dimension, a page wireframe with recommended structure, suggested copy rewrites, A/B test proposals, and a 30/60/90-day action plan.

---

## Step 3 — SEO Audit

**What information this module uses:**
The markdown body text, the heading structure from HTML, all meta tags (title, description, canonical, robots, Open Graph tags, schema types already present), and an image alt-text audit listing every image and flagging which are missing descriptions.

**What it analyzes — scored dimensions:**

1. **Title Tag and Meta Description (15%)** — Are they present? Are they the right length? Is the primary keyword placed near the beginning of the title? Is the meta description written to earn clicks, not just describe the page?
2. **Heading Hierarchy (15%)** — Is there exactly one H1? Is the primary keyword in it? Do the H2s create a logical structure that a reader could navigate? Is the heading map coherent?
3. **Content Quality and Depth (20%)** — Is the word count sufficient for the topic? Does the page demonstrate expertise, experience, authority, and trustworthiness? Are important subtopics missing?
4. **Keyword Optimisation (15%)** — Is the primary keyword present in the title, H1, meta description, and in the first hundred words of body text? Are five to eight secondary/related terms naturally distributed across the page?
5. **Internal and External Links (10%)** — Does the page link to other relevant pages on the site? Does it link to authoritative external sources where appropriate? Is the anchor text descriptive rather than generic ("click here")?
6. **Image and Media SEO (10%)** — Do images have alt text that includes relevant keywords? Are file names descriptive rather than random strings?
7. **Schema and Structured Data (10%)** — Does the page have any structured data (JSON-LD markup) that helps search engines understand the content type? Which schema type is most important to add and what would it look like?
8. **Content Architecture (5%)** — Is the content scannable, with short paragraphs and clear visual breaks? Is the URL clean and readable?

**What it does NOT consider:**
Domain authority, backlink profile, page speed, Core Web Vitals, crawl errors, sitemap structure, robots.txt rules, search console data, actual keyword rankings, click-through rates, or any off-page factors. It works entirely from the content of the single page provided.

**What the user receives:**
A score across all eight dimensions with a weighted total, a keyword map showing where each keyword does and does not appear, a full heading structure map, a content gap analysis listing missing subtopics and unanswered questions, meta tag and heading rewrite suggestions, a ready-to-paste schema markup block, quick wins with estimated time to implement, and a week-by-week action plan for the first three months.

---

## Step 4 — Copy Analysis

**What information this module uses:**
The markdown body text and the heading structure. It does not use meta tags or image data — it focuses entirely on the words a visitor reads.

**What it analyzes:**
The module breaks the entire page into individual copy blocks: every headline, subheadline, body paragraph, bullet list, call-to-action, testimonial, caption, and form label is treated as a separate unit. Each block is scored on seven dimensions:

1. **Clarity (20%)** — Is it instantly understood, or does the reader have to re-read it?
2. **Persuasion Strength (25%)** — Does this specific piece of text move the reader closer to acting?
3. **Emotional Tone (15%)** — Does it connect on an emotional level, or is it flat and functional?
4. **Benefit-to-Feature Ratio (15%)** — Does it focus on what the customer gains, or on what the product does?
5. **Power Words and Language (10%)** — Is the language vivid, specific, and strong?
6. **Active vs. Passive Voice (5%)** — Is the writing active and direct, or passive and distant?
7. **Conversion Relevance (10%)** — Does this block advance the page's conversion goal, or is it filler?

A weighted composite score is calculated for each block, and a colour is assigned: green (strong, 7.0–10.0), yellow (needs work, 4.0–6.9), or red (weak, 1.0–3.9).

This analysis happens in two separate passes. The first pass scores every block on the page and identifies patterns — the most common weakness, the dominant bad habit, and the average score per dimension. The second pass focuses on the five lowest-scoring blocks and generates high-converting rewrites for each, along with a clear explanation of what is wrong with the current version and what the projected score would be after the rewrite.

**What it does NOT consider:**
Anything outside the written text — layout, visual design, images, colour, font choice, page speed, or SEO. It does not consider the competitive landscape or whether the copy is factually accurate. It does not analyse the page's backend or conversion tracking.

**What the user receives:**
A colour-coded heatmap of every copy block on the page, an overall page copy score, a breakdown of average scores per dimension, a list of the five weakest blocks with their rewrites and projected improvement, a pattern analysis identifying the writing habits dragging the page down, and a prioritised action plan.

---

## Step 5 — Acciones de Copy

This module collects the key findings from all three audits — the CRO issues, the SEO gaps, and the weakest copy blocks — and packages them into a ready-to-use brief.

It does this entirely on the user's device, without making any additional requests. It reads the structured output from the three audits, identifies the highest-priority items from each, and organises them into a set of labelled prompt cards — each describing one specific problem and what needs to be fixed. The cards are also combined into a single plain-text block that the user can paste directly into CopyZap or any other AI copywriting tool.

The output tells a copywriter exactly what the page's problems are, in priority order, with context from all three analysis angles. The user does not need to read the full reports to create a CopyZap brief — this module does the synthesis for them.

---

## Step 6 — Individual exports

Each of the four modules — CRO Audit, SEO Audit, Copy Analysis, and Acciones de Copy — can be exported independently as a styled HTML file that opens in any browser with no internet connection required.

Each export is generated from the raw analysis data, not from taking a screenshot of the screen. This means the exported file is fully structured and readable, not a frozen image.

- The **CRO export** includes the full scored assessment, the page wireframe, copy rewrites, A/B test proposals, and action plan.
- The **SEO export** includes the keyword map, heading structure map, content gap analysis, schema markup, and week-by-week plan.
- The **Copy export** includes the full colour-coded heatmap, dimension averages, the five rewrites, and the pattern analysis.
- The **CopyZap export** includes all the prompt cards and the combined brief text.

There is also a separate export for the raw scraped data (the extracted text, meta tags, and headings), which can be useful as a reference document.

---

## Step 7 — Full report export

The full report export combines all five sections — CRO Audit, SEO Audit, Copy Analysis, CopyZap brief, and the extracted page data — into a single HTML file.

The file is structured with a tab navigation bar at the top. Clicking a tab shows that section and hides the others. The tab system uses only inline code with no external dependencies, which means it works fully offline, on any device, in any modern browser.

When the file is printed or saved as a PDF, the tab navigation disappears and all sections are printed in sequence, each starting on a new page.

**What is included:** CRO Audit, SEO Audit, Copy Analysis, CopyZap brief, and the Extracted Page Data section showing the scraped text and meta information.

**What is not included:** Any data not present in the three audits. The export is a static document — it does not connect to any server after it is downloaded, and it cannot be updated once exported.

---

## What the app does NOT do

- It does not measure page speed, load time, or Core Web Vitals.
- It does not access Google Analytics, Search Console, or any real traffic data.
- It does not know the page's actual keyword rankings or organic search position.
- It does not analyse backlinks, domain authority, or off-page SEO factors.
- It does not access gated content, content behind login screens, or dynamically personalised content served only to certain visitors.
- It does not analyse pages that block scraping tools or return errors.
- It does not compare the page against real competitors unless competitor URLs are manually provided by the user.
- It does not verify whether any claims on the page are factually accurate.
- It does not analyse videos, audio, interactive elements, or anything that is not text or static images.
- It does not track what happens after a visitor converts — no post-purchase flow, no email sequence, no funnel analysis beyond the single page.
- It does not analyse ad campaigns or the traffic sources sending visitors to the page.
- If the page content exceeds the processing limit (approximately 18,000–20,000 characters of text), the content is trimmed and a note is added to the analysis. Very long pages may receive a less complete analysis.

---

## Language and audience

The app detects the language of the page being analysed and produces the entire report in that same language. If the page is in Spanish, all scores, recommendations, rewrites, and summaries are written in Spanish. If the page is in English, the report is in English. The system supports any language that the underlying AI model can handle.

The reports are written for marketing professionals — people who make decisions about pages, not people who build them. The language is direct and action-oriented, using short phrases rather than long explanations, and always connecting each finding to a specific business consequence. Generic advice is explicitly avoided; every recommendation is grounded in something specific found on the page being analysed.
