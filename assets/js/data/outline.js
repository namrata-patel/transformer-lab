/* Course outline: Domain → Module → Lesson → Sub-topics (sub-topics may nest).
   Sub-topic syntax: 'Label'  (opens the lesson and jumps to that text)
                     'Label@lesson-id'  (opens another lesson)
                     ['Group label', [children...]]  (nested group) */
window.TL = window.TL || {};
TL.OUTLINE = {
  foundations: [
    ['Orientation', {
      'swe-to-ai': ['Rosetta stone', 'Template vs numbers', 'Confidence vs accuracy', 'ML lifecycle'],
      'se-principles-ai': ['Design principles', 'Process principles', 'Performance principles', 'Where your SE intuition breaks'],
    }],
    ['ML basics', {
      'what-is-ai': ['The nested circles', 'Narrow vs general AI', 'Learning paradigms', 'Task types', 'How an LLM like ChatGPT is made'],
      'data-splits': ['Features', 'Labels', 'Parameters', 'Hyperparameters', 'Train / validation / test', 'Data leakage'],
      'generalization': ['Overfitting', 'Underfitting', 'Bias–variance', 'Double descent'],
    }],
  ],
  math: [
    ['Linear algebra', {
      'linear-algebra': ['Tensor', 'Matrix multiply', 'Linear layer'],
      'dot-products': ['Dot product', 'Norm', 'Cosine similarity', 'Projection'],
      'eigen-svd': ['Eigenvector', 'SVD', 'Low-rank'],
    }],
    ['Calculus & optimization', {
      'calculus': ['Derivative', 'Chain rule', 'Gradient', 'Jacobian'],
      'gradient-descent': ['Learning rate', 'Mini-batch', 'Gradient clipping'],
    }],
    ['Probability & information', {
      'probability': ['Conditional probability', 'Bayes', 'Maximum likelihood'],
      'softmax': ['Softmax', 'Log-sum-exp', 'Temperature'],
      'entropy-cross-entropy': ['Entropy', 'Cross-entropy', 'KL divergence'],
    }],
  ],
  ml: [
    ['Models', {
      'linear-regression': ['MSE', 'Normal equation'],
      'logistic-regression': ['Sigmoid', 'Binary cross-entropy', 'Loss choices'],
    }],
    ['Training', {
      'optimizers': ['Momentum', 'Adam', 'AdamW', 'Warmup'],
      'regularization': ['Weight decay', 'Dropout', 'Early stopping', 'Cross-validation'],
    }],
    ['Evaluation & practice', {
      'classification-metrics': ['Precision', 'Recall', 'F1', 'ROC-AUC', 'Calibration'],
      'ml-in-practice': ['Decision trees', 'Gradient boosting', 'Distribution shift'],
    }],
  ],
  dl: [
    ['Neural networks', {
      'perceptron-mlp': ['Neuron', 'MLP', 'Activation'],
      'backprop': ['Forward pass', 'Backpropagation', 'Autograd'],
    }],
    ['Training deep nets', {
      'init-gradient-flow': ['Vanishing', 'Initialization'],
      'normalization': ['LayerNorm', 'BatchNorm', 'RMSNorm'],
      'residual-dropout': ['Residual connection', 'Residual stream'],
    }],
    ['Building blocks', {
      'embeddings': ['Embedding layer', 'Weight tying'],
      'pytorch-gpu': ['Training loop', 'GPU', 'Memory-bound'],
    }],
  ],
  nlp: [
    ['Text → numbers', {
      'tokenization': ['Characters, words, subwords', 'BPE', 'WordPiece'],
      'word-vectors': ['One-hot', 'TF-IDF', 'Word2Vec'],
    }],
    ['Sequence models', {
      'ngram-lm': ['N-gram'],
      'rnn-lstm': ['RNN', 'LSTM', 'GRU'],
      'seq2seq-why-attention': ['Seq2seq', 'bottleneck', 'Attention'],
    }],
  ],
  attention: [
    ['Core mechanism', {
      'qkv': ['Query', 'Key', 'Value', 'Projection'],
      'scaled-dot-product': ['Dot products', 'Why √d_k', 'Softmax', 'Worked numerical example'],
      'masking': ['Causal mask', 'Padding mask', 'Cross-attention'],
      'multi-head': ['Multi-head attention', 'Concat'],
    }],
    ['Attention types', {
      'attention-types': [
        ['How scores are computed', ['Additive', 'Dot-product', 'Scaled dot-product']],
        ['Where Q, K, V come from', ['Self-attention', 'Cross-attention']],
        ['Who can see whom', ['Bidirectional', 'Causal (masked)', 'Prefix-LM', 'Sliding-window', 'Sparse / global tokens', 'Linear attention']],
        ['Who shares keys and values', ['MHA', 'MQA', 'GQA', 'MLA']],
        ['Efficient attention', ['FlashAttention', 'Sparse attention', 'Strided', 'Dilated', 'Block-sparse', 'BigBird', 'PagedAttention', 'Ring attention']],
      ],
    }],
    ['Cost', {
      'attention-complexity': ['Per layer', 'Memory', 'FlashAttention@flashattention'],
    }],
  ],
  transformers: [
    ['Position', {
      'positional-encoding': ['Sinusoidal', 'Learned'],
      'rope': ['Rotation', 'relative', 'Context extension'],
    }],
    ['The Transformer block', {
      'ffn': ['FFN', 'SwiGLU'],
      'residual-layernorm-transformer': ['Pre-LN', 'Post-LN'],
    }],
    ['Architectures', {
      'architectures': ['Encoder-only', 'Encoder–decoder', 'Decoder-only'],
      'tensor-shapes': ['shapes', 'Inference step'],
    }],
  ],
  gpt: [
    ['Language modelling', {
      'language-models': ['Next-token', 'Teacher forcing', 'Context window', 'Exposure bias'],
      'decoding': ['Greedy', 'Beam search', 'Temperature', 'Top-k', 'Top-p'],
      'perplexity': ['Perplexity', 'Bits per byte', 'Benchmarks'],
    }],
    ['Training LLMs', {
      'pretraining': ['Pipeline', 'Deduplication', 'Base model'],
      'sft-alignment': ['SFT', 'RLHF', 'DPO', 'KL penalty'],
      'lora-qlora': ['LoRA', 'QLoRA', 'B to zero'],
    }],
  ],
  build: [
    ['MiniGPT project', {
      'build-data': ['Character', 'Split', 'get_batch'],
      'build-model': ['CausalSelfAttention', 'Block', 'MiniGPT'],
      'build-training': ['AdamW', 'Validation', 'Checkpoint'],
      'build-generation': ['Sampling', 'KV cache'],
    }],
  ],
  llmeng: [
    ['Inference', {
      'kv-cache': ['Prefill', 'Decode', 'KV memory'],
      'mqa-gqa': ['MHA', 'MQA', 'GQA'],
      'flashattention': ['Tiling', 'Online softmax', 'Recompute'],
      'serving': ['Continuous batching', 'PagedAttention', 'Speculative decoding', 'TTFT'],
    }],
    ['Efficiency', {
      'modern-blocks': ['RMSNorm', 'SwiGLU', 'GQA'],
      'param-flops': ['Parameter count', 'FLOPs', 'Scaling laws', 'Chinchilla'],
      'precision-quantization': ['bf16', 'Mixed precision', 'Quantization'],
    }],
    ['Scale & systems', {
      'distributed-moe': ['Data parallel', 'Tensor parallel', 'Pipeline parallel', 'ZeRO', 'Mixture of Experts'],
      'long-context-rag': ['Long context', 'RAG', 'Rerank'],
      'eval-safety': ['Evals', 'LLM-as-a-judge', 'Red-team', 'Guardrails'],
    }],
  ],
};

