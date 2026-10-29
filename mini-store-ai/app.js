'use strict';
/* Mini Store — полностью бесплатная версия.
   Всё работает на устройстве: без API, без серверов, без подписок.
   Данные (корзина, образцы, продажи) хранятся в localStorage этого устройства. */

/* ---------- Товары и цены (16 штук, цены владельца) ---------- */
const PRODUCTS = [
  { id: 0,  name: 'iPhone 17 Pro Max Blue',   price: 700000, cat: 'iPhone',       icon: '📱', tint: ['#5ac8fa', '#007aff'] },
  { id: 1,  name: 'iPhone 17 Pro Max Orange', price: 800000, cat: 'iPhone',       icon: '📱', tint: ['#ffb340', '#ff7a00'] },
  { id: 2,  name: 'iPhone 15 Pro Max',        price: 15000,  cat: 'iPhone',       icon: '📱', tint: ['#9aa0aa', '#5d6270'] },
  { id: 3,  name: 'iPhone 13 Blue',           price: 12000,  cat: 'iPhone',       icon: '📱', tint: ['#7cc7ff', '#3d8bff'] },
  { id: 4,  name: 'iPhone 13 Pink',           price: 13000,  cat: 'iPhone',       icon: '📱', tint: ['#ff9fc4', '#ff5f9e'] },
  { id: 5,  name: 'iPhone XS Max',            price: 10000,  cat: 'iPhone',       icon: '📱', tint: ['#a3a3aa', '#6a6a72'] },
  { id: 6,  name: 'iPhone 12',                price: 9000,   cat: 'iPhone',       icon: '📱', tint: ['#8e9bb4', '#58637a'] },
  { id: 7,  name: 'iPhone 5',                 price: 3000,   cat: 'iPhone',       icon: '📱', tint: ['#b4b4ba', '#82828a'] },
  { id: 8,  name: 'AirPods',                  price: 7000,   cat: 'AirPods',      icon: '🎧', tint: ['#d4d4da', '#a0a0aa'] },
  { id: 9,  name: 'AirPods Pro',              price: 9000,   cat: 'AirPods',      icon: '🎧', tint: ['#c2c8d6', '#8890a6'] },
  { id: 10, name: 'Power Adapter',            price: 3000,   cat: 'Аксессуары',   icon: '🔌', tint: ['#cfcfd6', '#9a9aa4'] },
  { id: 11, name: 'Apple Watch SE',           price: 12000,  cat: 'Watch',        icon: '⌚', tint: ['#ff7a7a', '#ff3b30'] },
  { id: 12, name: 'iPad Air',                 price: 14000,  cat: 'iPad',         icon: '📲', tint: ['#7fd6c2', '#30b0a0'] },
  { id: 13, name: 'MacBook Pro',              price: 20000,  cat: 'Mac',          icon: '💻', tint: ['#8b8f9c', '#4b4f5c'] },
  { id: 14, name: 'iPad',                     price: 300000, cat: 'iPad',         icon: '📲', tint: ['#b19cff', '#6c5ce7'] },
  { id: 15, name: 'Apple Pencil',             price: 20000,  cat: 'Аксессуары',   icon: '✏️', tint: ['#f2d36b', '#e0a800'] },
];
const CATS = ['Все', 'iPhone', 'iPad', 'Mac', 'Watch', 'AirPods', 'Аксессуары'];
const product = id => PRODUCTS.find(p => p.id === Number(id));

/* ---------- Утилиты ---------- */
const $ = id => document.getElementById(id);
const fmtNum = n => new Intl.NumberFormat('ru-RU').format(n);
const fmt = n => fmtNum(n) + ' ₽';
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(kid));
  return e;
}
const memory = {};
const store = {
  get(k, def) { try { const v = localStorage.getItem('msai3_' + k); return v == null ? (k in memory ? memory[k] : def) : JSON.parse(v); } catch { return k in memory ? memory[k] : def; } },
  set(k, v) { memory[k] = v; try { localStorage.setItem('msai3_' + k, JSON.stringify(v)); return true; } catch { return false; } },
};
let toastTimer;
function toast(text) {
  const t = $('toast'); t.textContent = text; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2300);
}
const tile = (p, small) => h('div', { class: 'tile' + (small ? ' sm' : ''), style: `background:linear-gradient(145deg,${p.tint[0]},${p.tint[1]})`, 'aria-hidden': 'true' }, p.icon);

/* ---------- Корзина ---------- */
let cart = store.get('cart', {});
let cashRaw = '';
const cartCount = () => Object.values(cart).reduce((a, b) => a + b, 0);
const cartTotal = () => Object.entries(cart).reduce((s, [id, n]) => s + (product(id) ? product(id).price * n : 0), 0);
function saveCart() { store.set('cart', cart); updateBadge(); }
function updateBadge() { const n = cartCount(), b = $('cartBadge'); b.textContent = n; b.classList.toggle('hidden', !n); }
function addToCart(id, n = 1, silent) {
  cart[id] = (cart[id] || 0) + n; if (cart[id] <= 0) delete cart[id];
  saveCart(); renderCart(); renderCatalog();
  if (!silent && n > 0) toast('Добавлено: ' + product(id).name);
}
function setQty(id, q) { if (q <= 0) delete cart[id]; else cart[id] = q; saveCart(); renderCart(); renderCatalog(); }
function clearCart() { cart = {}; saveCart(); renderCart(); renderCatalog(); }

