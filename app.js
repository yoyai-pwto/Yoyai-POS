'use strict';
/* YOYAI POS & Financial Dashboard - Frontend PWA (Tahap 3 & 4) */
const $ = (s, r) => (r || document).querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => Number(v) || 0;
const rp = n => (num(n) < 0 ? '-' : '') + 'Rp' + Math.abs(Math.round(num(n))).toLocaleString('id-ID');
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'k' + Date.now() + Math.random().toString(16).slice(2));
const CH = ['Offline', 'Shopee', 'TikTok Shop'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const S = { token: localStorage.getItem('yy_token') || '', nama: localStorage.getItem('yy_nama') || '', produk: [], kategori: [], cfg: {}, lapTab: 'harian', dashTgl: '' };
const apiUrl = () => (window.YOYAI_API_URL || localStorage.getItem('yy_api') || '').trim();
const ICON = {
  dashboard: '<path d="M4 13h6V4H4zM14 20h6V11h-6zM4 20h6v-4H4zM14 7h6V4h-6z"/>',
  transaksi: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>',
  produk: '<path d="M3 8l9-5 9 5-9 5zM3 8v8l9 5 9-5V8M12 13v8"/>',
  pengeluaran: '<path d="M3 7h18v12H3zM3 11h18M7 15h3"/>',
  laporan: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  pengaturan: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'
};
const NAV = [['dashboard', 'Dashboard'], ['transaksi', 'Transaksi'], ['produk', 'Produk'], ['pengeluaran', 'Pengeluaran'], ['laporan', 'Laporan'], ['pengaturan', 'Pengaturan']];

/* ---------- UI helpers ---------- */
let toastT;
function toast(msg, type) {
  const t = $('#toast'); t.textContent = msg; t.className = 'toast show ' + (type || '');
  clearTimeout(toastT); toastT = setTimeout(() => t.className = 'toast', type === 'err' ? 5000 : 2800);
}
function sheet(title, html) {
  const el = $('#sheet');
  el.innerHTML = `<div class="sheet-bg" data-close></div><div class="sheet-body"><div class="sheet-head"><b>${esc(title)}</b><button class="x" data-close aria-label="Tutup">✕</button></div><div class="sheet-content">${html}</div></div>`;
  el.classList.add('open'); el.onclick = e => { if (e.target.hasAttribute('data-close')) closeSheet(); };
}
function closeSheet() { const el = $('#sheet'); el.classList.remove('open'); el.innerHTML = ''; }
async function busy(btn, fn) {
  if (btn.disabled) return; btn.disabled = true; const t = btn.textContent; btn.textContent = 'Memproses…';
  try { return await fn(); } finally { btn.disabled = false; btn.textContent = t; }
}
const field = (l, inner) => `<label>${l}</label>${inner}`;
function opts(list, sel) { return list.map(o => { const v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; return `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(t)}</option>`; }).join(''); }
const metodeList = () => String(S.cfg.metode_bayar || 'Tunai,QRIS,Transfer,Saldo Shopee,Saldo TikTok').split(',').map(x => x.trim()).filter(Boolean);
function chBadge(c) { return `<span class="badge b-${c === 'TikTok Shop' ? 'TikTok' : c}">${esc(c)}</span>`; }
function short(n) { const a = Math.abs(n), s = n < 0 ? '-' : ''; if (a >= 1e6) return s + (a / 1e6).toFixed(1).replace('.0', '') + 'jt'; if (a >= 1e3) return s + Math.round(a / 1e3) + 'rb'; return s + a; }
function barChart(data, color) {
  if (!data.length) return '<p class="muted">Belum ada data.</p>';
  const W = 320, H = 150, pl = 34, pb = 18, pt = 8, pr = 4, vals = data.map(d => d.v);
  const max = Math.max(0, ...vals), min = Math.min(0, ...vals), span = (max - min) || 1, bw = (W - pl - pr) / data.length;
  const y = v => pt + (max - v) / span * (H - pt - pb);
  let s = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img"><line x1="${pl}" x2="${W - pr}" y1="${y(0)}" y2="${y(0)}" stroke="#d9cfb8"/>`;
  s += `<text x="${pl - 4}" y="${pt + 8}" text-anchor="end" class="ax">${short(max)}</text>`;
  if (min < 0) s += `<text x="${pl - 4}" y="${H - pb}" text-anchor="end" class="ax">${short(min)}</text>`;
  data.forEach((d, i) => {
    const x = pl + i * bw + bw * .15, w = bw * .7, y0 = y(0), y1 = y(d.v), h = Math.max(Math.abs(y1 - y0), d.v ? 1 : 0);
    s += `<rect x="${x}" y="${Math.min(y0, y1)}" width="${w}" height="${h}" rx="2" fill="${d.v < 0 ? '#c9453f' : (color || '#7BA05A')}"><title>${esc(d.l)}: ${rp(d.v)}</title></rect>`;
    if (data.length <= 12 || i % Math.ceil(data.length / 10) === 0) s += `<text x="${x + w / 2}" y="${H - 4}" text-anchor="middle" class="ax">${esc(d.l)}</text>`;
  });
  return s + '</svg>';
}
function hBars(rows) {
  const max = Math.max(1, ...rows.map(r => r.v));
  return rows.map(r => `<div class="hb"><span>${esc(r.l)}</span><div><div class="bar" style="width:${Math.max(r.v / max * 100, 1)}%;background:${r.c || 'var(--olive)'}"></div><span class="muted">${rp(r.v)}</span></div></div>`).join('');
}
function downloadCSV(name, rows) {
  const csv = '\ufeff' + rows.map(r => r.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

/* ---------- API ---------- */
const isNet = e => e instanceof TypeError || /Failed to fetch|NetworkError|Load failed/i.test(String(e && e.message));
async function api(action, data) {
  if (!apiUrl()) throw new Error('URL Apps Script belum diisi.');
  let res;
  try {
    res = await fetch(apiUrl(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, token: S.token, data: data || {} }) });
  } catch (e) { const er = new Error('Tidak ada koneksi internet.'); er.net = true; throw er; }
  let j; try { j = await res.json(); } catch (e) { throw new Error('Respons server tidak valid. Periksa URL dan deployment Apps Script.'); }
  if (!j.ok) {
    if (j.error === 'SESI_HABIS') { doLogout(true); throw new Error('Sesi habis. Silakan login kembali.'); }
    throw new Error(j.error);
  }
  return j.data;
}
async function loadMaster() {
  const [p, k, c] = await Promise.all([api('produk.list'), api('kategori.list'), api('pengaturan.get')]);
  S.produk = p; S.kategori = k; S.cfg = c; localStorage.setItem('yy_master', JSON.stringify({ p, k, c }));
}

/* ---------- Antrean offline (transaksi baru) ---------- */
const getQ = () => JSON.parse(localStorage.getItem('yy_queue') || '[]');
const setQ = q => { localStorage.setItem('yy_queue', JSON.stringify(q)); netBadge(); };
function netBadge() {
  const n = getQ().length, el = $('#net');
  el.textContent = !navigator.onLine ? 'Offline' + (n ? ` · ${n} menunggu` : '') : (n ? `${n} menunggu sinkron` : '');
}
let flushing = false;
async function flushQueue() {
  if (flushing || !S.token || !navigator.onLine) return; flushing = true;
  try {
    let q = getQ();
    while (q.length) {
      try { await api('transaksi.create', q[0]); q.shift(); setQ(q); toast('Transaksi offline berhasil disinkronkan', 'ok'); }
      catch (e) {
        if (e.net) break;
        const bad = JSON.parse(localStorage.getItem('yy_queue_err') || '[]'); bad.push({ payload: q[0], error: e.message });
        localStorage.setItem('yy_queue_err', JSON.stringify(bad)); q.shift(); setQ(q); toast('Satu transaksi offline ditolak: ' + e.message, 'err');
      }
    }
  } finally { flushing = false; }
}

/* ---------- Login / sesi ---------- */
function showLogin(msg) {
  $('#nav').classList.add('hide');
  $('#view').innerHTML = `<div class="login"><div class="logo">Y</div><h1 class="center">YOYAI POS</h1>
  <p class="muted center">Masuk dengan nama dan PIN 6 digit</p>${msg ? `<div class="warn">${esc(msg)}</div>` : ''}
  <div class="card">${apiUrl() ? '' : field('URL Apps Script (…/exec)', '<input id="lu" type="url" placeholder="https://script.google.com/macros/s/.../exec">')}
  ${field('Nama', `<input id="ln" autocomplete="username" autocapitalize="words" value="${esc(S.nama)}">`)}
  ${field('PIN', '<input id="lp" type="password" inputmode="numeric" maxlength="6" autocomplete="current-password">')}
  <button class="btn" id="lb">Masuk</button></div></div>`;
  const go = () => busy($('#lb'), async () => {
    try {
      if (!apiUrl()) { const u = ($('#lu').value || '').trim(); if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(u)) throw new Error('URL Apps Script tidak valid.'); localStorage.setItem('yy_api', u); }
      const r = await api('login', { nama: $('#ln').value.trim(), pin: $('#lp').value });
      S.token = r.token; S.nama = r.nama; localStorage.setItem('yy_token', r.token); localStorage.setItem('yy_nama', r.nama);
      await loadMaster(); $('#nav').classList.remove('hide'); flushQueue(); route();
    } catch (e) { toast(e.message, 'err'); }
  });
  $('#lb').onclick = go; $('#lp').onkeydown = e => { if (e.key === 'Enter') go(); };
}
function doLogout(expired) {
  S.token = ''; localStorage.removeItem('yy_token');
  showLogin(expired ? 'Sesi habis. Silakan login kembali.' : '');
}