/* Build a normalised tree + lookups. Called after lessons are indexed. */
TL.buildOutline = function () {
  const root = { label: 'Transformer Lab', kind: 'root', children: [] };
  TL.outlineNodes = [];
  TL.lessonPath = {};          // lessonId -> [domain, module] labels
  TL.lessonAlso = {};          // lessonId -> [paths elsewhere that link to it]
  const listed = new Set();
  const mk = (n, parent) => { n.parent = parent; parent.children.push(n); TL.outlineNodes.push(n); return n; };
  const subs = (arr, parent, lessonId) => (arr || []).forEach((it) => {
    if (Array.isArray(it)) { const g = mk({ label: it[0], kind: 'group', lesson: lessonId, find: it[0], children: [] }, parent); subs(it[1], g, lessonId); return; }
    const [label, target] = String(it).split('@');
    const n = mk({ label, kind: 'topic', lesson: target || lessonId, find: target ? null : label, children: [] }, parent);
    if (target) n.via = lessonId;
  });
  TL.DOMAINS.forEach((d) => {
    const dn = mk({ label: d.name, short: d.short, kind: 'domain', domain: d.id, color: d.color, icon: d.icon, children: [] }, root);
    if (d.id === 'interview') {
      const cats = {};
      TL.interview.forEach((q) => (cats[q.cat] = cats[q.cat] || []).push(q));
      Object.entries(cats).forEach(([c, qs]) => {
        const mn = mk({ label: c, kind: 'module', children: [] }, dn);
        qs.forEach((q) => mk({ label: q.title, kind: 'question', qid: q.id, children: [] }, mn));
      });
      return;
    }
    (TL.OUTLINE[d.id] || []).forEach(([mod, lessons]) => {
      const mn = mk({ label: mod, kind: 'module', domain: d.id, children: [] }, dn);
      Object.entries(lessons).forEach(([lid, s]) => {
        const l = TL.lessonById[lid]; if (!l) return;
        listed.add(lid);
        TL.lessonPath[lid] = [d, mod];
        const ln = mk({ label: l.title, kind: 'lesson', lesson: lid, children: [] }, mn);
        subs(s, ln, lid);
      });
    });
    // any lesson not in the outline still appears (under "More")
    const rest = d.lessons.filter((l) => !listed.has(l.id));
    if (rest.length) { const mn = mk({ label: 'More', kind: 'module', domain: d.id, children: [] }, dn); rest.forEach((l) => { TL.lessonPath[l.id] = [d, 'More']; mk({ label: l.title, kind: 'lesson', lesson: l.id, children: [] }, mn); }); }
  });
  TL.outlineNodes.forEach((n) => { if (n.kind === 'topic' && n.via) (TL.lessonAlso[n.lesson] = TL.lessonAlso[n.lesson] || []).push(n); });
  TL.outlineRoot = root;
  return root;
};
/* labels from the domain down to node n */
TL.nodePath = (n) => { const p = []; for (let x = n; x && x.kind !== 'root'; x = x.parent) p.unshift(x); return p; };
TL.nodeHref = (n) => n.kind === 'question' ? `#/interview/${n.qid}` : n.kind === 'domain' ? (n.domain === 'interview' ? '#/interview' : `#/domain/${n.domain}`) : n.lesson ? `#/lesson/${n.lesson}${n.find ? `?find=${encodeURIComponent(n.find)}` : ''}` : null;
