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
      var hiz = W / 2600 * dt; // ekranı yaklaşık 2,6 sn'de geçer
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
