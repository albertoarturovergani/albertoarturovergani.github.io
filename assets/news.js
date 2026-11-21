/* Curated academic news feed: dates are explicit; video thumbnails use YouTube IDs. */
(() => {
  'use strict';
  const target = document.getElementById('latest-news-items');
  if (!target) return;

  const CATEGORY = Object.freeze({ video: 'Talk · Video', event: 'Outreach · Event', publication: 'Publication' });
  const make = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = String(text);
    return el;
  };
  const safeURL = value => {
    try {
      const url = new URL(String(value || ''));
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
    } catch {
      return '';
    }
  };
  const linkTo = (url, label, className) => {
    const a = make('a', className, label);
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    return a;
  };
  const displayDate = iso => new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
  }).format(new Date(iso + 'T12:00:00Z'));

  function resolveEntry(item, publications) {
    if (!item || !/^\d{4}-\d{2}-\d{2}$/.test(item.date || '') || !CATEGORY[item.kind]) return null;
    const date = new Date(item.date + 'T12:00:00Z');
    if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== item.date) return null;
    if (item.date > new Date().toISOString().slice(0, 10)) return null;
    if (item.kind === 'publication') {
      const publication = publications.get(item.publication_id);
      if (!publication || publication.type !== 'journal' || publication.status !== 'Journal article') return null;
      const doi = String(publication.doi || '').trim();
      const url = /^10\.\d{4,9}\/\S+$/.test(doi) ? 'https://doi.org/' + doi : safeURL(publication.url);
      if (!url || !publication.title) return null;
      return { ...item, title: publication.title, url, source: publication.venue || 'Journal article' };
    }
    const url = safeURL(item.url);
    return url && item.title ? { ...item, url } : null;
  }

  function cardFor(item) {
    const card = make('article', 'news-card' + (item.kind === 'video' ? ' news-card--video' : ''));
    if (item.kind === 'video' && /^[a-zA-Z0-9_-]{11}$/.test(item.youtube_id || '') &&
        new URL(item.url).hostname.replace(/^www\./, '') === 'youtube.com') {
      const preview = linkTo(item.url, '', 'news-thumbnail');
      preview.setAttribute('aria-label', 'Watch ' + item.title + ' on YouTube (opens in a new tab)');
      const img = make('img');
      img.src = 'https://i.ytimg.com/vi/' + item.youtube_id + '/hqdefault.jpg';
      img.alt = 'Video thumbnail: ' + item.title;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.width = 480;
      img.height = 360;
      preview.append(img, make('span', 'news-play', '▶'));
      preview.querySelector('.news-play').setAttribute('aria-hidden', 'true');
      card.append(preview);
    } else if (item.kind === 'video') {
      // A source-linked poster, never a fabricated YouTube thumbnail.
      // Replace with the real platform image when a direct video ID is verified.
      const preview = linkTo(item.url, '', 'news-thumbnail news-thumbnail--editorial');
      preview.setAttribute('aria-label', 'Open the post-talk video interview (opens in a new tab)');
      preview.append(
        make('span', 'news-poster-kicker', 'TEDxPavia · Interview'),
        make('strong', 'news-poster-heading', 'Beyond the talk'),
        make('span', 'news-poster-detail', 'Martina Rizza & Alberto Vergani'),
        make('span', 'news-poster-play', '▶ Watch interview')
      );
      card.append(preview);
    }
    const body = make('div', 'news-card-body');
    const meta = make('div', 'news-meta');
    meta.append(make('span', 'news-category', CATEGORY[item.kind]), make('time', 'news-date', displayDate(item.date)));
    meta.querySelector('time').dateTime = item.date;
    const title = make('h3', 'news-title');
    title.append(linkTo(item.url, item.title));
    body.append(meta, title);
    if (item.description) body.append(make('p', 'news-summary', item.description));
    const footer = make('div', 'news-footer');
    footer.append(make('span', 'news-source', item.source || ''), linkTo(item.url, (item.action || 'Read more') + ' ↗', 'news-action'));
    body.append(footer);
    card.append(body);
    return card;
  }

  async function loadLatestNews() {
    try {
      const [newsResult, pubsResult] = await Promise.allSettled([
        fetch('data/news.json', { cache: 'no-cache' }).then(response => {
          if (!response.ok) throw new Error('News feed HTTP ' + response.status);
          return response.json();
        }),
        fetch('data/publications.json', { cache: 'no-cache' }).then(response => {
          if (!response.ok) throw new Error('Bibliography HTTP ' + response.status);
          return response.json();
        })
      ]);
      if (newsResult.status !== 'fulfilled' || !Array.isArray(newsResult.value.items)) throw new Error('News data unavailable');
      const publications = pubsResult.status === 'fulfilled' && Array.isArray(pubsResult.value.items)
        ? new Map(pubsResult.value.items.map(p => [p.id, p])) : new Map();
      const entries = newsResult.value.items.map(item => resolveEntry(item, publications))
        .filter(Boolean)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 4);
      if (!entries.length) throw new Error('No verified recent items');
      target.replaceChildren(...entries.map(cardFor));
    } catch (error) {
      console.error('Latest news could not be loaded:', error);
      // Keep server-rendered TEDx and interview links visible when loading fails.
      target.querySelector('.loading-message')?.remove();
    }
  }
  loadLatestNews();
})();