/* ---------- Каталог ---------- */
let activeCat = 'Все';
function renderCats() {
  $('cats').replaceChildren(...CATS.map(c => h('button', { class: 'chip' + (c === activeCat ? ' on' : ''), onclick: () => { activeCat = c; renderCats(); renderCatalog(); } }, c)));
}
function renderCatalog() {
  const q = norm($('search').value);
  const list = PRODUCTS.filter(p => (activeCat === 'Все' || p.cat === activeCat) && (!q || norm(p.name).includes(q) || tokens(p.name).join(' ').includes(tokens(q).join(' '))));
  $('products').replaceChildren(...(list.length ? list.map(p => {
    const n = cart[p.id] || 0;
    return h('div', { class: 'prod' },
      h('div', { class: 'top2' }, tile(p), h('div', { class: 'grow' }, h('div', { class: 'name' }, p.name), h('div', { class: 'price' }, fmt(p.price)))),
      n ? h('div', { class: 'row' }, h('div', { class: 'step' }, h('button', { 'aria-label': 'Меньше', onclick: () => addToCart(p.id, -1, true) }, '−'), h('span', {}, n), h('button', { 'aria-label': 'Больше', onclick: () => addToCart(p.id, 1, true) }, '+')), h('span', { class: 'tag good' }, 'В корзине'))
        : h('button', { class: 'btn', onclick: () => addToCart(p.id) }, 'Добавить'));
  }) : [h('p', { class: 'sub' }, 'Ничего не найдено. Попробуй другое слово.')]));
}
$('search').addEventListener('input', renderCatalog);

/* ---------- Касса ---------- */
const DENOMS = [5000, 1000, 500, 100, 50, 10, 5, 2, 1];
function breakdown(x) { const out = []; for (const d of DENOMS) { const k = Math.floor(x / d); if (k) { out.push([d, k]); x -= k * d; } } return out; }
const roundUp = (x, s) => Math.ceil(x / s) * s;
function setCash(n) { cashRaw = n ? String(Math.round(n)) : ''; $('cash').value = cashRaw ? fmtNum(cashRaw) : ''; renderChange(); }
function renderCart() {
  const ids = Object.keys(cart).filter(id => product(id));
  $('cartItems').replaceChildren(...(ids.length ? ids.map(id => {
    const p = product(id), n = cart[id];
    return h('div', { class: 'item' }, tile(p, true),
      h('div', { class: 'grow' }, h('div', { class: 'name' }, p.name), h('div', { class: 'sub' }, fmt(p.price) + (n > 1 ? ' × ' + n + ' = ' + fmt(p.price * n) : ''))),
      h('div', { class: 'step' }, h('button', { 'aria-label': 'Меньше', onclick: () => setQty(id, n - 1) }, '−'), h('span', {}, n), h('button', { 'aria-label': 'Больше', onclick: () => setQty(id, n + 1) }, '+')));
  }) : [h('p', { class: 'sub', style: 'margin:0' }, 'Корзина пуста. Добавь товары в каталоге или скажи помощнику.')]));
  $('total').textContent = fmt(cartTotal());
  $('cartCount').textContent = cartCount() ? cartCount() + ' шт.' : '';
  renderQuick(); renderChange(); renderHistory(); updateBadge();
}
function renderQuick() {
  const t = cartTotal(); if (!t) { $('quick').replaceChildren(); return; }
  const set = new Set([t, roundUp(t, 1000), roundUp(t, 5000), roundUp(t, 10000), roundUp(t, 50000), roundUp(t, 100000)]);
  $('quick').replaceChildren(...[...set].sort((a, b) => a - b).slice(0, 5).map(v => h('button', { class: 'chip', onclick: () => setCash(v) }, v === t ? 'Ровно ' + fmtNum(v) : fmtNum(v))));
}
function renderChange() {
  const el = $('change'), t = cartTotal(); el.className = 'change';
  if (!t) { el.textContent = 'Добавь товары, чтобы начать продажу.'; return; }
  if (!cashRaw) { el.textContent = 'Введи сумму или выбери быстрый вариант выше.'; return; }
  const diff = Number(cashRaw) - t;
  if (diff < 0) { el.classList.add('bad'); el.textContent = 'Не хватает: ' + fmt(-diff); return; }
  el.classList.add('ok'); el.replaceChildren(h('div', {}, 'Сдача'), h('div', { class: 'big' }, fmt(diff)),
    diff ? h('div', { class: 'notes' }, breakdown(diff).map(([d, k]) => h('span', {}, fmtNum(d) + ' × ' + k))) : null);
}
$('cash').addEventListener('input', e => { cashRaw = e.target.value.replace(/\D/g, '').slice(0, 12); e.target.value = cashRaw ? fmtNum(cashRaw) : ''; renderChange(); });
$('clearCart').onclick = () => { if (!cartCount() || confirm('Очистить корзину?')) { clearCart(); setCash(0); } };
$('checkout').onclick = () => {
  const t = cartTotal();
  if (!t) return toast('Сначала добавь товар');
  if (!cashRaw || Number(cashRaw) < t) return toast('Сумма оплаты меньше итога');
  const paid = Number(cashRaw), sale = { t: Date.now(), items: Object.entries(cart).map(([id, q]) => ({ id: Number(id), q, price: product(id).price })), total: t, paid, change: paid - t };
  const sales = store.get('sales', []); sales.unshift(sale); store.set('sales', sales.slice(0, 60));
  showReceipt(sale); clearCart(); setCash(0);
  speak('Оплата принята. Сдача ' + fmt(sale.change));
};
function showReceipt(s) {
  const r = $('receipt'); r.classList.remove('hidden');
  r.replaceChildren(h('h2', {}, '✅ Покупка завершена'),
    ...s.items.map(i => h('div', { class: 'row sub', style: 'margin:4px 0' }, h('span', {}, product(i.id).name + (i.q > 1 ? ' × ' + i.q : '')), h('span', {}, fmt(i.price * i.q)))),
    h('div', { class: 'row', style: 'margin-top:10px' }, h('b', {}, 'Итого'), h('b', {}, fmt(s.total))),
    h('div', { class: 'row sub' }, h('span', {}, 'Получено'), h('span', {}, fmt(s.paid))),
    h('div', { class: 'row sub' }, h('span', {}, 'Сдача'), h('span', {}, fmt(s.change))),
    h('div', { class: 'actions' }, h('button', { class: 'btn gray', onclick: () => r.classList.add('hidden') }, 'Новая покупка')));
}
function renderHistory() {
  const sales = store.get('sales', []), today = new Date().toDateString();
  const sum = sales.filter(s => new Date(s.t).toDateString() === today).reduce((a, s) => a + s.total, 0);
  $('todaySum').textContent = 'сегодня ' + fmt(sum);
  $('history').replaceChildren(...(sales.length ? sales.slice(0, 15).map(s => h('div', { class: 'item' },
    h('div', { class: 'grow' }, h('div', { class: 'name' }, fmt(s.total)), h('div', { class: 'sub' }, s.items.map(i => product(i.id).name + (i.q > 1 ? ' ×' + i.q : '')).join(', '))),
    h('span', { class: 'sub' }, new Date(s.t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })))) : [h('p', { class: 'sub' }, 'Пока нет продаж.')]));
}

