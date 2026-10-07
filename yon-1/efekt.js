// Yön 1 efektleri: Yön 2'deki etkileşimlerin beyaz zemin ve tek kırmızı diline çevrilmiş hali.
// Sayaçlar, sıralı belirme, dönen tetkik kartları, adım listesinde nabız sinyali, yönlendirme bandında
// numaraya akan nabız çizgisi, hekim vitrini, 7/24 canlı saat ve check-up etkileşimi.
// Hareket azaltma tercihinde her şey durağan ve görünür kalır.
(function () {
  'use strict';
  var mm = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
  var az = mm('(prefers-reduced-motion: reduce)');
  var dokunmatik = mm('(hover: none)');
  var IO = 'IntersectionObserver' in window;
  if (!az) document.documentElement.classList.add('efekt-hazir');

  var KIRMIZI = '225, 30, 36';
  function ekg(t) { // tek atım: küçük P, keskin QRS, yumuşak T
    return 0.12 * Math.exp(-Math.pow((t - 0.2) / 0.06, 2)) - 0.2 * Math.exp(-Math.pow((t - 0.43) / 0.025, 2))
      + 1 * Math.exp(-Math.pow((t - 0.51) / 0.03, 2)) - 0.36 * Math.exp(-Math.pow((t - 0.58) / 0.03, 2)) + 0.24 * Math.exp(-Math.pow((t - 0.79) / 0.07, 2));
  }

  // Sayaç: 0'dan hedefe yumuşak artış; "7/24" gibi eklerde baştaki sayı sayılır
  function sayarak(el, hedef, ek, sure) {
    ek = ek || '';
    if (az) { el.textContent = hedef + ek; return; }
    var bas = null;
    if (el._say) cancelAnimationFrame(el._say);
    function adim(t) {
      if (bas === null) bas = t;
      var o = Math.min(1, (t - bas) / sure);
      el.textContent = Math.round(hedef * (1 - Math.pow(1 - o, 3))) + ek;
      if (o < 1) el._say = requestAnimationFrame(adim);
    }
    el.textContent = '0' + ek;
    el._say = requestAnimationFrame(adim);
  }

  // 0) Giriş: "Sık arananlar" tek satır; sığmazsa kenarı solar ve yana kayar
  // Ölçüm "tasar" sınıfı kaldırılarak yapılır (son kısayoldaki 32px pay ölçümü bozmasın) ve yazı tipleri yüklenince tekrarlanır
  document.querySelectorAll('.arama-ornek').forEach(function (s) {
    function bak() { s.classList.remove('tasar'); s.classList.toggle('tasar', s.scrollWidth > s.clientWidth + 2); }
    bak(); window.addEventListener('resize', bak);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(bak);
  });

  // 1) Sayı kutuları (giriş güven bilgileri, hakkımızda): ekrana girince sayarak artar
  if (!az && IO) {
    var so = new IntersectionObserver(function (gir) {
      gir.forEach(function (g) {
        if (!g.isIntersecting) return;
        so.unobserve(g.target);
        var m = g.target.textContent.trim().match(/^(\d+)(.*)$/);
        if (m) sayarak(g.target, +m[1], m[2], 1300);
      });
    }, { threshold: 0.4 });
    document.querySelectorAll('.giris-guven strong, .olgu strong').forEach(function (s) { so.observe(s); });
  }

  // 2) Kutu listeleri ekrana girince sırayla belirir
  if (!az && IO) {
    var lo = new IntersectionObserver(function (gir) {
      gir.forEach(function (g) { if (g.isIntersecting) { g.target.classList.add('sirali-gor'); lo.unobserve(g.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.tik-kutu, .haplar, .tetkik-izgara, .pp-testler, .olgu, .metin .blk-liste, .metin .blk-dl').forEach(function (l) {
      l.classList.add('sirali');
      Array.prototype.forEach.call(l.children, function (c, i) { c.style.setProperty('--s', Math.min(i, 14)); });
      lo.observe(l);
    });
  }

  // 3) Dönen tetkik kartları: dokunmatikte dokununca, klavyede Enter ya da boşlukla döner; arka yüzde imleci izleyen ışık
  document.querySelectorAll('.tetkik').forEach(function (k) {
    var arka = k.querySelector('.tk-arka');
    k.addEventListener('click', function () { if (dokunmatik) k.classList.toggle('cevrik'); });
    k.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); k.classList.toggle('cevrik'); } });
    k.addEventListener('blur', function () { k.classList.remove('cevrik'); });
    if (!arka || dokunmatik) return;
    k.addEventListener('mousemove', function (e) {
      var r = k.getBoundingClientRect();
      arka.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      arka.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  // 4) Numaralı adımlar: imleçten numaraya doğru, satırın alt çizgisi üzerinde akan nabız sinyali (canvas)
  if (!az && !dokunmatik) {
    document.querySelectorAll('.blk-adim').forEach(function (ol) {
      var cv = document.createElement('canvas');
      cv.className = 'adim-tuval'; cv.setAttribute('aria-hidden', 'true');
      ol.insertBefore(cv, ol.firstChild);
      var ctx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
      var W = 0, H = 0, aktif = null, imX = 0, sinyaller = [], son = 0, sonUret = 0, calis = false;
      function boyut() { var r = ol.getBoundingClientRect(); W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
      function hat(li) { // sinyal yolu: satırın alt çizgisi; hedef: numara dairesinin altı
        var r = li.getBoundingClientRect(), o = ol.getBoundingClientRect();
        return { y: r.bottom - o.top - 0.5, hedef: r.left - o.left + 17 };
      }
      function uret() {
        if (!aktif) return;
        var h = hat(aktif), bas = Math.max(imX, h.hedef + 70);
        sinyaller.push({ li: aktif, x: bas, y: h.y, hedef: h.hedef, bas: bas });
      }
      function ciz(s) {
        var yol = Math.max(1, s.bas - s.hedef), kalan = Math.max(0, s.x - s.hedef), ilerle = 1 - kalan / yol;
        var gen = 11 * (1 - ilerle * 0.5), boy = 64, alfa = Math.min(1, kalan / 36) * (0.4 + 0.6 * (1 - ilerle * 0.5));
        function iz(a, kal) {
          ctx.beginPath();
          for (var k = 0; k <= boy; k += 2) {
            var x = s.x + k, y = s.y - ekg(k / boy) * gen;
            if (x > s.bas) break;
            if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = 'rgba(' + KIRMIZI + ',' + a.toFixed(3) + ')'; ctx.lineWidth = kal; ctx.stroke();
        }
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        iz(alfa * 0.18, 5);   // yumuşak hale
        iz(alfa, 1.6);        // ince iz
        var g = ctx.createLinearGradient(s.hedef, 0, s.bas, 0); // arkada sönen kuyruk
        g.addColorStop(0, 'rgba(' + KIRMIZI + ',0)'); g.addColorStop(1, 'rgba(' + KIRMIZI + ',' + (alfa * 0.35).toFixed(3) + ')');
        ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(s.x + boy, s.y); ctx.lineTo(s.bas, s.y); ctx.stroke();
        ctx.fillStyle = 'rgba(' + KIRMIZI + ',' + alfa.toFixed(3) + ')'; // öndeki nokta
        ctx.beginPath(); ctx.arc(s.x, s.y, 2.6, 0, Math.PI * 2); ctx.fill();
      }
      function kare(t) {
        var dt = son ? Math.min(40, t - son) : 16; son = t;
        if (aktif && t - sonUret > 560) { uret(); sonUret = t; }
        ctx.clearRect(0, 0, W, H);
        sinyaller.forEach(function (s) {
          s.x -= dt * 0.6;
          if (s.x <= s.hedef && !s.vardi) {
            s.vardi = true;
            s.li.classList.remove('sinyal-vardi'); void s.li.offsetWidth; s.li.classList.add('sinyal-vardi');
          }
          if (!s.vardi) ciz(s);
        });
        sinyaller = sinyaller.filter(function (s) { return !s.vardi; });
        if (aktif || sinyaller.length) requestAnimationFrame(kare); else { calis = false; son = 0; ctx.clearRect(0, 0, W, H); }
      }
      ol.addEventListener('mousemove', function (e) {
        var li = e.target.closest('li'); if (!li || li.parentNode !== ol) return;
        imX = e.clientX - ol.getBoundingClientRect().left;
        if (li !== aktif) { aktif = li; sonUret = 0; }
        if (!calis) { calis = true; boyut(); requestAnimationFrame(kare); }
      });
      ol.addEventListener('mouseleave', function () { aktif = null; });
    });
  }

  // 5) Yönlendirme bandı: başlıktan telefon düğmesine akan ince, ok uçlu nabız çizgisi.
  // Kendiliğinden aralıklı akar; fare banttayken sinyal imlecin olduğu yerden çıkar. Varınca telefon ikonu atar.
  document.querySelectorAll('.yonlendir-sinyal').forEach(function (bant) {
    var kutu = bant.querySelector('.yon-sinyal'), tel = bant.querySelector('.yon-tel');
    if (!kutu) return;
    var cv = kutu.querySelector('canvas'), ctx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = 0, H = 0, sinyaller = [], son = 0, sonUret = -9999, imlec = null, calis = false;
    function boyut() { var r = kutu.getBoundingClientRect(); W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function zemin() {
      var y = Math.round(H / 2) + 0.5, uc = W - 2;
      var g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, 'rgba(42,42,39,0)'); g.addColorStop(1, 'rgba(42,42,39,.28)');
      ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(uc - 1, y); ctx.stroke();
      ctx.strokeStyle = 'rgb(' + KIRMIZI + ')'; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(uc - 6, y - 5); ctx.lineTo(uc, y); ctx.lineTo(uc - 6, y + 5); ctx.stroke(); // ok ucu
    }
    function ciz(s) {
      var boy = 60, y = Math.round(H / 2) + 0.5, yol = Math.max(1, W - 10 - s.bas), ilerle = Math.max(0, Math.min(1, (s.x - s.bas) / yol));
      var alfa = Math.min(1, (s.x - s.bas) / 28 + 0.2) * (1 - Math.pow(ilerle, 3)), gen = H * 0.36 * (0.75 + 0.25 * Math.sin(ilerle * Math.PI));
      function iz(a, kal) {
        ctx.beginPath(); var ilk = true;
        for (var k = 0; k <= boy; k += 2) {
          var x = s.x - boy + k; if (x < s.bas) continue;
          var yy = y - ekg(k / boy) * gen;
          if (ilk) { ctx.moveTo(x, yy); ilk = false; } else ctx.lineTo(x, yy);
        }
        ctx.strokeStyle = 'rgba(' + KIRMIZI + ',' + a.toFixed(3) + ')'; ctx.lineWidth = kal; ctx.stroke();
      }
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      iz(alfa * 0.16, 4.5);
      iz(alfa, 1.5);
      ctx.fillStyle = 'rgba(' + KIRMIZI + ',' + alfa.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(s.x, y, 2.4, 0, Math.PI * 2); ctx.fill();
    }
    function kare(t) {
      if (!calis) return;
      var dt = son ? Math.min(40, t - son) : 16; son = t;
      var aralik = imlec === null ? 1600 : 700;
      if (t - sonUret > aralik) { var b = imlec === null ? 0 : Math.max(0, Math.min(W - 70, imlec)); sinyaller.push({ bas: b, x: b }); sonUret = t; }
      ctx.clearRect(0, 0, W, H); zemin();
      sinyaller.forEach(function (s) {
        s.x += dt * 0.32;
        if (s.x >= W - 10 && !s.vardi) { s.vardi = true; if (tel) { tel.classList.remove('sinyal-vardi'); void tel.offsetWidth; tel.classList.add('sinyal-vardi'); } }
        if (!s.vardi) ciz(s);
      });
      sinyaller = sinyaller.filter(function (s) { return !s.vardi; });
      requestAnimationFrame(kare);
    }
    boyut();
    if ('ResizeObserver' in window) new ResizeObserver(function () { boyut(); if (az || !calis) { ctx.clearRect(0, 0, W, H); zemin(); if (az) ciz({ bas: 0, x: W * 0.55 }); } }).observe(kutu);
    if (az || !IO) { zemin(); if (az) ciz({ bas: 0, x: W * 0.55 }); return; }
    bant.addEventListener('mousemove', function (e) { imlec = e.clientX - kutu.getBoundingClientRect().left; });
    bant.addEventListener('mouseleave', function () { imlec = null; });
    new IntersectionObserver(function (g) {
      var gor = g[0].isIntersecting;
      if (gor && !calis) { calis = true; son = 0; requestAnimationFrame(kare); }
      if (!gor) calis = false;
    }).observe(kutu);
  });

  // 6) Hekim vitrini: birim grubu düğmeleri, ok düğmeleri ve kırmızı ilerleme çizgisi
  document.querySelectorAll('[data-hk-kontrol]').forEach(function (kontrol) {
    var serit = document.querySelector(kontrol.getAttribute('data-hk-kontrol'));
    if (!serit) return;
    var geri = kontrol.querySelector('[data-yon="-1"]'), ileri = kontrol.querySelector('[data-yon="1"]'), cubuk = kontrol.querySelector('.hk-ilerle i');
    function guncelle() {
      var sw = serit.scrollWidth, cw = serit.clientWidth, sl = serit.scrollLeft;
      var oran = sw > 0 ? Math.min(1, cw / sw) : 1;
      cubuk.style.width = (oran * 100) + '%';
      cubuk.style.transform = 'translateX(' + (cw > 0 ? sl / cw * 100 : 0) + '%)';
      geri.disabled = sl <= 2; ileri.disabled = sl + cw >= sw - 2;
      kontrol.classList.toggle('hk-tek', sw <= cw + 2);
    }
    kontrol.addEventListener('click', function (e) {
      var b = e.target.closest('[data-yon]'); if (!b) return;
      var once = serit.scrollLeft, adim = +b.getAttribute('data-yon') * serit.clientWidth * 0.75;
      serit.scrollBy({ left: adim, behavior: az ? 'auto' : 'smooth' });
      setTimeout(function () { if (Math.abs(serit.scrollLeft - once) < 2) serit.scrollLeft = once + adim; guncelle(); }, 700); // yumuşak kaydırma çalışmazsa anlık kaydır
    });
    serit.addEventListener('scroll', guncelle, { passive: true });
    window.addEventListener('resize', guncelle);
    serit.guncelle = guncelle;
    guncelle();
  });
  document.querySelectorAll('[data-hk-grup]').forEach(function (grup) {
    var serit = document.querySelector(grup.getAttribute('data-hk-grup'));
    grup.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-g]'); if (!b || !serit) return;
      var g = b.getAttribute('data-g');
      grup.querySelectorAll('button[data-g]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      serit.querySelectorAll('li[data-grup]').forEach(function (li) { li.hidden = !!g && li.getAttribute('data-grup') !== g; });
      serit.scrollLeft = 0;
      if (!az) serit.querySelectorAll('li:not([hidden])').forEach(function (li, i) {
        li.style.animation = 'none'; void li.offsetWidth; li.style.animation = 'y1-belir .55s cubic-bezier(.2, .8, .2, 1) ' + (i * 50) + 'ms backwards';
      });
      if (serit.guncelle) serit.guncelle();
    });
  });

  // 7) 7/24 hizmetler: canlı saat (İstanbul saati)
  document.querySelectorAll('[data-canli-saat]').forEach(function (el) {
    function yaz() {
      try { el.textContent = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }); }
      catch (e) { var d = new Date(); el.textContent = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
      el.hidden = false;
    }
    yaz(); setInterval(yaz, 15000);
  });

  // 8) Check-up: paket seçilince grafik çubukları büyür, sayılar sayar, karşılaştırma tablosunda paketin sütunu vurgulanır
  document.querySelectorAll('.grafik').forEach(function (gr) {
    var svg = gr.querySelector('.gr-svg'), lj = gr.querySelector('.lejant');
    if (!svg || !lj) return;
    var rects = svg.querySelectorAll('rect'), lis = lj.querySelectorAll('li');
    Array.prototype.forEach.call(rects, function (r, i) {
      r.style.setProperty('--i', i);
      var t = r.nextElementSibling;
      if (t && t.tagName.toLowerCase() === 'text') t.style.setProperty('--i', i);
    });
    function odak(i) {
      svg.classList.toggle('gr-odak', i > -1); lj.classList.toggle('lj-odak', i > -1);
      Array.prototype.forEach.call(rects, function (r, k) { r.classList.toggle('gr-on', k === i); });
      Array.prototype.forEach.call(lis, function (l, k) { l.classList.toggle('lj-on', k === i); });
    }
    Array.prototype.forEach.call(lis, function (l, i) {
      l.addEventListener('mouseenter', function () { odak(i); });
      l.addEventListener('mouseleave', function () { odak(-1); });
      l.addEventListener('focusin', function () { odak(i); });
      l.addEventListener('focusout', function () { odak(-1); });
    });
    Array.prototype.forEach.call(rects, function (r, i) {
      r.addEventListener('mouseenter', function () { odak(i); });
      r.addEventListener('mouseleave', function () { odak(-1); });
    });
  });
  function canlandir(panel) {
    var gr = panel && panel.querySelector('.grafik'); if (!gr) return;
    gr.querySelectorAll('.gr-sayi strong, .lj-sayi').forEach(function (s) {
      if (!s.getAttribute('data-n')) s.setAttribute('data-n', s.textContent.trim()); // asıl sayı bir kez saklanır
      sayarak(s, +s.getAttribute('data-n'), '', 800);
    });
    if (az) return;
    gr.classList.remove('gr-anim'); void gr.offsetWidth; gr.classList.add('gr-anim');
  }
  document.querySelectorAll('.paket-sekme').forEach(function (liste) {
    var tablo = document.querySelector('.karsi'), sure = document.querySelector('.ck-sure');
    var goruldu = false;
    function secili() { var t = liste.querySelector('[role="tab"][aria-selected="true"]'); return t ? (t.getAttribute('aria-controls') || '').replace(/^pk-/, '') : ''; }
    function vurgu(id) {
      [tablo, sure].forEach(function (k) {
        if (k) k.querySelectorAll('[data-p]').forEach(function (h) { h.classList.toggle('karsi-on', h.getAttribute('data-p') === id); });
      });
    }
    function sec() {
      var id = secili(); if (!id) return;
      vurgu(id);
      if (goruldu) canlandir(document.getElementById('pk-' + id));
    }
    if ('MutationObserver' in window) new MutationObserver(sec).observe(liste, { subtree: true, attributes: true, attributeFilter: ['aria-selected'] });
    vurgu(secili());
    var ilk = document.getElementById('pk-' + secili());
    if (IO && !az && ilk) {
      var io = new IntersectionObserver(function (g) {
        if (!g[0].isIntersecting) return;
        io.disconnect(); goruldu = true; canlandir(document.getElementById('pk-' + secili()));
      }, { threshold: 0.3 });
      var hedef = ilk.querySelector('.grafik'); if (hedef) io.observe(hedef); else goruldu = true;
    } else goruldu = true;
    if (tablo) {
      tablo.addEventListener('click', function (e) {
        var h = e.target.closest('[data-p]'); if (!h) return;
        var t = document.getElementById('pt-' + h.getAttribute('data-p')); if (t) t.click();
      });
      tablo.addEventListener('mouseover', function (e) {
        var h = e.target.closest('[data-p]'), id = h ? h.getAttribute('data-p') : null;
        tablo.querySelectorAll('[data-p]').forEach(function (x) { x.classList.toggle('karsi-ust', !!id && x.getAttribute('data-p') === id); });
      });
      tablo.addEventListener('mouseleave', function () { tablo.querySelectorAll('.karsi-ust').forEach(function (x) { x.classList.remove('karsi-ust'); }); });
    }
  });
})();
