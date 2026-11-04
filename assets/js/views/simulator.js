/* Interactive Transformer simulator: a tiny deterministic, UNTRAINED 1-layer model (d_model=8, 2 heads). */
(function () {
  const TL = window.TL;
  const VOCAB = ['<pad>', '<unk>', '<bos>', '.', ',', '?', 'the', 'a', 'cat', 'dog', 'sat', 'ran', 'on', 'in', 'mat', 'park', 'is', 'was', 'big', 'small', 'happy', 'it', 'and', 'because', 'tired', 'i', 'you', 'love', 'like', 'learning', 'transformers', 'attention', 'model', 'models', 'language', 'predict', 'next', 'token', 'word', 'all', 'need', 'are', 'to', 'of', 'what', 'how', 'why', 'gpt', 'llm', 'learns', 'from', 'data'];
  const D = 8, H = 2, DH = 4, DFF = 16;

  // deterministic PRNG (mulberry32) + Box–Muller
  function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const R = rng(42);
  const randn = () => Math.sqrt(-2 * Math.log(R() + 1e-12)) * Math.cos(2 * Math.PI * R());
  const mat = (r, c, s) => [...Array(r)].map(() => [...Array(c)].map(() => +(randn() * s).toFixed(3)));
  const P = {
    E: mat(VOCAB.length, D, 0.8),
    Wq: mat(D, D, 1 / Math.sqrt(D)), Wk: mat(D, D, 1 / Math.sqrt(D)), Wv: mat(D, D, 1 / Math.sqrt(D)), Wo: mat(D, D, 1 / Math.sqrt(D)),
    W1: mat(D, DFF, 1 / Math.sqrt(D)), W2: mat(DFF, D, 1 / Math.sqrt(DFF)),
  };
  const mm = (A, B) => A.map((r) => B[0].map((_, j) => r.reduce((s, a, k) => s + a * B[k][j], 0)));
  const T = (A) => A[0].map((_, j) => A.map((r) => r[j]));
  const add = (A, B) => A.map((r, i) => r.map((x, j) => x + B[i][j]));
  const cols = (A, a, b) => A.map((r) => r.slice(a, b));
  const gelu = (x) => 0.5 * x * (1 + Math.tanh(0.7978845608 * (x + 0.044715 * x ** 3)));
  const ln = (A) => A.map((r) => { const m = r.reduce((a, b) => a + b, 0) / r.length; const v = r.reduce((a, b) => a + (b - m) ** 2, 0) / r.length; return r.map((x) => (x - m) / Math.sqrt(v + 1e-5)); });
  const pe = (n) => [...Array(n)].map((_, pos) => [...Array(D)].map((_, j) => { const i = Math.floor(j / 2), a = pos / Math.pow(10000, 2 * i / D); return j % 2 ? Math.cos(a) : Math.sin(a); }));

  function tokenize(text) {
    return (text.toLowerCase().match(/[a-z]+|[.,?]/g) || []).slice(0, 10);
  }
  function forward(text, overrides) {
    const toks = tokenize(text);
    if (!toks.length) toks.push('<unk>');
    const ids = toks.map((t) => (VOCAB.indexOf(t) >= 0 ? VOCAB.indexOf(t) : 1));
    const n = ids.length;
    const E = ids.map((i) => P.E[i].slice());
    const PE = pe(n);
    let X = add(E, PE);
    X = X.map((r, i) => (overrides[i] ? overrides[i].slice() : r));
    const Q = mm(X, P.Wq), K = mm(X, P.Wk), V = mm(X, P.Wv);
    const heads = [...Array(H)].map((_, h) => {
      const q = cols(Q, h * DH, (h + 1) * DH), k = cols(K, h * DH, (h + 1) * DH), v = cols(V, h * DH, (h + 1) * DH);
      const S = mm(q, T(k));
      const Ss = S.map((r) => r.map((x) => x / Math.sqrt(DH)));
      const M = Ss.map((r, i) => r.map((x, j) => (j > i ? -Infinity : x)));
      const A = M.map((r) => TL.softmax(r));
      const O = mm(A, v);
      return { q, k, v, S, Ss, M, A, O };
    });
    const concat = X.map((_, i) => heads.flatMap((hd) => hd.O[i]));
    const attn = mm(concat, P.Wo);
    const res1 = add(X, attn);
    const h1 = ln(res1);
    const pre = mm(h1, P.W1);
    const act = pre.map((r) => r.map(gelu));
    const ff = mm(act, P.W2);
    const res2 = add(h1, ff);
    const h2 = ln(res2);
    const logits = h2.map((r) => P.E.map((e) => e.reduce((s, x, k) => s + x * r[k], 0)));
    return { toks, ids, n, E, PE, X, Q, K, V, heads, concat, attn, res1, h1, pre, act, ff, res2, h2, logits };
  }

  const STEPS = [
    ['Input text', 'input'], ['Tokens', 'tokens'], ['Token IDs', 'ids'], ['Embeddings', 'emb'], ['Position information', 'pos'],
    ['Q / K / V projections', 'qkv'], ['Attention scores', 'scores'], ['Scaling', 'scale'], ['Causal masking', 'mask'], ['Softmax', 'softmax'],
    ['Weighted values', 'wv'], ['Multi-head attention', 'mha'], ['Residual connection', 'res'], ['Layer normalization', 'ln'],
    ['Feed-forward network', 'ffn'], ['Output logits', 'logits'], ['Next-token prediction', 'pred'],
  ];

  TL.views.simulator = function (main, args) {
    const S = { text: 'The cat sat on the mat because it was tired', step: Math.max(0, STEPS.findIndex((s) => s[1] === args[0])), head: 0, sel: null, overrides: {}, temp: 1, playing: null };
    if (S.step < 0) S.step = 0;
    main.innerHTML = `<div class="sim"><nav class="sim-steps" id="steps" aria-label="Simulator steps"></nav><section class="sim-panel">
      <div class="row"><h1 style="margin:0">Transformer simulator</h1><span class="spacer"></span>
        <button class="btn sm" id="prev">← Prev</button><button class="btn sm primary" id="play">▶ Play</button><button class="btn sm" id="next">Next →</button><button class="btn sm" id="reset">Reset</button></div>
      <div class="notice info small" style="margin:10px 0">This is a <b>tiny, untrained, deterministic toy model</b> (1 layer, d_model = 8, 2 heads, ${VOCAB.length}-word vocabulary, seeded random weights). Every number is real arithmetic you can check by hand, but the attention patterns and predictions are <b>not</b> what a trained LLM would produce.</div>
      <div class="sim-pipeline" id="pipe"></div><div id="panel"></div></section></div>`;
    const panel = TL.$('#panel', main);
    let F;
    const fmt = (x, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : x === -Infinity ? '−∞' : String(x));
    const table = (M, rowL, colL, opts = {}) => `<div class="scroll-x"><table class="mtable"><tr><th></th>${colL.map((c) => `<th>${TL.esc(c)}</th>`).join('')}</tr>${M.map((r, i) => `<tr class="${i === S.sel ? 'sel' : ''}"><th>${TL.esc(rowL[i])}</th>${r.map((v, j) => {
      const bg = opts.heat && Number.isFinite(v) ? `background:${TL.heatColor(v)};color:${v > .55 ? '#fff' : 'inherit'}` : (opts.masked && !Number.isFinite(v) ? 'background:var(--bg2);color:var(--ink3)' : '');
      return `<td style="${bg}">${fmt(v, opts.d ?? 2)}</td>`;
    }).join('')}</tr>`).join('')}</table></div>`;
    const idx = (n, p = '') => [...Array(n)].map((_, i) => p + i);
    const tokRow = () => `<div>${F.toks.map((t, i) => `<span class="tok ${i === S.sel ? 'sel' : ''}" data-sel="${i}">${TL.esc(t)}<small>pos ${i}</small></span>`).join('')}</div>`;
    const explain = (beg, mathTex, extra = '') => `<div class="sim-cols" style="margin-top:12px"><div class="card sim-explain"><h4 style="color:#16a34a">Beginner view</h4><div class="small">${beg}</div></div><div class="card sim-explain"><h4 style="color:#3b82f6">Mathematical view</h4><div class="small">${mathTex}</div></div></div>${extra}`;
    const tex = (t, disp = true) => `<span data-tex="${TL.esc(t)}" data-display="${disp ? 1 : 0}"></span>`;
    const headSel = () => `<div class="row small" style="margin:6px 0">Head: <span class="seg">${[0, 1].map((h) => `<button type="button" data-head="${h}" class="${S.head === h ? 'on' : ''}">Head ${h + 1}</button>`).join('')}</span><span class="muted">Click a token to select its row.</span></div>`;

    function renderStep() {
      F = forward(S.text, S.overrides);
      if (S.sel === null || S.sel >= F.n) S.sel = F.n - 1;
      const key = STEPS[S.step][1];
      TL.$('#steps', main).innerHTML = STEPS.map(([n], i) => `<button type="button" class="sim-step ${i === S.step ? 'on' : i < S.step ? 'past' : ''}" data-step="${i}"><span class="n">${i + 1}</span>${n}</button>`).join('');
      TL.$('#pipe', main).innerHTML = STEPS.map(([n], i) => `<span class="${i === S.step ? 'on' : i < S.step ? 'past' : ''}" data-step="${i}">${n}</span>`).join('<span class="muted">→</span>');
      const hd = F.heads[S.head], toks = F.toks, n = F.n, s = S.sel;
      let html = `<h2 style="margin-top:6px">${S.step + 1}. ${STEPS[S.step][0]}</h2>`;
      switch (key) {
        case 'input':
          html += `<label class="small muted" for="sim-in">Type a sentence (up to 10 words; words outside the toy vocabulary become &lt;unk&gt;)</label>
            <input id="sim-in" class="notes-area" style="min-height:0;font-size:1.05rem" value="${TL.esc(S.text)}">
            <div class="row small" style="margin-top:6px">Try: ${['The cat sat on the mat because it was tired', 'Attention is all you need', 'I love learning transformers', 'The dog ran in the park'].map((t) => `<button class="fchip" data-try="${TL.esc(t)}">${t}</button>`).join('')}</div>
            <details class="small" style="margin-top:8px"><summary>Toy vocabulary (${VOCAB.length} entries)</summary><p style="font-family:var(--mono)">${VOCAB.map((v, i) => `${i}:${TL.esc(v)}`).join('  ')}</p></details>`
            + explain('The model never sees letters or words directly. Everything starts by turning text into a sequence of numbers it can do arithmetic on.', `We will compute ${tex('P(x_{t+1} \\mid x_1,\\dots,x_t)', false)}, the probability of the next token given all previous ones.`);
          break;
        case 'tokens':
          html += tokRow() + explain('A tokenizer splits text into pieces. This toy uses whole words and punctuation; real LLMs use subword tokenizers (BPE) so any string can be encoded without &lt;unk&gt;.', `Sequence length ${tex('T = ' + n, false)}. Real tokenizers map text to ${tex('\\sim 1.3', false)} tokens per English word on average.`, `<p class="small"><a href="#/lesson/tokenization">Lesson: Tokenization</a> · <a href="#/playground/bpe">BPE playground</a></p>`);
          break;
        case 'ids':
          html += `<div>${toks.map((t, i) => `<span class="tok ${i === s ? 'sel' : ''}" data-sel="${i}">${TL.esc(t)}<small>id ${F.ids[i]}</small></span>`).join('')}</div>` + explain('Each token is replaced by its row number in the vocabulary, like looking up a word’s page number in a dictionary.', `${tex('\\text{ids} = [' + F.ids.join(', ') + ']', false)}, an integer tensor of shape <span class="dims">[T] = [${n}]</span> (with batch: [B, T]).`);
          break;
        case 'emb':
          html += `<p><span class="dims">E: [V, d] = [${VOCAB.length}, ${D}]</span> → lookup → <span class="dims">[T, d] = [${n}, ${D}]</span></p>` + table(F.E, toks, idx(D, 'd')) + explain('Each ID picks one row of a learned table: a list of 8 numbers representing that token. Training would move similar words to similar vectors; here they are random.', `${tex('e_t = E[\\text{id}_t] \\in \\mathbb{R}^{d}', false)}. A lookup is the same as multiplying a one-hot vector by ${tex('E', false)}: ${tex('e_t = \\text{onehot}(\\text{id}_t)^\\top E', false)}.`);
          break;
        case 'pos':
          html += `<p>Positional encodings <span class="dims">[${n}, ${D}]</span>, then X = E + PE. <b>You can edit the selected row of X</b>; every later step updates.</p>` + table(F.PE, toks, idx(D, 'd')) + '<h3 class="small">X = embeddings + positions</h3>' + table(F.X, toks, idx(D, 'd'))
            + `<div class="card small" style="margin-top:8px">Edit X[“${TL.esc(toks[s])}”]: <div class="mat" style="grid-template-columns:repeat(8,auto);border:0">${F.X[s].map((v, j) => `<input type="number" step="0.1" value="${v.toFixed(2)}" data-x="${j}">`).join('')}</div> <button class="btn sm" id="clr">Clear edits</button></div>`
            + explain('Attention by itself ignores word order (“dog bites man” = “man bites dog”). Adding a position signal lets the model tell positions apart.', tex('PE_{(pos,2i)} = \\sin\\!\\left(\\tfrac{pos}{10000^{2i/d}}\\right),\\; PE_{(pos,2i+1)} = \\cos\\!\\left(\\tfrac{pos}{10000^{2i/d}}\\right)') + tex('X = E[\\text{ids}] + PE \\in \\mathbb{R}^{T\\times d}'));
          break;
        case 'qkv':
          html += headSel() + `<p><span class="dims">Q = X W_Q : [${n}, ${D}]·[${D}, ${D}] → [${n}, ${D}]</span>, split into ${H} heads of <span class="dims">d_head = ${DH}</span>. Showing head ${S.head + 1}.</p><div class="row" style="align-items:flex-start">${[['Q (queries)', hd.q], ['K (keys)', hd.k], ['V (values)', hd.v]].map(([t, M]) => `<div><b class="small">${t}</b>${table(M, toks, idx(DH, 'h'))}</div>`).join('')}</div>`
            + explain('Each token asks a question (query), advertises what it contains (key), and offers information to share (value). All three are different learned views of the same vector X.', tex('Q = XW_Q,\\; K = XW_K,\\; V = XW_V') + `Head ${tex('h', false)} uses columns ${tex(`${S.head * DH}\\dots${S.head * DH + DH - 1}`, false)}.`);
          break;
        case 'scores':
          html += headSel() + tokRow() + table(hd.S, toks, toks) + explain(`Row “${TL.esc(toks[s])}” compares its query with every key. A bigger number means “this token looks relevant to me”.`, tex('S = QK^\\top \\in \\mathbb{R}^{T \\times T},\\quad S_{ij} = q_i \\cdot k_j') + `e.g. ${tex(`S_{${s},0} = q_${s}\\cdot k_0 = ${hd.S[s][0].toFixed(3)}`, false)}`, `<details class="viz-box"><summary><b>Edit small Q/K/V matrices yourself</b></summary><div id="mini"></div></details>`);
          break;
        case 'scale':
          html += headSel() + tokRow() + table(hd.Ss, toks, toks) + explain('Dot products grow with vector length. Dividing keeps the numbers in a range where softmax still spreads attention instead of collapsing onto one token.', tex(`S' = \\frac{QK^\\top}{\\sqrt{d_k}} = \\frac{S}{\\sqrt{${DH}}} = \\frac{S}{2}`) + `If ${tex('q,k', false)} have i.i.d. unit-variance components, ${tex('\\operatorname{Var}(q\\cdot k) = d_k', false)}, so dividing by ${tex('\\sqrt{d_k}', false)} restores unit variance.`);
          break;
        case 'mask':
          html += headSel() + tokRow() + table(hd.M, toks, toks, { masked: true }) + explain('When predicting the next word, a token may not peek at words that come after it. Future positions are blanked out.', tex('M_{ij} = \\begin{cases} 0 & j \\le i \\\\ -\\infty & j > i \\end{cases},\\quad S\'\' = S\' + M') + `${tex('e^{-\\infty} = 0', false)}, so masked positions get exactly zero weight after softmax.`);
          break;
        case 'softmax': {
          const row = hd.A[s];
          html += headSel() + tokRow() + table(hd.A, toks, toks, { heat: true, d: 3 }) + `<p class="small">Row “${TL.esc(toks[s])}”: ${row.map((w, j) => `${TL.esc(toks[j])} ${(w * 100).toFixed(1)}%`).join(' · ')}</p>`
            + explain('Each row becomes a set of percentages that add to 100%: how much the token “listens” to each earlier token.', tex('A = \\operatorname{softmax}_{\\text{row}}(S\'\'),\\quad A_{ij} = \\frac{e^{S\'\'_{ij}}}{\\sum_{k} e^{S\'\'_{ik}}}') + `Row sum = ${row.reduce((a, b) => a + b, 0).toFixed(4)}.`);
          break;
        }
        case 'wv': {
          const parts = hd.A[s].map((w, j) => `${w.toFixed(2)}·v<sub>${TL.esc(toks[j])}</sub>`).filter((_, j) => j <= s).join(' + ');
          html += headSel() + tokRow() + `<div class="row" style="align-items:flex-start"><div><b class="small">A (weights)</b>${table(hd.A, toks, toks, { heat: true })}</div><div><b class="small">V</b>${table(hd.v, toks, idx(DH, 'h'))}</div><div><b class="small">O = A V</b> <span class="dims">[${n}, ${DH}]</span>${table(hd.O, toks, idx(DH, 'h'))}</div></div><p class="small">o<sub>${TL.esc(toks[s])}</sub> = ${parts}</p>`
            + explain('Each token’s new vector is a blend of the value vectors it attended to, mixed in proportion to the attention weights.', tex('O = AV,\\quad o_i = \\sum_j A_{ij} v_j') + 'Cost: ' + tex('O(T^2 d)', false) + ' time, ' + tex('O(T^2)', false) + ' memory for A per head.');
          break;
        }
        case 'mha':
          html += `<div class="row" style="align-items:flex-start">${F.heads.map((h, k) => `<div><b class="small">Head ${k + 1} weights</b>${table(h.A, toks, toks, { heat: true })}</div>`).join('')}</div><div class="row" style="align-items:flex-start"><div><b class="small">Concat [${n}, ${H}×${DH}=${D}]</b>${table(F.concat, toks, idx(D))}</div><div><b class="small">× W_O → attention output [${n}, ${D}]</b>${table(F.attn, toks, idx(D))}</div></div>`
            + explain('Several heads run in parallel, each free to look for a different kind of relationship (one might track the previous word, another a subject). Their outputs are glued together and mixed.', tex('\\text{MHA}(X) = \\operatorname{Concat}(O_1,\\dots,O_h)\\,W_O,\\quad d_{head} = d_{model}/h'));
          break;
        case 'res':
          html += `<div class="row" style="align-items:flex-start"><div><b class="small">X</b>${table(F.X, toks, idx(D))}</div><div><b class="small">+ attention output</b>${table(F.attn, toks, idx(D))}</div><div><b class="small">= X + MHA(X)</b>${table(F.res1, toks, idx(D))}</div></div>`
            + explain('Instead of replacing the input, the layer adds a correction to it. Information and gradients can flow straight through the “+”, which makes deep stacks trainable.', tex('X_1 = X + \\text{MHA}(X)') + tex('\\frac{\\partial X_1}{\\partial X} = I + \\frac{\\partial\\,\\text{MHA}}{\\partial X}', true));
          break;
        case 'ln': {
          const r = F.res1[s], m = r.reduce((a, b) => a + b, 0) / D, v = r.reduce((a, b) => a + (b - m) ** 2, 0) / D;
          html += tokRow() + table(F.h1, toks, idx(D)) + `<p class="small">Row “${TL.esc(toks[s])}”: mean μ = ${m.toFixed(3)}, variance σ² = ${v.toFixed(3)}; each entry becomes (x − μ)/√(σ² + ε). (Learned γ = 1, β = 0 here.)</p>`
            + explain('Rescales each token’s vector to a standard range (mean 0, spread 1) so numbers don’t drift and explode as they pass through many layers.', tex('\\text{LN}(x) = \\gamma \\odot \\frac{x-\\mu}{\\sqrt{\\sigma^2+\\epsilon}} + \\beta') + 'This toy uses Post-LN (as in the 2017 paper). GPT-2 and most modern LLMs use <b>Pre-LN</b>: ' + tex('x + \\text{MHA}(\\text{LN}(x))', false) + '.');
          break;
        }
        case 'ffn': {
          const top = F.act[s].map((x, i) => [x, i]).sort((a, b) => b[0] - a[0]).slice(0, 5);
          html += tokRow() + `<p><span class="dims">[${n}, ${D}] → W₁ [${D}, ${DFF}] → GELU → W₂ [${DFF}, ${D}]</span></p><div class="row" style="align-items:flex-start"><div><b class="small">GELU(h W₁) [${n}, ${DFF}]</b>${table(F.act, toks, idx(DFF), { d: 1 })}</div><div><b class="small">X₂ = LN(h + FFN(h))</b>${table(F.h2, toks, idx(D))}</div></div><p class="small">Most active hidden units for “${TL.esc(toks[s])}”: ${top.map(([x, i]) => `#${i} (${x.toFixed(2)})`).join(', ')}</p>`
            + explain('After tokens share information through attention, each token is processed on its own by a small two-layer network. This is where much of a model’s stored “knowledge” lives.', tex('\\text{FFN}(x) = \\text{GELU}(xW_1 + b_1)W_2 + b_2') + `Hidden size is usually ${tex('4d', false)} (here ${DFF} = 2d to keep tables small). FFNs hold ~2/3 of a GPT’s parameters.`);
          break;
        }
        case 'logits': {
          const lg = F.logits[n - 1];
          const order = lg.map((x, i) => [x, i]).sort((a, b) => b[0] - a[0]).slice(0, 10);
          html += `<p>Using the <b>last position</b> (“${TL.esc(toks[n - 1])}”) to predict what comes next. <span class="dims">[d] · Eᵀ [d, V] → [V] = [${VOCAB.length}]</span> (weights tied with the embedding table)</p>`
            + order.map(([x, i]) => `<div class="barrow"><span style="font-family:var(--mono)">${TL.esc(VOCAB[i])}</span><div><div class="b" style="width:${Math.max(2, (x - order[9][0]) / (order[0][0] - order[9][0] || 1) * 100)}%"></div></div><span>${x.toFixed(2)}</span></div>`).join('')
            + explain('The final vector is compared with every vocabulary embedding. The raw scores (“logits”) say how well each word fits next.', tex('z = h_T E^\\top \\in \\mathbb{R}^{V}') + 'During training every position predicts its own next token in parallel (teacher forcing).');
          break;
        }
        case 'pred': {
          const lg = F.logits[n - 1], p = TL.softmax(lg, S.temp);
          const order = p.map((x, i) => [x, i]).sort((a, b) => b[0] - a[0]).slice(0, 8);
          html += `<div class="row"><label class="small">Temperature <input type="range" min="0.1" max="3" step="0.1" value="${S.temp}" id="tmp"> ${S.temp.toFixed(1)}</label><button class="btn sm primary" id="append">Append top token & rerun</button><button class="btn sm" id="sample">Sample & append</button></div>`
            + order.map(([x, i]) => `<div class="barrow"><span style="font-family:var(--mono)">${TL.esc(VOCAB[i])}</span><div><div class="b" style="width:${x * 100}%"></div></div><span>${(x * 100).toFixed(1)}%</span></div>`).join('')
            + `<p class="small">Current text: <b>${TL.esc(S.text)}</b></p>`
            + explain('Softmax turns logits into probabilities; the model then picks (or samples) a token, appends it and repeats. That loop is all “generation” is. Because these weights are random, the predictions are meaningless; the mechanics are real.', tex('p = \\operatorname{softmax}(z/\\tau)') + `Greedy picks ${tex('\\arg\\max_i p_i', false)}; sampling draws ${tex('x_{t+1}\\sim p', false)}. With a KV cache, the next step only computes q, k, v for the new token.`, `<p class="small"><a href="#/lesson/decoding">Lesson: Decoding strategies</a> · <a href="#/build">Train a real one: MiniGPT</a></p>`);
          break;
        }
      }
      panel.innerHTML = html;
      TL.enhance(panel);
      bind();
    }
    function bind() {
      TL.$$('[data-step]', main).forEach((b) => (b.onclick = () => { S.step = +b.dataset.step; stop(); renderStep(); }));
      TL.$$('[data-sel]', panel).forEach((b) => (b.onclick = () => { S.sel = +b.dataset.sel; renderStep(); }));
      TL.$$('[data-head]', panel).forEach((b) => (b.onclick = () => { S.head = +b.dataset.head; renderStep(); }));
      TL.$$('[data-try]', panel).forEach((b) => (b.onclick = () => { S.text = b.dataset.try; S.overrides = {}; S.sel = null; renderStep(); }));
      const inp = TL.$('#sim-in', panel); if (inp) inp.addEventListener('change', () => { S.text = inp.value; S.overrides = {}; S.sel = null; renderStep(); });
      TL.$$('[data-x]', panel).forEach((i) => i.addEventListener('change', () => { const row = F.X[S.sel].slice(); row[+i.dataset.x] = +i.value || 0; S.overrides[S.sel] = row; renderStep(); }));
      const clr = TL.$('#clr', panel); if (clr) clr.onclick = () => { S.overrides = {}; renderStep(); };
      const mini = TL.$('#mini', panel); if (mini) mini.closest('details').addEventListener('toggle', function once() { if (!mini.innerHTML) TL.mountWidget(mini, 'attention'); });
      const tmp = TL.$('#tmp', panel); if (tmp) tmp.oninput = () => { S.temp = +tmp.value; renderStep(); };
      const ap = TL.$('#append', panel), sm = TL.$('#sample', panel);
      const append = (greedy) => {
        const p = TL.softmax(F.logits[F.n - 1], S.temp);
        let k = p.indexOf(Math.max(...p));
        if (!greedy) { let u = Math.random(); for (k = 0; k < p.length - 1; k++) { u -= p[k]; if (u <= 0) break; } }
        const words = tokenize(S.text); words.push(VOCAB[k]); if (words.length > 10) words.shift();
        S.text = words.join(' ').replace(/ ([.,?])/g, '$1'); S.overrides = {}; S.sel = null; renderStep();
      };
      if (ap) ap.onclick = () => append(true);
      if (sm) sm.onclick = () => append(false);
    }
    const stop = () => { if (S.playing) { clearInterval(S.playing); S.playing = null; TL.$('#play', main).textContent = '▶ Play'; } };
    TL.$('#prev', main).onclick = () => { stop(); S.step = Math.max(0, S.step - 1); renderStep(); };
    TL.$('#next', main).onclick = () => { stop(); S.step = Math.min(STEPS.length - 1, S.step + 1); renderStep(); };
    TL.$('#reset', main).onclick = () => { stop(); Object.assign(S, { text: 'The cat sat on the mat because it was tired', step: 0, head: 0, sel: null, overrides: {}, temp: 1 }); renderStep(); };
    TL.$('#play', main).onclick = () => {
      if (S.playing) return stop();
      TL.$('#play', main).textContent = '❚❚ Pause';
      if (S.step === STEPS.length - 1) S.step = 0;
      renderStep();
      S.playing = setInterval(() => { if (S.step >= STEPS.length - 1) return stop(); S.step++; renderStep(); }, 3200);
    };
    TL.onCleanup(stop);
    renderStep();
    return { title: 'Transformer simulator', crumbs: [{ label: 'Transformer simulator', href: '#/simulator' }, { label: STEPS[S.step][0] }] };
  };
  TL.simForward = forward; // exposed for testing
})();