/* ---------- Числа по-русски (для голоса и чата) ---------- */
const NUM_UNITS = { ноль: 0, один: 1, одна: 1, одну: 1, два: 2, две: 2, три: 3, четыре: 4, пять: 5, шесть: 6, семь: 7, восемь: 8, девять: 9, десять: 10, одиннадцать: 11, двенадцать: 12, тринадцать: 13, четырнадцать: 14, пятнадцать: 15, шестнадцать: 16, семнадцать: 17, восемнадцать: 18, девятнадцать: 19 };
const NUM_TENS = { двадцать: 20, тридцать: 30, сорок: 40, пятьдесят: 50, шестьдесят: 60, семьдесят: 70, восемьдесят: 80, девяносто: 90 };
const NUM_HUND = { сто: 100, двести: 200, триста: 300, четыреста: 400, пятьсот: 500, шестьсот: 600, семьсот: 700, восемьсот: 800, девятьсот: 900 };
function parseRuNumber(text) {
  let s = String(text).toLowerCase().replace(/ё/g, 'е').replace(/(\d)[\s  ]+(?=\d{3}(\D|$))/g, '$1');
  s = s.replace(/(\d)\s*[кk](?![а-яa-z])/g, '$1 тысяч');
  const toks = s.match(/\d+(?:[.,]\d+)?|[а-я]+/g) || [];
  let total = 0, cur = 0, found = false;
  for (const t of toks) {
    if (/^\d/.test(t)) { cur += parseFloat(t.replace(',', '.')); found = true; }
    else if (t in NUM_UNITS) { cur += NUM_UNITS[t]; found = true; }
    else if (t in NUM_TENS) { cur += NUM_TENS[t]; found = true; }
    else if (t in NUM_HUND) { cur += NUM_HUND[t]; found = true; }
    else if (/^тысяч/.test(t)) { total += (cur || 1) * 1000; cur = 0; found = true; }
    else if (/^миллион/.test(t)) { total += (cur || 1) * 1e6; cur = 0; found = true; }
  }
  return found ? Math.round(total + cur) : null;
}

/* ---------- Камера ---------- */
function makeCamera(box, video, ph, startBtn, snapBtn, say) {
  let stream = null;
  function stop() {
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null; video.srcObject = null; box.classList.add('off'); ph.classList.remove('hidden');
    snapBtn.disabled = true; startBtn.textContent = 'Включить камеру';
  }
  async function start() {
    if (stream) return stop();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return say('Камера в этом браузере недоступна. Нажми «Снять или выбрать фото».');
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 960 } } });
      video.srcObject = stream; await video.play().catch(() => {});
      box.classList.remove('off'); ph.classList.add('hidden'); snapBtn.disabled = false; startBtn.textContent = 'Выключить';
    } catch (e) {
      stream = null;
      say(e && e.name === 'NotAllowedError' ? 'Нет доступа к камере. Разреши его в настройках Safari или выбери фото вручную.' : 'Камера не запустилась. Нажми «Снять или выбрать фото».');
    }
  }
  function grab() { // видимая часть видео 4:3 → canvas
    const vw = video.videoWidth, vh = video.videoHeight; if (!vw) return null;
    let sw = vw, sh = vh, sx = 0, sy = 0;
    if (vw / vh > 4 / 3) { sw = vh * 4 / 3; sx = (vw - sw) / 2; } else { sh = vw * 3 / 4; sy = (vh - sh) / 2; }
    const k = Math.min(1, 640 / Math.max(sw, sh)), c = document.createElement('canvas');
    c.width = Math.round(sw * k); c.height = Math.round(sh * k);
    c.getContext('2d').drawImage(video, sx, sy, sw, sh, 0, 0, c.width, c.height); return c;
  }
  startBtn.onclick = start;
  return { stop, grab, get active() { return !!stream; } };
}
function canvasFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const k = Math.min(1, 640 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); resolve(c);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Не удалось открыть фото')); };
    img.src = url;
  });
}

