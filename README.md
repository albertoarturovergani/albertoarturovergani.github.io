# Alberto Arturo Vergani — personal academic website

Public site: **https://albertoarturovergani.github.io**

This is a lightweight static site hosted by GitHub Pages. It includes the complete CV structure maintained as the academic web CV (November 2026), a search-ready bibliography from `vergani_scholar.bib`, and scientific Brain Art projects. No portrait or personal signature is included.

## Pages

- `index.html` — homepage with research areas, recent publications, academic path, **all four education qualifications**, recognition, science/art and contact links.
- `cv.html` — **full academic CV**, with the same section structure as the research CV: Introduction; Prizes, Proposals and Fellowships; Academic Information (Positions, Collaborations, Visiting periods, Teaching, Tutoring, Commissions, Memberships, Chairing, Event Organization, Journals Engagement, References, Education); Presentations (Talks, Posters, Seminars); Continuous learning (Workshops, Schools, Courses); Extra Information (Programming skills, Third mission, other academic and non-academic activities); Neuroscience Art; Scientific Outcomes.
- `publications.html` — complete BibTeX-based bibliography, filterable by **topic, publication type and year**, with text search. Topics can overlap.
- `neural-turing-lab.html` — interactive Neural Turing Patterns SNN laboratory, linked from Brain Art. Three selectable spiking neuron models (LIF, adaptive LIF, Izhikevich regular-/fast-spiking), three documented spatial dynamics presets, adjustable E→E, E→I, I→E, I→I coupling and local/inhibitory radii, and configurable synaptic delay and characteristic-distance conduction speed. A controllable Gaussian central excitatory stimulus (intensity, spread, duration) perturbs the evolving network.
  - Below the pattern, real-time graphics include a **five-second nominal rolling Welch mean PSD** (Hann, 50% overlap), a **Morlet time–frequency scalogram**, an **E/I population-mean membrane voltage phase plane**, and **population E, I and E−I voltage time series**. The former wavelet-average-power plot was removed. Users can switch central vs whole excitatory activity and export the PSD / wavelet data as CSV, pattern PNG, and parameters/stimulus events as JSON.
  - For scientific clarity, conduction speed is measured in **lattice cells per step**, synaptic delay in **simulation steps**, and 5 s PSD is defined using an explicitly selectable **nominal analysis step of 5, 10 or 20 ms**. These settings do **not** calibrate physiological dynamics or provide biologically validated PSD frequencies in Hz. Simulation and analyses run in-browser, without server uploads; the generator remains distinct from the original award-winning artwork.

The CV page includes original content, thesis details and activities from the full CV, rather than only the abbreviated homepage timeline. Its `Scientific Outcomes` metrics are a **dated historical snapshot**, not a live feed. Bibliography counts are generated separately to avoid presenting historical counts as current. Contact information for third-party academic referees is intentionally omitted from the public page.

## Add or update a publication

1. Open `vergani_scholar.bib` in this repository, choose **Edit** and add the BibTeX record with a unique citation key, or modify an existing record.
2. If the publication status needs an explicit correction (accepted, in preparation, submitted, etc.), update `content/status.json` using the corresponding BibTeX citation key.
3. To manually assign subject tags, update `content/topics.json`, e.g. `"my2027paper": ["neuroscience", "computer-science"]`. You can use several tags for one paper. Existing records have been manually classified using their scientific topics; new records receive an automatic **suggestion** based on keywords until reviewed. Never treat the keyword fallback as an authoritative discipline classification.
4. Commit the changes. **GitHub Actions regenerates `data/publications.json` and deploys the pages**. The bibliography can be found via search or the subject links on the homepage.

Subjects use multiple overlapping labels (Neuroscience, Computer Science & AI, History of Science, Neuroengineering, Brain Modelling, Education), plus more specific tags for EEG, MRI/fMRI, Machine Learning, Cerebellum, Alzheimer’s and Cognitive Decline, Schizophrenia, Brain Stimulation/TMS, Spiking Networks, Dopamine/Basal Ganglia, and Neurodevelopment/Epilepsy. Subject counts overlap and must not be summed. Visitors can select multiple tags and match ANY (OR) or ALL (AND). **The default archive view includes all publication types, but excludes records tagged `history`**. The buttons All including history or History of Science make those records available.

New works are **not automatically harvested** from journals, Google Scholar or ORCID: add a BibTeX entry to trigger the automated publication refresh. Verify DOI, category and acceptance status. Some references in the supplied CV are labelled as submitted or planned for 2027; they are not represented as peer-reviewed publications.

## Update the CV or homepage

- `cv.html` is the detailed HTML curriculum. When the CV changes, edit this file in GitHub or supply a revised source for conversion. The full original ZIP, personal photograph, signature and private drafting files **are not committed**.
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

