# Use of Artificial Intelligence

## In the product

Overlap does not use AI inside the application. The harmonization is a statistical model (quantile mapping) whose error is measured on hidden years and against independent fire records. Every number the app shows is computed by code in `pipeline/`.

## During development

We used Claude (Anthropic) as an assistant to:

- write and review the Python data pipeline (auditing, cleaning, exports) and the web app (HTML, CSS, JavaScript);
- reproduce in Python the results of the team's R models, as an independent check;
- draft and translate text (README, documentation, app strings in English and Spanish, submission fields);
- audit methods and results for consistency and point out risks.

The team chose the challenge, the user and the method; designed and ran the statistical models and validations in R (`pipeline/06`–`11`, `15`); reviewed the results and made the decisions. Files written with AI assistance carry a header line saying so.

No AI-generated content uses NASA logos, flags or mission identifiers.
