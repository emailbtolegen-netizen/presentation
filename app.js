(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var allMode = /[?&]all\b/.test(location.search);
  if (allMode) document.body.classList.add('all');

  var fmt = function (n, d) {
    return Number(n).toLocaleString('ru-RU', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  };
  var arrowSvg = function (dir) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="' +
      (dir === 'prev' ? 'M15 18l-6-6 6-6' : 'M9 6l6 6-6 6') + '"/></svg>';
  };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  var stage = document.getElementById('stage');
  var slides = Array.prototype.slice.call(stage.querySelectorAll('.slide'));
  var N = slides.length;

  // export mode (PDF / PowerPoint): the photo carousel becomes a static grid
  if (/[?&]export\b/.test(location.search)) {
    document.querySelectorAll('[data-carousel]').forEach(function (car) {
      var grid = document.createElement('div');
      grid.className = 'pgrid';
      grid.style.cssText = 'grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(3,1fr);height:100%';
      Array.prototype.forEach.call(car.querySelectorAll('figure'), function (f) {
        f.className = 'ph';
        var img = f.querySelector('img');
        if (/kos|cable/.test(img.getAttribute('src'))) img.classList.add('contain');
        grid.appendChild(f);
      });
      var thumbs = car.dataset.thumbs && document.getElementById(car.dataset.thumbs);
      if (thumbs) thumbs.remove();
      car.parentNode.style.gridTemplateRows = '1fr';
      car.replaceWith(grid);
    });
    var lead = document.querySelector('[data-title="Фотоотчёт"] .lead');
    if (lead) lead.remove();
  }

  // keep big numbers like "1 239" on one line
  document.querySelectorAll('.kpi b, .nums b, .need b').forEach(function (b) {
    b.innerHTML = b.innerHTML.replace(/(\d)\s(?=\d)/g, '$1 ');
  });

  // common footer + staggered entrance
  slides.forEach(function (s, i) {
    if (!s.classList.contains('title')) {
      s.insertAdjacentHTML('beforeend',
        '<div class="s-foot"><img src="img/logo-tkh-clear.png" alt="">' +
        '<span class="org">Отдел ЖКХ и жилищной инспекции г. Атырау</span>' +
        '<span class="pg">' + pad(i + 1) + ' <small>/ ' + pad(N) + '</small></span></div>');
    }
    var k = 0;
    s.querySelectorAll('.s-head, .s-body > *:not(.row):not(.col), .s-body > .row > *, .s-body > .col > *').forEach(function (el) {
      el.classList.add('anim');
      el.style.setProperty('--i', k++);
    });
  });

  /* ---------------- CHARTS ---------------- */
  var C = { navy: '#0b2545', blue: '#1c64c8', cyan: '#00a3c4', gold: '#e3a21a', grey: '#9db3d1', line: '#e3e8ef', green: '#1e8f5f' };
  var gBlue = 'linear-gradient(180deg,' + C.blue + ',' + C.cyan + ')';
  var gGold = 'linear-gradient(180deg,#c98a0c,' + C.gold + ')';

  function vbars(id, cats, series, opts) {
    var el = document.getElementById(id);
    if (!el) return;
    opts = opts || {};
    var totals = cats.map(function (_, i) { return series.reduce(function (s, se) { return s + se.values[i]; }, 0); });
    var max = Math.max.apply(null, totals);
    el.innerHTML = cats.map(function (c, i) {
      var segs = series.map(function (se) {
        var v = se.values[i];
        if (!v) return '';
        var col = typeof se.color === 'function' ? se.color(i) : se.color;
        return '<i style="height:' + (v / totals[i] * 100) + '%;background:' + col + '" title="' + se.name + ': ' + fmt(v, opts.dec) + '"></i>';
      }).join('');
      return '<div class="vbar"><div class="plot"><div class="val">' + fmt(totals[i], opts.dec) + '</div>' +
        '<div class="vcol" data-h="' + (totals[i] / max * 86) + '">' + segs + '</div></div>' +
        '<div class="lbl">' + c + '</div></div>';
    }).join('');
  }

  vbars('chartDecades',
    ['до 1960', '1960-е', '1970-е', '1980-е', '1990-е', '2000-е', '2010-е', '2020–2024'],
    [{ name: 'Домов', values: [168, 126, 156, 236, 83, 127, 260, 82], color: function (i) { return i < 4 ? gGold : gBlue; } }]);

  vbars('chartThermo',
    ['<b>2020</b>216,3 млн тг', '<b>2021</b>926,1 млн тг', '<b>2022</b>1 671,5 млн тг', '<b>2024</b>1 337,8 млн тг'], [
    { name: 'Завершены', values: [1, 14, 23, 27], color: C.blue },
    { name: 'Не завершены', values: [3, 3, 4, 0], color: C.gold }
  ]);

  vbars('chartLight', ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII<br>план'],
    [{ name: 'Улиц', values: [77, 218, 21, 188, 382, 454, 300], color: function (i) { return i === 6 ? gGold : gBlue; } }]);

  vbars('chartTariff', ['<b>2025</b>факт', '<b>2026</b>потребность', '<b>2027+</b>в год'], [
    { name: 'По тарифу 71 тг', values: [825.5, 951.6, 0], color: C.blue },
    { name: 'По тарифу 114,07 тг', values: [0, 509.6, 2038.4], color: C.gold }
  ], { dec: 1 });

  function donut(id, items, center) {
    var el = document.getElementById(id);
    if (!el) return;
    var total = items.reduce(function (s, it) { return s + it.v; }, 0);
    var acc = 0;
    var stops = items.map(function (it) {
      var a = acc / total * 360; acc += it.v; var b = acc / total * 360;
      return it.c + ' ' + a + 'deg ' + b + 'deg';
    }).join(',');
    el.innerHTML =
      '<div class="donut" style="background:conic-gradient(' + stops + ')"><div class="center"><b>' + center[0] + '</b><small>' + center[1] + '</small></div></div>' +
      '<div class="dlegend">' + items.map(function (it) {
        return '<div><i style="background:' + it.c + '"></i>' + it.n + '<b>' + it.label + '</b></div>';
      }).join('') + '</div>';
  }

  donut('chartWalls', [
    { n: 'Монолит', v: 454, label: '454', c: C.blue },
    { n: 'Панель', v: 294, label: '294', c: C.cyan },
    { n: 'Кирпич', v: 282, label: '282', c: C.grey },
    { n: 'Гипсоблок', v: 209, label: '209', c: C.gold }
  ], ['1 239', 'домов']);

  donut('chartSludge', [
    { n: 'Выполнено', v: 934568.49, label: '934 568', c: C.green },
    { n: 'Осталось', v: 788806.51, label: '788 807', c: C.line }
  ], ['54,2%', 'из 1 723 375 м³']);

  (function finance() {
    var el = document.getElementById('chartFinance');
    var data = [
      ['Уличное освещение: 7 этап + содержание I–III', 16.9],
      ['Кабельные линии 162 км (предварительно)', 15.9],
      ['Благоустройство 150 дворов (лоты 2–3)', 8.9],
      ['Санитарная очистка (с НДС)', 4.6],
      ['Правобережные КОС — остаток СМР', 4.5],
      ['Благоустройство 100 дворов', 3.97],
      ['Водопровод, 1–3 этапы (2026)', 3.1],
      ['Электроэнергия по новому тарифу (в год, 2027+)', 2.04],
      ['Пруд-испаритель «Квадрат»', 1.6],
      ['Аварийные опоры ЛЭП (2027)', 0.55],
      ['Покос травы (2027)', 0.46],
      ['Котлы и насосы для ЖК', 0.44],
      ['Обработка от комаров, 2 берега', 0.4]
    ];
    var max = data[0][1];
    el.innerHTML = data.map(function (d, i) {
      var frac = String(d[1]).split('.')[1];
      return '<div class="hbar' + (i < 3 ? ' top' : '') + '"><div class="lbl">' + d[0] + '</div>' +
        '<div class="track"><div class="hfill" data-w="' + (d[1] / max * 88) + '"></div><span class="v">' + fmt(d[1], frac ? frac.length : 1) + '</span></div></div>';
    }).join('');
  })();

  function animateIn(root) {
    root.querySelectorAll('.vbar .vcol').forEach(function (c) { c.style.height = c.dataset.h + '%'; });
    root.querySelectorAll('.hbar .hfill, .bar i').forEach(function (f) { f.style.width = f.dataset.w + '%'; });
  }

  /* ---------------- LIGHTBOX ---------------- */
  var lb = document.getElementById('lightbox');
  var lbImg = lb.querySelector('img');
  var lbCap = lb.querySelector('p');
  var lbList = [], lbIdx = 0;
  function lbShow(i) {
    lbIdx = (i + lbList.length) % lbList.length;
    var f = lbList[lbIdx];
    lbImg.src = f.querySelector('img:not(.bg)').src;
    lbCap.textContent = (f.querySelector('figcaption') || {}).textContent || '';
    lb.querySelectorAll('.arrow').forEach(function (a) { a.style.display = lbList.length > 1 ? '' : 'none'; });
  }
  function lbOpen(list, i) { lbList = list; lb.classList.add('open'); lbShow(i); }
  function lbClose() { lb.classList.remove('open'); }
  lb.querySelector('.x').addEventListener('click', lbClose);
  lb.querySelector('.prev').addEventListener('click', function () { lbShow(lbIdx - 1); });
  lb.querySelector('.next').addEventListener('click', function () { lbShow(lbIdx + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) lbClose(); });

  // photo grids: click opens the slide's photos full-screen
  slides.forEach(function (s) {
    var figs = Array.prototype.slice.call(s.querySelectorAll('figure.ph'));
    figs.forEach(function (f, i) { f.addEventListener('click', function () { lbOpen(figs, i); }); });
  });

  /* ---------------- GALLERY CAROUSEL ---------------- */
  var carousels = [];
  document.querySelectorAll('[data-carousel]').forEach(function (car) {
    var track = car.querySelector('.track');
    var figs = Array.prototype.slice.call(track.children);
    var n = figs.length;
    figs.forEach(function (f, i) {
      var img = f.querySelector('img');
      img.classList.add('fg');
      var bg = img.cloneNode();
      bg.className = 'bg';
      bg.alt = '';
      f.insertBefore(bg, img);
      f.addEventListener('click', function () { lbOpen(figs, i); });
    });

    car.insertAdjacentHTML('beforeend',
      '<button class="arrow prev" aria-label="Предыдущее фото">' + arrowSvg('prev') + '</button>' +
      '<button class="arrow next" aria-label="Следующее фото">' + arrowSvg('next') + '</button>' +
      '<div class="counter"></div>');
    var counter = car.querySelector('.counter');

    var thumbsEl = car.dataset.thumbs && document.getElementById(car.dataset.thumbs);
    var thumbs = [];
    if (thumbsEl) {
      thumbsEl.innerHTML = figs.map(function (f, i) {
        return '<button aria-label="Фото ' + (i + 1) + '"><img src="' + f.querySelector('img.fg').getAttribute('src') + '" alt=""></button>';
      }).join('');
      thumbs = Array.prototype.slice.call(thumbsEl.children);
    }

    var idx = 0;
    function mark() {
      thumbs.forEach(function (t, k) { t.classList.toggle('on', k === idx); });
      counter.textContent = (idx + 1) + ' / ' + n;
    }
    function go(i) {
      idx = (i + n) % n;
      track.scrollTo({ left: idx * track.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' });
      mark();
    }
    var scrollT;
    track.addEventListener('scroll', function () {
      clearTimeout(scrollT);
      scrollT = setTimeout(function () {
        var i = Math.round(track.scrollLeft / track.clientWidth);
        if (i !== idx) { idx = i; mark(); }
      }, 80);
    }, { passive: true });

    var timer = null, hover = false;
    var delay = +car.dataset.autoplay || 5000;
    function restart() {
      clearInterval(timer);
      var active = car.closest('.slide').classList.contains('active');
      if (reduceMotion || allMode || hover || !active) return;
      timer = setInterval(function () { go(idx + 1); }, delay);
    }
    car.querySelector('.prev').addEventListener('click', function (e) { e.stopPropagation(); go(idx - 1); restart(); });
    car.querySelector('.next').addEventListener('click', function (e) { e.stopPropagation(); go(idx + 1); restart(); });
    thumbs.forEach(function (t, k) { t.addEventListener('click', function () { go(k); restart(); }); });
    car.addEventListener('mouseenter', function () { hover = true; restart(); });
    car.addEventListener('mouseleave', function () { hover = false; restart(); });

    mark();
    carousels.push({ restart: restart, resync: function () { track.scrollLeft = idx * track.clientWidth; } });
  });

  /* ---------------- ALL-SLIDES MODE (review / print) ---------------- */
  if (allMode) {
    slides.forEach(function (s) { s.classList.add('active'); animateIn(s); });
    return;
  }

  /* ---------------- DECK ---------------- */
  function fit() {
    var s = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
    stage.style.setProperty('--s', s);
    carousels.forEach(function (c) { c.resync(); });
  }
  window.addEventListener('resize', fit);
  fit();

  var cur = -1;
  var cnt = document.getElementById('cnt');
  var bar = document.getElementById('progress');
  var menu = document.getElementById('menu');
  var menuGrid = document.getElementById('menuGrid');
  menuGrid.innerHTML = slides.map(function (s, i) {
    return '<button><i>' + pad(i + 1) + '</i>' + s.dataset.title + '</button>';
  }).join('');
  var menuButtons = Array.prototype.slice.call(menuGrid.children);

  function show(i) {
    i = Math.max(0, Math.min(N - 1, i));
    if (i === cur) return;
    slides.forEach(function (s, k) {
      s.classList.toggle('active', k === i);
      s.classList.toggle('past', k < i);
    });
    cur = i;
    animateIn(slides[i]);
    cnt.textContent = (i + 1) + ' / ' + N;
    bar.style.width = ((i + 1) / N * 100) + '%';
    history.replaceState(null, '', '#' + (i + 1));
    carousels.forEach(function (c) { c.restart(); });
    menuButtons.forEach(function (b, k) { b.classList.toggle('on', k === i); });
  }
  var next = function () { show(cur + 1); };
  var prev = function () { show(cur - 1); };

  menuButtons.forEach(function (b, i) { b.addEventListener('click', function () { show(i); menu.classList.remove('open'); }); });
  var toggleMenu = function () { menu.classList.toggle('open'); };
  document.getElementById('btnMenu').addEventListener('click', toggleMenu);
  document.getElementById('menuClose').addEventListener('click', toggleMenu);

  function toggleFs() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
  }
  document.getElementById('btnNext').addEventListener('click', next);
  document.getElementById('btnPrev').addEventListener('click', prev);
  document.getElementById('btnFs').addEventListener('click', toggleFs);

  document.addEventListener('keydown', function (e) {
    if (lb.classList.contains('open')) {
      if (e.key === 'Escape') lbClose();
      if (e.key === 'ArrowLeft') lbShow(lbIdx - 1);
      if (e.key === 'ArrowRight') lbShow(lbIdx + 1);
      return;
    }
    if (menu.classList.contains('open')) {
      if (e.key === 'Escape' || e.key === 'm' || e.key === 'M' || e.key === 'ь' || e.key === 'Ь') toggleMenu();
      return;
    }
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': case 'Enter': e.preventDefault(); next(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace': e.preventDefault(); prev(); break;
      case 'Home': show(0); break;
      case 'End': show(N - 1); break;
      case 'f': case 'F': case 'а': case 'А': toggleFs(); break;
      case 'm': case 'M': case 'ь': case 'Ь': case 'Escape': toggleMenu(); break;
    }
  });

  var wheelLock = 0;
  window.addEventListener('wheel', function (e) {
    if (menu.classList.contains('open') || lb.classList.contains('open')) return;
    var now = Date.now();
    if (now < wheelLock || Math.abs(e.deltaY) < 25) return;
    wheelLock = now + 700;
    if (e.deltaY > 0) next(); else prev();
  }, { passive: true });

  var tx = null, ty = null;
  document.addEventListener('touchstart', function (e) {
    if (e.target.closest('.carousel') || e.target.closest('.menu')) { tx = null; return; }
    tx = e.touches[0].clientX; ty = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (tx === null) return;
    var dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { if (dx < 0) next(); else prev(); }
    tx = null;
  }, { passive: true });

  var controls = document.getElementById('controls');
  var idleT;
  function wake() {
    controls.classList.remove('idle');
    clearTimeout(idleT);
    idleT = setTimeout(function () { controls.classList.add('idle'); }, 2500);
  }
  document.addEventListener('mousemove', wake);
  wake();

  var start = parseInt(location.hash.slice(1), 10);
  show(start >= 1 && start <= N ? start - 1 : 0);
})();
