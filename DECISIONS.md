# Design Decisions

## Prioritized Lender Requirements

For this assignment, I focused first on the criteria that most lenders use as “hard gates” because these give clear yes/no eligibility and are easy to explain to a broker/user. In equipment finance, the fastest way to reject or approve a deal is usually credit + business stability + request sizing so that’s what I prioritized in the matching engine and the PDF extraction.

Credit scores come first because almost every lender PDF has some minimum FICO and sometimes a business credit proxy like PayNet. If a borrower is below the stated minimum, the match is basically a no and the reason is very straightforward: “Minimum required is X borrower has Y”. This also gives the UI a strong “why” story.

Next is time in business (TIB). Even if credit is okay, many lenders want 2–5 years operating history and this is another clean gate. It’s also commonly written in different ways in PDFs (years months “start date”) so normalizing it early gives consistent comparisons.

Loan amount range is third because it’s very common for lenders to have strict min/max ticket sizes or “app-only” caps. A borrower asking for an amount outside the program band should not show as a good match even if other things look good.

After that, I prioritized geographic restrictions (state exclusions) and industry/equipment exclusions. These are super important in real underwriting but the data in PDFs can be messy (long exclusion lists footnotes or only “we do not fund X”). Still, if a lender clearly excludes a state/industry/equipment type we should show that as a rejection reason.

Finally, I added some “background policy” fields (bankruptcy tax liens judgments foreclosures). These are valuable for matching and explaining rejections but PDFs often describe them in nuanced language (“case-by-case” “allowed with conditions”). For this version, I treated them in a simplified allow/disallow way to keep the engine explainable and consistent.

## Simplifications Made

Authentication is intentionally basic. I kept a simple JWT flow so the UI can login and call APIs but I did not build role-based access control and multi-tenant separation. Reason: the goal here is matching + policy management and strong auth/permissions would take time without improving the core underwriting logic.

For PDF parsing, I chose an LLM-first approach instead of building a full rules parser. Reason: lender PDFs vary a lot and LLM extraction gives good coverage quickly. Also it directly supports the “add new lender from PDF” workflow which is the main extensibility requirement. To keep token cost down the prompt is strict and we avoid “AI notes / confidence” style extra text.

For matching, I used pass/fail checks per criterion with clear human-readable reasoning plus a simple fit score derived from how many checks pass. Reason: explainability is more important than fancy scoring in the first version. A broker should immediately understand why a lender is ranked higher or lower.

For database, I standardized on PostgreSQL. Reason: it’s production-ready and most importantly it avoids the “API and worker not sharing the same DB file” problem that can happen with SQLite in containers. With Postgres the worker and API always see the same state.

## Architecture Choices

Hatchet is used for async workflows so that the UI stays fast. PDF parsing is slow and can fail/retry so it runs in the worker and the API just triggers the job. Same for application matching: it can evaluate multiple lenders and store results and Hatchet helps with retries and separation of concerns. The idea is: API is thin and worker does the heavy lifting.

The LLM extraction is treated like an “ingestion pipeline”. We upload a PDF extract text send a structured prompt and store the output into normalized columns. This is important because after ingestion matching is purely deterministic Python logic against structured fields. There are no LLM calls during matching. That keeps the matching cheap fast and consistent.

Fit scoring is intentionally simple and explainable. I compute a score based on passed checks and optionally weight “hard gates” more in future. This gives a stable ranking and avoids confusing users with black-box scoring.

One important operational choice is using environment variables to control async vs sync (`USE_HATCHET`). In local/dev or if Hatchet is down the API can fall back to sync parsing/matching. In production we keep Hatchet enabled for scale.

## Workflow: Adding a New Lender

The workflow is designed to be simple for ops/analysts.

First, upload the new lender guideline PDF in the Programs screen. The backend stores the PDF and triggers the `parse_pdf` workflow. The worker extracts structured fields and updates the program record.

Second, open the program in the UI and quickly review/edit the extracted fields. This step is important because PDFs can have edge cases (multiple tiers exceptions or missing context). The UI lets you correct values without writing code.

Third, the program is ready for matching. When a loan application is created the matching workflow runs and compares application attributes against all stored program criteria and produces eligibility + reasons + fit score.

## Future Improvements

With more time, I would make tier handling first-class. Many lender PDFs have A/B/C tiers with different credit boxes and pricing. Right now we store one program per PDF in a simplified way but the better model is “one lender → multiple tiers” and the matcher should pick the best tier and show that clearly.

I would also improve scoring by weighting criteria. For example credit score and time in business should matter more than soft-cost percentage. This would make ranking more realistic while still keeping explanations simple.

Another useful improvement is batch parsing + monitoring. When you upload 10 PDFs the system should process them in parallel (Hatchet is good for this) show progress and surface failures cleanly with retry options.

Policy versioning would be valuable in real life. Lenders update guidelines often so we should store versions keep history and allow “effective date” comparisons so older applications can be evaluated under the policy that existed at that time.

Finally, I would add tests for the matching engine (unit tests around edge cases) and add basic rate limiting / caching around LLM parsing to control cost. This keeps the system stable when multiple users upload PDFs at the same time.
