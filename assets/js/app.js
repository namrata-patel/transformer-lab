/* Boot: data init, theme, search, menus, routing */
(function () {
  const TL = window.TL;
  TL.initData();
  TL.applyTheme();
  TL.updateProgressPill();
  document.getElementById('nav-toggle').innerHTML = TL.icon('menu', 18);
  document.getElementById('theme-btn').onclick = () => {
    TL.state.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    TL.save(); TL.applyTheme();
  };
  document.getElementById('nav-toggle').onclick = () => document.querySelector('.topnav').classList.toggle('open');
  const menu = document.getElementById('more-menu');
  menu.querySelector('.menu-btn').onclick = (e) => { e.stopPropagation(); menu.classList.toggle('open'); };
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.menu')) menu.classList.remove('open');
    if (!e.target.closest('.searchbox')) document.getElementById('search-results').hidden = true;
  });

  // search
  const input = document.getElementById('search'), box = document.getElementById('search-results');
  let sel = -1, results = [];
  const show = () => {
    results = TL.search(input.value, 12); sel = -1;
    box.hidden = !input.value.trim();
    box.innerHTML = (results.length ? results.map((r, i) => `<a class="sr-item" href="${r.href}" data-i="${i}"><span class="sr-type">${r.type}</span>${TL.esc(r.title)}<small>${TL.esc(r.sub || '')}</small></a>`).join('') : '<div class="sr-item muted">No results</div>');
    TL.rewriteLinks(box);
  };
  input.addEventListener('input', show);
  input.addEventListener('focus', () => input.value && show());
  input.addEventListener('keydown', (e) => {
    const items = box.querySelectorAll('a.sr-item');
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, Math.min(items.length - 1, sel + (e.key === 'ArrowDown' ? 1 : -1))); items.forEach((a, i) => a.classList.toggle('sel', i === sel)); }
    if (e.key === 'Enter' && results.length) { TL.go(results[Math.max(0, sel)].href); input.blur(); box.hidden = true; }
    if (e.key === 'Escape') { box.hidden = true; input.blur(); }
  });
  box.addEventListener('click', () => { box.hidden = true; input.value = ''; });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); }
  });

  if (!TL.STATIC) window.addEventListener('hashchange', TL.route);
  TL.route();
})();