/* ---------- Локальное распознавание по образцам ---------- */
// Признаки: яркостная сетка 16×16 (нормированная), гистограмма цвета (12 оттенков + 4 нейтральных), цветовая сетка 3×3.
function extract(canvas, frac) {
  const S = 32, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d', { willReadFrequently: true });
  const sw = canvas.width * frac, sh = canvas.height * frac;
  x.drawImage(canvas, (canvas.width - sw) / 2, (canvas.height - sh) / 2, sw, sh, 0, 0, S, S);
  const d = x.getImageData(0, 0, S, S).data, n = S * S, gray = new Float32Array(n);
  const hist = new Array(16).fill(0), sum = [0, 0, 0];
  const cell = Array.from({ length: 9 }, () => [0, 0, 0, 0]);
  for (let i = 0; i < n; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    gray[i] = .299 * r + .587 * g + .114 * b; sum[0] += r; sum[1] += g; sum[2] += b;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), v = mx / 255, s = mx ? (mx - mn) / mx : 0;
    if (s < .18 || v < .15) hist[12 + Math.min(3, Math.floor(v * 4))]++;
    else {
      let hue; const df = mx - mn;
      if (mx === r) hue = ((g - b) / df + 6) % 6; else if (mx === g) hue = (b - r) / df + 2; else hue = (r - g) / df + 4;
      hist[Math.min(11, Math.floor(hue * 2))]++;
    }
    const cx = Math.min(2, Math.floor((i % S) / (S / 3))), cy = Math.min(2, Math.floor(Math.floor(i / S) / (S / 3))), cc = cell[cy * 3 + cx];
    cc[0] += r; cc[1] += g; cc[2] += b; cc[3]++;
  }
  const mean = gray.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(gray.reduce((a, b) => a + (b - mean) ** 2, 0) / n) || 1;
  const gArr = [];
  for (let y = 0; y < 16; y++) for (let xx = 0; xx < 16; xx++) { const k = y * 2 * S + xx * 2; gArr.push((gray[k] + gray[k + 1] + gray[k + S] + gray[k + S + 1] - 4 * mean) / (4 * sd)); }
  const gm = sum.map(v => v / n), cArr = [];
  for (const cc of cell) for (let k = 0; k < 3; k++) cArr.push((cc[k] / cc[3] - gm[k]) / 255);
  const r2 = a => a.map(v => Math.round(v * 100) / 100);
  return { g: r2(gArr), h: r2(hist.map(v => v / n)), c: r2(cArr) };
}
const rms = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2; return Math.sqrt(s / a.length); };
const l1 = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / 2; };
const distance = (a, b) => .35 * rms(a.g, b.g) + 1.2 * l1(a.h, b.h) + 2 * rms(a.c, b.c);
let samples = store.get('samples', []);
function classify(canvas) {
  const q = extract(canvas, .72), best = new Map();
  for (const s of samples) for (const v of s.v) { const d = distance(q, v); if (!best.has(s.id) || d < best.get(s.id)) best.set(s.id, d); }
  return [...best].map(([id, d]) => ({ id, d })).sort((a, b) => a.d - b.d);
}
function confidence(r) {
  if (!r.length) return 'none';
  if (r.length === 1) return r[0].d < .45 ? 'mid' : 'low';
  const margin = (r[1].d - r[0].d) / r[1].d;
  if (margin > .3 && r[0].d < .6) return 'high';
  if (margin > .12 && r[0].d < .8) return 'mid';
  return 'low';
}
function showScan(canvas) {
  const box = $('scanResult'), list = $('scanList'); box.classList.remove('hidden');
  if (!samples.length) {
    $('scanTitle').textContent = 'Пока нечего сравнивать';
    list.replaceChildren(h('p', { class: 'sub' }, 'Добавь фото коробок во вкладке «Обучение» — или выбери товар вручную.'), h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => tab('learn') }, 'Перейти к обучению')));
    return;
  }
  const res = classify(canvas), conf = confidence(res), top = res.slice(0, 3);
  $('scanTitle').textContent = { high: 'Скорее всего это…', mid: 'Возможно, это…', low: 'Не уверен. Проверь:' }[conf];
  list.replaceChildren(...top.map((r, i) => { const p = product(r.id);
    return h('div', { class: 'cand' }, tile(p, true), h('div', { class: 'grow' }, h('div', { class: 'name' }, p.name), h('div', { class: 'price sub' }, fmt(p.price)), i === 0 ? h('span', { class: 'tag ' + (conf === 'high' ? 'good' : 'warn') }, conf === 'high' ? 'лучшее совпадение' : 'проверь вручную') : null),
      h('button', { class: 'btn sm' + (i ? ' gray' : ''), onclick: () => addToCart(p.id) }, 'В корзину'));
  }));
  $('scanMsg').textContent = 'Сравнили с ' + samples.length + ' фото. Это приблизительное локальное распознавание, подтверди товар.';
}
const scanCam = makeCamera($('scanCam'), $('scanVideo'), $('scanPh'), $('scanStart'), $('scanSnap'), t => { $('scanMsg').textContent = t; });
$('scanSnap').onclick = () => { const c = scanCam.grab(); if (c) showScan(c); };
$('scanFileBtn').onclick = () => $('scanFile').click();
$('scanFile').onchange = async e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return; try { showScan(await canvasFromFile(f)); } catch (err) { $('scanMsg').textContent = err.message; } };
$('scanManual').onclick = () => tab('catalog');

/* ---------- Обучение ---------- */
function thumb(canvas) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const sw = canvas.width * .72, sh = canvas.height * .72;
  c.getContext('2d').drawImage(canvas, (canvas.width - sw) / 2, (canvas.height - sh) / 2, sw, sh, 0, 0, 64, 64); return c.toDataURL('image/jpeg', .6);
}
function learnAdd(canvas, id) {
  const s = { id, t: Date.now(), th: thumb(canvas), v: [extract(canvas, .72), extract(canvas, .6), extract(canvas, .85)] };
  samples.push(s);
  if (!store.set('samples', samples)) { samples.pop(); $('learnMsg').textContent = 'Память устройства заполнена: удали часть образцов.'; return false; }
  return true;
}
function renderLearn() {
  const sel = $('learnSelect'), cur = sel.value;
  sel.replaceChildren(...PRODUCTS.map(p => { const n = samples.filter(s => s.id === p.id).length; return h('option', { value: p.id }, (n ? '✓ ' : '') + p.name + (n ? ' (' + n + ')' : '')); }));
  if (cur) sel.value = cur;
  const done = new Set(samples.map(s => s.id)).size;
  $('learnProgress').textContent = 'Обучено ' + done + ' из 16'; $('learnBar').style.width = (done / 16 * 100) + '%';
  $('trainedBadge').textContent = done + ' из 16'; $('learnCount').textContent = samples.length + ' фото';
  const rows = PRODUCTS.filter(p => samples.some(s => s.id === p.id)).map(p => {
    const ss = samples.filter(s => s.id === p.id);
    return h('div', { class: 'item' }, h('div', { class: 'grow' }, h('div', { class: 'name' }, p.name), h('div', { class: 'sub' }, ss.length + ' фото'), h('div', { class: 'chips', style: 'margin-top:6px' }, ss.slice(0, 6).map(s => h('img', { class: 'photo', src: s.th, alt: '' })))),
      h('button', { class: 'btn red sm', onclick: () => { samples = samples.filter(s => s.id !== p.id); store.set('samples', samples); renderLearn(); } }, 'Удалить'));
  });
  $('trained').replaceChildren(...(rows.length ? rows : [h('p', { class: 'sub' }, 'Пока нет образцов. Выбери коробку и сфотографируй её.')]));
}
const learnCam = makeCamera($('learnCam'), $('learnVideo'), $('learnPh'), $('learnStart'), $('learnSnap'), t => { $('learnMsg').textContent = t; });
$('learnSnap').onclick = () => { const c = learnCam.grab(); if (!c) return; const id = Number($('learnSelect').value); if (learnAdd(c, id)) { protectStorage(); $('learnMsg').textContent = 'Добавлено: ' + product(id).name + ' ✓ Сними ещё с другого угла.'; renderLearn(); } };
$('learnFileBtn').onclick = () => $('learnFile').click();
$('learnFile').onchange = async e => {
  const files = [...(e.target.files || [])]; e.target.value = ''; const id = Number($('learnSelect').value); let ok = 0;
  for (const f of files) { try { if (learnAdd(await canvasFromFile(f), id)) ok++; } catch (err) { $('learnMsg').textContent = err.message; } }
  if (ok) { protectStorage(); $('learnMsg').textContent = 'Добавлено фото: ' + ok + ' для «' + product(id).name + '» ✓'; renderLearn(); }
};
$('resetTraining').onclick = () => { if (samples.length && confirm('Удалить все образцы?')) { samples = []; store.set('samples', samples); renderLearn(); } };

