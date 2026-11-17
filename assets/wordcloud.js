/* Interactive research cloud. The matching records and frequencies are generated
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

  // A conservative inner region keeps every text label within the brain shape.
  const insideBrain = (x, y) => {
    const dx = (x - 550) / 417;
    const dy = (y - 337) / 234;
    return dx * dx + dy * dy <= 0.97;
  };
  function fits(x, y, w, h, occupied) {
    const a = {left: x - w / 2 - 4, right: x + w / 2 + 4,
      top: y - h / 2 - 2, bottom: y + h / 2 + 2};
    for (const corner of [[a.left,a.top],[a.right,a.top],[a.left,a.bottom],[a.right,a.bottom]]) {
      if (!insideBrain(corner[0],corner[1])) return false;
    }
    for (const box of occupied) {
      if (a.left < box.right && a.right > box.left && a.top < box.bottom && a.bottom > box.top) {
        return false;
      }
    }
    return a;
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
      const font = 13 + 18 * Math.pow(Math.log1p(item.count) / Math.log1p(max), .92);
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
      for (const scale of [1, .94, .88, .82, .76, .70, .64, .60]) {
        const size = Math.max(13, font * scale);
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
        const width = Math.max(measured, item.label.length * size * .54);
        const height = size * 1.15;

        let position = null;
        for (let trial = 0; trial < 8000; trial++) {
          const angle = (trial * 2.3999632) + (i * .217);
          const radius = Math.sqrt((trial + .5) / 8000);
          const x = 550 + Math.cos(angle) * radius * 406;
          const y = 337 + Math.sin(angle) * radius * 224;
          const box = fits(x,y,width,height,occupied);
          if (box) {
            position = {x,y,box};
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
