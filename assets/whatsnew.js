/* 신품타 홈페이지 — 새 버전 소식 카드
   GitHub Releases의 최신 릴리스 노트를 가져와 보여 준다. 버전마다 한 번만 뜨고, 닫으면 그 버전은 다시 뜨지 않는다. */
(function () {
  'use strict';

  var KEY = 'snp-seen-release';
  var API = 'https://api.github.com/repos/shinu61/ShinPumTa/releases/latest';
  var DOWNLOAD = 'https://github.com/shinu61/ShinPumTa/releases/latest/download/ShinPumTa-Setup.exe';
  var SHOW_AFTER_MS = 1600; // 첫 화면 등장 애니메이션이 끝난 뒤에
  var MAX_ITEMS = 5;

  var seen = null;
  try { seen = window.localStorage.getItem(KEY); } catch (err) { /* 저장소를 못 쓰면 매번 보여 준다 */ }
  if (!window.fetch) return;

  // 릴리스 노트에서 "- " 로 시작하는 줄만 골라 굵게 표시(**)를 뺀다
  function bullets(body) {
    return String(body || '').split(/\r?\n/)
      .map(function (line) { return line.trim(); })
      .filter(function (line) { return /^[-*] /.test(line); })
      .map(function (line) { return line.slice(2).replace(/\*\*/g, '').trim(); })
      .filter(Boolean)
      .slice(0, MAX_ITEMS);
  }

  function dateLabel(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }

  function show(rel) {
    var items = bullets(rel.body);
    if (!items.length) return;

    var card = el('aside', 'wn');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-labelledby', 'wn-title');

    var top = el('div', 'wn-top');
    top.appendChild(el('span', 'wn-badge', '새 버전'));
    top.appendChild(el('span', 'wn-date', dateLabel(rel.published_at)));
    var close = el('button', 'wn-x');
    close.type = 'button';
    close.setAttribute('aria-label', '닫기');
    close.innerHTML = '<svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M2 2l8 8M10 2L2 10"/></svg>';
    top.appendChild(close);
    card.appendChild(top);

    var title = el('h2', '', rel.name || ('신품타 ' + String(rel.tag_name).replace(/^v/, '')));
    title.id = 'wn-title';
    card.appendChild(title);

    var list = el('ul');
    items.forEach(function (text, i) {
      var li = el('li', '', text);
      li.style.transitionDelay = (180 + i * 70) + 'ms';
      list.appendChild(li);
    });
    card.appendChild(list);

    var actions = el('div', 'wn-actions');
    var dl = el('a', 'btn btn-sm', '업데이트 받기');
    dl.href = DOWNLOAD;
    var notes = el('a', '', '자세히 보기');
    notes.href = rel.html_url || 'https://github.com/shinu61/ShinPumTa/releases';
    actions.appendChild(dl);
    actions.appendChild(notes);
    card.appendChild(actions);

    document.body.appendChild(card);

    function dismiss() {
      try { window.localStorage.setItem(KEY, rel.tag_name); } catch (err) { /* 무시 */ }
      card.classList.remove('on');
      document.removeEventListener('keydown', onKey);
      setTimeout(function () { card.remove(); }, 700);
    }
    function onKey(e) { if (e.key === 'Escape') dismiss(); }

    close.addEventListener('click', dismiss);
    dl.addEventListener('click', dismiss);
    notes.addEventListener('click', dismiss);
    document.addEventListener('keydown', onKey);

    setTimeout(function () {
      requestAnimationFrame(function () { card.classList.add('on'); });
    }, SHOW_AFTER_MS);
  }

  fetch(API, { headers: { Accept: 'application/vnd.github+json' } })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (rel) {
      if (rel && rel.tag_name && rel.tag_name !== seen) show(rel);
    })
    .catch(function () { /* 소식을 못 가져와도 페이지는 그대로 */ });
})();