/* ---------- Router ---------- */
const PAGES = {};
async function route() {
  if (!S.token) return showLogin();
  const [, name = 'dashboard', a, b] = location.hash.split('/'), page = PAGES[name] || PAGES.dashboard;
  $('#nav').innerHTML = NAV.map(n => `<a href="#/${n[0]}" class="${n[0] === name ? 'on' : ''}"><svg viewBox="0 0 24 24">${ICON[n[0]]}</svg>${n[1]}</a>`).join('');
  $('#nav').classList.remove('hide');
  clearInterval(S.timer); S.timer = null;
  $('#view').innerHTML = '<p class="muted center">Memuat…</p>'; window.scrollTo(0, 0);
  try { await page(a, b); } catch (e) {
    if (!S.token) return;
    $('#view').innerHTML = `<div class="warn">${esc(e.message)}</div><button class="btn alt" onclick="route()">Coba lagi</button>`;
  }
}
window.addEventListener('hashchange', () => { closeSheet(); route(); });

/* ---------- Dashboard ---------- */
PAGES.dashboard = async () => {
  const tgl = S.dashTgl || today(), d = await api('laporan.dashboard', { tanggal: tgl }), h = d.hari_ini, b = d.bulan;
  const st = (l, v, c) => `<div class="card stat ${c || ''}"><div class="l">${l}</div><div class="v">${v}</div></div>`;
  const chs = CH.map(c => ({ l: c, v: b.per_channel[c].omzet, c: c === 'Shopee' ? '#FFA83A' : c === 'TikTok Shop' ? '#5b8def' : '#7BA05A' }));
  $('#view').innerHTML = `<h1>Dashboard</h1><div class="noprint">${field('Tanggal (bulan mengikuti tanggal)', `<input type="date" id="dt" value="${tgl}">`)}</div>
  <h2>${tgl.split('-').reverse().join('/')}</h2><div class="grid">
  ${st('Omzet', rp(h.omzet), 'hi')}${st('HPP', rp(h.hpp))}${st('Admin marketplace', rp(h.biaya_admin))}
  ${st('Biaya operasional', rp(h.biaya_operasional + h.biaya_tambahan))}${st('Keuntungan', `<span class="${h.keuntungan < 0 ? 'neg' : 'pos'}">${rp(h.keuntungan)}</span>`, 'or')}${st('Transaksi', h.transaksi)}</div>
  <h2>${BULAN[+tgl.slice(5, 7) - 1]} ${tgl.slice(0, 4)}</h2><div class="grid">${st('Omzet bulan ini', rp(b.omzet), 'hi')}${st('Keuntungan bulan ini', `<span class="${b.keuntungan < 0 ? 'neg' : 'pos'}">${rp(b.keuntungan)}</span>`, 'or')}${st('Transaksi', b.transaksi)}</div>
  <div class="grid2"><div class="card"><b>Omzet harian</b>${barChart(d.seri.map(x => ({ l: x.tanggal.slice(8), v: x.omzet })))}</div>
  <div class="card"><b>Keuntungan harian</b>${barChart(d.seri.map(x => ({ l: x.tanggal.slice(8), v: x.keuntungan })), '#FFA83A')}</div></div>
  <div class="card"><b>Omzet per channel (bulan ini)</b>${hBars(chs)}</div>`;
  $('#dt').onchange = e => { S.dashTgl = e.target.value || today(); route(); };
};

