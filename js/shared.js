/* Utilidades compartidas entre el panel y la página de revelación. */
(function () {
  // Clave de ofuscación: evita que el nombre se lea a simple vista en el enlace.
  // No es cifrado fuerte, solo un "papel doblado" para que nadie espíe por accidente.
  const KEY = new TextEncoder().encode('regalitos-secretos-2026');

  function toB64Url(bytes) {
    let bin = '';
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function fromB64Url(str) {
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
    const bin = atob(b64);
    return Uint8Array.from(bin, c => c.charCodeAt(0));
  }

  function xor(bytes) {
    return bytes.map((b, i) => b ^ KEY[i % KEY.length]);
  }

  function encodeToken(data) {
    const bytes = new TextEncoder().encode(JSON.stringify(data));
    return toB64Url(xor(bytes));
  }

  function decodeToken(token) {
    const bytes = xor(fromB64Url(token));
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // Devuelve DD/MM/AAAA. Acepta ese mismo formato o AAAA-MM-DD (sorteos guardados antes del cambio).
  function formatDate(value) {
    if (!value) return '';
    const iso = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    return isValidDate(value) ? value : '';
  }

  function isValidDate(text) {
    const m = String(text).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return false;
    const [d, mo, y] = [+m[1], +m[2], +m[3]];
    const date = new Date(y, mo - 1, d);
    return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
  }

  /* HTML del correo: tablas + estilos en línea para que se vea bien en Gmail, Outlook, etc. */
  function buildEmailHtml({ name, message, link, eventName, budget, date, fromName }) {
    const msg = escapeHtml(message).replace(/\n/g, '<br>');
    const details = [
      budget ? `💶 <b>Presupuesto:</b> ${escapeHtml(budget)}` : '',
      date ? `📅 <b>Fecha:</b> ${escapeHtml(formatDate(date))}` : ''
    ].filter(Boolean).join('<br>');

    return `<!doctype html><html><body style="margin:0;padding:0;background:#fff4ec;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff4ec;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:24px;overflow:hidden;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1d2b45;box-shadow:0 8px 30px rgba(230,57,70,.12);">
<tr><td align="center" style="background:linear-gradient(135deg,#e63946,#f4845f);background-color:#e63946;padding:36px 24px 28px;">
<div style="font-size:56px;line-height:1;">🎁</div>
<h1 style="margin:12px 0 0;font-size:26px;color:#ffffff;font-weight:800;">${escapeHtml(eventName || 'Amigo Invisible')}</h1>
</td></tr>
<tr><td style="padding:28px 28px 8px;font-size:16px;line-height:1.6;">
<p style="margin:0 0 6px;font-size:20px;font-weight:700;">¡Hola, ${escapeHtml(name)}! 👋</p>
<p style="margin:0 0 18px;">${msg}</p>
${details ? `<p style="margin:0 0 18px;padding:14px 16px;background:#fff4ec;border-radius:14px;font-size:15px;">${details}</p>` : ''}
</td></tr>
<tr><td align="center" style="padding:8px 28px 32px;">
<a href="${escapeHtml(link)}" target="_blank" style="display:inline-block;background:#2a9d8f;color:#ffffff;text-decoration:none;font-weight:800;font-size:18px;padding:16px 32px;border-radius:999px;">🤫 Descubrir a quién le regalo</a>
<p style="margin:16px 0 0;font-size:12px;color:#8a94a6;">Es un secreto: no se lo muestres a nadie 😉</p>
</td></tr>
${fromName ? `<tr><td align="center" style="padding:0 28px 24px;font-size:13px;color:#8a94a6;">Organiza: ${escapeHtml(fromName)}</td></tr>` : ''}
</table>
</td></tr></table></body></html>`;
  }

  window.AI = { encodeToken, decodeToken, escapeHtml, formatDate, isValidDate, buildEmailHtml };
})();
