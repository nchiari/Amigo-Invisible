/* Página donde cada participante descubre a quién le regala */
(function () {
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);

  let data = null;
  if (params.has('demo')) {
    data = { g: 'Nancy', r: 'Rufi 🐶', e: 'Navidad en familia', b: '30 €', d: '' };
  } else {
    try { data = AI.decodeToken(params.get('t') || location.hash.slice(1)); } catch { data = null; }
  }

  // Copos de nieve
  const snow = document.querySelector('.snow');
  for (let i = 0; i < 18; i++) {
    const f = document.createElement('i');
    f.textContent = i % 3 ? '❄' : '✦';
    f.style.left = Math.random() * 100 + '%';
    f.style.animationDuration = 8 + Math.random() * 10 + 's';
    f.style.animationDelay = -Math.random() * 15 + 's';
    f.style.fontSize = 8 + Math.random() * 12 + 'px';
    snow.appendChild(f);
  }

  if (!data || !data.r) {
    $('gift').classList.add('hidden');
    $('tapHint').classList.add('hidden');
    $('hello').classList.add('hidden');
    $('error').classList.remove('hidden');
    return;
  }

  $('hello').textContent = `¡Hola, ${data.g}! 👋`;
  $('eventTitle').textContent = data.e || 'Amigo Invisible';
  $('receiver').textContent = data.r;
  const details = [
    data.b ? `<span>💶 ${AI.escapeHtml(data.b)}</span>` : '',
    data.d ? `<span>📅 ${AI.escapeHtml(AI.formatDate(data.d))}</span>` : ''
  ].join('');
  $('details').innerHTML = details;

  let opened = false;
  $('gift').addEventListener('click', () => {
    if (opened) return;
    opened = true;
    $('gift').classList.add('open');
    $('tapHint').classList.add('hidden');
    if (navigator.vibrate) navigator.vibrate([30, 40, 60]);
    setTimeout(() => {
      $('result').classList.remove('hidden');
      confetti();
    }, 650);
  });

  /* Confeti liviano en canvas, sin librerías */
  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = $('confetti');
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const colors = ['#e63946', '#2a9d8f', '#f4a261', '#e9c46a', '#ffffff', '#f4845f'];
    const bits = Array.from({ length: 140 }, () => ({
      x: innerWidth / 2, y: innerHeight * 0.4,
      vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4,
      s: 5 + Math.random() * 6, r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3, c: colors[Math.floor(Math.random() * colors.length)]
    }));
    let frames = 0;
    (function tick() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      bits.forEach(b => {
        b.vy += 0.35; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.r += b.vr;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r);
        ctx.fillStyle = b.c; ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2);
        ctx.restore();
      });
      if (++frames < 220) requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    })();
  }
})();
