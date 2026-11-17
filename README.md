# Alberto Arturo Vergani — academic website

Source of the personal academic website `https://albertoarturovergani.github.io`.

Responsive, static, no personal portrait photograph, built from the CV (17 November 2026). No paid domain or web hosting is required when using GitHub Pages with a public repository. Artwork images are optimised versions of files supplied by the author.

## Publish

- The repository must be **Public** for GitHub Pages on the free plan. Switch it to Public in **Settings > General > Danger Zone > Change repository visibility**.
- In **Settings > Pages > Build and deployment**, select **GitHub Actions** as the source. This repository includes `.github/workflows/pages.yml` to build and deploy the site. You can alternatively publish from **Deploy from a branch > main > /(root)**, because prebuilt static files are committed at the root.
- After each update, confirm a successful run in the **Actions** tab and check the live URL.

## Update publications

The canonical bibliography is **`vergani_scholar.bib`** at the repository root. Add a valid BibTeX entry (with a unique citation key) and commit it. The GitHub Actions workflow runs `scripts/build_data.py` to regenerate the searchable bibliography. `content/status.json` holds overrides for article/preprint/submitted/accepted statuses. Please verify the publication metadata and acceptance status before publishing. Do not mark conference submissions as accepted without evidence.

The project comes with a generated `data/publications.json` so the site also works with the branch-based GitHub Pages option. If you use *branch* deployment rather than *GitHub Actions* deployment, regenerate the JSON with `python3 scripts/build_data.py` and commit both the BibTeX and JSON files. If we maintain the repository together through ChatGPT, I can do these updates for you.

## Website files

- `index.html` — homepage with research, career, awards and brain art
- `publications.html` — searchable and filterable bibliography
- `assets/style.css`, `assets/main.js` — theme and interactivity
- `assets/*.webp` — user's scientific artwork, *not* a portrait
- `vergani_scholar.bib` — the full editable bibliographic source
- `scripts/build_data.py` and `content/status.json` — bibliography generator and status corrections
- `.github/workflows/pages.yml` — automated deployment

## Local preview

```bash
python3 scripts/build_data.py
python3 -m http.server 8000
```

Then open `http://localhost:8000` in a browser.

## Bibliography provenance and caution

The source BibTeX includes 84 distinct records after removing one duplicate key: 26 journal entries, 50 conference entries, 5 preprints/working papers and 3 theses (the CV's manually maintained summary may differ). Several 2027 entries are planned/submitted; they are labeled as such on the site. Bibliographic status is inferred from the source BibTeX and explicit overrides and is not independently verified.

The uploaded CV archive included historic material and a portrait/facsimile signature. Those private/historic files **are not included** in this repository. The website includes only publication metadata, professional information, and scientific artwork. Please review current appointment dates, publication statuses and professional contact links before publicising the site.
