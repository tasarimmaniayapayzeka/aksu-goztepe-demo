// Yön 2 efektleri: başlık açılışı + nabız çizgisi + sayaç, koyu banttaki 3B EKG monitörü.
// Hareket azaltma tercihinde her şey durağan ve görünür kalır.
(function () {
  'use strict';
  var az = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NABIZ = '<svg class="nabiz" viewBox="0 0 164 24" aria-hidden="true" focusable="false"><path d="M1 12h50l6-9 7 18 7-14 5 5h80"/><circle class="n-halka" cx="158" cy="12" r="3"/><circle class="n-nokta" cx="158" cy="12" r="3"/></svg>';

  // 1) Başlıklar: kelime kelime açılış ve nabız çizgisi
  var basliklar = document.querySelectorAll('.giris h1, .bolum .b-bas, .koyu h2, .randevu h2, .sayfa-bas h1');
  if (!az) document.documentElement.classList.add('efekt-hazir');
  basliklar.forEach(function (h) {
    if (h.getAttribute('data-efekt')) return;
    h.setAttribute('data-efekt', '1');
    if (!az && h.children.length === 0) {
      var kel = h.textContent.trim().split(/\s+/);
      h.setAttribute('aria-label', h.textContent.trim());
      h.innerHTML = kel.map(function (k, i) { return '<span class="kel" aria-hidden="true"><span style="--i:' + i + '">' + k + '</span></span>'; }).join(' ');
    }
    h.insertAdjacentHTML('beforeend', NABIZ);
  });

  // Sayaç: başlık altındaki ilk sayı (örn. 22 birim)
  document.querySelectorAll('.b-alt').forEach(function (p) {
    if (/\b\d{1,3}\b/.test(p.textContent) && !p.querySelector('.sayac')) {
      p.innerHTML = p.innerHTML.replace(/\b(\d{1,3})\b/, '<span class="sayac" data-hedef="$1">$1</span>');
    }
  });
  function say(el) {
    var hedef = +el.getAttribute('data-hedef'), bas = null;
    if (az || !hedef) return;
    function adim(t) {
      if (bas === null) bas = t;
      var o = Math.min(1, (t - bas) / 1200);
      el.textContent = Math.round(hedef * (1 - Math.pow(1 - o, 3)));
      if (o < 1) requestAnimationFrame(adim);
    }
    el.textContent = '0';
    requestAnimationFrame(adim);
  }

  var kaps = [];
  basliklar.forEach(function (h) {
    var k = h.closest('section') || h.parentNode;
    if (kaps.indexOf(k) < 0) kaps.push(k);
  });
  if ('IntersectionObserver' in window && !az) {
    var io = new IntersectionObserver(function (gir) {
      gir.forEach(function (g) {
        if (!g.isIntersecting) return;
        g.target.classList.add('gorundu');
        g.target.querySelectorAll('.sayac').forEach(say);
        io.unobserve(g.target);
      });
    }, { threshold: 0.2 });
    kaps.forEach(function (k) { io.observe(k); });
  } else {
    kaps.forEach(function (k) { k.classList.add('gorundu'); });
  }

  // Sayı kutuları (hakkımızda, giriş): ekrana girince sayarak artar; "7/24" gibi eklerde baştaki sayı sayılır
  if (!az && 'IntersectionObserver' in window) {
    var sayilar = document.querySelectorAll('.olgu strong, .giris-olgu strong');
    var so = new IntersectionObserver(function (gir) {
      gir.forEach(function (g) {
        if (!g.isIntersecting) return;
        so.unobserve(g.target);
        var el = g.target, m = el.textContent.trim().match(/^(\d+)(.*)$/);
        if (!m) return;
        var hedef = +m[1], ek = m[2], bas = null;
        function adim(t) {
          if (bas === null) bas = t;
          var o = Math.min(1, (t - bas) / 1300);
          el.textContent = Math.round(hedef * (1 - Math.pow(1 - o, 3))) + ek;
          if (o < 1) requestAnimationFrame(adim);
        }
        el.textContent = '0' + ek;
        requestAnimationFrame(adim);
      });
    }, { threshold: 0.4 });
    sayilar.forEach(function (s) { so.observe(s); });
  }

  // Kutu listeleri: ekrana girince sırayla belirme
  if (!az && 'IntersectionObserver' in window) {
    var listeler = document.querySelectorAll('.etiket, .tik-izgara, .tetkik-izgara, .pp-testler, .olgu');
    var lo = new IntersectionObserver(function (gir) {
      gir.forEach(function (g) { if (g.isIntersecting) { g.target.classList.add('sirali-gor'); lo.unobserve(g.target); } });
    }, { threshold: 0.12 });
    listeler.forEach(function (l) {
      l.classList.add('sirali');
      Array.prototype.forEach.call(l.children, function (c, i) { c.style.setProperty('--s', Math.min(i, 14)); });
      lo.observe(l);
    });
  }

  // Dönen tetkik kartları: dokunmatikte dokununca döner, arka yüzde imleci izleyen ışık
  var dokunmatik = window.matchMedia && window.matchMedia('(hover: none)').matches;
  document.querySelectorAll('.tetkik').forEach(function (k) {
    var arka = k.querySelector('.tk-arka');
    k.addEventListener('click', function () { if (dokunmatik) k.classList.toggle('cevrik'); });
    k.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); k.classList.toggle('cevrik'); } });
    if (!arka) return;
    k.addEventListener('mousemove', function (e) {
      var r = k.getBoundingClientRect();
      arka.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      arka.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  // Numaralı adımlar: imlecin olduğu yerden numaraya doğru akan, giderek sönen nabız sinyali
  if (!az && window.matchMedia && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.blk-adim').forEach(function (ol) {
      var cv = document.createElement('canvas');
      cv.className = 'adim-tuval'; cv.setAttribute('aria-hidden', 'true');
      ol.insertBefore(cv, ol.firstChild);
      var ctx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
      var W = 0, H = 0, aktif = null, imX = 0, sinyaller = [], son = 0, sonUret = 0, calis = false;
      var KR = '225, 30, 36';
      function boyut() { var r = ol.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
      function ekg(t) { // tek atım: küçük P, keskin QRS, yumuşak T
        return 0.12 * Math.exp(-Math.pow((t - 0.2) / 0.06, 2)) - 0.2 * Math.exp(-Math.pow((t - 0.42) / 0.025, 2))
          + 1 * Math.exp(-Math.pow((t - 0.5) / 0.03, 2)) - 0.35 * Math.exp(-Math.pow((t - 0.57) / 0.03, 2)) + 0.25 * Math.exp(-Math.pow((t - 0.78) / 0.07, 2));
      }
      function hat(li) { // sinyal şeridi: satırın alt kenarı; hedef: numara kutusunun ortası
        var r = li.getBoundingClientRect(), o = ol.getBoundingClientRect();
        return { y: r.bottom - o.top - 3, hedef: r.left - o.left + 30, ny: r.top - o.top + 22 };
      }
      function uret() { if (!aktif) return; var h = hat(aktif); sinyaller.push({ li: aktif, x: Math.max(imX, h.hedef + 60), y: h.y, hedef: h.hedef, bas: Math.max(imX, h.hedef + 60) }); }
      function ciz(s) {
        var yol = s.bas - s.hedef, kalan = Math.max(0, s.x - s.hedef), ilerle = 1 - kalan / yol;
        var gen = 12 * (1 - ilerle * 0.55), boy = 70, alfa = Math.min(1, kalan / 40) * (0.35 + 0.65 * (1 - ilerle * 0.5));
        function iz(dx, dy, a, kal) {
          ctx.beginPath();
          for (var k = 0; k <= boy; k += 2) {
            var x = s.x + k, y = s.y - ekg(k / boy) * gen;
            if (x > s.bas) break;
            if (k === 0) ctx.moveTo(x + dx, y + dy); else ctx.lineTo(x + dx, y + dy);
          }
          ctx.strokeStyle = 'rgba(' + KR + ',' + a.toFixed(3) + ')'; ctx.lineWidth = kal; ctx.stroke();
        }
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        iz(5, 5, alfa * 0.18, 2.4);               // derinlik gölgesi
        ctx.shadowColor = 'rgba(' + KR + ',0.9)'; ctx.shadowBlur = 12;
        iz(0, 0, alfa, 2.2);                       // parlayan iz
        ctx.shadowBlur = 0;
        iz(0, 0, alfa * 0.9, 0.8);
        var g = ctx.createLinearGradient(s.hedef, 0, s.bas, 0); // arkada sönen kuyruk
        g.addColorStop(0, 'rgba(' + KR + ',0)'); g.addColorStop(1, 'rgba(' + KR + ',' + (alfa * 0.25).toFixed(3) + ')');
        ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(s.x + boy, s.y); ctx.lineTo(s.bas, s.y); ctx.stroke();
        var r = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 10); // öndeki parlak uç
        r.addColorStop(0, 'rgba(255,255,255,' + alfa.toFixed(3) + ')'); r.addColorStop(0.35, 'rgba(' + KR + ',' + (alfa * 0.8).toFixed(3) + ')'); r.addColorStop(1, 'rgba(' + KR + ',0)');
        ctx.fillStyle = r; ctx.beginPath(); ctx.arc(s.x, s.y, 10, 0, Math.PI * 2); ctx.fill();
      }
      function kare(t) {
        var dt = son ? Math.min(40, t - son) : 16; son = t;
        if (aktif && t - sonUret > 520) { uret(); sonUret = t; }
        ctx.clearRect(0, 0, W, H);
        sinyaller.forEach(function (s) {
          s.x -= dt * 0.62;
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

  // "… randevusu için" şeridi: başlıktan numaraya doğru akan ince nabız oku.
  // Kendiliğinden aralıklı akar; fare şeritteyken sinyaller imlecin olduğu yerden çıkar, numaraya varınca söner.
  document.querySelectorAll('.cta-serit').forEach(function (serit) {
    var kutu = serit.querySelector('.cta-sinyal'), tel = serit.querySelector('.cta-tel');
    if (!kutu) return;
    var cv = kutu.querySelector('canvas'), ctx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = 0, H = 0, sinyaller = [], son = 0, sonUret = -9999, imlec = null, calis = false;
    var PEMBE = '255, 114, 118';
    function boyut() { var r = kutu.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function ekg(t) {
      return 0.12 * Math.exp(-Math.pow((t - 0.2) / 0.06, 2)) - 0.22 * Math.exp(-Math.pow((t - 0.44) / 0.025, 2))
        + 1 * Math.exp(-Math.pow((t - 0.52) / 0.03, 2)) - 0.38 * Math.exp(-Math.pow((t - 0.6) / 0.03, 2)) + 0.24 * Math.exp(-Math.pow((t - 0.8) / 0.07, 2));
    }
    function zemin() {
      var y = H / 2, uc = W - 2;
      var g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.22)');
      ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(uc - 1, y); ctx.stroke();
      ctx.strokeStyle = 'rgba(' + PEMBE + ',.85)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(uc - 7, y - 6); ctx.lineTo(uc, y); ctx.lineTo(uc - 7, y + 6); ctx.stroke(); // ok ucu
    }
    function ciz(s) {
      var boy = 64, y = H / 2, yol = W - 10 - s.bas, ilerle = Math.max(0, Math.min(1, (s.x - s.bas) / yol));
      var alfa = Math.min(1, (s.x - s.bas) / 30 + 0.15) * (1 - Math.pow(ilerle, 3)), gen = (H * 0.38) * (0.75 + 0.25 * Math.sin(ilerle * Math.PI));
      function iz(dx, dy, a, kal) {
        ctx.beginPath(); var ilk = true;
        for (var k = 0; k <= boy; k += 2) {
          var x = s.x - boy + k; if (x < s.bas) continue;
          var yy = y - ekg(k / boy) * gen;
          if (ilk) { ctx.moveTo(x + dx, yy + dy); ilk = false; } else ctx.lineTo(x + dx, yy + dy);
        }
        ctx.strokeStyle = 'rgba(' + PEMBE + ',' + a.toFixed(3) + ')'; ctx.lineWidth = kal; ctx.stroke();
      }
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      iz(4, 4, alfa * 0.16, 1.6);                                   // derinlik yankısı
      ctx.shadowColor = 'rgba(' + PEMBE + ',.95)'; ctx.shadowBlur = 10;
      iz(0, 0, alfa, 1.6);                                           // ince parlak iz
      ctx.shadowBlur = 0;
      var r = ctx.createRadialGradient(s.x, y, 0, s.x, y, 8);      // öndeki ışık
      r.addColorStop(0, 'rgba(255,255,255,' + alfa.toFixed(3) + ')'); r.addColorStop(1, 'rgba(' + PEMBE + ',0)');
      ctx.fillStyle = r; ctx.beginPath(); ctx.arc(s.x, y, 8, 0, Math.PI * 2); ctx.fill();
    }
    function kare(t) {
      if (!calis) return;
      var dt = son ? Math.min(40, t - son) : 16; son = t;
      var aralik = imlec === null ? 1500 : 650;
      if (t - sonUret > aralik) { var b = imlec === null ? 0 : Math.max(0, Math.min(W - 70, imlec)); sinyaller.push({ bas: b, x: b }); sonUret = t; }
      ctx.clearRect(0, 0, W, H); zemin();
      sinyaller.forEach(function (s) {
        s.x += dt * 0.34;
        if (s.x >= W - 10 && !s.vardi) { s.vardi = true; if (tel) { tel.classList.remove('sinyal-vardi'); void tel.offsetWidth; tel.classList.add('sinyal-vardi'); } }
        if (!s.vardi) ciz(s);
      });
      sinyaller = sinyaller.filter(function (s) { return !s.vardi; });
      requestAnimationFrame(kare);
    }
    boyut();
    // Mobil denetim: hareket azaltmada boyut değişince tuval temizleniyor, durağan çizgi kayboluyordu; yeniden çizilir
    function durgun() { zemin(); ciz({ bas: 0, x: W * 0.55 }); }
    new ResizeObserver(function () { boyut(); if (az) durgun(); }).observe(kutu);
    if (az) { durgun(); return; }
    serit.addEventListener('mousemove', function (e) { imlec = e.clientX - kutu.getBoundingClientRect().left; });
    serit.addEventListener('mouseleave', function () { imlec = null; });
    new IntersectionObserver(function (g) {
      var gor = g[0].isIntersecting;
      if (gor && !calis) { calis = true; son = 0; requestAnimationFrame(kare); }
      if (!gor) calis = false;
    }).observe(kutu);
  });

  // Hekim vitrini: grup düğmeleriyle süzme, ok düğmeleri ve kırmızı ilerleme çizgisi
  document.querySelectorAll('[data-hk-kontrol]').forEach(function (kontrol) {
    var serit = document.querySelector(kontrol.getAttribute('data-hk-kontrol'));
    if (!serit) return;
    var geri = kontrol.querySelector('[data-yon="-1"]'), ileri = kontrol.querySelector('[data-yon="1"]'), cubuk = kontrol.querySelector('.hk-ilerle i');
    function guncelle() {
      var sw = serit.scrollWidth, cw = serit.clientWidth, sl = serit.scrollLeft;
      cubuk.style.width = Math.min(100, cw / sw * 100) + '%';
      cubuk.style.transform = 'translateX(' + (sl / cw * 100) + '%)';
      geri.disabled = sl <= 2; ileri.disabled = sl + cw >= sw - 2;
    }
    kontrol.addEventListener('click', function (e) {
      var b = e.target.closest('[data-yon]'); if (!b) return;
      var once = serit.scrollLeft, adim = +b.getAttribute('data-yon') * serit.clientWidth * 0.75;
      serit.scrollBy({ left: adim, behavior: az ? 'auto' : 'smooth' });
      setTimeout(function () { if (Math.abs(serit.scrollLeft - once) < 2) serit.scrollLeft = once + adim; guncelle(); }, 700); // yumuşak kaydırma çalışmazsa
    });
    serit.addEventListener('scroll', guncelle, { passive: true });
    window.addEventListener('resize', guncelle);
    serit.guncelle = guncelle;
    guncelle();
  });
  document.querySelectorAll('[data-hk-cip]').forEach(function (cip) {
    var serit = document.querySelector(cip.getAttribute('data-hk-cip'));
    // Tarama düzeltmesi: mobilde sağ kenar solması, sıra sonuna kaydırılınca son düğmeyi (seçili olsa bile) soldurmasın
    function sonMu() { cip.classList.toggle('cip-son', cip.scrollLeft + cip.clientWidth >= cip.scrollWidth - 2); }
    cip.addEventListener('scroll', sonMu, { passive: true });
    window.addEventListener('resize', sonMu);
    sonMu();
    cip.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-g]'); if (!b || !serit) return;
      var g = b.getAttribute('data-g');
      cip.querySelectorAll('button[data-g]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      serit.querySelectorAll('li[data-grup]').forEach(function (li) { li.hidden = !!g && li.getAttribute('data-grup') !== g; });
      serit.scrollLeft = 0;
      if (!az) serit.querySelectorAll('li:not([hidden])').forEach(function (li, i) {
        li.style.animation = 'none'; void li.offsetWidth; li.style.animation = 'sirala .55s cubic-bezier(.2, .8, .2, 1) ' + (i * 50) + 'ms backwards';
      });
      if (serit.guncelle) serit.guncelle();
    });
  });

  // 7/24 bölümü: canlı saat, hizmetin üzerine gelince monitör etiketi ve ritim hızı
  document.querySelectorAll('[data-canli-saat]').forEach(function (el) {
    function yaz() {
      try { el.textContent = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }); }
      catch (e) { var d = new Date(); el.textContent = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
      el.hidden = false;
    }
    yaz(); setInterval(yaz, 15000);
  });
  document.querySelectorAll('.hz-liste').forEach(function (liste) {
    var bolum = liste.closest('section'), mon = bolum && bolum.querySelector('.monitor');
    if (!mon) return;
    var ad = mon.querySelector('[data-mon-ad]'), alt = mon.querySelector('[data-mon-alt]'), etiket = mon.querySelector('.monitor-etiket');
    var ilkAd = ad.textContent, ilkAlt = alt.textContent;
    function goster(a, b, hiz) {
      etiket.classList.remove('degisti'); void etiket.offsetWidth; etiket.classList.add('degisti');
      ad.textContent = a; alt.textContent = b; mon.setAttribute('data-hiz', hiz);
    }
    liste.querySelectorAll('.hz').forEach(function (h) {
      function ac() { goster(h.getAttribute('data-hz'), 'Şu an açık, 7/24 hizmette', 1.9); mon.classList.add('hz-secili'); }
      h.addEventListener('mouseenter', ac); h.addEventListener('focus', ac);
    });
    function kapa() { goster(ilkAd, ilkAlt, 1); mon.classList.remove('hz-secili'); }
    liste.addEventListener('mouseleave', kapa);
    liste.addEventListener('focusout', function (e) { if (!liste.contains(e.relatedTarget)) kapa(); });
  });

  // 2) 3B EKG monitörü
  document.querySelectorAll('.monitor canvas').forEach(function (cv) {
    var ctx = cv.getContext('2d');
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = 0, H = 0, iz = [], imlec = 0, toplam = 0, halkalar = [], oncekiFaz = 0, son = 0, calis = false, zaman = 0;
    var KIRMIZI = '255, 74, 80';

    function ekg(t) { // bir atımın biçimi: P, QRS, T
      var y = 0;
      y += 0.10 * Math.exp(-Math.pow((t - 0.16) / 0.03, 2));
      y -= 0.14 * Math.exp(-Math.pow((t - 0.35) / 0.008, 2));
      y += 1.00 * Math.exp(-Math.pow((t - 0.38) / 0.011, 2));
      y -= 0.30 * Math.exp(-Math.pow((t - 0.41) / 0.010, 2));
      y += 0.22 * Math.exp(-Math.pow((t - 0.62) / 0.05, 2));
      return y;
    }
    function boyut() {
      var r = cv.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      iz = new Array(W).fill(null);
      if (az) { for (var x = 0; x < W; x++) iz[x] = ekg((x / (W / 2.2)) % 1); imlec = W - 1; }
    }
    function zemin(t) {
      var ufuk = H * 0.42, vx = W / 2;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 1;
      for (var i = -14; i <= 14; i++) { // derinliğe giden çizgiler
        ctx.beginPath(); ctx.moveTo(vx + i * 6, ufuk); ctx.lineTo(vx + i * W * 0.16, H); ctx.stroke();
      }
      var kay = (t * 0.00035) % 1;
      for (var k = 0; k < 14; k++) { // izleyiciye yaklaşan yatay çizgiler
        var z = 14 - k - kay; if (z <= 0.3) continue;
        var y = ufuk + (H - ufuk) * (1 / z);
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.11 * (1 - z / 14)).toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      var g = ctx.createRadialGradient(vx, ufuk, 0, vx, ufuk, W * 0.6); // ufukta kırmızı ışık
      g.addColorStop(0, 'rgba(' + KIRMIZI + ',0.18)'); g.addColorStop(1, 'rgba(' + KIRMIZI + ',0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    function cizgi() {
      var orta = H * 0.5, gen = H * 0.36;
      function yol() {
        ctx.beginPath(); var acik = false;
        for (var x = 0; x < W; x++) {
          var v = iz[x];
          if (v === null || (x > imlec && x < imlec + 26)) { acik = false; continue; }
          var y = orta - v * gen;
          if (!acik) { ctx.moveTo(x, y); acik = true; } else ctx.lineTo(x, y);
        }
      }
      ctx.save();
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(' + KIRMIZI + ',0.9)';
      ctx.shadowBlur = 18; ctx.strokeStyle = 'rgba(' + KIRMIZI + ',0.55)'; ctx.lineWidth = 5; yol(); ctx.stroke();
      ctx.shadowBlur = 6; ctx.strokeStyle = 'rgb(' + KIRMIZI + ')'; ctx.lineWidth = 2.2; yol(); ctx.stroke();
      ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,235,236,0.9)'; ctx.lineWidth = 0.9; yol(); ctx.stroke();
      // uçtaki parlak nokta
      var hy = orta - (iz[imlec] || 0) * gen;
      var rg = ctx.createRadialGradient(imlec, hy, 0, imlec, hy, 16);
      rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.3, 'rgba(' + KIRMIZI + ',0.9)'); rg.addColorStop(1, 'rgba(' + KIRMIZI + ',0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(imlec, hy, 16, 0, Math.PI * 2); ctx.fill();
      // atım halkaları
      halkalar.forEach(function (h) {
        ctx.strokeStyle = 'rgba(' + KIRMIZI + ',' + (0.7 * (1 - h.o)).toFixed(3) + ')';
        ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(h.x, h.y, 6 + h.o * 46, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.restore();
    }
    function kare(t) {
      if (!calis) return;
      var dt = son ? Math.min(48, t - son) : 16; son = t; zaman = t;
      var hiz = W / 2600 * dt * (+(cv.parentNode.getAttribute('data-hiz') || 1)); // ekranı yaklaşık 2,6 sn'de geçer; hizmet seçilince hızlanır
      var atim = W / 2.2;
      for (var s = 0; s < hiz; s++) {
        imlec = (imlec + 1) % W; toplam++;
        var faz = (toplam / atim) % 1;
        iz[imlec] = ekg(faz);
        if (oncekiFaz < 0.38 && faz >= 0.38) halkalar.push({ x: imlec, y: H * 0.5 - H * 0.36, o: 0 });
        oncekiFaz = faz;
      }
      halkalar.forEach(function (h) { h.o += dt / 900; });
      halkalar = halkalar.filter(function (h) { return h.o < 1; });
      ctx.clearRect(0, 0, W, H);
      zemin(t); cizgi();
      requestAnimationFrame(kare);
    }
    boyut();
    if (az) { zemin(0); cizgi(); return; }
    new ResizeObserver(function () { boyut(); }).observe(cv);
    new IntersectionObserver(function (g) {
      var gor = g[0].isIntersecting;
      if (gor && !calis) { calis = true; son = 0; requestAnimationFrame(kare); }
      if (!gor) calis = false;
    }).observe(cv);
  });
})();
