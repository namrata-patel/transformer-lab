/* Secondary pages: playground, interview, plan, directory, glossary, flashcards, code lab, MiniGPT, resources, notes, about */
(function () {
  const TL = window.TL;
  const page = (main, html, cls = '') => { main.innerHTML = `<div class="page ${cls}">${html}</div>`; };

  /* ---- resources helpers (used by lessons) ---- */
  TL.resourcesFor = (l) => (TL.RESOURCES || []).filter((r) => (l.refs || []).includes(r.id) || (r.lessons || []).includes(l.id));
  TL.refHTML = (r) => `<a class="ref" href="${r.url}" target="_blank" rel="noopener"><b>${TL.esc(r.title)}</b><div class="small muted">${TL.esc(r.why)}</div><div class="row"><span class="badge">${r.type}</span><span class="badge">${r.level}</span><span class="small muted">${TL.esc(r.source || '')}</span></div></a>`;

  TL.views.notfound = (main) => { page(main, '<h1>Page not found</h1><p><a href="#/">Back to the dashboard</a></p>'); return { title: 'Not found' }; };

  /* ---- playground ---- */
  TL.views.playground = function (main, args) {
    if (args[0] && TL.widgets[args[0]]) {
      const w = TL.widgets[args[0]];
      page(main, `<div class="viz-box" id="w"></div><p class="small">Related lessons: ${(w.lessons || []).filter((x) => TL.lessonById[x]).map((x) => `<a href="#/lesson/${x}">${TL.esc(TL.lessonById[x].title)}</a>`).join(' · ')}</p>`, 'wide');
      TL.mountWidget(TL.$('#w', main), args[0]);
      return { title: w.title, crumbs: [{ label: 'Playground', href: '#/playground' }, { label: w.title }] };
    }
    page(main, `<h1>Math & ML playground</h1><p class="lead">Interactive visualizations. Each one is also embedded inside the lessons that use it.</p>
      <div class="pg-grid">${TL.WIDGET_LIST.map((w) => `<a class="card pg-card" href="#/playground/${w.id}"><h3 style="margin-top:0">${TL.icon('sliders', 18)} ${TL.esc(w.title)}</h3><p class="small muted">${TL.esc(w.desc)}</p></a>`).join('')}</div>`, 'wide');
    return { title: 'Playground', crumbs: [{ label: 'Playground' }] };
  };

  /* ---- interview academy ---- */
  TL.views.interview = function (main, args, query) {
    const q = args[0] && TL.interviewById[args[0]];
    if (q) {
      const st = TL.state.ivStatus[q.id] || '';
      const sec = (t, h, cls = '') => h ? `<div class="callout ${cls}"><h3 style="margin-top:.2em">${t}</h3><div class="prose">${h}</div></div>` : '';
      page(main, `<div class="row"><span class="badge">${TL.esc(q.cat)}</span><span class="badge">${TL.esc(q.level || '')}</span></div><h1>${TL.esc(q.title)}</h1>
        <div class="card prose">${q.question}</div>
        <p class="small muted">Answer out loud or on paper first, then reveal.</p>
        <button class="btn primary" id="rev">Reveal answer</button>
        <div id="ans" hidden>${sec('Answer', q.answer)}${sec('Deeper explanation', q.deeper)}${sec('Key equations', q.equations)}${sec('Follow-up questions', q.followups)}${sec('Common incorrect answers', q.wrong, 'wrong')}${sec('What a strong answer demonstrates', q.rubric, 'rubric')}</div>
        <div class="row" style="margin-top:16px"><span class="small">Self-assessment:</span>${['practiced', 'confident'].map((s) => `<button class="btn sm" data-st="${s}" aria-pressed="${st === s}">${s === 'practiced' ? 'Needs more practice' : 'Confident'}</button>`).join('')}</div>
        ${(q.lessons || []).length ? `<p class="small">Review: ${q.lessons.filter((x) => TL.lessonById[x]).map((x) => `<a href="#/lesson/${x}">${TL.esc(TL.lessonById[x].title)}</a>`).join(' · ')}</p>` : ''}`, 'narrow');
      TL.$('#rev', main).onclick = (e) => { TL.$('#ans', main).hidden = false; e.target.remove(); };
      TL.$$('[data-st]', main).forEach((b) => (b.onclick = () => { TL.state.ivStatus[q.id] = b.dataset.st; TL.save(); TL.$$('[data-st]', main).forEach((x) => x.setAttribute('aria-pressed', x === b)); }));
      return { title: q.title, crumbs: [{ label: 'Interview Academy', href: '#/interview' }, { label: q.title }] };
    }
    const cats = [...new Set(TL.interview.map((x) => x.cat))];
    let cat = query.cat || '';
    page(main, `<h1>Interview Academy</h1><p class="lead">Questions designed to reflect the depth expected in ML / LLM engineering interviews. They are not real questions from any specific company.</p><div class="filters" id="f"></div><div class="grid c2" id="list"></div>`);
    const render = () => {
      TL.$('#f', main).innerHTML = ['', ...cats].map((c) => `<button class="fchip ${c === cat ? 'on' : ''}" data-c="${TL.esc(c)}">${c || 'All'}</button>`).join('');
      TL.$$('[data-c]', main).forEach((b) => (b.onclick = () => { cat = b.dataset.c; render(); }));
      TL.$('#list', main).innerHTML = TL.interview.filter((x) => !cat || x.cat === cat).map((x) => `<a class="card iq" href="#/interview/${x.id}"><span class="st-dot ${TL.state.ivStatus[x.id] || ''}"></span><div><h3>${TL.esc(x.title)}</h3><span class="badge">${TL.esc(x.cat)}</span> <span class="badge">${TL.esc(x.level || '')}</span></div></a>`).join('') || '<p class="muted">No questions yet in this category.</p>';
    };
    render();
    return { title: 'Interview Academy', crumbs: [{ label: 'Interview Academy' }] };
  };

  /* ---- 30-day plan ---- */
  TL.views.plan = function (main, args) {
    const P = TL.PLAN || [];
    const today = P.find((d) => !TL.state.planDone[d.day]) || P[P.length - 1];
    const sel = P.find((d) => d.day === +args[0]) || today;
    const hrs = TL.state.planHours || 3;
    const phases = { 1: ['Foundations', '#3b82f6'], 2: ['NLP & Transformers', '#8b5cf6'], 3: ['Build MiniGPT', '#f59e0b'], 4: ['LLM engineering & interviews', '#14b8a6'] };
    const doneN = P.filter((d) => TL.state.planDone[d.day]).length;
    const mins = (d) => (d.lessons || []).reduce((s, id) => s + ((TL.lessonById[id] || {}).minutes || 0), 0);
    page(main, `<h1>30-day intensive plan</h1>
      <p class="lead">About 3 hours a day (≈ 90 hours). This builds a strong foundation, a mathematical understanding of Transformers, a working MiniGPT and interview fluency. It will not make you a master of every LLM topic; optional lessons are marked separately.</p>
      <div class="row"><label class="small">Daily study time: <input type="range" min="1" max="6" step="0.5" value="${hrs}" id="hrs"> <b id="hv">${hrs} h</b></label><span class="small muted" id="proj"></span><span class="spacer"></span><span class="small">${doneN}/30 days done</span><div class="pbar" style="width:160px"><span style="width:${doneN / 30 * 100}%"></span></div></div>
      <div class="legend phase-legend" style="margin:10px 0">${Object.values(phases).map(([n, c]) => `<span><i style="background:${c}"></i>${n}</span>`).join('')}</div>
      <div class="days">${P.map((d) => `<a href="#/plan/${d.day}" class="day ${TL.state.planDone[d.day] ? 'done' : ''} ${d === today ? 'today' : ''} ${d === sel ? 'sel' : ''}" style="--pc:${phases[d.phase][1]}" title="${TL.esc(d.title)}">${d.day}</a>`).join('')}</div>
      ${sel ? `<div class="card" style="margin-top:18px"><div class="row"><h2 style="margin:0">Day ${sel.day}: ${TL.esc(sel.title)}</h2><span class="spacer"></span><span class="badge">${phases[sel.phase][0]}</span><span class="badge">${TL.icon('clock', 13)} lessons ≈ ${TL.fmtMin(mins(sel))}</span></div>
        ${mins(sel) > hrs * 60 ? `<p class="notice small">At ${hrs} h/day the lessons alone exceed today's time; split this day in two or skim the later levels.</p>` : ''}
        <div class="plan-item"><span class="k">Objectives</span><div>${(sel.objectives || []).map((o) => `• ${TL.esc(o)}`).join('<br>')}</div></div>
        <div class="plan-item"><span class="k">Lessons</span><div style="display:grid;gap:5px;flex:1">${(sel.lessons || []).filter((x) => TL.lessonById[x]).map((x) => TL.lessonChip(TL.lessonById[x])).join('')}</div></div>
        ${sel.practice ? `<div class="plan-item"><span class="k">Interactive</span><div>${sel.practice.map((p) => `<a href="#/playground/${p}">${TL.esc((TL.widgets[p] || {}).title || p)}</a>`).join(' · ')}</div></div>` : ''}
        ${sel.coding ? `<div class="plan-item"><span class="k">Coding</span><div>${TL.esc(sel.coding)}</div></div>` : ''}
        ${sel.revision ? `<div class="plan-item"><span class="k">Revision</span><div>${TL.esc(sel.revision)}</div></div>` : ''}
        ${sel.interview && sel.interview.length ? `<div class="plan-item"><span class="k">Interview</span><div>${sel.interview.filter((x) => TL.interviewById[x]).map((x) => `<a href="#/interview/${x}">${TL.esc(TL.interviewById[x].title)}</a>`).join(' · ') || '<span class="muted">Practise the questions inside today\'s lessons.</span>'}</div></div>` : ''}
        ${sel.milestone ? `<div class="plan-item"><span class="k">Milestone</span><div><b>${TL.esc(sel.milestone)}</b></div></div>` : ''}
        <div class="row" style="margin-top:12px"><button class="btn ${TL.state.planDone[sel.day] ? 'ok' : 'primary'}" id="dd">${TL.state.planDone[sel.day] ? '✓ Day complete' : 'Mark day complete'}</button>${sel.day > 1 ? `<a class="btn" href="#/plan/${sel.day - 1}">← Day ${sel.day - 1}</a>` : ''}${sel.day < 30 ? `<a class="btn" href="#/plan/${sel.day + 1}">Day ${sel.day + 1} →</a>` : ''}</div></div>` : ''}`);
    const proj = () => { const h = TL.state.planHours; const days = Math.ceil(TL.overall().minutes / 60 / h); TL.$('#proj', main).textContent = `Essential lessons ≈ ${Math.round(TL.overall().minutes / 60)} h → ≈ ${days} days of lessons at ${h} h/day, plus practice and coding time.`; };
    TL.$('#hrs', main).oninput = (e) => { TL.state.planHours = +e.target.value; TL.save(); TL.$('#hv', main).textContent = e.target.value + ' h'; proj(); };
    proj();
    if (sel) TL.$('#dd', main).onclick = () => { if (TL.state.planDone[sel.day]) delete TL.state.planDone[sel.day]; else TL.state.planDone[sel.day] = Date.now(); TL.save(); TL.route(); };
    return { title: '30-day plan', crumbs: [{ label: '30-day plan', href: '#/plan' }, ...(args[0] ? [{ label: `Day ${sel.day}` }] : [])], keepScroll: !!args[0] };
  };


  /* ---- Course Map: one collapsible tree of every topic ---- */
  TL.views.map = function (main, args, query) {
    const root = TL.outlineRoot;
    let uid = 0;
    const ids = new Map();
    TL.outlineNodes.forEach((n) => ids.set(n, 'n' + uid++));
    const open = new Set();                       // ids of expanded nodes
    const setLevel = (lvl) => { open.clear(); const kinds = { 1: ['domain'], 2: ['domain', 'module'], 3: ['domain', 'module', 'lesson', 'group'] }[lvl]; TL.outlineNodes.forEach((n) => { if (kinds.includes(n.kind) && n.children.length) open.add(ids.get(n)); }); open.add('root'); };
    setLevel(1);
    const cur = TL.currentLesson();
    const counts = { lessons: TL.lessons.length, topics: TL.outlineNodes.filter((n) => n.kind === 'topic').length, q: TL.interview.length };
    main.innerHTML = `<div class="page wide cm-page">
      <div class="row" style="align-items:flex-end"><div><h1 style="margin:0">Course Map</h1><p class="lead" style="margin:.3em 0">Every topic in one tree: <b>Domain › Module › Lesson › Sub-topic</b>. Click any name to open it; click <b>▸</b> to expand. ${counts.lessons} lessons · ${counts.topics} sub-topics · ${counts.q} interview drills.</p></div></div>
      <div class="row cm-tools"><input type="search" id="cm-q" class="notes-area" style="min-height:0;width:280px;padding:7px 10px" placeholder="Find a topic, e.g. FlashAttention" value="${TL.esc(query.q || '')}">
        <span class="seg"><button type="button" data-lv="1">Domains</button><button type="button" data-lv="2" class="on">Lessons</button><button type="button" data-lv="3">Everything</button></span>
        ${cur ? `<a class="btn sm primary" href="#/lesson/${cur.id}">${TL.icon('play', 14)} Next: ${TL.esc(cur.title)}</a>` : ''}
        <span class="legend small"><span><i style="background:var(--done)"></i>done</span><span><i style="background:var(--cur)"></i>next</span><span><i style="background:var(--card);border:2px solid var(--line)"></i>to do</span></span></div>
      <div class="cm-scroll"><div class="cm" id="cm"></div></div></div>`;
    const host = TL.$('#cm', main);
    let hits = null;
    const pathText = (n) => TL.nodePath(n).map((x) => (x.kind === 'domain' ? x.short : x.label)).join(' › ');
    function nodeHTML(n, isRoot) {
      const id = isRoot ? 'root' : ids.get(n);
      const has = n.children.length > 0, isOpen = open.has(id);
      let dot = '', meta = '';
      if (n.kind === 'lesson') { const l = TL.lessonById[n.lesson]; const st = TL.isDone(l.id) ? 'done' : cur && cur.id === l.id ? 'cur' : ''; dot = `<span class="cm-dot ${st}"></span>`; meta = `<span class="cm-meta">${l.minutes}m</span>`; }
      if (n.kind === 'domain' && n.domain !== 'interview') { const p = TL.domainProgress(TL.domainById[n.domain]); meta = `<span class="cm-meta">${p.done}/${p.total}</span>`; }
      if (n.kind === 'module') meta = `<span class="cm-meta">${n.children.length}</span>`;
      const href = isRoot ? null : n.kind === 'module' || n.kind === 'group' ? null : TL.nodeHref(n);
      const hit = hits && hits.has(n), dim = hits && !hit;
      const label = isRoot ? `<span class="cm-pill cm-root">${TL.esc(n.label)}</span>`
        : `${href ? `<a class="cm-pill cm-${n.kind} ${hit ? 'hit' : ''}" href="${href}"` : `<span class="cm-pill cm-${n.kind} ${hit ? 'hit' : ''}" data-toggle="${id}"`} title="${TL.esc(pathText(n))}" ${n.kind === 'domain' ? `style="--c:${n.color}"` : ''}>${n.kind === 'domain' ? `<span class="cm-ic">${TL.icon(n.icon, 14)}</span>` : ''}${dot}${TL.esc(n.kind === 'domain' ? n.short : n.label)}${meta}${href ? '</a>' : '</span>'}`;
      const tog = has && !isRoot ? `<button type="button" class="cm-tog" data-toggle="${id}" aria-expanded="${isOpen}" aria-label="${isOpen ? 'Collapse' : 'Expand'} ${TL.esc(n.label)}">${isOpen ? '▾' : '▸'}</button>` : '<span class="cm-tog-sp"></span>';
      return `<div class="cm-node ${dim ? 'dim' : ''}"><div class="cm-row">${label}${tog}</div>${has && isOpen ? `<div class="cm-kids">${n.children.map((c) => nodeHTML(c)).join('')}</div>` : ''}</div>`;
    }
    const render = () => { host.innerHTML = nodeHTML(root, true); TL.rewriteLinks(host); };
    host.addEventListener('click', (e) => { const t = e.target.closest('[data-toggle]'); if (!t) return; e.preventDefault(); const id = t.dataset.toggle; if (open.has(id)) open.delete(id); else open.add(id); render(); });
    TL.$$('[data-lv]', main).forEach((b) => (b.onclick = () => { hits = null; TL.$('#cm-q', main).value = ''; setLevel(+b.dataset.lv); TL.$$('[data-lv]', main).forEach((x) => x.classList.toggle('on', x === b)); render(); }));
    const search = () => {
      const q = TL.$('#cm-q', main).value.trim().toLowerCase();
      if (q.length < 2) { hits = null; render(); return; }
      hits = new Set(TL.outlineNodes.filter((n) => n.label.toLowerCase().includes(q)));
      open.clear(); open.add('root');
      hits.forEach((n) => { for (let p = n.parent; p && p.kind !== 'root'; p = p.parent) open.add(ids.get(p)); });
      render();
      const first = host.querySelector('.cm-pill.hit'); if (first) first.scrollIntoView({ block: 'center', inline: 'center' });
    };
    let tmr; TL.$('#cm-q', main).addEventListener('input', () => { clearTimeout(tmr); tmr = setTimeout(search, 200); });
    if (query.q) { setTimeout(search, 0); } else { setLevel(2); render(); }
    return { title: 'Course Map', crumbs: [{ label: 'Course Map' }] };
  };

  /* ---- directory ---- */
  TL.views.directory = function (main) {
    page(main, `<h1>Topic directory</h1><p class="lead">The full curriculum as a text outline. The <a href="#/tree">tree</a> and <a href="#/road">road</a> are the visual versions.</p>
      ${TL.DOMAINS.filter((d) => !d.virtual).map((d) => { const p = TL.domainProgress(d); return `<details class="dir-domain" open><summary><span class="tp-icon" style="background:${d.color};width:30px;height:30px;border-radius:9px">${TL.icon(d.icon, 17)}</span>${d.name}<span class="small muted">· ${p.done}/${p.total} · ${TL.fmtMin(d.minutes)}</span><a class="small" href="#/domain/${d.id}" style="margin-left:auto">roadmap →</a></summary><div class="dir-list">${d.lessons.map((l) => TL.lessonChip(l)).join('')}</div></details>`; }).join('')}`);
    return { title: 'Directory', crumbs: [{ label: 'Topic directory' }] };
  };

  /* ---- glossary ---- */
  TL.views.glossary = function (main, args, query) {
    const G = [...(TL.GLOSSARY || [])].sort((a, b) => a.term.localeCompare(b.term));
    page(main, `<h1>Glossary</h1><input type="search" id="gq" class="notes-area" style="min-height:0" placeholder="Filter terms…" value="${TL.esc(query.q || '')}"><div id="gl"></div>`, 'narrow');
    const render = () => {
      const q = TL.$('#gq', main).value.toLowerCase();
      TL.$('#gl', main).innerHTML = G.filter((g) => !q || (g.term + ' ' + g.def).toLowerCase().includes(q)).map((g) => `<div class="gl-term"><h3>${TL.esc(g.term)}</h3><div class="small">${TL.esc(g.def)}</div>${g.swe ? `<div class="small tip-swe"><i>In software terms:</i> ${TL.esc(g.swe)}</div>` : ''}${g.lesson && TL.lessonById[g.lesson] ? `<a class="small" href="#/lesson/${g.lesson}">Lesson: ${TL.esc(TL.lessonById[g.lesson].title)} →</a>` : ''}</div>`).join('') || '<p class="muted">No matches.</p>';
    };
    TL.$('#gq', main).oninput = render; render();
    return { title: 'Glossary', crumbs: [{ label: 'Glossary' }] };
  };

  /* ---- flashcards (Leitner boxes) ---- */
  TL.views.flashcards = function (main, args, query) {
    const decks = {
      swe: { name: 'Software → AI', desc: 'Front: a software concept you know. Back: the AI term. The fastest way to memorise AI vocabulary.', cards: (TL.GLOSSARY || []).filter((g) => g.swe).map((g) => ({ id: 'swe:' + g.term, front: g.swe, hint: 'In AI this is called…', back: g.term, sub: g.def })) },
      ai: { name: 'AI → Software', desc: 'Front: the AI term. Back: its software equivalent + definition.', cards: (TL.GLOSSARY || []).filter((g) => g.swe).map((g) => ({ id: 'ai:' + g.term, front: g.term, hint: 'In software terms…', back: g.swe, sub: g.def })) },
      all: { name: 'Full glossary', desc: 'Every term with its definition.', cards: (TL.GLOSSARY || []).map((g) => ({ id: g.term, front: g.term, hint: 'Definition', back: g.def, sub: g.swe ? 'In software terms: ' + g.swe : '' })) },
    };
    let deck = decks[query.deck] ? query.deck : 'swe';
    const box = (c) => TL.state.cards[c.id] || 0;
    let cur;
    const pick = () => { const cards = decks[deck].cards; const m = Math.min(...cards.map(box)); const pool = cards.filter((c) => box(c) === m); return pool[Math.floor(Math.random() * pool.length)]; };
    const render = () => {
      const D = decks[deck], cards = D.cards;
      const mastered = cards.filter((c) => box(c) >= 3).length;
      page(main, `<h1>Revision flashcards</h1>
        <div class="seg" style="margin:6px 0 10px">${Object.entries(decks).map(([k, d]) => `<button type="button" data-deck="${k}" class="${k === deck ? 'on' : ''}">${d.name} (${d.cards.length})</button>`).join('')}</div>
        <p class="lead" style="margin:.3em 0">${D.desc} Click the card to flip it.</p>
        <div class="row small"><div class="pbar" style="width:220px"><span style="width:${mastered / cards.length * 100}%"></span></div>${mastered}/${cards.length} mastered (answered correctly 3+ times)</div>
        <div class="flash" id="fc"><div class="flash-inner"><div class="flash-face"><div><div class="small muted" style="text-transform:uppercase;letter-spacing:.06em;font-weight:700">${deck === 'swe' ? 'Software concept' : 'AI term'}</div><h2>${TL.esc(cur.front)}</h2><p class="small muted">${TL.esc(cur.hint)}</p></div></div>
        <div class="flash-face back"><div><h2 style="font-size:1.35rem">${TL.esc(cur.back)}</h2>${cur.sub ? `<p class="small">${TL.esc(cur.sub)}</p>` : ''}</div></div></div></div>
        <div class="row" style="justify-content:center"><button class="btn" id="again">✗ Again</button><button class="btn primary" id="good">✓ I knew it</button></div>`, 'narrow');
      TL.$('#fc', main).onclick = () => TL.$('#fc', main).classList.toggle('flipped');
      TL.$('#again', main).onclick = () => { TL.state.cards[cur.id] = 0; TL.save(); cur = pick(); render(); };
      TL.$('#good', main).onclick = () => { TL.state.cards[cur.id] = box(cur) + 1; TL.save(); cur = pick(); render(); };
      TL.$$('[data-deck]', main).forEach((b) => (b.onclick = () => { deck = b.dataset.deck; TL.setQuery({ deck }); cur = pick(); render(); }));
    };
    cur = pick(); render();
    return { title: 'Flashcards', crumbs: [{ label: 'Flashcards' }] };
  };

  /* ---- code lab & MiniGPT (expanded in later rounds) ---- */
  TL.views.codelab = function (main) {
    const lessons = TL.lessons.filter((l) => l.code);
    page(main, `<h1>Code lab</h1><p class="lead">Every lesson's Level 3 (Implementation) section contains runnable NumPy/PyTorch code. Lessons with code so far:</p><div class="grid c3">${lessons.map((l) => `<a class="lchip" href="#/lesson/${l.id}/3">${TL.icon('code', 16)}<span class="lchip-t">${TL.esc(l.title)}</span></a>`).join('') || '<p class="muted">Coming in the next round.</p>'}</div><p class="notice info" style="margin-top:16px">Graded coding exercises with starter code and solutions are planned for the next round.</p>`);
    return { title: 'Code lab', crumbs: [{ label: 'Code lab' }] };
  };
  TL.views.minigpt = TL.views.build = function (main) {
    const d = TL.domainById.build;
    const files = Object.keys(TL.code || {});
    page(main, `<h1>Build your own GPT: MiniGPT</h1><p class="lead">A 20-step project where you implement and train a small decoder-only Transformer from scratch in PyTorch, with no pretrained weights.</p>
      <ol class="prose">${['Dataset preparation', 'Tokenizer implementation', 'Vocabulary creation', 'Embedding layers', 'Positional information', 'Causal self-attention', 'Multi-head attention', 'Feed-forward network', 'Transformer block', 'Complete decoder-only model', 'Output logits', 'Cross-entropy loss', 'Training loop', 'AdamW optimizer', 'Validation', 'Checkpointing', 'Text generation', 'Sampling strategies', 'Model evaluation', 'Inference demonstration'].map((s) => `<li>${s}</li>`).join('')}</ol>
      <h2>Lessons</h2><div class="grid c3">${d.lessons.map((l) => TL.lessonChip(l)).join('')}</div>
      ${files.length ? `<h2>Source files</h2><ul>${files.map((f) => `<li><code>minigpt/${TL.esc(f)}</code></li>`).join('')}</ul>` : '<p class="notice info" style="margin-top:16px">The runnable MiniGPT source code (tokenizer, model, training loop, generation, tests and dataset script) is the next build step. The <code>minigpt/</code> folder in the ZIP holds the project plan.</p>'}`);
    return { title: 'MiniGPT', crumbs: [{ label: 'MiniGPT project' }] };
  };

  /* ---- resources ---- */
  TL.views.resources = function (main) {
    const R = TL.RESOURCES || [];
    const types = [...new Set(R.map((r) => r.type))];
    page(main, `<h1>External resources</h1><p class="lead">Supplementary material. The core content lives inside Transformer Lab.</p>${types.map((t) => `<h2>${t}s</h2><div class="refs-list">${R.filter((r) => r.type === t).map(TL.refHTML).join('')}</div>`).join('')}`, 'narrow');
    return { title: 'Resources', crumbs: [{ label: 'External resources' }] };
  };

  /* ---- notes ---- */
  TL.views.notes = function (main) {
    const bm = Object.keys(TL.state.bookmarks).filter((x) => TL.lessonById[x]);
    const notes = Object.entries(TL.state.notes).filter(([x]) => TL.lessonById[x]);
    page(main, `<h1>Bookmarks & notes</h1><h2>Bookmarks</h2>${bm.length ? `<div class="grid c3">${bm.map((x) => TL.lessonChip(TL.lessonById[x])).join('')}</div>` : '<p class="muted">Use the Bookmark button on any lesson.</p>'}
      <h2>Notes</h2>${notes.length ? notes.map(([x, n]) => `<div class="card" style="margin-bottom:10px"><a href="#/lesson/${x}#notes"><b>${TL.esc(TL.lessonById[x].title)}</b></a><p style="white-space:pre-wrap">${TL.esc(n)}</p></div>`).join('') : '<p class="muted">Notes you write at the bottom of lessons appear here.</p>'}`, 'narrow');
    return { title: 'Notes', crumbs: [{ label: 'Bookmarks & notes' }] };
  };

  /* ---- about ---- */
  TL.views.about = function (main) {
    const o = TL.overall();
    page(main, `<h1>About & progress</h1><p>${o.done}/${o.total} essential lessons complete (${Math.round(o.pct * 100)}%).</p>
      ${TL.DOMAINS.filter((d) => !d.virtual).map((d) => { const p = TL.domainProgress(d); return `<div class="row small" style="margin:6px 0"><span style="width:200px">${d.name}</span><div class="pbar" style="flex:1"><span style="width:${p.pct * 100}%"></span></div><span>${p.done}/${p.total}</span></div>`; }).join('')}
      <p class="small muted">Progress, notes and bookmarks are stored only in this browser (localStorage).</p><button class="btn" id="rst">Reset all progress</button>
      <h2>Honesty notes</h2><ul class="small"><li>Simulator and playground numbers come from small deterministic toy models, not trained LLMs.</li><li>Interview questions are designed for practice; they are not leaked questions from any company.</li><li>This is version 1: some lessons are “compact” starter lessons that will be expanded to all five levels.</li></ul>`, 'narrow');
    TL.$('#rst', main).onclick = () => { if (confirm('Reset all progress, notes and bookmarks?')) { TL.resetProgress(); TL.updateProgressPill(); TL.route(); } };
    return { title: 'About', crumbs: [{ label: 'About & progress' }] };
  };
})();
