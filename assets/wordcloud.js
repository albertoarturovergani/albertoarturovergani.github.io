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


  // Motion is driven by curated semantic families and related-word lists.
  // Words stay linked to their corresponding publication subsets.
  function attachSemanticMotion(nodes) {
    const byId = new Map(nodes.map(node => [node.id, node]));
    const svg = wordsGroup.ownerSVGElement;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let active = null;
    let frameId = null;

    function focus(id) {
      if (id === active) return;
      active = id;
      if (frameId !== null) cancelAnimationFrame(frameId);
      const pivot = byId.get(id);
      const chosen = new Map();
      const boxes = [];
      function reserve(node, x, y) {
        const b = {l:x-node.width/2-8,r:x+node.width/2+8,
                   t:y-node.height/2-7,b:y+node.height/2+7};
        if (b.l < 14 || b.r > 1086 || b.t < 14 || b.b > 656) return false;
        if (boxes.some(a => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b))
          return false;
        boxes.push(b);
        return true;
      }
      if (pivot) {
        // Keep the hovered word stationary so it remains easy to click.
        reserve(pivot, pivot.x, pivot.y);
        chosen.set(pivot.id, {x:pivot.x,y:pivot.y});
        const related = [...new Set([
          ...(pivot.related || []),
          ...nodes.filter(n => n.family === pivot.family && n.id !== pivot.id).map(n => n.id)
        ])].filter(key => key !== pivot.id && byId.has(key)).slice(0, 9);
        related.forEach((key, i) => {
          const node = byId.get(key);
          for (let t = 0; t < 540; t++) {
            const angle = i * 2.399963 + t * .31;
            const radius = 155 + 9*Math.sqrt(t) + 20*(i % 3);
            const x = pivot.x + Math.cos(angle)*radius;
            const y = pivot.y + Math.sin(angle)*Math.min(radius, 265);
            if (reserve(node, x, y)) {chosen.set(key,{x,y});break;}
          }
        });
      }
      const states = nodes.map(node => ({
        node, sx:node.dx||0, sy:node.dy||0, so:node.opacity??1,
        x:(chosen.get(node.id)?.x ?? node.x)-node.x,
        y:(chosen.get(node.id)?.y ?? node.y)-node.y,
        opacity:pivot ? (chosen.has(node.id)?1:.10) : 1
      }));
      const start = performance.now(), duration = reduced ? 0 : 620;
      function animate(time) {
        const t=duration?Math.min(1,(time-start)/duration):1;
        const e=1-(1-t)**3;
        for(const st of states) {
          const n=st.node;
          n.dx=reduced?0:st.sx+(st.x-st.sx)*e;
          n.dy=reduced?0:st.sy+(st.y-st.sy)*e;
          n.opacity=st.so+(st.opacity-st.so)*e;
          n.anchor.setAttribute('transform','translate('+n.dx.toFixed(2)+' '+n.dy.toFixed(2)+')');
          n.anchor.style.opacity=String(n.opacity);
          n.anchor.classList.toggle('is-semantic-neighbor',!!pivot&&chosen.has(n.id));
        }
        frameId=t<1?requestAnimationFrame(animate):null;
      }
      if(reduced)animate(start);
      else frameId=requestAnimationFrame(animate);
    }
    nodes.forEach(n=>{
      n.anchor.addEventListener('pointerenter',()=>focus(n.id));
      n.anchor.addEventListener('focus',()=>focus(n.id));
    });
    svg?.addEventListener('pointerleave',()=>focus(null));
    svg?.addEventListener('focusout',event=>{
      if(!svg.contains(event.relatedTarget))focus(null);
    });
  }

  function render(items) {
    wordsGroup.replaceChildren();
    smallScreen.replaceChildren();
    if (extras) extras.replaceChildren();
    const occupied = [];
    const motionNodes = [];
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
          motionNodes.push({id:item.id, family:item.family||'general',
            related:Array.isArray(item.related)?item.related:[],
            x:position.x,y:position.y,width,height,anchor,dx:0,dy:0,opacity:1});
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
    attachSemanticMotion(motionNodes);
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
