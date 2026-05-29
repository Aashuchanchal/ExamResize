/**
 * Admin Panel Controller — Extended
 * Manages: Exam Requests, Ad Campaigns, Affiliate Products
 */
(function () {
  'use strict';
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  let currentFilter = 'pending';
  let requests = [];
  let ads = [];
  let products = [];
  let isAuthenticated = false;

  // ── Init ──
  document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('admin_auth') === 'true') showPanel();
    bindLogin();
    bindLogout();
    bindMainTabs();
    bindTabs();
  });

  // ══════ AUTH ══════
  function bindLogin() {
    const form = $('#login-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if ($('#admin-password').value === ADMIN_PASSWORD) {
        sessionStorage.setItem('admin_auth', 'true');
        showPanel();
      } else {
        $('#login-error').style.display = 'block';
        $('#admin-password').value = '';
        setTimeout(() => { $('#login-error').style.display = 'none'; }, 3000);
      }
    });
  }

  function bindLogout() {
    const btn = $('#logout-btn');
    if (btn) btn.addEventListener('click', () => { sessionStorage.removeItem('admin_auth'); location.reload(); });
  }

  function showPanel() {
    isAuthenticated = true;
    $('#login-gate').style.display = 'none';
    $('#admin-panel').classList.add('visible');
    const fbReady = initFirebase();
    if (fbReady) { loadRequests(); loadAds(); loadProducts(); }
    else { $('#request-list').innerHTML = '<div class="empty-state"><span>⚠️</span><p>Firebase not configured. Add config to js/firebase-config.js</p></div>'; }
  }

  // ══════ MAIN TABS ══════
  function bindMainTabs() {
    $$('.admin-main-tab').forEach((t) => t.addEventListener('click', (e) => {
      $$('.admin-main-tab').forEach((x) => x.classList.remove('active'));
      e.target.classList.add('active');
      $$('.admin-section').forEach((s) => s.classList.remove('visible'));
      const sec = $(`#section-${e.target.dataset.section}`);
      if (sec) sec.classList.add('visible');
    }));
  }

  // ══════ EXAM REQUESTS ══════
  function bindTabs() {
    const c = $('#admin-tabs');
    if (!c) return;
    c.addEventListener('click', (e) => {
      const btn = e.target.closest('.admin-tab');
      if (!btn) return;
      $$('.admin-tab').forEach((t) => t.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderRequests();
    });
  }

  async function loadRequests() {
    try {
      const snap = await db.collection('requests').orderBy('createdAt', 'desc').get();
      requests = [];
      snap.forEach((doc) => requests.push({ id: doc.id, ...doc.data() }));
      updateStats();
      renderRequests();
    } catch (err) { console.error('Load requests error:', err); }
  }

  function updateStats() {
    const p = requests.filter((r) => r.status === 'pending').length;
    const a = requests.filter((r) => r.status === 'accepted').length;
    const r = requests.filter((r) => r.status === 'rejected').length;
    if ($('#stat-pending')) $('#stat-pending').textContent = p;
    if ($('#stat-accepted')) $('#stat-accepted').textContent = a;
    if ($('#stat-rejected')) $('#stat-rejected').textContent = r;
  }

  function renderRequests() {
    const list = $('#request-list');
    if (!list) return;
    const filtered = currentFilter === 'all' ? requests : requests.filter((r) => r.status === currentFilter);
    if (filtered.length === 0) { list.innerHTML = `<div class="empty-state"><span>${currentFilter === 'pending' ? '🎉' : '📭'}</span><p>No ${currentFilter} requests</p></div>`; return; }
    list.innerHTML = filtered.map((req) => `
      <div class="request-card" data-id="${req.id}">
        <div class="request-card-header"><span class="request-exam-name">${esc(req.examName)}</span><span class="request-status ${req.status}">${req.status}</span></div>
        <div class="request-meta"><span>📧 ${esc(req.email)}</span><span>📅 ${req.createdAt ? new Date(req.createdAt.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown'}</span></div>
        ${req.message ? `<div class="request-message">${esc(req.message)}</div>` : ''}
        ${req.status === 'pending' ? `<div class="request-actions">
          <button class="btn-ai" onclick="aiAutofill('${req.id}','${esc(req.examName)}')">🤖 AI Autofill</button>
          <button class="btn-accept" onclick="openSpecEditor('${req.id}','${esc(req.examName)}')">✅ Accept</button>
          <button class="btn-reject" onclick="rejectRequest('${req.id}')">❌ Reject</button>
        </div>
        <div class="spec-editor" id="editor-${req.id}">
          <div class="ai-loading" id="ai-loading-${req.id}" style="display:none"><span class="spinner"></span> AI fetching specs...</div>
          <h4>📝 Exam Specifications</h4>
          <div class="spec-editor-grid">
            <div class="form-group"><label>Exam ID</label><input id="spec-id-${req.id}" placeholder="e.g. gate-cs"></div>
            <div class="form-group"><label>Full Name</label><input id="spec-fullname-${req.id}"></div>
            <div class="form-group"><label>Category</label><select id="spec-category-${req.id}"><option value="ssc">SSC</option><option value="banking">Banking</option><option value="upsc">UPSC</option><option value="nta">NTA</option><option value="railway">Railway</option><option value="board">Board</option></select></div>
            <div class="form-group"><label>Color</label><input type="color" id="spec-color-${req.id}" value="#6366f1"></div>
          </div>
          <div class="doc-section"><h5>📷 Photo</h5><div class="spec-editor-grid">
            <div class="form-group"><label>Min KB</label><input type="number" id="spec-photo-min-${req.id}" value="20"></div>
            <div class="form-group"><label>Max KB</label><input type="number" id="spec-photo-max-${req.id}" value="50"></div>
            <div class="form-group"><label>Width</label><input type="number" step="0.1" id="spec-photo-w-${req.id}" value="3.5"></div>
            <div class="form-group"><label>Height</label><input type="number" step="0.1" id="spec-photo-h-${req.id}" value="4.5"></div>
            <div class="form-group"><label>Unit</label><select id="spec-photo-unit-${req.id}"><option value="cm">cm</option><option value="px">px</option></select></div>
            <div class="form-group"><label>DPI</label><input type="number" id="spec-photo-dpi-${req.id}" value="300"></div>
            <div class="form-group spec-editor-full"><label>Guidelines</label><textarea id="spec-photo-guide-${req.id}" rows="2"></textarea></div>
          </div></div>
          <div class="doc-section"><h5>✍️ Signature</h5><div class="spec-editor-grid">
            <div class="form-group"><label>Min KB</label><input type="number" id="spec-sig-min-${req.id}" value="10"></div>
            <div class="form-group"><label>Max KB</label><input type="number" id="spec-sig-max-${req.id}" value="20"></div>
            <div class="form-group"><label>Width</label><input type="number" step="0.1" id="spec-sig-w-${req.id}" value="6.0"></div>
            <div class="form-group"><label>Height</label><input type="number" step="0.1" id="spec-sig-h-${req.id}" value="2.0"></div>
            <div class="form-group"><label>Unit</label><select id="spec-sig-unit-${req.id}"><option value="cm">cm</option><option value="px">px</option></select></div>
            <div class="form-group"><label>DPI</label><input type="number" id="spec-sig-dpi-${req.id}" value="300"></div>
            <div class="form-group spec-editor-full"><label>Guidelines</label><textarea id="spec-sig-guide-${req.id}" rows="2"></textarea></div>
          </div></div>
          <button class="save-spec-btn" onclick="saveExamSpec('${req.id}')">💾 Save & Approve</button>
        </div>` : ''}
      </div>`).join('');
  }

  window.openSpecEditor = function (id, name) {
    const ed = $(`#editor-${id}`); if (ed) ed.classList.toggle('visible');
    const idInp = $(`#spec-id-${id}`), fnInp = $(`#spec-fullname-${id}`);
    if (idInp && !idInp.value) idInp.value = name.toLowerCase().replace(/\s+/g, '-');
    if (fnInp && !fnInp.value) fnInp.value = name;
  };

  window.aiAutofill = async function (id, name) {
    if (GEMINI_API_KEY === 'PASTE_YOUR_GEMINI_API_KEY_HERE') { showToast('Gemini API key not set', 'error'); return; }
    const ed = $(`#editor-${id}`), ld = $(`#ai-loading-${id}`);
    if (ed) ed.classList.add('visible');
    if (ld) ld.style.display = 'flex';
    const prompt = `Return ONLY JSON for "${name}" exam photo/signature specs: {"fullName":"","category":"ssc|banking|upsc|nta|railway|board","photo":{"minKB":20,"maxKB":50,"width":3.5,"height":4.5,"unit":"cm","dpi":300,"guidelines":[]},"signature":{"minKB":10,"maxKB":20,"width":6,"height":2,"unit":"cm","dpi":300,"guidelines":[]}}`;
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 1024 } })
      });
      const data = await res.json();
      let txt = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (txt.startsWith('```')) txt = txt.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      const specs = JSON.parse(txt);
      fillSpecs(id, name, specs);
      showToast('AI filled specs! Review and save.', 'success');
    } catch (e) { console.error(e); showToast('AI failed. Fill manually.', 'error'); }
    finally { if (ld) ld.style.display = 'none'; }
  };

  function fillSpecs(id, name, s) {
    const sv = (fid, v) => { const el = $(`#${fid}`); if (el && v != null) el.value = v; };
    sv(`spec-id-${id}`, name.toLowerCase().replace(/\s+/g, '-'));
    sv(`spec-fullname-${id}`, s.fullName || name);
    sv(`spec-category-${id}`, s.category || 'nta');
    if (s.photo) { sv(`spec-photo-min-${id}`, s.photo.minKB); sv(`spec-photo-max-${id}`, s.photo.maxKB); sv(`spec-photo-w-${id}`, s.photo.width); sv(`spec-photo-h-${id}`, s.photo.height); sv(`spec-photo-unit-${id}`, s.photo.unit); sv(`spec-photo-dpi-${id}`, s.photo.dpi || 300); sv(`spec-photo-guide-${id}`, (s.photo.guidelines || []).join('\n')); }
    if (s.signature) { sv(`spec-sig-min-${id}`, s.signature.minKB); sv(`spec-sig-max-${id}`, s.signature.maxKB); sv(`spec-sig-w-${id}`, s.signature.width); sv(`spec-sig-h-${id}`, s.signature.height); sv(`spec-sig-unit-${id}`, s.signature.unit); sv(`spec-sig-dpi-${id}`, s.signature.dpi || 300); sv(`spec-sig-guide-${id}`, (s.signature.guidelines || []).join('\n')); }
  }

  window.saveExamSpec = async function (reqId) {
    const gv = (fid) => { const el = $(`#${fid}`); return el ? el.value : ''; };
    const gn = (fid) => { const el = $(`#${fid}`); return el ? parseFloat(el.value) || 0 : 0; };
    const examId = gv(`spec-id-${reqId}`).trim(), fullName = gv(`spec-fullname-${reqId}`).trim();
    if (!examId || !fullName) { showToast('Fill Exam ID and Full Name', 'error'); return; }
    const req = requests.find((r) => r.id === reqId);
    const examData = { id: examId, name: req ? req.examName : fullName, fullName, category: gv(`spec-category-${reqId}`), color: gv(`spec-color-${reqId}`),
      documents: [
        { type: 'photo', label: 'Photograph', format: 'JPEG/JPG', fileSize: { min: gn(`spec-photo-min-${reqId}`), max: gn(`spec-photo-max-${reqId}`) }, dimensions: { width: gn(`spec-photo-w-${reqId}`), height: gn(`spec-photo-h-${reqId}`), unit: gv(`spec-photo-unit-${reqId}`) }, dpi: gn(`spec-photo-dpi-${reqId}`) || null, guidelines: gv(`spec-photo-guide-${reqId}`).split('\n').filter((l) => l.trim()) },
        { type: 'signature', label: 'Signature', format: 'JPEG/JPG', fileSize: { min: gn(`spec-sig-min-${reqId}`), max: gn(`spec-sig-max-${reqId}`) }, dimensions: { width: gn(`spec-sig-w-${reqId}`), height: gn(`spec-sig-h-${reqId}`), unit: gv(`spec-sig-unit-${reqId}`) }, dpi: gn(`spec-sig-dpi-${reqId}`) || null, guidelines: gv(`spec-sig-guide-${reqId}`).split('\n').filter((l) => l.trim()) }
      ], addedAt: firebase.firestore.FieldValue.serverTimestamp() };
    try {
      await db.collection('approved_exams').doc(examId).set(examData);
      await db.collection('requests').doc(reqId).update({ status: 'accepted', reviewedAt: firebase.firestore.FieldValue.serverTimestamp() });
      showToast(`✅ ${examData.name} added!`, 'success');
      await loadRequests();
    } catch (e) { console.error(e); showToast('Save failed', 'error'); }
  };

  window.rejectRequest = async function (id) {
    if (!confirm('Reject this request?')) return;
    try { await db.collection('requests').doc(id).update({ status: 'rejected', reviewedAt: firebase.firestore.FieldValue.serverTimestamp() }); showToast('Rejected', 'info'); await loadRequests(); }
    catch (e) { showToast('Failed', 'error'); }
  };

  // ══════ ADS ══════
  async function loadAds() {
    try {
      const snap = await db.collection('ads').get();
      ads = []; snap.forEach((doc) => ads.push({ id: doc.id, ...doc.data() }));
      renderAds(); renderAdMetrics();
    } catch (e) { console.warn('Load ads:', e); }
    bindAdForm();
  }

  function renderAdMetrics() {
    const total = ads.length;
    const active = ads.filter((a) => a.enabled).length;
    const impressions = ads.reduce((s, a) => s + (a.impressions || 0), 0);
    const clicks = ads.reduce((s, a) => s + (a.clicks || 0), 0);
    const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
    $('#ad-metrics').innerHTML = `
      <div class="metric-card"><div class="metric-val" style="color:var(--accent-1)">${total}</div><div class="metric-lbl">Total Ads</div></div>
      <div class="metric-card"><div class="metric-val" style="color:var(--success)">${active}</div><div class="metric-lbl">Active</div></div>
      <div class="metric-card"><div class="metric-val" style="color:var(--accent-3)">${impressions.toLocaleString()}</div><div class="metric-lbl">Impressions</div></div>
      <div class="metric-card"><div class="metric-val" style="color:var(--warning)">${clicks.toLocaleString()}</div><div class="metric-lbl">Clicks</div></div>
      <div class="metric-card"><div class="metric-val">${ctr}%</div><div class="metric-lbl">CTR</div></div>`;
  }

  function renderAds() {
    const list = $('#ad-list');
    if (ads.length === 0) { list.innerHTML = '<div class="empty-state"><span>📢</span><p>No ads yet. Create one above.</p></div>'; return; }
    list.innerHTML = ads.map((a) => `
      <div class="ad-item"><div class="ad-item-info">
        <div class="ad-item-title">${esc(a.title)}</div>
        <div class="ad-item-meta"><span>📍 ${a.position}</span><span>${a.enabled ? '🟢 Active' : '🔴 Disabled'}</span><span>👁 ${a.impressions || 0} imp</span><span>👆 ${a.clicks || 0} clicks</span></div>
      </div><div class="ad-item-actions">
        <button class="btn-sm toggle" onclick="toggleAd('${a.id}',${!a.enabled})">${a.enabled ? 'Disable' : 'Enable'}</button>
        <button class="btn-sm edit" onclick="editAd('${a.id}')">Edit</button>
        <button class="btn-sm delete" onclick="deleteAd('${a.id}')">Delete</button>
      </div></div>`).join('');
  }

  function bindAdForm() {
    $('#ad-save-btn').addEventListener('click', saveAd);
    $('#ad-cancel-btn').addEventListener('click', () => { resetAdForm(); });
  }

  async function saveAd() {
    const title = $('#ad-title').value.trim(), dest = $('#ad-destination').value.trim();
    if (!title || !dest) { showToast('Fill title and destination URL', 'error'); return; }
    const data = { title, position: $('#ad-position').value, imageUrl: $('#ad-image').value.trim(), destinationUrl: dest, description: $('#ad-description').value.trim(), ctaText: $('#ad-cta').value.trim() || 'Learn More', startDate: $('#ad-start').value || null, endDate: $('#ad-end').value || null, enabled: true, impressions: 0, clicks: 0 };
    const editId = $('#ad-edit-id').value;
    try {
      if (editId) { await db.collection('ads').doc(editId).update(data); showToast('Ad updated', 'success'); }
      else { await db.collection('ads').add(data); showToast('Ad created', 'success'); }
      resetAdForm(); await loadAds();
    } catch (e) { showToast('Failed to save ad', 'error'); }
  }

  window.editAd = function (id) {
    const a = ads.find((x) => x.id === id); if (!a) return;
    $('#ad-edit-id').value = id;
    $('#ad-title').value = a.title; $('#ad-position').value = a.position;
    $('#ad-image').value = a.imageUrl || ''; $('#ad-destination').value = a.destinationUrl;
    $('#ad-description').value = a.description || ''; $('#ad-cta').value = a.ctaText || '';
    $('#ad-start').value = a.startDate || ''; $('#ad-end').value = a.endDate || '';
    $('#ad-form-title').textContent = '✏️ Edit Ad';
    $('#ad-cancel-btn').style.display = 'inline-block';
    $('#ad-form').scrollIntoView({ behavior: 'smooth' });
  };

  window.toggleAd = async function (id, enabled) {
    try { await db.collection('ads').doc(id).update({ enabled }); showToast(enabled ? 'Ad enabled' : 'Ad disabled', 'success'); await loadAds(); }
    catch { showToast('Failed', 'error'); }
  };

  window.deleteAd = async function (id) {
    if (!confirm('Delete this ad?')) return;
    try { await db.collection('ads').doc(id).delete(); showToast('Ad deleted', 'info'); await loadAds(); }
    catch { showToast('Failed', 'error'); }
  };

  function resetAdForm() {
    $('#ad-edit-id').value = ''; $('#ad-title').value = ''; $('#ad-image').value = ''; $('#ad-destination').value = '';
    $('#ad-description').value = ''; $('#ad-cta').value = 'Learn More'; $('#ad-start').value = ''; $('#ad-end').value = '';
    $('#ad-form-title').textContent = '➕ Create New Ad';
    $('#ad-cancel-btn').style.display = 'none';
  }

  // ══════ PRODUCTS ══════
  async function loadProducts() {
    try {
      const snap = await db.collection('products').get();
      products = []; snap.forEach((doc) => products.push({ id: doc.id, ...doc.data() }));
      renderProducts(); renderProductMetrics();
    } catch (e) { console.warn('Load products:', e); }
    bindProductForm();
  }

  function renderProductMetrics() {
    const total = products.length;
    const active = products.filter((p) => p.enabled !== false).length;
    const clicks = products.reduce((s, p) => s + (p.clicks || 0), 0);
    $('#product-metrics').innerHTML = `
      <div class="metric-card"><div class="metric-val" style="color:var(--accent-1)">${total}</div><div class="metric-lbl">Products</div></div>
      <div class="metric-card"><div class="metric-val" style="color:var(--success)">${active}</div><div class="metric-lbl">Active</div></div>
      <div class="metric-card"><div class="metric-val" style="color:var(--warning)">${clicks.toLocaleString()}</div><div class="metric-lbl">Total Clicks</div></div>`;
  }

  function renderProducts() {
    const list = $('#product-list');
    if (products.length === 0) { list.innerHTML = '<div class="empty-state"><span>🛍️</span><p>No products yet. Add one above.</p></div>'; return; }
    list.innerHTML = products.map((p) => `
      <div class="product-item"><div class="product-item-info">
        <div class="product-item-title">${esc(p.title)}</div>
        <div class="product-item-meta"><span>💰 ₹${p.price}</span><span>🏷️ ${p.platform}</span><span>📁 ${p.category}</span><span>👆 ${p.clicks || 0} clicks</span><span>${p.enabled !== false ? '🟢' : '🔴'}</span></div>
      </div><div class="product-item-actions">
        <button class="btn-sm toggle" onclick="toggleProduct('${p.id}',${p.enabled === false})">${p.enabled !== false ? 'Disable' : 'Enable'}</button>
        <button class="btn-sm edit" onclick="editProduct('${p.id}')">Edit</button>
        <button class="btn-sm delete" onclick="deleteProduct('${p.id}')">Delete</button>
      </div></div>`).join('');
  }

  function bindProductForm() {
    $('#prod-save-btn').addEventListener('click', saveProduct);
    $('#prod-cancel-btn').addEventListener('click', resetProductForm);
  }

  async function saveProduct() {
    const title = $('#prod-title').value.trim(), price = parseFloat($('#prod-price').value);
    const aff = $('#prod-affiliate').value.trim();
    if (!title || !price || !aff) { showToast('Fill title, price, and affiliate URL', 'error'); return; }
    const origPrice = parseFloat($('#prod-original').value) || null;
    const data = { title, description: $('#prod-desc').value.trim(), price, originalPrice: origPrice, discount: origPrice ? Math.round((1 - price / origPrice) * 100) : null, platform: $('#prod-platform').value, category: $('#prod-category').value, imageUrl: $('#prod-image').value.trim(), affiliateUrl: aff, enabled: true, clicks: 0 };
    const editId = $('#prod-edit-id').value;
    try {
      if (editId) { await db.collection('products').doc(editId).update(data); showToast('Product updated', 'success'); }
      else { await db.collection('products').add(data); showToast('Product added', 'success'); }
      resetProductForm(); await loadProducts();
    } catch (e) { showToast('Failed to save product', 'error'); }
  }

  window.editProduct = function (id) {
    const p = products.find((x) => x.id === id); if (!p) return;
    $('#prod-edit-id').value = id; $('#prod-title').value = p.title; $('#prod-desc').value = p.description || '';
    $('#prod-price').value = p.price; $('#prod-original').value = p.originalPrice || '';
    $('#prod-platform').value = p.platform || 'amazon'; $('#prod-category').value = p.category || 'books';
    $('#prod-image').value = p.imageUrl || ''; $('#prod-affiliate').value = p.affiliateUrl || '';
    $('#product-form-title').textContent = '✏️ Edit Product';
    $('#prod-cancel-btn').style.display = 'inline-block';
    $('#product-form').scrollIntoView({ behavior: 'smooth' });
  };

  window.toggleProduct = async function (id, enable) {
    try { await db.collection('products').doc(id).update({ enabled: enable }); showToast(enable ? 'Enabled' : 'Disabled', 'success'); await loadProducts(); }
    catch { showToast('Failed', 'error'); }
  };

  window.deleteProduct = async function (id) {
    if (!confirm('Delete this product?')) return;
    try { await db.collection('products').doc(id).delete(); showToast('Product deleted', 'info'); await loadProducts(); }
    catch { showToast('Failed', 'error'); }
  };

  function resetProductForm() {
    $('#prod-edit-id').value = ''; $('#prod-title').value = ''; $('#prod-desc').value = '';
    $('#prod-price').value = ''; $('#prod-original').value = ''; $('#prod-image').value = ''; $('#prod-affiliate').value = '';
    $('#product-form-title').textContent = '➕ Add New Product';
    $('#prod-cancel-btn').style.display = 'none';
  }

  // ══════ HELPERS ══════
  function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
  function showToast(msg, type) {
    const c = $('#toast-container'); if (!c) return;
    const t = document.createElement('div'); t.className = `toast toast-${type || 'info'}`;
    t.innerHTML = `<span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span><span>${msg}</span>`;
    c.appendChild(t); requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
  }
})();