## Research metrics

Google Scholar and Scopus metrics are entered manually in `cv.html`, and their measurement date appears in the Scientific Outcomes section only. The website does not display a global last-updated date.

## Downloadable PDF version of the CV

A visitor-facing **Download full CV (PDF)** link is available on `cv.html` and near Education on `index.html`. The linked file is `assets/Alberto_Arturo_Vergani_CV.pdf`, currently a 23-page A4 rendering of the complete CV (as of 17 November 2026, without a personal portrait). It keeps the education, appointments, awards, talks, continuing training, research activities and art sections.

**Maintenance:** Updating `cv.html` does not automatically regenerate the PDF. Replace the PDF in `assets/` when the CV changes. You can also ask ChatGPT to regenerate it and update the repository. The PDF requires a separate update after substantive CV edits.

## Visual style and domain

The site uses a warm orange/terracotta accent palette, with no portrait photograph. It is currently available at the free `albertoarturovergani.github.io` address. A separately registered personal domain can later be added through Settings → Pages after its DNS records have been configured and ownership verified. Keeping a custom domain still requires renewing its registration; do not change the CNAME or DNS until that decision is made.

## Public GitHub repositories

The Full CV includes all 16 public repositories in `cv.html#github-repositories`, immediately after General programming skills. This inventory is manually curated; re-check public visibility before adding repositories. The optional Algorithms & Computational Models catalogue is deliberately not included.

## Publication topic preset

All subject tags except History of Science are checked when the Publications page opens; its eight history-tagged entries remain accessible when History of Science is selected. There is no visible "All except" or "All including" preset button. Tags are non-exclusive.

## Interactive research keyword cloud

The homepage replaces the three research-area cards with a free-floating, randomly arranged SVG word cloud, without a brain outline or a prominent section heading. It uses **32 clickable topics**, including **Epilepsy**, compiled from bibliography topics and the titles/venues of the research outputs. The text size is determined by the number of **distinct matching bibliographic records**, not raw occurrences of a word in a single article or a subjective importance score. A paper may count toward several words.

**To curate the vocabulary:** edit `content/wordcloud.json`. Each concept has `id`, `label`, a list of subject `topics` and an optional regular-expression `pattern`. Be conservative about scientific associations. Committing that file or adding new BibTeX records triggers the GitHub Actions build, which regenerates `data/wordcloud.json` (counts) and keyword matches within `data/publications.json`. **Do not edit these generated data files manually.**

Clicking a word opens `publications.html?keyword=<slug>`, which displays the matching records even when they belong to History of Science (ordinarily excluded by the default topic preset). Visitors can then clear the research focus and return to the normal publication list. On narrow devices the same keywords are presented as accessible clickable chips instead of shrinking the SVG text.

## Copy BibTeX per publication

Each record in the Publications page has a **Copy BibTeX** button. The action copies that record's complete original BibTeX entry from the maintained `vergani_scholar.bib` file, including its citation key and full available metadata. No manual selection or external site is needed. A short “Copied” confirmation appears after a successful copy. The existing download link still provides the complete bibliography.

The parser in `scripts/build_data.py` retains the exact BibTeX block for each included entry in the generated `data/publications.json`. When editing `vergani_scholar.bib`, the next GitHub Pages build refreshes both the on-screen record and its copyable BibTeX text. The generated JSON file should not be edited manually.

## November 2026 refinements: discoverability and communication

- The homepage `Positions` section no longer duplicates the Education overview immediately below it.
- The Training cards link thesis **titles** directly to the available DOI landing pages. The diploma project has no invented thesis link.
- `Recognition` now lists all seven prizes and five winning proposals from the Full CV, with available links. Fellowships remain in the detailed CV.
- Publications are searchable by **partial or full title**, with word suggestions derived from real publication titles. The title search sits under the topic filters.
- `content/topics.json` assigns all BibTeX records coauthored with Alberto Mazzoni to Neuroengineering; the build also enforces this for new references. It includes Parkinson's disease and Autism subject tags, including the Ortone and Fabbrizzi publications.
- There is intentionally **no fabricated or automatically extracted abstract** and **no abstract-expansion control**: the supplied BibTeX contains no abstract fields. Bibliographic DOI, source links and Copy BibTeX remain available.
- The research word cloud now includes explicitly curated semantic families and related-term neighborhoods in `content/wordcloud.json`. Hovering or keyboard-focusing an SVG word smoothly brings related concepts near it, while clicking the word continues to filter the bibliography. Reduced-motion preferences are honored, and mobile visitors keep clickable keywords.
- The Contact details section links academic profiles and a direct mailto email link.
