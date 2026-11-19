/* Academic site enhancements and accessible, client-side bibliography filtering. */
'use strict';

const TYPE_NAMES = Object.freeze({
  journal: 'Journal article',
  conference: 'Conference abstract',
  preprint: 'Preprint / working paper',
  thesis: 'Thesis'
});

function makeEl(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}
function makeLink(href, text, className = '') {
  const node = makeEl('a', className, text);
  node.href = href;
  node.target = '_blank';
  node.rel = 'noopener noreferrer';
  return node;
}
function safeExternalUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}
function searchable(text) {
  return String(text || '').toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function initializeNavigation() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  if (!toggle || !nav) return;
  function setOpen(open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  }
  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') setOpen(false); });
}

function renderFeatured(items) {
  const target = document.getElementById('featured-publications');
  if (!target) return;
  const selected = items.filter(p => p.type === 'journal' &&
    p.status === 'Journal article' && !(p.topics || []).includes('history') && p.url && p.title.length > 45).slice(0, 3);
  target.replaceChildren();
  if (!selected.length) {
    target.append(makeEl('p', 'loading-message', 'See the full bibliography for the latest research outputs.'));
    return;
  }
  selected.forEach(p => {
    const card = makeEl('article', 'featured-card');
    const meta = makeEl('div', 'featured-meta');
    meta.append(makeEl('span', '', 'JOURNAL ARTICLE'), makeEl('span', '', String(p.year)));
    card.append(meta);
    const title = makeEl('h3');
    title.append(makeLink(p.url, p.title));
    card.append(title, makeEl('p', '', p.authors));
    const footer = makeEl('div', 'featured-venue');
    footer.append(makeEl('span', '', p.venue || 'Research article'), makeLink(p.url, '↗'));
    card.append(footer);
    target.append(card);
  });
}

const TOPIC_NAMES = Object.freeze({
  "neuroscience": "Neuroscience",
  "computer-science": "Computer science & AI",
  "computational-intelligence": "Computational intelligence",
  "soft-computing": "Soft computing",
  "medical-informatics": "Medical informatics",
  "history": "History of science",
  "brain-modelling": "Brain modelling & digital twins",
  "neuroengineering": "Neuroengineering",
  "education": "Education & outreach",
  "machine-learning": "Machine learning & clustering",
  "eeg": "EEG & electrophysiology",
  "neuroimaging": "MRI & fMRI",
  "cerebellum": "Cerebellum",
  "cognitive-decline": "Alzheimer's & cognitive decline",
  "schizophrenia": "Schizophrenia",
  "brain-stimulation": "Brain stimulation & TMS",
  "spiking-networks": "Spiking & neuromorphic networks",
  "dopamine": "Dopamine & basal ganglia",
  "neurodevelopment": "Neurodevelopment & epilepsy",
  "parkinson": "Parkinson\u2019s disease",
  "autism": "Autism",
  "other": "Other / interdisciplinary"
});


async function copyBibtex(source, button) {
  if (!source) return;
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(source);
  } catch (error) {
    try {
      const field = document.createElement('textarea');
      field.value = source;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.left = '-9999px';
      document.body.append(field);
      field.select();
      const copied = document.execCommand('copy');
      field.remove();
      if (!copied) throw new Error('Clipboard access denied');
    } catch (fallbackError) {
      button.textContent = 'Copy unavailable';
      button.title = 'Clipboard permissions may be blocked in this browser';
      setTimeout(() => { button.textContent = 'Copy BibTeX'; }, 2500);
      return;
    }
  }
  button.textContent = 'Copied ✓';
  button.classList.add('is-copied');
  setTimeout(() => {
    button.textContent = 'Copy BibTeX';
    button.classList.remove('is-copied');
  }, 2500);
}