/* ---------- Пошаговое обучение iPhone, защита и резервная копия ---------- */
const IPHONES = PRODUCTS.filter(p => p.cat === 'iPhone');
let guideIdx = -1;
function renderGuide() {
  const on = guideIdx >= 0; $('guideBody').classList.toggle('hidden', !on); $('guideToggle').textContent = on ? 'Закрыть' : 'Начать';
  if (!on) return;
  const p = IPHONES[guideIdx], n = samples.filter(s => s.id === p.id).length;
  $('learnSelect').value = p.id; $('guideBar').style.width = ((guideIdx + 1) / IPHONES.length * 100) + '%';
  $('guideText').textContent = 'Шаг ' + (guideIdx + 1) + ' из ' + IPHONES.length + ': ' + p.name + (n ? ' · фото: ' + n : ' · пока нет фото') + '. Добавь 2–3 фото коробки (камера или галерея), затем «Далее».';
  $('guideNext').textContent = guideIdx === IPHONES.length - 1 ? 'Готово ✓' : 'Далее →'; $('guidePrev').disabled = guideIdx === 0;
}
$('guideToggle').onclick = () => { guideIdx = guideIdx >= 0 ? -1 : 0; renderGuide(); };
$('guideNext').onclick = () => { if (guideIdx >= IPHONES.length - 1) { guideIdx = -1; toast('Обучение iPhone завершено'); } else guideIdx++; renderGuide(); };
$('guidePrev').onclick = () => { if (guideIdx > 0) guideIdx--; renderGuide(); };
$('learnSelect').addEventListener('change', () => { if (guideIdx >= 0) { const i = IPHONES.findIndex(p => p.id === Number($('learnSelect').value)); if (i >= 0) guideIdx = i; renderGuide(); } });
const _renderLearn = renderLearn; renderLearn = function () { _renderLearn(); if (guideIdx >= 0) renderGuide(); };
async function protectStorage() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const ok = await navigator.storage.persist();
      $('persistNote').textContent = ok ? 'Хранилище защищено: браузер не должен стирать образцы сам. Всё равно сделай копию в файл.' : 'Образцы сохраняются автоматически. Safari может стереть данные сайта, если не открывать его долго: поставь приложение «На экран Домой» и сохрани копию в файл.';
    }
  } catch {}
}
$('exportTraining').onclick = () => {
  if (!samples.length) return toast('Пока нечего сохранять');
  const blob = new Blob([JSON.stringify({ app: 'mini-store', v: 3, samples })], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: 'mini-store-training.json' }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('Файл обучения сохранён');
};
$('importTrainingBtn').onclick = () => $('importTraining').click();
$('importTraining').onchange = async e => {
  const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const d = JSON.parse(await f.text()); const list = Array.isArray(d.samples) ? d.samples : [];
    const ok = list.filter(s => product(s.id) && Array.isArray(s.v) && s.v.every(v => v && v.g && v.g.length === 256 && v.h && v.h.length === 16 && v.c && v.c.length === 27));
    if (!ok.length) return toast('В файле нет подходящих образцов');
    const have = new Set(samples.map(s => s.t + ':' + s.id)); let added = 0;
    for (const s of ok) if (!have.has(s.t + ':' + s.id)) { samples.push({ id: s.id, t: s.t, th: typeof s.th === 'string' ? s.th : '', v: s.v }); added++; }
    if (!store.set('samples', samples)) toast('Не хватило места на устройстве'); else toast('Загружено образцов: ' + added);
    renderLearn();
  } catch { toast('Не удалось прочитать файл'); }
};
// Встроенные образцы: если рядом лежит seed/seed.json, они добавляются автоматически (один раз).
fetch('seed/seed.json').then(r => (r.ok ? r.json() : null)).then(d => {
  if (!d || !Array.isArray(d.samples) || store.get('seedV', 0) >= (d.version || 1)) return;
  const have = new Set(samples.map(s => s.t + ':' + s.id));
  for (const s of d.samples) if (product(s.id) && !have.has(s.t + ':' + s.id)) samples.push(s);
  store.set('samples', samples); store.set('seedV', d.version || 1); renderLearn();
}).catch(() => {});

