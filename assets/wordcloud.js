/* Interactive research word cloud. The matching records and frequencies are generated
   from the maintained bibliography: no external service or runtime dependency. */
'use strict';

(() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const holder = document.getElementById('brain-cloud');
  if (!holder) return;

  const wordsGroup = document.getElementById('brain-cloud-words');
  const smallScreen = document.getElementById('brain-cloud-mobile');
  const extras = document.getElementById('brain-cloud-extras');
  const loading = document.getElementById('brain-cloud-loading');
  if (!wordsGroup || !smallScreen) return;

  const escapeForUrl = id => 'publications.html?keyword=' + encodeURIComponent(id);
  const makeSvg = tag => document.createElementNS(SVG_NS, tag);

  // Stable pseudo-random positions create a free-form word cloud, without
  // any enclosing silhouette. Collision checks keep the links legible.
  function hashWord(word) {
    let hash = 2166136261;
    for (let i = 0; i < word.length; i++) {
      hash = Math.imul(hash ^ word.charCodeAt(i), 16777619);
    }
    return hash >>> 0;
  }
  function randomSequence(seed) {
    let state = seed >>> 0;
    return () => {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }
  function fits(x, y, width, height, occupied) {
    const box = {
      left: x - width / 2 - 6,
      right: x + width / 2 + 6,
      top: y - height / 2 - 4,
      bottom: y + height / 2 + 4
    };
    if (box.left < 24 || box.right > 1076 ||
        box.top < 20 || box.bottom > 650) return null;
    if (occupied.some(other => box.left < other.right &&
        box.right > other.left && box.top < other.bottom &&
        box.bottom > other.top)) return null;
    return box;
  }

  function render(items) {
    wordsGroup.replaceChildren();
    smallScreen.replaceChildren();
    if (extras) extras.replaceChildren();
    const occupied = [];
    const max = Math.max(1, ...items.map(item => Number(item.count) || 0));
    const sorted = [...items].filter(item => item.count > 0)
      .sort((a,b) => b.count - a.count || a.label.localeCompare(b.label));
    const colors = ['#133b51', '#185872', '#226982', '#277b91', '#397e9c'];

    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i];
      const font = 17 + 24 * Math.pow(Math.log1p(item.count) / Math.log1p(max), .92);
      const mobileLink = document.createElement('a');
      mobileLink.className = 'brain-cloud-chip';
      mobileLink.href = escapeForUrl(item.id);
      mobileLink.title = item.count + ' matching research records';
      const mobileLabel = document.createElement('span');
      mobileLabel.textContent = item.label;
      const mobileCount = document.createElement('small');
      mobileCount.textContent = String(item.count);
      mobileLink.append(mobileLabel, mobileCount);
      smallScreen.append(mobileLink);

      let placed = false;
      for (const scale of [1, .95, .9, .85, .8, .75, .7, .65]) {
        const size = Math.max(16, font * scale);
        const text = makeSvg('text');
        text.textContent = item.label;
        text.setAttribute('font-size', size.toFixed(1));
        text.setAttribute('font-weight', item.count >= 8 ? '760' : '680');
        text.setAttribute('font-family', 'system-ui, -apple-system, Segoe UI, sans-serif');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        wordsGroup.append(text);
        const measured = typeof text.getComputedTextLength === 'function'
          ? text.getComputedTextLength() : 0;
        const width = Math.max(measured * 1.03, item.label.length * size * .6);
        const height = size * 1.16;

        let position = null;
        const random = randomSequence((hashWord(item.id) + i * 31) >>> 0);
        for (let trial = 0; trial < 4200; trial++) {
          const x = 60 + random() * 980;
          const y = 52 + random() * 566;
          const box = fits(x, y, width, height, occupied);
          if (box) {
            position = {x, y, box};
            break;
          }
        }
        if (position) {
          text.setAttribute('x', position.x.toFixed(2));
          text.setAttribute('y', position.y.toFixed(2));
          text.setAttribute('fill', colors[Math.min(4, Math.floor(i / 6))]);
          const anchor = makeSvg('a');
          anchor.setAttribute('href', escapeForUrl(item.id));
          anchor.setAttribute('class', 'brain-cloud-word');
          anchor.setAttribute('aria-label',
            item.label + ': show ' + item.count + ' matching research records');
          const tooltip = makeSvg('title');
          tooltip.textContent = item.label + ' · ' + item.count + ' records';
          anchor.append(tooltip);
          text.replaceWith(anchor);
          anchor.append(text);
          occupied.push(position.box);
          placed = true;
          break;
        }
        text.remove();
      }
      // Never silently lose an entry if space is unusually constrained by fonts.
      if (!placed && extras) {
        const link = document.createElement('a');
        link.className = 'brain-cloud-chip';
        link.href = escapeForUrl(item.id);
        link.textContent = item.label + ' (' + item.count + ')';
        extras.append(link);
      }
    }
    if (loading) loading.hidden = true;
  }

  async function initialize() {
    try {
      const response = await fetch('data/wordcloud.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error('Cloud data unavailable: ' + response.status);
      const data = await response.json();
      if (!Array.isArray(data.items) || !data.items.length) throw new Error('Missing research tags');
      render(data.items);
    } catch (error) {
      console.error('Research cloud could not be built:', error);
      if (loading) loading.textContent = 'Research map is temporarily unavailable. Explore the publication archive below.';
    }
  }
  initialize();
})();