/* ---------- Transaksi: daftar ---------- */
PAGES.transaksi = async (a, b) => {
  if (a === 'baru') return trxForm(null);
  if (a === 'edit') return trxForm(b);
  const f = S.trxF || (S.trxF = { dari: today(), sampai: today(), channel: '' });
  const list = await api('transaksi.list', { dari: f.dari, sampai: f.sampai, channel: f.channel }), q = getQ();
  const aktif = list.filter(t => t.status === 'Aktif');
  $('#view').innerHTML = `<h1>Transaksi</h1>
  ${q.length ? `<div class="warn">${q.length} transaksi menunggu sinkron (tersimpan di perangkat ini).</div>` : ''}
  <div class="row2">${field('Dari', `<input type="date" id="fd" value="${f.dari}">`)}${field('Sampai', `<input type="date" id="fs" value="${f.sampai}">`)}</div>
  ${field('Channel', `<select id="fc"><option value="">Semua channel</option>${opts(CH, f.channel)}</select>`)}
  <p class="muted">${aktif.length} transaksi aktif · Omzet ${rp(aktif.reduce((s, t) => s + num(t.total_penjualan), 0))}</p>
  ${list.map(t => `<div class="card li ${t.status === 'Void' ? 'void' : ''}" data-id="${esc(t.id_transaksi)}"><div><div class="t">${esc(t.id_transaksi)}</div>
  <div class="s">${t.tanggal} · ${chBadge(t.channel)} ${t.status === 'Void' ? '<span class="badge b-Void">VOID</span>' : ''}</div></div>
  <div class="right"><div class="t">${rp(t.total_penjualan)}</div><div class="s ${num(t.laba_bersih) < 0 ? 'neg' : ''}">Laba ${rp(t.laba_bersih)}</div></div></div>`).join('') || '<p class="muted center">Tidak ada transaksi pada filter ini.</p>'}
  <button class="btn fab" onclick="location.hash='#/transaksi/baru'">+ Transaksi</button>`;
  const chg = () => { S.trxF = { dari: $('#fd').value, sampai: $('#fs').value, channel: $('#fc').value }; route(); };
  ['fd', 'fs', 'fc'].forEach(i => $('#' + i).onchange = chg);
  document.querySelectorAll('.li[data-id]').forEach(el => el.onclick = () => trxDetail(el.dataset.id));
};
async function trxDetail(id) {
  const d = await api('transaksi.get', { id_transaksi: id }), t = d.transaksi, v = t.status === 'Void';
  sheet(t.id_transaksi, `<p class="muted">${t.tanggal} · ${chBadge(t.channel)} · ${esc(t.metode_bayar)} ${v ? '<span class="badge b-Void">VOID</span>' : ''}</p>
  <div class="tw"><table><tr><th>Produk</th><th>Jml</th><th>Harga</th><th>Subtotal</th></tr>${d.detail.map(x => `<tr><td>${esc(x.nama_produk)} ${esc(x.varian)}${num(x.diskon) ? `<br><span class="muted">diskon ${rp(x.diskon)}</span>` : ''}</td><td>${x.qty}</td><td>${rp(x.harga_satuan)}</td><td>${rp(x.subtotal_baris)}</td></tr>`).join('')}</table></div>
  <table><tr><td>Total penjualan</td><td>${rp(t.total_penjualan)}</td></tr><tr><td>Total HPP</td><td>${rp(t.total_hpp)}</td></tr>
  <tr><td>Biaya admin${num(t.admin_persen) ? ` (${t.admin_persen}%)` : ''}</td><td>${rp(t.biaya_admin)}</td></tr><tr><td>Biaya tambahan</td><td>${rp(t.biaya_tambahan)}</td></tr>
  <tr class="tot"><td>Keuntungan bersih</td><td>${rp(t.laba_bersih)}</td></tr></table>
  ${t.catatan ? `<p class="muted">Catatan: ${esc(t.catatan)}</p>` : ''}${v ? `<div class="warn">Void: ${esc(t.void_alasan)} (${esc(t.void_oleh)})</div>` : `
  <button class="btn" id="be">Edit transaksi</button><button class="btn red" id="bv">Batalkan (void)</button>`}`);
  if (v) return;
  $('#be').onclick = () => { closeSheet(); location.hash = '#/transaksi/edit/' + id; };
  $('#bv').onclick = () => {
    sheet('Batalkan ' + id, `<div class="warn">Transaksi tidak dihapus, hanya ditandai VOID dan stok dikembalikan. Tindakan ini tidak bisa dibatalkan.</div>
    ${field('Alasan pembatalan', '<input id="va" placeholder="Contoh: salah input">')}<button class="btn red" id="vy">Ya, batalkan transaksi</button><button class="btn alt" data-close>Tidak</button>`);
    $('#vy').onclick = ev => busy(ev.target, async () => { try { await api('transaksi.void', { id_transaksi: id, alasan: $('#va').value }); closeSheet(); toast('Transaksi dibatalkan', 'ok'); route(); } catch (er) { toast(er.message, 'err'); } });
  };
}

