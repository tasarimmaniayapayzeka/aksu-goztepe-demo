// Yön 3 efektleri (kırmızı kutular): sayaçlar, sıralı belirme, dikey dönen tetkik kartları, adım listesinde ritim sinyali,
// kırmızı şeritte numaraya akan nabız oku, hekim vitrini, 7/24 canlı saat, check-up paket seçimi.
// Çizgiler düz ve köşeli çizilir (parlama ve gölge yok). Hareket azaltma tercihinde her şey durağan ve görünür kalır.
(function () {
  'use strict';
  var az = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fareVar = window.matchMedia && window.matchMedia('(hover: hover)').matches;
  var dokunmatik = window.matchMedia && window.matchMedia('(hover: none)').matches;
  var KIRMIZI = '225, 30, 36';
  if (!az) document.documentElement.classList.add('efekt-hazir');

  function ekg(t) { // tek atım: küçük P, keskin QRS, yumuşak T
    return 0.12 * Math.exp(-Math.pow((t - 0.2) / 0.06, 2)) - 0.22 * Math.exp(-Math.pow((t - 0.44) / 0.025, 2))
      + 1 * Math.exp(-Math.pow((t - 0.52) / 0.03, 2)) - 0.38 * Math.exp(-Math.pow((t - 0.6) / 0.03, 2)) + 0.24 * Math.exp(-Math.pow((t - 0.8) / 0.07, 2));
  }

  // Sayaç: yalnız düz sayılar sayılır ("7/24" olduğu gibi kalır)
  function say(el, sure) {
    if (!el.hasAttribute('data-hedef')) el.setAttribute('data-hedef', el.textContent.trim());
    var metin = el.getAttribute('data-hedef');
    if (az || !/^\d+$/.test(metin)) return;
    var hedef = +metin, bas = null, no = (el.sayacNo || 0) + 1;
    el.sayacNo = no;
    el.textContent = '0';
    function adim(t) {
      if (el.sayacNo !== no) return; // yeni sayım başladıysa eskisini bırak
      if (bas === null) bas = t;
      var o = Math.min(1, (t - bas) / (sure || 1200));
      el.textContent = Math.round(hedef * (1 - Math.pow(1 - o, 3)));
      if (o < 1) requestAnimationFrame(adim);
    }
    requestAnimationFrame(adim);
  }
  if (!az && 'IntersectionObserver' in window) {
    var so = new IntersectionObserver(function (gir) {
      gir.forEach(function (g) { if (g.isIntersecting) { so.unobserve(g.target); say(g.target, 1300); } });
    }, { threshold: 0.4 });
    document.querySelectorAll('.giris-olgu strong, .olgu strong, .sayi-kutu strong, .pk-sayilar strong').forEach(function (s) { so.observe(s); });
  }

  // Sık arananlar: tek satır; sığmazsa yana kayar ve sağ kenarı solar
  document.querySelectorAll('[data-sik]').forEach(function (s) {
    function bak() { s.classList.toggle('tasiyor', s.scrollWidth > s.clientWidth + 1 && s.scrollLeft + s.clientWidth < s.scrollWidth - 2); }
    bak(); window.addEventListener('resize', bak); s.addEventListener('scroll', bak, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(bak);
  });

  // Kutu listeleri: ekrana girince sırayla belirir
  if (!az && 'IntersectionObserver' in window) {
    var lo = new IntersectionObserver(function (gir) {
      gir.forEach(function (g) { if (g.isIntersecting) { g.target.classList.add('sirali-gor'); lo.unobserve(g.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.etiket, .cip, .tik-izgara, .tetkik-izgara, .olgu, .blk-liste, .blk-dl, .hizli-yol').forEach(function (l) {
      l.classList.add('sirali');
      Array.prototype.forEach.call(l.children, function (c, i) { c.style.setProperty('--s', Math.min(i, 14)); });
      lo.observe(l);
    });
  }

  // Tetkik kartları: fareyle üzerine gelince ve klavye odağında döner; dokunmatikte dokununca, klavyede Enter/boşlukla çevrilir.
  // Arka yüzde imleci izleyen ışık.
  document.querySelectorAll('.tetkik').forEach(function (k) {
    var arka = k.querySelector('.tk-arka');
    k.addEventListener('click', function () { if (dokunmatik) k.classList.toggle('cevrik'); });
    k.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); k.classList.toggle('duz'); } });
    k.addEventListener('blur', function () { k.classList.remove('duz'); });
    if (!arka) return;
    k.addEventListener('mousemove', function (e) {
      var r = k.getBoundingClientRect();
      arka.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      arka.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  // Numaralı adımlar: imlecin olduğu yerden satırın alt çizgisi boyunca kırmızı numara kutusuna akan ritim sinyali (canvas)
  if (!az && fareVar) {
    document.querySelectorAll('.blk-adim').forEach(function (ol) {
      var cv = document.createElement('canvas');
      cv.className = 'adim-tuval'; cv.setAttribute('aria-hidden', 'true');
      ol.insertBefore(cv, ol.firstChild);
      var ctx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
      var W = 0, H = 0, aktif = null, imX = 0, sinyaller = [], son = 0, sonUret = 0, calis = false;
      function boyut() { var r = ol.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
      function hat(li) { // sinyal: satırın alt çizgisi; hedef: numara kutusunun ortası
        var r = li.getBoundingClientRect(), o = ol.getBoundingClientRect();
        return { y: r.bottom - o.top - 0.5, hedef: r.left - o.left + 20 };
      }
      function uret() { if (!aktif) return; var h = hat(aktif), b = Math.max(imX, h.hedef + 70); sinyaller.push({ li: aktif, x: b, y: h.y, hedef: h.hedef, bas: b }); }
      function ciz(s) {
        var yol = Math.max(1, s.bas - s.hedef), kalan = Math.max(0, s.x - s.hedef), ilerle = 1 - kalan / yol;
        var gen = 13 * (1 - ilerle * 0.5), boy = 64, alfa = Math.min(1, kalan / 30) * (0.45 + 0.55 * (1 - ilerle * 0.5));
        ctx.lineJoin = 'miter'; ctx.lineCap = 'butt';
        ctx.strokeStyle = 'rgba(' + KIRMIZI + ',' + (alfa * 0.22).toFixed(3) + ')'; ctx.lineWidth = 2; // geride kalan iz
        ctx.beginPath(); ctx.moveTo(s.x + boy, s.y); ctx.lineTo(s.bas, s.y); ctx.stroke();
        ctx.beginPath();
        for (var k = 0; k <= boy; k += 2) {
          var x = s.x + k; if (x > s.bas) break;
          var y = s.y - ekg(k / boy) * gen;
          if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(' + KIRMIZI + ',' + alfa.toFixed(3) + ')'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = 'rgba(' + KIRMIZI + ',' + alfa.toFixed(3) + ')'; ctx.fillRect(s.x - 3.5, s.y - 3.5, 7, 7); // öndeki kare uç
      }
      function kare(t) {
        var dt = son ? Math.min(40, t - son) : 16; son = t;
        if (aktif && t - sonUret > 560) { uret(); sonUret = t; }
        ctx.clearRect(0, 0, W, H);
        sinyaller.forEach(function (s) {
          s.x -= dt * 0.6;
          if (s.x <= s.hedef && !s.vardi) {
            s.vardi = true; var li = s.li;
            li.classList.remove('sinyal-vardi'); void li.offsetWidth; li.classList.add('sinyal-vardi');
          }
          if (!s.vardi) ciz(s);
        });
        sinyaller = sinyaller.filter(function (s) { return !s.vardi; });
        if (aktif || sinyaller.length) requestAnimationFrame(kare); else { calis = false; son = 0; ctx.clearRect(0, 0, W, H); }
      }
      function basla() { if (!calis) { calis = true; boyut(); requestAnimationFrame(kare); } }
      ol.addEventListener('mousemove', function (e) {
        var li = e.target.closest('li'); if (!li || li.parentNode !== ol) return;
        imX = e.clientX - ol.getBoundingClientRect().left;
        if (li !== aktif) { aktif = li; sonUret = 0; }
        basla();
      });
      ol.addEventListener('mouseleave', function () { aktif = null; });
    });
  }

  // Kırmızı şerit: başlıktan telefon numarasına akan ince, ok uçlu nabız çizgisi (beyaz).
  // Kendiliğinden aralıklı akar; fare şeritteyken sinyal imlecin olduğu yerden çıkar; numaraya varınca telefon ikonu atar.
  document.querySelectorAll('.serit').forEach(function (serit) {
    var kutu = serit.querySelector('.serit-sinyal'), tel = serit.querySelector('.serit-tel');
    if (!kutu) return;
    var cv = kutu.querySelector('canvas'), ctx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = 0, H = 0, sinyaller = [], son = 0, sonUret = -9999, imlec = null, calis = false;
    function boyut() { var r = kutu.getBoundingClientRect(); W = r.width; H = r.height; cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function zemin() {
      var y = Math.round(H / 2) + 0.5, uc = W - 2;
      ctx.strokeStyle = 'rgba(255,255,255,.38)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(uc - 1, y); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineJoin = 'miter'; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(uc - 8, y - 7); ctx.lineTo(uc, y); ctx.lineTo(uc - 8, y + 7); ctx.stroke(); // ok ucu
    }
    function ciz(s) {
      var boy = 60, y = Math.round(H / 2) + 0.5, yol = Math.max(1, W - 12 - s.bas), ilerle = Math.max(0, Math.min(1, (s.x - s.bas) / yol));
      var alfa = Math.min(1, (s.x - s.bas) / 26 + 0.2) * (1 - Math.pow(ilerle, 3)), gen = H * 0.4;
      ctx.beginPath(); var ilk = true;
      for (var k = 0; k <= boy; k += 2) {
        var x = s.x - boy + k; if (x < s.bas) continue;
        var yy = y - ekg(k / boy) * gen;
        if (ilk) { ctx.moveTo(x, yy); ilk = false; } else ctx.lineTo(x, yy);
      }
      ctx.strokeStyle = 'rgba(255,255,255,' + alfa.toFixed(3) + ')'; ctx.lineWidth = 2; ctx.lineJoin = 'miter'; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,' + alfa.toFixed(3) + ')'; ctx.fillRect(s.x - 3, y - 3, 6, 6);
    }
    function kare(t) {
      if (!calis) return;
      var dt = son ? Math.min(40, t - son) : 16; son = t;
      if (W < 20) { requestAnimationFrame(kare); return; }
      var aralik = imlec === null ? 1600 : 700;
      if (t - sonUret > aralik) { var b = imlec === null ? 0 : Math.max(0, Math.min(W - 70, imlec)); sinyaller.push({ bas: b, x: b }); sonUret = t; }
      ctx.clearRect(0, 0, W, H); zemin();
      sinyaller.forEach(function (s) {
        s.x += dt * 0.34;
        if (s.x >= W - 12 && !s.vardi) { s.vardi = true; if (tel) { tel.classList.remove('sinyal-vardi'); void tel.offsetWidth; tel.classList.add('sinyal-vardi'); } }
        if (!s.vardi) ciz(s);
      });
      sinyaller = sinyaller.filter(function (s) { return !s.vardi; });
      requestAnimationFrame(kare);
    }
    boyut();
    if ('ResizeObserver' in window) new ResizeObserver(function () { boyut(); if (az) { zemin(); ciz({ bas: 0, x: W * 0.55 }); } }).observe(kutu);
    if (az) { if (W >= 20) { zemin(); ciz({ bas: 0, x: W * 0.55 }); } return; }
    serit.addEventListener('mousemove', function (e) { imlec = e.clientX - kutu.getBoundingClientRect().left; });
    serit.addEventListener('mouseleave', function () { imlec = null; });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (g) {
        var gor = g[0].isIntersecting;
        if (gor && !calis) { calis = true; son = 0; requestAnimationFrame(kare); }
        if (!gor) calis = false;
      }).observe(kutu);
    }
  });

  // Hekim vitrini: grup düğmeleriyle süzme, ok düğmeleri ve kırmızı ilerleme çizgisi
  document.querySelectorAll('[data-hk-kontrol]').forEach(function (kontrol) {
    var serit = document.querySelector(kontrol.getAttribute('data-hk-kontrol'));
    if (!serit) return;
    var geri = kontrol.querySelector('[data-yon="-1"]'), ileri = kontrol.querySelector('[data-yon="1"]'), cubuk = kontrol.querySelector('.hv-ilerle i');
    function guncelle() {
      var sw = serit.scrollWidth, cw = serit.clientWidth, sl = serit.scrollLeft;
      if (!sw || !cw) return;
      cubuk.style.width = Math.min(100, cw / sw * 100) + '%';
      cubuk.style.transform = 'translateX(' + (sl / cw * 100) + '%)';
      geri.disabled = sl <= 2; ileri.disabled = sl + cw >= sw - 2;
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
  document.querySelectorAll('[data-hk-cip]').forEach(function (cip) {
    var serit = document.querySelector(cip.getAttribute('data-hk-cip'));
    cip.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-g]'); if (!b || !serit) return;
      var g = b.getAttribute('data-g');
      cip.querySelectorAll('button[data-g]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      serit.querySelectorAll('li[data-grup]').forEach(function (li) { li.hidden = !!g && li.getAttribute('data-grup') !== g; });
      serit.scrollLeft = 0;
      if (!az) serit.querySelectorAll('li:not([hidden])').forEach(function (li, i) {
        li.style.animation = 'none'; void li.offsetWidth; li.style.animation = 'sirala .5s cubic-bezier(.2, .8, .2, 1) ' + (i * 45) + 'ms backwards';
      });
      if (serit.guncelle) serit.guncelle();
    });
  });

  // 7/24 hizmetleri: canlı saat (İstanbul)
  document.querySelectorAll('[data-canli-saat]').forEach(function (el) {
    function yaz() {
      try { el.textContent = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }); }
      catch (e) { var d = new Date(); el.textContent = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
      el.hidden = false;
    }
    yaz(); setInterval(yaz, 15000);
  });

  // 7/24 hizmetleri, dokunmatik: fare olmadığı için ritim çizgisi hücre ekrana girince çizilir ve akar (stil.css "ritim-ac")
  if (!az && dokunmatik) {
    var hzListe = document.querySelectorAll('.bento .hz');
    if ('IntersectionObserver' in window) {
      var hzo = new IntersectionObserver(function (gir) {
        gir.forEach(function (g) { if (g.isIntersecting) { g.target.classList.add('ritim-ac'); hzo.unobserve(g.target); } });
      }, { threshold: 0.6 });
      hzListe.forEach(function (h) { hzo.observe(h); });
    } else hzListe.forEach(function (h) { h.classList.add('ritim-ac'); });
  }

  // Check-up: halka grafikler ve karşılaştırma tablosu (biçim aynı kalır). Paket seçimi vurgular,
  // halka dilimleri yeniden dolar, sayılar sayar; tabloda paketin sütunu öne çıkar, dolu kareler sırayla dolar.
  // Kategorinin üzerine gelince aynı kategori bütün halkalarda öne çıkar.
  var pkSec = document.querySelector('[data-pk-sec]');
  if (pkSec) {
    var izgara = document.querySelector('.halka-izgara');
    var halkalar = Array.prototype.slice.call(document.querySelectorAll('.halka[data-p]'));
    var tablo = document.querySelector('.matris');
    var paketler = document.querySelectorAll('.paket[data-p]');
    var kartlar = document.querySelectorAll('.mx-kart[data-p]');
    var secili = '';
    document.querySelectorAll('.halka-dilim').forEach(function (d) { d.setAttribute('data-son', d.getAttribute('stroke-dasharray')); });
    if (tablo) {
      Array.prototype.forEach.call(tablo.querySelectorAll('tbody tr'), function (tr, i) {
        Array.prototype.forEach.call(tr.children, function (c) { c.style.setProperty('--r', Math.min(i, 40)); });
      });
    }
    function dol(h, gecikme) {
      var ds = h.querySelectorAll('.halka-dilim'), sayi = h.querySelector('.halka-sayi');
      if (az) return;
      ds.forEach(function (d) { d.style.transition = 'none'; d.style.strokeDasharray = '0 100'; });
      void h.getBoundingClientRect();
      ds.forEach(function (d, i) {
        d.style.transition = 'stroke-dasharray .8s cubic-bezier(.2, .8, .2, 1) ' + ((gecikme || 0) + i * 140) + 'ms';
        d.style.strokeDasharray = d.getAttribute('data-son');
      });
      if (sayi) say(sayi, 900);
    }
    function sec(id) {
      secili = id;
      pkSec.querySelectorAll('button[data-p]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-p') === id ? 'true' : 'false'); });
      halkalar.forEach(function (h) {
        var bu = h.getAttribute('data-p') === id;
        h.classList.toggle('soluk', !!id && !bu);
        h.classList.toggle('secili', bu);
        if (bu) dol(h);
      });
      if (!id) halkalar.forEach(function (h, i) { dol(h, i * 60); });
      if (tablo) {
        tablo.classList.toggle('pk-aktif', !!id);
        tablo.querySelectorAll('[data-p]').forEach(function (c) { c.classList.toggle('pk-on', c.getAttribute('data-p') === id); });
      }
      paketler.forEach(function (li) { li.classList.toggle('secili', li.getAttribute('data-p') === id); });
      if (id) kartlar.forEach(function (k) { if (k.getAttribute('data-p') === id) k.open = true; });
    }
    pkSec.addEventListener('click', function (e) { var b = e.target.closest('button[data-p]'); if (b) sec(b.getAttribute('data-p')); });
    halkalar.forEach(function (h) {
      h.addEventListener('click', function () { var id = h.getAttribute('data-p'); sec(secili === id ? '' : id); });
    });
    if (tablo) tablo.addEventListener('click', function (e) {
      var th = e.target.closest('thead th[data-p]'); if (!th) return;
      var id = th.getAttribute('data-p'); sec(secili === id ? '' : id);
    });
    document.querySelectorAll('[data-pk-git]').forEach(function (a) {
      a.addEventListener('click', function () { sec(a.getAttribute('data-pk-git')); });
    });
    if (izgara) {
      izgara.addEventListener('mouseover', function (e) {
        var t = e.target.closest('[data-k]'), k = t ? t.getAttribute('data-k') : null;
        izgara.classList.toggle('kat-odak', k !== null);
        izgara.querySelectorAll('[data-k]').forEach(function (x) { x.classList.toggle('kat-on', x.getAttribute('data-k') === k); });
      });
      izgara.addEventListener('mouseleave', function () {
        izgara.classList.remove('kat-odak');
        izgara.querySelectorAll('.kat-on').forEach(function (x) { x.classList.remove('kat-on'); });
      });
      // Bölüm ekrana girince halkalar sırayla dolar
      if (!az && 'IntersectionObserver' in window) {
        halkalar.forEach(function (h) { h.querySelectorAll('.halka-dilim').forEach(function (d) { d.style.strokeDasharray = '0 100'; }); });
        var ho = new IntersectionObserver(function (g) {
          if (!g[0].isIntersecting) return;
          ho.disconnect();
          halkalar.forEach(function (h, i) { dol(h, i * 90); });
        }, { threshold: 0.25 });
        ho.observe(izgara);
      }
    }
  }
})();
