/* Dashboards: A) The Learning Road  B) The Real Learning Tree */
(function () {
  const TL = window.TL;

  /* Catmull-Rom spline through points -> smooth cubic Bézier path */
  function smoothPath(pts, tension = 0.5) {
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) * tension / 3, p1[1] + (p2[1] - p0[1]) * tension / 3];
      const c2 = [p2[0] - (p3[0] - p1[0]) * tension / 3, p2[1] - (p3[1] - p1[1]) * tension / 3];
      d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0]} ${p2[1]}`;
    }
    return d;
  }
  TL.smoothPath = smoothPath;

  const domainMinutes = (d) => d.id === 'interview' ? TL.interview.length * 25 : d.coreMinutes;
  const hrs = (m) => (m >= 60 ? `≈ ${Math.round(m / 6) / 10} h` : `${m} min`);

  function dashHeader(kind) {
    const o = TL.overall();
    const cur = TL.currentLesson();
    return `<div class="dash-head">
      <div><h1>${kind === 'road' ? 'The Learning Road' : 'The Learning Tree'}</h1>
      <div class="sub">${kind === 'road' ? 'From software engineer to LLM engineer. Start with the Software → AI translation guide, then click any milestone to open its roadmap.' : 'Every branch is a learning domain, every leaf a lesson. Click a branch or fruit to explore it.'}</div></div>
      <div class="spacer"></div>
      <div class="dash-stats">
        <span class="stat"><b>${Math.round(o.pct * 100)}%</b>complete</span>
        <span class="stat"><b>${o.done}/${o.total}</b>essential lessons</span>
        <span class="stat"><b>${Math.round(o.minutesDone / 60)}/${Math.round(o.minutes / 60)} h</b>studied</span>
      </div>
      ${cur ? `<a class="btn primary" href="#/lesson/${cur.id}">${TL.icon('play', 15)} ${o.done ? 'Continue' : 'Start'}: ${TL.esc(cur.title)}</a>` : ''}
      <div class="seg" role="tablist" aria-label="Dashboard style">
        <a href="#/road" class="${kind === 'road' ? 'on' : ''}" role="tab" aria-selected="${kind === 'road'}">${TL.icon('road', 16)} Road</a>
        <a href="#/tree" class="${kind === 'tree' ? 'on' : ''}" role="tab" aria-selected="${kind === 'tree'}">${TL.icon('tree', 16)} Tree</a>
        <a href="#/map" role="tab" aria-selected="false">${TL.icon('graph', 16)} Course Map</a>
      </div>
    </div>`;
  }

  /* ================= ROAD ================= */
  TL.views.road = function (main) {
    TL.state.dashboard = 'road'; TL.save();
    main.innerHTML = `<div class="dash">${dashHeader('road')}<div class="scene" id="road-scene"></div></div>`;
    const scene = TL.$('#road-scene', main);
    const draw = () => { scene.innerHTML = ''; drawRoad(scene, scene.clientWidth < 700); };
    draw();
    let lastMobile = scene.clientWidth < 700;
    const onResize = () => { const m = scene.clientWidth < 700; if (m !== lastMobile) { lastMobile = m; draw(); } };
    window.addEventListener('resize', onResize);
    TL.onCleanup(() => window.removeEventListener('resize', onResize));
    return { title: 'Learning Road' };
  };

  function drawRoad(scene, mobile) {
    const W = mobile ? 440 : 1400, H = mobile ? 1780 : 800;
    const svg = TL.svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'road-svg', role: 'img', 'aria-label': 'Winding road of learning milestones', preserveAspectRatio: 'xMidYMid meet' });
    scene.appendChild(svg);
    const defs = TL.svgEl('defs', {}, svg);
    defs.innerHTML = `
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--sky1)"/><stop offset="1" stop-color="var(--sky2)"/></linearGradient>
      <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--grass1)"/><stop offset="1" stop-color="var(--grass2)"/></linearGradient>
      <linearGradient id="trav" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#22c55e"/><stop offset="1" stop-color="#14b8a6"/></linearGradient>
      <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity=".22"/></filter>`;
    // background
    TL.svgEl('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#grass)' }, svg);
    const bg = TL.svgEl('g', { 'aria-hidden': 'true' }, svg);
    if (!mobile) {
      TL.svgEl('rect', { x: 0, y: 0, width: W, height: 120, fill: 'url(#sky)' }, bg);
      TL.svgEl('path', { d: `M0 120 Q 200 70 420 112 T 860 100 T 1400 108 V 150 H 0 Z`, fill: 'var(--hill)', opacity: .9 }, bg);
      TL.svgEl('circle', { cx: 1290, cy: 52, r: 26, fill: '#fde68a', opacity: .9 }, bg);
      [[160, 46], [560, 36], [980, 58]].forEach(([x, y]) => {
        const c = TL.svgEl('g', { fill: '#fff', opacity: .85 }, bg);
        [[0, 0, 18], [20, -6, 22], [42, 0, 16]].forEach(([dx, dy, r]) => TL.svgEl('circle', { cx: x + dx, cy: y + dy, r }, c));
      });
    } else {
      TL.svgEl('rect', { x: 0, y: 0, width: W, height: 90, fill: 'url(#sky)' }, bg);
      TL.svgEl('circle', { cx: 380, cy: 40, r: 20, fill: '#fde68a', opacity: .9 }, bg);
    }
    // decorative trees & ponds (seeded positions)
    let seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const deco = mobile
      ? [[30, 300], [410, 520], [25, 760], [415, 980], [30, 1230], [410, 1460], [400, 200], [35, 1600]]
      : [[100, 560], [1330, 560], [620, 580], [980, 350], [300, 350], [1330, 340], [70, 160], [700, 165], [1060, 175], [420, 600], [1200, 760], [40, 780], [860, 770]];
    deco.forEach(([x, y]) => {
      const s = 0.75 + rnd() * 0.5;
      const g = TL.svgEl('g', { transform: `translate(${x} ${y}) scale(${s})`, opacity: .9 }, bg);
      TL.svgEl('rect', { x: -3, y: 0, width: 6, height: 16, rx: 2, fill: 'var(--trunk)' }, g);
      TL.svgEl('circle', { cx: 0, cy: -6, r: 15, fill: 'var(--leaf1)' }, g);
      TL.svgEl('circle', { cx: -8, cy: -1, r: 10, fill: 'var(--leaf2)' }, g);
      TL.svgEl('circle', { cx: 7, cy: -12, r: 9, fill: 'var(--leaf3)' }, g);
    });

    // road waypoints
    let wp;
    if (mobile) {
      wp = [];
      for (let i = 0; i <= 13; i++) wp.push([i % 2 ? 330 : 110, 70 + i * 128]);
    } else {
      wp = [[50, 715], [330, 700], [640, 718], [950, 700], [1215, 690], [1335, 600], [1225, 482], [930, 468], [620, 486], [330, 470], [120, 420], [120, 300], [330, 250], [640, 265], [950, 245], [1200, 230], [1345, 165]];
    }
    const d = smoothPath(wp);
    const road = TL.svgEl('g', {}, svg);
    TL.svgEl('path', { d, fill: 'none', stroke: 'rgba(0,0,0,.18)', 'stroke-width': mobile ? 64 : 70, 'stroke-linecap': 'round', transform: 'translate(0 5)' }, road);
    TL.svgEl('path', { d, fill: 'none', stroke: 'var(--roadedge)', 'stroke-width': mobile ? 60 : 66, 'stroke-linecap': 'round' }, road);
    TL.svgEl('path', { d, fill: 'none', stroke: 'var(--road)', 'stroke-width': mobile ? 50 : 56, 'stroke-linecap': 'round' }, road);
    const pathEl = TL.svgEl('path', { d, fill: 'none', stroke: '#fde68a', 'stroke-width': 3.5, 'stroke-dasharray': '18 16', 'stroke-linecap': 'round', opacity: .9 }, road);
    const total = pathEl.getTotalLength();

    // milestones
    const nodes = [{ id: 'start', name: 'START', icon: 'flag', color: '#64748b' }, ...TL.DOMAINS, { id: 'finish', name: 'FINISH', icon: 'trophy', color: '#e11d48' }];
    const n = nodes.length;
    const pos = nodes.map((_, i) => {
      const L = total * (0.012 + 0.976 * i / (n - 1));
      const pt = pathEl.getPointAtLength(L);
      return { L, x: pt.x, y: pt.y };
    });
    // traveled overlay: up to the current domain milestone
    const statuses = TL.DOMAINS.map((dm) => TL.domainStatus(dm));
    let curIdx = statuses.findIndex((s) => s !== 'done');
    const allDone = curIdx === -1;
    const markerIdx = allDone ? n - 1 : curIdx + 1;
    const travelLen = pos[markerIdx].L;
    TL.svgEl('path', { d, fill: 'none', stroke: 'url(#trav)', 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-dasharray': `${travelLen} ${total + 10}`, opacity: .95 }, road);

    const msLayer = TL.svgEl('g', {}, svg);
    nodes.forEach((nd, i) => {
      const p = pos[i];
      const isEnd = nd.id === 'start' || nd.id === 'finish';
      const st = isEnd ? (nd.id === 'start' ? 'done' : (allDone ? 'done' : 'upcoming')) : statuses[i - 1];
      const g = TL.svgEl('g', { class: `ms ${st}`, transform: `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})` }, msLayer);
      const r = isEnd ? 22 : (mobile ? 30 : 33);
      const lift = mobile ? 0 : (isEnd ? 0 : -62);
      if (!isEnd) {
        g.setAttribute('tabindex', '0'); g.setAttribute('role', 'link'); g.setAttribute('data-click', '1');
        const href = nd.id === 'interview' ? '#/interview' : `#/domain/${nd.id}`;
        g.setAttribute('aria-label', `${nd.name}: ${TL.statusLabel[st] || st}, ${hrs(domainMinutes(nd))}`);
        g.addEventListener('click', () => TL.go(href));
        g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); TL.go(href); } });
        const t = TL.svgEl('title', {}, g); t.textContent = `${nd.name}\n${nd.blurb}`;
      }
      if (lift) {
        TL.svgEl('line', { x1: 0, y1: 0, x2: 0, y2: lift + r - 4, stroke: 'var(--ink3)', 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
        TL.svgEl('circle', { cx: 0, cy: 0, r: 5, fill: 'var(--ink3)' }, g);
      }
      const disc = TL.svgEl('g', { class: 'ms-disc', transform: `translate(0 ${lift})` }, g);
      if (st === 'current' && !isEnd) TL.svgEl('circle', { r: r + 4, fill: 'none', stroke: 'var(--cur)', 'stroke-width': 4, class: 'pulse' }, disc);
      TL.svgEl('circle', { r: r + 4, fill: 'var(--card)', filter: 'url(#soft)', class: 'ms-ring', stroke: st === 'current' ? 'var(--cur)' : 'transparent', 'stroke-width': 3 }, disc);
      TL.svgEl('circle', { r, fill: nd.color }, disc);
      const ic = TL.svgEl('svg', { x: -r * 0.58, y: -r * 0.58, width: r * 1.16, height: r * 1.16, viewBox: '0 0 24 24', fill: 'none', stroke: '#fff', 'stroke-width': 1.9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, disc);
      ic.innerHTML = TL.iconPaths[nd.icon];
      if (st === 'done' && !isEnd) {
        const b = TL.svgEl('g', { transform: `translate(${r * 0.72} ${-r * 0.72})` }, disc);
        TL.svgEl('circle', { r: 11, fill: 'var(--done)', stroke: 'var(--card)', 'stroke-width': 2.5 }, b);
        TL.svgEl('path', { d: 'M-5 0l3.5 3.5L5-3.5', stroke: '#fff', 'stroke-width': 2.5, fill: 'none', 'stroke-linecap': 'round' }, b);
      }
      // labels
      let lx = 0, ly, anchor = 'middle';
      if (mobile) { anchor = p.x < W / 2 ? 'start' : 'end'; lx = anchor === 'start' ? r + 12 : -(r + 12); ly = -4; }
      else ly = isEnd ? 44 : 50;
      const label = TL.svgEl('text', { x: lx, y: ly, 'text-anchor': anchor, class: 'ms-label' }, g);
      label.textContent = nd.short || nd.name;
      if (!isEnd) {
        const tt = TL.svgEl('text', { x: lx, y: ly + 17, 'text-anchor': anchor, class: 'ms-time' }, g);
        const prog = nd.id === 'interview' ? '' : (() => { const pp = TL.domainProgress(nd); return ` · ${pp.done}/${pp.total}`; })();
        tt.textContent = `${hrs(domainMinutes(nd))}${prog}`;
      }
    });
    // "you are here" marker: a little robot car on the road
    const mp = pos[markerIdx];
    const car = TL.svgEl('g', { transform: `translate(${mp.x - (mobile ? 0 : 0)} ${mp.y + (mobile ? 0 : 0)})`, 'pointer-events': 'none' }, svg);
    const tag = TL.svgEl('g', { transform: mobile ? 'translate(0 -48)' : 'translate(0 -128)' }, car);
    if (!mobile) {
      TL.svgEl('rect', { x: -52, y: -15, width: 104, height: 26, rx: 13, fill: 'var(--cur)' }, tag);
      const tx = TL.svgEl('text', { x: 0, y: 3, 'text-anchor': 'middle', fill: '#fff', style: 'font:800 12px var(--sans)' }, tag);
      tx.textContent = allDone ? 'Journey complete!' : 'YOU ARE HERE';
    }
    TL.svgEl('rect', { x: -15, y: -11, width: 30, height: 20, rx: 6, fill: '#f8fafc', stroke: '#1e293b', 'stroke-width': 2 }, car);
    TL.svgEl('circle', { cx: -6, cy: -2, r: 2.6, fill: '#1e293b' }, car);
    TL.svgEl('circle', { cx: 6, cy: -2, r: 2.6, fill: '#1e293b' }, car);
    TL.svgEl('circle', { cx: -9, cy: 11, r: 4, fill: '#1e293b' }, car);
    TL.svgEl('circle', { cx: 9, cy: 11, r: 4, fill: '#1e293b' }, car);
    TL.svgEl('line', { x1: 0, y1: -11, x2: 0, y2: -18, stroke: '#1e293b', 'stroke-width': 2 }, car);
    TL.svgEl('circle', { cx: 0, cy: -19, r: 2.5, fill: '#f59e0b' }, car);

    const pz = TL.panZoom(svg, { min: 0.8, max: 3.5 });
    scene.appendChild(TL.zoomControls(pz));
    const lg = document.createElement('div');
    lg.className = 'legend road-legend';
    lg.innerHTML = `<span><i style="background:var(--done)"></i>Completed</span><span><i style="background:var(--cur)"></i>Current</span><span><i style="background:var(--lock)"></i>Upcoming</span><span class="muted">Drag to pan · Ctrl+scroll to zoom</span>`;
    scene.appendChild(lg);
  }

  /* ================= TREE ================= */
  TL.views.tree = function (main, args, query) {
    TL.state.dashboard = 'tree'; TL.save();
    main.innerHTML = `<div class="dash">${dashHeader('tree')}<div class="tree-wrap"><div class="scene" id="tree-scene"></div><aside class="tree-panel" id="tree-panel" aria-live="polite"></aside></div></div>`;
    const scene = TL.$('#tree-scene', main), panel = TL.$('#tree-panel', main);
    const api = drawTree(scene, (id) => showPanel(id));
    function showPanel(id) {
      api.select(id);
      if (!id) { panel.innerHTML = overviewPanel(); bindPanel(); return; }
      const d = TL.domainById[id];
      TL.setQuery({ b: id });
      if (d.id === 'interview') {
        const cats = {};
        TL.interview.forEach((q) => (cats[q.cat] = (cats[q.cat] || 0) + 1));
        panel.innerHTML = `<h2><span class="tp-icon" style="background:${d.color}">${TL.icon(d.icon, 22)}</span>${d.name}</h2>
          <p class="muted small">${d.blurb}</p><p class="small">${TL.icon('clock', 15)} ${hrs(domainMinutes(d))} · ${TL.interview.length} questions</p>
          <div class="tp-list">${Object.entries(cats).map(([c, k]) => `<a class="lchip" href="#/interview?cat=${encodeURIComponent(c)}"><span class="lchip-dot" style="--c:${d.color}"></span><span class="lchip-t">${TL.esc(c)}</span><span class="lchip-m">${k}</span></a>`).join('')}</div>
          <p><a class="btn primary" href="#/interview">Open Interview Academy</a></p>`;
        return;
      }
      const p = TL.domainProgress(d);
      panel.innerHTML = `<h2><span class="tp-icon" style="background:${d.color}">${TL.icon(d.icon, 22)}</span>${d.name}</h2>
        <p class="muted small" style="margin:.2em 0 .6em">${d.blurb}</p>
        <div class="row small"><span>${TL.icon('clock', 15)} ${hrs(d.coreMinutes)} essential${d.minutes > d.coreMinutes ? ` · +${hrs(d.minutes - d.coreMinutes)} optional` : ''}</span></div>
        <div class="row small" style="margin:6px 0"><div class="pbar" style="flex:1"><span style="width:${p.pct * 100}%"></span></div><span>${p.done}/${p.total}</span></div>
        ${d.prereqDomains.length ? `<div class="small muted" style="margin-top:8px">Builds on</div><div class="tp-pre">${d.prereqDomains.map((x) => { const dd = TL.domainById[x]; return `<a class="dchip" href="#/tree?b=${x}" data-b="${x}"><span class="ic" style="background:${dd.color}">${TL.icon(dd.icon, 13)}</span>${dd.short}</a>`; }).join('')}</div>` : ''}
        <div class="tp-list">${d.lessons.map((l) => TL.lessonChip(l)).join('')}</div>
        <div class="row" style="margin-top:12px"><a class="btn primary sm" href="#/domain/${d.id}">${TL.icon('graph', 15)} Open roadmap</a><button class="btn sm" type="button" id="tp-close">Back to overview</button></div>`;
      bindPanel();
    }
    function overviewPanel() {
      return `<h2>${TL.icon('tree', 22)} Your learning tree</h2>
        <p class="small muted">Branches grow left to right in the recommended order. Leaves are lessons: <b style="color:var(--done)">coloured</b> leaves are complete, the <b style="color:var(--cur)">amber</b> leaf is your next lesson.</p>
        <div class="tp-list">${TL.DOMAINS.map((d) => { const p = d.id === 'interview' ? null : TL.domainProgress(d); return `<a class="lchip" href="#/tree?b=${d.id}" data-b="${d.id}"><span class="lchip-dot" style="--c:${d.color};background:${d.color}"></span><span class="lchip-t">${d.name}</span><span class="lchip-m">${p ? `${p.done}/${p.total}` : TL.interview.length + ' Qs'}</span></a>`; }).join('')}</div>
        <p style="margin-top:12px"><a class="btn sm" href="#/directory">${TL.icon('list', 15)} Full topic directory</a></p>`;
    }
    function bindPanel() {
      TL.$$('[data-b]', panel).forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); showPanel(a.dataset.b); }));
      const c = TL.$('#tp-close', panel); if (c) c.onclick = () => { TL.setQuery({}); showPanel(null); };
    }
    showPanel(query.b && TL.domainById[query.b] ? query.b : null);
    return { title: 'Learning Tree' };
  };

  function drawTree(scene, onSelect) {
    const W = 1000, H = 650;
    const svg = TL.svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'tree-svg', role: 'img', 'aria-label': 'Illustrated learning tree', preserveAspectRatio: 'xMidYMid meet' });
    scene.appendChild(svg);
    const defs = TL.svgEl('defs', {}, svg);
    defs.innerHTML = `<linearGradient id="tsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--sky1)"/><stop offset="1" stop-color="var(--card)"/></linearGradient>
      <linearGradient id="bark" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--trunk2)"/><stop offset=".45" stop-color="var(--trunk)"/><stop offset="1" stop-color="var(--trunk2)"/></linearGradient>
      <radialGradient id="canopy" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="var(--leaf3)" stop-opacity=".55"/><stop offset="1" stop-color="var(--leaf1)" stop-opacity=".35"/></radialGradient>
      <filter id="fsh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-opacity=".25"/></filter>`;
    TL.svgEl('rect', { width: W, height: H, fill: 'url(#tsky)' }, svg);
    TL.svgEl('ellipse', { cx: 500, cy: 636, rx: 330, ry: 26, fill: 'var(--ground)' }, svg);
    TL.svgEl('ellipse', { cx: 500, cy: 640, rx: 180, ry: 12, fill: 'var(--grass2)', opacity: .7 }, svg);

    // canopy blobs (behind everything)
    const can = TL.svgEl('g', { 'aria-hidden': 'true' }, svg);
    const blobs = [[500, 250, 250, 175], [330, 300, 150, 110], [670, 300, 150, 110], [400, 165, 130, 95], [600, 165, 130, 95], [500, 120, 110, 75], [250, 350, 95, 65], [750, 350, 95, 65]];
    blobs.forEach(([cx, cy, rx, ry], i) => TL.svgEl('ellipse', { cx, cy, rx, ry, fill: i % 2 ? 'var(--leaf1)' : 'var(--leaf3)', opacity: .26 }, can));
    TL.svgEl('ellipse', { cx: 500, cy: 255, rx: 395, ry: 225, fill: 'url(#canopy)' }, can);

    // trunk + roots
    const tg = TL.svgEl('g', { 'aria-hidden': 'true' }, svg);
    TL.svgEl('path', { d: 'M 452 640 C 470 600, 478 520, 474 455 C 471 420, 478 395, 488 382 L 512 382 C 522 395, 529 420, 526 455 C 522 520, 530 600, 548 640 Z', fill: 'url(#bark)' }, tg);
    ['M 470 628 C 440 632, 410 640, 380 642', 'M 530 628 C 560 632, 590 640, 622 642', 'M 492 630 C 488 636, 480 642, 470 646', 'M 508 630 C 514 638, 522 643, 534 646'].forEach((dd) =>
      TL.svgEl('path', { d: dd, stroke: 'var(--trunk2)', 'stroke-width': 7, fill: 'none', 'stroke-linecap': 'round' }, tg));
    ['M 492 600 C 488 560, 490 520, 494 480', 'M 510 590 C 512 550, 508 520, 506 470'].forEach((dd) =>
      TL.svgEl('path', { d: dd, stroke: 'var(--trunk2)', 'stroke-width': 2, fill: 'none', opacity: .55, 'stroke-linecap': 'round' }, tg));

    // fruits on an arch
    const N = TL.DOMAINS.length;
    const cx = 500, cy = 330, rx = 395, ry = 245;
    const branchLayer = TL.svgEl('g', {}, svg);
    const cur = TL.currentLesson();
    const groups = {};
    TL.DOMAINS.forEach((d, i) => {
      const th = (196 - (212 * i) / (N - 1)) * Math.PI / 180;
      const fx = cx + rx * Math.cos(th), fy = cy - ry * Math.sin(th) + (Math.abs(Math.cos(th)) > .8 ? -10 : 0);
      const ox = 500 + (fx - 500) * 0.04, oy = 395 - Math.max(0, (fy < 200 ? 30 : 10));
      const midx = 500 + (fx - 500) * 0.45, midy = oy - 40 - (395 - fy) * 0.25;
      const dd = `M ${ox.toFixed(1)} ${oy} Q ${midx.toFixed(1)} ${midy.toFixed(1)}, ${fx.toFixed(1)} ${fy.toFixed(1)}`;
      const g = TL.svgEl('g', { class: 'branch', tabindex: '0', role: 'button', 'data-click': '1', 'aria-label': `${d.name} branch`, style: `--bc:${d.color}` }, branchLayer);
      groups[d.id] = g;
      TL.svgEl('path', { d: dd, stroke: 'var(--trunk2)', 'stroke-width': 13, fill: 'none', 'stroke-linecap': 'round', class: 'limb' }, g);
      const limb = TL.svgEl('path', { d: dd, stroke: 'var(--trunk)', 'stroke-width': 8, fill: 'none', 'stroke-linecap': 'round' }, g);
      // leaves = lessons
      const lessons = d.id === 'interview' ? [] : d.lessons;
      const len = limb.getTotalLength();
      lessons.forEach((l, k) => {
        const t = 0.3 + 0.58 * (k + 0.5) / lessons.length;
        const p = limb.getPointAtLength(len * t), p2 = limb.getPointAtLength(Math.min(len, len * t + 1));
        const ang = Math.atan2(p2.y - p.y, p2.x - p.x) * 180 / Math.PI;
        const side = k % 2 ? 1 : -1;
        const st = TL.lessonStatus(l);
        const isCur = cur && cur.id === l.id;
        const fill = isCur ? 'var(--cur)' : st === 'done' ? d.color : 'var(--leaf3)';
        const lf = TL.svgEl('g', { transform: `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${(ang + side * 55).toFixed(1)})`, class: 'leaf', 'data-click': '1' }, g);
        TL.svgEl('path', { d: 'M0 0 C 5 -7, 16 -7, 22 0 C 16 7, 5 7, 0 0 Z', fill, stroke: st === 'done' || isCur ? 'rgba(0,0,0,.25)' : 'var(--leaf2)', 'stroke-width': 1, opacity: st === 'locked' && !isCur ? .75 : 1 }, lf);
        TL.svgEl('path', { d: 'M1 0 H 19', stroke: 'rgba(0,0,0,.2)', 'stroke-width': .8 }, lf);
        const tt = TL.svgEl('title', {}, lf); tt.textContent = `${l.title} (${l.minutes} min) · ${TL.statusLabel[isCur ? 'current' : st]}. Click to open.`;
        lf.style.cursor = 'pointer';
        lf.addEventListener('click', (e) => { e.stopPropagation(); TL.go(`#/lesson/${l.id}`); });
      });
      // fruit
      const st = TL.domainStatus(d);
      const fr = TL.svgEl('g', { class: 'fruit', transform: `translate(${fx.toFixed(1)} ${fy.toFixed(1)})` }, g);
      if (st === 'current') TL.svgEl('circle', { r: 33, fill: 'none', stroke: 'var(--cur)', 'stroke-width': 4, class: 'pulse' }, fr);
      TL.svgEl('circle', { r: 31, fill: 'var(--card)', filter: 'url(#fsh)' }, fr);
      TL.svgEl('circle', { r: 27, fill: d.color, opacity: st === 'upcoming' ? .8 : 1 }, fr);
      TL.svgEl('ellipse', { cx: -9, cy: -11, rx: 8, ry: 5, fill: '#fff', opacity: .25, transform: 'rotate(-30 -9 -11)' }, fr);
      const ic = TL.svgEl('svg', { x: -14, y: -14, width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', stroke: '#fff', 'stroke-width': 1.9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, fr);
      ic.innerHTML = TL.iconPaths[d.icon];
      if (st === 'done') {
        const b = TL.svgEl('g', { transform: 'translate(21 -21)' }, fr);
        TL.svgEl('circle', { r: 10, fill: 'var(--done)', stroke: 'var(--card)', 'stroke-width': 2 }, b);
        TL.svgEl('path', { d: 'M-4.5 0l3 3L4.5-3', stroke: '#fff', 'stroke-width': 2.4, fill: 'none', 'stroke-linecap': 'round' }, b);
      }
      const above = fy < 160;
      const lab = TL.svgEl('text', { x: fx, y: above ? fy - 40 : fy + 48, 'text-anchor': 'middle', class: 'fruit-label' }, g);
      lab.textContent = d.short;
      const tt = TL.svgEl('title', {}, g); tt.textContent = `${d.name}: ${d.blurb}`;
      g.addEventListener('click', () => onSelect(d.id));
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(d.id); } });
    });
    // clicking empty space clears selection
    svg.addEventListener('click', (e) => { if (!e.target.closest('.branch')) onSelect(null); });
    return {
      select(id) {
        svg.classList.toggle('has-sel', !!id);
        Object.entries(groups).forEach(([k, g]) => g.classList.toggle('sel', k === id));
        if (id && groups[id]) branchLayer.appendChild(groups[id]); // bring to front
      },
    };
  }
})();