/* ---------- Transaksi: form (baru / edit) ---------- */
async function trxForm(id) {
  const F = { key: uuid(), id: id, tanggal: today(), channel: 'Offline', manual: false, admin: '', tambahan: 0, metode: 'Tunai', catatan: '', items: [], hpp: {} };
  if (id) {
    const d = await api('transaksi.get', { id_transaksi: id }), t = d.transaksi;
    if (t.status !== 'Aktif') throw new Error('Transaksi void tidak dapat diedit.');
    Object.assign(F, { tanggal: t.tanggal, channel: t.channel, tambahan: num(t.biaya_tambahan), metode: t.metode_bayar, catatan: t.catatan || '' });
    F.manual = t.channel !== 'Offline' && num(t.admin_persen) === 0 && num(t.biaya_admin) > 0; F.admin = F.manual ? t.biaya_admin : '';
    F.items = d.detail.map(x => ({ sku: x.sku, qty: x.qty, harga_satuan: x.harga_satuan, diskon: x.diskon })); d.detail.forEach(x => F.hpp[x.sku] = num(x.hpp_satuan));
  } else F.items = [{ sku: '', qty: 1, harga_satuan: '', diskon: 0 }];
  const pm = {}; S.produk.forEach(p => pm[p.sku] = p);
  const sm = {}; try { (await api('stok.list')).forEach(x => sm[x.sku] = x.stok); } catch (e) { /* offline: tanpa info stok */ }
  const aktif = S.produk.filter(p => p.status === 'Aktif' || F.items.some(i => i.sku === p.sku));
  const persen = () => F.channel === 'Shopee' ? num(S.cfg.admin_persen_shopee) : F.channel === 'TikTok Shop' ? num(S.cfg.admin_persen_tiktok) : 0;
  const calc = () => {
    let sub = 0, dis = 0, hpp = 0;
    F.items.forEach(i => { const p = pm[i.sku]; if (!p) return; const q = num(i.qty), h = i.harga_satuan === '' ? num(p.harga_jual) : num(i.harga_satuan); sub += h * q; dis += num(i.diskon); hpp += (F.hpp[i.sku] !== undefined ? F.hpp[i.sku] : num(p.hpp_satuan)) * q; });
    const tp = sub - dis, adm = F.channel === 'Offline' ? 0 : F.manual ? num(F.admin) : Math.round(tp * persen() / 100);
    return { sub, dis, tp, hpp, adm, tam: num(F.tambahan), laba: tp - hpp - adm - num(F.tambahan) };
  };
  const rowHtml = (i, n) => `<div class="item" data-i="${n}">${field('Produk', `<select data-k="sku"><option value="">Pilih produk…</option>${aktif.map(p => `<option value="${esc(p.sku)}"${p.sku === i.sku ? ' selected' : ''}>${esc(p.nama_produk)} ${esc(p.varian)} · ${rp(p.harga_jual)}${sm[p.sku] !== undefined ? ' · stok ' + sm[p.sku] : ''}</option>`).join('')}</select>`)}
    <div class="row3">${field('Jumlah', `<input data-k="qty" type="number" inputmode="numeric" min="1" step="1" value="${i.qty}">`)}${field('Harga/unit', `<input data-k="harga_satuan" type="number" inputmode="numeric" min="0" value="${i.harga_satuan}">`)}${field('Diskon (Rp)', `<input data-k="diskon" type="number" inputmode="numeric" min="0" value="${i.diskon}">`)}</div>
    ${F.items.length > 1 ? '<button class="link danger" data-act="del">Hapus baris</button>' : ''}</div>`;
  const stokWarn = () => id ? '' : F.items.filter(i => pm[i.sku] && sm[i.sku] !== undefined && num(i.qty) > sm[i.sku]).map(i => `<div class="warn">Stok ${esc(pm[i.sku].nama_produk)} ${esc(pm[i.sku].varian)} hanya ${sm[i.sku]}, jumlah dijual ${num(i.qty)}. Transaksi tetap bisa disimpan (stok menjadi minus).</div>`).join('');
  const totHtml = () => { const c = calc(); return `${stokWarn()}<table><tr><td>Total penjualan</td><td>${rp(c.tp)}</td></tr><tr><td>Total HPP</td><td>${rp(c.hpp)}</td></tr>
    <tr><td>Biaya admin${F.channel !== 'Offline' && !F.manual ? ` (${persen()}%)` : ''}</td><td>${rp(c.adm)}</td></tr><tr><td>Biaya tambahan</td><td>${rp(c.tam)}</td></tr>
    <tr class="tot"><td>Keuntungan bersih</td><td class="${c.laba < 0 ? 'neg' : 'pos'}">${rp(c.laba)}</td></tr></table>`; };
  const render = () => {
    $('#view').innerHTML = `<h1>${id ? 'Edit ' + esc(id) : 'Transaksi baru'}</h1><div id="tf">
    <div class="row2">${field('Tanggal', `<input type="date" data-f="tanggal" value="${F.tanggal}">`)}${field('Channel', `<select data-f="channel">${opts(CH, F.channel)}</select>`)}</div>
    <div id="items">${F.items.map(rowHtml).join('')}</div><button class="btn alt" data-act="add">+ Tambah produk</button>
    ${F.channel !== 'Offline' ? `<label><input type="checkbox" data-f="manual" style="width:auto;min-height:0" ${F.manual ? 'checked' : ''}> Isi biaya admin manual (default: ${persen()}% dari Pengaturan)</label>${F.manual ? field('Biaya admin (Rp)', `<input type="number" inputmode="numeric" min="0" data-f="admin" value="${F.admin}">`) : ''}` : ''}
    <div class="row2">${field('Biaya tambahan (Rp)', `<input type="number" inputmode="numeric" min="0" data-f="tambahan" value="${F.tambahan}">`)}${field('Metode bayar', `<select data-f="metode">${opts(metodeList(), F.metode)}</select>`)}</div>
    ${field('Catatan', `<textarea data-f="catatan">${esc(F.catatan)}</textarea>`)}
    <div class="card" id="tot" style="margin-top:12px">${totHtml()}</div><button class="btn" id="save">Simpan transaksi</button>
    <button class="btn alt" onclick="history.back()">Batal</button></div>`;
  };
  render();
  const v = $('#view');
  v.oninput = v.onchange = e => {
    const el = e.target, f = el.dataset.f, k = el.dataset.k;
    if (f) {
      F[f] = el.type === 'checkbox' ? el.checked : el.value;
      if (f === 'channel' || f === 'manual') { if (f === 'channel' && F.channel === 'Offline') F.manual = false; render(); return; }
    } else if (k) {
      const row = el.closest('.item'), it = F.items[+row.dataset.i]; it[k] = el.value;
      if (k === 'sku' && pm[el.value]) { it.harga_satuan = pm[el.value].harga_jual; row.querySelector('[data-k="harga_satuan"]').value = it.harga_satuan; }
    }
    $('#tot').innerHTML = totHtml();
  };
  v.onclick = e => {
    if (e.target.id === 'save') return doSave(e.target);
    const act = e.target.dataset.act; if (!act) return;
    if (act === 'add') { F.items.push({ sku: '', qty: 1, harga_satuan: '', diskon: 0 }); render(); }
    if (act === 'del') { F.items.splice(+e.target.closest('.item').dataset.i, 1); render(); }
  };
  const doSave = btn => busy(btn, async () => {
    try {
      const skus = F.items.map(i => i.sku);
      if (skus.some(s => !s)) throw new Error('Pilih produk pada semua baris.');
      if (new Set(skus).size !== skus.length) throw new Error('Produk yang sama muncul dua kali. Gabungkan jumlahnya.');
      F.items.forEach(i => { if (!Number.isInteger(num(i.qty)) || num(i.qty) < 1) throw new Error('Jumlah harus bilangan bulat minimal 1.'); if (num(i.harga_satuan) < 0 || num(i.diskon) < 0) throw new Error('Harga dan diskon tidak boleh negatif.'); });
      if (num(F.tambahan) < 0 || (F.manual && num(F.admin) < 0)) throw new Error('Biaya tidak boleh negatif.');
      const payload = { idempotency_key: F.key, tanggal: F.tanggal, channel: F.channel, metode_bayar: F.metode, catatan: F.catatan, biaya_tambahan: num(F.tambahan),
        items: F.items.map(i => ({ sku: i.sku, qty: num(i.qty), harga_satuan: i.harga_satuan === '' ? undefined : num(i.harga_satuan), diskon: num(i.diskon) })) };
      if (F.channel !== 'Offline' && F.manual) payload.biaya_admin = num(F.admin);
      if (id) payload.id_transaksi = id;
      try {
        const r = await api(id ? 'transaksi.update' : 'transaksi.create', payload), t = r.transaksi;
        toast((id ? 'Perubahan tersimpan: ' : 'Transaksi tersimpan: ') + t.id_transaksi, 'ok'); if (r.peringatan && r.peringatan.length) setTimeout(() => toast(r.peringatan.join(' '), 'err'), 2900);
      } catch (e) {
        if (!e.net || id) throw e;
        const q = getQ(); if (!q.some(x => x.idempotency_key === F.key)) q.push(payload); setQ(q);
        toast('Offline: transaksi disimpan di perangkat dan akan dikirim otomatis.', 'ok');
      }
      location.hash = '#/transaksi';
    } catch (e) { toast(e.message, 'err'); }
  });
}

/* ---------- Produk & stok ---------- */
PAGES.produk = async () => {
  await loadMaster(); const stok = await api('stok.list'), sm = {}; stok.forEach(s => sm[s.sku] = s.stok);
  $('#view').innerHTML = `<h1>Produk</h1>${S.produk.map(p => `<div class="card li" data-sku="${esc(p.sku)}"><div><div class="t">${esc(p.nama_produk)} ${esc(p.varian)}</div>
  <div class="s">${esc(p.sku)} · ${esc(p.kategori)} ${p.status !== 'Aktif' ? '<span class="badge b-Tidak">Nonaktif</span>' : ''}</div></div>
  <div class="right"><div class="t">${rp(p.harga_jual)}</div><div class="s">HPP ${rp(p.hpp_satuan)} · stok <b class="${(sm[p.sku] || 0) < 0 ? 'neg' : ''}">${sm[p.sku] || 0}</b></div></div></div>`).join('') || '<p class="muted center">Belum ada produk. Tambahkan produk pertama Anda.</p>'}
  <button class="btn fab" id="np">+ Produk</button>`;
  $('#np').onclick = () => produkForm(null, 0);
  document.querySelectorAll('.li[data-sku]').forEach(el => el.onclick = () => produkForm(S.produk.find(p => p.sku === el.dataset.sku), sm[el.dataset.sku] || 0));
};
function produkForm(p, stok) {
  const n = !p; p = p || { sku: '', nama_produk: '', kategori: '', varian: '', harga_jual: '', hpp_satuan: '', status: 'Aktif' };
  sheet(n ? 'Produk baru' : p.nama_produk, `${field('SKU / Kode', `<input id="p_sku" value="${esc(p.sku)}" ${n ? '' : 'disabled'} autocapitalize="characters">`)}
  ${field('Nama produk', `<input id="p_nama" value="${esc(p.nama_produk)}">`)}<div class="row2">${field('Kategori', `<input id="p_kat" value="${esc(p.kategori)}">`)}${field('Varian', `<input id="p_var" value="${esc(p.varian)}">`)}</div>
  <div class="row2">${field('Harga jual (Rp)', `<input id="p_hj" type="number" inputmode="numeric" min="0" value="${p.harga_jual}">`)}${field('HPP per unit (Rp)', `<input id="p_hpp" type="number" inputmode="numeric" min="0" value="${p.hpp_satuan}">`)}</div>
  ${n ? field('Stok awal (unit)', '<input id="p_stok" type="number" inputmode="numeric" min="0" step="1" value="0">') : ''}
  <p class="muted">Mengubah HPP atau harga tidak mengubah laporan transaksi lama (HPP disimpan per transaksi).</p>
  <button class="btn" id="p_save">Simpan</button>${n ? '' : `<button class="btn alt" id="p_st">${p.status === 'Aktif' ? 'Nonaktifkan produk' : 'Aktifkan produk'}</button>
  <h2>Stok saat ini: ${stok}</h2><div class="row2">${field('Stok masuk / produksi', '<input id="s_in" type="number" inputmode="numeric" min="1">')}${field('Stok fisik (opname)', '<input id="s_op" type="number" inputmode="numeric" min="0">')}</div>
  <button class="btn sm" id="s_bin">Tambah stok</button><button class="btn sm alt" id="s_bop">Simpan opname</button>`}`);
  $('#p_save').onclick = ev => busy(ev.target, async () => {
    try {
      const d = { nama_produk: $('#p_nama').value, kategori: $('#p_kat').value, varian: $('#p_var').value, harga_jual: $('#p_hj').value, hpp_satuan: $('#p_hpp').value };
      if (n) d.stok_awal = $('#p_stok').value || 0;
      await api(n ? 'produk.create' : 'produk.update', Object.assign({ sku: n ? $('#p_sku').value : p.sku }, d)); closeSheet(); toast('Produk tersimpan', 'ok'); route();
    } catch (e) { toast(e.message, 'err'); }
  });
  if (n) return;
  $('#p_st').onclick = ev => busy(ev.target, async () => { try { await api('produk.update', { sku: p.sku, status: p.status === 'Aktif' ? 'Tidak Aktif' : 'Aktif' }); closeSheet(); route(); } catch (e) { toast(e.message, 'err'); } });
  $('#s_bin').onclick = ev => busy(ev.target, async () => { try { await api('stok.masuk', { sku: p.sku, qty: $('#s_in').value, tanggal: today() }); closeSheet(); toast('Stok ditambahkan', 'ok'); route(); } catch (e) { toast(e.message, 'err'); } });
  $('#s_bop').onclick = ev => busy(ev.target, async () => { try { await api('stok.opname', { sku: p.sku, stok_fisik: $('#s_op').value, tanggal: today() }); closeSheet(); toast('Opname tersimpan', 'ok'); route(); } catch (e) { toast(e.message, 'err'); } });
}