/* ---------- Бесплатный консультант (правила + прайс) ---------- */
const norm = s => String(s).toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const SYN = { айфон: 'iphone', айфона: 'iphone', айфоны: 'iphone', айфонов: 'iphone', айфоне: 'iphone', айфону: 'iphone', эпл: 'apple', эппл: 'apple', эйрподс: 'airpods', аирподс: 'airpods', эирподс: 'airpods', эйрподсы: 'airpods', аирподсы: 'airpods', наушники: 'airpods', айпад: 'ipad', айпады: 'ipad', айпада: 'ipad', макбук: 'macbook', макбука: 'macbook', про: 'pro', макс: 'max', эйр: 'air', аир: 'air', синий: 'blue', синяя: 'blue', синего: 'blue', голубой: 'blue', розовый: 'pink', розовая: 'pink', розового: 'pink', оранжевый: 'orange', оранжевая: 'orange', оранжевого: 'orange', вотч: 'watch', часы: 'watch', часов: 'watch', икс: 'xs', адаптер: 'adapter', блок: 'adapter', зарядка: 'adapter', зарядник: 'adapter', питания: 'power', карандаш: 'pencil', пенсил: 'pencil', пенсел: 'pencil', двенадцать: '12', тринадцать: '13', пятнадцать: '15', семнадцать: '17' };
const QTY_WORDS = { один: 1, одну: 1, одна: 1, два: 2, две: 2, три: 3, четыре: 4, пять: 5, шесть: 6, семь: 7, восемь: 8, девять: 9 };
function tokens(s) {
  const t = norm(s).split(' ').filter(Boolean).map(w => (w in SYN ? SYN[w] : w));
  return t.map((w, i) => (t[i - 1] === 'iphone' && w in QTY_WORDS ? String(QTY_WORDS[w]) : w));
}
const PT = PRODUCTS.map(p => ({ p, set: new Set(tokens(p.name)) }));
const VOCAB = new Set(PT.flatMap(x => [...x.set]));
function matchTokens(toks) {
  const m = new Set(toks.filter(t => VOCAB.has(t) && t !== 'apple'));
  if (!m.size) return [];
  if (m.size === 1 && m.has('iphone')) return PRODUCTS.filter(p => p.cat === 'iPhone');
  let best = -1e9, res = [];
  for (const { p, set } of PT) {
    let hit = 0, miss = 0, extra = 0;
    for (const t of set) (m.has(t) ? hit++ : miss++);
    for (const t of m) if (!set.has(t)) extra++;
    if (!hit) continue;
    const s = hit - .4 * miss - 1.1 * extra;
    if (s > best + 1e-9) { best = s; res = [p]; } else if (Math.abs(s - best) < 1e-9) res.push(p);
  }
  return best > 0 ? res : [];
}
// Разбор одного фрагмента: товары + количество
function parseSegment(seg) {
  let q = norm(seg), qty = 1, explicit = false, m;
  if ((m = q.match(/(\d+)\s*(?:шт[а-яa-z]*)/))) { qty = +m[1]; explicit = true; q = q.replace(m[0], ' '); }
  else if ((m = q.match(/(?:^|\s)[xх]\s*(\d+)(?=\s|$)/)) || (m = q.match(/(\d+)\s*[xх](?=\s|$)/))) { qty = +m[1]; explicit = true; q = q.replace(m[0], ' '); }
  let toks = tokens(q);
  toks = toks.filter((w, i) => {
    if (w in QTY_WORDS) { if (!explicit) { qty = QTY_WORDS[w]; explicit = true; } return false; }
    if (/^\d+$/.test(w)) {
      const model = toks[i - 1] === 'iphone' || (VOCAB.has(w) && ['pro', 'max', 'blue', 'pink', 'orange'].includes(toks[i + 1]));
      if (!model) { if (!explicit) { qty = +w; explicit = true; } return false; }
    }
    return true;
  });
  return { items: matchTokens(toks), qty: Math.max(1, Math.min(99, qty)), explicit };
}
const names = list => list.map(p => p.name).join(', ');
function cartText() {
  const ids = Object.keys(cart); if (!ids.length) return 'Корзина пуста.';
  return ids.map(id => '• ' + product(id).name + (cart[id] > 1 ? ' × ' + cart[id] : '') + ' — ' + fmt(product(id).price * cart[id])).join('\n') + '\nИтого: ' + fmt(cartTotal()) + '.';
}
function changeText() {
  const t = cartTotal(); if (!t) return 'Корзина пуста, считать нечего.';
  if (!cashRaw) return 'К оплате ' + fmt(t) + '. Скажи или напиши, сколько дал покупатель.';
  const d = Number(cashRaw) - t;
  return d < 0 ? 'К оплате ' + fmt(t) + '. Не хватает ' + fmt(-d) + '.' : 'К оплате ' + fmt(t) + ', дали ' + fmt(Number(cashRaw)) + '. Сдача ' + fmt(d) + (d ? ' (' + breakdown(d).map(([a, k]) => fmtNum(a) + '×' + k).join(', ') + ')' : '') + '.';
}
function budgetText(b) {
  const ok = PRODUCTS.filter(p => p.price <= b).sort((a, c) => c.price - a.price);
  if (!ok.length) return 'На ' + fmt(b) + ' ничего не хватает: самый дешёвый товар — ' + cheapest().name + ' за ' + fmt(cheapest().price) + '.';
  const first = ok[0], rest = b - first.price, second = PRODUCTS.filter(p => p.price <= rest).sort((a, c) => c.price - a.price)[0];
  return 'На ' + fmt(b) + ' хватит на ' + ok.length + ' ' + (ok.length === 1 ? 'товар' : 'товаров') + '. Самый дорогой из них: ' + first.name + ' (' + fmt(first.price) + ').' +
    (second ? '\nОстаток ' + fmt(rest) + ' — можно добавить ' + second.name + ' (' + fmt(second.price) + ').' : '') + '\n\nВсё подходящее: ' + ok.map(p => p.name).join(', ') + '.';
}
const cheapest = () => [...PRODUCTS].sort((a, b) => a.price - b.price)[0];
function handleChat(text) {
  const q = norm(text), money = parseRuNumber(text);
  const toks = tokens(text).filter((w, i, a) => !/^\d+$/.test(w) || a[i - 1] === 'iphone' || ['pro', 'blue', 'pink', 'orange', 'max'].includes(a[i + 1]));
  if (!q) return 'Напиши, что нужно: цену, добавить товар или посчитать сдачу.';
  if (/^(привет|здравствуй|добрый|хай|hello|hi)/.test(q)) return 'Привет! Я консультант Mini Store. Спроси цену, скажи «добавь AirPods Pro» или «какая сдача?».';
  if (/спасибо|благодар/.test(q)) return 'Пожалуйста! Обращайся 🙂';
  if (/помощ|что умеешь|что ты умеешь|команд|как пользоват/.test(q)) return 'Умею:\n• называть цены: «сколько стоит iPad Air?»\n• собирать корзину: «добавь 2 AirPods и iPhone 13 Pink», «убери iPad»\n• считать: «что в корзине?», «покупатель дал двадцать тысяч»\n• подбирать по бюджету: «что купить на 15000?»\n• сравнивать: «сравни AirPods и AirPods Pro»\n• искать: «самый дешёвый iPhone»';
  if (/очист[а-яa-z]* корзин|удали все|убери все|опустош/.test(q)) { clearCart(); setCash(0); return 'Корзина очищена.'; }

  const compare = /сравни|разниц|что лучше|что дороже|что дешевле/.test(q);
  if (compare) {
    const parts = text.split(/\s(?:и|или|vs|против|с)\s|,/i).map(s => matchTokens(tokens(s))[0]).filter(Boolean);
    const u = [...new Set(parts)];
    if (u.length >= 2) { const [a, b] = u, d = Math.abs(a.price - b.price);
      return a.name + ' — ' + fmt(a.price) + '\n' + b.name + ' — ' + fmt(b.price) + '\n' + (d ? (a.price > b.price ? a.name : b.name) + ' дороже на ' + fmt(d) + '.' : 'Цены одинаковые.'); }
  }

  // оплата: «покупатель дал 20000»
  const payM = /(^| )(дал|дали|дает|оплат[а-яa-z]*|внес[а-яa-z]*|наличн[а-яa-z]*|получил[а-яa-z]*)( |$)/.test(q) && money != null && !/добав|полож|купи/.test(q);
  if (payM) { setCash(money); return changeText(); }

  const adding = /(^| )(добав[а-яa-z]*|полож[а-яa-z]*|купи[а-яa-z]*|возьм[а-яa-z]*|закаж[а-яa-z]*|хочу|нужен|нужна|нужно|пробей[а-яa-z]*|пробить)( |$)/.test(q) || (/ в корзин/.test(' ' + q) && !/(^| )(что|сколько|покаж[а-яa-z]*|есть|лежит|там)( |$)/.test(q));
  const removing = /(^| )(убер[а-яa-z]*|удал[а-яa-z]*|минус|вычеркн[а-яa-z]*|выброс[а-яa-z]*)( |$)/.test(q);
  if (adding || removing) {
    const parts = text.split(/,|;|\s+и\s+|\s+плюс\s+|\s+потом\s+|\s+еще\s+|\s+ещё\s+/i).map(parseSegment).filter(s => s.items.length);
    if (!parts.length) return 'Не нашёл такой товар. Напиши «каталог», чтобы увидеть весь список.';
    const done = [], ask = [];
    for (const s of parts) {
      if (s.items.length > 1) { ask.push(s.items); continue; }
      const p = s.items[0];
      if (removing && !adding) { if (!cart[p.id]) continue; if (s.explicit) addToCart(p.id, -s.qty, true); else setQty(p.id, 0); done.push(p.name); }
      else { addToCart(p.id, s.qty, true); done.push(p.name + ' × ' + s.qty); }
    }
    let r = done.length ? (removing && !adding ? 'Убрал: ' : 'Добавил: ') + done.join(', ') + '.\nИтого: ' + fmt(cartTotal()) + '.' : (removing && !adding ? 'Этого нет в корзине.' : '');
    if (ask.length) r += (r ? '\n\n' : '') + 'Уточни, какой именно: ' + names(ask[0]) + '.';
    return r;
  }

  const items = matchTokens(toks);
  if (/хватит|хватает|могу позволить|сможет/.test(q) && items.length && money != null ) {
    const p = items[0]; return money >= p.price ? 'Да, ' + p.name + ' (' + fmt(p.price) + ') укладывается в ' + fmt(money) + ', останется ' + fmt(money - p.price) + '.' : 'Нет, не хватает ' + fmt(p.price - money) + ' до ' + p.name + ' (' + fmt(p.price) + ').';
  }
  if (!items.length && money != null && /(что|купить|можно|хватит|посоветуй|бюджет|есть|имею|осталось|подбери)/.test(q)) return budgetText(money);
  if (/дешев|недорог|подешевле|бюджетн/.test(q) || /дорог|максим|подороже/.test(q) || /самый/.test(q)) {
    const max = /дорог|максим|подороже/.test(q) && !/недорог/.test(q);
    let list = PRODUCTS, label = 'товар';
    if (items.length) { list = items; label = items.length > 1 && items.every(i => i.cat === items[0].cat) ? items[0].cat : 'из выбранных'; } else if (/iphone|айфон/.test(q)) { list = PRODUCTS.filter(p => p.cat === 'iPhone'); label = 'iPhone'; }
    else if (/ipad|айпад/.test(q)) { list = PRODUCTS.filter(p => p.cat === 'iPad'); label = 'iPad'; }
    const p = [...list].sort((a, b) => max ? b.price - a.price : a.price - b.price)[0];
    return (max ? 'Самый дорогой ' : 'Самый дешёвый ') + label + ': ' + p.name + ' — ' + fmt(p.price) + '.';
  }
  if (/корзин|касс|итог|сдач|к оплате|сколько всего|чек/.test(q) && !items.length) return /сдач|оплат|дал/.test(q) ? changeText() : cartText();
  if (/посоветуй|рекоменд|подбери|что взять|что выбрать/.test(q)) {
    const a = product(3), b = product(8), c = product(10);
    return 'Недорогой набор: ' + a.name + ' + ' + b.name + ' + ' + c.name + ' = ' + fmt(a.price + b.price + c.price) + '.\nХочешь точнее — назови бюджет: «что купить на 20000?»';
  }
  if (items.length) {
    if (/сколько|цена|стоит|почем|по чем|за сколько|прайс|\?/.test(q) || items.length) return items.map(p => p.name + ' — ' + fmt(p.price)).join('\n') + '.\nСкажи «добавь», чтобы положить в корзину.';
  }
  if (/каталог|прайс|список|все товар|что есть|ассортимент/.test(q)) return PRODUCTS.map(p => p.name + ' — ' + fmt(p.price)).join('\n');
  return 'Не совсем понял. Попробуй: «Сколько стоит iPad Air?», «Добавь AirPods Pro», «Что купить на 15000?» или «Какая сдача?». Напиши «помощь» — расскажу всё.';
}
function bubble(text, who) { const log = $('chatLog'); log.append(h('div', { class: 'bubble ' + (who || 'ai') }, text)); log.scrollTop = log.scrollHeight; }
function sendChat(text) {
  text = String(text).trim(); if (!text) return;
  bubble(text, 'me'); $('chatInput').value = '';
  let ans; try { ans = handleChat(text); } catch (e) { ans = 'Что-то пошло не так. Попробуй сказать иначе.'; }
  bubble(ans); speak(ans);
}
$('send').onclick = () => sendChat($('chatInput').value);
$('chatInput').addEventListener('keydown', e => { if (e.key === 'Enter') sendChat($('chatInput').value); });
$('suggest').replaceChildren(...['Сколько стоит iPad Air?', 'Добавь AirPods Pro', 'Что купить на 15000?', 'Самый дешёвый iPhone', 'Что в корзине?', 'Помощь'].map(t => h('button', { class: 'chip', onclick: () => sendChat(t) }, t)));

