// Общее меню сайта + кнопка «Сообщить о проблеме».
// Подключение: <script src="nav.js"></script> в начале <body>.
(function () {
  var MAIL = 'trettimtop@gmail.com';
  var pages = [
    ['index.html', 'Главная'],
    ['uno.html', 'Uno: пины'],
    ['motor.html', 'Мотор и датчик'],
    ['start.html', 'Как начать'],
    ['about.html', 'Обо мне']
  ];
  var cur = location.pathname.split('/').pop() || 'index.html';

  var css = document.createElement('style');
  css.textContent =
    '.sitenav{position:sticky;top:0;z-index:50;display:flex;flex-wrap:wrap;gap:6px;align-items:center;' +
    'padding:8px 14px;background:#0a0e17;border-bottom:1px solid #2a3550;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}' +
    '.sitenav a{color:#cfd8ec;text-decoration:none;padding:9px 14px;border-radius:10px;font-size:15px;font-weight:600;white-space:nowrap}' +
    '.sitenav a:hover{background:#1a2233}' +
    '.sitenav a.cur{background:#3b82f6;color:#fff}' +
    '.sitenav .sp{flex:1}' +
    '.sitenav a.report{background:#2b2113;color:#fbbf24;border:1px solid #6b4a12}' +
    '.sitenav a.report:hover{background:#3a2c15}' +
    '@media (max-width:640px){.sitenav{overflow-x:auto;flex-wrap:nowrap}.sitenav .sp{display:none}}';
  document.head.appendChild(css);

  var nav = document.createElement('nav');
  nav.className = 'sitenav';
  nav.setAttribute('aria-label', 'Меню сайта');

  pages.forEach(function (p) {
    var a = document.createElement('a');
    a.href = p[0];
    a.textContent = p[1];
    if (p[0] === cur) a.className = 'cur';
    nav.appendChild(a);
  });

  var sp = document.createElement('span');
  sp.className = 'sp';
  nav.appendChild(sp);

  var rep = document.createElement('a');
  rep.className = 'report';
  rep.textContent = '⚠ Сообщить о проблеме';
  rep.href = '#';
  rep.addEventListener('click', function (e) {
    var body = 'Опишите, что случилось:\n\n\n\n— — —\nСтраница: ' + location.href +
      '\nБраузер: ' + navigator.userAgent;
    rep.href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent('Проблема на сайте T1mk6 Arduino Control') +
      '&body=' + encodeURIComponent(body);
  });
  nav.appendChild(rep);

  function mount() { document.body.insertBefore(nav, document.body.firstChild); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
