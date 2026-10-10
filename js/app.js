/* Panel del organizador */
(function () {
  const $ = id => document.getElementById(id);
  const STORE = 'amigo-invisible-v1';
  const EMOJIS = ['🎁', '🎄', '🎅', '🤶', '⛄', '❄️', '✨', '🎉', '🥳', '🤫', '😉', '😂', '❤️', '💝', '🌟', '🔔', '🦌', '🍪', '☕', '🍷', '🙌', '👀'];

  const defaults = {
    event: { name: '', budget: '', date: '' },
    participants: [],
    subject: '🎁 ¡Ya tenemos amigo invisible!',
    message: 'Este año jugamos al amigo invisible 🎄✨\nTocá el botón para descubrir a quién le vas a regalar. ¡Shhh, es secreto! 🤫',
    forced: [],
    excluded: [],
    avoidPairs: true,
    ejs: { key: '', service: '', template: '' },
    fromName: '',
    testMode: false,
    testEmail: '',
    draw: null // [{ id, link, status }]
  };

  let state = load();

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE));
      return saved ? { ...defaults, ...saved } : structuredClone(defaults);
    } catch { return structuredClone(defaults); }
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch { /* sin almacenamiento */ }
  }

  const uid = () => Math.random().toString(36).slice(2, 9);
  const byId = id => state.participants.find(p => p.id === id);
  const isEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

  function toast(msg, ms = 2600) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), ms);
  }

  /* ---------- Formulario: evento y mensaje ---------- */
  function bindInput(id, get, set) {
    const el = $(id);
    el[el.type === 'checkbox' ? 'checked' : 'value'] = get();
    el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
      set(el.type === 'checkbox' ? el.checked : el.value.trim());
      save();
      if (id === 'testMode') renderTestMode();
      if (id.startsWith('ejs')) renderConfigStatus();
    });
  }

  bindInput('eventName', () => state.event.name, v => state.event.name = v);
  bindInput('eventBudget', () => state.event.budget, v => state.event.budget = v);
  bindInput('eventDate', () => state.event.date, v => state.event.date = v);
  bindInput('mailSubject', () => state.subject, v => state.subject = v);
  bindInput('mailMessage', () => state.message, v => state.message = v);
  bindInput('avoidPairs', () => state.avoidPairs, v => state.avoidPairs = v);
  bindInput('ejsKey', () => state.ejs.key, v => state.ejs.key = v);
  bindInput('ejsService', () => state.ejs.service, v => state.ejs.service = v);
  bindInput('ejsTemplate', () => state.ejs.template, v => state.ejs.template = v);
  bindInput('fromName', () => state.fromName, v => state.fromName = v);
  bindInput('testMode', () => state.testMode, v => state.testMode = v);
  bindInput('testEmail', () => state.testEmail, v => state.testEmail = v);

  function renderTestMode() {
    $('testEmailWrap').classList.toggle('hidden', !state.testMode);
  }
  function ejsReady() {
    return state.ejs.key && state.ejs.service && state.ejs.template;
  }
  function renderConfigStatus() {
    const s = $('configStatus');
    s.textContent = ejsReady() ? 'listo ✓' : 'sin configurar';
    s.classList.toggle('pill--ok', !!ejsReady());
  }

  /* ---------- Emojis ---------- */
  EMOJIS.forEach(e => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = e;
    b.addEventListener('mousedown', ev => ev.preventDefault()); // mantiene el foco en el textarea
    b.addEventListener('click', () => insertEmoji(e));
    $('emojiBar').appendChild(b);
  });
  let lastField = $('mailMessage');
  ['mailMessage', 'mailSubject'].forEach(id => $(id).addEventListener('focus', () => { lastField = $(id); }));

  function insertEmoji(e) {
    const el = lastField;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    el.value = el.value.slice(0, start) + e + el.value.slice(end);
    el.selectionStart = el.selectionEnd = start + e.length;
    el.dispatchEvent(new Event('input'));
  }

  /* ---------- Participantes ---------- */
  function addParticipant(name, email) {
    name = name.trim(); email = email.trim().toLowerCase();
    if (!name || !isEmail(email)) return 'invalid';
    if (state.participants.some(p => p.email === email)) return 'dup';
    state.participants.push({ id: uid(), name, email });
    return 'ok';
  }

  $('addForm').addEventListener('submit', ev => {
    ev.preventDefault();
    const r = addParticipant($('pName').value, $('pEmail').value);
    if (r === 'dup') return toast('Ese correo ya está en la lista 🤔');
    if (r === 'invalid') return toast('Revisá el nombre y el correo ✍️');
    $('pName').value = ''; $('pEmail').value = '';
    $('pName').focus();
    invalidateDraw();
    save(); renderAll();
  });

  $('bulkAdd').addEventListener('click', () => {
    const lines = $('bulkInput').value.split('\n').map(l => l.trim()).filter(Boolean);
    let ok = 0, bad = 0;
    lines.forEach(l => {
      const m = l.match(/^(.+?)[,;\t<]\s*([^\s,;<>]+@[^\s,;<>]+)>?$/);
      if (m && addParticipant(m[1].replace(/["']/g, ''), m[2]) === 'ok') ok++; else bad++;
    });
    $('bulkInput').value = '';
    if (ok) invalidateDraw();
    save(); renderAll();
    toast(`✅ ${ok} añadidos${bad ? ` · ⚠️ ${bad} con problemas` : ''}`);
  });

  function removeParticipant(id) {
    state.participants = state.participants.filter(p => p.id !== id);
    state.forced = state.forced.filter(r => r.from !== id && r.to !== id);
    state.excluded = state.excluded.filter(r => r.from !== id && r.to !== id);
    invalidateDraw();
    save(); renderAll();
  }

  function renderParticipants() {
    const list = $('participantList');
    list.innerHTML = '';
    state.participants.forEach((p, i) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="avatar" style="--h:${(i * 57) % 360}">${AI.escapeHtml(p.name.charAt(0).toUpperCase())}</span>
        <span class="plist__info"><b>${AI.escapeHtml(p.name)}</b><small>${AI.escapeHtml(p.email)}</small></span>
        <button class="icon-btn" type="button" aria-label="Quitar a ${AI.escapeHtml(p.name)}">✕</button>`;
      li.querySelector('button').addEventListener('click', () => removeParticipant(p.id));
      list.appendChild(li);
    });
    $('countBadge').textContent = state.participants.length;
    $('emptyList').classList.toggle('hidden', state.participants.length > 0);
  }

  /* ---------- Reglas secretas ---------- */
  function fillSelect(sel) {
    const prev = sel.value;
    sel.innerHTML = state.participants.map(p => `<option value="${p.id}">${AI.escapeHtml(p.name)}</option>`).join('');
    if (byId(prev)) sel.value = prev;
  }

  $('addForce').addEventListener('click', () => {
    const from = $('forceFrom').value, to = $('forceTo').value;
    if (!from || !to) return;
    if (from === to) return toast('No se puede regalar a sí mismo 😅');
    if (state.forced.some(r => r.to === to && r.from !== from)) return toast(`A ${byId(to).name} ya le regala otra persona fija`);
    if (state.excluded.some(r => r.from === from && r.to === to)) return toast('Esa combinación está excluida');
    state.forced = state.forced.filter(r => r.from !== from);
    state.forced.push({ from, to });
    invalidateDraw(); save(); renderRules();
  });

  $('addExcl').addEventListener('click', () => {
    const from = $('exclFrom').value, to = $('exclTo').value;
    if (!from || !to || from === to) return;
    const pairs = [{ from, to }];
    if ($('exclMutual').checked) pairs.push({ from: to, to: from });
    pairs.forEach(p => {
      if (state.forced.some(r => r.from === p.from && r.to === p.to)) return;
      if (!state.excluded.some(r => r.from === p.from && r.to === p.to)) state.excluded.push(p);
    });
    invalidateDraw(); save(); renderRules();
  });

  function renderRuleList(listId, rules, label, key) {
    const ul = $(listId);
    ul.innerHTML = '';
    rules.forEach((r, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${AI.escapeHtml(byId(r.from)?.name)} <i>${label}</i> ${AI.escapeHtml(byId(r.to)?.name)}</span><button class="icon-btn" type="button" aria-label="Quitar regla">✕</button>`;
      li.querySelector('button').addEventListener('click', () => {
        state[key].splice(i, 1);
        invalidateDraw(); save(); renderRules();
      });
      ul.appendChild(li);
    });
  }

  function renderRules() {
    ['forceFrom', 'forceTo', 'exclFrom', 'exclTo'].forEach(id => fillSelect($(id)));
    renderRuleList('forceList', state.forced, '→ regala a →', 'forced');
    renderRuleList('exclList', state.excluded, '✕ no regala a', 'excluded');
  }

  /* ---------- Sorteo ---------- */
  function shuffle(a) {
    const arr = a.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* Backtracking aleatorio: respeta parejas fijas y exclusiones,
     y el resto sale al azar de verdad. */
  function solve(avoidPairs) {
    const ids = state.participants.map(p => p.id);
    const forced = Object.fromEntries(state.forced.map(r => [r.from, r.to]));
    const excluded = new Set(state.excluded.map(r => r.from + '>' + r.to));
    const forcedTargets = new Set(Object.values(forced));

    const options = g => {
      if (forced[g]) return [forced[g]];
      return shuffle(ids.filter(r => r !== g && !excluded.has(g + '>' + r) && !forcedTargets.has(r)));
    };
    // Primero los más restringidos, para cortar ramas rápido
    const givers = shuffle(ids).sort((a, b) => options(a).length - options(b).length);

    const assign = {}, taken = new Set();
    let steps = 0;
    function bt(i) {
      if (++steps > 200000) return false;
      if (i === givers.length) return true;
      const g = givers[i];
      for (const r of options(g)) {
        if (taken.has(r)) continue;
        const mutual = assign[r] === g;
        if (avoidPairs && mutual && !(forced[g] === r && forced[r] === g)) continue;
        assign[g] = r; taken.add(r);
        if (bt(i + 1)) return true;
        delete assign[g]; taken.delete(r);
      }
      return false;
    }
    return bt(0) ? assign : null;
  }

  function invalidateDraw() {
    if (state.draw) { state.draw = null; renderResults(); }
  }

  function buildLink(giver, receiver) {
    const token = AI.encodeToken({
      g: giver.name, r: receiver.name,
      e: state.event.name, b: state.event.budget, d: state.event.date
    });
    const url = new URL('ver.html', location.href);
    url.search = '?t=' + token;
    url.hash = '';
    return url.toString();
  }

  function personalize(text, p) {
    return text.replace(/\{nombre\}/gi, p.name);
  }

  function emailFor(p, link) {
    return AI.buildEmailHtml({
      name: p.name,
      message: personalize(state.message, p),
      link,
      eventName: state.event.name,
      budget: state.event.budget,
      date: state.event.date,
      fromName: state.fromName
    });
  }

  async function sendOne(entry) {
    const p = byId(entry.id);
    const to = state.testMode ? state.testEmail : p.email;
    const subject = personalize(state.subject || 'Amigo Invisible 🎁', p) + (state.testMode ? ` [prueba → ${p.name}]` : '');
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: state.ejs.service,
        template_id: state.ejs.template,
        user_id: state.ejs.key,
        template_params: {
          to_email: to,
          to_name: p.name,
          subject,
          from_name: state.fromName || 'Amigo Invisible',
          html_body: emailFor(p, entry.link),
          link: entry.link
        }
      })
    });
    if (!res.ok) throw new Error((await res.text()) || res.status);
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let sending = false;

  async function sendAll(onlyFailed) {
    if (sending) return;
    sending = true;
    $('drawBtn').disabled = $('retryBtn').disabled = true;
    for (const entry of state.draw) {
      if (onlyFailed && entry.status === 'ok') continue;
      entry.status = 'sending'; renderResults();
      try {
        await sendOne(entry);
        entry.status = 'ok';
      } catch (err) {
        entry.status = 'error';
        entry.error = String(err.message || err).slice(0, 140);
      }
      save(); renderResults();
      await sleep(1100); // EmailJS limita la frecuencia de envíos
    }
    sending = false;
    $('drawBtn').disabled = $('retryBtn').disabled = false;
    const fails = state.draw.filter(e => e.status === 'error').length;
    toast(fails ? `⚠️ ${fails} correos fallaron` : '🎉 ¡Correos enviados!', 4000);
  }

  function validate() {
    if (state.participants.length < 3) return 'Necesitás al menos 3 participantes 🧑‍🤝‍🧑';
    if (!state.message.trim()) return 'Escribí un mensaje para el correo ✍️';
    if (state.testMode && !isEmail(state.testEmail)) return 'Poné tu correo para el modo prueba 🧪';
    return null;
  }

  async function runDraw() {
    const err = validate();
    if (err) return toast(err);

    let assign = solve(state.avoidPairs);
    if (!assign && state.avoidPairs) assign = solve(false);
    if (!assign) return toast('😵 Con esas reglas no hay sorteo posible. Aflojá alguna opción avanzada.', 4500);

    state.draw = state.participants.map(p => ({
      id: p.id,
      link: buildLink(p, byId(assign[p.id])),
      status: 'pending'
    }));
    save(); renderResults();
    $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (!ejsReady()) {
      $('mailConfig').open = true;
      toast('🎲 Sorteo hecho. Configurá EmailJS para enviar, o copiá los enlaces a mano.', 5000);
      return;
    }
    const who = state.testMode ? `a tu correo (${state.testEmail})` : `a ${state.draw.length} personas`;
    if (!confirm(`¿Enviar los correos ${who}?`)) return;
    sendAll(false);
  }

  $('drawBtn').addEventListener('click', () => {
    if (state.draw && state.draw.some(e => e.status === 'ok') && !state.testMode &&
        !confirm('Ya enviaste un sorteo. Si sorteás de nuevo, los enlaces viejos quedan desactualizados. ¿Seguir?')) return;
    runDraw();
  });
  $('redrawBtn').addEventListener('click', () => {
    if (confirm('¿Hacer un sorteo nuevo? Los enlaces anteriores dejan de valer para este juego.')) runDraw();
  });
  $('retryBtn').addEventListener('click', () => {
    if (!ejsReady()) { $('mailConfig').open = true; return toast('Primero configurá EmailJS ✉️'); }
    sendAll(true);
  });

  /* ---------- Resultados ---------- */
  const STATUS = {
    pending: ['⏳', 'Pendiente'],
    sending: ['📤', 'Enviando…'],
    ok: ['✅', 'Enviado'],
    error: ['⚠️', 'Falló']
  };

  function renderResults() {
    const box = $('results');
    if (!state.draw) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    const ul = $('sendList');
    ul.innerHTML = '';
    state.draw.forEach(entry => {
      const p = byId(entry.id);
      if (!p) return;
      const [icon, label] = STATUS[entry.status] || STATUS.pending;
      const li = document.createElement('li');
      li.className = 'send--' + entry.status;
      li.innerHTML = `
        <span class="send__status" title="${label}">${icon}</span>
        <span class="plist__info"><b>${AI.escapeHtml(p.name)}</b><small>${entry.status === 'error' ? AI.escapeHtml(entry.error || label) : label}</small></span>
        <span class="send__btns">
          <button class="icon-btn" data-act="copy" type="button" title="Copiar enlace">🔗</button>
          <a class="icon-btn" data-act="mail" title="Enviar desde mi correo">✉️</a>
        </span>`;
      li.querySelector('[data-act=copy]').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(entry.link); toast(`🔗 Enlace de ${p.name} copiado`); }
        catch { prompt('Copiá este enlace:', entry.link); }
      });
      const body = `${personalize(state.message, p)}\n\n👉 Descubrí a quién le regalás: ${entry.link}`;
      li.querySelector('[data-act=mail]').href =
        `mailto:${encodeURIComponent(p.email)}?subject=${encodeURIComponent(personalize(state.subject, p))}&body=${encodeURIComponent(body)}`;
      ul.appendChild(li);
    });
    $('retryBtn').classList.toggle('hidden', !state.draw.some(e => e.status === 'error'));
  }

  /* ---------- Vista previa ---------- */
  $('previewBtn').addEventListener('click', () => {
    const sample = state.participants[0] || { name: 'Nancy' };
    $('previewFrame').srcdoc = emailFor(sample, new URL('ver.html?demo=1', location.href).toString());
    $('previewDialog').showModal();
  });
  $('previewDialog').addEventListener('click', ev => {
    if (ev.target.matches('[data-close]') || ev.target === $('previewDialog')) $('previewDialog').close();
  });

  /* ---------- Copos de nieve ---------- */
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

  function renderAll() {
    renderParticipants();
    renderRules();
    renderResults();
  }

  renderTestMode();
  renderConfigStatus();
  renderAll();
})();
