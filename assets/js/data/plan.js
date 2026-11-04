/* 30-day intensive plan (≈3 h/day). phase: 1 foundations, 2 NLP+Transformers, 3 build MiniGPT, 4 LLM engineering + interviews */
window.TL = window.TL || {};
(function () {
  const D = (day, phase, title, lessons, extra = {}) => ({ day, phase, title, lessons, objectives: extra.o || [], practice: extra.p, coding: extra.c, revision: extra.r, interview: extra.i, milestone: extra.m });
  TL.PLAN = [
    D(1, 1, 'What ML is and how it learns', ['what-is-ai', 'data-splits'], { o: ['Explain AI vs ML vs DL vs GenAI', 'Know why we split data into train/val/test'], r: 'Write a one-paragraph explanation of supervised learning in your own words.' }),
    D(2, 1, 'Generalization and evaluation', ['generalization'], { o: ['Diagnose over/underfitting from loss curves', 'Spot data leakage'], i: ['bias-variance'] }),
    D(3, 1, 'Vectors, matrices and dot products', ['linear-algebra', 'dot-products', 'eigen-svd'], { o: ['Multiply matrices by hand and check shapes', 'Interpret the dot product as similarity'], p: ['vectors', 'matmul', 'lintrans'] }),
    D(4, 1, 'Calculus for backprop', ['calculus'], { o: ['Apply the chain rule through a composition', 'Know gradient and Jacobian shapes'], p: ['backprop'] }),
    D(5, 1, 'Probability, softmax and cross-entropy', ['probability', 'softmax', 'entropy-cross-entropy'], { o: ['Implement a stable softmax', 'Explain cross-entropy as negative log-likelihood'], p: ['softmax', 'crossentropy'], i: ['softmax-ce-grad'] }),
    D(6, 1, 'Optimization and first models', ['gradient-descent', 'linear-regression', 'logistic-regression', 'optimizers'], { o: ['Train linear and logistic regression with gradient descent', 'Compare SGD, momentum, Adam and AdamW'], p: ['gd'], c: 'Implement logistic regression in NumPy with gradient descent.' }),
    D(7, 1, 'Neural networks and backprop', ['perceptron-mlp', 'backprop'], { o: ['Derive backprop for a 2-layer MLP', 'Verify gradients numerically'], p: ['activations', 'backprop'], c: 'Write a 2-layer MLP forward and backward pass in NumPy; gradient-check it.', m: 'Foundations complete' }),
    D(8, 2, 'Training deep nets in PyTorch', ['init-gradient-flow', 'normalization', 'residual-dropout', 'embeddings', 'pytorch-gpu'], { o: ['Explain LayerNorm and residual connections', 'Write a PyTorch training loop'], c: 'Port your MLP to PyTorch and train it with AdamW.' }),
    D(9, 2, 'Text as data: tokenization', ['tokenization', 'word-vectors'], { o: ['Compare character, word and subword tokenizers', 'Run BPE merges by hand'], p: ['bpe'] }),
    D(10, 2, 'Sequence models and why attention', ['ngram-lm', 'rnn-lstm', 'seq2seq-why-attention'], { o: ['Explain the bottleneck in seq2seq RNNs', 'Explain why attention fixes it'] }),
    D(11, 2, 'Attention from first principles', ['qkv', 'scaled-dot-product'], { o: ['Compute attention by hand', 'Derive the 1/√d_k scaling'], p: ['attention', 'vectors'], i: ['why-scale'] }),
    D(12, 2, 'Masks and multi-head attention', ['masking', 'multi-head', 'attention-types', 'attention-complexity'], { o: ['Implement a causal mask', 'Know MHA tensor shapes and O(T²) cost'], c: 'Implement multi-head attention in PyTorch from scratch.', i: ['mha-from-scratch'] }),
    D(13, 2, 'Positions, FFN and the block', ['positional-encoding', 'rope', 'ffn', 'residual-layernorm-transformer'], { o: ['Explain sinusoidal PE and RoPE', 'Compare Pre-LN and Post-LN'], p: ['posenc', 'rope'], i: ['preln-postln'] }),
    D(14, 2, 'The full Transformer', ['architectures', 'tensor-shapes'], { o: ['Trace tensor shapes through a GPT', 'Use the simulator end to end'], m: 'You can explain a Transformer mathematically' }),
    D(15, 3, 'Language modelling objective', ['language-models'], { o: ['Explain next-token prediction and teacher forcing'], p: ['crossentropy'] }),
    D(16, 3, 'MiniGPT: data and tokenizer', ['build-data'], { o: ['Prepare a dataset and build a tokenizer'], c: 'Implement the character tokenizer and train/val split.' }),
    D(17, 3, 'MiniGPT: embeddings and attention', ['build-model'], { o: ['Implement causal multi-head self-attention'], c: 'Write CausalSelfAttention and test that future tokens do not affect past outputs.' }),
    D(18, 3, 'MiniGPT: blocks and the model', ['build-model'], { o: ['Assemble the decoder-only model'], c: 'Write Block and GPT; check output shape [B, T, V] and parameter count.', p: ['params'] }),
    D(19, 3, 'MiniGPT: training loop', ['build-training'], { o: ['Train with AdamW, warmup and cosine decay'], c: 'Train for a few thousand steps; plot train/val loss.' }),
    D(20, 3, 'Debugging training', ['regularization', 'classification-metrics'], { o: ['Diagnose a loss that will not decrease'], i: ['unstable-training'] }),
    D(21, 3, 'Generation and sampling', ['decoding', 'build-generation'], { o: ['Implement temperature, top-k and top-p sampling'], p: ['sampling'] }),
    D(22, 3, 'Evaluate your model', ['perplexity'], { o: ['Compute validation perplexity'], c: 'Report val loss and perplexity; generate samples at three temperatures.' }),
    D(23, 3, 'Buffer and polish', ['ml-in-practice'], { o: ['Catch up, finish MiniGPT and write a README'], m: 'You trained a GPT from scratch' }),
    D(24, 4, 'Inference efficiency', ['kv-cache', 'mqa-gqa'], { o: ['Compute KV-cache size', 'Compare MHA, MQA and GQA'], p: ['kvcache'], i: ['kv-cache-growth'] }),
    D(25, 4, 'Compute and memory', ['param-flops', 'flashattention'], { o: ['Count parameters and FLOPs', 'Explain FlashAttention'], p: ['params'], i: ['param-count'] }),
    D(26, 4, 'Serving and quantization', ['precision-quantization', 'serving'], { o: ['Design a high-throughput inference service'] }),
    D(27, 4, 'Post-training', ['pretraining', 'sft-alignment', 'lora-qlora'], { o: ['Explain SFT and LoRA'] }),
    D(28, 4, 'Scale and systems', ['modern-blocks', 'distributed-moe', 'long-context-rag'], { o: ['Explain data, tensor and pipeline parallelism'] }),
    D(29, 4, 'Interview drill day', [], { o: ['Answer 10 interview questions aloud with no notes'], r: 'Re-derive softmax + CE gradients and attention scaling on paper.' }),
    D(30, 4, 'Mock interview and review', ['eval-safety'], { o: ['Run a full mock: coding, derivation, system design'], m: 'Ready to interview, and to keep learning' }),
  ];
})();
