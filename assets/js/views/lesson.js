/* Lesson view: five depth levels with progressive "Go deeper" disclosure */
(function () {
  const TL = window.TL;
  const LEVELS = [
    { n: 1, key: 'beginner', name: 'Beginner', short: 'Intuition' },
    { n: 2, key: 'math', name: 'Mathematical', short: 'Math' },
    { n: 3, key: 'code', name: 'Implementation', short: 'Code' },
    { n: 4, key: 'engineering', name: 'Engineering', short: 'Engineering' },
    { n: 5, key: 'research', name: 'Interview & Research', short: 'Interview' },
  ];
  TL.LEVELS = LEVELS;

  const qa = (items, cls = '') => items.map((x) => `<details class="qa ${cls}"><summary>${x.q}</summary><div class="qa-a prose">${x.a || '<p class="muted">Work it through yourself first.</p>'}</div></details>`).join('');

  function hasLevel(l, n) {
    if (n === 1) return !!l.beginner;
    if (n === 2) return !!(l.math || l.example);
    if (n === 3) return !!l.code;
    if (n === 4) return !!l.engineering;
    if (n === 5) return !!(l.research || l.interview.length);
  }

  TL.views.lesson = function (main, args, query = {}) {
    const l = TL.lessonById[args[0]];
    if (!l) return TL.views.notfound(main);
    const d = TL.domainById[l.domain];
    const urlLevel = +args[1] || 0;
    let depth = Math.max(urlLevel, TL.state.depth[l.id] || 1);
    TL.state.visited[l.id] = Date.now(); TL.save();
    const st = TL.lessonStatus(l);
    const missing = l.prereqs.filter((p) => !TL.isDone(p));
    const refs = TL.resourcesFor(l);
    const prev = TL.lessons[l.idx - 1], next = TL.lessons[l.idx + 1];
    const related = (l.related || []).map((x) => TL.lessonById[x]).filter(Boolean);
    const ivqs = TL.interview.filter((q) => (q.lessons || []).includes(l.id));

    /* path badge: Domain › Module › Lesson (› sub-topic groups › sub-topic) */
    const lnode = (TL.outlineNodes || []).find((n) => n.kind === 'lesson' && n.lesson === l.id);
    let subNode = null;
    if (lnode && query.find) { const f = query.find.toLowerCase(); const walk = (n) => { for (const c of n.children) { if ((c.find || '').toLowerCase() === f) return c; const r = walk(c); if (r) return r; } return null; }; subNode = walk(lnode); }
    const chain = lnode ? TL.nodePath(subNode || lnode) : [];
    const chip = (n) => { const href = n.kind === 'module' ? `#/map?q=${encodeURIComponent(n.label)}` : TL.nodeHref(n); const cur = n === (subNode || lnode); return `<a class="pb-chip ${cur ? 'cur' : ''} pb-${n.kind}" href="${href}" ${n.kind === 'domain' ? `style="--c:${n.color}"` : ''}>${n.kind === 'domain' ? TL.icon(n.icon, 13) + ' ' : ''}${TL.esc(n.kind === 'domain' ? n.short : n.label)}</a>`; };
    const also = (TL.lessonAlso[l.id] || []).map((n) => TL.nodePath(n).map((x) => TL.esc(x.kind === 'domain' ? x.short : x.label)).join(' › ')).map((t, i) => `<a href="${TL.nodeHref(TL.lessonAlso[l.id][i].parent)}">${t}</a>`);
    const pathBadge = chain.length ? `<div class="pathbadge"><span class="pb-pin" title="Where this topic sits in the course">📍</span>${chain.map(chip).join('<span class="pb-sep">›</span>')}<a class="pb-map" href="#/map?q=${encodeURIComponent(l.title)}">view on Course Map</a></div>${also.length ? `<div class="pb-also small">Also appears in: ${also.join(' · ')}</div>` : ''}` : '';

    const levelHTML = (lv) => {
      if (!hasLevel(l, lv.n)) return '';
      let body = '';
      if (lv.n === 1) body = `<div class="prose">${l.beginner}</div>${l.diagram ? `<div class="prose diagram-wrap">${l.diagram}</div>` : ''}${l.viz ? l.viz.split(/\s*,\s*/).map((v, i) => { const w = TL.widgets[v.split(':')[0]]; return `<details class="viz-box vizfold" data-widget="${v}" id="viz-${i}"><summary><span class="diag-tag">Interactive</span> ${TL.esc(w ? w.title : v)}</summary><div class="viz-inner"></div></details>`; }).join('') : ''}`;
      if (lv.n === 2) body = `<div class="prose">${l.math}</div>${l.example ? `<div class="callout example"><h3 style="margin-top:.2em">Worked numerical example</h3><div class="prose">${l.example}</div></div>` : ''}`;
      if (lv.n === 3) body = `<div class="prose">${l.code}</div>`;
      if (lv.n === 4) body = `<div class="prose">${l.engineering}</div>`;
      if (lv.n === 5) body = `${l.research ? `<div class="prose">${l.research}</div>` : ''}${l.interview.length ? `<h3>Interview questions with model answers</h3>${qa(l.interview)}` : ''}${ivqs.length ? `<p class="small">Full interview drills: ${ivqs.map((q) => `<a href="#/interview/${q.id}">${TL.esc(q.title)}</a>`).join(' · ')}</p>` : ''}`;
      return `<section class="section level-block lv${lv.n} ${lv.n > depth ? 'level-hidden' : ''}" id="level-${lv.n}" ${lv.n > depth ? 'hidden' : ''}>
        <h2><span class="lvl-tag">Level ${lv.n}</span>${lv.name}</h2>${body}</section>`;
    };
    const avail = LEVELS.filter((lv) => hasLevel(l, lv.n));

    main.innerHTML = `<div class="lesson">
      <aside class="lesson-side" aria-label="Lesson navigation">
        <h4>On this page</h4>
        ${l.objectives ? '<a class="toc" href="#" data-scroll="objectives">Objectives</a>' : ''}
        ${l.bridge ? '<a class="toc" href="#" data-scroll="bridge">Software translation</a>' : ''}
        ${avail.map((lv) => `<a class="toc" href="#" data-scroll="level-${lv.n}" data-lv="${lv.n}">${lv.n}. ${lv.name}</a>`).join('')}
        ${l.misconceptions ? '<a class="toc" href="#" data-scroll="misconceptions">Misconceptions</a>' : ''}
        ${l.exercises.length ? '<a class="toc" href="#" data-scroll="exercises">Practice</a>' : ''}
        ${l.summary ? '<a class="toc" href="#" data-scroll="summary">Revision summary</a>' : ''}
        <a class="toc" href="#" data-scroll="notes">My notes</a>
        <h4 style="margin-top:16px">${TL.esc(d.short)} lessons</h4>
        <div class="dl">${d.lessons.map((x) => `<a href="#/lesson/${x.id}" class="${x.id === l.id ? 'cur' : ''}"><span class="dot ${TL.isDone(x.id) ? 'done' : ''}"></span>${TL.esc(x.title)}</a>`).join('')}</div>
      </aside>
      <article class="lesson-body">
        <div class="lesson-head">
          ${pathBadge}
          <h1>${TL.esc(l.title)}</h1>
          <div class="lesson-meta">
            <span class="badge">${TL.icon('clock', 13)} ${l.minutes} min</span>
            <span class="badge ${l.track === 'optional' ? 'optional' : 'core'}">${l.track === 'optional' ? 'Optional / advanced' : 'Essential path'}</span>
            <span class="badge ${l.depth === 'compact' ? 'compact' : 'full'}" title="${l.depth === 'compact' ? 'Covers the core ideas, key equations and interview points in condensed form.' : 'All five depth levels with worked examples.'}">${l.depth === 'compact' ? 'Compact lesson' : 'Full five-level lesson'}</span>
            <span class="badge">${TL.statusLabel[st]}</span>
          </div>
          <div class="lesson-actions">
            <button class="btn ${TL.isDone(l.id) ? 'ok' : 'primary'}" id="btn-done" type="button">${TL.icon('check', 16)} <span>${TL.isDone(l.id) ? 'Completed' : 'Mark as complete'}</span></button>
            <button class="btn" id="btn-bm" type="button" aria-pressed="${!!TL.state.bookmarks[l.id]}">${TL.icon('bookmark', 16)} Bookmark</button>
            <a class="btn" href="#/domain/${d.id}">${TL.icon('graph', 16)} Roadmap</a>
          </div>
          ${missing.length ? `<div class="notice">Recommended first: ${missing.map((p) => `<a href="#/lesson/${p}">${TL.esc(TL.lessonById[p].title)}</a>`).join(', ')}. You can still read on: nothing is locked.</div>` : ''}
        </div>
        <div class="prereq-box">
          <div><h4>Prerequisites</h4><div class="chips">${l.prereqs.length ? l.prereqs.map((p) => TL.lessonChip(TL.lessonById[p])).join('') : '<span class="small muted">None, a good starting point.</span>'}</div></div>
          <div><h4>Unlocks</h4><div class="chips">${l.unlocks.length ? l.unlocks.slice(0, 6).map((p) => TL.lessonChip(TL.lessonById[p])).join('') : '<span class="small muted">Capstone topic.</span>'}</div></div>
        </div>
        ${l.objectives ? `<div class="callout objectives section" id="objectives"><h3 style="margin-top:.2em">Learning objectives</h3><div class="prose">${l.objectives}</div></div>` : ''}
        ${l.bridge ? `<div class="callout bridge section" id="bridge"><h3 style="margin-top:.2em">${TL.icon('code', 18)} Software engineer's translation</h3><div class="prose">${l.bridge}</div></div>` : ''}
        <div class="levelbar" role="toolbar" aria-label="Depth levels">
          ${LEVELS.map((lv) => `<button type="button" class="lvl-pill lv${lv.n} ${lv.n <= depth ? 'on' : ''}" data-lv="${lv.n}" ${hasLevel(l, lv.n) ? '' : 'disabled style="opacity:.35"'} title="${lv.name}"><span class="n">${lv.n}</span>${lv.short}</button>`).join('')}
          <span class="spacer"></span>
          <button type="button" class="btn sm" id="btn-all">${depth >= 5 ? 'Collapse to beginner' : 'Expand all levels'}</button>
        </div>
        ${LEVELS.map(levelHTML).join('')}
        <div class="go-deeper" id="go-deeper"></div>
        ${l.misconceptions ? `<section class="section callout mis" id="misconceptions"><h2>Common misconceptions</h2><div class="prose">${l.misconceptions}</div></section>` : ''}
        ${l.exercises.length ? `<section class="section" id="exercises"><h2>Practice exercises</h2><p class="small muted">Try each one before opening the solution.</p>${qa(l.exercises)}</section>` : ''}
        ${l.summary ? `<section class="section callout summary" id="summary"><h2>Revision summary</h2><div class="prose">${l.summary}</div></section>` : ''}
        ${related.length ? `<section class="section"><h2>Related lessons</h2><div class="grid c3">${related.map((r) => TL.lessonChip(r)).join('')}</div></section>` : ''}
        ${refs.length ? `<section class="section"><h2>Go further (external, optional)</h2><p class="small muted">Everything you need is on this page. These are supplementary.</p><div class="refs-list">${refs.map(TL.refHTML).join('')}</div></section>` : ''}
        <section class="section" id="notes"><h2>My notes</h2><textarea class="notes-area" id="note" placeholder="Your notes are saved in this browser.">${TL.esc(TL.state.notes[l.id] || '')}</textarea></section>
        <nav class="lesson-nav">${prev ? `<a class="btn" href="#/lesson/${prev.id}">← ${TL.esc(prev.title)}</a>` : '<span></span>'}${next ? `<a class="btn primary" href="#/lesson/${next.id}" style="justify-content:flex-end;text-align:right">${TL.esc(next.title)} →</a>` : ''}</nav>
      </article></div>`;

    // widgets
    TL.$$('details.vizfold', main).forEach((el) => el.addEventListener('toggle', () => { const inner = el.querySelector('.viz-inner'); if (el.open && !inner.dataset.mounted) { inner.dataset.mounted = 1; TL.mountWidget(inner, el.dataset.widget); TL.enhance(inner); } }));

    const setDepth = (n, scroll) => {
      depth = n; TL.state.depth[l.id] = n; TL.save();
      LEVELS.forEach((lv) => {
        const s = TL.$(`#level-${lv.n}`, main); if (!s) return;
        s.hidden = lv.n > n; s.classList.toggle('level-hidden', lv.n > n);
      });
      TL.$$('.lvl-pill', main).forEach((b) => b.classList.toggle('on', +b.dataset.lv <= n));
      TL.$('#btn-all', main).textContent = n >= 5 ? 'Collapse to beginner' : 'Expand all levels';
      const nextLv = avail.find((lv) => lv.n > n);
      const gd = TL.$('#go-deeper', main);
      gd.innerHTML = nextLv ? `<button class="btn" type="button">${TL.icon('layers', 16)} Go deeper → Level ${nextLv.n}: ${nextLv.name}</button>` : '';
      if (nextLv) gd.firstChild.onclick = () => setDepth(nextLv.n, nextLv.n);
      if (scroll) { const s = TL.$(`#level-${scroll}`, main); if (s) setTimeout(() => s.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); }
    };
    setDepth(depth, urlLevel || 0);
    TL.$$('.lvl-pill', main).forEach((b) => b.addEventListener('click', () => { const n = +b.dataset.lv; setDepth(Math.max(depth, n), n); }));
    TL.$('#btn-all', main).onclick = () => setDepth(depth >= 5 ? 1 : 5);
    TL.$$('[data-scroll]', main).forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      if (a.dataset.lv && +a.dataset.lv > depth) setDepth(+a.dataset.lv);
      const t = document.getElementById(a.dataset.scroll); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
    const bd = TL.$('#btn-done', main);
    bd.onclick = () => {
      const v = !TL.isDone(l.id); TL.setDone(l.id, v);
      bd.className = 'btn ' + (v ? 'ok' : 'primary'); bd.querySelector('span').textContent = v ? 'Completed' : 'Mark as complete';
      const dot = TL.$('.dl a.cur .dot', main); if (dot) dot.classList.toggle('done', v);
    };
    const bm = TL.$('#btn-bm', main);
    bm.onclick = () => { if (TL.state.bookmarks[l.id]) delete TL.state.bookmarks[l.id]; else TL.state.bookmarks[l.id] = Date.now(); TL.save(); bm.setAttribute('aria-pressed', !!TL.state.bookmarks[l.id]); };
    let tmr; TL.$('#note', main).addEventListener('input', (e) => { clearTimeout(tmr); tmr = setTimeout(() => { const v = e.target.value; if (v.trim()) TL.state.notes[l.id] = v; else delete TL.state.notes[l.id]; TL.save(); }, 300); });

    if (query.find) {
      setDepth(5);
      const f = query.find.toLowerCase();
      const cands = TL.$$('.lesson-body h2, .lesson-body h3, .lesson-body strong, .lesson-body b, .lesson-body summary, .lesson-body th, .lesson-body td, .lesson-body li, .lesson-body p, .lesson-body .fstep, .lesson-body .fvs-a, .lesson-body .fvs-b', main).filter((e) => !e.closest('.lesson-head, .pathbadge, .prereq-box, .lesson-nav, .notes-area'));
      const hit = cands.find((e) => e.textContent.toLowerCase().includes(f) && /^(H2|H3|STRONG|B|SUMMARY|TH)$/.test(e.tagName)) || cands.find((e) => e.textContent.toLowerCase().includes(f));
      if (hit) {
        let p = hit.parentElement; while (p) { if (p.tagName === 'DETAILS') p.open = true; p = p.parentElement; }
        const target = hit.closest('li, p, td, tr, .fstep, .fvs, details, h2, h3') || hit;
        target.classList.add('find-hl');
        setTimeout(() => { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 120);
        setTimeout(() => target.classList.remove('find-hl'), 4500);
      }
    }
    const crumbs = [{ label: d.short, href: `#/domain/${d.id}` }];
    if (lnode) crumbs.push({ label: lnode.parent.label, href: `#/map?q=${encodeURIComponent(lnode.parent.label)}` });
    crumbs.push({ label: l.title, href: `#/lesson/${l.id}` });
    if (subNode) TL.nodePath(subNode).slice(3).forEach((n) => crumbs.push({ label: n.label, href: TL.nodeHref(n) }));
    if (urlLevel && LEVELS[urlLevel - 1]) crumbs.push({ label: LEVELS[urlLevel - 1].name });
    return { title: l.title, crumbs };
  };
})();
