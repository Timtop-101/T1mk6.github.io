// Демо-режим: имитация Arduino, чтобы пробовать страницы без платы.
// DemoSerial.motor() — скетч мотора и датчика (пакеты @SEQ|КОМАНДА|XOR)
// DemoSerial.uno()   — простой скетч Uno (D13:1, P6:128, S10:90, поток A0:xxx)
// Возвращает объект, похожий на SerialPort: open(), close(), readable, writable.
(function () {
  var enc = new TextEncoder();
  var dec = new TextDecoder();
  function xor(s) { var x = 0; for (var i = 0; i < s.length; i++) x ^= s.charCodeAt(i); return x; }
  function hex2(n) { return n.toString(16).toUpperCase().padStart(2, '0'); }

  function makePort(onOpen, onLine, onClose) {
    var ctrl = null, closed = false, timers = [];
    var api = {
      send: function (text) { if (closed || !ctrl) return; try { ctrl.enqueue(enc.encode(text)); } catch (e) {} },
      every: function (ms, fn) { var id = setInterval(function () { if (!closed) fn(); }, ms); timers.push(id); return id; },
      after: function (ms, fn) { var id = setTimeout(function () { if (!closed) fn(); }, ms); timers.push(id); return id; }
    };
    function shutdown() {
      if (closed) return;
      closed = true;
      timers.forEach(function (id) { clearInterval(id); clearTimeout(id); });
      if (onClose) onClose();
    }
    var buf = '';
    return {
      isDemo: true,
      open: function () { onOpen(api); return Promise.resolve(); },
      close: function () { shutdown(); return Promise.resolve(); },
      readable: new ReadableStream({
        start: function (c) { ctrl = c; },
        cancel: function () { shutdown(); }
      }),
      writable: new WritableStream({
        write: function (chunk) {
          buf += dec.decode(chunk);
          var i;
          while ((i = buf.indexOf('\n')) >= 0) {
            var line = buf.slice(0, i).replace(/\r$/, '');
            buf = buf.slice(i + 1);
            if (line) onLine(api, line);
          }
        }
      })
    };
  }

  // ---------- мотор + DHT11 ----------
  function motor() {
    var st, frame;
    function out(api, marker, seq, msg) {
      var body = seq + '|' + msg;
      api.send(marker + body + '|' + hex2(xor(body)) + '\n');
    }
    return makePort(
      function (api) {
        st = { rem: 0, tot: 0, done: 0, dir: 1, seq: '0000', fault: false, interval: 14,
               lastHb: 0, started: 0, temp: 23.0, hum: 40, sensOk: false };
        api.after(600, function () { out(api, '!', '0000', 'ARDUINO READY 2.1.2-DEMO'); });
        // «шаги» — 1 демо-шаг = 6 реальных, чтобы оборот занимал несколько секунд
        var last = Date.now();
        api.every(50, function () {
          var now = Date.now(), dt = now - last; last = now;
          if (st.rem > 0) {
            if (now - st.started >= 90000) { st.rem = 0; st.fault = true; out(api, '!', st.seq, 'MOTOR TIMEOUT'); return; }
            if (now - st.lastHb >= 2500) { st.rem = 0; st.fault = true; out(api, '!', st.seq, 'MOTOR LINK LOST'); return; }
            var n = Math.min(st.rem, Math.max(1, Math.round(dt / st.interval * 6)));
            st.rem -= n; st.done += n;
            if (st.rem === 0) out(api, '!', st.seq, 'MOTOR DONE');
          }
        });
        // «датчик» медленно дрейфует
        api.every(3000, function () {
          if (st.rem > 0) return;
          st.temp += (Math.random() - 0.5) * 0.4; st.temp = Math.min(26, Math.max(21, st.temp));
          st.hum += (Math.random() - 0.5) * 1.2; st.hum = Math.min(48, Math.max(35, st.hum));
          st.sensOk = true;
        });
        api.after(1500, function () { st.sensOk = true; });
      },
      function (api, line) {
        var bar = line.lastIndexOf('|');
        if (line[0] !== '@' || bar < 6) return;
        var body = line.slice(1, bar);
        if (parseInt(line.slice(bar + 1), 16) !== xor(body)) return;
        var seq = body.slice(0, 4), cmd = body.slice(5);
        var a = function (m) { out(api, '@', seq, m); };
        if (cmd === 'PING') a('PONG');
        else if (cmd === 'KEEPALIVE') { st.lastHb = Date.now(); a('ALIVE'); }
        else if (cmd === 'STATUS') a(st.fault ? 'STATE FAULT' : st.rem > 0 ? 'STATE MOVING' : 'STATE IDLE');
        else if (cmd === 'SENSOR') {
          if (st.rem > 0) a('SENSOR PAUSED');
          else if (!st.sensOk) a('SENSOR WAIT');
          else a('SENSOR ' + Math.round(st.temp * 10) + ' ' + Math.round(st.hum * 10));
        }
        else if (cmd === 'PROGRESS')
          a('PROGRESS ' + (st.fault ? 'FAULT' : st.rem > 0 ? 'MOVING' : 'IDLE') + ' ' + st.done + ' ' + st.tot + ' ' + st.seq);
        else if (cmd === 'LED_ON') a('LED ON');
        else if (cmd === 'LED_OFF') a('LED OFF');
        else if (cmd === 'MOTOR_STOP') {
          var was = st.rem > 0; st.rem = 0; st.fault = false; a('MOTOR STOPPED');
          if (was) out(api, '!', st.seq, 'MOTOR STOPPED');
        }
        else if (cmd.indexOf('SPEED_') === 0) {
          var n = parseInt(cmd.slice(6), 10);
          if (!(n >= 1 && n <= 10)) a('INVALID SPEED');
          else if (st.fault) a('FAULT');
          else { st.interval = 20 - Math.floor((n - 1) * 15 / 9); a('SPEED SET ' + n); }
        }
        else if (/^MOVE_(FWD|REV)_/.test(cmd)) {
          var t = cmd.slice(9);
          if (!/^[1-3]$/.test(t)) a('INVALID ROTATIONS');
          else if (st.fault) a('FAULT');
          else if (st.rem > 0) a('BUSY');
          else {
            st.dir = cmd.indexOf('FWD') === 5 ? 1 : -1;
            st.tot = 2048 * parseInt(t, 10); st.rem = st.tot; st.done = 0;
            st.seq = seq; st.started = st.lastHb = Date.now();
            a((st.dir === 1 ? 'FORWARD ' : 'REVERSE ') + t + ' TURNS STARTED');
          }
        }
        else a('UNKNOWN COMMAND');
      }
    );
  }

  // ---------- простой Uno ----------
  function uno() {
    var a0 = 512, ph = 0;
    return makePort(
      function (api) {
        api.every(200, function () {
          ph += 0.12;
          a0 = Math.round(512 + 400 * Math.sin(ph) + (Math.random() - 0.5) * 24);
          a0 = Math.min(1023, Math.max(0, a0));
          api.send('A0:' + a0 + '\n');
        });
      },
      function () { /* команды D/P/S просто принимаются */ }
    );
  }

  window.DemoSerial = { motor: motor, uno: uno };
})();
