/* 신품타 홈페이지 — 움직임과 데모 (외부 라이브러리 없음) */
(function () {
  'use strict';

  var root = document.body;
  var $ = function (sel, el) { return (el || root).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || root).querySelectorAll(sel)); };
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var clamp01 = function (v) { return v < 0 ? 0 : (v > 1 ? 1 : v); };
  var soft = function (x) { var t = clamp01(x); return 1 - Math.pow(1 - t, 3); };

  /* 앱과 같은 이징: cubic-bezier(.32, .72, 0, 1) */
  function ease(x) {
    var x1 = 0.32, y1 = 0.72, x2 = 0, y2 = 1;
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var t = x;
    for (var i = 0; i < 10; i++) {
      var it = 1 - t;
      var bx = 3 * x1 * t * it * it + 3 * x2 * t * t * it + t * t * t - x;
      if (Math.abs(bx) < 1e-5) break;
      var d = 3 * x1 * it * it + 6 * (x2 - x1) * t * it + 3 * (1 - x2) * t * t;
      if (Math.abs(d) < 1e-6) break;
      t = Math.min(1, Math.max(0, t - bx / d));
    }
    var it2 = 1 - t;
    return 3 * y1 * t * it2 * it2 + 3 * y2 * t * t * it2 + t * t * t;
  }

  root.setAttribute('data-motion', 'on');

  /* ---------- 첫 화면: 실제로 움직이는 타이머 ---------- */
  var hero = $('#hero');
  var H = { mode: 'study', studyMin: 25, restMin: 5, remain: 1500, running: false, started: false, tag: 0, justDone: null };
  var TAGS = ['자습', '프로젝트', '수업'];
  function minsFor(m) { return m === 'study' ? H.studyMin : H.restMin; }
  function hset(key, text) { var el = hero && hero.querySelector('[data-h="' + key + '"]'); if (el && el.textContent !== text) el.textContent = text; }

  function renderHero() {
    if (!hero) return;
    var isStudy = H.mode === 'study';
    hero.classList.toggle('rest', !isStudy);
    hero.classList.toggle('run', H.started);
    hero.classList.toggle('playing', H.running);
    hero.classList.toggle('done', H.justDone === 'study');
    hset('time', pad(Math.floor(H.remain / 60)) + ':' + pad(H.remain % 60));
    var status = '시작 전';
    if (H.running) status = isStudy ? TAGS[H.tag] + ' · 집중 중' : '휴식 중';
    else if (H.started) status = '일시정지';
    else if (H.justDone === 'study') status = '공부 완료!';
    else if (H.justDone === 'rest') status = '휴식 끝!';
    hset('status', status);
    var total = minsFor(H.mode) * 60;
    var fill = hero.querySelector('[data-h="fill"]');
    if (fill) fill.style.transform = 'scaleX(' + (H.started ? 1 - H.remain / total : 0).toFixed(4) + ')';
    hset('step', (isStudy ? '공부 ' + H.studyMin : '휴식 ' + H.restMin) + '분');
    var left = H.started ? '끝내기' : '초기화';
    hset('leftlbl', left);
    var lb = hero.querySelector('[data-act="left"]'); if (lb) lb.setAttribute('aria-label', left);
    var pb = hero.querySelector('[data-act="play"]'); if (pb) pb.setAttribute('aria-label', H.running ? '일시정지' : '시작');
    var sb = hero.querySelector('[data-act="study"]'); if (sb) sb.setAttribute('aria-pressed', String(isStudy));
    var rb = hero.querySelector('[data-act="rest"]'); if (rb) rb.setAttribute('aria-pressed', String(!isStudy));
    $$('[data-tag]', hero).forEach(function (b) {
      var on = Number(b.getAttribute('data-tag')) === H.tag;
      b.classList.toggle('sel', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }

  function switchMode(m) {
    if (H.mode === m) return;
    H.mode = m; H.running = false; H.started = false; H.justDone = null; H.remain = minsFor(m) * 60;
  }

  if (hero) {
    hero.addEventListener('click', function (e) {
      var t = e.target.closest('[data-act],[data-tag]');
      if (!t || !hero.contains(t)) return;
      var act = t.getAttribute('data-act');
      if (t.hasAttribute('data-tag')) { if (!H.started) H.tag = Number(t.getAttribute('data-tag')); }
      else if (act === 'study' || act === 'rest') switchMode(act);
      else if (act === 'dec' || act === 'inc') {
        if (!H.started) {
          var d = act === 'inc' ? 1 : -1;
          if (H.mode === 'study') { H.studyMin = Math.min(90, Math.max(5, H.studyMin + d * 5)); H.remain = H.studyMin * 60; }
          else { H.restMin = Math.min(30, Math.max(1, H.restMin + d)); H.remain = H.restMin * 60; }
          H.justDone = null;
        }
      } else if (act === 'play') { H.running = !H.running; H.started = true; H.justDone = null; }
      else if (act === 'left') {
        if (H.started) { H.running = false; H.started = false; H.remain = minsFor(H.mode) * 60; }
        else { H.studyMin = 25; H.restMin = 5; H.justDone = null; H.remain = minsFor(H.mode) * 60; }
      }
      renderHero();
    });
  }

  /* ---------- 데모가 화면에 보일 때만 돌리기 ---------- */
  var vis = {};
  var saveDemo = $('#saveDemo'), restDemo = $('#restDemo'), themeDemo = $('#themeDemo');
  var save = { stage: 0, over: 0, timers: [], running: false };

  function setSave(stage) {
    save.stage = stage;
    if (!saveDemo) return;
    saveDemo.setAttribute('data-stage', String(stage));
    var over = stage === 4;
    saveDemo.classList.toggle('rest', !over);
    saveDemo.classList.toggle('done', !over);
    saveDemo.classList.toggle('run', over);
    saveDemo.classList.toggle('playing', over);
    saveDemo.classList.toggle('over', over);
    var tm = saveDemo.querySelector('[data-s="time"]'), lb = saveDemo.querySelector('[data-s="label"]');
    if (tm) tm.textContent = over ? '+' + pad(Math.floor(save.over / 60)) + ':' + pad(save.over % 60) : '00:00';
    if (lb) lb.textContent = over ? '자습 · 추가 공부 중' : '공부 완료!';
  }

  function startSave() {
    if (save.running || !saveDemo) return;
    save.running = true;
    save.timers.forEach(clearTimeout);
    save.timers = [];
    var at = function (ms, fn) { save.timers.push(setTimeout(fn, ms)); };
    at(0, function () { save.over = 0; setSave(0); });
    at(1000, function () { setSave(1); });
    at(2000, function () { setSave(2); });
    at(3000, function () { setSave(3); });
    at(3300, function () { save.over = 0; setSave(4); });
    at(12300, function () {
      save.running = false; save.over = 0; setSave(0);
      if (vis.save) at(900, startSave);
    });
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var k = en.target.getAttribute('data-demo');
        var was = !!vis[k];
        vis[k] = en.isIntersecting;
        if (k === 'save' && en.isIntersecting && !was) startSave();
      });
    }, { threshold: 0.3 });
    $$('[data-demo]').forEach(function (el) { io.observe(el); });
  } else {
    vis = { rest: true, theme: true, save: true };
    startSave();
  }

  /* 1초마다: 첫 화면 타이머, 추가 공부 시간 */
  setInterval(function () {
    if (H.running) {
      if (H.remain <= 1) {
        var next = H.mode === 'study' ? 'rest' : 'study';
        H.justDone = H.mode; H.mode = next; H.remain = minsFor(next) * 60; H.running = false; H.started = false;
      } else H.remain -= 1;
      renderHero();
    }
    if (save.stage === 4) { save.over += 1; setSave(4); }
  }, 1000);

  /* 공부/휴식 토글, 테마 바뀜 */
  setInterval(function () {
    if (vis.rest && restDemo) {
      var toRest = !restDemo.classList.contains('rest');
      restDemo.classList.toggle('rest', toRest);
      restDemo.classList.toggle('k-rest', toRest);
      restDemo.classList.toggle('k-study', !toRest);
    }
    if (vis.theme && themeDemo) {
      var dark = themeDemo.classList.contains('k-light');
      themeDemo.classList.toggle('k-dark', dark);
      themeDemo.classList.toggle('k-light', !dark);
    }
  }, 2700);

  /* ---------- 태그: 직접 골라 보고, 더하고, 지우기 ---------- */
  var tagsWrap = $('.tagsWrap'), tagRow = $('#tagRow');
  var T = {
    list: [
      { id: 't1', name: '자습', color: '#D97757' },
      { id: 't2', name: '프로젝트', color: '#B9583A' },
      { id: 't3', name: '수업', color: '#E8A98C' }
    ],
    sel: 't1', n: 0
  };
  var PRESETS = [{ name: '독서', color: '#C98F73' }, { name: '코딩 테스트', color: '#9E6650' }, { name: '영어', color: '#DDBBA8' }];
  var PLUS = '<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M5 1.75v6.5"></path><path d="M1.75 5h6.5"></path></svg>';
  var CROSS = '<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2 2l6 6"></path><path d="M8 2L2 8"></path></svg>';

  function renderTags() {
    if (!tagRow) return;
    var html = T.list.map(function (t) {
      var on = T.sel === t.id;
      return '<span class="chip-rv"><button class="chip' + (on ? ' sel' : '') + '" type="button" aria-pressed="' + on + '" data-pick="' + t.id + '">' +
        '<span class="dot" style="background: ' + t.color + '"></span>' + t.name + '</button>' +
        (t.custom ? '<button class="chip-x" type="button" aria-label="' + t.name + ' 태그 지우기" data-del="' + t.id + '">' + CROSS + '</button>' : '') +
        '</span>';
    }).join('');
    if (T.list.length < 6) html += '<span class="chip-rv"><button class="chip chip-add" type="button" aria-label="태그 추가" data-add>' + PLUS + '</button></span>';
    tagRow.innerHTML = html;
    schedule();
  }

  if (tagRow) {
    tagRow.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (tagsWrap) tagsWrap.classList.add('touched');
      if (b.hasAttribute('data-pick')) T.sel = b.getAttribute('data-pick');
      else if (b.hasAttribute('data-del')) {
        var id = b.getAttribute('data-del');
        T.list = T.list.filter(function (t) { return t.id !== id; });
        if (T.sel === id) T.sel = 't1';
      } else if (b.hasAttribute('data-add')) {
        var used = T.list.map(function (t) { return t.name; });
        var p = PRESETS.filter(function (x) { return used.indexOf(x.name) < 0; })[0];
        if (p && T.list.length < 6) {
          T.n += 1;
          var nid = 'x' + T.n;
          T.list.push({ id: nid, name: p.name, color: p.color, custom: true });
          T.sel = nid;
        }
      }
      renderTags();
    });
  }

  /* ---------- 주소 복사 (휴대폰 안내) ---------- */
  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var url = 'https://shinu61.github.io/ShinPumTa/';
      var show = function (text) {
        btn.textContent = text;
        clearTimeout(btn._t);
        btn._t = setTimeout(function () { btn.textContent = '페이지 주소 복사'; }, 2400);
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () { show('주소를 복사했어요'); }, function () { show('shinu61.github.io/ShinPumTa'); });
        } else show('shinu61.github.io/ShinPumTa');
      } catch (err) { show('shinu61.github.io/ShinPumTa'); }
    });
  });

  /* ---------- 스크롤 연동: 아래에서 선명해지며 올라오기 (되감기 가능) ---------- */
  var rvEls = $$('.rv');
  rvEls.forEach(function (el) { el._lag = parseFloat(el.getAttribute('data-lag') || '0') || 0; el._p = -1; });
  var day = $('.dayw');
  var daySegs = day ? $$('.seg', day) : [];
  var dayWeek = day ? $$('.dw-wk i', day) : [];
  var dayBars = day ? $$('.dw-bar i', day) : [];
  var dayNum = day ? $('.dt-num', day) : null;
  var dayK = -1, tagLit = null;

  function progress(top, lag, vh, startFrac, spanFrac, atEnd) {
    if (atEnd) return 1;
    var span = Math.max(1, Math.min(vh * spanFrac, 420));
    return clamp01((vh * startFrac - top - (lag || 0)) / span);
  }

  function updateReveal() {
    var vh = window.innerHeight || 800;
    var se = document.scrollingElement || document.documentElement;
    var atEnd = se.scrollHeight > vh + 4 && (se.scrollTop + vh >= se.scrollHeight - 4);
    var tops = rvEls.map(function (el) {
      var lift = (reduce || el._p < 0) ? 0 : (1 - el._p) * 40;
      return el.getBoundingClientRect().top - lift;
    });
    var dayTop = day ? day.getBoundingClientRect().top : 0;
    var tagTop = tagsWrap ? tagsWrap.getBoundingClientRect().top : 0;

    rvEls.forEach(function (el, i) {
      var p = soft(progress(tops[i], el._lag, vh, 1.0, 0.42, atEnd));
      if (Math.abs(p - el._p) > 0.002) {
        el._p = p;
        el.style.setProperty('--rp', p.toFixed(3));
        var settled = p >= 0.999;
        el.style.filter = settled ? 'none' : '';
        el.style.transform = settled ? 'none' : '';
      }
    });

    if (day) {
      var k = progress(dayTop, 0, vh, 0.95, 0.6, atEnd);
      if (Math.abs(k - dayK) > 0.002) {
        dayK = k;
        daySegs.forEach(function (seg, i) {
          var s = soft((k - 0.12 - i * 0.045) / 0.32);
          seg.setAttribute('transform', 'scale(' + (reduce ? 1 : 0.85 + 0.15 * s).toFixed(4) + ')');
          seg.style.opacity = s.toFixed(3);
        });
        dayWeek.forEach(function (b, i) {
          var g = soft((k - 0.05 - i * 0.04) / 0.4);
          if (reduce) b.style.opacity = g.toFixed(3); else b.style.transform = 'scaleY(' + g.toFixed(4) + ')';
        });
        dayBars.forEach(function (b, i) {
          var g = soft((k - 0.45 - i * 0.06) / 0.4);
          if (reduce) b.style.opacity = g.toFixed(3); else b.style.transform = 'scaleX(' + g.toFixed(4) + ')';
        });
        if (dayNum) dayNum.style.setProperty('--hrs', String(Math.round(7 * soft((k - 0.2) / 0.55))));
      }
    }

    if (tagsWrap) {
      var kt = progress(tagTop, 0, vh, 0.95, 0.5, atEnd);
      $$('.chip-rv', tagsWrap).forEach(function (c, i) {
        c.style.setProperty('--cp', soft((kt - 0.1 - i * 0.12) / 0.35).toFixed(3));
      });
      var lit = kt > 0.82;
      if (lit !== tagLit) { tagLit = lit; tagsWrap.classList.toggle('lit', lit); }
    }
  }

  /* ---------- 미니 팝업 장면 ---------- */
  var scene = $('.scene'), stage = $('.stage'), shell = $('.shell'), screen = $('.screen'), grab = $('.grab');
  var off = { dx: 0, dy: 0 }, drag = null, lastK = 0;

  function setOffset(dx, dy) {
    off.dx = dx; off.dy = dy;
    if (!shell) return;
    shell.style.setProperty('--dx', dx.toFixed(1) + 'px');
    shell.style.setProperty('--dy', dy.toFixed(1) + 'px');
  }

  function updateScene() {
    if (!scene || !stage) return;
    if (screen) {
      var w = screen.clientWidth, h = screen.clientHeight;
      if (w > 0) {
        var k = w / (h > w ? 560 : 1280);
        if (Math.abs(k - lastK) > 0.0005) { lastK = k; stage.style.setProperty('--k', k.toFixed(4)); }
      }
    }
    var r = scene.getBoundingClientRect();
    var run = scene.offsetHeight - stage.offsetHeight;
    var p = run > 0 ? clamp01(-r.top / run) : 0;
    var t = clamp01((p - 0.06) / 0.3);
    var te, wo, po, so = 1;
    if (reduce) {
      var on = t >= 0.5;
      te = on ? 1 : 0; wo = on ? 0 : 1; po = on ? 1 : 0;
      so = Math.min(1, Math.abs(t - 0.5) / 0.18);
    } else {
      te = ease(t);
      wo = 1 - clamp01(t / 0.5);
      po = clamp01((t - 0.55) / 0.45);
    }
    var fill = 0.06 + 0.94 * clamp01((p - 0.42) / 0.38);
    var rem = Math.round(1500 * (1 - fill));
    var phase = p < 0.08 ? 0 : (p < 0.42 ? 1 : (p < 0.8 ? 2 : 3));
    var s = stage.style;
    s.setProperty('--te', te.toFixed(4));
    s.setProperty('--wo', wo.toFixed(3));
    s.setProperty('--po', po.toFixed(3));
    s.setProperty('--so', so.toFixed(3));
    s.setProperty('--fill', fill.toFixed(4));
    s.setProperty('--mm', String(Math.floor(rem / 60)));
    s.setProperty('--ss', String(rem % 60));
    if (stage.getAttribute('data-phase') !== String(phase)) stage.setAttribute('data-phase', String(phase));
    if (te < 0.999 && (off.dx || off.dy) && !drag) { shell.classList.add('snapping'); setOffset(0, 0); }
  }

  function bounds() {
    var s = screen.getBoundingClientRect(), b = shell.getBoundingClientRect();
    var u = b.height / 46, m = 12 * u, tb = 44 * u;
    var baseL = s.left + s.width / 2 - b.width / 2;
    var baseT = s.top + 24 * u;
    return { u: u, minDx: s.left + m - baseL, maxDx: s.right - m - (baseL + b.width), minDy: s.top + m - baseT, maxDy: s.bottom - tb - m - (baseT + b.height) };
  }
  function clampOff(dx, dy, b) { return [Math.min(b.maxDx, Math.max(b.minDx, dx)), Math.min(b.maxDy, Math.max(b.minDy, dy))]; }

  if (grab && shell && screen) {
    grab.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      try { grab.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
      drag = { sx: e.clientX, sy: e.clientY, ox: off.dx, oy: off.dy, b: bounds() };
      shell.classList.remove('snapping');
      shell.classList.add('dragging');
    });
    grab.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var c = clampOff(drag.ox + e.clientX - drag.sx, drag.oy + e.clientY - drag.sy, drag.b);
      setOffset(c[0], c[1]);
    });
    var release = function () {
      if (!drag) return;
      var b = drag.b; drag = null;
      shell.classList.remove('dragging');
      var thr = Math.max(28, 70 * b.u), dx = off.dx, dy = off.dy;
      if (Math.hypot(dx, dy) < thr * 1.4) { dx = 0; dy = 0; }
      else {
        if (Math.abs(dx) < thr * 0.6) dx = 0;
        if (dx - b.minDx < thr) dx = b.minDx;
        if (b.maxDx - dx < thr) dx = b.maxDx;
        if (dy - b.minDy < thr) dy = b.minDy;
        if (b.maxDy - dy < thr) dy = b.maxDy;
      }
      shell.classList.add('snapping');
      setOffset(dx, dy);
    };
    grab.addEventListener('pointerup', release);
    grab.addEventListener('pointercancel', release);
    grab.addEventListener('keydown', function (e) {
      var step = 40, dx = off.dx, dy = off.dy;
      if (e.key === 'ArrowLeft') dx -= step;
      else if (e.key === 'ArrowRight') dx += step;
      else if (e.key === 'ArrowUp') dy -= step;
      else if (e.key === 'ArrowDown') dy += step;
      else if (e.key === 'Home' || e.key === 'Escape') { dx = 0; dy = 0; }
      else return;
      e.preventDefault();
      var c = clampOff(dx, dy, bounds());
      shell.classList.add('snapping');
      setOffset(c[0], c[1]);
    });
  }

  /* ---------- 한 프레임에 한 번만 ---------- */
  var raf = 0;
  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; updateReveal(); updateScene(); });
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('load', schedule);

  renderHero();
  renderTags();
  updateReveal();
  updateScene();
})();