/* ---------- Голос браузера (с запасным ручным вводом) ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let voiceOn = store.get('voice', false), rec = null, recBtn = null;
const canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
function speak(text) {
  if (!voiceOn || !canSpeak) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text).replace(/₽/g, ' рублей').replace(/[•\n]+/g, '. ').replace(/[^\p{L}\p{N}\s.,!?:%+-]/gu, ' '));
    u.lang = 'ru-RU'; const v = speechSynthesis.getVoices().find(x => /^ru/i.test(x.lang)); if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch {}
}
function renderVoice() { $('speakToggle').textContent = '🔈 Ответы голосом: ' + (voiceOn ? 'вкл' : 'выкл'); }
function listen(btn, onText) {
  if (rec) { try { rec.stop(); } catch {} return; }
  const r = new SR(); rec = r; recBtn = btn; r.lang = 'ru-RU'; r.interimResults = false; r.maxAlternatives = 1;
  r.onresult = e => { const t = e.results[0][0].transcript; onText(t); };
  r.onerror = e => {
    const m = { 'not-allowed': 'Нет доступа к микрофону. Разреши его в настройках или печатай вручную.', 'service-not-allowed': 'Голосовой ввод выключен. На iPhone включи «Диктовку»: Настройки → Основные → Клавиатура. Или печатай вручную.', 'no-speech': 'Ничего не услышал. Попробуй ещё раз.', 'network': 'Для распознавания речи нужен интернет. Введи вручную.' };
    toast(m[e.error] || 'Голосовой ввод недоступен. Введи вручную.');
  };
  r.onend = () => { rec = null; if (recBtn) recBtn.classList.remove('rec'); recBtn = null; };
  try { r.start(); btn.classList.add('rec'); toast('Говори…'); } catch { rec = null; toast('Голосовой ввод недоступен. Введи вручную.'); }
}
$('speakToggle').onclick = () => { voiceOn = !voiceOn; store.set('voice', voiceOn); renderVoice(); if (voiceOn) speak('Голос включён'); else if (canSpeak) speechSynthesis.cancel(); };
$('mic').onclick = () => listen($('mic'), t => sendChat(t));
$('cashMic').onclick = () => listen($('cashMic'), t => { const n = parseRuNumber(t); if (n == null) return toast('Не расслышал сумму. Введи цифрами.'); setCash(n); toast('Сумма: ' + fmt(n)); speak(changeText()); });
function initVoiceUi() {
  const notes = [];
  if (!SR) { $('mic').classList.add('hidden'); $('cashMic').classList.add('hidden'); notes.push('Голосовой ввод в этом браузере недоступен — просто печатай.'); }
  if (!canSpeak) { $('speakToggle').classList.add('hidden'); notes.push('Озвучка ответов недоступна — читай ответы на экране.'); }
  if (SR || canSpeak) notes.push('Голос работает через встроенные функции браузера. На iPhone лучше всего в Safari; в режиме «На экран Домой» микрофон может быть недоступен.');
  $('voiceNote').textContent = notes.join(' ');
}

/* ---------- Навигация и запуск ---------- */
function tab(page) {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.page === page));
  ['scan', 'catalog', 'cart', 'chat', 'learn'].forEach(p => $('page-' + p).classList.toggle('hidden', p !== page));
  if (page !== 'scan') scanCam.stop(); if (page !== 'learn') learnCam.stop();
  if (page === 'cart') renderCart(); if (page === 'learn') renderLearn(); if (page === 'catalog') renderCatalog();
  scrollTo(0, 0);
  try { history.replaceState(null, '', '#' + page); } catch {}
}
document.querySelectorAll('.tab').forEach(b => b.onclick = () => tab(b.dataset.page));
document.addEventListener('visibilitychange', () => { if (document.hidden) { scanCam.stop(); learnCam.stop(); } });

renderCats(); renderCatalog(); renderCart(); renderLearn(); renderVoice(); initVoiceUi();
bubble('Привет! Я бесплатный консультант Mini Store 👋 Спроси цену, скажи «добавь AirPods Pro» или «что купить на 15000?».');
const start = (location.hash || '').slice(1); if (['scan', 'catalog', 'cart', 'chat', 'learn'].includes(start)) tab(start);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
