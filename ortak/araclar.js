// Araç sayfaları: VKİ, gebelik haftası, kalp riski taraması, kişisel ajanda, birim sihirbazı.
// Yapılandırma sayfadaki .arac-veri JSON'undan gelir. Kullanıcı girdisi DOM'a yalnız textContent ile yazılır.
(function () {
  'use strict';
  function yap(etiket, sinif, metin) {
    var e = document.createElement(etiket);
    if (sinif) e.className = sinif;
    if (metin != null) e.textContent = metin;
    return e;
  }
  function bag(href, metin, sinif) { var a = yap('a', sinif, metin); a.href = href; return a; }
  var trSayi = function (n, k) { return n.toLocaleString('tr-TR', { minimumFractionDigits: k, maximumFractionDigits: k }); };
  var trTarih = function (d) { return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }); };

  document.querySelectorAll('[data-arac]').forEach(function (k) {
    var tur = k.getAttribute('data-arac');
    var veri = JSON.parse(k.querySelector('.arac-veri').textContent);
    var birimler = JSON.parse(k.getAttribute('data-birimler') || '{}');
    var sonuc = k.querySelector('[data-sonuc]');
    var form = k.querySelector('[data-arac-form]');
    function sonucGoster(dugumler) {
      sonuc.innerHTML = '';
      dugumler.forEach(function (d) { if (d) sonuc.appendChild(d); });
      sonuc.hidden = false;
      sonuc.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    function hataGoster(girdi, var_) {
      var h = girdi.closest('.alan').querySelector('.hata');
      if (h) h.hidden = !var_;
      girdi.setAttribute('aria-invalid', var_ ? 'true' : 'false');
    }
    if (form) form.setAttribute('novalidate', '');

    // Vücut kitle indeksi
    if (tur === 'vki-hesaplayici') {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var boy = form.elements.boy, kilo = form.elements.kilo;
        var b = parseFloat(String(boy.value).replace(',', '.')), w = parseFloat(String(kilo.value).replace(',', '.'));
        var bOk = b >= 100 && b <= 230, wOk = w >= 25 && w <= 300;
        hataGoster(boy, !bOk); hataGoster(kilo, !wOk);
        if (!bOk) { boy.focus(); return; }
        if (!wOk) { kilo.focus(); return; }
        var vki = w / Math.pow(b / 100, 2);
        var a = veri.araliklar.find(function (x) { return vki >= x.alt && (x.ust == null || vki < x.ust); }) || veri.araliklar[veri.araliklar.length - 1];
        sonucGoster([yap('p', 'sonuc-etiket', 'Vücut kitle indeksiniz'), yap('p', 'sonuc-deger', trSayi(vki, 1)), yap('p', 'sonuc-ad', a.ad), yap('p', '', a.metin)]);
      });
    }

    // Gebelik haftası ve tahmini doğum tarihi
    if (tur === 'gebelik-hesaplayici') {
      var sat = form.elements.sat;
      var bugun = new Date(); bugun.setHours(0, 0, 0, 0);
      sat.max = bugun.toISOString().slice(0, 10);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var d = sat.value ? new Date(sat.value + 'T00:00:00') : null;
        var gun = d ? Math.round((bugun - d) / 86400000) : -1;
        var ok = d && gun >= 0 && gun <= 294;
        hataGoster(sat, !ok);
        if (!ok) { sat.focus(); return; }
        var hafta = Math.floor(gun / 7), kalan = gun % 7;
        var dogum = new Date(d.getTime() + 280 * 86400000);
        var donem = veri.donemler.find(function (x) { return hafta >= x.haftaBas && hafta <= x.haftaSon; }) || veri.donemler[veri.donemler.length - 1];
        sonucGoster([yap('p', 'sonuc-etiket', 'Gebelik süresi'), yap('p', 'sonuc-deger', hafta + ' hafta ' + kalan + ' gün'),
          yap('p', 'sonuc-ad', 'Tahmini doğum tarihi: ' + trTarih(dogum)), yap('p', 'sonuc-ad', donem.ad), yap('p', '', donem.metin)]);
      });
    }

    // Kalp sağlığı risk taraması
    if (tur === 'kalp-riski-testi') {
      var genelHata = form.querySelector(':scope > .hata');
      form.addEventListener('change', function () { if (genelHata) genelHata.hidden = true; });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var toplam = 0, eksik = null;
        veri.sorular.forEach(function (q) {
          var s = form.querySelector('input[name="' + q.id + '"]:checked');
          if (!s && !eksik) eksik = form.querySelector('input[name="' + q.id + '"]');
          if (s) toplam += Number(s.value);
        });
        if (eksik) { if (genelHata) genelHata.hidden = false; eksik.focus(); return; }
        var b = veri.sonuclar.find(function (x) { return toplam >= x.min && toplam <= x.max; }) || veri.sonuclar[veri.sonuclar.length - 1];
        var dugme = bag('kardiyoloji.html', 'Kardiyoloji birimine git', 'dgm dgm-koyu');
        sonucGoster([yap('p', 'sonuc-etiket', 'Tarama sonucu'), yap('p', 'sonuc-ad sonuc-ad-buyuk', b.ad), yap('p', '', b.metin),
          yap('p', 'sonuc-not', 'Bu tarama bir tanı değildir; yalnız bilinen risk etkenlerini sayar.'), dugme]);
      });
    }

    // Kişisel sağlık ajandası (yalnız bu tarayıcıda saklanır)
    if (tur === 'kisisel-ajanda') {
      var ANAHTAR = 'aksu-saglik-ajandasi';
      var bellek = [];
      var oku = function () { try { return JSON.parse(localStorage.getItem(ANAHTAR) || '[]'); } catch (x) { return bellek; } };
      var kaydet = function (l) { bellek = l; try { localStorage.setItem(ANAHTAR, JSON.stringify(l)); } catch (x) { /* depolama kapalı: yalnız bu oturumda tutulur */ } };
      var alanKutu = k.querySelector('[data-aj-alanlar]');
      var liste = k.querySelector('[data-aj-liste]');
      var bos = k.querySelector('[data-aj-bos]');
      var turSec = form.elements.tur;
      form.elements.tarih.value = new Date().toISOString().slice(0, 10);
      function alanlariCiz() {
        var t = veri.turler.find(function (x) { return x.id === turSec.value; });
        alanKutu.innerHTML = '';
        (t ? t.alanlar : []).forEach(function (a, n) {
          var d = yap('div', 'alan');
          var id = 'aj-' + t.id + '-' + n;
          var l = yap('label', '', a.etiket); l.htmlFor = id;
          var g = a.tur === 'textarea' ? yap('textarea') : yap('input');
          g.id = id; g.name = a.ad;
          if (a.tur !== 'textarea') g.type = ['number', 'time', 'date'].indexOf(a.tur) > -1 ? a.tur : 'text';
          if (a.tur === 'number') g.inputMode = 'decimal';
          d.appendChild(l); d.appendChild(g); alanKutu.appendChild(d);
        });
      }
      function listeyiCiz() {
        var l = oku().slice().sort(function (a, b) { return b.tarih.localeCompare(a.tarih) || b.id - a.id; });
        liste.innerHTML = '';
        bos.hidden = l.length > 0;
        l.forEach(function (o) {
          var li = yap('li');
          var bas = yap('div', 'aj-kayit-bas');
          bas.appendChild(yap('strong', '', o.turAd));
          bas.appendChild(yap('span', '', trTarih(new Date(o.tarih + 'T00:00:00'))));
          li.appendChild(bas);
          var ayr = Object.keys(o.alanlar).filter(function (x) { return o.alanlar[x]; }).map(function (x) { return x + ': ' + o.alanlar[x]; }).join(', ');
          if (ayr) li.appendChild(yap('p', '', ayr));
          var sil = yap('button', 'metin-dgm', 'Sil'); sil.type = 'button';
          sil.setAttribute('aria-label', o.turAd + ' kaydını sil');
          sil.addEventListener('click', function () { kaydet(oku().filter(function (x) { return x.id !== o.id; })); listeyiCiz(); });
          li.appendChild(sil);
          liste.appendChild(li);
        });
      }
      turSec.addEventListener('change', alanlariCiz);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var t = veri.turler.find(function (x) { return x.id === turSec.value; });
        if (!form.elements.tarih.value) { form.elements.tarih.focus(); return; }
        var alanlar = {};
        t.alanlar.forEach(function (a) { var g = form.elements[a.ad]; alanlar[a.etiket] = g ? String(g.value).trim() : ''; });
        var l = oku(); l.push({ id: Date.now(), tur: t.id, turAd: t.ad, tarih: form.elements.tarih.value, alanlar: alanlar });
        kaydet(l);
        alanKutu.querySelectorAll('input, textarea').forEach(function (g) { g.value = ''; });
        listeyiCiz();
      });
      k.querySelector('[data-aj-temizle]').addEventListener('click', function () {
        if (window.confirm('Bu cihazdaki bütün ajanda kayıtları silinsin mi?')) { kaydet([]); listeyiCiz(); }
      });
      alanlariCiz(); listeyiCiz();
    }

    // Hangi birime gitmeliyim?
    if (tur === 'hangi-birime-gitmeliyim') {
      var kutu = k.querySelector('[data-sikayet-kutu]');
      var sl = k.querySelector('[data-sikayet-liste]');
      k.querySelectorAll('[data-bolge]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          k.querySelectorAll('[data-bolge]').forEach(function (x) { x.setAttribute('aria-pressed', x === btn ? 'true' : 'false'); });
          var bolge = veri.bolgeler.find(function (x) { return x.id === btn.getAttribute('data-bolge'); });
          sl.innerHTML = '';
          bolge.sikayetler.forEach(function (s) {
            var b = yap('button', s.acil ? 'acil' : '', s.s); b.type = 'button';
            b.setAttribute('aria-pressed', 'false');
            b.addEventListener('click', function () {
              sl.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
              if (s.acil) {
                var ara = bag('tel:112', '112\'yi arayın', 'dgm dgm-acil');
                var ac = bag('acil-servis.html', 'Acil servis bilgileri', 'dgm dgm-cizgi');
                var d = yap('div', 'dgm-satir'); d.appendChild(ara); d.appendChild(ac);
                sonuc.classList.add('arac-sonuc-acil');
                sonucGoster([yap('p', 'sonuc-ad sonuc-ad-buyuk', 'Bu belirti acil olabilir'), yap('p', '', s.not || 'Beklemeden 112\'yi arayın ya da en yakın acil servise başvurun.'), d]);
                return;
              }
              sonuc.classList.remove('arac-sonuc-acil');
              var ad = birimler[s.birim] || s.birim;
              var p = yap('p', 'sonuc-ad sonuc-ad-buyuk');
              p.appendChild(document.createTextNode('Önerilen birim: '));
              p.appendChild(bag(s.birim + '.html', ad));
              var d2 = yap('div', 'dgm-satir');
              d2.appendChild(bag('randevu.html', 'Randevu al', 'dgm dgm-koyu'));
              d2.appendChild(bag(s.birim + '.html', 'Birim sayfası', 'dgm dgm-cizgi'));
              sonucGoster([p, s.not ? yap('p', '', s.not) : null, yap('p', 'sonuc-not', 'Bu öneri yalnız yol göstermek içindir, tanı yerine geçmez.'), d2]);
            });
            sl.appendChild(b);
          });
          kutu.hidden = false;
          sonuc.hidden = true;
        });
      });
    }
  });
})();
