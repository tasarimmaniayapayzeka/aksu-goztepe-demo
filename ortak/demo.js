// Üç yönün ortak davranışları. Yalnız önizleme içindir; form hiçbir yere gönderilmez.
(function () {
  'use strict';
  var notKutusu, notZaman;

  function not(metin) {
    notKutusu = notKutusu || document.querySelector('.onz-not');
    if (!notKutusu) return;
    notKutusu.textContent = metin;
    notKutusu.hidden = false;
    clearTimeout(notZaman);
    notZaman = setTimeout(function () { notKutusu.hidden = true; }, 3200);
  }

  // Demoda olmayan sayfalar
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-demo-yok]');
    if (!a) return;
    e.preventDefault();
    not('Bu sayfa önizlemede yok. Her yönde ana sayfa, Kardiyoloji ve bir hekim sayfası hazırlandı.');
  });

  // Mobil menü
  document.querySelectorAll('[data-menu]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var acik = document.body.classList.toggle('menu-acik');
      btn.setAttribute('aria-expanded', acik ? 'true' : 'false');
    });
  });

  // Gruplu süzme (birim sekmeleri): [data-suz-grup] içindeki düğmeler, [data-suz-hedef] içindeki öğeler
  document.querySelectorAll('[data-suz-grup]').forEach(function (grup) {
    var hedef = document.querySelector(grup.getAttribute('data-suz-grup'));
    grup.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-suz]');
      if (!b) return;
      grup.querySelectorAll('button[data-suz]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      var d = b.getAttribute('data-suz');
      hedef.querySelectorAll('[data-grup]').forEach(function (o) {
        o.hidden = !(d === 'hepsi' || o.getAttribute('data-grup') === d);
      });
    });
  });

  // Sekmeli içerik (hekim sayfası)
  document.querySelectorAll('[role="tablist"]').forEach(function (liste) {
    var sekmeler = Array.prototype.slice.call(liste.querySelectorAll('[role="tab"]'));
    function sec(s, odak) {
      sekmeler.forEach(function (x) {
        var secili = x === s;
        x.setAttribute('aria-selected', secili ? 'true' : 'false');
        x.tabIndex = secili ? 0 : -1;
        document.getElementById(x.getAttribute('aria-controls')).hidden = !secili;
      });
      if (odak) s.focus();
    }
    liste.addEventListener('click', function (e) {
      var s = e.target.closest('[role="tab"]');
      if (s) sec(s);
    });
    liste.addEventListener('keydown', function (e) {
      var i = sekmeler.indexOf(document.activeElement);
      if (i < 0) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); sec(sekmeler[(i + 1) % sekmeler.length], true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); sec(sekmeler[(i - 1 + sekmeler.length) % sekmeler.length], true); }
    });
  });

  // Hekim süzgeci: birim seçimi + ad araması (aynı hedef listeye bağlı)
  function hekimSuz(hedefSec) {
    var hedef = document.querySelector(hedefSec);
    var sel = document.querySelector('select[data-hekim-suz="' + hedefSec + '"]');
    var ara = document.querySelector('input[data-hekim-ara="' + hedefSec + '"]');
    var b = sel ? sel.value : '';
    var q = ara ? ara.value.trim().toLocaleLowerCase('tr') : '';
    var gorunen = 0;
    hedef.querySelectorAll('[data-birim]').forEach(function (o) {
      var uygun = (b === '' || o.getAttribute('data-birim') === b) && (q === '' || (o.getAttribute('data-ad') || '').indexOf(q) > -1);
      o.hidden = !uygun;
      if (uygun) gorunen++;
    });
    var bos = hedef.parentNode.querySelector('[data-bos]');
    if (bos) bos.hidden = gorunen > 0;
  }
  document.querySelectorAll('[data-hekim-suz], [data-hekim-ara]').forEach(function (g) {
    var h = g.getAttribute('data-hekim-suz') || g.getAttribute('data-hekim-ara');
    g.addEventListener(g.tagName === 'SELECT' ? 'change' : 'input', function () { hekimSuz(h); });
  });

  // Arama kutusu (Yön 1)
  var veri = document.getElementById('arama-verisi');
  document.querySelectorAll('[data-arama]').forEach(function (kutu) {
    if (!veri) return;
    var liste = JSON.parse(veri.textContent);
    var girdi = kutu.querySelector('input');
    var sonuc = kutu.querySelector('[data-arama-sonuc]');
    function kucuk(s) { return s.toLocaleLowerCase('tr'); }
    function goster() {
      var q = kucuk(girdi.value.trim());
      if (q.length < 2) { sonuc.hidden = true; girdi.setAttribute('aria-expanded', 'false'); return; }
      var bulunan = liste.filter(function (o) { return kucuk(o.a + ' ' + o.t).indexOf(q) > -1; }).slice(0, 7);
      sonuc.innerHTML = '';
      if (!bulunan.length) {
        var li = document.createElement('li');
        li.className = 'arama-bos';
        li.textContent = 'Sonuç bulunamadı. Bizi arayın, doğru birime yönlendirelim.';
        sonuc.appendChild(li);
      }
      bulunan.forEach(function (o) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = o.u || '#';
        if (!o.u) a.setAttribute('data-demo-yok', '');
        var t = document.createElement('span'); t.textContent = o.t;
        var k = document.createElement('small'); k.textContent = o.k;
        a.appendChild(t); a.appendChild(k); li.appendChild(a); sonuc.appendChild(li);
      });
      sonuc.hidden = false;
      girdi.setAttribute('aria-expanded', 'true');
    }
    girdi.addEventListener('input', goster);
    girdi.addEventListener('focus', goster);
    document.addEventListener('click', function (e) { if (!kutu.contains(e.target)) { sonuc.hidden = true; girdi.setAttribute('aria-expanded', 'false'); } });
    kutu.addEventListener('submit', function (e) { e.preventDefault(); goster(); });
    kutu.querySelectorAll('[data-arama-ornek]').forEach(function (b) {
      b.addEventListener('click', function () { girdi.value = b.textContent; goster(); girdi.focus(); });
    });
  });

  // "Hangi birime gitmeliyim?" (Yön 3)
  document.querySelectorAll('[data-sihirbaz]').forEach(function (k) {
    var sel = k.querySelector('select');
    var cikti = k.querySelector('[data-sihirbaz-cikti]');
    sel.addEventListener('change', function () {
      var o = sel.options[sel.selectedIndex];
      if (!o.value) { cikti.hidden = true; return; }
      var a = cikti.querySelector('a');
      a.textContent = o.getAttribute('data-ad');
      if (o.value === 'kardiyoloji') { a.href = 'kardiyoloji.html'; a.removeAttribute('data-demo-yok'); }
      else { a.href = '#'; a.setAttribute('data-demo-yok', ''); }
      cikti.hidden = false;
    });
  });

  // Geri arama formu: doğrulama + başarı durumu (gönderim yok)
  document.querySelectorAll('form[data-demo-form]').forEach(function (f) {
    f.setAttribute('novalidate', '');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var ilk = null;
      f.querySelectorAll('[required]').forEach(function (g) {
        var kap = g.closest('.alan') || g.closest('form');
        var hata = kap.querySelector('.hata');
        var gecerli = g.type === 'checkbox' ? g.checked : g.checkValidity() && g.value.trim() !== '';
        if (hata) hata.hidden = gecerli;
        g.setAttribute('aria-invalid', gecerli ? 'false' : 'true');
        if (!gecerli && !ilk) ilk = g;
      });
      if (ilk) { ilk.focus(); return; }
      var tamam = f.parentNode.querySelector('[data-form-tamam]');
      f.hidden = true;
      if (tamam) { tamam.hidden = false; tamam.focus(); }
    });
    f.querySelectorAll('input, select').forEach(function (g) {
      g.addEventListener('input', function () {
        var h = g.closest('.alan').querySelector('.hata');
        if (h && !h.hidden) { h.hidden = true; g.setAttribute('aria-invalid', 'false'); }
      });
    });
  });

  // Çapa menüsü: görünen bölümü işaretle
  var capa = document.querySelector('[data-capa]');
  if (capa && 'IntersectionObserver' in window) {
    var baglar = {};
    capa.querySelectorAll('a[href^="#"]').forEach(function (a) { baglar[a.getAttribute('href').slice(1)] = a; });
    var gozcu = new IntersectionObserver(function (girdiler) {
      girdiler.forEach(function (g) {
        if (g.isIntersecting && baglar[g.target.id]) {
          Object.keys(baglar).forEach(function (k) { baglar[k].removeAttribute('aria-current'); });
          baglar[g.target.id].setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    Object.keys(baglar).forEach(function (id) { var el = document.getElementById(id); if (el) gozcu.observe(el); });
  }
})();
