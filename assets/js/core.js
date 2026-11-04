/* Transformer Lab — core: state, routing, helpers, search. No build step; works from file:// */
(function () {
  const TL = (window.TL = window.TL || {});
  TL.views = {};
  TL.widgets = TL.widgets || {};

  /* ---------------- helpers ---------------- */
  TL.$ = (sel, root = document) => root.querySelector(sel);
  TL.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  TL.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  TL.fmtMin = (m) => {
    if (m < 60) return `${Math.round(m)} min`;
    const h = Math.floor(m / 60), r = Math.round(m % 60);
    return r ? `${h} h ${r} min` : `${h} h`;
  };
  TL.svgEl = (tag, attrs = {}, parent) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  };
  TL.katex = (tex, display = false) => {
    try { return window.katex ? katex.renderToString(tex, { displayMode: display, throwOnError: false }) : TL.esc(tex); }
    catch (e) { return TL.esc(tex); }
  };

  /* ---------------- persistent state ---------------- */
  const KEY = 'transformer-lab-v1';
  const defaults = {
    done: {}, bookmarks: {}, notes: {}, theme: null, dashboard: 'road', planHours: 3,
    planDone: {}, ivStatus: {}, cards: {}, depth: {}, visited: {},
  };
  function load() {
    try { return Object.assign({}, defaults, JSON.parse(localStorage.getItem(KEY) || '{}')); }
    catch (e) { return Object.assign({}, defaults); }
  }
  TL.state = load();
  TL.save = () => { try { localStorage.setItem(KEY, JSON.stringify(TL.state)); } catch (e) { /* storage unavailable */ } };
  TL.resetProgress = () => {
    const theme = TL.state.theme;
    TL.state = Object.assign({}, defaults, { theme });
    TL.save();
  };

  /* ---------------- curriculum index ---------------- */
  TL.initData = function () {
    const C = window.TL_CONTENT || { lessons: [], interview: [], code: {}, codelab: [] };
    TL.lessons = C.lessons;
    TL.interview = C.interview;
    TL.code = C.code;
    TL.codelab = C.codelab || [];
    TL.lessonById = {};
    TL.lessons.forEach((l, i) => { l.idx = i; TL.lessonById[l.id] = l; });
    TL.domainById = {};
    TL.DOMAINS.forEach((d, i) => { d.idx = i; d.lessons = []; TL.domainById[d.id] = d; });
    TL.lessons.forEach((l) => { const d = TL.domainById[l.domain]; if (d) d.lessons.push(l); else console.warn('Unknown domain', l.domain, l.id); });
    // drop dangling prereqs, compute reverse edges
    TL.lessons.forEach((l) => {
      l.prereqs = l.prereqs.filter((p) => { if (!TL.lessonById[p]) { console.warn('Missing prereq', p, 'for', l.id); return false; } return true; });
      l.unlocks = [];
    });
    TL.lessons.forEach((l) => l.prereqs.forEach((p) => TL.lessonById[p].unlocks.push(l.id)));
    TL.DOMAINS.forEach((d) => {
      d.minutes = d.lessons.reduce((s, l) => s + (l.minutes || 0), 0);
      d.coreMinutes = d.lessons.filter((l) => l.track !== 'optional').reduce((s, l) => s + (l.minutes || 0), 0);
      const pre = new Set();
      d.lessons.forEach((l) => l.prereqs.forEach((p) => { const pd = TL.lessonById[p].domain; if (pd !== d.id) pre.add(pd); }));
      d.prereqDomains = TL.DOMAINS.filter((x) => pre.has(x.id)).map((x) => x.id);
    });
    TL.interviewById = {};
    TL.interview.forEach((q) => (TL.interviewById[q.id] = q));
    if (TL.buildOutline) TL.buildOutline();
  };

  TL.isDone = (id) => !!TL.state.done[id];
  TL.lessonStatus = (l) => {
    if (TL.isDone(l.id)) return 'done';
    if (l.prereqs.every((p) => TL.isDone(p))) return 'ready';
    return 'locked';
  };
  TL.currentLesson = () => TL.lessons.find((l) => l.track !== 'optional' && !TL.isDone(l.id) && TL.lessonStatus(l) === 'ready')
    || TL.lessons.find((l) => !TL.isDone(l.id));
  TL.domainProgress = (d) => {
    const core = d.lessons.filter((l) => l.track !== 'optional');
    const done = core.filter((l) => TL.isDone(l.id)).length;
    return { done, total: core.length, pct: core.length ? done / core.length : 0 };
  };
  TL.domainStatus = (d) => {
    if (d.id === 'interview') {
      const n = TL.interview.length, done = TL.interview.filter((q) => TL.state.ivStatus[q.id] === 'confident').length;
      if (n && done === n) return 'done';
      return TL.DOMAINS.filter((x) => x.id !== 'interview').every((x) => TL.domainStatus(x) === 'done') ? 'current' : (done ? 'current' : 'upcoming');
    }
    const p = TL.domainProgress(d);
    if (p.total && p.done === p.total) return 'done';
    const cur = TL.currentLesson();
    if (cur && cur.domain === d.id) return 'current';
    return p.done > 0 ? 'current' : 'upcoming';
  };
  TL.overall = () => {
    const core = TL.lessons.filter((l) => l.track !== 'optional');
    const done = core.filter((l) => TL.isDone(l.id));
    return {
      done: done.length, total: core.length, pct: core.length ? done.length / core.length : 0,
      minutesDone: done.reduce((s, l) => s + l.minutes, 0), minutes: core.reduce((s, l) => s + l.minutes, 0),
    };
  };
  TL.setDone = (id, v) => {
    if (v) TL.state.done[id] = Date.now(); else delete TL.state.done[id];
    TL.save(); TL.updateProgressPill();
  };

  /* ---------------- theme ---------------- */
  TL.applyTheme = () => {
    const t = TL.state.theme || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = t;
    const l = document.getElementById('hljs-theme');
    if (l) l.href = (TL.STATIC ? TL.BASE + 'assets/' : '') + (t === 'dark' ? 'vendor/hljs/github-dark.min.css' : 'vendor/hljs/github.min.css');
    const b = document.getElementById('theme-btn');
    if (b) { b.innerHTML = TL.icon(t === 'dark' ? 'sun' : 'moon', 18); b.title = t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'; }
  };

  /* ---------------- routing ---------------- */
  TL.STATIC = typeof window.TL_PAGE === 'string';
  TL.BASE = window.TL_BASE || '';
  TL.go = (hash) => {
    if (TL.STATIC) { if (hash.startsWith('#/')) location.href = TL.pathFor(hash); else location.hash = hash; return; }
    if (location.hash === hash) TL.route(); else location.hash = hash;
  };
  /* '#/lesson/x/3?a=b'  ->  relative file path of the static page */
  TL.pathFor = function (h) {
    const raw = h.replace(/^#\/?/, '');
    const [pth, q] = raw.split('?');
    const [name, ...args] = pth.split('/').filter(Boolean).map(decodeURIComponent);
    const query = {};
    (q || '').split('&').filter(Boolean).forEach((kv) => { const [k, v] = kv.split('='); query[k] = decodeURIComponent(v || ''); });
    let p;
    switch (name || '') {
      case '': case 'road': p = 'index.html'; break;
      case 'tree': p = 'tree.html'; break;
      case 'domain': p = args[0] === 'interview' ? 'interview/index.html' : `lessons/${args[0]}/index.html`; break;
      case 'lesson': { const l = TL.lessonById && TL.lessonById[args[0]]; p = l ? `lessons/${l.domain}/${l.id}.html` : 'index.html'; if (args[1]) query.l = args[1]; break; }
      case 'interview': p = args[0] ? `interview/${args[0]}.html` : 'interview/index.html'; break;
      case 'plan': p = args[0] ? `plan/day-${args[0]}.html` : 'plan/index.html'; break;
      case 'playground': p = args[0] ? `playground/${args[0]}.html` : 'playground/index.html'; break;
      case 'simulator': p = 'simulator/index.html'; break;
      case 'build': p = 'pages/minigpt.html'; break;
      default: p = `pages/${name}.html`;
    }
    const qs = Object.entries(query).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    return TL.BASE + p + (qs ? '#' + qs : '');
  };
  TL.rewriteLinks = (root) => {
    if (!TL.STATIC) return;
    TL.$$('a[href^="#/"]', root).forEach((a) => a.setAttribute('href', TL.pathFor(a.getAttribute('href'))));
  };
  TL.setQuery = (obj) => {
    const qs = Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    if (!history.replaceState) return;
    if (TL.STATIC) history.replaceState(null, '', location.pathname + (qs ? '#' + qs : ''));
    else { const r = TL.parseHash(); history.replaceState(null, '', `#/${[r.name, ...r.args].join('/')}${qs ? '?' + qs : ''}`); }
  };
  TL.parseHash = () => {
    if (TL.STATIC) {
      const parts = window.TL_PAGE.split('/').filter(Boolean);
      const query = {};
      (location.hash || '').replace(/^#/, '').split('&').filter((kv) => kv.includes('=')).forEach((kv) => { const [k, v] = kv.split('='); query[k] = decodeURIComponent(v || ''); });
      if (parts[0] === 'lesson' && query.l) parts[2] = query.l;
      return { name: parts[0] || '', args: parts.slice(1), query };
    }
    const h = (location.hash || '').replace(/^#\/?/, '');
    const [p, q] = h.split('?');
    const parts = p.split('/').filter(Boolean).map(decodeURIComponent);
    const query = {};
    (q || '').split('&').filter(Boolean).forEach((kv) => { const [k, v] = kv.split('='); query[k] = decodeURIComponent(v || ''); });
    return { name: parts[0] || '', args: parts.slice(1), query };
  };
  TL.cleanups = [];
  TL.onCleanup = (fn) => TL.cleanups.push(fn);

  TL.route = function () {
    TL.cleanups.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
    TL.cleanups = [];
    const r = TL.parseHash();
    let name = r.name;
    if (!name) name = TL.state.dashboard === 'tree' ? 'tree' : 'road';
    const view = TL.views[name] || TL.views.notfound;
    const main = document.getElementById('main');
    main.className = 'main view-' + name;
    main.innerHTML = '';
    let res;
    try { res = view(main, r.args, r.query) || {}; }
    catch (e) { console.error(e); main.innerHTML = `<div class="page"><h1>Something went wrong</h1><pre>${TL.esc(e.stack || e)}</pre></div>`; res = {}; }
    TL.renderCrumbs(res.crumbs || []);
    TL.$$('.topnav a').forEach((a) => a.classList.toggle('active', (a.dataset.nav || '').split(' ').includes(name)));
    document.title = (res.title ? res.title + ' · ' : '') + 'Transformer Lab';
    if (!res.keepScroll) window.scrollTo(0, 0);
    TL.enhance(main);
    TL.rewriteLinks(document);
    TL.closeMenus();
  };

  TL.renderCrumbs = function (crumbs) {
    const el = document.getElementById('crumbs');
    const dash = TL.state.dashboard === 'tree' ? '#/tree' : '#/road';
    const all = [{ label: 'Dashboard', href: dash }, ...crumbs];
    el.innerHTML = all.map((c, i) => i === all.length - 1 || !c.href
      ? `<span class="crumb current">${TL.esc(c.label)}</span>`
      : `<a class="crumb" href="${c.href}">${TL.esc(c.label)}</a>`).join('<span class="crumb-sep" aria-hidden="true">›</span>');
    el.style.display = crumbs.length ? '' : 'none';
  };

  /* post-render enhancements: copy buttons, katex for runtime $...$ marked spans */
  TL.enhance = function (root) {
    TL.$$('.copy-btn', root).forEach((b) => {
      if (b.dataset.bound) return; b.dataset.bound = 1;
      b.addEventListener('click', () => {
        const code = b.closest('.codeblock').querySelector('code').innerText;
        (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(
          () => { b.textContent = 'Copied'; setTimeout(() => (b.textContent = 'Copy'), 1200); },
          () => { b.textContent = 'Select & copy'; });
      });
    });
    TL.$$('[data-tex]', root).forEach((e) => { e.innerHTML = TL.katex(e.dataset.tex, e.dataset.display === '1'); });
    TL.addTerms(root);
    TL.rewriteLinks(root);
  };

  /* ---------------- glossary tooltips: first use of each term in every text block ---------------- */
  const STOP = new Set(['Q', 'K', 'V', 'log', 'exp', 'mean', 'value', 'values', 'key', 'keys', 'head', 'heads', 'block', 'blocks', 'score', 'scores', 'index', 'unit', 'units', 'forward', 'train', 'mask', 'masked', 'pad', 'pads', 'decode', 'clip', 'label', 'labels', 'target', 'targets', 'context', 'compute', 'sample', 'samples', 'beam', 'objective', 'router', 'expert', 'experts', 'kernel', 'kernels', 'judge', 'σ', 'TP', 'FP', 'FN', 'TN', 'DP', 'PP', 'project', 'projected', 'distribution', 'distributions', 'conditional', 'activation', 'activations', 'layer', 'layers', 'model', 'models', 'feature', 'features', 'weight', 'weights', 'embed', 'embedded', 'tied', 'tying', 'shard', 'paged', 'drift', 'explode', 'vanish', 'grounded', 'contextual', 'cosine', 'calibrate', 'imbalance', 'chunk', 'chunks', 'greedy', 'nucleus', 'causal', 'positions', 'instruction', 'instructions', 'trained', 'training', 'loss', 'losses', 'generative', 'algorithm', 'algorithms', 'supervised', 'unsupervised', 'fused', 'precision formats', 'aligned', 'contaminate', 'convex', 'non-convex', 'residual', 'residuals', 'attend', 'attends', 'batch', 'batches', 'open models']);
  let termRe = null, termMap = null;
  function buildTerms() {
    termMap = new Map();
    const alts = [];
    (TL.GLOSSARY || []).forEach((g) => {
      [g.term.replace(/\s*\(.*\)$/, ''), ...(g.aliases || [])].forEach((a) => {
        if (!a || STOP.has(a)) return;
        const key = /[A-Z]/.test(a) ? a : a.toLowerCase();
        if (!termMap.has(key)) { termMap.set(key, g); alts.push(a); }
      });
    });
    alts.sort((a, b) => b.length - a.length);
    const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    termRe = new RegExp(`(?<![\\w\\-])(${alts.map(escRe).join('|')})(?![\\w\\-])`, 'gi');
  }
  TL.addTerms = function (root) {
    if (!TL.GLOSSARY) return;
    if (!termRe) buildTerms();
    const blocks = TL.$$('.prose, .qa > summary, .lead, .term-scope', root);
    if (root.matches && root.matches('.prose')) blocks.push(root);
    const page = (TL.parseHash().args || [])[0];
    blocks.forEach((block) => {
      if (block.dataset.terms) return; block.dataset.terms = 1;
      const seen = new Set();
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => (n.parentElement.closest('code, pre, .katex, .diagram, a, .term, h1, button, script, style, input, textarea') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
      });
      const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((node) => {
        const text = node.nodeValue; termRe.lastIndex = 0;
        let m, last = 0, frag = null;
        while ((m = termRe.exec(text))) {
          const word = m[1];
          let g = termMap.get(word) || termMap.get(word.toLowerCase());
          if (g && termMap.get(word) === undefined && /[A-Z]/.test(g.aliases.concat(g.term).find((a) => a.toLowerCase() === word.toLowerCase()) || '')) g = null; // acronyms are case-sensitive
          if (!g || seen.has(g.term)) continue;
          seen.add(g.term);
          frag = frag || document.createDocumentFragment();
          frag.appendChild(document.createTextNode(text.slice(last, m.index)));
          const span = document.createElement('span');
          span.className = 'term'; span.tabIndex = 0; span.textContent = word;
          span.dataset.def = g.def; span.dataset.term = g.term; if (g.swe) span.dataset.swe = g.swe;
          if (g.lesson && TL.lessonById && TL.lessonById[g.lesson] && g.lesson !== page) span.dataset.lesson = g.lesson;
          frag.appendChild(span); last = m.index + word.length;
        }
        if (frag) { frag.appendChild(document.createTextNode(text.slice(last))); node.parentNode.replaceChild(frag, node); }
      });
    });
  };
  // one floating tooltip element for the whole page
  function tipEl() {
    let t = document.getElementById('term-tip');
    if (!t) { t = document.createElement('div'); t.id = 'term-tip'; t.setAttribute('role', 'tooltip'); document.body.appendChild(t); }
    return t;
  }
  function showTip(el) {
    const t = tipEl();
    const l = el.dataset.lesson && TL.lessonById[el.dataset.lesson];
    t.innerHTML = `<b>${TL.esc(el.dataset.term)}</b><div>${TL.esc(el.dataset.def)}</div>${el.dataset.swe ? `<div class="tip-swe"><i>In software terms:</i> ${TL.esc(el.dataset.swe)}</div>` : ''}${l ? `<a href="#/lesson/${l.id}">Lesson: ${TL.esc(l.title)} →</a>` : ''}`;
    TL.rewriteLinks(t);
    t.style.display = 'block';
    const r = el.getBoundingClientRect(), w = Math.min(320, window.innerWidth - 16);
    t.style.width = w + 'px';
    let x = r.left + r.width / 2 - w / 2; x = Math.max(8, Math.min(window.innerWidth - w - 8, x));
    const below = r.bottom + 8 + t.offsetHeight < window.innerHeight;
    t.style.left = x + window.scrollX + 'px';
    t.style.top = (below ? r.bottom + 4 : r.top - t.offsetHeight - 4) + window.scrollY + 'px';
  }
  let hideT;
  const hideTip = () => { const t = document.getElementById('term-tip'); if (t) t.style.display = 'none'; };
  document.addEventListener('mouseover', (e) => {
    const tgt = e.target;
    if (!tgt.closest) return;
    if (tgt.closest('#term-tip')) { clearTimeout(hideT); return; }        // keep open while hovering the tooltip itself
    const el = tgt.closest('.term');
    clearTimeout(hideT);
    if (el) showTip(el);
    else hideT = setTimeout(hideTip, 450);                                  // grace period to move onto the tooltip
  });
  document.addEventListener('touchstart', (e) => { if (e.target.closest && !e.target.closest('.term, #term-tip')) hideTip(); }, { passive: true });
  document.addEventListener('focusin', (e) => { if (e.target.classList && e.target.classList.contains('term')) showTip(e.target); });
  document.addEventListener('click', (e) => { const el = e.target.closest && e.target.closest('.term'); if (el) { e.preventDefault(); clearTimeout(hideT); showTip(el); } else if (e.target.closest && !e.target.closest('#term-tip')) hideTip(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideTip(); });

  /* ---------------- progress pill ---------------- */
  TL.updateProgressPill = function () {
    const o = TL.overall();
    const el = document.getElementById('progress-pill');
    if (el) {
      el.innerHTML = `<span class="pp-bar"><span style="width:${(o.pct * 100).toFixed(1)}%"></span></span><span>${Math.round(o.pct * 100)}%</span>`;
      el.title = `${o.done} of ${o.total} essential lessons complete`;
    }
  };

  /* ---------------- search ---------------- */
  TL.search = function (q, limit = 30) {
    q = q.trim().toLowerCase();
    if (q.length < 2) return [];
    const terms = q.split(/\s+/);
    const score = (title, text) => {
      const t = title.toLowerCase(), x = (text || '').toLowerCase();
      let s = 0;
      for (const w of terms) {
        if (t.includes(w)) s += t.startsWith(w) ? 12 : 8; else if (x.includes(w)) s += 2; else return 0;
      }
      if (t.includes(q)) s += 10;
      return s;
    };
    const res = [];
    TL.lessons.forEach((l) => { const s = score(l.title, l.text + ' ' + (l.tags || []).join(' ')); if (s) res.push({ s: s + 3, type: 'Lesson', title: l.title, sub: TL.domainById[l.domain].name, href: `#/lesson/${l.id}` }); });
    (TL.GLOSSARY || []).forEach((g) => { const s = score(g.term + ' ' + (g.aliases || []).join(' '), g.def); if (s) res.push({ s: s + 1, type: 'Glossary', title: g.term, sub: g.def.slice(0, 80), href: `#/glossary?q=${encodeURIComponent(g.term)}` }); });
    TL.interview.forEach((iq) => { const s = score(iq.title, iq.text); if (s) res.push({ s, type: 'Interview', title: iq.title, sub: iq.cat, href: `#/interview/${iq.id}` }); });
    (TL.WIDGET_LIST || []).forEach((w) => { const s = score(w.title, w.desc); if (s) res.push({ s, type: 'Playground', title: w.title, sub: w.desc.slice(0, 80), href: `#/playground/${w.id}` }); });
    return res.sort((a, b) => b.s - a.s).slice(0, limit);
  };

  TL.closeMenus = () => { TL.$$('.menu.open').forEach((m) => m.classList.remove('open')); const sr = TL.$('#search-results'); if (sr) sr.hidden = true; };

  /* ---------------- generic SVG pan/zoom ---------------- */
  TL.panZoom = function (svg, opts = {}) {
    const vb0 = svg.viewBox.baseVal;
    const base = { x: vb0.x, y: vb0.y, w: vb0.width, h: vb0.height };
    let v = { ...base };
    const minScale = opts.min || 0.5, maxScale = opts.max || 4;
    const apply = () => svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`);
    const zoom = (f, cx, cy) => {
      const nw = Math.min(base.w / minScale, Math.max(base.w / maxScale, v.w * f));
      const k = nw / v.w;
      if (cx === undefined) { cx = v.x + v.w / 2; cy = v.y + v.h / 2; }
      v.x = cx - (cx - v.x) * k; v.y = cy - (cy - v.y) * k; v.w *= k; v.h *= k; apply();
    };
    const toSvg = (e) => {
      const r = svg.getBoundingClientRect();
      const s = Math.max(v.w / r.width, v.h / r.height);
      const ox = (r.width * s - v.w) / 2, oy = (r.height * s - v.h) / 2;
      return { x: v.x - ox + (e.clientX - r.left) * s, y: v.y - oy + (e.clientY - r.top) * s, s };
    };
    if (opts.wheel !== false) {
      svg.addEventListener('wheel', (e) => {
        if (!e.ctrlKey && !e.metaKey && !opts.freeWheel) return; // avoid hijacking page scroll
        e.preventDefault(); const p = toSvg(e); zoom(e.deltaY > 0 ? 1.12 : 1 / 1.12, p.x, p.y);
      }, { passive: false });
    }
    let drag = null;
    svg.addEventListener('pointerdown', (e) => {
      if (e.target.closest('[data-click]') || e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, vx: v.x, vy: v.y, moved: false };
    });
    window.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const r = svg.getBoundingClientRect(); const s = Math.max(v.w / r.width, v.h / r.height);
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) { drag.moved = true; svg.classList.add('dragging'); }
      v.x = drag.vx - dx * s; v.y = drag.vy - dy * s; apply();
    });
    window.addEventListener('pointerup', () => { drag = null; svg.classList.remove('dragging'); });
    return {
      zoomIn: () => zoom(1 / 1.25), zoomOut: () => zoom(1.25),
      reset: () => { v = { ...base }; apply(); },
      focus: (x, y, scale) => { v.w = base.w / scale; v.h = base.h / scale; v.x = x - v.w / 2; v.y = y - v.h / 2; apply(); },
    };
  };
  TL.zoomControls = (pz) => {
    const d = document.createElement('div');
    d.className = 'zoom-ctrls';
    d.innerHTML = `<button type="button" aria-label="Zoom in" title="Zoom in (or Ctrl + scroll)">+</button><button type="button" aria-label="Zoom out" title="Zoom out">−</button><button type="button" aria-label="Reset view" title="Reset view">⟲</button>`;
    const [a, b, c] = d.querySelectorAll('button');
    a.onclick = pz.zoomIn; b.onclick = pz.zoomOut; c.onclick = pz.reset;
    return d;
  };

  /* small UI bits reused by views */
  TL.statusLabel = { done: 'Completed', ready: 'Recommended next', locked: 'Prerequisites pending', current: 'Current' };
  TL.lessonChip = (l, opts = {}) => {
    const st = TL.lessonStatus(l);
    const cur = TL.currentLesson();
    const isCur = cur && cur.id === l.id;
    return `<a class="lchip st-${isCur ? 'current' : st} ${l.track === 'optional' ? 'optional' : ''}" href="#/lesson/${l.id}" title="${TL.esc(TL.statusLabel[isCur ? 'current' : st])}">
      <span class="lchip-dot" style="--c:${TL.domainById[l.domain].color}">${st === 'done' ? '✓' : ''}</span>
      <span class="lchip-t">${TL.esc(l.title)}</span>${opts.time !== false ? `<span class="lchip-m">${l.minutes}m</span>` : ''}</a>`;
  };
})();
