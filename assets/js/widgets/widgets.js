/* Interactive mathematical playgrounds. Each widget: {id,title,desc,lessons,mount(el)} */
(function () {
  const TL = window.TL;
  const W = {};
  const f = (x, d = 3) => (Number.isFinite(x) ? (+x).toFixed(d) : String(x));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const h = (html) => { const t = document.createElement('div'); t.innerHTML = html; return t; };

  TL.heatColor = (v) => {
    v = clamp(v, 0, 1);
    const stops = [[240, 249, 255], [165, 180, 252], [99, 102, 241], [55, 48, 163]];
    const s = v * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(s)), t = s - i;
    const c = stops[i].map((a, k) => Math.round(a + (stops[i + 1][k] - a) * t));
    return `rgb(${c.join(',')})`;
  };
  TL.softmax = (xs, T = 1) => {
    const m = Math.max(...xs.filter(Number.isFinite));
    const e = xs.map((x) => (Number.isFinite(x) ? Math.exp((x - m) / T) : 0));
    const s = e.reduce((a, b) => a + b, 0);
    return e.map((x) => x / s);
  };

  /* simple 2D chart helper: returns svg + scale fns */
  function chart(el, { w = 520, h = 300, x0, x1, y0, y1, pad = 34, grid = true, xlabel = '', ylabel = '' }) {
    const svg = TL.svgEl('svg', { viewBox: `0 0 ${w} ${h}`, width: w, height: h }, el);
    const sx = (x) => pad + (x - x0) / (x1 - x0) * (w - pad - 10);
    const sy = (y) => h - pad + -(y - y0) / (y1 - y0) * (h - pad - 10);
    const ix = (px) => x0 + (px - pad) / (w - pad - 10) * (x1 - x0);
    const iy = (py) => y0 + (h - pad - py) / (h - pad - 10) * (y1 - y0);
    if (grid) {
      const step = (a, b) => { const r = (b - a) / 6; const p = Math.pow(10, Math.floor(Math.log10(r))); return [1, 2, 5, 10].map((m) => m * p).find((m) => r <= m); };
      const gx = step(x0, x1), gy = step(y0, y1);
      for (let x = Math.ceil(x0 / gx) * gx; x <= x1 + 1e-9; x += gx) { TL.svgEl('line', { x1: sx(x), x2: sx(x), y1: sy(y0), y2: sy(y1), class: 'grid-l' }, svg); const t = TL.svgEl('text', { x: sx(x), y: h - pad + 15, 'text-anchor': 'middle' }, svg); t.textContent = +x.toFixed(4); }
      for (let y = Math.ceil(y0 / gy) * gy; y <= y1 + 1e-9; y += gy) { TL.svgEl('line', { x1: sx(x0), x2: sx(x1), y1: sy(y), y2: sy(y), class: 'grid-l' }, svg); const t = TL.svgEl('text', { x: pad - 5, y: sy(y) + 4, 'text-anchor': 'end' }, svg); t.textContent = +y.toFixed(4); }
      if (x0 < 0 && x1 > 0) TL.svgEl('line', { x1: sx(0), x2: sx(0), y1: sy(y0), y2: sy(y1), class: 'axis' }, svg);
      if (y0 < 0 && y1 > 0) TL.svgEl('line', { x1: sx(x0), x2: sx(x1), y1: sy(0), y2: sy(0), class: 'axis' }, svg);
    }
    if (xlabel) { const t = TL.svgEl('text', { x: w - 12, y: h - pad - 6, 'text-anchor': 'end', style: 'font-weight:600' }, svg); t.textContent = xlabel; }
    if (ylabel) { const t = TL.svgEl('text', { x: pad + 6, y: 16, style: 'font-weight:600' }, svg); t.textContent = ylabel; }
    const g = TL.svgEl('g', {}, svg);
    const line = (fn, color, width = 2.5, dash = '') => {
      let d = ''; const N = 200;
      for (let i = 0; i <= N; i++) { const x = x0 + (x1 - x0) * i / N; const y = fn(x); if (!Number.isFinite(y)) continue; d += (d ? 'L' : 'M') + sx(x).toFixed(1) + ' ' + sy(clamp(y, y0 - 10 * (y1 - y0), y1 + 10 * (y1 - y0))).toFixed(1); }
      return TL.svgEl('path', { d, fill: 'none', stroke: color, 'stroke-width': width, 'stroke-dasharray': dash }, g);
    };
    return { svg, g, sx, sy, ix, iy, line, w, h };
  }
  const svgPoint = (svg, e) => { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };

  /* ---------- 1. vectors ---------- */
  W.vectors = { title: 'Dot product & cosine similarity', desc: 'Drag two vectors. Watch the dot product, angle, cosine similarity and projection update.', lessons: ['dot-products', 'qkv'],
    mount(el) {
      el.innerHTML = `<div class="w"><div class="w-row"><div id="c"></div><div class="readout" id="r" style="min-width:250px"></div></div><p class="small muted">Drag the arrow tips. In attention, a query and a key that point the same way give a large score.</p></div>`;
      const c = chart(TL.$('#c', el), { w: 380, h: 380, x0: -4, x1: 4, y0: -4, y1: 4, pad: 24 });
      let a = [3, 1], b = [1, 2.5];
      const defs = TL.svgEl('defs', {}, c.svg);
      defs.innerHTML = '<marker id="vh1" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#3b82f6"/></marker><marker id="vh2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#e11d48"/></marker>';
      const proj = TL.svgEl('line', { stroke: '#14b8a6', 'stroke-width': 5, opacity: .6 }, c.g);
      const drop = TL.svgEl('line', { stroke: 'var(--ink3)', 'stroke-dasharray': '4 4' }, c.g);
      const la = TL.svgEl('line', { stroke: '#3b82f6', 'stroke-width': 3, 'marker-end': 'url(#vh1)' }, c.g);
      const lb = TL.svgEl('line', { stroke: '#e11d48', 'stroke-width': 3, 'marker-end': 'url(#vh2)' }, c.g);
      const ha = TL.svgEl('circle', { r: 11, fill: '#3b82f6', opacity: .25, style: 'cursor:grab' }, c.g);
      const hb = TL.svgEl('circle', { r: 11, fill: '#e11d48', opacity: .25, style: 'cursor:grab' }, c.g);
      const draw = () => {
        la.setAttribute('x1', c.sx(0)); la.setAttribute('y1', c.sy(0)); la.setAttribute('x2', c.sx(a[0])); la.setAttribute('y2', c.sy(a[1]));
        lb.setAttribute('x1', c.sx(0)); lb.setAttribute('y1', c.sy(0)); lb.setAttribute('x2', c.sx(b[0])); lb.setAttribute('y2', c.sy(b[1]));
        ha.setAttribute('cx', c.sx(a[0])); ha.setAttribute('cy', c.sy(a[1])); hb.setAttribute('cx', c.sx(b[0])); hb.setAttribute('cy', c.sy(b[1]));
        const dot = a[0] * b[0] + a[1] * b[1], na = Math.hypot(...a), nb = Math.hypot(...b);
        const cos = dot / (na * nb || 1), ang = Math.acos(clamp(cos, -1, 1)) * 180 / Math.PI;
        const k = dot / (na * na || 1); const p = [a[0] * k, a[1] * k];
        proj.setAttribute('x1', c.sx(0)); proj.setAttribute('y1', c.sy(0)); proj.setAttribute('x2', c.sx(p[0])); proj.setAttribute('y2', c.sy(p[1]));
        drop.setAttribute('x1', c.sx(b[0])); drop.setAttribute('y1', c.sy(b[1])); drop.setAttribute('x2', c.sx(p[0])); drop.setAttribute('y2', c.sy(p[1]));
        TL.$('#r', el).innerHTML = `<b style="color:#3b82f6">a</b> = [${f(a[0], 2)}, ${f(a[1], 2)}]<br><b style="color:#e11d48">b</b> = [${f(b[0], 2)}, ${f(b[1], 2)}]<br>
          a·b = ${f(a[0], 2)}×${f(b[0], 2)} + ${f(a[1], 2)}×${f(b[1], 2)} = <b>${f(dot, 3)}</b><br>‖a‖ = ${f(na)}, ‖b‖ = ${f(nb)}<br>
          cos θ = a·b / (‖a‖‖b‖) = <b>${f(cos)}</b><br>θ = ${f(ang, 1)}°<br><span style="color:#14b8a6">proj of b onto a</span> = ${f(k)}·a<br>
          <span class="muted">${cos > 0.7 ? 'Similar direction → high attention score' : cos < -0.3 ? 'Opposite directions → negative score' : 'Nearly orthogonal → score ≈ 0'}</span>`;
      };
      let drag = null;
      ha.addEventListener('pointerdown', (e) => { drag = 'a'; e.target.setPointerCapture(e.pointerId); });
      hb.addEventListener('pointerdown', (e) => { drag = 'b'; e.target.setPointerCapture(e.pointerId); });
      c.svg.addEventListener('pointermove', (e) => { if (!drag) return; const p = svgPoint(c.svg, e); const v = [clamp(c.ix(p.x), -3.9, 3.9), clamp(c.iy(p.y), -3.9, 3.9)].map((x) => Math.round(x * 4) / 4); if (drag === 'a') a = v; else b = v; draw(); });
      c.svg.addEventListener('pointerup', () => (drag = null));
      draw();
    } };

  /* ---------- 2. matrix multiplication stepper ---------- */
  W.matmul = { title: 'Matrix multiplication, step by step', desc: 'Edit A (2×3) and B (3×2). Click an output cell to see which row and column produce it.', lessons: ['matrix-multiplication'],
    mount(el) {
      let A = [[1, 2, 0], [0, 1, 3]], B = [[2, 1], [0, 1], [1, -1]], sel = [0, 0];
      el.innerHTML = `<div class="w"><div class="w-row" id="m" style="gap:18px"></div><div class="readout" id="r"></div><p class="small muted">Shape rule: (2×3)·(3×2) → (2×2). Inner dimensions must match; each output is one dot product.</p></div>`;
      const render = () => {
        const C = A.map((r) => B[0].map((_, j) => r.reduce((s, a, k) => s + a * B[k][j], 0)));
        const mat = (M, name, editable) => `<div style="text-align:center"><div class="small muted">${name}</div><div class="mat" style="grid-template-columns:repeat(${M[0].length},auto)">${M.map((r, i) => r.map((v, j) => {
          const hl = (name === 'A' && i === sel[0]) || (name === 'B' && j === sel[1]) || (name.startsWith('C') && i === sel[0] && j === sel[1]);
          return editable ? `<input type="number" step="1" data-m="${name}" data-i="${i}" data-j="${j}" value="${v}" style="${hl ? 'background:color-mix(in srgb,#f59e0b 35%,transparent)' : ''}">` : `<span class="${hl ? 'hl' : ''}" data-i="${i}" data-j="${j}" style="cursor:pointer">${v}</span>`;
        }).join('')).join('')}</div></div>`;
        TL.$('#m', el).innerHTML = `${mat(A, 'A', true)}<b>×</b>${mat(B, 'B', true)}<b>=</b>${mat(C, 'C = AB', false)}`;
        const [i, j] = sel;
        TL.$('#r', el).innerHTML = `C[${i},${j}] = row ${i} of A · column ${j} of B = ${A[i].map((a, k) => `${a}×${B[k][j]}`).join(' + ')} = <b>${C[i][j]}</b>`;
        TL.$$('input', el).forEach((inp) => inp.addEventListener('change', () => { const M = inp.dataset.m === 'A' ? A : B; M[+inp.dataset.i][+inp.dataset.j] = +inp.value || 0; render(); }));
        TL.$$('span[data-i]', el).forEach((s) => s.addEventListener('click', () => { sel = [+s.dataset.i, +s.dataset.j]; render(); }));
      };
      render();
    } };

  /* ---------- 3. linear transformation ---------- */
  W.lintrans = { title: 'Linear transformations & eigenvectors', desc: 'Set a 2×2 matrix and watch the grid, the unit square and the eigenvectors transform.', lessons: ['linear-transformations', 'eigen-svd'],
    mount(el) {
      let M = [[1.5, 0.5], [0.5, 1]];
      el.innerHTML = `<div class="w"><div class="w-row"><div id="c"></div><div><div class="mat" style="grid-template-columns:auto auto" id="mi"></div><div class="w-row"><button class="btn sm" data-p="rot">Rotate 30°</button><button class="btn sm" data-p="shear">Shear</button><button class="btn sm" data-p="sym">Symmetric</button><button class="btn sm" data-p="proj">Projection</button></div><div class="readout" id="r" style="margin-top:8px"></div></div></div></div>`;
      const host = TL.$('#c', el);
      const render = () => {
        host.innerHTML = '';
        const c = chart(host, { w: 360, h: 360, x0: -3, x1: 3, y0: -3, y1: 3, pad: 22 });
        const T = (x, y) => [M[0][0] * x + M[0][1] * y, M[1][0] * x + M[1][1] * y];
        for (let k = -3; k <= 3; k++) {
          let d1 = '', d2 = '';
          for (let t = -3; t <= 3.01; t += 0.5) { const p = T(k, t), q = T(t, k); d1 += (d1 ? 'L' : 'M') + c.sx(p[0]) + ' ' + c.sy(p[1]); d2 += (d2 ? 'L' : 'M') + c.sx(q[0]) + ' ' + c.sy(q[1]); }
          TL.svgEl('path', { d: d1, stroke: '#8b5cf6', 'stroke-width': 1, fill: 'none', opacity: .45 }, c.g);
          TL.svgEl('path', { d: d2, stroke: '#8b5cf6', 'stroke-width': 1, fill: 'none', opacity: .45 }, c.g);
        }
        const sq = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([x, y]) => T(x, y));
        TL.svgEl('polygon', { points: sq.map((p) => `${c.sx(p[0])},${c.sy(p[1])}`).join(' '), fill: '#14b8a6', opacity: .35, stroke: '#14b8a6' }, c.g);
        const a = M[0][0], b = M[0][1], cc = M[1][0], d = M[1][1];
        const tr = a + d, det = a * d - b * cc, disc = tr * tr / 4 - det;
        let info = `det = ${f(det)} (area scale)<br>trace = ${f(tr)}<br>`;
        if (disc >= 0) {
          const l1 = tr / 2 + Math.sqrt(disc), l2 = tr / 2 - Math.sqrt(disc);
          [l1, l2].forEach((lam, i) => {
            let v = Math.abs(b) > 1e-9 ? [b, lam - a] : Math.abs(cc) > 1e-9 ? [lam - d, cc] : (i ? [0, 1] : [1, 0]);
            const n = Math.hypot(...v); v = v.map((x) => x / n);
            const col = i ? '#e11d48' : '#f59e0b';
            TL.svgEl('line', { x1: c.sx(-v[0] * 3), y1: c.sy(-v[1] * 3), x2: c.sx(v[0] * 3), y2: c.sy(v[1] * 3), stroke: col, 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }, c.g);
            TL.svgEl('line', { x1: c.sx(0), y1: c.sy(0), x2: c.sx(v[0] * lam), y2: c.sy(v[1] * lam), stroke: col, 'stroke-width': 4 }, c.g);
            info += `<span style="color:${col}">λ${i + 1} = ${f(lam)}, v = [${f(v[0], 2)}, ${f(v[1], 2)}]</span><br>`;
          });
          info += '<span class="muted">Eigenvectors only get stretched by λ, never turned.</span>';
        } else info += '<span class="muted">Complex eigenvalues: this matrix rotates every direction, so no real eigenvector exists.</span>';
        TL.$('#r', el).innerHTML = info;
        TL.$('#mi', el).innerHTML = M.flat().map((v, k) => `<input type="number" step="0.1" value="${+v.toFixed(3)}" data-k="${k}">`).join('');
        TL.$$('#mi input', el).forEach((inp) => inp.addEventListener('input', () => { const k = +inp.dataset.k; M[k >> 1][k & 1] = +inp.value || 0; render(); }));
      };
      TL.$$('[data-p]', el).forEach((b) => b.addEventListener('click', () => {
        const p = b.dataset.p, r = Math.PI / 6;
        M = p === 'rot' ? [[Math.cos(r), -Math.sin(r)], [Math.sin(r), Math.cos(r)]] : p === 'shear' ? [[1, 1], [0, 1]] : p === 'sym' ? [[2, 1], [1, 2]] : [[1, 0], [0, 0]];
        render();
      }));
      render();
    } };

  /* ---------- 4. softmax ---------- */
  W.softmax = { title: 'Softmax & temperature', desc: 'Edit logits and temperature; see probabilities, entropy and why max-subtraction keeps softmax numerically stable.', lessons: ['softmax', 'decoding'],
    mount(el) {
      let z = [2.0, 1.0, 0.1, -1.0], T = 1;
      el.innerHTML = `<div class="w"><div class="w-row" id="in"></div><div class="w-row"><label>Temperature T <input type="range" min="0.1" max="5" step="0.05" value="1" id="t"><span id="tv">1.00</span></label><button class="btn sm" id="big">Try huge logits [1000, 999, 998, 0]</button><button class="btn sm" id="rs">Reset</button></div><div id="bars"></div><div class="readout" id="r"></div></div>`;
      const render = () => {
        TL.$('#in', el).innerHTML = 'Logits z: ' + z.map((v, i) => `<input type="number" step="0.1" value="${v}" data-i="${i}">`).join('');
        TL.$$('#in input', el).forEach((inp) => inp.addEventListener('change', () => { z[+inp.dataset.i] = +inp.value || 0; render(); }));
        const p = TL.softmax(z, T);
        const H = -p.reduce((s, x) => s + (x > 0 ? x * Math.log(x) : 0), 0);
        TL.$('#bars', el).innerHTML = p.map((x, i) => `<div class="barrow"><span>z${i + 1} = ${z[i]}</span><div><div class="b" style="width:${(x * 100).toFixed(1)}%"></div></div><span>${f(x)}</span></div>`).join('');
        const m = Math.max(...z);
        const naive = z.map((v) => Math.exp(v / T));
        TL.$('#r', el).innerHTML = `p_i = exp(z_i/T) / Σ_j exp(z_j/T) &nbsp; (T = ${f(T, 2)})<br>Σp = ${f(p.reduce((a, b) => a + b, 0), 6)} · entropy H = ${f(H)} nats (max ${f(Math.log(z.length))})<br>
          Naive exp(z/T): [${naive.map((v) => (Number.isFinite(v) ? v.toExponential(2) : '<b style="color:#e11d48">Infinity</b>')).join(', ')}]<br>
          Stable: subtract max (${m}) first → exp((z−${m})/T): [${z.map((v) => Math.exp((v - m) / T).toExponential(2)).join(', ')}]<br>
          <span class="muted">${T < 0.5 ? 'Low T → distribution sharpens toward argmax (greedy).' : T > 2 ? 'High T → distribution flattens toward uniform.' : 'T = 1 is the model’s own distribution.'}</span>`;
      };
      TL.$('#t', el).addEventListener('input', (e) => { T = +e.target.value; TL.$('#tv', el).textContent = T.toFixed(2); render(); });
      TL.$('#big', el).onclick = () => { z = [1000, 999, 998, 0]; render(); };
      TL.$('#rs', el).onclick = () => { z = [2, 1, 0.1, -1]; render(); };
      render();
    } };

  /* ---------- 5. cross-entropy ---------- */
  W.crossentropy = { title: 'Cross-entropy & KL divergence', desc: 'Compare a true distribution p with a model q. See H(p), H(p,q) and KL(p‖q).', lessons: ['entropy-cross-entropy', 'logits-ce-teacher-forcing'],
    mount(el) {
      let p = [1, 0, 0, 0], q = [0.6, 0.2, 0.15, 0.05];
      el.innerHTML = `<div class="w"><div class="w-row"><div><b>True p</b> (one-hot = a classification label)<div id="pi"></div></div><div><b>Model q</b> (sliders, renormalised)<div id="qi"></div></div></div><div class="w-row"><div id="c"></div><div class="readout" id="r" style="min-width:260px"></div></div></div>`;
      const norm = (v) => { const s = v.reduce((a, b) => a + b, 0) || 1; return v.map((x) => x / s); };
      const render = () => {
        const P = norm(p), Q = norm(q);
        const Hp = -P.reduce((s, x) => s + (x > 0 ? x * Math.log(x) : 0), 0);
        const Hpq = -P.reduce((s, x, i) => s + (x > 0 ? x * Math.log(Math.max(Q[i], 1e-12)) : 0), 0);
        TL.$('#pi', el).innerHTML = P.map((x, i) => `<label style="display:flex">class ${i + 1} <input type="range" min="0" max="1" step="0.05" value="${p[i]}" data-p="${i}"> ${f(x, 2)}</label>`).join('');
        TL.$('#qi', el).innerHTML = Q.map((x, i) => `<label style="display:flex">class ${i + 1} <input type="range" min="0.001" max="1" step="0.01" value="${q[i]}" data-q="${i}"> ${f(x, 3)}</label>`).join('');
        TL.$$('[data-p]', el).forEach((s) => s.addEventListener('change', () => { p[+s.dataset.p] = +s.value; render(); }));
        TL.$$('[data-q]', el).forEach((s) => s.addEventListener('input', () => { q[+s.dataset.q] = +s.value; render(); }));
        const host = TL.$('#c', el); host.innerHTML = '';
        const c = chart(host, { w: 330, h: 230, x0: 0, x1: 1, y0: 0, y1: 5, xlabel: 'q(correct)', ylabel: '−log q' });
        c.line((x) => -Math.log(x), '#8b5cf6');
        const k = P.indexOf(Math.max(...P));
        TL.svgEl('circle', { cx: c.sx(Q[k]), cy: c.sy(Math.min(5, -Math.log(Q[k]))), r: 6, fill: '#e11d48' }, c.g);
        TL.$('#r', el).innerHTML = `H(p) = ${f(Hp)}<br>H(p, q) = −Σ p log q = <b>${f(Hpq)}</b><br>KL(p‖q) = H(p,q) − H(p) = <b>${f(Hpq - Hp)}</b><br><br><span class="muted">With a one-hot label H(p)=0, so cross-entropy = KL = −log q(correct). A confident wrong answer (q→0) costs a lot: −log(0.01) ≈ 4.6.</span>`;
      };
      render();
    } };

  /* ---------- 6. gradient descent ---------- */
  W.gd = { title: 'Gradient descent: SGD vs Momentum vs Adam', desc: 'Optimise an elongated quadratic bowl. Change the learning rate and watch oscillation, divergence and convergence.', lessons: ['gradient-descent', 'optimizers', 'lr-schedules'],
    mount(el) {
      el.innerHTML = `<div class="w"><div class="w-row"><label>Learning rate <input type="range" id="lr" min="-3" max="0" step="0.05" value="-1.1"><span id="lrv"></span></label><label>Steps <input type="number" id="n" value="60" min="5" max="400"></label><label>Curvature ratio <input type="range" id="k" min="1" max="30" step="1" value="10"><span id="kv"></span></label><button class="btn sm" id="go">Run</button></div><div class="w-row"><div id="c"></div><div class="readout" id="r" style="min-width:230px"></div></div><p class="small muted">Loss L(x, y) = ½(x² + κ·y²). Click the plot to choose a start point. Large κ (ill-conditioning) makes plain SGD zig-zag; momentum and Adam cope better.</p></div>`;
      let start = [-4, 2.5];
      const run = () => {
        const lr = Math.pow(10, +TL.$('#lr', el).value), K = +TL.$('#k', el).value, N = +TL.$('#n', el).value;
        TL.$('#lrv', el).textContent = lr.toFixed(4); TL.$('#kv', el).textContent = K;
        const grad = ([x, y]) => [x, K * y], loss = ([x, y]) => 0.5 * (x * x + K * y * y);
        const opt = {
          SGD: () => { let p = [...start]; const t = [p]; for (let i = 0; i < N; i++) { const g = grad(p); p = [p[0] - lr * g[0], p[1] - lr * g[1]]; t.push(p); } return t; },
          Momentum: () => { let p = [...start], v = [0, 0]; const t = [p]; for (let i = 0; i < N; i++) { const g = grad(p); v = [0.9 * v[0] + g[0], 0.9 * v[1] + g[1]]; p = [p[0] - lr * v[0], p[1] - lr * v[1]]; t.push(p); } return t; },
          Adam: () => { let p = [...start], m = [0, 0], s = [0, 0]; const t = [p], b1 = 0.9, b2 = 0.999, alr = Math.max(lr, 0.05); for (let i = 1; i <= N; i++) { const g = grad(p); m = m.map((x, k) => b1 * x + (1 - b1) * g[k]); s = s.map((x, k) => b2 * x + (1 - b2) * g[k] * g[k]); const mh = m.map((x) => x / (1 - b1 ** i)), sh = s.map((x) => x / (1 - b2 ** i)); p = p.map((x, k) => x - alr * mh[k] / (Math.sqrt(sh[k]) + 1e-8)); t.push(p); } return t; },
        };
        const host = TL.$('#c', el); host.innerHTML = '';
        const c = chart(host, { w: 460, h: 330, x0: -5, x1: 5, y0: -3.5, y1: 3.5, pad: 26 });
        [0.5, 2, 5, 10, 20, 40].forEach((Lv) => { const a = Math.sqrt(2 * Lv), b = Math.sqrt(2 * Lv / K); TL.svgEl('ellipse', { cx: c.sx(0), cy: c.sy(0), rx: c.sx(a) - c.sx(0), ry: c.sy(0) - c.sy(b), fill: 'none', stroke: 'var(--ink3)', opacity: .35 }, c.g); });
        const cols = { SGD: '#e11d48', Momentum: '#3b82f6', Adam: '#14b8a6' };
        let info = '';
        Object.entries(opt).forEach(([name, fn]) => {
          const t = fn(); const L = loss(t[t.length - 1]);
          const d = t.map((p, i) => (i ? 'L' : 'M') + c.sx(clamp(p[0], -50, 50)).toFixed(1) + ' ' + c.sy(clamp(p[1], -50, 50)).toFixed(1)).join('');
          TL.svgEl('path', { d, fill: 'none', stroke: cols[name], 'stroke-width': 2 }, c.g);
          t.forEach((p, i) => { if (i % 3 === 0 && Math.abs(p[0]) < 6 && Math.abs(p[1]) < 4) TL.svgEl('circle', { cx: c.sx(p[0]), cy: c.sy(p[1]), r: 2.3, fill: cols[name] }, c.g); });
          info += `<span style="color:${cols[name]}">■ ${name}</span>: final loss ${Number.isFinite(L) && L < 1e6 ? f(L, 4) : '<b>diverged</b>'}<br>`;
        });
        TL.svgEl('circle', { cx: c.sx(start[0]), cy: c.sy(start[1]), r: 6, fill: 'var(--ink)' }, c.g);
        const stab = 2 / K;
        info += `<br>SGD is stable only if lr &lt; 2/κ = ${f(stab, 3)}${lr >= stab ? ' <b style="color:#e11d48">(exceeded!)</b>' : ''}.<br><span class="muted">Adam uses max(lr, 0.05) here for visibility; it normalises the step size per coordinate.</span>`;
        TL.$('#r', el).innerHTML = info;
        c.svg.addEventListener('click', (e) => { const p = svgPoint(c.svg, e); start = [c.ix(p.x), c.iy(p.y)]; run(); });
      };
      ['lr', 'k', 'n'].forEach((id) => TL.$('#' + id, el).addEventListener('input', run));
      TL.$('#go', el).onclick = run;
      run();
    } };

  /* ---------- 7. activations ---------- */
  W.activations = { title: 'Activation functions & their gradients', desc: 'Compare ReLU, GELU, SiLU, sigmoid and tanh, and their derivatives, which control gradient flow.', lessons: ['activations', 'init-gradient-flow', 'ffn'],
    mount(el) {
      const fns = {
        ReLU: [(x) => Math.max(0, x), (x) => (x > 0 ? 1 : 0), '#3b82f6'],
        GELU: [(x) => 0.5 * x * (1 + Math.tanh(0.7978845608 * (x + 0.044715 * x ** 3))), (x) => { const e = 1e-4; return (0.5 * (x + e) * (1 + Math.tanh(0.7978845608 * ((x + e) + 0.044715 * (x + e) ** 3))) - 0.5 * (x - e) * (1 + Math.tanh(0.7978845608 * ((x - e) + 0.044715 * (x - e) ** 3)))) / (2 * e); }, '#8b5cf6'],
        'SiLU/Swish': [(x) => x / (1 + Math.exp(-x)), (x) => { const s = 1 / (1 + Math.exp(-x)); return s + x * s * (1 - s); }, '#14b8a6'],
        Sigmoid: [(x) => 1 / (1 + Math.exp(-x)), (x) => { const s = 1 / (1 + Math.exp(-x)); return s * (1 - s); }, '#f59e0b'],
        Tanh: [Math.tanh, (x) => 1 - Math.tanh(x) ** 2, '#e11d48'],
      };
      const on = { ReLU: true, GELU: true, 'SiLU/Swish': false, Sigmoid: true, Tanh: false };
      el.innerHTML = `<div class="w"><div class="w-row" id="t"></div><div class="w-row"><div><b>f(x)</b><div id="c1"></div></div><div><b>f′(x)</b>: gradient multiplier<div id="c2"></div></div></div><p class="small muted">Sigmoid’s derivative peaks at 0.25, so stacking many sigmoid layers multiplies gradients by ≤ 0.25 each: vanishing gradients. ReLU passes gradient 1 for positive inputs but 0 for negatives (“dead” units). GELU/SiLU are smooth variants used in Transformers.</p></div>`;
      const render = () => {
        TL.$('#t', el).innerHTML = Object.keys(fns).map((k) => `<button class="fchip ${on[k] ? 'on' : ''}" data-k="${k}" style="${on[k] ? `background:${fns[k][2]};border-color:${fns[k][2]}` : ''}">${k}</button>`).join('');
        TL.$$('[data-k]', el).forEach((b) => b.onclick = () => { on[b.dataset.k] = !on[b.dataset.k]; render(); });
        const h1 = TL.$('#c1', el), h2 = TL.$('#c2', el); h1.innerHTML = h2.innerHTML = '';
        const c1 = chart(h1, { w: 330, h: 240, x0: -4, x1: 4, y0: -1.5, y1: 4 }), c2 = chart(h2, { w: 330, h: 240, x0: -4, x1: 4, y0: -0.2, y1: 1.2 });
        Object.entries(fns).forEach(([k, [fn, df, col]]) => { if (!on[k]) return; c1.line(fn, col); c2.line(df, col); });
      };
      render();
    } };

  /* ---------- 8. classification threshold ---------- */
  W.threshold = { title: 'Precision, recall & the decision threshold', desc: 'Move the threshold over model scores for positives and negatives. See the confusion matrix, precision, recall and F1 change.', lessons: ['classification-metrics', 'imbalance-calibration'],
    mount(el) {
      el.innerHTML = `<div class="w"><div class="w-row"><label>Threshold <input type="range" id="t" min="0" max="1" step="0.01" value="0.5"><span id="tv"></span></label><label>Positives per 100 <input type="range" id="pr" min="2" max="50" value="20"><span id="prv"></span></label><label>Separation <input type="range" id="sep" min="0.5" max="4" step="0.1" value="2"></label></div><div class="w-row"><div id="c"></div><div class="readout" id="r" style="min-width:240px"></div></div></div>`;
      const pdf = (x, m, s) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
      const cdf = (x, m, s) => 0.5 * (1 + erf((x - m) / (s * Math.SQRT2)));
      function erf(x) { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }
      const render = () => {
        const th = +TL.$('#t', el).value, pr = +TL.$('#pr', el).value / 100, sep = +TL.$('#sep', el).value;
        TL.$('#tv', el).textContent = th.toFixed(2); TL.$('#prv', el).textContent = Math.round(pr * 100);
        const s = 0.15, mn = 0.5 - sep * 0.075, mp = 0.5 + sep * 0.075;
        const TP = pr * (1 - cdf(th, mp, s)), FN = pr * cdf(th, mp, s), FP = (1 - pr) * (1 - cdf(th, mn, s)), TN = (1 - pr) * cdf(th, mn, s);
        const P = TP / (TP + FP || 1), R = TP / (TP + FN || 1), F1 = 2 * P * R / (P + R || 1), acc = TP + TN;
        const host = TL.$('#c', el); host.innerHTML = '';
        const c = chart(host, { w: 420, h: 240, x0: 0, x1: 1, y0: 0, y1: 3.2, xlabel: 'model score', grid: true });
        c.line((x) => (1 - pr) * pdf(x, mn, s), '#3b82f6'); c.line((x) => pr * pdf(x, mp, s), '#e11d48');
        TL.svgEl('line', { x1: c.sx(th), x2: c.sx(th), y1: c.sy(0), y2: c.sy(3.2), stroke: 'var(--ink)', 'stroke-width': 2, 'stroke-dasharray': '5 3' }, c.g);
        const pc = (x) => (x * 100).toFixed(1);
        TL.$('#r', el).innerHTML = `<span style="color:#e11d48">■ positives</span> <span style="color:#3b82f6">■ negatives</span><br><table class="mtable"><tr><th></th><th>pred +</th><th>pred −</th></tr><tr><th>actual +</th><td>TP ${pc(TP)}</td><td>FN ${pc(FN)}</td></tr><tr><th>actual −</th><td>FP ${pc(FP)}</td><td>TN ${pc(TN)}</td></tr></table><br>
          Precision = TP/(TP+FP) = <b>${f(P)}</b><br>Recall = TP/(TP+FN) = <b>${f(R)}</b><br>F1 = <b>${f(F1)}</b><br>Accuracy = ${f(acc)}<br><span class="muted">Lower the positive rate: accuracy stays high even for a useless model, which is why imbalanced problems use PR-AUC.</span>`;
      };
      ['t', 'pr', 'sep'].forEach((id) => TL.$('#' + id, el).addEventListener('input', render));
      render();
    } };

  /* ---------- 9. attention lab ---------- */
  W.attention = { title: 'Attention mini-lab (editable Q, K, V)', desc: 'Edit small Q, K, V matrices; toggle scaling and the causal mask; see scores, softmax weights and outputs.', lessons: ['scaled-dot-product', 'masking', 'qkv', 'attention-intuition'],
    mount(el) {
      const toks = ['The', 'cat', 'sat'];
      let Q = [[1, 0], [1, 1], [0, 2]], K = [[1, 0], [0, 1], [1, 1]], V = [[1, 0], [0, 1], [1, 1]];
      let scale = true, causal = true, row = 2;
      el.innerHTML = `<div class="w"><div class="w-row"><label><input type="checkbox" id="sc" checked> Scale by 1/√d<sub>k</sub></label><label><input type="checkbox" id="cm" checked> Causal mask</label><label>Multiply Q by <input type="range" id="mul" min="1" max="10" step="1" value="1"><span id="mv">1</span></label></div>
        <div class="w-row" id="mats" style="gap:18px;align-items:flex-start"></div><div class="w-row" style="align-items:flex-start;gap:18px"><div id="sc-out"></div><div id="w-out"></div><div id="o-out"></div></div><div class="readout" id="r"></div></div>`;
      let mul = 1;
      const render = () => {
        const d = 2, Qm = Q.map((r) => r.map((x) => x * mul));
        const S = Qm.map((q) => K.map((k) => q[0] * k[0] + q[1] * k[1]));
        const Ss = S.map((r) => r.map((x) => (scale ? x / Math.sqrt(d) : x)));
        const M = Ss.map((r, i) => r.map((x, j) => (causal && j > i ? -Infinity : x)));
        const A = M.map((r) => TL.softmax(r));
        const O = A.map((a) => [0, 1].map((c) => a.reduce((s, w, j) => s + w * V[j][c], 0)));
        const mat = (Mx, name, ed) => `<div><div class="small muted">${name} <span class="dims">3×2</span></div><div class="mat" style="grid-template-columns:auto auto">${Mx.map((r, i) => r.map((v, j) => ed ? `<input type="number" step="0.5" value="${v}" data-m="${name}" data-i="${i}" data-j="${j}">` : `<span>${f(v, 2)}</span>`).join('')).join('')}</div></div>`;
        TL.$('#mats', el).innerHTML = `<div><div class="small muted">tokens</div>${toks.map((t, i) => `<div class="tok ${i === row ? 'sel' : ''}" data-row="${i}" style="display:flex">${t}</div>`).join('')}</div>${mat(Q, 'Q', true)}${mat(K, 'K', true)}${mat(V, 'V', true)}`;
        const heat = (Mx, title, fmt, color) => `<div><div class="small muted">${title} <span class="dims">3×3</span></div><div class="heat" style="grid-template-columns:auto repeat(3,auto)"><span></span>${toks.map((t) => `<span class="hh">${t}</span>`).join('')}${Mx.map((r, i) => `<span class="hh" style="${i === row ? 'color:var(--accent);font-weight:800' : ''}">${toks[i]}</span>` + r.map((v) => `<span class="hc" style="background:${Number.isFinite(v) ? color(v) : 'var(--bg2)'};color:${Number.isFinite(v) && color === TL.heatColor && v > .55 ? '#fff' : 'var(--ink)'}">${Number.isFinite(v) ? fmt(v) : '−∞'}</span>`).join('')).join('')}</div></div>`;
        const mx = Math.max(...Ss.flat().map(Math.abs), 1);
        TL.$('#sc-out', el).innerHTML = heat(M, scale ? 'Scores QKᵀ/√d (masked)' : 'Scores QKᵀ (masked)', (v) => f(v, 2), (v) => `rgba(99,102,241,${Math.abs(v) / mx * 0.6 + 0.08})`);
        TL.$('#w-out', el).innerHTML = heat(A, 'Weights = softmax(row)', (v) => f(v, 2), TL.heatColor);
        TL.$('#o-out', el).innerHTML = mat(O, 'Output = weights · V', false);
        const r = row;
        TL.$('#r', el).innerHTML = `Row “${toks[r]}”: scores [${M[r].map((v) => (Number.isFinite(v) ? f(v, 2) : '−∞')).join(', ')}] → softmax → [${A[r].map((v) => f(v, 3)).join(', ')}]<br>output = ${A[r].map((w, j) => `${f(w, 2)}·v_${toks[j]}`).join(' + ')} = [${O[r].map((v) => f(v, 3)).join(', ')}]<br>
          <span class="muted">Increase “Multiply Q”: without scaling, larger dot products push softmax toward one-hot (saturation, tiny gradients). The causal mask sets future positions to −∞ so their weight is exactly 0.</span>`;
        TL.$$('input[data-m]', el).forEach((inp) => inp.addEventListener('change', () => { const Mx = { Q, K, V }[inp.dataset.m]; Mx[+inp.dataset.i][+inp.dataset.j] = +inp.value || 0; render(); }));
        TL.$$('[data-row]', el).forEach((t) => t.addEventListener('click', () => { row = +t.dataset.row; render(); }));
      };
      TL.$('#sc', el).onchange = (e) => { scale = e.target.checked; render(); };
      TL.$('#cm', el).onchange = (e) => { causal = e.target.checked; render(); };
      TL.$('#mul', el).oninput = (e) => { mul = +e.target.value; TL.$('#mv', el).textContent = mul; render(); };
      render();
    } };

  /* ---------- 10. positional encoding ---------- */
  W.posenc = { title: 'Sinusoidal positional encodings', desc: 'Heatmap of PE(pos, i) and the similarity between positions: nearby positions look alike.', lessons: ['positional-encoding'],
    mount(el) {
      el.innerHTML = `<div class="w"><div class="w-row"><label>d_model <input type="range" id="d" min="8" max="64" step="8" value="32"><span id="dv"></span></label><label>positions <input type="range" id="n" min="8" max="64" step="4" value="32"><span id="nv"></span></label><label>reference pos <input type="range" id="p" min="0" max="63" value="10"><span id="pv"></span></label></div><div class="w-row" style="align-items:flex-start"><div><b class="small">PE matrix</b> (rows = positions, cols = dimensions)<div id="hm"></div></div><div><b class="small">cos-similarity of PE(ref) with every position</b><div id="sim"></div></div></div><p class="small muted">PE(pos, 2i) = sin(pos / 10000^(2i/d)), PE(pos, 2i+1) = cos(pos / 10000^(2i/d)). Low dimensions oscillate fast, high dimensions slowly, like the hands of a clock.</p></div>`;
      const render = () => {
        const d = +TL.$('#d', el).value, n = +TL.$('#n', el).value, ref = Math.min(+TL.$('#p', el).value, n - 1);
        TL.$('#dv', el).textContent = d; TL.$('#nv', el).textContent = n; TL.$('#pv', el).textContent = ref;
        const PE = [...Array(n)].map((_, pos) => [...Array(d)].map((_, j) => { const i = Math.floor(j / 2), a = pos / Math.pow(10000, 2 * i / d); return j % 2 ? Math.cos(a) : Math.sin(a); }));
        const cs = 7, hm = TL.$('#hm', el); hm.innerHTML = '';
        const s = TL.svgEl('svg', { viewBox: `0 0 ${d * cs} ${n * cs}`, width: Math.min(360, d * cs * 1.4), height: Math.min(360, d * cs * 1.4) * n / d }, hm);
        PE.forEach((r, i) => r.forEach((v, j) => TL.svgEl('rect', { x: j * cs, y: i * cs, width: cs, height: cs, fill: TL.heatColor((v + 1) / 2) }, s)));
        TL.svgEl('rect', { x: 0, y: ref * cs, width: d * cs, height: cs, fill: 'none', stroke: '#f59e0b', 'stroke-width': 1.5 }, s);
        const nr = Math.hypot(...PE[ref]);
        const sims = PE.map((r) => r.reduce((a, v, k) => a + v * PE[ref][k], 0) / (Math.hypot(...r) * nr));
        const host = TL.$('#sim', el); host.innerHTML = '';
        const c = chart(host, { w: 360, h: 240, x0: 0, x1: n - 1, y0: -0.4, y1: 1.05, xlabel: 'position' });
        TL.svgEl('path', { d: sims.map((v, i) => (i ? 'L' : 'M') + c.sx(i) + ' ' + c.sy(v)).join(''), stroke: '#8b5cf6', 'stroke-width': 2.5, fill: 'none' }, c.g);
        TL.svgEl('circle', { cx: c.sx(ref), cy: c.sy(1), r: 5, fill: '#f59e0b' }, c.g);
      };
      ['d', 'n', 'p'].forEach((id) => TL.$('#' + id, el).addEventListener('input', render));
      render();
    } };

  /* ---------- 11. BPE ---------- */
  W.bpe = { title: 'Byte-Pair Encoding, merge by merge', desc: 'Train a tiny BPE tokenizer on your own text, one merge at a time.', lessons: ['bpe', 'tokenization', 'build-data'],
    mount(el) {
      el.innerHTML = `<div class="w"><textarea id="txt" class="notes-area" style="min-height:60px">low lower lowest newer newest wider wide low low</textarea><div class="w-row"><button class="btn sm primary" id="step">Next merge</button><button class="btn sm" id="ten">+10 merges</button><button class="btn sm" id="rs">Reset</button><span id="info" class="small muted"></span></div><div id="out" class="readout" style="line-height:2.1"></div><div id="merges" class="small" style="margin-top:8px"></div></div>`;
      let words, merges;
      const reset = () => {
        const counts = {};
        TL.$('#txt', el).value.toLowerCase().split(/\s+/).filter(Boolean).forEach((w) => (counts[w] = (counts[w] || 0) + 1));
        words = Object.entries(counts).map(([w, c]) => ({ sym: [...w, '▁'], c }));
        merges = []; render();
      };
      const step = () => {
        const pairs = {};
        words.forEach(({ sym, c }) => { for (let i = 0; i < sym.length - 1; i++) { const k = sym[i] + '\u0000' + sym[i + 1]; pairs[k] = (pairs[k] || 0) + c; } });
        const best = Object.entries(pairs).sort((a, b) => b[1] - a[1])[0];
        if (!best) return false;
        const [a, b] = best[0].split('\u0000');
        words.forEach((w) => { const s = []; for (let i = 0; i < w.sym.length; i++) { if (i < w.sym.length - 1 && w.sym[i] === a && w.sym[i + 1] === b) { s.push(a + b); i++; } else s.push(w.sym[i]); } w.sym = s; });
        merges.push([a, b, best[1]]); return true;
      };
      const render = () => {
        const vocab = new Set(); words.forEach((w) => w.sym.forEach((s) => vocab.add(s)));
        const ntok = words.reduce((s, w) => s + w.sym.length * w.c, 0);
        TL.$('#out', el).innerHTML = words.map((w) => w.sym.map((s) => `<span class="tok" style="display:inline-flex;margin:1px;padding:1px 6px;cursor:default">${TL.esc(s)}</span>`).join('') + ` <span class="muted">×${w.c}</span>`).join('<br>');
        TL.$('#merges', el).innerHTML = merges.length ? '<b>Merges learned (in order):</b> ' + merges.map(([a, b, c], i) => `${i + 1}. “${TL.esc(a)}”+“${TL.esc(b)}” (${c})`).join(' · ') : 'Start: every word is split into characters; ▁ marks the end of a word.';
        TL.$('#info', el).textContent = `${vocab.size} distinct symbols · corpus length ${ntok} tokens`;
      };
      TL.$('#step', el).onclick = () => { step(); render(); };
      TL.$('#ten', el).onclick = () => { for (let i = 0; i < 10; i++) if (!step()) break; render(); };
      TL.$('#rs', el).onclick = reset;
      TL.$('#txt', el).addEventListener('change', reset);
      reset();
    } };

  /* ---------- 12. sampling ---------- */
  W.sampling = { title: 'Decoding: temperature, top-k, top-p', desc: 'See exactly which tokens survive each filter and their renormalised probabilities.', lessons: ['decoding', 'generation-failures', 'build-generation'],
    mount(el) {
      const toks = ['mat', 'floor', 'sofa', 'roof', 'bed', 'moon', 'piano', 'idea', 'the', 'quantum'];
      const logits = [3.2, 2.6, 2.3, 1.6, 1.4, 0.2, -0.1, -0.8, -1.2, -2.5];
      el.innerHTML = `<div class="w"><p class="small" style="margin:0">Context: “The cat sat on the …” (illustrative logits, not from a real model)</p><div class="w-row"><label>Temperature <input type="range" id="t" min="0.05" max="2.5" step="0.05" value="1"><span id="tv"></span></label><label>top-k <input type="range" id="k" min="1" max="10" value="10"><span id="kv"></span></label><label>top-p <input type="range" id="p" min="0.05" max="1" step="0.05" value="1"><span id="pv"></span></label><button class="btn sm" id="s">Sample 20</button></div><div id="bars"></div><div class="readout" id="r"></div></div>`;
      const render = (sample) => {
        const T = +TL.$('#t', el).value, k = +TL.$('#k', el).value, p = +TL.$('#p', el).value;
        TL.$('#tv', el).textContent = T.toFixed(2); TL.$('#kv', el).textContent = k; TL.$('#pv', el).textContent = p.toFixed(2);
        const probs = TL.softmax(logits, T);
        const order = probs.map((x, i) => i).sort((a, b) => probs[b] - probs[a]);
        const keep = new Set(); let cum = 0;
        for (const i of order.slice(0, k)) { keep.add(i); cum += probs[i]; if (cum >= p) break; }
        const Z = [...keep].reduce((s, i) => s + probs[i], 0);
        TL.$('#bars', el).innerHTML = order.map((i) => `<div class="barrow" style="opacity:${keep.has(i) ? 1 : .35}"><span>${toks[i]}</span><div><div class="b" style="width:${probs[i] * 100}%;${keep.has(i) ? '' : 'background:var(--lock)'}"></div></div><span>${keep.has(i) ? f(probs[i] / Z) : 'cut'}</span></div>`).join('');
        let s = '';
        if (sample) { const out = []; for (let n = 0; n < 20; n++) { let u = Math.random() * Z; for (const i of order) { if (!keep.has(i)) continue; u -= probs[i]; if (u <= 0) { out.push(toks[i]); break; } } } s = `<br>20 samples: ${out.join(', ')}`; }
        TL.$('#r', el).innerHTML = `${keep.size} token(s) kept · kept mass before renormalising = ${f(Z)}<br>Greedy (argmax) would always pick “${toks[order[0]]}”.${s}`;
      };
      ['t', 'k', 'p'].forEach((id) => TL.$('#' + id, el).addEventListener('input', () => render()));
      TL.$('#s', el).onclick = () => render(true);
      render();
    } };

  /* ---------- 13. KV cache calculator ---------- */
  W.kvcache = { title: 'KV-cache memory: MHA vs GQA vs MQA', desc: 'Compute KV-cache size for a model configuration, batch and context length.', lessons: ['kv-cache', 'mqa-gqa', 'batching-serving', 'gpu-memory-precision'],
    mount(el) {
      const presets = { '7B-like (32L, 32H, d=4096)': [32, 32, 32, 128], '7B-like with GQA-8': [32, 32, 8, 128], '70B-like GQA-8 (80L, 64H)': [80, 64, 8, 128], 'MiniGPT (6L, 6H, d=384)': [6, 6, 6, 64] };
      el.innerHTML = `<div class="w"><div class="w-row"><select id="pre">${Object.keys(presets).map((k) => `<option>${k}</option>`).join('')}</select></div><div class="w-row">
        <label>layers <input type="number" id="L" value="32"></label><label>query heads <input type="number" id="H" value="32"></label><label>KV heads <input type="number" id="G" value="32"></label><label>d_head <input type="number" id="dh" value="128"></label></div><div class="w-row">
        <label>batch <input type="number" id="B" value="8"></label><label>context tokens <input type="number" id="S" value="4096"></label><label>bytes/elem <select id="by"><option value="2">2 (fp16/bf16)</option><option value="1">1 (int8/fp8)</option><option value="4">4 (fp32)</option></select></label></div><div class="readout" id="r"></div><div id="bars"></div></div>`;
      const g = (id) => +TL.$('#' + id, el).value;
      const render = () => {
        const L = g('L'), H = g('H'), G = Math.max(1, Math.min(g('G'), H)), dh = g('dh'), B = g('B'), S = g('S'), by = g('by');
        const per = (kv) => 2 * L * kv * dh * by; // bytes per token
        const gb = (x) => (x / 2 ** 30).toFixed(2) + ' GiB';
        const cfgs = [['MHA (KV heads = H)', H], [`GQA (KV heads = ${G})`, G], ['MQA (1 KV head)', 1]];
        const max = per(H) * B * S;
        TL.$('#r', el).innerHTML = `KV bytes = 2 (K and V) × layers × kv_heads × d_head × bytes × batch × tokens<br>= 2 × ${L} × ${G} × ${dh} × ${by} × ${B} × ${S} = <b>${gb(per(G) * B * S)}</b><br>Per token (this config): ${(per(G) / 1024).toFixed(1)} KiB. Grows linearly with batch and context.`;
        TL.$('#bars', el).innerHTML = cfgs.map(([n, kv]) => `<div class="barrow" style="grid-template-columns:170px 1fr 90px"><span>${n}</span><div><div class="b" style="width:${per(kv) * B * S / max * 100}%"></div></div><span>${gb(per(kv) * B * S)}</span></div>`).join('');
      };
      TL.$('#pre', el).onchange = (e) => { const [L, H, G, dh] = presets[e.target.value]; TL.$('#L', el).value = L; TL.$('#H', el).value = H; TL.$('#G', el).value = G; TL.$('#dh', el).value = dh; render(); };
      TL.$$('input,select', el).forEach((i) => i.addEventListener('input', render));
      render();
    } };

  /* ---------- 14. parameter & FLOP calculator ---------- */
  W.params = { title: 'GPT parameter & FLOP calculator', desc: 'Count parameters per component for a decoder-only Transformer and estimate training compute.', lessons: ['param-flops', 'scaling-laws', 'tensor-shapes'],
    mount(el) {
      el.innerHTML = `<div class="w"><div class="w-row"><label>vocab V <input type="number" id="V" value="50257"></label><label>d_model <input type="number" id="d" value="768"></label><label>layers <input type="number" id="L" value="12"></label><label>context T <input type="number" id="T" value="1024"></label><label>FFN mult <input type="number" id="m" value="4"></label><label><input type="checkbox" id="tie" checked> tie embeddings</label></div><div class="w-row"><label>training tokens D (billions) <input type="number" id="D" value="10"></label><button class="btn sm" id="gpt2">GPT-2 small</button><button class="btn sm" id="mini">MiniGPT</button></div><div id="out"></div></div>`;
      const v = (id) => +TL.$('#' + id, el).value;
      const render = () => {
        const V = v('V'), d = v('d'), L = v('L'), T = v('T'), m = v('m'), D = v('D') * 1e9, tie = TL.$('#tie', el).checked;
        const emb = V * d, pos = T * d;
        const attn = 4 * d * d + 4 * d, ffn = 2 * m * d * d + m * d + d, ln = 2 * 2 * d;
        const block = attn + ffn + ln, blocks = L * block, head = tie ? 0 : V * d;
        const total = emb + pos + blocks + 2 * d + head;
        const fmt = (x) => (x >= 1e9 ? (x / 1e9).toFixed(2) + ' B' : x >= 1e6 ? (x / 1e6).toFixed(2) + ' M' : x.toLocaleString());
        const N = total - emb - pos;
        const flops = 6 * total * D;
        const attnFlopsTok = 2 * 2 * L * T * d; // QK^T and AV per token, forward (approx.)
        TL.$('#out', el).innerHTML = `<table class="mtable"><tr><th>component</th><th>formula</th><th>params</th></tr>
          <tr><td>token embedding</td><td>V·d</td><td>${fmt(emb)}</td></tr><tr><td>position embedding</td><td>T·d</td><td>${fmt(pos)}</td></tr>
          <tr><td>attention / block</td><td>4d² + 4d (Wq,Wk,Wv,Wo + biases)</td><td>${fmt(attn)}</td></tr><tr><td>MLP / block</td><td>2·m·d² + (m+1)d</td><td>${fmt(ffn)}</td></tr>
          <tr><td>LayerNorms / block</td><td>2 × (γ, β)</td><td>${fmt(ln)}</td></tr><tr><td>all ${L} blocks</td><td>L × block ≈ 12·L·d²</td><td>${fmt(blocks)}</td></tr>
          <tr><td>LM head</td><td>${tie ? 'tied to embedding (0 new)' : 'V·d'}</td><td>${fmt(head)}</td></tr><tr><th>total</th><th></th><th>${fmt(total)}</th></tr></table>
          <div class="readout" style="margin-top:8px">Non-embedding params N ≈ ${fmt(N)} (≈ 12·L·d² = ${fmt(12 * L * d * d)})<br>Training compute ≈ 6·N_total·D = <b>${flops.toExponential(2)} FLOPs</b> (2 forward + 4 backward per param per token)<br>
          Attention-score FLOPs per token (forward, context T): ≈ 4·L·T·d = ${attnFlopsTok.toExponential(2)}, vs 2·N = ${(2 * N).toExponential(2)} for the weights.<br>
          Chinchilla rule of thumb: compute-optimal D ≈ 20·N = ${fmt(20 * total)} tokens.<br>fp32 weights: ${(total * 4 / 2 ** 30).toFixed(2)} GiB · Adam training state ≈ 16 bytes/param = ${(total * 16 / 2 ** 30).toFixed(2)} GiB (before activations)</div>`;
      };
      TL.$('#gpt2', el).onclick = () => { Object.entries({ V: 50257, d: 768, L: 12, T: 1024, m: 4 }).forEach(([k, x]) => (TL.$('#' + k, el).value = x)); render(); };
      TL.$('#mini', el).onclick = () => { Object.entries({ V: 65, d: 384, L: 6, T: 256, m: 4 }).forEach(([k, x]) => (TL.$('#' + k, el).value = x)); render(); };
      TL.$$('input', el).forEach((i) => i.addEventListener('input', render));
      render();
    } };

  /* ---------- 15. backprop on a tiny graph ---------- */
  W.backprop = { title: 'Backprop through a tiny neuron', desc: 'Forward and backward pass for L = (σ(w·x + b) − y)². Edit inputs; verify the chain rule against a numerical gradient.', lessons: ['forward-backprop', 'chain-rule', 'computational-graphs-autograd'],
    mount(el) {
      let x = 2, w = -0.5, b = 0.3, y = 1, lr = 0.5;
      el.innerHTML = `<div class="w"><div class="w-row" id="in"></div><div id="g"></div><div class="readout" id="r"></div><div class="w-row"><button class="btn sm primary" id="st">Take one gradient step</button><label>lr <input type="number" id="lr" value="0.5" step="0.1"></label></div></div>`;
      const sig = (z) => 1 / (1 + Math.exp(-z));
      const render = () => {
        TL.$('#in', el).innerHTML = [['x', x], ['w', w], ['b', b], ['y (target)', y]].map(([n, v]) => `<label>${n} <input type="number" step="0.1" value="${+v.toFixed(4)}" data-n="${n[0]}"></label>`).join('');
        TL.$$('[data-n]', el).forEach((i) => i.addEventListener('change', () => { const v = +i.value || 0; ({ x: () => (x = v), w: () => (w = v), b: () => (b = v), y: () => (y = v) })[i.dataset.n](); render(); }));
        const u = w * x, z = u + b, a = sig(z), L = (a - y) ** 2;
        const dL_da = 2 * (a - y), da_dz = a * (1 - a), dL_dz = dL_da * da_dz, dL_dw = dL_dz * x, dL_db = dL_dz, dL_dx = dL_dz * w;
        const e = 1e-5, Lw = (ww) => (sig(ww * x + b) - y) ** 2, num = (Lw(w + e) - Lw(w - e)) / (2 * e);
        const node = (lbl, val, grad, col) => `<div style="border:2px solid ${col};border-radius:12px;padding:6px 10px;min-width:110px;text-align:center;background:var(--card)"><b>${lbl}</b><div style="font-family:var(--mono);font-size:.85rem">${f(val, 4)}</div><div style="font-family:var(--mono);font-size:.78rem;color:#e11d48">∂L/∂ = ${f(grad, 4)}</div></div>`;
        TL.$('#g', el).innerHTML = `<div class="w-row" style="gap:8px">${node('w', w, dL_dw, '#8b5cf6')}${node('x', x, dL_dx, '#8b5cf6')}<b>→ ×</b>${node('u = w·x', u, dL_dz, '#3b82f6')}<b>→ +b</b>${node('z = u + b', z, dL_dz, '#3b82f6')}<b>→ σ</b>${node('a = σ(z)', a, dL_da, '#14b8a6')}<b>→</b>${node('L = (a−y)²', L, 1, '#f59e0b')}</div>`;
        TL.$('#r', el).innerHTML = `<b>Forward:</b> u = ${f(u)}, z = ${f(z)}, a = σ(z) = ${f(a)}, L = ${f(L, 5)}<br><b>Backward</b> (chain rule, right → left):<br>∂L/∂a = 2(a − y) = ${f(dL_da)}<br>∂a/∂z = a(1 − a) = ${f(da_dz)}<br>∂L/∂z = ${f(dL_da)} × ${f(da_dz)} = ${f(dL_dz)}<br>∂L/∂w = ∂L/∂z · x = <b>${f(dL_dw, 5)}</b> &nbsp; numerical check (L(w+ε) − L(w−ε))/2ε = <b>${f(num, 5)}</b> ✓<br>∂L/∂b = ∂L/∂z = ${f(dL_db, 5)}`;
        TL.$('#st', el).onclick = () => { lr = +TL.$('#lr', el).value || 0.5; w -= lr * dL_dw; b -= lr * dL_db; render(); };
      };
      render();
    } };

  /* ---------- 16. RoPE ---------- */
  W.rope = { title: 'RoPE: rotations encode relative position', desc: 'Rotate a query and a key by their positions; their dot product depends only on the distance m − n.', lessons: ['rope'],
    mount(el) {
      el.innerHTML = `<div class="w"><div class="w-row"><label>query position m <input type="range" id="m" min="0" max="20" value="5"><span id="mv"></span></label><label>key position n <input type="range" id="n" min="0" max="20" value="2"><span id="nv"></span></label><label>θ (rad/pos) <input type="range" id="th" min="0.05" max="1" step="0.05" value="0.3"><span id="tv"></span></label><button class="btn sm" id="shift">Shift both by +3</button></div><div class="w-row"><div id="c"></div><div class="readout" id="r" style="min-width:260px"></div></div></div>`;
      const q = [1, 0.4], k = [0.8, 0.9];
      const rot = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
      const render = () => {
        const m = +TL.$('#m', el).value, n = +TL.$('#n', el).value, th = +TL.$('#th', el).value;
        TL.$('#mv', el).textContent = m; TL.$('#nv', el).textContent = n; TL.$('#tv', el).textContent = th.toFixed(2);
        const qr = rot(q, m * th), kr = rot(k, n * th);
        const dot = qr[0] * kr[0] + qr[1] * kr[1];
        const rel = rot(q, (m - n) * th); const dot2 = rel[0] * k[0] + rel[1] * k[1];
        const host = TL.$('#c', el); host.innerHTML = '';
        const c = chart(host, { w: 300, h: 300, x0: -1.5, x1: 1.5, y0: -1.5, y1: 1.5, pad: 20 });
        [[q, '#3b82f6', .3], [k, '#e11d48', .3], [qr, '#3b82f6', 1], [kr, '#e11d48', 1]].forEach(([v, col, o]) => TL.svgEl('line', { x1: c.sx(0), y1: c.sy(0), x2: c.sx(v[0]), y2: c.sy(v[1]), stroke: col, 'stroke-width': 3.5, opacity: o, 'stroke-linecap': 'round' }, c.g));
        TL.$('#r', el).innerHTML = `faded = original q, k · solid = rotated<br>R(mθ)q · R(nθ)k = <b>${f(dot, 4)}</b><br>q · R((m−n)θ)ᵀ… = qᵀR((n−m)θ)k = <b>${f(dot2, 4)}</b><br>m − n = ${m - n}<br><span class="muted">Press “shift both”: absolute positions change, the score does not. Real RoPE applies this rotation to every pair of dimensions with a different frequency θ_i = 10000^(−2i/d).</span>`;
      };
      ['m', 'n', 'th'].forEach((id) => TL.$('#' + id, el).addEventListener('input', render));
      TL.$('#shift', el).onclick = () => { const M = TL.$('#m', el), N = TL.$('#n', el); M.value = Math.min(20, +M.value + 3); N.value = Math.min(20, +N.value + 3); render(); };
      render();
    } };

  TL.widgets = W;
  TL.WIDGET_LIST = Object.entries(W).map(([id, w]) => ({ id, title: w.title, desc: w.desc, lessons: w.lessons }));
  TL.mountWidget = function (el, spec) {
    const [id, arg] = String(spec).split(':');
    const w = W[id];
    if (!w) { el.innerHTML = `<p class="muted">Visualization “${TL.esc(id)}” not found.</p>`; return; }
    el.innerHTML = `<h3>${TL.icon('sliders', 18)} ${TL.esc(w.title)}</h3><p class="small muted" style="margin-top:0">${TL.esc(w.desc)}</p><div class="w-body"></div>`;
    try { w.mount(el.querySelector('.w-body'), arg); } catch (e) { console.error(e); el.querySelector('.w-body').innerHTML = `<pre>${TL.esc(e.stack)}</pre>`; }
  };
})();
