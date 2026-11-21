/* Curated academic news: one visible item at a time, newest first, beginning 23 December 2025. */
(() => {
  'use strict';
  const target = document.getElementById('latest-news-items');
  if (!target) return;
  const carousel = document.getElementById('latest-news-carousel');
  const controls = document.getElementById('latest-news-controls');
  const previous = document.getElementById('latest-news-prev');
  const next = document.getElementById('latest-news-next');
  const position = document.getElementById('latest-news-position');
  const dots = document.getElementById('latest-news-dots');
  const MIN_DATE = '2025-12-23';
  const CATEGORY = Object.freeze({ video: 'Talk · Video', event: 'Outreach · Event', publication: 'Publication', membership: 'Professional · Membership' });

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
    } catch { return ''; }
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
    if (item.date < MIN_DATE || item.date > new Date().toISOString().slice(0, 10)) return null;
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

  function cardFor(item, index, count) {
    const videoID = /^[a-zA-Z0-9_-]{11}$/.test(item.youtube_id || '') ? item.youtube_id : '';
    const videoURL = safeURL(item.youtube_url || (item.kind === 'video' ? item.url : ''));
    const videoHost = videoURL ? new URL(videoURL).hostname.replace(/^www\./, '') : '';
    const hasYouTube = !!videoID && (videoHost === 'youtube.com' || videoHost === 'youtu.be');
    const institutionalImage = safeURL(item.image_url);
    const hasMedia = hasYouTube || item.kind === 'video' || !!institutionalImage;
    const card = make('article', 'news-card' + (hasMedia ? ' news-card--video' : ' news-card--text') + (index === 0 ? ' news-card--latest' : '') + (item.image_variant === 'poster' ? ' news-card--poster' : ''));
    card.setAttribute('aria-roledescription', 'slide');
    card.setAttribute('aria-label', 'News ' + (index + 1) + ' of ' + count);

    if (hasYouTube) {
      const preview = linkTo(videoURL, '', 'news-thumbnail');
      preview.setAttribute('aria-label', 'Watch ' + item.title + ' on YouTube (opens in a new tab)');
      const img = make('img');
      img.src = 'https://i.ytimg.com/vi/' + videoID + '/hqdefault.jpg';
      img.alt = 'YouTube video thumbnail: ' + item.title;
      img.loading = index === 0 ? 'eager' : 'lazy';
      img.decoding = 'async';
      img.width = 480;
      img.height = 360;
      const play = make('span', 'news-play', '▶');
      play.setAttribute('aria-hidden', 'true');
      preview.append(img, play);
      card.append(preview);
    } else if (item.kind === 'video') {
      // Linked editorial poster, used only when a verified YouTube ID is unavailable.
      const preview = linkTo(item.url, '', 'news-thumbnail news-thumbnail--editorial');
      preview.setAttribute('aria-label', 'Watch ' + item.title + ' (opens in a new tab)');
      preview.append(
        make('span', 'news-poster-kicker', 'Video · Interview'),
        make('strong', 'news-poster-heading', 'Beyond the talk'),
        make('span', 'news-poster-detail', 'Martina Rizza & Alberto Vergani'),
        make('span', 'news-poster-play', '▶ Watch interview')
      );
      card.append(preview);
    } else if (institutionalImage && item.image_variant === 'poster') {
      // Full official ERN poster from the event organizer's corrected PDF.
      const pdfURL = safeURL(item.poster_pdf);
      const preview = linkTo(pdfURL || item.url, '', 'news-thumbnail news-thumbnail--poster');
      preview.setAttribute('aria-label', 'View official ERN poster as PDF (opens in a new tab)');
      const img = make('img', 'news-poster-image');
      img.src = institutionalImage;
      img.alt = item.image_alt || 'Official event poster: ' + item.title;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.width = 720;
      img.height = 1018;
      img.addEventListener('error', () => {
        img.replaceWith(make('strong', 'news-brand-fallback', 'ERN 2026'));
      });
      preview.append(img);
      card.append(preview);
    } else if (institutionalImage) {
      // The source image is published by IHME's official GBD Collaborator Portal.
      // A legible text fallback is provided in case the external logo does not load.
      const preview = linkTo(item.url, '', 'news-thumbnail news-thumbnail--institutional');
      preview.setAttribute('aria-label', 'Learn about the Global Burden of Disease Collaborator Network (opens in a new tab)');
      const img = make('img', 'news-institutional-logo');
      img.src = institutionalImage;
      img.alt = item.image_alt || 'Institute for Health Metrics and Evaluation';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', () => {
        img.replaceWith(make('strong', 'news-brand-fallback', 'IHME'));
      });
      preview.append(img, make('span', 'news-institutional-caption', 'Global Burden of Disease · Collaborator Network'));
      card.append(preview);
    }

    const body = make('div', 'news-card-body');
    if (index === 0) body.append(make('span', 'news-featured-label', 'Latest update'));
    const meta = make('div', 'news-meta');
    meta.append(make('span', 'news-category', CATEGORY[item.kind]), make('time', 'news-date', displayDate(item.date)));
    meta.querySelector('time').dateTime = item.date;
    const title = make('h3', 'news-title');
    title.append(linkTo(item.url, item.title));
    body.append(meta, title);
    if (item.description) body.append(make('p', 'news-summary', item.description));
    const footer = make('div', 'news-footer');
    footer.append(make('span', 'news-source', item.source || ''));
    const actions = make('div', 'news-actions');
    const allLinks = [{ url: item.url, label: item.action || 'Read more' }]
      .concat(Array.isArray(item.links) ? item.links : []);
    for (const entry of allLinks) {
      const url = safeURL(entry.url);
      if (url) actions.append(linkTo(url, (entry.label || 'Open link') + ' ↗', 'news-action'));
    }
    footer.append(actions);
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
        .sort((a, b) => b.date.localeCompare(a.date));
      if (!entries.length) throw new Error('No verified news items');

      let active = 0;
      const show = nextIndex => {
        active = Math.max(0, Math.min(nextIndex, entries.length - 1));
        target.replaceChildren(cardFor(entries[active], active, entries.length));
        if (position) position.textContent = (active + 1) + ' / ' + entries.length;
        if (controls) controls.hidden = entries.length < 2;
        if (previous) previous.disabled = active === 0;
        if (next) next.disabled = active === entries.length - 1;
        if (dots) {
          dots.hidden = entries.length < 2;
          Array.from(dots.children).forEach((dot, i) => {
            dot.setAttribute('aria-pressed', String(i === active));
            dot.classList.toggle('is-active', i === active);
          });
        }
      };

      if (dots) {
        dots.replaceChildren(...entries.map((entry, i) => {
          const dot = make('button', 'news-dot');
          dot.type = 'button';
          dot.setAttribute('aria-label', 'Show item ' + (i + 1) + ': ' + entry.title);
          dot.addEventListener('click', () => show(i));
          return dot;
        }));
      }
      previous?.addEventListener('click', () => show(active - 1));
      next?.addEventListener('click', () => show(active + 1));
      carousel?.addEventListener('keydown', event => {
        if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('a, button, input, textarea, select')) return;
        if (event.key === 'ArrowLeft') { event.preventDefault(); show(active - 1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); show(active + 1); }
      });
      // Touch gesture is optional: vertical scrolling remains unaffected on mobile.
      let touchStart = null;
      target.addEventListener('touchstart', event => {
        const touch = event.touches[0];
        if (touch) touchStart = { x: touch.clientX, y: touch.clientY };
      }, { passive: true });
      target.addEventListener('touchend', event => {
        if (!touchStart) return;
        const touch = event.changedTouches[0];
        const dx = touch ? touch.clientX - touchStart.x : 0;
        const dy = touch ? touch.clientY - touchStart.y : 0;
        touchStart = null;
        if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
          show(active + (dx < 0 ? 1 : -1));
        }
      }, { passive: true });

      show(0);
    } catch (error) {
      console.error('Latest news could not be loaded:', error);
      // The newest TEDx item remains available as a static fallback.
      target.querySelector('.loading-message')?.remove();
    }
  }
  loadLatestNews();
})();
