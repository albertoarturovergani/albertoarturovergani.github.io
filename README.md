# Alberto Arturo Vergani — personal academic website

Public site: **https://albertoarturovergani.github.io**

This is a lightweight static site hosted by GitHub Pages. It includes the complete CV structure transcribed from `cv_noImage26.tex` in the supplied Overleaf archive (17 November 2026), a search-ready bibliography from `vergani_scholar.bib`, and scientific Brain Art projects. No portrait or personal signature is included.

## Pages

- `index.html` — homepage with research areas, recent publications, academic path, **all four education qualifications**, recognition, science/art and contact links.
- `cv.html` — **full academic CV**, respecting the original Overleaf order: Introduction; Prizes, Proposals and Fellowships; Academic Information (Positions, Collaborations, Visiting periods, Teaching, Tutoring, Commissions, Memberships, Chairing, Event Organization, Journals Engagement, References, Education); Presentations (Talks, Posters, Seminars); Continuous learning (Workshops, Schools, Courses); Extra Information (Programming skills, Third mission, other academic and non-academic activities); Neuroscience Art; Scientific Outcomes.
- `publications.html` — complete BibTeX-based bibliography, filterable by **topic, publication type and year**, with text search. Topics can overlap.

The CV page includes original content, thesis details and activities from the LaTeX source, rather than only the abbreviated homepage timeline. Its `Scientific Outcomes` metrics are a **dated historical snapshot**, not a live feed. Bibliography counts are generated separately to avoid presenting historical counts as current. Contact information for third-party academic referees is intentionally omitted from the public page.

## Add or update a publication

1. Open `vergani_scholar.bib` in this repository, choose **Edit** and add the BibTeX record with a unique citation key, or modify an existing record.
2. If the publication status needs an explicit correction (accepted, in preparation, submitted, etc.), update `content/status.json` using the corresponding BibTeX citation key.
3. To manually assign subject tags, update `content/topics.json`, e.g. `"my2027paper": ["neuroscience", "computer-science"]`. You can use several tags for one paper. Existing records have been manually classified using their scientific topics; new records receive an automatic **suggestion** based on keywords until reviewed. Never treat the keyword fallback as an authoritative discipline classification.
4. Commit the changes. **GitHub Actions regenerates `data/publications.json` and deploys the pages**. The bibliography can be found via search or the subject links on the homepage.

Subjects currently offered (internal codes): `neuroscience`, `computer-science`, `history`, `brain-modelling`, `neuroengineering`, `education`, and `other` (shown only if needed). Subject counts overlap and should not be added together. Type filters (journal / conference / preprint / thesis) and year filters are independent of the subject filter.

New works are **not automatically harvested** from journals, Google Scholar or ORCID: add a BibTeX entry to trigger the automated publication refresh. Verify DOI, category and acceptance status. Some references in the supplied CV are labelled as submitted or planned for 2027; they are not represented as peer-reviewed publications.

## Update the CV or homepage

- `cv.html` is a publication-safe rendering of the Overleaf LaTeX supplied on 17 November 2026. When the CV changes, you can update this file, or share a more recent Overleaf source for a new conversion. The full original ZIP, personal photograph, signature and private drafting files **are not committed**.
- `index.html` contains the featured education cards, current position and career summary. Keep this homepage in sync with the detailed CV.
- `assets/style.css` and `assets/main.js` contain styling, menu and filtering. The three `assets/*.webp` files are the author's neuroscience artwork, **not** personal photographs.

## Deployment

This repository is public and contains `.github/workflows/pages.yml`. In **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**. The workflow runs on every `main` commit and manually through **Actions → Publish academic website → Run workflow**. The workflow needs `pages: write` and `id-token: write`, both already declared.

GitHub Pages also supports a branch-based publish option, but for **automatic BibTeX updates** use the provided GitHub Actions workflow (otherwise you need to run `python3 scripts/build_data.py` and commit the JSON output yourself).

To preview locally without extra Python dependencies:

```bash
python3 scripts/build_data.py
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## Source / accuracy notes

The original BibTeX was cleaned to **84 unique entries**: 26 journal items, 50 conference entries, 5 preprints/working papers, 3 theses. The manually maintained *Scientific Outcomes* totals in the original CV do not exactly match this sum. Status and subject data come from the source record and conservative manual curation, not from live publisher verification. The source also includes time-limited appointments and future records; review dates and affiliations before using the website as an official CV.
