TSMA — Submit Abstract, Register CTA, and single-click navigation patch

Copy these files into matching paths under tsma-frontend/src/:
- pages/Home.jsx (conference callout placement from the Home layout fix)
- components/HeroSlideshow.jsx (hero CTAs use working router navigation; secondary CTA opens Submit Abstract)
- components/SectionLink.jsx (single-page section links scroll on one click without adding a # fragment)

Keep a copy of existing files before replacing them. This patch does not change backend APIs, database, conference registration rules, or deployment.

Validation: source paths were checked against TSMA.zip. Full frontend build and browser click testing were not run. Please test in local/staging before production, including Register for Conference on the conference detail page and Submit Abstract.
