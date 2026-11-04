/* Animated explainers: Rosetta Stone (software ↔ ML) and Backpropagation. */
(function () {
  const TL = window.TL;
  const W = TL.widgets;
  const f = (x, d = 3) => (+x).toFixed(d);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const sig = (z) => 1 / (1 + Math.exp(-z));
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* move a glowing dot along a straight line; resolves when done */
  function pulse(svg, x1, y1, x2, y2, color, dur = 700, label) {
    return new Promise((res) => {
      if (reduced()) return res();
      const g = TL.svgEl('g', { 'pointer-events': 'none' }, svg);
      TL.svgEl('circle', { r: 11, fill: color, opacity: 0.25 }, g);
      TL.svgEl('circle', { r: 6, fill: color }, g);
      if (label) { const t = TL.svgEl('text', { y: -14, 'text-anchor': 'middle', style: `font:700 11px var(--mono);fill:${color}` }, g); t.textContent = label; }
      const t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        g.setAttribute('transform', `translate(${x1 + (x2 - x1) * e} ${y1 + (y2 - y1) * e})`);
        if (k < 1) requestAnimationFrame(step); else { g.remove(); res(); }
      };
      requestAnimationFrame(step);
    });
  }

  /* shared player: steps = [{title, run: async(ctx)}]; renders controls */
  function player(el, steps, ui) {
    let i = -1, playing = false, busy = false, speed = 1, token = 0;
    el.querySelector('.anim-ctrl').innerHTML = `<button class="btn sm primary" data-a="play">▶ Play</button><button class="btn sm" data-a="prev">← Back</button><button class="btn sm" data-a="next">Step →</button><button class="btn sm" data-a="reset">⟲ Reset</button><label class="small">Speed <select data-a="speed"><option value="0.6">Slow</option><option value="1" selected>Normal</option><option value="1.8">Fast</option></select></label><span class="anim-count small muted"></span>`;
    const $ = (a) => el.querySelector(`[data-a="${a}"]`);
    const count = el.querySelector('.anim-count');
    const go = async (n) => {
      if (busy) return; busy = true; const my = ++token;
      if (n < i) { ui.reset(); for (let k = 0; k < n; k++) await steps[k].run({ fast: true, speed }); }
      i = n; count.textContent = `Step ${i + 1} / ${steps.length}`;
      ui.mark(i);
      await steps[i].run({ fast: false, speed });
      busy = false;
      if (playing && my === token) {
        await sleep(1400 / speed);
        if (playing && my === token) { if (i < steps.length - 1) go(i + 1); else stop(); }
      }
    };
    const stop = () => { playing = false; $('play').textContent = '▶ Play'; };
    $('play').onclick = () => { if (playing) return stop(); playing = true; $('play').textContent = '❚❚ Pause'; if (i >= steps.length - 1) { ui.reset(); i = -1; } if (!busy) go(i + 1); };
    $('next').onclick = () => { stop(); if (i < steps.length - 1) go(i + 1); };
    $('prev').onclick = () => { stop(); if (i > 0) go(i - 1); };
    $('reset').onclick = () => { stop(); token++; busy = false; i = -1; ui.reset(); count.textContent = ''; };
    $('speed').onchange = (e) => { speed = +e.target.value; };
    ui.onStepClick = (n) => { stop(); go(n); };
    return { go };
  }

  /* =================== 1. Rosetta stone =================== */
  W.rosetta = { title: 'Rosetta Stone animation: software ↔ machine learning', desc: 'Watch the same journey in a software lane and an ML lane: input → function → output → check → fix → repeat → ship.', lessons: ['swe-to-ai', 'what-is-ai', 'data-splits'],
    mount(el) {
      el.innerHTML = `<div class="anim"><div class="anim-ctrl row"></div>
        <div class="anim-stage"><svg viewBox="0 0 980 360" class="anim-svg" role="img" aria-label="Software and machine learning lanes"></svg></div>
        <div class="anim-steps" role="tablist"></div>
        <div class="anim-cap"></div></div>`;
      const svg = el.querySelector('svg');
      const cols = ['Input', 'Function', 'Output', 'Check', 'Fix', 'Repeat', 'Ship'];
      const X = (k) => 70 + k * 140, Y = { sw: 95, ml: 265 };
      const SW = ['request fields<br><b>{size: 120 m²}</b>', 'logic YOU write<br><b>price(size)</b>', 'return value<br><b>$250,000</b>', 'unit test<br><b>assertEqual($350k, …)</b>', 'you read the stack trace<br>and edit the code', 'rerun the test suite', 'deploy the build<br>artifact'];
      const ML = ['features<br><b>x = [1.20]</b>', 'model (weights LEARNED)<br><b>ŷ = w·x + b</b>', 'prediction<br><b>ŷ = <span data-v="pred">0.46</span></b>', 'label y = <b>3.50</b><br>loss = <b data-v="loss">…</b>', 'backprop → gradients<br>optimizer nudges w, b', 'epochs over all data<br><b>loss ↓</b>', 'save checkpoint →<br><b>inference</b> (frozen)'];
      const MAP = ['Request fields = <b>features</b>', 'Your function = <b>model</b>; your constants = <b>weights</b>', 'Return value = <b>prediction</b>', 'Expected value = <b>label</b>; failing-test score = <b>loss</b>', 'Stack trace + code edit = <b>backprop + optimizer step</b>', 'Rerun the suite = another <b>epoch</b>', 'Build artifact = <b>checkpoint</b>; production = <b>inference</b>'];
      // lanes
      [['sw', 'SOFTWARE', '#3b82f6'], ['ml', 'MACHINE LEARNING', '#8b5cf6']].forEach(([k, name, c]) => {
        TL.svgEl('rect', { x: 8, y: Y[k] - 62, width: 964, height: 124, rx: 18, fill: c, opacity: 0.06 }, svg);
        const t = TL.svgEl('text', { x: 20, y: Y[k] - 44, style: `font:800 12px var(--sans);fill:${c};letter-spacing:.08em` }, svg); t.textContent = name;
        TL.svgEl('line', { x1: X(0), y1: Y[k], x2: X(6), y2: Y[k], stroke: c, 'stroke-width': 2, opacity: .3, 'stroke-dasharray': '4 6' }, svg);
      });
      // loop arrow on the ML lane (fix → function)
      TL.svgEl('path', { d: `M ${X(5)} ${Y.ml + 52} C ${X(5)} ${Y.ml + 88}, ${X(1)} ${Y.ml + 88}, ${X(1)} ${Y.ml + 52}`, fill: 'none', stroke: '#8b5cf6', 'stroke-width': 2, 'stroke-dasharray': '5 5', opacity: .5, 'marker-end': 'url(#ra)' }, svg);
      const lt = TL.svgEl('text', { x: (X(1) + X(5)) / 2, y: Y.ml + 92, 'text-anchor': 'middle', style: 'font:700 11px var(--sans);fill:#8b5cf6' }, svg); lt.textContent = 'repeated automatically, millions of times';
      const defs = TL.svgEl('defs', {}, svg); defs.innerHTML = '<marker id="ra" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#8b5cf6"/></marker>';
      const boxes = { sw: [], ml: [] }, links = [];
      cols.forEach((c, k) => {
        const h = TL.svgEl('text', { x: X(k), y: 22, 'text-anchor': 'middle', style: 'font:800 12px var(--sans);fill:var(--ink3);letter-spacing:.06em' }, svg); h.textContent = c.toUpperCase();
        const ln = TL.svgEl('line', { x1: X(k), y1: Y.sw + 48, x2: X(k), y2: Y.ml - 48, stroke: '#14b8a6', 'stroke-width': 2.5, 'stroke-dasharray': '3 4', opacity: 0 }, svg);
        const eq = TL.svgEl('text', { x: X(k) + 8, y: (Y.sw + Y.ml) / 2 + 4, style: 'font:900 16px var(--sans);fill:#14b8a6', opacity: 0 }, svg); eq.textContent = '≡';
        links.push([ln, eq]);
        ['sw', 'ml'].forEach((lane) => {
          const fo = TL.svgEl('foreignObject', { x: X(k) - 64, y: Y[lane] - 40, width: 128, height: 80 }, svg);
          fo.innerHTML = `<div xmlns="http://www.w3.org/1999/xhtml" class="ro-box ${lane}">${lane === 'sw' ? SW[k] : ML[k]}</div>`;
          boxes[lane].push(fo.firstChild);
        });
      });
      // live values
      const lossBar = TL.svgEl('rect', { x: X(5) - 55, y: Y.ml + 34, width: 110, height: 8, rx: 4, fill: '#e11d48' }, svg);
      TL.svgEl('rect', { x: X(5) - 55, y: Y.ml + 34, width: 110, height: 8, rx: 4, fill: 'none', stroke: 'var(--line)' }, svg);
      const packets = {};
      ['sw', 'ml'].forEach((lane) => { packets[lane] = TL.svgEl('circle', { r: 9, cx: X(0), cy: Y[lane] - 52, fill: lane === 'sw' ? '#3b82f6' : '#8b5cf6', opacity: 0 }, svg); });
      const cap = el.querySelector('.anim-cap'), stepsEl = el.querySelector('.anim-steps');
      stepsEl.innerHTML = cols.map((c, k) => `<button class="fchip" data-k="${k}">${k + 1}. ${c}</button>`).join('');
      // tiny real regression: houses (size in 100 m²) -> price ($100k), true y = 2.5x + 0.5
      const data = [[0.8, 2.5], [1.0, 3.0], [1.2, 3.5], [1.6, 4.5], [2.0, 5.5]];
      let w, b;
      const pred = () => w * 1.2 + b;
      const mse = () => data.reduce((s, [x, y]) => s + (w * x + b - y) ** 2, 0) / data.length;
      const L0 = () => { const ww = w, bb = b; w = 0.3; b = 0.1; const v = mse(); w = ww; b = bb; return v; };
      const setVals = () => {
        el.querySelectorAll('[data-v="pred"]').forEach((e) => (e.textContent = f(pred(), 2)));
        el.querySelectorAll('[data-v="loss"]').forEach((e) => (e.textContent = f(mse(), 3)));
        lossBar.setAttribute('width', Math.max(2, 110 * Math.min(1, mse() / L0())));
      };
      const capTxt = [
        ['A request comes in.', 'An example arrives as numbers.', 'In ML, the input fields of an example are called <b>features</b>. Here: house size 120 m² (scaled to 1.20).'],
        ['Your hand-written function runs.', 'The model runs, but its constants were never written by anyone.', 'The model is a function template <code>ŷ = w·x + b</code>. Its constants <b>w</b> and <b>b</b> are the <b>weights / parameters</b>; they start random (w = 0.30, b = 0.10).'],
        ['It returns a value.', 'It returns a <b>prediction</b> ŷ.', 'With random weights the prediction is bad: ŷ = 0.46 ($46k) for a $350k house.'],
        ['The test compares with the expected value.', 'The <b>loss</b> compares with the <b>label</b>.', 'Label y = 3.50. The loss (mean squared error) turns "how wrong" into one number that training will minimise.'],
        ['A developer reads the stack trace and edits the code.', '<b>Backprop</b> computes, for every weight, which direction reduces the loss (the <b>gradient</b>). The <b>optimizer</b> nudges each weight.', 'No human edits anything. ∂loss/∂w and ∂loss/∂b are computed automatically, then w ← w − lr·∂loss/∂w.'],
        ['You rerun the test suite.', 'Repeat over the whole dataset: each full pass is an <b>epoch</b>.', 'Watch the loss bar shrink and w, b converge toward 2.5 and 0.5. The “logic” is being learned from 5 examples.'],
        ['You ship the build artifact.', 'Save the weights (<b>checkpoint</b>) and serve them: <b>inference</b>.', 'In production the weights are frozen. Using the model doesn’t change it, just like a deployed binary.'],
      ];
      const ui = {
        mark(k) {
          ['sw', 'ml'].forEach((lane) => boxes[lane].forEach((bx, j) => { bx.classList.toggle('on', j === k); bx.classList.toggle('done', j < k); }));
          links.forEach(([ln, eq], j) => { const v = j <= k ? (j === k ? 1 : 0.35) : 0; ln.setAttribute('opacity', v); eq.setAttribute('opacity', v); });
          stepsEl.querySelectorAll('button').forEach((bt, j) => bt.classList.toggle('on', j === k));
          const [s, m, d] = capTxt[k];
          cap.innerHTML = `<div class="ro-cap"><div><span class="ro-tag sw">SOFTWARE</span> ${s}</div><div><span class="ro-tag ml">MACHINE LEARNING</span> ${m}</div><div class="ro-map">≡ ${MAP[k]}</div><div class="small muted">${d}</div><div class="small ro-wb">w = <b>${f(w, 3)}</b> · b = <b>${f(b, 3)}</b> · prediction for 1.20 = <b>${f(pred(), 2)}</b> · loss = <b>${f(mse(), 3)}</b></div></div>`;
          TL.addTerms && TL.addTerms(cap);
        },
        reset() { w = 0.3; b = 0.1; setVals(); ['sw', 'ml'].forEach((l) => { boxes[l].forEach((bx) => bx.classList.remove('on', 'done')); packets[l].setAttribute('opacity', 0); }); links.forEach(([a, e]) => { a.setAttribute('opacity', 0); e.setAttribute('opacity', 0); }); stepsEl.querySelectorAll('button').forEach((b) => b.classList.remove('on')); cap.innerHTML = '<div class="ro-cap muted">Press <b>Play</b> or <b>Step</b> to watch the same journey in both worlds.</div>'; },
      };
      const move = async (k, ctx) => {
        ['sw', 'ml'].forEach((l) => packets[l].setAttribute('opacity', 1));
        const from = +packets.sw.getAttribute('cx');
        if (ctx.fast || reduced()) { ['sw', 'ml'].forEach((l) => packets[l].setAttribute('cx', X(k))); return; }
        const t0 = performance.now(), dur = 600 / ctx.speed;
        await new Promise((r) => { const st = (n) => { const e = Math.min(1, (n - t0) / dur); ['sw', 'ml'].forEach((l) => packets[l].setAttribute('cx', from + (X(k) - from) * e)); e < 1 ? requestAnimationFrame(st) : r(); }; requestAnimationFrame(st); });
      };
      const gdStep = (lr = 0.08) => { let gw = 0, gb = 0; data.forEach(([x, y]) => { const e = w * x + b - y; gw += 2 * e * x / data.length; gb += 2 * e / data.length; }); w -= lr * gw; b -= lr * gb; };
      const steps = cols.map((c, k) => ({
        run: async (ctx) => {
          await move(k, ctx);
          if (k === 4) { gdStep(); setVals(); }
          if (k === 5) {
            const n = 300;
            if (ctx.fast || reduced()) { for (let t = 0; t < n; t++) gdStep(); setVals(); }
            else { for (let t = 0; t < n; t += 6) { for (let q = 0; q < 6; q++) gdStep(); setVals(); ui.mark(k); await sleep(25 / ctx.speed); } }
          }
          ui.mark(k);
        },
      }));
      ui.reset();
      const pl = player(el, steps, ui);
      stepsEl.querySelectorAll('button').forEach((bt) => (bt.onclick = () => ui.onStepClick(+bt.dataset.k)));
    } };

  /* =================== 2. Backpropagation =================== */
  W.backpropanim = { title: 'Backpropagation animation: forward, loss, blame, update', desc: 'A 2-2-1 neural network with real numbers. Watch values flow forward, the loss get computed, gradients flow backward (blame), and the weights update.', lessons: ['backprop', 'calculus', 'gradient-descent'],
    mount(el) {
      el.innerHTML = `<div class="anim"><div class="anim-ctrl row"></div>
        <div class="row" style="align-items:flex-start;gap:14px"><div class="anim-stage" style="flex:1;min-width:300px"><svg viewBox="0 0 760 360" class="anim-svg" role="img" aria-label="Neural network backpropagation"></svg></div>
        <div style="width:250px"><div class="small muted" style="font-weight:700">LOSS OVER TRAINING STEPS</div><svg viewBox="0 0 250 120" class="bp-chart"></svg><button class="btn sm" data-x="train">⚡ Train 60 steps</button><div class="small muted" style="margin-top:6px">Input x = [1.0, 0.5], target y = 1.0, learning rate 1.0</div></div></div>
        <div class="anim-steps"></div><div class="anim-cap"></div></div>`;
      const svg = el.querySelector('svg.anim-svg'), chart = el.querySelector('.bp-chart');
      const P = { x: [[90, 95], [90, 290]], h: [[380, 95], [380, 290]], o: [640, 192] };
      const x = [1.0, 0.5], y = 1.0, lr = 1.0;
      let W1, b1, W2, b2, F, G, hist;
      const init = () => { W1 = [[0.5, -0.4], [0.3, 0.8]]; b1 = [0.1, -0.1]; W2 = [-0.6, 0.4]; b2 = 0.05; hist = []; F = null; G = null; };
      const forward = () => {
        const z1 = [0, 1].map((j) => W1[j][0] * x[0] + W1[j][1] * x[1] + b1[j]);
        const h = z1.map(sig);
        const z2 = W2[0] * h[0] + W2[1] * h[1] + b2, o = sig(z2), L = 0.5 * (o - y) ** 2;
        return { z1, h, z2, o, L };
      };
      const backward = (F) => {
        const dO = (F.o - y) * F.o * (1 - F.o);
        const dW2 = F.h.map((hj) => dO * hj), db2 = dO;
        const dH = [0, 1].map((j) => dO * W2[j] * F.h[j] * (1 - F.h[j]));
        const dW1 = [0, 1].map((j) => [dH[j] * x[0], dH[j] * x[1]]), db1 = dH;
        return { dO, dW2, db2, dH, dW1, db1 };
      };
      const update = (G) => { W2 = W2.map((w, j) => w - lr * G.dW2[j]); b2 -= lr * G.db2; W1 = W1.map((r, j) => r.map((w, i) => w - lr * G.dW1[j][i])); b1 = b1.map((b, j) => b - lr * G.db1[j]); };
      // static drawing
      let layer = {};
      const edgeStyle = (w) => ({ stroke: w >= 0 ? '#3b82f6' : '#e11d48', 'stroke-width': 1.5 + Math.min(7, Math.abs(w) * 6), opacity: .55 });
      function draw() {
        svg.innerHTML = '';
        const hdr = [['INPUTS (features)', 90], ['HIDDEN LAYER', 380], ['OUTPUT (prediction)', 640]];
        hdr.forEach(([t, xx]) => { const e = TL.svgEl('text', { x: xx, y: 18, 'text-anchor': 'middle', style: 'font:800 11px var(--sans);fill:var(--ink3);letter-spacing:.06em' }, svg); e.textContent = t; });
        layer.e1 = []; layer.e2 = []; layer.g1 = []; layer.g2 = [];
        [0, 1].forEach((j) => [0, 1].forEach((i) => {
          const [x1, y1] = P.x[i], [x2, y2] = P.h[j];
          const l = TL.svgEl('line', { x1, y1, x2, y2, ...edgeStyle(W1[j][i]) }, svg); layer.e1.push(l);
          const tt = i === j ? 0.36 : (i === 0 ? 0.22 : 0.78); const mx = x1 + (x2 - x1) * tt, my = y1 + (y2 - y1) * tt;
          const t = TL.svgEl('text', { x: mx, y: my - 8, 'text-anchor': 'middle', class: 'bp-w' }, svg); t.textContent = `w=${f(W1[j][i], 2)}`;
          const g = TL.svgEl('text', { x: mx, y: my + 16, 'text-anchor': 'middle', class: 'bp-g', opacity: 0 }, svg); layer.g1.push({ el: g, j, i });
        }));
        [0, 1].forEach((j) => {
          const [x1, y1] = P.h[j], [x2, y2] = P.o;
          const l = TL.svgEl('line', { x1, y1, x2, y2, ...edgeStyle(W2[j]) }, svg); layer.e2.push(l);
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
          const t = TL.svgEl('text', { x: mx, y: my - 10, 'text-anchor': 'middle', class: 'bp-w' }, svg); t.textContent = `w=${f(W2[j], 2)}`;
          const g = TL.svgEl('text', { x: mx, y: my + 16, 'text-anchor': 'middle', class: 'bp-g', opacity: 0 }, svg); layer.g2.push({ el: g, j });
        });
        const node = (cx, cy, r, fill, label, val, id) => {
          const g = TL.svgEl('g', { class: 'bp-node', 'data-id': id }, svg);
          TL.svgEl('circle', { cx, cy, r, fill: 'var(--card)', stroke: fill, 'stroke-width': 3 }, g);
          const t = TL.svgEl('text', { x: cx, y: cy - 4, 'text-anchor': 'middle', style: 'font:700 12px var(--sans);fill:var(--ink2)' }, g); t.textContent = label;
          const v = TL.svgEl('text', { x: cx, y: cy + 14, 'text-anchor': 'middle', class: 'bp-val' }, g); v.textContent = val;
          return { g, v };
        };
        layer.nx = P.x.map(([cx, cy], i) => node(cx, cy, 32, '#64748b', `x${i + 1}`, f(x[i], 1), 'x' + i));
        layer.nh = P.h.map(([cx, cy], j) => node(cx, cy, 36, '#8b5cf6', `h${j + 1}`, '?', 'h' + j));
        layer.no = node(P.o[0], P.o[1], 38, '#14b8a6', 'ŷ', '?', 'o');
        layer.dh = P.h.map(([cx, cy], j) => { const t = TL.svgEl('text', { x: cx, y: j ? cy + 56 : cy - 46, 'text-anchor': 'middle', class: 'bp-g', opacity: 0 }, svg); return t; });
        layer.do = TL.svgEl('text', { x: P.o[0], y: P.o[1] + 58, 'text-anchor': 'middle', class: 'bp-g', opacity: 0 }, svg);
        // loss box
        const lb = TL.svgEl('g', { opacity: 0.25 }, svg); layer.loss = lb;
        TL.svgEl('rect', { x: 600, y: 292, width: 150, height: 52, rx: 12, fill: 'color-mix(in srgb,#e11d48 10%,var(--card))', stroke: '#e11d48', 'stroke-width': 2 }, lb);
        const lt = TL.svgEl('text', { x: 675, y: 313, 'text-anchor': 'middle', style: 'font:800 12px var(--sans);fill:#e11d48' }, lb); lt.textContent = 'LOSS ½(ŷ − y)²';
        layer.lv = TL.svgEl('text', { x: 675, y: 334, 'text-anchor': 'middle', class: 'bp-val' }, lb); layer.lv.textContent = 'y = 1.0';
        TL.svgEl('line', { x1: P.o[0], y1: P.o[1] + 38, x2: 660, y2: 292, stroke: '#e11d48', 'stroke-width': 2, 'stroke-dasharray': '4 4' }, svg);
      }
      function plot() {
        chart.innerHTML = '';
        TL.svgEl('rect', { x: 0, y: 0, width: 250, height: 120, rx: 8, fill: 'var(--bg2)' }, chart);
        if (!hist.length) return;
        const mx = Math.max(...hist, 0.01);
        const pts = hist.map((v, k) => `${10 + k * (230 / Math.max(1, Math.max(60, hist.length) - 1))},${110 - v / mx * 95}`);
        TL.svgEl('polyline', { points: pts.join(' '), fill: 'none', stroke: '#e11d48', 'stroke-width': 2.5 }, chart);
        const t = TL.svgEl('text', { x: 240, y: 16, 'text-anchor': 'end', style: 'font:700 11px var(--mono);fill:var(--ink2)' }, chart); t.textContent = `step ${hist.length - 1}: loss ${f(hist[hist.length - 1], 4)}`;
      }
      const cap = el.querySelector('.anim-cap'), stepsEl = el.querySelector('.anim-steps');
      const names = ['Forward: inputs → hidden', 'Forward: hidden → output', 'Compute the loss', 'Backward: blame the output', 'Backward: blame the hidden layer', 'Update every weight'];
      stepsEl.innerHTML = names.map((n, k) => `<button class="fchip" data-k="${k}">${k + 1}. ${n}</button>`).join('');
      const caps = () => [
        { sw: 'Like a request flowing through the first middleware stage.', txt: `Each hidden neuron computes a weighted sum of the inputs plus a bias, then squashes it with a sigmoid: h = σ(w·x + b).`, math: F ? `h₁ = σ(${f(W1[0][0], 2)}·1.0 + ${f(W1[0][1], 2)}·0.5 + ${f(b1[0], 2)}) = σ(${f(F.z1[0])}) = <b>${f(F.h[0])}</b><br>h₂ = σ(${f(F.z1[1])}) = <b>${f(F.h[1])}</b>` : '' },
        { sw: 'The second stage produces the return value.', txt: 'The output neuron combines the hidden values the same way. This is the model’s prediction.', math: F ? `ŷ = σ(${f(W2[0], 2)}·${f(F.h[0])} + ${f(W2[1], 2)}·${f(F.h[1])} + ${f(b2, 2)}) = σ(${f(F.z2)}) = <b>${f(F.o)}</b>` : '' },
        { sw: 'The unit test fails: expected 1.0, got ' + (F ? f(F.o, 3) : '…') + '. The loss is the "how badly it failed" score.', txt: 'The loss measures the error. Training’s only goal is to make this number smaller.', math: F ? `L = ½(ŷ − y)² = ½(${f(F.o)} − 1.0)² = <b>${f(F.L, 4)}</b>` : '' },
        { sw: 'Reading the stack trace from the top frame: how much is the last function to blame?', txt: 'Start at the loss and ask: if the output’s pre-activation z₂ changed a little, how would the loss change? Then each output weight’s blame = that signal × the value that flowed through it.', math: G ? `δ_out = ∂L/∂z₂ = (ŷ − y)·ŷ(1 − ŷ) = <b>${f(G.dO, 4)}</b><br>∂L/∂w₂ⱼ = δ_out · hⱼ → [${G.dW2.map((v) => f(v, 4)).join(', ')}]` : '' },
        { sw: 'Going down the stack: blame passes through each caller, scaled by how much it influenced the next call.', txt: 'The chain rule passes blame backward along each edge (multiplied by the edge weight) and through each sigmoid (× h(1−h)). Each first-layer weight’s gradient = its neuron’s blame × its input.', math: G ? `δ_hⱼ = δ_out · w₂ⱼ · hⱼ(1 − hⱼ) → [${G.dH.map((v) => f(v, 4)).join(', ')}]<br>∂L/∂w₁ⱼᵢ = δ_hⱼ · xᵢ` : '' },
        { sw: 'The automatic code fix: every constant is nudged in the direction that makes the test fail less.', txt: 'Gradient descent: w ← w − lr · ∂L/∂w for every weight (edge thickness = weight size; blue positive, red negative). Run the forward pass again and the loss is lower. Press “Train 60 steps” to repeat this loop.', math: F ? `new loss = <b>${f(forward().L, 4)}</b> (was ${f(F.L, 4)})` : '' },
      ];
      const ui = {
        mark(k) {
          stepsEl.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === k));
          const c = caps()[k];
          cap.innerHTML = `<div class="ro-cap"><div><span class="ro-tag sw">IN SOFTWARE TERMS</span> ${c.sw}</div><div>${c.txt}</div><div class="bp-math">${c.math}</div></div>`;
          TL.addTerms && TL.addTerms(cap);
        },
        reset() { init(); draw(); plot(); cap.innerHTML = '<div class="ro-cap muted">Press <b>Play</b> or <b>Step</b>. Blue pulses = values going forward; red pulses = gradients (blame) going backward.</div>'; stepsEl.querySelectorAll('button').forEach((b) => b.classList.remove('on')); },
      };
      const showGrad = () => {
        layer.do.textContent = `δ = ${f(G.dO, 3)}`;
        layer.g2.forEach(({ el: e, j }) => (e.textContent = `∂L/∂w = ${f(G.dW2[j], 3)}`));
      };
      const showGrad1 = () => {
        layer.dh.forEach((e, j) => (e.textContent = `δ = ${f(G.dH[j], 4)}`));
        layer.g1.forEach(({ el: e, j, i }) => (e.textContent = `∂L/∂w = ${f(G.dW1[j][i], 4)}`));
      };
      const steps = [
        { run: async (ctx) => { F = forward(); if (!ctx.fast) await Promise.all([0, 1].flatMap((j) => [0, 1].map((i) => pulse(svg, ...P.x[i], ...P.h[j], '#3b82f6', 800 / ctx.speed)))); layer.nh.forEach((n, j) => (n.v.textContent = f(F.h[j], 3))); if (!hist.length) { hist.push(F.L); plot(); } } },
        { run: async (ctx) => { if (!ctx.fast) await Promise.all([0, 1].map((j) => pulse(svg, ...P.h[j], ...P.o, '#3b82f6', 800 / ctx.speed))); layer.no.v.textContent = f(F.o, 3); } },
        { run: async (ctx) => { if (!ctx.fast) await pulse(svg, P.o[0], P.o[1] + 38, 660, 300, '#e11d48', 500 / ctx.speed); layer.loss.setAttribute('opacity', 1); layer.lv.textContent = `L = ${f(F.L, 4)}`; } },
        { run: async (ctx) => { G = backward(F); if (!ctx.fast) await pulse(svg, 660, 300, P.o[0], P.o[1] + 38, '#e11d48', 500 / ctx.speed, 'δ'); layer.do.setAttribute('opacity', 1); if (!ctx.fast) await Promise.all([0, 1].map((j) => pulse(svg, ...P.o, ...P.h[j], '#e11d48', 800 / ctx.speed, '∂'))); showGrad(); layer.g2.forEach((g) => g.el.setAttribute('opacity', 1)); } },
        { run: async (ctx) => { if (!ctx.fast) await Promise.all([0, 1].flatMap((j) => [0, 1].map((i) => pulse(svg, ...P.h[j], ...P.x[i], '#e11d48', 800 / ctx.speed, '∂')))); showGrad1(); layer.dh.forEach((e) => e.setAttribute('opacity', 1)); layer.g1.forEach((g) => g.el.setAttribute('opacity', 1)); } },
        { run: async (ctx) => { update(G); draw(); const F2 = forward(); hist.push(F2.L); plot(); layer.nh.forEach((n, j) => (n.v.textContent = f(F2.h[j], 3))); layer.no.v.textContent = f(F2.o, 3); layer.loss.setAttribute('opacity', 1); layer.lv.textContent = `L = ${f(F2.L, 4)} ↓`; } },
      ];
      ui.reset();
      player(el, steps, ui);
      stepsEl.querySelectorAll('button').forEach((bt) => (bt.onclick = () => ui.onStepClick(+bt.dataset.k)));
      el.querySelector('[data-x="train"]').onclick = async () => {
        if (!hist.length) { hist.push(forward().L); }
        for (let t = 0; t < 60; t++) { const Fx = forward(); update(backward(Fx)); hist.push(forward().L); if (t % 3 === 0) { draw(); const Fy = forward(); layer.nh.forEach((n, j) => (n.v.textContent = f(Fy.h[j], 3))); layer.no.v.textContent = f(Fy.o, 3); layer.loss.setAttribute('opacity', 1); layer.lv.textContent = `L = ${f(Fy.L, 4)}`; plot(); await sleep(reduced() ? 0 : 40); } }
        draw(); const Fz = forward(); layer.nh.forEach((n, j) => (n.v.textContent = f(Fz.h[j], 3))); layer.no.v.textContent = f(Fz.o, 3); layer.loss.setAttribute('opacity', 1); layer.lv.textContent = `L = ${f(Fz.L, 4)}`; plot();
        cap.innerHTML = `<div class="ro-cap"><div>After ${hist.length - 1} update steps the prediction is <b>${f(Fz.o, 3)}</b> (target 1.0) and the loss fell from <b>${f(hist[0], 4)}</b> to <b>${f(Fz.L, 4)}</b>. That's training: forward → loss → backward → update, on repeat.</div></div>`;
      };
    } };


  /* =================== 3. Types of attention =================== */
  W.attnpatterns = { title: 'Types of attention animation: patterns, head sharing, FlashAttention, PagedAttention', desc: 'See who attends to whom (dense and sparse patterns), how MHA/GQA/MQA share keys and values, how FlashAttention tiles with an online softmax, and how PagedAttention stores the KV cache.', lessons: ['attention-types', 'masking', 'mqa-gqa'],
    mount(el) {
      const toks = ['The', 'cat', 'sat', 'on', 'the', 'mat', 'and', 'slept'];
      const src = ['The', 'cat', 'sleeps'], tgt = ['Le', 'chat', 'dort'];
      const types = {
        bidirectional: { name: 'Bidirectional', used: 'BERT, encoders', swe: 'reading the whole document freely', allow: (i, j) => true, why: 'Every token sees every token, past and future. Great for understanding, but it can’t generate left to right.' },
        causal: { name: 'Causal (GPT)', used: 'GPT, LLaMA, all chat LLMs', swe: 'reading a log only up to now', allow: (i, j) => j <= i, why: 'A token sees only itself and earlier tokens, because when generating, the future doesn’t exist yet. Training can still compute all positions in parallel.' },
        prefix: { name: 'Prefix-LM', used: 'T5-style, some multimodal models', swe: 'full access to the request, append-only for the response', allow: (i, j) => j <= i || j < 3, why: 'The first 3 tokens (the prompt) see each other fully; the generated part is causal.' },
        sliding: { name: 'Sliding window (w=3)', used: 'Mistral, Gemma layers', swe: 'a ring buffer of the last N lines', allow: (i, j) => j <= i && j > i - 3, why: 'Each token sees only the last 3 tokens. Cost grows linearly with length, and stacked layers pass information further back.' },
        sparse: { name: 'Sparse + global', used: 'Longformer, BigBird', swe: 'local lookups plus a global index', allow: (i, j) => Math.abs(i - j) <= 1 || i === 0 || j === 0, why: 'Neighbours only (±1), plus a global token (“The” here) that sees and is seen by everyone. Good for very long documents.' },
        strided: { name: 'Strided (sparse)', used: 'Sparse Transformer (OpenAI), GPT-3 alternating layers', swe: 'local stops plus express stops every k stations', allow: (i, j) => j <= i && (i - j < 2 || (i - j) % 3 === 0), why: 'Each token sees its immediate neighbour plus every 3rd earlier token. Two layers can connect any pair while computing far fewer scores.' },
        dilated: { name: 'Dilated (sparse)', used: 'Longformer (some heads), LongNet', swe: 'sampling a log at fixed intervals', allow: (i, j) => j <= i && (i - j) % 2 === 0 && i - j <= 6, why: 'Look at every 2nd token over a wider range, the same budget as a small window with twice the reach.' },
        block: { name: 'Block-sparse', used: 'Sparse Transformer kernels, BigBird blocks', swe: 'joining only within and across selected partitions', allow: (i, j) => j <= i && (Math.floor(i / 2) === Math.floor(j / 2) || Math.floor(j / 2) === 0), why: 'Tokens grouped in blocks of 2 attend within their block and to the first block. Blocks map neatly onto GPU tiles.' },
        bigbird: { name: 'BigBird (window+global+random)', used: 'BigBird, long-document QA', swe: 'local lookups + a global index + a few random cross-links', allow: (i, j) => Math.abs(i - j) <= 1 || i === 0 || j === 0 || [[2, 6], [6, 2], [4, 7], [7, 4], [3, 5], [5, 3]].some(([a, b]) => a === i && b === j), why: 'Sliding window (±1), a global token (“The”), and a few random links. The random links give short paths between any two tokens, keeping much of full attention’s power at O(n) cost.' },
        cross: { name: 'Cross-attention', used: 'T5, Whisper, translation, vision-language', swe: 'service A querying service B’s data', allow: () => true, cross: true, why: 'Queries come from the French output being generated; keys and values come from the English input. Each output word looks at the whole source.' },
      };
      el.innerHTML = `<div class="anim"><div class="seg" style="margin-bottom:10px"><button type="button" data-mode="see" class="on">① Who can see whom</button><button type="button" data-mode="share">② Who shares keys/values</button><button type="button" data-mode="flash">③ FlashAttention</button><button type="button" data-mode="paged">④ PagedAttention</button></div><div class="ap-body"></div></div>`;
      const body = el.querySelector('.ap-body');
      let mode = 'see', stopFlag = 0;
      el.querySelectorAll('[data-mode]').forEach((b) => (b.onclick = () => { mode = b.dataset.mode; el.querySelectorAll('[data-mode]').forEach((x) => x.classList.toggle('on', x === b)); stopFlag++; render(); }));

      function renderSee() {
        let type = 'causal', q = 4, playing = false;
        body.innerHTML = `<div class="filters ap-types">${Object.entries(types).map(([k, t]) => `<button class="fchip ${k === type ? 'on' : ''}" data-t="${k}">${t.name}</button>`).join('')}</div>
          <div class="anim-ctrl row"><button class="btn sm primary" data-a="play">▶ Sweep all queries</button><button class="btn sm" data-a="prev">← Prev token</button><button class="btn sm" data-a="next">Next token →</button><span class="small muted">Click any token to make it the query.</span></div>
          <div class="row" style="align-items:flex-start;gap:16px"><div class="anim-stage" style="flex:2;min-width:320px"><svg viewBox="0 0 760 250" class="anim-svg"></svg></div>
          <div style="flex:1;min-width:220px"><div class="small muted" style="font-weight:700;margin-bottom:4px">ATTENTION MASK (rows = queries, cols = keys)</div><div class="ap-grid"></div></div></div><div class="anim-cap"></div>`;
        const svg = body.querySelector('svg'), grid = body.querySelector('.ap-grid'), cap = body.querySelector('.anim-cap');
        const draw = (animate) => {
          const t = types[type];
          const qs = t.cross ? tgt : toks, ks = t.cross ? src : toks;
          q = Math.min(q, qs.length - 1);
          svg.innerHTML = '';
          const kx = (j) => 60 + j * (640 / Math.max(1, ks.length - 1)), qx = (i) => 60 + i * (640 / Math.max(1, qs.length - 1));
          const KY = t.cross ? 70 : 170, QY = 170;
          if (t.cross) { const a = TL.svgEl('text', { x: 10, y: KY - 30, style: 'font:800 11px var(--sans);fill:var(--ink3)' }, svg); a.textContent = 'ENCODER (English input) → keys/values'; const b = TL.svgEl('text', { x: 10, y: QY + 52, style: 'font:800 11px var(--sans);fill:var(--ink3)' }, svg); b.textContent = 'DECODER (French output) → queries'; }
          const allowed = ks.map((_, j) => t.allow(q, j));
          // arcs
          allowed.forEach((ok, j) => {
            if (!ok) return;
            const x1 = qx(q), x2 = kx(j);
            let d;
            if (t.cross) d = `M ${x1} ${QY - 18} C ${x1} ${QY - 60}, ${x2} ${KY + 60}, ${x2} ${KY + 18}`;
            else if (x1 === x2) d = `M ${x1 - 8} ${QY - 18} C ${x1 - 30} ${QY - 70}, ${x1 + 30} ${QY - 70}, ${x1 + 8} ${QY - 18}`;
            else { const h = 30 + Math.abs(x1 - x2) * 0.28; d = `M ${x1} ${QY - 18} C ${x1} ${QY - 18 - h}, ${x2} ${QY - 18 - h}, ${x2} ${QY - 18}`; }
            const path = TL.svgEl('path', { d, fill: 'none', stroke: '#10b981', 'stroke-width': 2.5, opacity: .85, class: animate ? 'ap-arc' : '' }, svg);
            if (animate) { const L = path.getTotalLength(); path.style.strokeDasharray = L; path.style.strokeDashoffset = L; requestAnimationFrame(() => { path.style.transition = 'stroke-dashoffset .6s ease'; path.style.strokeDashoffset = 0; }); }
          });
          const tokBox = (x, y, label, cls, onclick) => { const g = TL.svgEl('g', { class: 'ap-tok ' + cls, transform: `translate(${x} ${y})` }, svg); TL.svgEl('rect', { x: -38, y: -17, width: 76, height: 34, rx: 9 }, g); const tx = TL.svgEl('text', { y: 5, 'text-anchor': 'middle' }, g); tx.textContent = label; if (onclick) { g.style.cursor = 'pointer'; g.addEventListener('click', onclick); } return g; };
          ks.forEach((k, j) => { if (t.cross || j !== q) tokBox(kx(j), KY, k, allowed[j] ? 'ok' : 'blocked', t.cross ? null : () => { q = j; draw(true); }); });
          if (t.cross) qs.forEach((w, i) => tokBox(qx(i), QY, w, i === q ? 'query' : 'idle', () => { q = i; draw(true); }));
          else tokBox(qx(q), QY, toks[q], 'query');
          // grid
          grid.innerHTML = `<table class="ap-mask"><tr><th></th>${ks.map((k) => `<th>${k}</th>`).join('')}</tr>${qs.map((w, i) => `<tr class="${i === q ? 'cur' : ''}"><th>${w}</th>${ks.map((_, j) => `<td class="${t.allow(i, j) ? 'y' : 'n'}">${t.allow(i, j) ? '✓' : ''}</td>`).join('')}</tr>`).join('')}</table>`;
          grid.querySelectorAll('tr').forEach((tr, r) => { if (r) tr.onclick = () => { q = r - 1; draw(true); }; });
          const n = allowed.filter(Boolean).length;
          const total = qs.reduce((s, _, i) => s + ks.filter((__, j) => t.allow(i, j)).length, 0);
          cap.innerHTML = `<div class="ro-cap"><div><b>${t.name}</b> · used in: ${t.used}</div><div><span class="ro-tag sw">IN SOFTWARE TERMS</span> ${t.swe}</div><div>${t.why}</div><div class="bp-math">query “${qs[q]}” attends to ${n} of ${ks.length} tokens: [${ks.filter((_, j) => allowed[j]).join(', ')}] · whole mask: ${total} of ${qs.length * ks.length} pairs computed</div></div>`;
          TL.addTerms && TL.addTerms(cap);
        };
        body.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { type = b.dataset.t; body.querySelectorAll('[data-t]').forEach((x) => x.classList.toggle('on', x === b)); q = types[type].cross ? 0 : 4; draw(true); }));
        const n = () => (types[type].cross ? tgt : toks).length;
        body.querySelector('[data-a="next"]').onclick = () => { q = (q + 1) % n(); draw(true); };
        body.querySelector('[data-a="prev"]').onclick = () => { q = (q - 1 + n()) % n(); draw(true); };
        const pb = body.querySelector('[data-a="play"]');
        pb.onclick = async () => {
          if (playing) { playing = false; pb.textContent = '▶ Sweep all queries'; return; }
          playing = true; pb.textContent = '❚❚ Pause'; const my = ++stopFlag;
          for (let i = 0; i < n() && playing && my === stopFlag; i++) { q = i; draw(true); await sleep(1300); }
          playing = false; pb.textContent = '▶ Sweep all queries';
        };
        draw(true);
      }

      function renderShare() {
        const cfgs = { MHA: { kv: 8, used: 'GPT-2, GPT-3, original Transformer', note: 'Every query head has its own key/value head.' }, GQA: { kv: 2, used: 'LLaMA 2/3, Mistral, most modern LLMs', note: 'Groups of 4 query heads share one key/value head.' }, MQA: { kv: 1, used: 'PaLM, Falcon', note: 'All 8 query heads share a single key/value head.' } };
        let cur = 'MHA';
        body.innerHTML = `<div class="filters">${Object.keys(cfgs).map((k) => `<button class="fchip ${k === cur ? 'on' : ''}" data-c="${k}">${k}</button>`).join('')}<button class="btn sm" data-a="cycle">▶ Animate MHA → GQA → MQA</button></div>
          <div class="row" style="align-items:flex-start;gap:16px"><div class="anim-stage" style="flex:2;min-width:320px"><svg viewBox="0 0 760 260" class="anim-svg"></svg></div>
          <div style="flex:1;min-width:220px"><div class="small muted" style="font-weight:700;margin-bottom:4px">KV CACHE SIZE (per token, relative)</div><div class="ap-bars"></div><div class="small muted" style="margin-top:8px">Real example: a 70B-class model, 4k context, batch 8 in fp16 ≈ 80 GB of KV cache with MHA vs ≈ 10 GB with GQA-8.</div></div></div><div class="anim-cap"></div>`;
        const svg = body.querySelector('svg'), bars = body.querySelector('.ap-bars'), cap = body.querySelector('.anim-cap');
        const draw = () => {
          const c = cfgs[cur], H = 8, kv = c.kv, grp = H / kv;
          svg.innerHTML = '';
          const lab = (x, y, t) => { const e = TL.svgEl('text', { x, y, style: 'font:800 11px var(--sans);fill:var(--ink3);letter-spacing:.05em' }, svg); e.textContent = t; };
          lab(20, 40, 'QUERY HEADS (8)'); lab(20, 245, `KEY/VALUE HEADS (${kv}), what gets cached`);
          const qx = (i) => 80 + i * 86, kvx = (k) => (kv === 1 ? 380 : 80 + (k * grp + (grp - 1) / 2) * 86);
          const palette = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#e11d48', '#0ea5e9', '#14b8a6', '#6366f1'];
          for (let i = 0; i < H; i++) {
            const k = Math.floor(i / grp), col = palette[k % 8];
            const p = TL.svgEl('path', { d: `M ${qx(i)} 78 C ${qx(i)} 130, ${kvx(k)} 120, ${kvx(k)} 168`, fill: 'none', stroke: col, 'stroke-width': 2.5, opacity: .8 }, svg);
            const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; requestAnimationFrame(() => { p.style.transition = `stroke-dashoffset .7s ease ${i * 0.06}s`; p.style.strokeDashoffset = 0; });
            const g = TL.svgEl('g', { transform: `translate(${qx(i)} 62)` }, svg);
            TL.svgEl('rect', { x: -30, y: -16, width: 60, height: 32, rx: 8, fill: 'var(--card)', stroke: col, 'stroke-width': 2 }, g);
            const t = TL.svgEl('text', { y: 5, 'text-anchor': 'middle', style: 'font:700 12px var(--mono);fill:var(--ink)' }, g); t.textContent = `Q${i + 1}`;
          }
          for (let k = 0; k < kv; k++) {
            const col = palette[k % 8], g = TL.svgEl('g', { transform: `translate(${kvx(k)} 186)` }, svg);
            TL.svgEl('rect', { x: -34, y: -18, width: 68, height: 36, rx: 8, fill: col, opacity: .9 }, g);
            const t = TL.svgEl('text', { y: 5, 'text-anchor': 'middle', style: 'font:800 12px var(--mono);fill:#fff' }, g); t.textContent = `K/V${k + 1}`;
          }
          bars.innerHTML = Object.entries(cfgs).map(([k, v]) => `<div class="barrow" style="grid-template-columns:48px 1fr 40px"><b>${k}</b><div><div class="b" style="width:${v.kv / 8 * 100}%;${k === cur ? '' : 'opacity:.45'}"></div></div><span>${v.kv}/8</span></div>`).join('');
          cap.innerHTML = `<div class="ro-cap"><div><b>${cur}</b> · used in: ${c.used}</div><div><span class="ro-tag sw">IN SOFTWARE TERMS</span> ${cur === 'MHA' ? 'every reader keeps its own private cache' : cur === 'GQA' ? 'readers in a group share one cache entry, a deduplicated cache' : 'every reader shares a single cache'}</div><div>${c.note} Compute is nearly the same in all three; what changes is <b>how much K/V must be cached and read from memory on every generated token</b>. That's the real bottleneck when serving LLMs.</div><div class="bp-math">KV cache ∝ number of K/V heads → ${cur}: ${c.kv}/8 of MHA (${8 / c.kv}× smaller)</div></div>`;
          TL.addTerms && TL.addTerms(cap);
        };
        body.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => { cur = b.dataset.c; body.querySelectorAll('[data-c]').forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
        body.querySelector('[data-a="cycle"]').onclick = async () => { const my = ++stopFlag; for (const k of ['MHA', 'GQA', 'MQA']) { if (my !== stopFlag) return; cur = k; body.querySelectorAll('[data-c]').forEach((x) => x.classList.toggle('on', x.dataset.c === k)); draw(); await sleep(2200); } };
        draw();
      }
      function renderFlash() {
        const T = 8, B = 2;
        body.innerHTML = `<div class="anim-ctrl row"><button class="btn sm primary" data-a="play">▶ Play</button><button class="btn sm" data-a="reset">⟲ Reset</button><span class="small muted">Left: standard attention materialises the whole 8×8 score table in slow memory. Right: FlashAttention streams 2×2 tiles through fast on-chip memory and never stores the table.</span></div>
          <div class="anim-stage"><svg viewBox="0 0 900 330" class="anim-svg"></svg></div>
          <div class="row" style="align-items:flex-start;gap:14px;margin-top:10px"><div style="flex:1;min-width:300px"><div class="small muted" style="font-weight:700">ONLINE SOFTMAX FOR QUERY ROW 1 (processed block by block)</div><div class="fl-table"></div></div><div class="anim-cap" style="flex:1;min-width:280px"></div></div>`;
        const svg = body.querySelector('svg'), tbl = body.querySelector('.fl-table'), cap = body.querySelector('.anim-cap');
        const scores = [1.2, 0.3, 2.0, -0.5, 0.8, 1.5, -1.0, 0.1], vals = [1, 0, 2, 1, 3, 0, 1, 2];
        const cell = 26, LX = 60, RX = 520, GY = 70;
        let cellsL = [], cellsR = [], sram, hbmL, hbmR, outBars = [];
        const build = () => {
          svg.innerHTML = ''; cellsL = []; cellsR = []; outBars = [];
          const title = (x, t, c) => { const e = TL.svgEl('text', { x, y: 30, style: `font:800 13px var(--sans);fill:${c}` }, svg); e.textContent = t; };
          title(LX, 'STANDARD ATTENTION', '#e11d48'); title(RX, 'FLASHATTENTION', '#10b981');
          for (let i = 0; i < T; i++) for (let j = 0; j < T; j++) {
            cellsL.push(TL.svgEl('rect', { x: LX + j * cell, y: GY + i * cell, width: cell - 2, height: cell - 2, rx: 3, fill: 'var(--bg2)' }, svg));
            cellsR.push(TL.svgEl('rect', { x: RX + j * cell, y: GY + i * cell, width: cell - 2, height: cell - 2, rx: 3, fill: 'var(--bg2)' }, svg));
          }
          [['Q rows (queries) ↓', LX - 8, GY + 110, -90], ['Q rows ↓', RX - 8, GY + 110, -90]].forEach(([t, x, y, r]) => { const e = TL.svgEl('text', { x, y, transform: `rotate(${r} ${x} ${y})`, 'text-anchor': 'middle', style: 'font:600 11px var(--sans);fill:var(--ink3)' }, svg); e.textContent = t; });
          [[LX, 'K columns (keys) →'], [RX, 'K columns →']].forEach(([x, t]) => { const e = TL.svgEl('text', { x: x + 104, y: GY - 8, 'text-anchor': 'middle', style: 'font:600 11px var(--sans);fill:var(--ink3)' }, svg); e.textContent = t; });
          for (let i = 0; i < T; i++) outBars.push(TL.svgEl('rect', { x: RX + T * cell + 14, y: GY + i * cell, width: 16, height: cell - 2, rx: 3, fill: 'var(--bg2)' }, svg));
          const ol = TL.svgEl('text', { x: RX + T * cell + 22, y: GY - 8, 'text-anchor': 'middle', style: 'font:700 11px var(--sans);fill:var(--ink3)' }, svg); ol.textContent = 'O';
          // SRAM box
          const g = TL.svgEl('g', {}, svg);
          TL.svgEl('rect', { x: 330, y: 110, width: 150, height: 92, rx: 12, fill: 'color-mix(in srgb,#10b981 10%,var(--card))', stroke: '#10b981', 'stroke-width': 2 }, g);
          const st = TL.svgEl('text', { x: 405, y: 130, 'text-anchor': 'middle', style: 'font:800 11px var(--sans);fill:#10b981' }, g); st.textContent = 'SRAM (fast, tiny)';
          sram = TL.svgEl('text', { x: 405, y: 158, 'text-anchor': 'middle', style: 'font:700 12px var(--mono);fill:var(--ink)' }, g); sram.textContent = 'idle';
          const sram2 = TL.svgEl('text', { x: 405, y: 182, 'text-anchor': 'middle', style: 'font:600 11px var(--sans);fill:var(--ink3)' }, g); sram2.textContent = 'running max m, sum ℓ';
          hbmL = TL.svgEl('text', { x: LX, y: GY + T * cell + 34, style: 'font:700 12px var(--mono);fill:#e11d48' }, svg);
          hbmR = TL.svgEl('text', { x: RX, y: GY + T * cell + 34, style: 'font:700 12px var(--mono);fill:#10b981' }, svg);
          hbmL.textContent = 'n×n table in HBM: 0 / 64 cells'; hbmR.textContent = 'n×n table in HBM: never stored';
        };
        // online softmax rows for query row 0
        const rows = []; let m = -Infinity, l = 0, o = 0;
        for (let k = 0; k < T; k += B) {
          const bs = scores.slice(k, k + B), bv = vals.slice(k, k + B);
          const m2 = Math.max(m, ...bs), sc = Number.isFinite(m) ? Math.exp(m - m2) : 0;
          const l2 = sc * l + bs.reduce((a, x) => a + Math.exp(x - m2), 0);
          const o2 = sc * o + bs.reduce((a, x, q) => a + Math.exp(x - m2) * bv[q], 0);
          rows.push({ k, bs, m: m2, l: l2, o: o2, scale: sc }); m = m2; l = l2; o = o2;
        }
        const ref = TL.softmax(scores).reduce((a, p, j) => a + p * vals[j], 0);
        const showTable = (n) => {
          tbl.innerHTML = `<table class="mtable" style="width:100%"><tr><th>keys</th><th>block scores</th><th>rescale e^(m−m′)</th><th>running max m</th><th>running sum ℓ</th><th>running out o</th></tr>${rows.map((r, i) => `<tr style="opacity:${i < n ? 1 : .25}"><td>${r.k + 1}–${r.k + B}</td><td>[${r.bs.join(', ')}]</td><td>${i ? r.scale.toFixed(3) : '-'}</td><td>${r.m.toFixed(2)}</td><td>${r.l.toFixed(3)}</td><td>${r.o.toFixed(3)}</td></tr>`).join('')}</table>
            <div class="bp-math" style="margin-top:6px">${n >= rows.length ? `final = o / ℓ = ${(rows[3].o / rows[3].l).toFixed(4)} · standard softmax·V = ${ref.toFixed(4)} ✓ identical` : 'final = o / ℓ (after the last block)'}</div>`;
        };
        const capTxt = (phase) => {
          cap.innerHTML = `<div class="ro-cap"><div><span class="ro-tag sw">IN SOFTWARE TERMS</span> a blocked/tiled join that keeps its working set in CPU cache instead of writing a giant intermediate table to disk.</div><div>${phase}</div><div class="small muted">Same FLOPs, same exact result; the win is memory traffic. HBM is large but slow; SRAM is ~10× faster but only a few MB, so the full n×n table never fits there. For n = 32k tokens that table is 1 billion entries per head.</div></div>`;
          TL.addTerms && TL.addTerms(cap);
        };
        let token = 0;
        const reset = () => { token++; build(); showTable(0); capTxt('Press <b>Play</b>.'); };
        const play = async () => {
          const my = ++token; build(); showTable(0);
          capTxt('<b>Standard:</b> compute all 64 scores, write them to slow memory (HBM), read back for softmax, write probabilities, read again to multiply by V. <b>Flash:</b> loop over tiles instead.');
          let filled = 0, tileCount = 0;
          for (let qi = 0; qi < T; qi += B) {
            for (let kj = 0; kj < T; kj += B) {
              if (my !== token) return;
              // left: fill an equivalent amount of the full table
              for (let c = 0; c < B * B; c++) { if (filled < 64) { cellsL[filled].setAttribute('fill', '#fda4af'); filled++; } }
              hbmL.textContent = `n×n table in HBM: ${filled} / 64 cells`;
              // right: highlight tile in SRAM
              const tile = [];
              for (let a = 0; a < B; a++) for (let b2 = 0; b2 < B; b2++) tile.push(cellsR[(qi + a) * T + kj + b2]);
              tile.forEach((r) => r.setAttribute('fill', '#f59e0b'));
              sram.textContent = `Q[${qi + 1}-${qi + B}] · K,V[${kj + 1}-${kj + B}]`;
              tileCount++;
              if (qi === 0) { showTable(kj / B + 1); capTxt(`Tile ${tileCount}: scores for queries ${qi + 1}–${qi + B} × keys ${kj + 1}–${kj + B} are computed <b>in SRAM</b>, folded into the running max/sum (see table), then <b>discarded</b>.`); }
              await sleep(qi === 0 ? 900 : 260);
              tile.forEach((r) => r.setAttribute('fill', 'color-mix(in srgb,#10b981 22%,var(--bg2))'));
            }
            for (let a = 0; a < B; a++) outBars[qi + a].setAttribute('fill', '#10b981');
          }
          sram.textContent = 'done';
          capTxt('Done. Standard attention stored the whole 64-cell table in HBM; FlashAttention only ever wrote the output rows <b>O</b> (green), and the result is identical.');
        };
        body.querySelector('[data-a="play"]').onclick = play;
        body.querySelector('[data-a="reset"]').onclick = reset;
        reset();
      }

      function renderPaged() {
        const reqs = [{ n: 'A', len: 6, c: '#3b82f6' }, { n: 'B', len: 11, c: '#8b5cf6' }, { n: 'C', len: 3, c: '#10b981' }];
        const MAX = 16, BS = 4, NBLK = 12;
        body.innerHTML = `<div class="anim-ctrl row"><button class="btn sm primary" data-a="play">▶ Generate tokens</button><button class="btn sm" data-a="reset">⟲ Reset</button><span class="small muted">Three requests generate tokens. Each token adds a K/V entry to the cache.</span></div>
          <div class="anim-stage"><svg viewBox="0 0 900 300" class="anim-svg"></svg></div><div class="anim-cap"></div>`;
        const svg = body.querySelector('svg'), cap = body.querySelector('.anim-cap');
        const order = [7, 2, 10, 0, 5, 9, 3, 11, 1, 6, 4, 8]; // free-list order: blocks land anywhere
        let st, token = 0;
        const draw = () => {
          svg.innerHTML = '';
          const t1 = TL.svgEl('text', { x: 20, y: 26, style: 'font:800 13px var(--sans);fill:#e11d48' }, svg); t1.textContent = 'CONTIGUOUS: reserve max length (16) per request';
          const t2 = TL.svgEl('text', { x: 480, y: 26, style: 'font:800 13px var(--sans);fill:#10b981' }, svg); t2.textContent = 'PAGED: 4-token blocks, allocated on demand';
          reqs.forEach((r, k) => {
            const y = 50 + k * 50;
            const lb = TL.svgEl('text', { x: 20, y: y + 17, style: `font:800 13px var(--mono);fill:${r.c}` }, svg); lb.textContent = r.n;
            for (let i = 0; i < MAX; i++) {
              const used = i < st.gen[k];
              TL.svgEl('rect', { x: 40 + i * 25, y, width: 22, height: 26, rx: 3, fill: used ? r.c : 'var(--card)', stroke: used ? r.c : '#fca5a5', 'stroke-dasharray': used ? '' : '3 2', opacity: used ? 1 : .8 }, svg);
            }
          });
          // paged pool 3 rows x 4 blocks
          for (let b = 0; b < NBLK; b++) {
            const bx = 480 + (b % 4) * 102, by = 44 + Math.floor(b / 4) * 56;
            const owner = st.owner[b];
            TL.svgEl('rect', { x: bx - 3, y: by - 3, width: 98, height: 34, rx: 6, fill: 'none', stroke: 'var(--line)' }, svg);
            const bl = TL.svgEl('text', { x: bx + 46, y: by + 44, 'text-anchor': 'middle', style: 'font:600 10px var(--mono);fill:var(--ink3)' }, svg); bl.textContent = `block ${b}`;
            for (let s = 0; s < BS; s++) {
              const filled = owner !== undefined && s < st.fill[b];
              TL.svgEl('rect', { x: bx + s * 23, y: by, width: 20, height: 28, rx: 3, fill: filled ? reqs[owner].c : owner !== undefined ? 'var(--card)' : 'var(--bg2)', stroke: owner !== undefined ? reqs[owner].c : 'var(--line)', 'stroke-dasharray': owner !== undefined && !filled ? '3 2' : '' }, svg);
            }
          }
          // block tables
          reqs.forEach((r, k) => { const e = TL.svgEl('text', { x: 480, y: 232 + k * 20, style: `font:700 12px var(--mono);fill:${r.c}` }, svg); e.textContent = `${r.n} block table → [${st.table[k].join(', ')}]`; });
          const used = st.gen.reduce((a, b) => a + b, 0);
          const contWaste = 1 - used / (MAX * reqs.length);
          const allocated = Object.keys(st.owner).length * BS;
          const pagedWaste = allocated ? 1 - used / allocated : 0;
          const w1 = TL.svgEl('text', { x: 20, y: 232, style: 'font:700 12px var(--mono);fill:#e11d48' }, svg); w1.textContent = `reserved ${MAX * reqs.length} slots, used ${used} → wasted ${(contWaste * 100).toFixed(0)}%`;
          const w2 = TL.svgEl('text', { x: 20, y: 256, style: 'font:700 12px var(--mono);fill:#10b981' }, svg); w2.textContent = `paged: allocated ${allocated} slots, used ${used} → wasted ${(pagedWaste * 100).toFixed(0)}%`;
        };
        const reset = () => { token++; st = { gen: [0, 0, 0], owner: {}, fill: {}, table: [[], [], []], next: 0 }; draw(); capText('Press <b>Generate tokens</b>.'); };
        const capText = (x) => { cap.innerHTML = `<div class="ro-cap"><div><span class="ro-tag sw">IN SOFTWARE TERMS</span> OS virtual-memory paging: each request gets a page table (block table) mapping its logical token positions to physical blocks anywhere in GPU memory.</div><div>${x}</div><div class="small muted">Less waste → more requests fit in GPU memory at once → higher throughput. Blocks can also be shared between requests with the same prompt prefix (copy-on-write).</div></div>`; TL.addTerms && TL.addTerms(cap); };
        const play = async () => {
          const my = ++token; st = { gen: [0, 0, 0], owner: {}, fill: {}, table: [[], [], []], next: 0 }; draw();
          capText('Contiguous allocation must reserve the <b>maximum</b> length up front (dashed red = reserved but unused). Paged allocation grabs a new 4-token block only when the current one is full, from wherever free memory is.');
          for (let step = 0; step < 11; step++) {
            for (let k = 0; k < reqs.length; k++) {
              if (my !== token) return;
              if (st.gen[k] >= reqs[k].len) continue;
              const pos = st.gen[k];
              if (pos % BS === 0) { const b = order[st.next++]; st.owner[b] = k; st.fill[b] = 0; st.table[k].push(b); }
              const blk = st.table[k][st.table[k].length - 1];
              st.fill[blk]++; st.gen[k]++;
            }
            draw(); await sleep(420);
          }
          capText('Done. Contiguous wasted most of its reserved memory; paged wastes only the unused tail of each request\u2019s last block. Notice the blocks of one request are scattered: the block table makes that invisible to the attention kernel.');
        };
        body.querySelector('[data-a="play"]').onclick = play;
        body.querySelector('[data-a="reset"]').onclick = reset;
        reset();
      }
      const render = () => (mode === 'see' ? renderSee() : mode === 'share' ? renderShare() : mode === 'flash' ? renderFlash() : renderPaged());
      render();
    } };


  /* =================== 4. Attention math lab (editable numbers) =================== */
  W.attnmath = { title: 'Attention Math Lab: change the numbers, see every step', desc: 'Edit Q, K, V and pick a mechanism (dot product, norm, scaled, causal, sliding window, sparse, multi-head, MQA/GQA, cross, FlashAttention, linear) to see every calculation with your numbers.', lessons: ['dot-products', 'scaled-dot-product', 'masking', 'multi-head', 'attention-types', 'mqa-gqa', 'flashattention'],
    mount(el, init) {
      const fm = (x) => (!Number.isFinite(x) ? (x < 0 ? '−∞' : '∞') : (Math.abs(x) >= 1e5 || (Math.abs(x) < 1e-3 && x !== 0) ? x.toExponential(2) : String(+x.toFixed(3))));
      const vec = (v) => `[${v.map(fm).join(', ')}]`;
      const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
      const norm = (a) => Math.sqrt(dot(a, a));
      const MODES = {
        dot: 'Dot product', norm: 'Norm & cosine', scaled: 'Scaled dot-product attention', causal: 'Causal (masked)', sliding: 'Sliding window', sparse: 'Sparse (strided)',
        multihead: 'Multi-head (2 heads)', gqa: 'MQA / GQA (shared K/V)', cross: 'Cross-attention', flash: 'FlashAttention (online softmax)', linear: 'Linear attention',
      };
      const PRESETS = {
        simple: { name: 'Simple (4 tokens, d=2)', Q: [[1, 0], [0, 1], [1, 1], [2, 0]], K: [[1, 0], [0, 1], [1, 1], [0, 2]], V: [[1, 0], [0, 1], [1, 1], [2, 2]] },
        yours: { name: 'Q=1,2,3,4 · K=10,20,30,40 (d=1)', Q: [[1], [2], [3], [4]], K: [[10], [20], [30], [40]], V: [[1], [2], [3], [4]] },
        single: { name: 'One token, d=4: Q=[1,2,3,4] K=[10,20,30,40]', Q: [[1, 2, 3, 4]], K: [[10, 20, 30, 40]], V: [[1, 1, 1, 1]] },
        heads: { name: '4 tokens, d=4 (for multi-head)', Q: [[1, 0, 0, 1], [0, 1, 1, 0], [1, 1, 0, 0], [0, 0, 1, 1]], K: [[1, 0, 1, 0], [0, 1, 0, 1], [1, 1, 0, 0], [0, 0, 1, 1]], V: [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]] },
      };
      let st = { mode: MODES[init] ? init : 'dot', row: 0, win: 2, stride: 2, block: 2 };
      const load = (k) => { const p = PRESETS[k]; st.Q = p.Q.map((r) => r.slice()); st.K = p.K.map((r) => r.slice()); st.V = p.V.map((r) => r.slice()); st.row = Math.min(st.row, st.Q.length - 1); };
      load(['multihead', 'gqa'].includes(st.mode) ? 'heads' : 'simple');
      el.innerHTML = `<div class="am">
        <div class="filters am-modes">${Object.entries(MODES).map(([k, n]) => `<button class="fchip" data-m="${k}">${n}</button>`).join('')}</div>
        <div class="row small" style="margin:6px 0">Presets: ${Object.entries(PRESETS).map(([k, p]) => `<button class="btn sm" data-p="${k}">${p.name}</button>`).join('')}</div>
        <div class="row small" style="margin:6px 0"><label>tokens T <select data-s="T">${[1, 2, 3, 4, 5, 6].map((n) => `<option>${n}</option>`).join('')}</select></label><label>dimension d <select data-s="d">${[1, 2, 3, 4].map((n) => `<option>${n}</option>`).join('')}</select></label><span class="am-extra"></span></div>
        <div class="row am-mats" style="align-items:flex-start;gap:18px"></div>
        <div class="row small am-rows" style="margin:8px 0"></div>
        <div class="am-out"></div></div>`;
      const mats = el.querySelector('.am-mats'), out = el.querySelector('.am-out');
      const buildMats = () => {
        const T = st.Q.length, d = st.Q[0].length;
        el.querySelector('[data-s="T"]').value = T; el.querySelector('[data-s="d"]').value = d;
        const ed = (name, M, col, label) => `<div><div class="small" style="font-weight:800;color:${col}">${name} <span class="dims">${T}×${d}</span> <span class="muted" style="font-weight:500">${label}</span></div><div class="am-grid" style="grid-template-columns:auto repeat(${d},56px)"><span></span>${M[0].map((_, j) => `<span class="am-h">d${j + 1}</span>`).join('')}${M.map((r, i) => `<span class="am-h">t${i + 1}</span>` + r.map((v, j) => `<input type="number" step="any" value="${v}" data-m="${name}" data-i="${i}" data-j="${j}">`).join('')).join('')}</div></div>`;
        mats.innerHTML = ed('Q', st.Q, '#f59e0b', st.mode === 'cross' ? '(decoder: queries)' : '(queries)') + ed('K', st.K, '#3b82f6', st.mode === 'cross' ? '(encoder: keys)' : '(keys)') + (['dot', 'norm'].includes(st.mode) ? '' : ed('V', st.V, '#8b5cf6', st.mode === 'cross' ? '(encoder: values)' : '(values)'));
        mats.querySelectorAll('input').forEach((inp) => inp.addEventListener('input', () => { const v = parseFloat(inp.value); st[inp.dataset.m][+inp.dataset.i][+inp.dataset.j] = Number.isFinite(v) ? v : 0; compute(); }));
        el.querySelector('.am-rows').innerHTML = `Show the calculation for query token: ${st.Q.map((_, i) => `<button class="fchip ${i === st.row ? 'on' : ''}" data-r="${i}">t${i + 1}</button>`).join('')}`;
        el.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => { st.row = +b.dataset.r; buildMats(); compute(); }));
        const ex = el.querySelector('.am-extra');
        ex.innerHTML = st.mode === 'sliding' ? `<label>window w <input type="number" min="1" max="6" value="${st.win}" data-x="win" style="width:56px"></label>` : st.mode === 'sparse' ? `<label>stride s <input type="number" min="2" max="5" value="${st.stride}" data-x="stride" style="width:56px"></label>` : st.mode === 'flash' ? `<label>key block size <input type="number" min="1" max="4" value="${st.block}" data-x="block" style="width:56px"></label>` : '';
        ex.querySelectorAll('[data-x]').forEach((i) => i.addEventListener('input', () => { st[i.dataset.x] = Math.max(1, +i.value || 1); compute(); }));
        el.querySelectorAll('[data-m]').forEach((b) => { if (b.tagName === 'BUTTON') b.classList.toggle('on', b.dataset.m === st.mode); });
      };
      const resize = (T, d) => {
        const fit = (M, def) => [...Array(T)].map((_, i) => [...Array(d)].map((_, j) => (M[i] && M[i][j] !== undefined ? M[i][j] : def(i, j))));
        st.Q = fit(st.Q, (i, j) => (i + j) % 2); st.K = fit(st.K, (i, j) => (i === j ? 1 : 0)); st.V = fit(st.V, (i, j) => i + 1);
        st.row = Math.min(st.row, T - 1); buildMats(); compute();
      };
      el.querySelector('[data-s="T"]').onchange = (e) => resize(+e.target.value, st.Q[0].length);
      el.querySelector('[data-s="d"]').onchange = (e) => resize(st.Q.length, +e.target.value);
      el.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => { load(b.dataset.p); buildMats(); compute(); }));
      el.querySelectorAll('.am-modes [data-m]').forEach((b) => (b.onclick = () => { st.mode = b.dataset.m; if (['multihead', 'gqa'].includes(st.mode) && st.Q[0].length % 2) load('heads'); buildMats(); compute(); }));

      const stepBox = (title, body, swe) => `<div class="am-step"><div class="am-t">${title}</div>${swe ? `<div class="small" style="color:#0f766e;margin-bottom:4px">${swe}</div>` : ''}<div class="am-eq">${body}</div></div>`;
      const prod = (a, b) => a.map((x, i) => `${fm(x)}×${fm(b[i])}`).join(' + ');
      /* score table: headers show the actual vectors, every cell shows its own multiplication */
      const sTable = (S, allowed, rowSel, label, Qm = st.Q, Km = st.K) => `<div class="small muted" style="margin-bottom:4px">Rows = the token that is <b>asking</b> (its query, left edge). Columns = the token being <b>looked at</b> (its key, top edge). Each cell = row query · column key.</div>
        <div class="scroll-x"><table class="mtable am-st"><tr><th>${label || ''}</th>${Km.map((k, j) => `<th>k${j + 1} = ${vec(k)}</th>`).join('')}</tr>${S.map((r, i) => `<tr class="${i === rowSel ? 'sel' : ''}"><th>q${i + 1} = ${vec(Qm[i])}</th>${r.map((v, j) => allowed && !allowed(i, j) ? `<td class="am-masked">masked → −∞</td>` : `<td>${prod(Qm[i], Km[j])} = <b>${fm(v)}</b></td>`).join('')}</tr>`).join('')}</table></div>`;
      /* full pipeline for one row: scores -> scale -> mask -> softmax -> weighted V */
      function pipeline(Qm, Km, Vm, r, allowed, dk, titlePrefix = '') {
        const q = Qm[r], T = Km.length, sc = Math.sqrt(dk);
        let h = '';
        const raw = Km.map((k) => dot(q, k));
        h += stepBox(`${titlePrefix}Step 1 · Dot products q${r + 1} · kⱼ (one scalar per key)`, Km.map((k, j) => `q${r + 1}·k${j + 1} = ${q.map((x, i) => `${fm(x)}×${fm(k[i])}`).join(' + ')} = <b>${fm(raw[j])}</b>`).join('<br>'), 'In software terms: a relevance score between the query and each stored key.');
        const scaled = raw.map((x) => x / sc);
        h += stepBox(`${titlePrefix}Step 2 · Scale: divide each score by √d<sub>k</sub> = √${dk} = ${fm(sc)}`, raw.map((x, j) => `k${j + 1}: ${fm(x)} ÷ ${fm(sc)} = <b>${fm(scaled[j])}</b>`).join('<br>'), 'Keeps scores from growing with vector size, so softmax doesn’t saturate.');
        const masked = scaled.map((x, j) => (allowed(r, j) ? x : -Infinity));
        const hasMask = masked.some((x) => x === -Infinity);
        if (hasMask) h += stepBox(`${titlePrefix}Step 3 · Mask`, masked.map((x, j) => `k${j + 1}: ${Number.isFinite(x) ? `allowed → ${fm(x)}` : `blocked → −∞ (so e^(−∞) = 0, weight 0)`}`).join('<br>'), 'Access control: these keys may not be read by this query.');
        const m = Math.max(...masked.filter(Number.isFinite));
        const ex = masked.map((x) => (Number.isFinite(x) ? Math.exp(x - m) : 0));
        const Z = ex.reduce((a, b) => a + b, 0);
        const w = ex.map((x) => x / Z);
        const n0 = hasMask ? 4 : 3;
        h += stepBox(`${titlePrefix}Step ${n0} · Softmax: turn scores into weights that sum to 1`,
          `<b>a) Find the biggest score</b> (subtracted first so exp() never overflows): max(${masked.filter(Number.isFinite).map(fm).join(', ')}) = <b>${fm(m)}</b><br>`
          + `<b>b) Exponentiate each (score − max):</b><br>` + masked.map((x, j) => Number.isFinite(x) ? `&nbsp;&nbsp;k${j + 1}: e^(${fm(x)} − ${fm(m)}) = e^(${fm(x - m)}) = <b>${fm(ex[j])}</b>` : `&nbsp;&nbsp;k${j + 1}: masked → 0`).join('<br>')
          + `<br><b>c) Add them up:</b> ${ex.map(fm).join(' + ')} = <b>${fm(Z)}</b><br>`
          + `<b>d) Divide each by the sum:</b><br>` + ex.map((x, j) => `&nbsp;&nbsp;k${j + 1}: ${fm(x)} ÷ ${fm(Z)} = <b>${fm(w[j])}</b> (${fm(w[j] * 100)}%)`).join('<br>')
          + `<br>check: ${w.map(fm).join(' + ')} = ${fm(w.reduce((a, b) => a + b, 0))}`, 'Normalise scores into percentages.');
        const o = Vm[0].map((_, c) => w.reduce((s, wj, j) => s + wj * Vm[j][c], 0));
        h += stepBox(`${titlePrefix}Step ${n0 + 1} · Output = Σ weightⱼ × vⱼ (done separately for each dimension)`,
          Vm.map((v, j) => `v${j + 1} = ${vec(v)} · weight ${fm(w[j])}`).join('<br>') + '<br>'
          + Vm[0].map((_, c) => `<b>dim ${c + 1}:</b> ${Vm.map((v, j) => `${fm(w[j])}×${fm(v[c])}`).join(' + ')} = ${Vm.map((v, j) => fm(w[j] * v[c])).join(' + ')} = <b>${fm(o[c])}</b>`).join('<br>')
          + `<br>output for q${r + 1} = <b>${vec(o)}</b>`, 'A weighted blend of the values the query found relevant.');
        return { html: h, o, w, raw, scaled };
      }
      const all = () => true;

      function compute() {
        const Q = st.Q, K = st.K, V = st.V, T = Q.length, d = Q[0].length, r = st.row, q = Q[r];
        let h = '';
        const S = Q.map((qq) => K.map((k) => dot(qq, k)));
        switch (st.mode) {
          case 'dot':
            h += stepBox('Dot product = multiply matching positions, then add', K.map((k, j) => `q${r + 1}·k${j + 1} = ${q.map((x, i) => `(${fm(x)}×${fm(k[i])})`).join(' + ')} = ${q.map((x, i) => fm(x * k[i])).join(' + ')} = <b>${fm(dot(q, k))}</b>`).join('<br>'), 'Like zip(a, b).map(x*y).sum(). Two vectors in, ONE number (scalar) out.');
            h += stepBox(`All queries × all keys at once: S = QKᵀ (${T}×${T}, every cell is one dot product)`, sTable(S, null, r));
            break;
          case 'norm': {
            const nq = norm(q);
            h += stepBox(`L2 norm (length) of q${r + 1}`, `‖q${r + 1}‖ = √(${q.map((x) => `${fm(x)}²`).join(' + ')}) = √(${q.map((x) => fm(x * x)).join(' + ')}) = √${fm(dot(q, q))} = <b>${fm(nq)}</b><br>L1 norm = ${q.map((x) => `|${fm(x)}|`).join(' + ')} = <b>${fm(q.reduce((a, x) => a + Math.abs(x), 0))}</b>`, 'The size of the vector. Always ≥ 0, one number.');
            h += stepBox('Cosine similarity = dot / (‖q‖ × ‖k‖): direction only, length ignored', K.map((k, j) => { const nk = norm(k), c = dot(q, k) / (nq * nk || 1); return `<b>k${j + 1} = ${vec(k)}</b><br>&nbsp;&nbsp;dot q·k = ${prod(q, k)} = ${fm(dot(q, k))}<br>&nbsp;&nbsp;‖k${j + 1}‖ = √(${k.map((x) => `${fm(x)}²`).join(' + ')}) = √${fm(dot(k, k))} = ${fm(nk)}<br>&nbsp;&nbsp;cos = ${fm(dot(q, k))} ÷ (${fm(nq)} × ${fm(nk)}) = ${fm(dot(q, k))} ÷ ${fm(nq * nk)} = <b>${fm(c)}</b> (angle ${fm(Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI)}°)`; }).join('<br>'), '1 = same direction, 0 = unrelated (perpendicular), −1 = opposite. Used in semantic search / vector DBs.');
            break;
          }
          case 'scaled': {
            h += stepBox(`Score matrix S = QKᵀ (${T}×${T})`, sTable(S, null, r));
            const p = pipeline(Q, K, V, r, all, d);
            h += p.html;
            const unscaled = TL.softmax(p.raw);
            h += stepBox('Compare: softmax WITHOUT scaling', `weights = ${vec(unscaled)}<br><span class="muted">${Math.max(...unscaled) > 0.95 ? 'Almost one-hot: softmax saturated, so gradients would be tiny. This is why we divide by √d.' : 'Scaling matters more as d and the vector values grow; try the 10,20,30,40 preset.'}</span>`);
            break;
          }
          case 'causal': {
            const al = (i, j) => j <= i;
            h += stepBox('Causal mask on S = QKᵀ: token i may only see keys j ≤ i', sTable(S, al, r));
            h += pipeline(Q, K, V, r, al, d).html;
            break;
          }
          case 'sliding': {
            const w = st.win, al = (i, j) => j <= i && j > i - w;
            h += stepBox(`Sliding window (w = ${w}): token i sees keys i−${w - 1} … i`, sTable(S, al, r));
            h += pipeline(Q, K, V, r, al, d).html;
            h += stepBox('Cost', `full causal: ${T * (T + 1) / 2} scores · window: ${Q.reduce((s, _, i) => s + K.filter((__, j) => al(i, j)).length, 0)} scores. Grows like T×w instead of T².`);
            break;
          }
          case 'sparse': {
            const s = st.stride, al = (i, j) => j <= i && (i - j <= 1 || (i - j) % s === 0);
            h += stepBox(`Strided sparse (stride ${s}): neighbour + every ${s}-th earlier token`, sTable(S, al, r));
            h += pipeline(Q, K, V, r, al, d).html;
            break;
          }
          case 'multihead': {
            if (d % 2) { h += stepBox('Needs an even d', 'Choose d = 2 or 4 (or the "d=4 multi-head" preset) so the vectors can be split into 2 heads.'); break; }
            const half = d / 2, sl = (M, a) => M.map((row) => row.slice(a * half, (a + 1) * half));
            h += stepBox(`Split d = ${d} into 2 heads of d<sub>k</sub> = ${half}`, `q${r + 1} = ${vec(q)} → head 1 ${vec(q.slice(0, half))}, head 2 ${vec(q.slice(half))}`, 'Two independent lookups, each on half the dimensions, so each can focus on a different relationship.');
            const outs = [0, 1].map((a) => { const p = pipeline(sl(Q, a), sl(K, a), sl(V, a), r, all, half, `Head ${a + 1} · `); h += `<div class="am-head">${p.html}</div>`; return p.o; });
            h += stepBox('Concatenate head outputs (then a learned W_O mixes them)', `[${vec(outs[0])} ‖ ${vec(outs[1])}] = <b>${vec([...outs[0], ...outs[1]])}</b>`);
            break;
          }
          case 'gqa': {
            if (d % 2) { h += stepBox('Needs an even d', 'Choose d = 2 or 4 so Q can be split into 2 query heads.'); break; }
            const half = d / 2, Qh = (a) => Q.map((row) => row.slice(a * half, (a + 1) * half)), Ks = K.map((row) => row.slice(0, half)), Vs = V.map((row) => row.slice(0, half));
            h += stepBox('2 query heads, but ONE shared key/value head', `query head 1 = q[1..${half}], query head 2 = q[${half + 1}..${d}]; both use K/V head = first ${half} dims of K and V`, 'Several readers share one cache entry: the KV cache stores 1 head instead of 2 (MQA). GQA = groups of query heads share a K/V head.');
            const outs = [0, 1].map((a) => { const p = pipeline(Qh(a), Ks, Vs, r, all, half, `Query head ${a + 1} (shared K/V) · `); h += `<div class="am-head">${p.html}</div>`; return p.o; });
            h += stepBox('Memory saving', `KV cache per token: MHA stores 2 heads × ${half} dims × (K and V) = ${2 * half * 2} numbers; shared K/V stores ${half * 2}: <b>2× smaller</b>. With 32 query heads and 8 K/V heads (GQA) it's 4× smaller.`);
            break;
          }
          case 'cross':
            h += stepBox('Cross-attention: Q from one sequence, K and V from another', 'Here Q plays the decoder (e.g. French words being generated) and K, V play the encoder output (e.g. the English sentence). The math is the same, with no causal mask: every query may see the whole source.', 'Service A querying service B’s data.');
            h += pipeline(Q, K, V, r, all, d).html;
            break;
          case 'flash': {
            const B = Math.max(1, Math.min(st.block, T));
            const scores = K.map((k) => dot(q, k) / Math.sqrt(d));
            h += stepBox(`Scaled scores for q${r + 1} (computed tile by tile, never all stored)`, vec(scores), 'A streaming aggregate: keep a running max (m), running sum (ℓ) and running output (o) instead of loading every score first.');
            let m = -Infinity, l = 0, o = V[0].map(() => 0), rows = '', detail = '';
            h += stepBox(`Scores for q${r + 1}`, K.map((k, j) => `k${j + 1}: (${prod(q, k)}) ÷ √${d} = ${fm(dot(q, k))} ÷ ${fm(Math.sqrt(d))} = <b>${fm(scores[j])}</b>`).join('<br>'));
            for (let s0 = 0; s0 < T; s0 += B) {
              const idx = [...Array(Math.min(B, T - s0))].map((_, k) => s0 + k);
              const bs = idx.map((j) => scores[j]);
              const m2 = Math.max(m, ...bs), resc = Number.isFinite(m) ? Math.exp(m - m2) : 0;
              const ex = idx.map((j) => Math.exp(scores[j] - m2));
              const l2 = resc * l + ex.reduce((a, b) => a + b, 0);
              const o2 = o.map((x, c) => resc * x + idx.reduce((a, j, t) => a + ex[t] * V[j][c], 0));
              rows += `<tr><td>k${idx[0] + 1}${idx.length > 1 ? '–k' + (idx[idx.length - 1] + 1) : ''}</td><td>${vec(bs)}</td><td>${fm(m2)}</td><td>${Number.isFinite(m) ? `e^(${fm(m)}−${fm(m2)}) = ${fm(resc)}` : '-'}</td><td>${fm(l2)}</td><td>${vec(o2)}</td></tr>`;
              detail += `<b>Block k${idx[0] + 1}${idx.length > 1 ? '–k' + (idx[idx.length - 1] + 1) : ''}:</b><br>`
                + `&nbsp;&nbsp;new max m = max(${Number.isFinite(m) ? fm(m) + ', ' : ''}${bs.map(fm).join(', ')}) = ${fm(m2)}<br>`
                + (Number.isFinite(m) ? `&nbsp;&nbsp;rescale old totals by e^(${fm(m)} − ${fm(m2)}) = ${fm(resc)}<br>` : '')
                + idx.map((j, t) => `&nbsp;&nbsp;e^(${fm(scores[j])} − ${fm(m2)}) = ${fm(ex[t])}`).join('<br>') + '<br>'
                + `&nbsp;&nbsp;ℓ = ${Number.isFinite(m) ? `${fm(resc)}×${fm(l)} + ` : ''}${ex.map(fm).join(' + ')} = <b>${fm(l2)}</b><br>`
                + o2.map((x, c) => `&nbsp;&nbsp;o[dim ${c + 1}] = ${Number.isFinite(m) ? `${fm(resc)}×${fm(o[c])} + ` : ''}${idx.map((j, t) => `${fm(ex[t])}×${fm(V[j][c])}`).join(' + ')} = <b>${fm(x)}</b>`).join('<br>') + '<br>';
              m = m2; l = l2; o = o2;
            }
            h += stepBox('Every small calculation, block by block', detail);
            h += stepBox(`Process keys in blocks of ${B}`, `<table class="mtable"><tr><th>block</th><th>block scores</th><th>running max m</th><th>rescale old totals</th><th>running sum ℓ</th><th>running output o</th></tr>${rows}</table>`);
            const final = o.map((x) => x / l);
            const std = pipeline(Q, K, V, r, all, d).o;
            h += stepBox('Final = o / ℓ, compared with standard attention', `${o.map((x, c) => `dim ${c + 1}: ${fm(x)} ÷ ${fm(l)} = ${fm(final[c])}`).join('<br>')}<br>FlashAttention: ${vec(final)}<br>Standard: ${vec(std)}<br><b>${final.every((x, i) => Math.abs(x - std[i]) < 1e-9) ? '✓ identical' : '≈ equal'}</b>: same math, but only ${B} score(s) were in memory at a time.`);
            break;
          }
          case 'linear': {
            const phi = (v) => v.map((x) => (x > 0 ? x + 1 : Math.exp(x)));
            const pq = phi(q), pK = K.map(phi);
            h += stepBox('Feature map φ(x) = elu(x) + 1 (makes every entry positive)', `φ(q${r + 1}) = ${vec(pq)}<br>${pK.map((k, j) => `φ(k${j + 1}) = ${vec(k)}`).join('<br>')}`, 'Replace exp(q·k) with φ(q)·φ(k) so the big T×T table is never needed.');
            const sims = pK.map((k) => dot(pq, k)), Z = sims.reduce((a, b) => a + b, 0);
            h += stepBox('Similarities and weights (no softmax)', `${pK.map((k, j) => `φ(q)·φ(k${j + 1}) = ${prod(pq, k)} = ${fm(sims[j])}`).join('<br>')}<br>sum = ${sims.map(fm).join(' + ')} = ${fm(Z)}<br>${sims.map((x, j) => `weight k${j + 1} = ${fm(x)} ÷ ${fm(Z)} = ${fm(x / Z)}`).join('<br>')}<br><span class="muted">softmax weights for comparison: ${vec(TL.softmax(K.map((k) => dot(q, k) / Math.sqrt(d))))}</span>`);
            const Skv = [...Array(d)].map((_, a) => V[0].map((_, c) => pK.reduce((s, k, j) => s + k[a] * V[j][c], 0)));
            const z = [...Array(d)].map((_, a) => pK.reduce((s, k) => s + k[a], 0));
            const num = V[0].map((_, c) => pq.reduce((s, x, a) => s + x * Skv[a][c], 0)), den = dot(pq, z);
            h += stepBox('The O(T) trick: precompute once, reuse for every query', `S = Σⱼ φ(kⱼ) vⱼᵀ (${d}×${V[0].length}) = ${Skv.map(vec).join(' ')}<br>z = Σⱼ φ(kⱼ) = ${vec(z)}<br>output = (φ(q)ᵀ S) / (φ(q)·z) = ${vec(num)} / ${fm(den)} = <b>${vec(num.map((x) => x / den))}</b>`, 'Like a running aggregate: S and z are tiny summaries of all keys/values, so the cost no longer depends on T².');
            break;
          }
        }
        out.innerHTML = h;
      }
      buildMats(); compute();
    } };

  TL.WIDGET_LIST = Object.entries(W).map(([id, w]) => ({ id, title: w.title, desc: w.desc, lessons: w.lessons }));
})();
