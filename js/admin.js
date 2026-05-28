/**
 * Admin Panel Controller
 * Manages exam requests, spec editor, and Gemini AI autofill.
 */

(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  let currentFilter = 'pending';
  let requests = [];
  let isAuthenticated = false;

  // ── Init ──
  document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in this session
    if (sessionStorage.getItem('admin_auth') === 'true') {
      showPanel();
    }
    bindLogin();
    bindLogout();
    bindTabs();
  });

  // ── Login ──
  function bindLogin() {
    const form = $('#login-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const pwd = $('#admin-password').value;
      if (pwd === ADMIN_PASSWORD) {
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
    if (!btn) return;
    btn.addEventListener('click', () => {
      sessionStorage.removeItem('admin_auth');
      location.reload();
    });
  }

  function showPanel() {
    isAuthenticated = true;
    $('#login-gate').style.display = 'none';
    $('#admin-panel').classList.add('visible');

    const fbReady = initFirebase();
    if (fbReady) {
      loadRequests();
    } else {
      $('#request-list').innerHTML = '<div class="empty-state"><span>⚠️</span><p>Firebase not configured. Please add your Firebase config to js/firebase-config.js</p></div>';
    }
  }

  // ── Tabs ──
  function bindTabs() {
    const container = $('#admin-tabs');
    if (!container) return;

    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.admin-tab');
      if (!btn) return;
      $$('.admin-tab').forEach((t) => t.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderRequests();
    });
  }

  // ── Load Requests ──
  async function loadRequests() {
    try {
      const snapshot = await db.collection('requests').orderBy('createdAt', 'desc').get();
      requests = [];
      snapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() });
      });
      updateStats();
      renderRequests();
    } catch (err) {
      console.error('Error loading requests:', err);
      showToast('Failed to load requests', 'error');
    }
  }

  function updateStats() {
    const pending = requests.filter((r) => r.status === 'pending').length;
    const accepted = requests.filter((r) => r.status === 'accepted').length;
    const rejected = requests.filter((r) => r.status === 'rejected').length;

    $('#stat-pending').textContent = pending;
    $('#stat-accepted').textContent = accepted;
    $('#stat-rejected').textContent = rejected;
  }

  // ── Render Requests ──
  function renderRequests() {
    const list = $('#request-list');
    if (!list) return;

    const filtered = currentFilter === 'all'
      ? requests
      : requests.filter((r) => r.status === currentFilter);

    if (filtered.length === 0) {
      list.innerHTML = `<div class="empty-state"><span>${currentFilter === 'pending' ? '🎉' : '📭'}</span><p>No ${currentFilter} requests</p></div>`;
      return;
    }

    list.innerHTML = filtered.map((req) => `
      <div class="request-card" data-id="${req.id}">
        <div class="request-card-header">
          <span class="request-exam-name">${escapeHtml(req.examName)}</span>
          <span class="request-status ${req.status}">${req.status}</span>
        </div>
        <div class="request-meta">
          <span>📧 ${escapeHtml(req.email)}</span>
          <span>📅 ${req.createdAt ? new Date(req.createdAt.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown'}</span>
        </div>
        ${req.message ? `<div class="request-message">${escapeHtml(req.message)}</div>` : ''}
        ${req.status === 'pending' ? `
          <div class="request-actions">
            <button class="btn-ai" onclick="aiAutofill('${req.id}', '${escapeHtml(req.examName)}')">🤖 AI Autofill</button>
            <button class="btn-accept" onclick="openSpecEditor('${req.id}', '${escapeHtml(req.examName)}')">✅ Accept & Add Specs</button>
            <button class="btn-reject" onclick="rejectRequest('${req.id}')">❌ Reject</button>
          </div>
          <div class="spec-editor" id="editor-${req.id}">
            <div class="ai-loading" id="ai-loading-${req.id}" style="display:none">
              <span class="spinner"></span> AI is fetching exam specifications...
            </div>
            <h4>📝 Exam Specifications</h4>
            <div class="spec-editor-grid">
              <div class="form-group"><label>Exam ID (slug)</label><input id="spec-id-${req.id}" placeholder="e.g., gate-cs"></div>
              <div class="form-group"><label>Full Name</label><input id="spec-fullname-${req.id}" placeholder="Full exam name"></div>
              <div class="form-group"><label>Category</label>
                <select id="spec-category-${req.id}">
                  <option value="ssc">SSC</option><option value="banking">Banking</option>
                  <option value="upsc">UPSC</option><option value="nta">NTA</option>
                  <option value="railway">Railway</option><option value="board">Board</option>
                </select>
              </div>
              <div class="form-group"><label>Card Color</label><input type="color" id="spec-color-${req.id}" value="#6366f1"></div>
            </div>

            <div class="doc-section">
              <h5>📷 Photograph</h5>
              <div class="spec-editor-grid">
                <div class="form-group"><label>Min Size (KB)</label><input type="number" id="spec-photo-min-${req.id}" value="20"></div>
                <div class="form-group"><label>Max Size (KB)</label><input type="number" id="spec-photo-max-${req.id}" value="50"></div>
                <div class="form-group"><label>Width</label><input type="number" step="0.1" id="spec-photo-w-${req.id}" value="3.5"></div>
                <div class="form-group"><label>Height</label><input type="number" step="0.1" id="spec-photo-h-${req.id}" value="4.5"></div>
                <div class="form-group"><label>Unit</label>
                  <select id="spec-photo-unit-${req.id}"><option value="cm">cm</option><option value="px">px</option></select>
                </div>
                <div class="form-group"><label>DPI</label><input type="number" id="spec-photo-dpi-${req.id}" value="300"></div>
                <div class="form-group spec-editor-full"><label>Guidelines (one per line)</label>
                  <textarea id="spec-photo-guide-${req.id}" rows="3" placeholder="Recent passport-size photo&#10;White background"></textarea>
                </div>
              </div>
            </div>

            <div class="doc-section">
              <h5>✍️ Signature</h5>
              <div class="spec-editor-grid">
                <div class="form-group"><label>Min Size (KB)</label><input type="number" id="spec-sig-min-${req.id}" value="10"></div>
                <div class="form-group"><label>Max Size (KB)</label><input type="number" id="spec-sig-max-${req.id}" value="20"></div>
                <div class="form-group"><label>Width</label><input type="number" step="0.1" id="spec-sig-w-${req.id}" value="6.0"></div>
                <div class="form-group"><label>Height</label><input type="number" step="0.1" id="spec-sig-h-${req.id}" value="2.0"></div>
                <div class="form-group"><label>Unit</label>
                  <select id="spec-sig-unit-${req.id}"><option value="cm">cm</option><option value="px">px</option></select>
                </div>
                <div class="form-group"><label>DPI</label><input type="number" id="spec-sig-dpi-${req.id}" value="300"></div>
                <div class="form-group spec-editor-full"><label>Guidelines (one per line)</label>
                  <textarea id="spec-sig-guide-${req.id}" rows="3" placeholder="Sign on white paper with black ink&#10;Must be horizontally aligned"></textarea>
                </div>
              </div>
            </div>

            <button class="save-spec-btn" onclick="saveExamSpec('${req.id}')">💾 Save & Approve Exam</button>
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  // ── Open Spec Editor ──
  window.openSpecEditor = function (reqId, examName) {
    const editor = $(`#editor-${reqId}`);
    if (editor) {
      editor.classList.toggle('visible');
      // Pre-fill exam name
      const idInput = $(`#spec-id-${reqId}`);
      const fullnameInput = $(`#spec-fullname-${reqId}`);
      if (idInput && !idInput.value) idInput.value = examName.toLowerCase().replace(/\s+/g, '-');
      if (fullnameInput && !fullnameInput.value) fullnameInput.value = examName;
    }
  };

  // ── AI Autofill with Gemini ──
  window.aiAutofill = async function (reqId, examName) {
    if (GEMINI_API_KEY === 'PASTE_YOUR_GEMINI_API_KEY_HERE') {
      showToast('Gemini API key not configured. Add it in js/firebase-config.js', 'error');
      return;
    }

    // Show editor and loading
    const editor = $(`#editor-${reqId}`);
    const loading = $(`#ai-loading-${reqId}`);
    if (editor) editor.classList.add('visible');
    if (loading) loading.style.display = 'flex';

    const prompt = `You are an expert on Indian government examination application requirements. I need the exact photo and signature upload specifications for the "${examName}" exam.

Return ONLY a JSON object (no markdown, no code blocks, no explanation) with this exact structure:
{
  "fullName": "Full official name of the exam",
  "category": "one of: ssc, banking, upsc, nta, railway, board",
  "photo": {
    "minKB": 20, "maxKB": 50,
    "width": 3.5, "height": 4.5, "unit": "cm",
    "dpi": 300,
    "guidelines": ["guideline 1", "guideline 2"]
  },
  "signature": {
    "minKB": 10, "maxKB": 20,
    "width": 6.0, "height": 2.0, "unit": "cm",
    "dpi": 300,
    "guidelines": ["guideline 1", "guideline 2"]
  }
}

Use the most recent and commonly accepted specifications. If dimensions are typically in pixels, use "px" as unit and set dpi to null. Be accurate.`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
          }),
        }
      );

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Parse JSON from response (handle possible markdown code blocks)
      let jsonStr = text.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      }

      const specs = JSON.parse(jsonStr);
      fillSpecEditor(reqId, examName, specs);
      showToast('AI filled exam specifications! Please review.', 'success');
    } catch (err) {
      console.error('AI autofill error:', err);
      showToast('AI autofill failed. Please fill specs manually.', 'error');
    } finally {
      if (loading) loading.style.display = 'none';
    }
  };

  function fillSpecEditor(reqId, examName, specs) {
    const setVal = (id, val) => { const el = $(`#${id}`); if (el && val !== undefined && val !== null) el.value = val; };

    setVal(`spec-id-${reqId}`, examName.toLowerCase().replace(/\s+/g, '-'));
    setVal(`spec-fullname-${reqId}`, specs.fullName || examName);
    setVal(`spec-category-${reqId}`, specs.category || 'nta');

    // Photo
    if (specs.photo) {
      setVal(`spec-photo-min-${reqId}`, specs.photo.minKB);
      setVal(`spec-photo-max-${reqId}`, specs.photo.maxKB);
      setVal(`spec-photo-w-${reqId}`, specs.photo.width);
      setVal(`spec-photo-h-${reqId}`, specs.photo.height);
      setVal(`spec-photo-unit-${reqId}`, specs.photo.unit);
      setVal(`spec-photo-dpi-${reqId}`, specs.photo.dpi || 300);
      setVal(`spec-photo-guide-${reqId}`, (specs.photo.guidelines || []).join('\n'));
    }

    // Signature
    if (specs.signature) {
      setVal(`spec-sig-min-${reqId}`, specs.signature.minKB);
      setVal(`spec-sig-max-${reqId}`, specs.signature.maxKB);
      setVal(`spec-sig-w-${reqId}`, specs.signature.width);
      setVal(`spec-sig-h-${reqId}`, specs.signature.height);
      setVal(`spec-sig-unit-${reqId}`, specs.signature.unit);
      setVal(`spec-sig-dpi-${reqId}`, specs.signature.dpi || 300);
      setVal(`spec-sig-guide-${reqId}`, (specs.signature.guidelines || []).join('\n'));
    }
  }

  // ── Save Exam Spec ──
  window.saveExamSpec = async function (reqId) {
    const getVal = (id) => { const el = $(`#${id}`); return el ? el.value : ''; };
    const getNum = (id) => { const el = $(`#${id}`); return el ? parseFloat(el.value) || 0 : 0; };

    const examId = getVal(`spec-id-${reqId}`).trim();
    const fullName = getVal(`spec-fullname-${reqId}`).trim();
    const category = getVal(`spec-category-${reqId}`);
    const color = getVal(`spec-color-${reqId}`);

    if (!examId || !fullName) {
      showToast('Please fill in Exam ID and Full Name', 'error');
      return;
    }

    const req = requests.find((r) => r.id === reqId);
    const examName = req ? req.examName : fullName;

    const examData = {
      id: examId,
      name: examName,
      fullName,
      category,
      color,
      documents: [
        {
          type: 'photo',
          label: 'Photograph',
          format: 'JPEG/JPG',
          fileSize: { min: getNum(`spec-photo-min-${reqId}`), max: getNum(`spec-photo-max-${reqId}`) },
          dimensions: {
            width: getNum(`spec-photo-w-${reqId}`),
            height: getNum(`spec-photo-h-${reqId}`),
            unit: getVal(`spec-photo-unit-${reqId}`)
          },
          dpi: getNum(`spec-photo-dpi-${reqId}`) || null,
          guidelines: getVal(`spec-photo-guide-${reqId}`).split('\n').filter((l) => l.trim())
        },
        {
          type: 'signature',
          label: 'Signature',
          format: 'JPEG/JPG',
          fileSize: { min: getNum(`spec-sig-min-${reqId}`), max: getNum(`spec-sig-max-${reqId}`) },
          dimensions: {
            width: getNum(`spec-sig-w-${reqId}`),
            height: getNum(`spec-sig-h-${reqId}`),
            unit: getVal(`spec-sig-unit-${reqId}`)
          },
          dpi: getNum(`spec-sig-dpi-${reqId}`) || null,
          guidelines: getVal(`spec-sig-guide-${reqId}`).split('\n').filter((l) => l.trim())
        }
      ],
      addedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      // Save to approved_exams
      await db.collection('approved_exams').doc(examId).set(examData);

      // Update request status
      await db.collection('requests').doc(reqId).update({
        status: 'accepted',
        reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      showToast(`✅ ${examName} added successfully! It will now appear on the main site.`, 'success');
      await loadRequests();
    } catch (err) {
      console.error('Save error:', err);
      showToast('Failed to save exam. Please try again.', 'error');
    }
  };

  // ── Reject Request ──
  window.rejectRequest = async function (reqId) {
    if (!confirm('Are you sure you want to reject this request?')) return;

    try {
      await db.collection('requests').doc(reqId).update({
        status: 'rejected',
        reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      showToast('Request rejected', 'info');
      await loadRequests();
    } catch (err) {
      console.error('Reject error:', err);
      showToast('Failed to reject request', 'error');
    }
  };

  // ── Helpers ──
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function showToast(message, type = 'info') {
    const container = $('#toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
})();
