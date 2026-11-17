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
    p.status === 'Journal article' && p.url && p.title.length > 45).slice(0, 3);
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

function renderBibliography(items) {
  const target = document.getElementById('publication-list');
  if (!target) return;
  const typeButtons = [...document.querySelectorAll('[data-filter]')];
  const input = document.getElementById('publication-search');
  const yearSelect = document.getElementById('publication-year');
  const resultCount = document.getElementById('publication-result-count');
  const total = document.getElementById('total-publications');
  let filter = 'all';
  let yearFilter = 'all';
  let query = '';
  if (total) total.textContent = String(items.length);

  const counts = { all: items.length, journal: 0, conference: 0, preprint: 0, thesis: 0 };
  for (const item of items) counts[item.type] = (counts[item.type] || 0) + 1;
  document.querySelectorAll('[data-count]').forEach(n => { n.textContent = counts[n.dataset.count] || 0; });
  const years = [...new Set(items.map(p => p.year).filter(Boolean))].sort((a,b) => b-a);
  for (const year of years) {
    const option = new Option(String(year), String(year));
    yearSelect.add(option);
  }

  function setFilter(value) {
    filter = value;
    typeButtons.forEach(button => {
      const active = button.dataset.filter === value;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    update();
  }
  function reset() {
    query = '';
    yearFilter = 'all';
    input.value = '';
    yearSelect.value = 'all';
    setFilter('all');
    input.focus();
  }
  function update() {
    const matching = items.filter(item => {
      if (filter !== 'all' && item.type !== filter) return false;
      if (yearFilter !== 'all' && String(item.year) !== yearFilter) return false;
      return searchable([item.title, item.authors, item.venue, item.year, item.status].join(' ')).includes(query);
    });
    target.replaceChildren();
    resultCount.textContent = `${matching.length} ${matching.length === 1 ? 'record' : 'records'} shown`;
    if (!matching.length) {
      const empty = makeEl('div', 'empty-results');
      empty.append(makeEl('strong', '', 'No matching records'), makeEl('p', '', 'Try a different keyword, type, or year.'));
      const button = makeEl('button', 'clear-filters', 'Clear filters');
      button.type = 'button';
      button.addEventListener('click', reset);
      empty.append(button);
      target.append(empty);
      return;
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
        const content = makeEl('div', 'bib-item-content');
        const meta = makeEl('div', 'bib-item-meta');
        meta.append(makeEl('span', 'bib-category', TYPE_NAMES[p.type] || 'Research output'));
        if (p.status && p.status !== TYPE_NAMES[p.type] && !(p.type === 'preprint' && p.status === 'Preprint / working paper')) {
          meta.append(makeEl('span', 'bib-status', p.status));
        }
        content.append(meta);
        const heading = makeEl('h3');
        if (p.url) heading.append(makeLink(p.url, p.title));
        else heading.textContent = p.title;
        content.append(heading);
        if (p.authors) content.append(makeEl('p', 'bib-authors', p.authors));
        if (p.venue) content.append(makeEl('p', 'bib-venue', p.venue));
        article.append(content);
        if (p.url) {
          const external = makeLink(p.url, '↗', 'bib-external');
          external.setAttribute('aria-label', `Open source for ${p.title}`);
          article.append(external);
        }
        list.append(article);
      });
      group.append(list);
      target.append(group);
    }
  }
  typeButtons.forEach(button => button.addEventListener('click', () => setFilter(button.dataset.filter)));
  input.addEventListener('input', () => { query = searchable(input.value.trim()); update(); });
  yearSelect.addEventListener('change', () => { yearFilter = yearSelect.value; update(); });
  update();
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

document.getElementById('current-year').textContent = new Date().getFullYear();
initializeNavigation();
initializePublications();
