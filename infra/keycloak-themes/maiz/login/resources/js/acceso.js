/*
 * Decoración del login de Keycloak (tema "maiz").
 * Agrega el fondo animado (partículas que forman maíz → almacén → engranaje → saco),
 * la marca, el lema y el saludo según la hora. No toca el formulario ni el inicio de sesión.
 */
(function () {
  'use strict';

  var ETAPAS = [
    { mod: 'COMPRAS', txt: 'Recibimos el maíz', col: ['#f2c94c', '#d4aa4d', '#8fcf8a'] },
    { mod: 'INVENTARIO', txt: 'Lo guardamos por lotes', col: ['#8fcf8a', '#cfe3d2', '#d4aa4d'] },
    { mod: 'PRODUCCIÓN', txt: 'Lo transformamos', col: ['#d4aa4d', '#f2c94c', '#cfe3d2'] },
    { mod: 'VENTAS', txt: 'Lo entregamos al cliente', col: ['#f3ead2', '#d4aa4d', '#8fcf8a'] },
  ];
  var N = 1500; // cantidad de partículas
  var quieto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function crear(tag, clase, html) {
    var el = document.createElement(tag);
    if (clase) el.className = clase;
    if (html) el.innerHTML = html;
    return el;
  }

  function saludo() {
    var h = new Date().getHours();
    return h < 12 ? 'BUENOS DÍAS' : h < 19 ? 'BUENAS TARDES' : 'BUENAS NOCHES';
  }

  function iniciar() {
    var body = document.body;

    // Decoración fija (detrás de la tarjeta)
    body.insertBefore(crear('div', 'maiz-blob b1'), body.firstChild);
    body.insertBefore(crear('div', 'maiz-blob b2'), body.firstChild);
    var lienzo = crear('canvas');
    lienzo.id = 'maiz-fondo';
    lienzo.setAttribute('aria-hidden', 'true');
    body.insertBefore(lienzo, body.firstChild);
    body.appendChild(crear('div', 'maiz-lema', '<small>PRODUCCIÓN Y COMERCIALIZACIÓN</small><h2>Una operación<br>conectada.</h2>'));
    var etapa = crear('div', 'maiz-etapa', '<small></small><strong></strong><div class="maiz-puntos"></div>');
    etapa.setAttribute('aria-hidden', 'true');
    body.appendChild(etapa);
    body.appendChild(crear('div', 'maiz-pie', '© ' + new Date().getFullYear() + ' Maíz ERP'));

    // Saludo dentro de la tarjeta, encima del título
    var cabecera = document.querySelector('.pf-v5-c-login__main-header');
    if (cabecera) cabecera.insertBefore(crear('div', 'maiz-saludo', '<i></i><span>' + saludo() + '</span>'), cabecera.firstChild);

    animar(lienzo, etapa);
  }

  function animar(c, etapa) {
    var x = c.getContext('2d');
    if (!x) return;
    var W, H, cx, cy, s, cur = 0, parts = [], stars = [], shapes = [];
    var mouse = { x: -9999, y: -9999 };

    // Dibuja la figura de cada etapa en blanco; luego se toman sus puntos como destino.
    function dibujar(k, g) {
      g.fillStyle = '#fff';
      if (k === 0) { // mazorca
        g.beginPath(); g.ellipse(cx, cy, 48 * s, 120 * s, 0, 0, 7); g.fill();
        g.beginPath(); g.moveTo(cx - 10 * s, cy + 100 * s); g.quadraticCurveTo(cx - 95 * s, cy + 20 * s, cx - 70 * s, cy - 110 * s); g.quadraticCurveTo(cx - 40 * s, cy - 10 * s, cx - 6 * s, cy + 60 * s); g.fill();
        g.beginPath(); g.moveTo(cx + 10 * s, cy + 100 * s); g.quadraticCurveTo(cx + 100 * s, cy + 30 * s, cx + 80 * s, cy - 90 * s); g.quadraticCurveTo(cx + 45 * s, cy, cx + 6 * s, cy + 60 * s); g.fill();
        g.fillRect(cx - 8 * s, cy + 110 * s, 16 * s, 40 * s);
      }
      if (k === 1) { // almacén
        g.beginPath(); g.moveTo(cx - 130 * s, cy - 20 * s); g.lineTo(cx, cy - 110 * s); g.lineTo(cx + 130 * s, cy - 20 * s); g.closePath(); g.fill();
        g.fillRect(cx - 115 * s, cy - 20 * s, 230 * s, 140 * s);
        g.globalCompositeOperation = 'destination-out';
        g.fillRect(cx - 40 * s, cy + 30 * s, 80 * s, 90 * s); g.fillRect(cx - 95 * s, cy + 5 * s, 35 * s, 30 * s); g.fillRect(cx + 60 * s, cy + 5 * s, 35 * s, 30 * s);
        g.globalCompositeOperation = 'source-over';
        for (var i = 0; i < 4; i++) g.fillRect(cx - 40 * s, cy + 38 * s + i * 22 * s, 80 * s, 5 * s);
      }
      if (k === 2) { // engranaje
        var R = 95 * s, r = 72 * s, T = 10;
        g.beginPath();
        for (var j = 0; j < T * 2; j++) g.arc(cx, cy, j % 2 ? r : R, j * Math.PI / T, (j + 1) * Math.PI / T);
        g.closePath(); g.fill();
        g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(cx, cy, 32 * s, 0, 7); g.fill();
        g.globalCompositeOperation = 'source-over';
      }
      if (k === 3) { // saco con la marca
        g.beginPath(); g.moveTo(cx - 35 * s, cy - 95 * s); g.lineTo(cx + 35 * s, cy - 95 * s); g.quadraticCurveTo(cx + 20 * s, cy - 70 * s, cx + 30 * s, cy - 60 * s);
        g.bezierCurveTo(cx + 120 * s, cy - 30 * s, cx + 115 * s, cy + 120 * s, cx, cy + 125 * s); g.bezierCurveTo(cx - 115 * s, cy + 120 * s, cx - 120 * s, cy - 30 * s, cx - 30 * s, cy - 60 * s);
        g.quadraticCurveTo(cx - 20 * s, cy - 70 * s, cx - 35 * s, cy - 95 * s); g.fill();
        g.globalCompositeOperation = 'destination-out'; g.fillRect(cx - 40 * s, cy - 72 * s, 80 * s, 7 * s);
        g.font = 'bold ' + 54 * s + 'px Segoe UI, sans-serif'; g.textAlign = 'center'; g.fillText('M', cx, cy + 50 * s);
        g.globalCompositeOperation = 'source-over';
      }
    }

    function muestrear(k) {
      var o = document.createElement('canvas'); o.width = W; o.height = H;
      var g = o.getContext('2d'); dibujar(k, g);
      var d = g.getImageData(0, 0, W, H).data, pts = [], paso = 3;
      for (var y = 0; y < H; y += paso) for (var xx = 0; xx < W; xx += paso) if (d[(y * W + xx) * 4 + 3] > 128) pts.push([xx, y]);
      for (var i = pts.length - 1; i > 0; i--) { var j = Math.random() * (i + 1) | 0, t = pts[i]; pts[i] = pts[j]; pts[j] = t; }
      if (!pts.length) pts.push([cx, cy]);
      var res = []; for (var n = 0; n < N; n++) res.push(pts[n % pts.length]);
      return res;
    }

    function textoEtapa() {
      etapa.querySelector('small').textContent = ETAPAS[cur].mod;
      etapa.querySelector('strong').textContent = ETAPAS[cur].txt;
      etapa.querySelector('.maiz-puntos').innerHTML = ETAPAS.map(function (_, i) { return '<i class="' + (i === cur ? 'on' : '') + '"></i>'; }).join('');
    }

    function preparar() {
      W = c.width = innerWidth; H = c.height = innerHeight;
      s = Math.min(W, H) / 560; cx = W < 800 ? W / 2 : W * 0.27; cy = H * 0.40;
      shapes = ETAPAS.map(function (_, k) { return muestrear(k); });
      if (!parts.length) for (var i = 0; i < N; i++) parts.push({ x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0, r: Math.random() * 1.1 + 0.7, c: Math.random() * 3 | 0 });
      stars = []; for (var k = 0; k < 120; k++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.3, a: Math.random() });
      etapa.style.left = (cx - 150) + 'px'; etapa.style.top = (cy + 160 * s) + 'px';
      etapa.style.display = W < 800 ? 'none' : '';
      textoEtapa();
      if (quieto) { // sin animación: las partículas quedan directamente en la figura
        parts.forEach(function (p, i) { p.x = shapes[cur][i][0]; p.y = shapes[cur][i][1]; });
        pintar();
      }
    }

    function cambiar() {
      cur = (cur + 1) % ETAPAS.length; etapa.style.opacity = 0;
      parts.forEach(function (p) { p.vx += (Math.random() - .5) * 14; p.vy += (Math.random() - .5) * 14; });
      setTimeout(function () { textoEtapa(); etapa.style.opacity = 1; }, 450);
    }

    function pintar() {
      x.clearRect(0, 0, W, H);
      stars.forEach(function (st) {
        st.a += 0.01; x.globalAlpha = 0.3 + 0.3 * Math.sin(st.a * 3); x.fillStyle = '#fff';
        x.beginPath(); x.arc(st.x, st.y, st.r, 0, 6.28); x.fill();
      });
      var cols = ETAPAS[cur].col;
      x.globalAlpha = W < 800 ? 0.35 : 0.85; // en celular la figura queda detrás de la tarjeta, más tenue
      parts.forEach(function (p) { x.fillStyle = cols[p.c]; x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.28); x.fill(); });
      x.globalAlpha = 1;
    }

    function cuadro() {
      var R = 90, tg = shapes[cur];
      for (var i = 0; i < N; i++) {
        var p = parts[i], t = tg[i], dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < R * R) { var d = Math.sqrt(d2) || 1, f = (R - d) / R * 6; p.vx += dx / d * f; p.vy += dy / d * f; } // el mouse las aparta
        p.vx += (t[0] - p.x) * 0.018; p.vy += (t[1] - p.y) * 0.018; p.vx *= 0.88; p.vy *= 0.88; p.x += p.vx; p.y += p.vy;
      }
      pintar();
      requestAnimationFrame(cuadro);
    }

    addEventListener('resize', preparar);
    preparar();
    if (quieto) return;
    addEventListener('mousemove', function (ev) { mouse.x = ev.clientX; mouse.y = ev.clientY; });
    document.addEventListener('mouseleave', function () { mouse.x = mouse.y = -9999; });
    setInterval(cambiar, 4500);
    requestAnimationFrame(cuadro);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