/* ---------- Pengeluaran ---------- */
PAGES.pengeluaran = async () => {
  await loadMaster(); const t = today(), f = S.byF || (S.byF = { dari: t.slice(0, 8) + '01', sampai: t });
  const list = await api('biaya.list', { dari: f.dari, sampai: f.sampai });
  const tot = j => list.filter(b => b.status === 'Aktif' && b.jenis === j).reduce((s, b) => s + num(b.nominal), 0);
  $('#view').innerHTML = `<h1>Pengeluaran</h1><div class="row2">${field('Dari', `<input type="date" id="fd" value="${f.dari}">`)}${field('Sampai', `<input type="date" id="fs" value="${f.sampai}">`)}</div>
  <p class="muted">Operasional ${rp(tot('Operasional') + tot('Layanan Marketplace'))} · Persediaan ${rp(tot('Pembelian Persediaan'))} · Aset ${rp(tot('Pembelian Aset'))}</p>
  <button class="btn sm alt" id="kat">Kelola kategori</button>
  ${list.map(b => `<div class="card li ${b.status === 'Void' ? 'void' : ''}" data-id="${esc(b.id_biaya)}"><div><div class="t">${esc(b.kategori)}</div><div class="s">${b.tanggal} · ${esc(b.deskripsi)} · <span class="badge">${esc(b.jenis)}</span> ${b.status === 'Void' ? '<span class="badge b-Void">VOID</span>' : ''}</div></div><div class="t">${rp(b.nominal)}</div></div>`).join('') || '<p class="muted center">Belum ada pengeluaran pada periode ini.</p>'}
  <button class="btn fab" id="nb">+ Pengeluaran</button>`;
  ['fd', 'fs'].forEach(i => $('#' + i).onchange = () => { S.byF = { dari: $('#fd').value, sampai: $('#fs').value }; route(); });
  $('#nb').onclick = () => biayaForm(null); $('#kat').onclick = katSheet;
  document.querySelectorAll('.li[data-id]').forEach(el => el.onclick = () => biayaForm(list.find(b => b.id_biaya === el.dataset.id)));
};
function biayaForm(b) {
  const n = !b, v = b && b.status === 'Void'; b = b || { tanggal: today(), kategori: '', deskripsi: '', nominal: '', metode_bayar: 'Tunai', catatan: '' };
  const ak = S.kategori.filter(k => k.aktif === 'Ya');
  sheet(n ? 'Pengeluaran baru' : b.id_biaya, `${v ? '<div class="warn">Pengeluaran ini sudah void.</div>' : ''}${field('Tanggal', `<input type="date" id="b_t" value="${b.tanggal}">`)}
  ${field('Kategori', `<select id="b_k">${opts(ak.map(k => [k.nama, `${k.nama} (${k.jenis})`]), b.kategori)}</select>`)}
  <p class="muted">Pembelian persediaan dan aset tidak dihitung sebagai biaya di Laba Rugi.</p>
  ${field('Deskripsi', `<input id="b_d" value="${esc(b.deskripsi)}">`)}${field('Nominal (Rp)', `<input id="b_n" type="number" inputmode="numeric" min="1" value="${b.nominal}">`)}
  ${field('Metode bayar', `<select id="b_m">${opts(metodeList(), b.metode_bayar)}</select>`)}${field('Catatan', `<textarea id="b_c">${esc(b.catatan)}</textarea>`)}
  ${v ? '' : '<button class="btn" id="b_s">Simpan</button>'}${n || v ? '' : '<button class="btn red" id="b_v">Batalkan (void)</button>'}`);
  if (v) return;
  $('#b_s').onclick = ev => busy(ev.target, async () => {
    try {
      const d = { tanggal: $('#b_t').value, kategori: $('#b_k').value, deskripsi: $('#b_d').value, nominal: $('#b_n').value, metode_bayar: $('#b_m').value, catatan: $('#b_c').value };
      await api(n ? 'biaya.create' : 'biaya.update', n ? d : Object.assign({ id_biaya: b.id_biaya }, d)); closeSheet(); toast('Pengeluaran tersimpan', 'ok'); route();
    } catch (e) { toast(e.message, 'err'); }
  });
  if (!n) $('#b_v').onclick = () => {
    sheet('Batalkan pengeluaran', `<div class="warn">Data tidak dihapus, hanya ditandai VOID.</div>${field('Alasan', '<input id="v_a">')}<button class="btn red" id="v_y">Ya, batalkan</button><button class="btn alt" data-close>Tidak</button>`);
    $('#v_y').onclick = ev => busy(ev.target, async () => { try { await api('biaya.void', { id_biaya: b.id_biaya, alasan: $('#v_a').value }); closeSheet(); route(); } catch (e) { toast(e.message, 'err'); } });
  };
}
function katSheet() {
  const J = ['Operasional', 'Layanan Marketplace', 'Pembelian Persediaan', 'Pembelian Aset'];
  sheet('Kategori biaya', `${S.kategori.map(k => `<div class="card li"><div><div class="t">${esc(k.nama)}</div><div class="s">${esc(k.jenis)}${k.aktif !== 'Ya' ? ' · nonaktif' : ''}</div></div><button class="link" data-k="${esc(k.nama)}" data-j="${esc(k.jenis)}" data-a="${k.aktif === 'Ya' ? 'Tidak' : 'Ya'}">${k.aktif === 'Ya' ? 'Nonaktifkan' : 'Aktifkan'}</button></div>`).join('')}
  <h2>Tambah kategori</h2>${field('Nama', '<input id="k_n">')}${field('Jenis', `<select id="k_j">${opts(J)}</select>`)}<button class="btn" id="k_s">Tambah</button>`);
  const save = d => api('kategori.save', d).then(l => { S.kategori = l; katSheet(); }).catch(e => toast(e.message, 'err'));
  $('#k_s').onclick = () => save({ nama: $('#k_n').value, jenis: $('#k_j').value });
  document.querySelectorAll('[data-k]').forEach(el => el.onclick = () => save({ nama: el.dataset.k, jenis: el.dataset.j, aktif: el.dataset.a }));
}