function renderBibliography(items) {
  const target = document.getElementById('publication-list');
  if (!target) return;
  const typeButtons = [...document.querySelectorAll('[data-filter]')];
  const topicButtons = [...document.querySelectorAll('[data-topic]')];
  const matchSelect = document.getElementById('topic-match-mode');
  const input = document.getElementById('publication-search');
  const titleSuggestions = document.getElementById('publication-title-suggestions');
  const yearSelect = document.getElementById('publication-year');
  const resultCount = document.getElementById('publication-result-count');
  const context = document.getElementById('bib-context');
  const total = document.getElementById('total-publications');
  if (total) total.textContent = String(items.length);
  let filter = 'all';
  let yearFilter = 'all';
  let query = '';
  const params = new URLSearchParams(window.location.search);
  let keyword = params.get('keyword') || '';
  const requested = params.get('topics') ?? params.get('topic');
  const validTopics = new Set(items.flatMap(item => item.topics || []));
  const defaultTopics = new Set(Object.keys(TOPIC_NAMES).filter(code => code !== 'history' && validTopics.has(code)));
  const legacyAll = params.get('view') === 'all';
  const selectedTopics = requested === null ?
    new Set(keyword ? [] : (legacyAll ? validTopics : defaultTopics)) :
    new Set(requested.split(',').filter(code => validTopics.has(code)));
  let explicitTopicFilter = requested !== null || legacyAll;
  let tagMatch = params.get('match') === 'all' ? 'all' : 'any';
  matchSelect.value = tagMatch;
  let refs = new Set((params.get('refs') || '').split(',').map(s => s.trim()).filter(Boolean));


  // Suggestions are derived only from actual publication titles.
  const stopWords = new Set(['with','that','from','through','using','into','the','and','for','are','was','our','their','theory','analysis','study','towards','model','models']);
  const titleWords = [...new Set(items.flatMap(item =>
    String(item.title || '').match(/[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9'’\-]*/g) || []))]
    .filter(word => word.length >= 3 && !stopWords.has(searchable(word)));
  function updateTitleSuggestions(inputText) {
    if (!titleSuggestions) return;
    const term = searchable(inputText.trim());
    titleSuggestions.replaceChildren();
    if (term.length < 2 || term.includes(' ')) return;
    const matches = titleWords.filter(w => searchable(w).includes(term))
      .sort((a,b) => searchable(a).indexOf(term) - searchable(b).indexOf(term) ||
        a.length - b.length || a.localeCompare(b)).slice(0, 14);
    for (const word of matches) {
      const option = document.createElement('option');
      option.value = word;
      titleSuggestions.append(option);
    }
  }

  const counts = { all: items.length, journal: 0, conference: 0, preprint: 0, thesis: 0 };
  const topicCounts = { all: items.length, default: items.filter(item => !(item.topics || []).includes('history')).length };
  for (const item of items) {
    counts[item.type] = (counts[item.type] || 0) + 1;
    for (const tag of (item.topics || ['other'])) {
      topicCounts[tag] = (topicCounts[tag] || 0) + 1;
    }
  }
  document.querySelectorAll('[data-count]').forEach(n => {
    n.textContent = counts[n.dataset.count] || 0;
  });
  document.querySelectorAll('[data-topic-count]').forEach(n => {
    n.textContent = topicCounts[n.dataset.topicCount] || 0;
  });
  const years = [...new Set(items.map(p => p.year).filter(Boolean))].sort((a,b) => b-a);
  for (const year of years) yearSelect.add(new Option(String(year), String(year)));
  topicButtons.forEach(b => { if (b.dataset.topic === 'other' && !topicCounts.other) b.hidden = true; });

  function styleButtons(buttons, dataName, selected) {
    buttons.forEach(button => {
      const active = button.dataset[dataName] === selected;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }
  function isDefaultTopicSelection() {
    return selectedTopics.size === defaultTopics.size && [...defaultTopics].every(code => selectedTopics.has(code));
  }
  function styleTopics() {
    topicButtons.forEach(button => {
      const active = selectedTopics.has(button.dataset.topic);
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    matchSelect.disabled = selectedTopics.size < 2;
    const more = document.querySelector('.topic-more');
    if (more && explicitTopicFilter && !isDefaultTopicSelection() &&
      [...selectedTopics].some(code => more.querySelector('[data-topic="' + code + '"]'))) more.open = true;
  }
  function updateUrl() {
    if (!window.history?.replaceState) return;
    const url = new URL(window.location.href);
    for (const key of ['topic','topics','match','view']) url.searchParams.delete(key);
    if (!isDefaultTopicSelection()) url.searchParams.set('topics', selectedTopics.size ? [...selectedTopics].join(',') : 'none');
    if (tagMatch === 'all') url.searchParams.set('match','all');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  }
  function setFilter(value) { filter = value; styleButtons(typeButtons, 'filter', filter); update(); }
  function setTopic(value) {
    explicitTopicFilter = true;
    if (value === 'history' && !selectedTopics.has('history') && isDefaultTopicSelection()) {
      selectedTopics.clear(); selectedTopics.add('history');
    } else if (selectedTopics.has(value)) selectedTopics.delete(value);
    else selectedTopics.add(value);
    styleTopics(); updateUrl(); update();
  }
  function clearTopics() {
    explicitTopicFilter = true;
    selectedTopics.clear(); styleTopics(); updateUrl(); update();
  }
  function reset() {
    query = ''; keyword = ''; explicitTopicFilter = false;
    yearFilter = 'all'; refs = new Set();
    input.value = ''; yearSelect.value = 'all'; updateTitleSuggestions('');
    filter = 'all'; tagMatch = 'any'; selectedTopics.clear();
    defaultTopics.forEach(code => selectedTopics.add(code));
    matchSelect.value = tagMatch;
    styleButtons(typeButtons, 'filter', filter);
    styleTopics();
    if (window.history?.replaceState) window.history.replaceState({}, '', window.location.pathname);
    update();
    input.focus();
  }
  function update() {
    const matching = items.filter(item => {
      if (refs.size && !refs.has(item.id)) return false;
      if (keyword && !(item.keywords || []).includes(keyword)) return false;
      if (filter !== 'all' && item.type !== filter) return false;
      const tags = item.topics || [];
      if (!((refs.size || keyword) && !explicitTopicFilter)) {
        if (!selectedTopics.size) return false;
        if (!selectedTopics.has('history') && tags.includes('history')) return false;
        const selection = [...selectedTopics];
        if (tagMatch === 'all' && !selection.every(code => tags.includes(code))) return false;
        if (tagMatch === 'any' && !selection.some(code => tags.includes(code))) return false;
      }
      if (yearFilter !== 'all' && String(item.year) !== yearFilter) return false;
      return searchable(item.title).includes(query);
    });
    target.replaceChildren();
    resultCount.textContent = `${matching.length} ${matching.length === 1 ? 'record' : 'records'} shown`;
    if (context) {
      context.replaceChildren();
      if (refs.size || keyword) {
        const keywordName = keyword ? keyword.replace(/-/g, ' ').replace(/\b\w/g, x => x.toUpperCase()) : '';
        context.append(makeEl('span', '', keyword ? `Research keyword: ${keywordName}` : `Selected references from the CV (${refs.size})`));
        const showAll = makeEl('button', 'context-clear', 'Clear research focus');
        showAll.type = 'button';
        showAll.addEventListener('click', reset);
        context.append(showAll);
        context.hidden = false;
      } else context.hidden = true;
    }
    if (!matching.length) {
      const empty = makeEl('div', 'empty-results');
      empty.append(makeEl('strong', '', 'No matching records'),
        makeEl('p', '', 'Try a different theme, keyword, type or year.'));
      const button = makeEl('button', 'clear-filters', 'Clear all filters');
      button.type = 'button';
      button.addEventListener('click', reset);
      empty.append(button); target.append(empty); return;
    }
    const byYear = new Map();
    matching.forEach(item => {
      if (!byYear.has(item.year)) byYear.set(item.year, []);
      byYear.get(item.year).push(item);
    });
    for (const [year, publications] of byYear) {
      const group = makeEl('section', 'bib-year-group');
      group.setAttribute('aria-label', `Publications from ${year}`);
      group.append(makeEl('div', 'bib-year-number', String(year || 'Other')));
      const list = makeEl('div', 'bib-year-items');
      publications.forEach(p => {
        const article = makeEl('article', 'bib-item');
        article.id = `pub-${p.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
        const content = makeEl('div', 'bib-item-content');
        const meta = makeEl('div', 'bib-item-meta');
        meta.append(makeEl('span', 'bib-category', TYPE_NAMES[p.type] || 'Research output'));
        if (p.status && p.status !== TYPE_NAMES[p.type] &&
          !(p.type === 'preprint' && p.status === 'Preprint / working paper')) {
          meta.append(makeEl('span', 'bib-status', p.status));
        }
        content.append(meta);
        const doi = String(p.doi || '').trim();
        const doiUrl = doi.startsWith('10.') && doi.includes('/') ? 'https://doi.org/' + encodeURI(doi) : '';
        const scholarUrl = 'https://scholar.google.com/citations?user=BqEQTtQAAAAJ';
        const mainLink = doiUrl || scholarUrl;
        const heading = makeEl('h3');
        heading.append(makeLink(mainLink, p.title));
        content.append(heading);
        if (p.authors) content.append(makeEl('p', 'bib-authors', p.authors));
        if (p.venue) content.append(makeEl('p', 'bib-venue', p.venue));
        const identifiers = makeEl('div', 'bib-identifiers');
        if (doiUrl) {
          const doiLink = makeLink(doiUrl, 'DOI: ' + doi, 'bib-identifier-link');
          doiLink.setAttribute('aria-label', 'Open DOI ' + doi);
          identifiers.append(doiLink);
        } else {
          const scholar = makeLink(scholarUrl, 'Google Scholar profile', 'bib-identifier-link');
          scholar.setAttribute('aria-label', 'Open Alberto Arturo Vergani Google Scholar profile');
          identifiers.append(scholar);
        }
        if (p.url && (p.url.startsWith('https://') || p.url.startsWith('http://')) &&
            p.url !== doiUrl && p.url !== scholarUrl) {
          identifiers.append(makeLink(p.url, 'Original source', 'bib-identifier-link bib-source-link'));
        }
        content.append(identifiers);
        const topicLine = makeEl('div', 'bib-topic-tags');
        (p.topics || []).forEach(code => {
          const tag = makeEl('button', 'bib-topic-tag', TOPIC_NAMES[code] || code);
          tag.type = 'button';
          tag.title = 'Filter by ' + (TOPIC_NAMES[code] || code);
          tag.addEventListener('click', () => setTopic(code));
          topicLine.append(tag);
        });
        if (topicLine.childNodes.length) content.append(topicLine);
        const abstract = typeof p.abstract === 'string' ? p.abstract.trim() : '';
        if (abstract) {
          const details = makeEl('details', 'bib-abstract');
          const summary = makeEl('summary', '', 'Abstract');
          summary.setAttribute('aria-label', `Abstract for ${p.title}`);
          const body = makeEl('div', 'bib-abstract-body');
          abstract.split(/\r?\n\s*\r?\n/).forEach(paragraph => {
            if (paragraph.trim()) body.append(makeEl('p', '', paragraph.trim()));
          });
          const attribution = makeEl('div', 'bib-abstract-attribution');
          const sourceUrl = safeExternalUrl(p.abstract_source);
          if (sourceUrl) {
            const sourceLink = makeLink(sourceUrl, 'Original abstract');
            sourceLink.setAttribute('aria-label', `Read the original abstract for ${p.title}`);
            attribution.append(sourceLink);
          }
          const license = String(p.abstract_license || '').trim();
          if (license) {
            const licenseUrl = safeExternalUrl(p.abstract_license_url);
            const licenseNode = licenseUrl ? makeLink(licenseUrl, license) : makeEl('span', '', license);
            if (licenseUrl) licenseNode.setAttribute('aria-label', `${license} license for the abstract of ${p.title}`);
            attribution.append(licenseNode);
          }
          if (attribution.childNodes.length) body.append(attribution);
          details.append(summary, body);
          content.append(details);
        }
        const actions = makeEl('div', 'bib-item-actions');
        if (p.bibtex) {
          const copyButton = makeEl('button', 'bib-copy-button', 'Copy BibTeX');
          copyButton.type = 'button';
          copyButton.setAttribute('aria-label', `Copy BibTeX for ${p.title}`);
          copyButton.setAttribute('aria-live', 'polite');
          copyButton.addEventListener('click', () => copyBibtex(p.bibtex, copyButton));
          actions.append(copyButton);
        }
        const repositories = (Array.isArray(p.repositories) ? p.repositories : []).map(repository => ({
          url: safeExternalUrl(repository?.url),
          label: String(repository?.label || '').trim()
        })).filter(repository => repository.url.startsWith('https://github.com/'));
        repositories.forEach((repository, index) => {
          const label = repository.label || (repositories.length === 1 ? 'GitHub' : `GitHub ${index + 1}`);
          const link = makeLink(repository.url, label, 'bib-repository-link');
          link.setAttribute('aria-label', `Open ${repository.label || 'GitHub repository'} for ${p.title}`);
          actions.append(link);
        });
        if (actions.childNodes.length) content.append(actions);
        article.append(content);
        const external = makeLink(mainLink, '↗', 'bib-external');
        external.setAttribute('aria-label', doiUrl ? `Open DOI for ${p.title}` : `Open Google Scholar profile for ${p.title}`);
        article.append(external);
        list.append(article);
      });
      group.append(list); target.append(group);
    }
  }
  typeButtons.forEach(button => button.addEventListener('click', () => setFilter(button.dataset.filter)));
  topicButtons.forEach(button => button.addEventListener('click', () => setTopic(button.dataset.topic)));
  document.getElementById('topic-clear-selection')?.addEventListener('click', clearTopics);
  matchSelect.addEventListener('change', () => {
    tagMatch = matchSelect.value === 'all' ? 'all' : 'any';
    updateUrl(); update();
  });
  input.addEventListener('input', () => { query = searchable(input.value.trim()); updateTitleSuggestions(input.value); update(); });
  yearSelect.addEventListener('change', () => { yearFilter = yearSelect.value; update(); });
  styleButtons(typeButtons, 'filter', filter);
  styleTopics();
  update();
  if (window.location.hash.startsWith('#pub-')) {
    requestAnimationFrame(() => document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView());
  }
}

async function initializePublications() {
  if (!document.getElementById('featured-publications') && !document.getElementById('publication-list')) return;
  try {
    const response = await fetch('data/publications.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.items)) throw new Error('Invalid publication data');
    renderFeatured(data.items);
    renderBibliography(data.items);
  } catch (error) {
    console.error('Bibliography could not be loaded:', error);
    const message = 'Bibliography currently unavailable. Please download the BibTeX file or try again later.';
    for (const id of ['publication-list', 'featured-publications']) {
      const node = document.getElementById(id);
      if (node) node.replaceChildren(makeEl('p', 'loading-message', message));
    }
    const resultCount = document.getElementById('publication-result-count');
    if (resultCount) resultCount.textContent = 'Unable to load records';
  }
}



document.getElementById('current-year')?.replaceChildren(String(new Date().getFullYear()));
initializeNavigation();
initializePublications();
