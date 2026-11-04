/* Nested domain roadmaps + global prerequisite graph */
(function () {
  const TL = window.TL;

  function wrap(text, max) {
    const words = text.split(' '); const lines = []; let cur = '';
    words.forEach((w) => { if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
    if (cur) lines.push(cur);
    if (lines.length > 3) { lines.length = 3; lines[2] = lines[2].replace(/.{0,2}$/, '…'); }
    return lines;
  }

  /* layered DAG layout. nodes: lessons array; returns {pos: id->{x,y,col}, cols} */
  function layout(nodes, inSet) {
    const depth = {};
    const dep = (l) => {
      if (depth[l.id] !== undefined) return depth[l.id];
      depth[l.id] = 0; // cycle guard
      const ps = l.prereqs.filter((p) => inSet.has(p));
      depth[l.id] = ps.length ? 1 + Math.max(...ps.map((p) => dep(TL.lessonById[p]))) : 0;
      return depth[l.id];
    };
    nodes.forEach(dep);
    const cols = [];
    nodes.forEach((l) => { (cols[depth[l.id]] = cols[depth[l.id]] || []).push(l); });
    // barycenter ordering, two sweeps
    const rowOf = {};
    cols.forEach((c) => c.forEach((l, i) => (rowOf[l.id] = i)));
    for (let sweep = 0; sweep < 3; sweep++) {
      cols.forEach((c, ci) => {
        if (!ci) return;
        c.forEach((l) => { const ps = l.prereqs.filter((p) => inSet.has(p)); l._bc = ps.length ? ps.reduce((s, p) => s + rowOf[p], 0) / ps.length : rowOf[l.id]; });
        c.sort((a, b) => a._bc - b._bc || a.idx - b.idx);
        c.forEach((l, i) => (rowOf[l.id] = i));
      });
    }
    return { cols, depth, rowOf };
  }

  TL.views.domain = function (main, args) {
    const d = TL.domainById[args[0]];
    if (!d) return TL.views.notfound(main);
    if (d.id === 'interview') { TL.go('#/interview'); return {}; }
    const p = TL.domainProgress(d);
    const cur = TL.currentLesson();
    const next = d.lessons.find((l) => !TL.isDone(l.id) && l.track !== 'optional') || d.lessons[0];
    main.innerHTML = `<div class="page wide">
      <div class="row" style="gap:16px;align-items:flex-start">
        <span class="tp-icon" style="background:${d.color};width:58px;height:58px;border-radius:18px">${TL.icon(d.icon, 32)}</span>
        <div style="flex:1;min-width:260px"><h1 style="margin:0">${d.name}</h1><p class="lead" style="margin:.3em 0">${d.blurb}</p>
          <div class="row small"><span class="badge">${TL.icon('clock', 13)} ${TL.fmtMin(d.coreMinutes)} essential</span>${d.minutes > d.coreMinutes ? `<span class="badge optional">+${TL.fmtMin(d.minutes - d.coreMinutes)} optional</span>` : ''}<span class="badge">${d.lessons.length} lessons</span>
          <div class="pbar" style="width:180px"><span style="width:${p.pct * 100}%"></span></div><span>${p.done}/${p.total} essential done</span></div>
          ${d.prereqDomains.length ? `<div class="row small" style="margin-top:8px"><span class="muted">Builds on:</span>${d.prereqDomains.map((x) => { const dd = TL.domainById[x]; return `<a class="dchip" href="#/domain/${x}"><span class="ic" style="background:${dd.color}">${TL.icon(dd.icon, 13)}</span>${dd.short}</a>`; }).join('')}</div>` : ''}
        </div>
        <a class="btn primary" href="#/lesson/${next.id}">${TL.icon('play', 15)} ${p.done ? 'Continue' : 'Start'}: ${TL.esc(next.title)}</a>
      </div>
      <div class="scene" style="margin-top:16px" id="rm-scene"></div>
      <div class="legend" style="margin:10px 4px 0">
        <span><i style="background:var(--done)"></i>Completed</span><span><i style="background:var(--cur)"></i>Current</span>
        <span><i style="background:var(--card);border:3px solid ${d.color}"></i>Recommended next (prereqs met)</span>
        <span><i style="background:var(--card);border:2px dotted var(--lock)"></i>Prerequisites pending</span>
        <span><i style="background:var(--card);border:2px dashed var(--ink3)"></i>Optional / advanced</span>
        <span>┄ from another domain</span><span class="muted">Topics in the same column can be learned in parallel. Hover to trace prerequisites.</span>
      </div>
      <h2>Learning order</h2>
      <div class="grid c3">${d.lessons.map((l, i) => `<div>${TL.lessonChip(l)}<div class="small muted" style="padding:3px 4px 0 34px">${l.prereqs.length ? 'Needs: ' + l.prereqs.map((x) => TL.esc(TL.lessonById[x].title)).join(', ') : 'No prerequisites'}</div></div>`).join('')}</div>
    </div>`;
    drawRoadmap(TL.$('#rm-scene', main), d);
    return { title: d.name, crumbs: [{ label: d.short, href: `#/domain/${d.id}` }] };
  };

  function drawRoadmap(scene, d) {
    const nodes = d.lessons;
    const inSet = new Set(nodes.map((l) => l.id));
    const { cols } = layout(nodes, inSet);
    const ext = [];
    nodes.forEach((l) => l.prereqs.forEach((p) => { if (!inSet.has(p) && !ext.includes(p)) ext.push(p); }));
    const colW = 200, rowH = 112, padX = 90, padY = 70;
    const extW = ext.length ? 210 : 0;
    const maxRows = Math.max(...cols.map((c) => c.length), Math.ceil(ext.length * 0.62));
    const W = Math.max(700, extW + padX + (cols.length - 1) * colW + padX + 40);
    const H = padY + maxRows * rowH + 20;
    const svg = TL.svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'rm-svg', role: 'group', 'aria-label': `${d.name} roadmap` });
    scene.appendChild(svg);
    const pos = {};
    cols.forEach((c, ci) => {
      const off = (maxRows - c.length) * rowH / 2;
      c.forEach((l, ri) => (pos[l.id] = { x: extW + padX + ci * colW, y: padY + off + ri * rowH + rowH / 2 - 20 }));
    });
    const extH = rowH * 0.62;
    const extOff = (maxRows * rowH - ext.length * extH) / 2;
    ext.forEach((id, i) => (pos[id] = { x: 100, y: padY + extOff + i * extH + extH / 2 - 20, ext: true }));
    // stage header + column guides
    cols.forEach((c, ci) => {
      const x = extW + padX + ci * colW;
      TL.svgEl('rect', { x: x - colW / 2 + 8, y: 12, width: colW - 16, height: H - 20, rx: 16, fill: 'var(--bg2)', opacity: ci % 2 ? .35 : .6 }, svg);
      const t = TL.svgEl('text', { x, y: 36, 'text-anchor': 'middle', class: 'rm-sub', style: 'font-weight:700;letter-spacing:.05em' }, svg);
      t.textContent = `STAGE ${ci + 1}${c.length > 1 ? ' · parallel' : ''}`;
    });
    if (ext.length) { const t = TL.svgEl('text', { x: 100, y: 36, 'text-anchor': 'middle', class: 'rm-sub', style: 'font-weight:700;letter-spacing:.05em' }, svg); t.textContent = 'FROM EARLIER DOMAINS'; }
    const edgeG = TL.svgEl('g', {}, svg), nodeG = TL.svgEl('g', {}, svg);
    const edges = [];
    nodes.forEach((l) => l.prereqs.forEach((p) => {
      const a = pos[p], b = pos[l.id]; if (!a || !b) return;
      const r1 = a.ext ? 78 : 24, r2 = 26;
      const x1 = a.x + r1, x2 = b.x - r2, mx = (x1 + x2) / 2;
      const dd = `M ${x1} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${x2} ${b.y}`;
      const e = TL.svgEl('path', { d: dd, class: `rm-edge ${a.ext ? 'ext' : ''} ${TL.isDone(p) ? 'done' : ''}`, 'marker-end': 'url(#arrow)' }, edgeG);
      edges.push({ from: p, to: l.id, el: e });
    }));
    const defs = TL.svgEl('defs', {}, svg);
    defs.innerHTML = '<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="var(--ink3)"/></marker>';
    const cur = TL.currentLesson();
    const nodeEls = {};
    ext.forEach((id) => {
      const l = TL.lessonById[id], dd = TL.domainById[l.domain], p = pos[id];
      const g = TL.svgEl('g', { class: 'rm-node', tabindex: '0', role: 'link', 'data-click': '1', 'aria-label': `Prerequisite from ${dd.name}: ${l.title}` }, nodeG);
      TL.svgEl('rect', { x: p.x - 80, y: p.y - 19, width: 160, height: 38, rx: 19, fill: 'var(--card)', stroke: dd.color, 'stroke-width': 2, 'stroke-dasharray': '5 4', class: 'rm-c' }, g);
      TL.svgEl('circle', { cx: p.x - 62, cy: p.y, r: 11, fill: TL.isDone(id) ? 'var(--done)' : dd.color }, g);
      const t = TL.svgEl('text', { x: p.x - 45, y: p.y + 4, class: 'rm-label', style: 'font-size:11.5px' }, g);
      t.textContent = l.title.length > 21 ? l.title.slice(0, 20) + '…' : l.title;
      const tt = TL.svgEl('title', {}, g); tt.textContent = `${dd.name} › ${l.title}`;
      nodeEls[id] = g; bind(g, id);
    });
    nodes.forEach((l, i) => {
      const p = pos[l.id];
      const st = TL.lessonStatus(l);
      const isCur = cur && cur.id === l.id;
      const g = TL.svgEl('g', { class: 'rm-node', tabindex: '0', role: 'link', 'data-click': '1', 'aria-label': `${l.title}, ${l.minutes} minutes, ${TL.statusLabel[isCur ? 'current' : st]}` }, nodeG);
      if (isCur) TL.svgEl('circle', { cx: p.x, cy: p.y, r: 27, fill: 'none', stroke: 'var(--cur)', 'stroke-width': 4, class: 'pulse' }, g);
      const fill = st === 'done' ? 'var(--done)' : isCur ? 'var(--cur)' : 'var(--card)';
      const stroke = st === 'done' ? 'var(--done)' : isCur ? 'var(--cur)' : st === 'ready' ? d.color : 'var(--lock)';
      TL.svgEl('circle', { cx: p.x, cy: p.y, r: 24, fill, stroke, 'stroke-width': st === 'locked' ? 2.5 : 3.5, 'stroke-dasharray': l.track === 'optional' ? '6 4' : st === 'locked' ? '2 4' : '', class: 'rm-c' }, g);
      if (st === 'done') TL.svgEl('path', { d: `M ${p.x - 9} ${p.y} l 6 6 l 12 -12`, stroke: '#fff', 'stroke-width': 3.5, fill: 'none', 'stroke-linecap': 'round' }, g);
      else { const num = TL.svgEl('text', { x: p.x, y: p.y + 5, 'text-anchor': 'middle', style: `font:800 14px var(--sans);fill:${isCur ? '#fff' : st === 'ready' ? d.color : 'var(--ink3)'}` }, g); num.textContent = i + 1; }
      const lines = wrap(l.title, 22);
      lines.forEach((ln, k) => { const t = TL.svgEl('text', { x: p.x, y: p.y + 42 + k * 15, 'text-anchor': 'middle', class: 'rm-label' }, g); t.textContent = ln; });
      const sub = TL.svgEl('text', { x: p.x, y: p.y + 42 + lines.length * 15 + 1, 'text-anchor': 'middle', class: 'rm-sub' }, g);
      sub.textContent = `${l.minutes} min${l.track === 'optional' ? ' · optional' : ''}${l.depth === 'compact' ? ' · compact' : ''}`;
      const tt = TL.svgEl('title', {}, g); tt.textContent = `${l.title}\n${TL.statusLabel[isCur ? 'current' : st]}. Click to open the lesson.`;
      nodeEls[l.id] = g; bind(g, l.id);
    });
    function bind(g, id) {
      g.addEventListener('click', () => TL.go(`#/lesson/${id}`));
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter') TL.go(`#/lesson/${id}`); });
      g.addEventListener('mouseenter', () => hl(id)); g.addEventListener('focus', () => hl(id));
      g.addEventListener('mouseleave', () => hl(null)); g.addEventListener('blur', () => hl(null));
    }
    function hl(id) {
      svg.classList.toggle('rm-hl', !!id);
      Object.values(nodeEls).forEach((g) => g.classList.remove('hl'));
      edges.forEach((e) => e.el.classList.remove('hl'));
      if (!id) return;
      const up = new Set([id]), down = new Set([id]);
      let changed = true;
      while (changed) { changed = false; edges.forEach((e) => { if (up.has(e.to) && !up.has(e.from)) { up.add(e.from); changed = true; } if (down.has(e.from) && !down.has(e.to)) { down.add(e.to); changed = true; } }); }
      [...up, ...down].forEach((x) => nodeEls[x] && nodeEls[x].classList.add('hl'));
      edges.forEach((e) => { if ((up.has(e.to) && up.has(e.from)) || (down.has(e.from) && down.has(e.to))) e.el.classList.add('hl'); });
    }
    const pz = TL.panZoom(svg, { min: 0.8, max: 3 });
    scene.appendChild(TL.zoomControls(pz));
  }

  /* -------- global prerequisite graph -------- */
  TL.views.graph = function (main) {
    main.innerHTML = `<div class="page wide"><h1>Prerequisite graph</h1>
      <p class="lead">Every lesson in the curriculum, laid out left to right by dependency depth and coloured by domain. Hover a node to trace what it needs (upstream) and what it unlocks (downstream). Click to open the lesson.</p>
      <div class="legend" style="margin:8px 0 12px">${TL.DOMAINS.filter((d) => !d.virtual).map((d) => `<span><i style="background:${d.color}"></i>${d.short}</span>`).join('')}</div>
      <div class="scene" id="g-scene"></div></div>`;
    const all = TL.lessons, inSet = new Set(all.map((l) => l.id));
    const { cols } = layout(all, inSet);
    cols.forEach((c) => c.sort((a, b) => TL.domainById[a.domain].idx - TL.domainById[b.domain].idx || a.idx - b.idx));
    const colW = 175, rowH = 30, pad = 30;
    const maxRows = Math.max(...cols.map((c) => c.length));
    const W = pad * 2 + cols.length * colW, H = pad * 2 + maxRows * rowH;
    const scene = TL.$('#g-scene', main);
    const svg = TL.svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'rm-svg', style: `min-height:520px;max-height:80vh`, role: 'group', 'aria-label': 'Prerequisite graph' });
    scene.appendChild(svg);
    const pos = {};
    cols.forEach((c, ci) => c.forEach((l, ri) => (pos[l.id] = { x: pad + ci * colW + 10, y: pad + (maxRows - c.length) * rowH / 2 + ri * rowH + 10 })));
    const eg = TL.svgEl('g', {}, svg), ng = TL.svgEl('g', {}, svg);
    const edges = [], els = {};
    all.forEach((l) => l.prereqs.forEach((p) => {
      const a = pos[p], b = pos[l.id]; const mx = (a.x + b.x) / 2;
      edges.push({ from: p, to: l.id, el: TL.svgEl('path', { d: `M ${a.x + 7} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x - 7} ${b.y}`, class: 'rm-edge', style: 'stroke-width:1.2;opacity:.28' }, eg) });
    }));
    all.forEach((l) => {
      const p = pos[l.id], dm = TL.domainById[l.domain];
      const g = TL.svgEl('g', { class: 'rm-node', 'data-click': '1', tabindex: '0', role: 'link', 'aria-label': l.title }, ng);
      TL.svgEl('circle', { cx: p.x, cy: p.y, r: 7, fill: TL.isDone(l.id) ? dm.color : 'var(--card)', stroke: dm.color, 'stroke-width': 2.5 }, g);
      const t = TL.svgEl('text', { x: p.x + 11, y: p.y + 4, class: 'rm-label', style: 'font-size:10.5px;font-weight:500' }, g);
      t.textContent = l.title.length > 24 ? l.title.slice(0, 23) + '…' : l.title;
      const tt = TL.svgEl('title', {}, g); tt.textContent = `${dm.short} › ${l.title}`;
      els[l.id] = g;
      g.addEventListener('click', () => TL.go(`#/lesson/${l.id}`));
      g.addEventListener('mouseenter', () => hl(l.id)); g.addEventListener('mouseleave', () => hl(null));
    });
    function hl(id) {
      svg.classList.toggle('rm-hl', !!id);
      Object.values(els).forEach((g) => g.classList.remove('hl')); edges.forEach((e) => { e.el.classList.remove('hl'); e.el.style.opacity = id ? '' : '.28'; });
      if (!id) return;
      const up = new Set([id]), down = new Set([id]); let ch = true;
      while (ch) { ch = false; edges.forEach((e) => { if (up.has(e.to) && !up.has(e.from)) { up.add(e.from); ch = true; } if (down.has(e.from) && !down.has(e.to)) { down.add(e.to); ch = true; } }); }
      [...up, ...down].forEach((x) => els[x].classList.add('hl'));
      edges.forEach((e) => { if ((up.has(e.to) && up.has(e.from)) || (down.has(e.from) && down.has(e.to))) e.el.classList.add('hl'); });
    }
    const pz = TL.panZoom(svg, { min: 0.6, max: 5 });
    scene.appendChild(TL.zoomControls(pz));
    return { title: 'Prerequisite graph', crumbs: [{ label: 'Prerequisite graph' }] };
  };
})();