/* ---------- Laporan ---------- */
PAGES.laporan = async () => {
  const tabs = [['harian', 'Harian'], ['bulanan', 'Bulanan'], ['labarugi', 'Laba Rugi'], ['stok', 'Stok'], ['neraca', 'Neraca']];
  $('#view').innerHTML = `<h1>Laporan</h1><div class="seg">${tabs.map(t => `<button data-t="${t[0]}" class="${S.lapTab === t[0] ? 'on' : ''}">${t[1]}</button>`).join('')}</div><div id="lap"></div>`;
  document.querySelectorAll('.seg button').forEach(b => b.onclick = () => { S.lapTab = b.dataset.t; route(); });
  const fn = { harian: lapHarian, bulanan: lapBulanan, labarugi: lapLabaRugi, stok: lapStok, neraca: lapNeraca }[S.lapTab];
  try { await fn(); } catch (e) { $('#lap').innerHTML = `<div class="warn">${esc(e.message)}</div>`; }
};
const L = S.lap = { tgl: today(), ch: '', y: +today().slice(0, 4), m: +today().slice(5, 7), tipe: 'bulanan', nilai: today().slice(0, 7), sampai: today() };
async function lapHarian() {
  const d = await api('laporan.harian', { tanggal: L.tgl, channel: L.ch }), r = d.ringkasan;
  $('#lap').innerHTML = `<div class="noprint"><div class="row2">${field('Tanggal', `<input type="date" id="lt" value="${L.tgl}">`)}${field('Channel', `<select id="lc"><option value="">Semua</option>${opts(CH, L.ch)}</select>`)}</div></div>
  <h2>Laporan harian ${L.tgl}</h2><div class="grid">${[['Transaksi', r.transaksi], ['Produk terjual', r.qty], ['Omzet', rp(r.omzet)], ['Total HPP', rp(r.hpp)], ['Biaya admin', rp(r.biaya_admin)], ['Keuntungan', rp(r.keuntungan)]].map(x => `<div class="card stat"><div class="l">${x[0]}</div><div class="v">${x[1]}</div></div>`).join('')}</div>
  <div class="card tw"><table><tr><th>Channel</th><th>Omzet</th><th>HPP</th><th>Biaya Admin</th><th>Keuntungan*</th></tr>${CH.map(c => { const p = r.per_channel[c]; return `<tr><td>${c}</td><td>${rp(p.omzet)}</td><td>${rp(p.hpp)}</td><td>${rp(p.biaya_admin)}</td><td>${rp(p.keuntungan)}</td></tr>`; }).join('')}</table>
  <p class="muted">*Keuntungan per channel sebelum biaya operasional umum. ${L.ch ? '' : 'Keuntungan total sudah dikurangi biaya operasional hari itu.'}</p></div>
  <h2>Detail transaksi</h2>${d.transaksi.map(t => `<div class="card li ${t.status === 'Void' ? 'void' : ''}"><div><div class="t">${esc(t.id_transaksi)}</div><div class="s">${chBadge(t.channel)} ${t.status === 'Void' ? '<span class="badge b-Void">VOID</span>' : ''}</div></div><div class="right"><div class="t">${rp(t.total_penjualan)}</div><div class="s">Laba ${rp(t.laba_bersih)}</div></div></div>`).join('') || '<p class="muted">Tidak ada transaksi.</p>'}
  <div class="noprint"><button class="btn sm" id="csv">Export CSV</button><button class="btn sm alt" onclick="window.print()">Print</button></div>`;
  $('#lt').onchange = e => { L.tgl = e.target.value; route(); }; $('#lc').onchange = e => { L.ch = e.target.value; route(); };
  $('#csv').onclick = () => downloadCSV(`laporan-harian-${L.tgl}.csv`, [['Tanggal', 'No Transaksi', 'Channel', 'Status', 'Omzet', 'HPP', 'Biaya Admin', 'Biaya Tambahan', 'Laba Bersih', 'Metode Bayar']]
    .concat(d.transaksi.map(t => [t.tanggal, t.id_transaksi, t.channel, t.status, t.total_penjualan, t.total_hpp, t.biaya_admin, t.biaya_tambahan, t.laba_bersih, t.metode_bayar])));
}
async function lapBulanan() {
  const d = await api('laporan.bulanan', { tahun: L.y, bulan: L.m }), r = d.ringkasan;
  const ys = []; for (let y = +today().slice(0, 4) - 3; y <= +today().slice(0, 4) + 1; y++) ys.push(y);
  $('#lap').innerHTML = `<div class="noprint"><div class="row2">${field('Bulan', `<select id="lm">${opts(BULAN.map((b, i) => [i + 1, b]).map(x => [String(x[0]), x[1]]), String(L.m))}</select>`)}${field('Tahun', `<select id="ly">${opts(ys.map(String), String(L.y))}</select>`)}</div></div>
  <h2>${BULAN[L.m - 1]} ${L.y}</h2><div class="grid">${[['Omzet', rp(r.omzet)], ['Total HPP', rp(r.hpp)], ['Admin marketplace', rp(r.biaya_admin)], ['Biaya operasional', rp(r.biaya_operasional + r.biaya_tambahan)], ['Keuntungan bersih', rp(r.keuntungan)], ['Transaksi', r.transaksi], ['Produk terjual', r.qty]].map(x => `<div class="card stat"><div class="l">${x[0]}</div><div class="v">${x[1]}</div></div>`).join('')}</div>
  <div class="grid2"><div class="card"><b>Omzet per hari</b>${barChart(d.seri.map(x => ({ l: x.tanggal.slice(8), v: x.omzet })))}</div><div class="card"><b>Keuntungan per hari</b>${barChart(d.seri.map(x => ({ l: x.tanggal.slice(8), v: x.keuntungan })), '#FFA83A')}</div></div>
  <div class="card"><b>Omzet per channel</b>${hBars(CH.map(c => ({ l: c, v: r.per_channel[c].omzet, c: c === 'Shopee' ? '#FFA83A' : c === 'TikTok Shop' ? '#5b8def' : '#7BA05A' })))}</div>
  <div class="card"><b>Keuntungan 6 bulan terakhir</b>${barChart(d.banding.map(x => ({ l: BULAN[+x.bulan.slice(5) - 1].slice(0, 3), v: x.keuntungan })))}</div>
  <div class="noprint"><button class="btn sm" id="csv">Export CSV</button><button class="btn sm alt" onclick="window.print()">Print</button></div>`;
  $('#lm').onchange = e => { L.m = +e.target.value; route(); }; $('#ly').onchange = e => { L.y = +e.target.value; route(); };
  $('#csv').onclick = () => downloadCSV(`laporan-bulanan-${L.y}-${String(L.m).padStart(2, '0')}.csv`, [['Tanggal', 'Omzet', 'Keuntungan']].concat(d.seri.map(x => [x.tanggal, x.omzet, x.keuntungan])));
}
async function lapLabaRugi() {
  const t = L.tipe, v = L.nilai; let dari, sampai;
  if (t === 'harian') { dari = sampai = v; } else if (t === 'bulanan') { const y = +v.slice(0, 4), m = +v.slice(5, 7); dari = v + '-01'; sampai = v + '-' + String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0'); } else { dari = v + '-01-01'; sampai = v + '-12-31'; }
  const r = await api('laporan.labaRugi', { dari, sampai }), row = (l, x, c) => `<tr class="${c || ''}"><td>${l}</td><td>${rp(x)}</td></tr>`, sec = l => `<tr class="sec"><td colspan="2">${l}</td></tr>`;
  const kv = o => Object.keys(o).map(k => row(esc(k), o[k])).join('');
  $('#lap').innerHTML = `<div class="noprint"><div class="row2">${field('Periode', `<select id="lp">${opts([['harian', 'Harian'], ['bulanan', 'Bulanan'], ['tahunan', 'Tahunan']], t)}</select>`)}
  ${field('Pilih', t === 'harian' ? `<input type="date" id="lv" value="${v}">` : t === 'bulanan' ? `<input type="month" id="lv" value="${v}">` : `<input type="number" id="lv" value="${v}" min="2000" max="2100">`)}</div></div>
  <h2>Laba Rugi ${dari}${dari !== sampai ? ' s/d ' + sampai : ''}</h2><div class="card tw"><table>
  ${sec('PENDAPATAN')}${CH.map(c => row('Penjualan ' + c, r.pendapatan[c])).join('')}${row('Total Pendapatan', r.total_pendapatan, 'tot')}
  ${sec('HARGA POKOK PENJUALAN')}${row('HPP Produk Terjual', r.total_hpp, 'tot')}${row('LABA KOTOR', r.laba_kotor, 'tot')}
  ${sec('BIAYA OPERASIONAL')}${kv(r.biaya_operasional)}${row('Biaya tambahan transaksi', r.biaya_tambahan_transaksi)}${row('Total Biaya Operasional', r.total_biaya_operasional, 'tot')}
  ${sec('BIAYA MARKETPLACE')}${row('Admin Shopee', r.admin_marketplace['Shopee'])}${row('Admin TikTok Shop', r.admin_marketplace['TikTok Shop'])}${kv(r.layanan_marketplace)}${row('Total Biaya Marketplace', r.total_biaya_marketplace, 'tot')}
  ${row('LABA BERSIH', r.laba_bersih, 'tot')}</table></div>
  <div class="noprint"><button class="btn sm" id="csv">Export CSV</button><button class="btn sm alt" onclick="window.print()">Print</button></div>`;
  $('#lp').onchange = e => { const n = e.target.value, y = today().slice(0, 4); L.tipe = n; L.nilai = n === 'harian' ? today() : n === 'bulanan' ? today().slice(0, 7) : y; route(); };
  $('#lv').onchange = e => { L.nilai = e.target.value; route(); };
  $('#csv').onclick = () => downloadCSV(`laba-rugi-${dari}_${sampai}.csv`, [['Pos', 'Nominal']].concat(CH.map(c => ['Penjualan ' + c, r.pendapatan[c]]), [['Total Pendapatan', r.total_pendapatan], ['Total HPP', r.total_hpp], ['Laba Kotor', r.laba_kotor]],
    Object.keys(r.biaya_operasional).map(k => [k, r.biaya_operasional[k]]), [['Biaya tambahan transaksi', r.biaya_tambahan_transaksi], ['Admin Shopee', r.admin_marketplace['Shopee']], ['Admin TikTok Shop', r.admin_marketplace['TikTok Shop']]],
    Object.keys(r.layanan_marketplace).map(k => [k, r.layanan_marketplace[k]]), [['Laba Bersih', r.laba_bersih]]));
}
async function lapStok() {
  const draw = async (first) => {
    const r = await api('laporan.stok'), f = (S.stokQ || '').toLowerCase();
    const rows = r.data.filter(x => (S.stokAll || x.status === 'Aktif' || x.stok !== 0) && (`${x.sku} ${x.nama_produk} ${x.varian}`).toLowerCase().includes(f));
    const body = `<div class="grid">${[['Jumlah SKU', r.total_sku], ['Total stok (unit)', r.total_unit.toLocaleString('id-ID')], ['Nilai persediaan (HPP)', rp(r.total_nilai)], ['Stok habis / minus', r.habis + ' / ' + r.minus]].map(x => `<div class="card stat"><div class="l">${x[0]}</div><div class="v">${x[1]}</div></div>`).join('')}</div>
    <div class="card tw"><table><tr><th>Produk</th><th>Masuk</th><th>Terjual</th><th>Stok</th><th>Nilai</th></tr>${rows.map(x => `<tr data-sku="${esc(x.sku)}" style="cursor:pointer"><td>${esc(x.nama_produk)} ${esc(x.varian)}<br><span class="muted">${esc(x.sku)}${x.status !== 'Aktif' ? ' · nonaktif' : ''}</span></td><td>${x.masuk}</td><td>${x.terjual}${x.terjual_hari_ini ? `<br><span class="muted">hari ini ${x.terjual_hari_ini}</span>` : ''}</td>
    <td><b class="${x.kondisi === 'Minus' ? 'neg' : ''}">${x.stok}</b>${x.kondisi !== 'Tersedia' ? `<br><span class="badge ${x.kondisi === 'Minus' ? 'b-Void' : ''}">${x.kondisi}</span>` : ''}</td><td>${rp(x.nilai)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Tidak ada produk.</td></tr>'}</table>
    <p class="muted">Masuk = stok awal + produksi/barang masuk. Terjual = penjualan bersih (sudah memperhitungkan edit dan void). Opname dicatat sebagai selisih. Nilai = stok × HPP saat ini. Ketuk baris untuk kartu stok.</p></div>`;
    if (first) $('#lap').innerHTML = `<div class="noprint">${field('Cari produk / SKU', `<input id="sq" type="search" value="${esc(S.stokQ || '')}">`)}<label><input type="checkbox" id="sa" style="width:auto;min-height:0" ${S.stokAll ? 'checked' : ''}> Tampilkan produk nonaktif tanpa stok</label></div><div id="sb"></div><p class="muted" id="sw"></p>
      <div class="noprint"><button class="btn sm" id="csv">Export CSV</button><button class="btn sm alt" id="rf">Perbarui</button><button class="btn sm alt" onclick="window.print()">Print</button></div>`;
    $('#sb').innerHTML = body; $('#sw').textContent = 'Diperbarui ' + r.waktu.slice(11) + ' · otomatis setiap 30 detik';
    document.querySelectorAll('#sb tr[data-sku]').forEach(tr => tr.onclick = () => kartuStok(tr.dataset.sku));
    S.stokData = r;
  };
  await draw(true);
  $('#sq').oninput = e => { S.stokQ = e.target.value; draw(false).catch(() => { }); };
  $('#sa').onchange = e => { S.stokAll = e.target.checked; draw(false).catch(() => { }); };
  $('#rf').onclick = () => draw(false).then(() => toast('Stok diperbarui', 'ok')).catch(e => toast(e.message, 'err'));
  $('#csv').onclick = () => downloadCSV(`laporan-stok-${today()}.csv`, [['SKU', 'Produk', 'Varian', 'Status', 'Masuk', 'Terjual', 'Opname', 'Stok', 'HPP', 'Nilai']].concat(S.stokData.data.map(x => [x.sku, x.nama_produk, x.varian, x.status, x.masuk, x.terjual, x.opname, x.stok, x.hpp_satuan, x.nilai])));
  S.timer = setInterval(() => { if (document.hidden || !$('#sb') || $('#sheet').classList.contains('open')) return; draw(false).catch(() => { }); }, 30000);
}
async function kartuStok(sku) {
  const k = await api('stok.kartu', { sku });
  sheet('Kartu stok ' + k.sku, `<p><b>${esc(k.nama_produk)} ${esc(k.varian)}</b> · stok sekarang <b>${k.stok}</b></p><div class="tw"><table><tr><th>Tanggal</th><th>Jenis</th><th>Jumlah</th><th>Saldo</th></tr>
  ${k.riwayat.map(r => `<tr><td>${r.tanggal}<br><span class="muted">${esc(r.ref || r.catatan || '')}</span></td><td>${esc(r.jenis)}</td><td class="${r.qty < 0 ? 'neg' : 'pos'}">${r.qty > 0 ? '+' : ''}${r.qty}</td><td>${r.saldo}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">Belum ada mutasi.</td></tr>'}</table></div>`);
}
async function lapNeraca() {
  const r = await api('laporan.neraca', { sampai: L.sampai }), row = (l, x, c) => `<tr class="${c || ''}"><td>${l}</td><td>${rp(x)}</td></tr>`, sec = l => `<tr class="sec"><td colspan="2">${l}</td></tr>`;
  const head = `<div class="noprint">${field('Per tanggal', `<input type="date" id="nt" value="${L.sampai}">`)}</div>`;
  if (r.kurang) {
    $('#lap').innerHTML = `${head}<div class="warn"><b>Neraca belum lengkap.</b> ${esc(r.alasan)}. Isi di Pengaturan: ${r.kurang.map(esc).join(', ')}.</div><a class="btn" href="#/pengaturan" style="text-decoration:none;text-align:center">Buka Pengaturan</a>`;
  } else {
    $('#lap').innerHTML = `${head}${r.lengkap ? '' : `<div class="warn"><b>Neraca belum seimbang</b> (selisih ${rp(r.selisih)}). ${esc(r.alasan)}. Angka tidak dipaksa seimbang.</div>`}
    <div class="card tw"><table>${sec('ASET')}${row('Kas', r.aset.kas)}${row('Saldo rekening', r.aset.saldo_rekening)}${row('Persediaan barang', r.aset.persediaan)}${row('Aset lainnya', r.aset.aset_lainnya)}${row('Total Aset', r.aset.total, 'tot')}
    ${sec('KEWAJIBAN')}${row('Utang usaha', r.kewajiban.utang_usaha)}${row('Kewajiban lainnya', r.kewajiban.kewajiban_lainnya)}${row('Total Kewajiban', r.kewajiban.total, 'tot')}
    ${sec('MODAL')}${row('Modal pemilik', r.ekuitas.modal_pemilik)}${row('Akumulasi laba ditahan', r.ekuitas.laba_ditahan)}${row('Total Ekuitas', r.ekuitas.total, 'tot')}</table></div>
    <div class="noprint"><button class="btn sm alt" onclick="window.print()">Print</button></div>`;
  }
  $('#nt').onchange = e => { L.sampai = e.target.value || today(); route(); };
}

/* ---------- Pengaturan ---------- */
PAGES.pengaturan = async () => {
  await loadMaster(); const c = S.cfg, q = getQ(), bad = JSON.parse(localStorage.getItem('yy_queue_err') || '[]');
  const inp = (k, l, t) => field(l, `<input data-s="${k}" type="${t || 'number'}" ${t ? '' : 'inputmode="numeric"'} value="${esc(c[k] === undefined ? '' : c[k])}">`);
  $('#view').innerHTML = `<h1>Pengaturan</h1><p class="muted">Masuk sebagai <b>${esc(S.nama)}</b></p>
  ${q.length ? `<div class="warn">${q.length} transaksi menunggu sinkron. <button class="link" id="sync">Kirim sekarang</button></div>` : ''}
  ${bad.length ? `<div class="warn">${bad.length} transaksi offline ditolak server: ${bad.map(b => esc(b.error)).join('; ')} <button class="link danger" id="clr">Hapus daftar</button></div>` : ''}
  <div class="card"><h2>Biaya admin marketplace (default, % dari total penjualan)</h2><div class="row2">${inp('admin_persen_shopee', 'Shopee (%)')}${inp('admin_persen_tiktok', 'TikTok Shop (%)')}</div>
  ${inp('metode_bayar', 'Metode pembayaran (pisahkan dengan koma)', 'text')}</div>
  <div class="card"><h2>Saldo awal (untuk Neraca)</h2>${inp('mulai_pembukuan', 'Mulai pembukuan', 'date')}<div class="row2">${inp('saldo_awal_kas', 'Kas (Rp)')}${inp('saldo_awal_rekening', 'Saldo rekening (Rp)')}${inp('saldo_awal_persediaan', 'Persediaan (Rp)')}${inp('saldo_awal_aset_lain', 'Aset lainnya (Rp)')}${inp('saldo_awal_utang', 'Utang usaha (Rp)')}${inp('saldo_awal_kewajiban_lain', 'Kewajiban lain (Rp)')}</div>${inp('modal_pemilik', 'Modal pemilik (Rp)')}
  <p class="muted">Isi 0 jika memang nol. Kolom kosong membuat Neraca ditandai belum lengkap.</p></div>
  <div class="card"><h2>Penyesuaian manual (boleh negatif)</h2><div class="row2">${['kas', 'rekening', 'persediaan', 'aset_lain', 'utang', 'kewajiban_lain', 'modal'].map(k => field('Adj. ' + k.replace('_', ' '), `<input data-s="adj_${k}" type="number" inputmode="numeric" value="${esc(c['adj_' + k] === undefined ? 0 : c['adj_' + k])}">`)).join('')}</div></div>
  <button class="btn" id="ss">Simpan pengaturan</button><button class="btn alt" id="lo">Keluar</button>
  <p class="muted center">URL API: ${esc(apiUrl().slice(0, 40))}… <button class="link" id="cu">Ganti URL</button></p>`;
  $('#ss').onclick = ev => busy(ev.target, async () => {
    try { const d = {}; document.querySelectorAll('[data-s]').forEach(el => d[el.dataset.s] = el.value); S.cfg = await api('pengaturan.save', d); toast('Pengaturan tersimpan', 'ok'); } catch (e) { toast(e.message, 'err'); }
  });
  $('#lo').onclick = async () => { try { await api('logout'); } catch (e) { /* abaikan */ } doLogout(false); };
  $('#cu').onclick = () => { localStorage.removeItem('yy_api'); window.YOYAI_API_URL = ''; doLogout(false); };
  if ($('#sync')) $('#sync').onclick = () => flushQueue().then(route);
  if ($('#clr')) $('#clr').onclick = () => { localStorage.removeItem('yy_queue_err'); route(); };
};

/* ---------- Init ---------- */
window.addEventListener('online', () => { netBadge(); flushQueue(); }); window.addEventListener('offline', netBadge);
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
netBadge();
(async () => {
  if (S.token && apiUrl()) { try { await loadMaster(); flushQueue(); } catch (e) { if (e.net) { const m = JSON.parse(localStorage.getItem('yy_master') || 'null'); if (m) { S.produk = m.p; S.kategori = m.k; S.cfg = m.c; } } } }
  route();
})();
