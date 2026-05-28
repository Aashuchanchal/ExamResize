/**
 * Exam Image Resizer — Main Application Controller
 */

(function () {
  'use strict';

  // ── State ──
  let selectedExam = null;
  let selectedDocType = null;
  let uploadedFile = null;
  let processedResult = null;
  let activeCategory = 'all';
  let customExams = []; // Loaded from Firestore

  // ── DOM References ──
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ── Init ──
  document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Firebase
    const fbReady = initFirebase();

    // Load custom exams from Firestore
    if (fbReady) {
      await loadCustomExams();
    }

    renderExamCards();
    bindCategoryTabs();
    bindSearch();
    bindUploadZone();
    bindDocTypeTabs();
    bindProcessBtn();
    bindDownloadBtn();
    bindResetBtn();
    bindRequestModal();
    initScrollAnimations();
    initParticles();
    updateExamCount();
  });

  // ── Load Custom Exams from Firestore ──
  async function loadCustomExams() {
    try {
      const snapshot = await db.collection('approved_exams').get();
      customExams = [];
      snapshot.forEach((doc) => {
        customExams.push({ ...doc.data(), _firestoreId: doc.id, _isCustom: true });
      });
      console.log(`Loaded ${customExams.length} custom exams from Firestore`);
    } catch (err) {
      console.warn('Could not load custom exams:', err.message);
    }
  }

  function getAllExams() {
    return [...EXAM_PRESETS.exams, ...customExams];
  }

  function updateExamCount() {
    const el = $('#exam-count');
    if (el) el.textContent = getAllExams().length + '+';
  }

  // ── Render Exam Cards ──
  function renderExamCards(filter = '') {
    const grid = $('#exam-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const allExams = getAllExams();
    const exams = allExams.filter((e) => {
      const matchCat = activeCategory === 'all' || e.category === activeCategory;
      const matchSearch = !filter || e.name.toLowerCase().includes(filter) || e.fullName.toLowerCase().includes(filter);
      return matchCat && matchSearch;
    });

    if (exams.length === 0) {
      grid.innerHTML = '<div class="no-results"><span class="no-results-icon">🔍</span><p>No exams found. Try a different search or category.</p></div>';
      return;
    }

    exams.forEach((exam) => {
      const card = document.createElement('div');
      card.className = 'exam-card';
      card.dataset.examId = exam.id;
      if (selectedExam && selectedExam.id === exam.id) card.classList.add('selected');

      const catInfo = EXAM_PRESETS.categories.find((c) => c.id === exam.category);
      card.innerHTML = `
        <div class="exam-card-accent" style="background:${exam.color}"></div>
        ${exam._isCustom ? '<span class="exam-card-community">✨ Community</span>' : ''}
        <div class="exam-card-body">
          <span class="exam-card-badge" style="background:${exam.color}20;color:${exam.color}">${catInfo ? catInfo.icon : '📝'} ${catInfo ? catInfo.label : exam.category || 'Other'}</span>
          <h3 class="exam-card-title">${exam.name}</h3>
          <p class="exam-card-subtitle">${exam.fullName}</p>
          <div class="exam-card-specs">
            ${exam.documents.map((d) => {
              return `<span class="spec-chip"><span class="spec-chip-icon">${d.type === 'photo' ? '📷' : '✍️'}</span>${d.type === 'photo' ? 'Photo' : 'Sign'}: ${d.fileSize.min}-${d.fileSize.max}KB</span>`;
            }).join('')}
          </div>
        </div>
      `;
      card.addEventListener('click', () => selectExam(exam));
      grid.appendChild(card);
    });
  }

  // ── Select Exam ──
  function selectExam(exam) {
    selectedExam = exam;
    selectedDocType = exam.documents[0].type;
    uploadedFile = null;
    processedResult = null;

    $$('.exam-card').forEach((c) => c.classList.remove('selected'));
    const card = document.querySelector(`[data-exam-id="${exam.id}"]`);
    if (card) card.classList.add('selected');

    const processorSection = $('#processor-section');
    processorSection.classList.add('visible');
    processorSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    renderDocTypeTabs();
    updateSpecsDisplay();
    resetUpload();
  }

  // ── Category Tabs ──
  function bindCategoryTabs() {
    const tabs = $('#category-tabs');
    if (!tabs) return;

    let html = '<button class="cat-tab active" data-cat="all">🌐 All</button>';
    EXAM_PRESETS.categories.forEach((c) => {
      html += `<button class="cat-tab" data-cat="${c.id}">${c.icon} ${c.label}</button>`;
    });
    tabs.innerHTML = html;

    tabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-tab');
      if (!btn) return;
      $$('.cat-tab').forEach((t) => t.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.cat;
      renderExamCards($('#exam-search') ? $('#exam-search').value.toLowerCase().trim() : '');
    });
  }

  // ── Search ──
  function bindSearch() {
    const input = $('#exam-search');
    if (!input) return;
    input.addEventListener('input', (e) => {
      renderExamCards(e.target.value.toLowerCase().trim());
    });
  }

  // ── Document Type Tabs ──
  function renderDocTypeTabs() {
    const container = $('#doc-type-tabs');
    if (!container || !selectedExam) return;

    container.innerHTML = selectedExam.documents.map((d) => `
      <button class="doc-tab ${d.type === selectedDocType ? 'active' : ''}" data-type="${d.type}">
        ${d.type === 'photo' ? '📷' : '✍️'} ${d.label}
      </button>
    `).join('');
  }

  function bindDocTypeTabs() {
    const container = $('#doc-type-tabs');
    if (!container) return;
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.doc-tab');
      if (!btn) return;
      selectedDocType = btn.dataset.type;
      $$('.doc-tab').forEach((t) => t.classList.remove('active'));
      btn.classList.add('active');
      updateSpecsDisplay();
      resetUpload();
    });
  }

  // ── Specs Display ──
  function updateSpecsDisplay() {
    const container = $('#specs-display');
    if (!container || !selectedExam) return;

    const doc = selectedExam.documents.find((d) => d.type === selectedDocType);
    if (!doc) return;

    const px = getTargetPixels(doc);
    const dimLabel = doc.dimensions.unit === 'cm'
      ? `${doc.dimensions.width} × ${doc.dimensions.height} cm (${px.width} × ${px.height} px at ${doc.dpi} DPI)`
      : `${px.width} × ${px.height} px`;

    container.innerHTML = `
      <div class="specs-grid">
        <div class="spec-item">
          <div class="spec-label">Format</div>
          <div class="spec-value">${doc.format}</div>
        </div>
        <div class="spec-item">
          <div class="spec-label">File Size</div>
          <div class="spec-value">${doc.fileSize.min} KB – ${doc.fileSize.max} KB</div>
        </div>
        <div class="spec-item">
          <div class="spec-label">Dimensions</div>
          <div class="spec-value">${dimLabel}</div>
        </div>
        ${doc.dpi ? `<div class="spec-item"><div class="spec-label">Resolution</div><div class="spec-value">${doc.dpi} DPI</div></div>` : ''}
      </div>
      <div class="guidelines-section">
        <h4 class="guidelines-title">📋 Official Guidelines</h4>
        <ul class="guidelines-list">
          ${doc.guidelines.map((g) => `<li>${g}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  // ── Upload Zone ──
  function bindUploadZone() {
    const zone = $('#upload-zone');
    const input = $('#file-input');
    if (!zone || !input) return;

    zone.addEventListener('click', () => input.click());

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    });

    input.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
      }
    });
  }

  function handleFile(file) {
    if (!file.type.match(/image\/(jpeg|jpg|png|webp|bmp)/i)) {
      showToast('Please upload a valid image file (JPEG, PNG, WebP, BMP)', 'error');
      return;
    }

    uploadedFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = $('#original-preview');
      const info = $('#original-info');
      const uploadContent = $('#upload-content');

      if (preview) {
        preview.src = e.target.result;
        preview.style.display = 'block';
      }

      if (uploadContent) uploadContent.classList.add('has-file');

      const img = new Image();
      img.onload = () => {
        if (info) {
          info.innerHTML = `
            <div class="file-info-grid">
              <span class="file-info-item">📁 ${file.name}</span>
              <span class="file-info-item">📐 ${img.naturalWidth} × ${img.naturalHeight} px</span>
              <span class="file-info-item">💾 ${(file.size / 1024).toFixed(1)} KB</span>
            </div>
          `;
          info.style.display = 'block';
        }
      };
      img.src = e.target.result;

      const btn = $('#process-btn');
      if (btn) btn.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  function resetUpload() {
    uploadedFile = null;
    processedResult = null;

    const preview = $('#original-preview');
    const info = $('#original-info');
    const uploadContent = $('#upload-content');
    const resultSection = $('#result-section');
    const processBtn = $('#process-btn');
    const fileInput = $('#file-input');

    if (preview) { preview.src = ''; preview.style.display = 'none'; }
    if (info) { info.innerHTML = ''; info.style.display = 'none'; }
    if (uploadContent) uploadContent.classList.remove('has-file');
    if (resultSection) resultSection.classList.remove('visible');
    if (processBtn) { processBtn.disabled = true; processBtn.textContent = '⚡ Resize & Compress'; }
    if (fileInput) fileInput.value = '';
  }

  // ── Process Button ──
  function bindProcessBtn() {
    const btn = $('#process-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      if (!uploadedFile || !selectedExam) return;

      const doc = selectedExam.documents.find((d) => d.type === selectedDocType);
      if (!doc) return;

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Processing...';

      try {
        processedResult = await ImageProcessor.process(uploadedFile, doc);
        showResult(processedResult, doc);
        showToast('Image processed successfully!', 'success');
      } catch (err) {
        console.error(err);
        showToast('Error processing image. Please try again.', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '⚡ Resize & Compress';
      }
    });
  }

  // ── Show Result ──
  function showResult(result, doc) {
    const section = $('#result-section');
    const img = $('#result-preview');
    const info = $('#result-info');

    if (!section || !img || !info) return;

    img.src = result.previewUrl;
    section.classList.add('visible');

    const inRange = result.sizeKB >= doc.fileSize.min && result.sizeKB <= doc.fileSize.max;
    const sizeClass = inRange ? 'size-ok' : 'size-warn';
    const sizeIcon = inRange ? '✅' : '⚠️';

    info.innerHTML = `
      <div class="result-stats">
        <div class="stat-card">
          <div class="stat-label">Dimensions</div>
          <div class="stat-value">${result.width} × ${result.height} px</div>
        </div>
        <div class="stat-card ${sizeClass}">
          <div class="stat-label">File Size ${sizeIcon}</div>
          <div class="stat-value">${result.sizeKB.toFixed(1)} KB</div>
          <div class="stat-range">Required: ${doc.fileSize.min}–${doc.fileSize.max} KB</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Quality</div>
          <div class="stat-value">${Math.round(result.quality * 100)}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Compression</div>
          <div class="stat-value">${Math.round((1 - result.sizeKB / result.originalSizeKB) * 100)}% saved</div>
        </div>
      </div>
    `;

    const dlBtn = $('#download-btn');
    if (dlBtn) dlBtn.disabled = false;

    section.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ── Download ──
  function bindDownloadBtn() {
    const btn = $('#download-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      if (!processedResult || !selectedExam) return;
      const docType = selectedDocType === 'photo' ? 'photo' : 'signature';
      const filename = `${selectedExam.name.replace(/\s+/g, '_')}_${docType}.jpg`;
      ImageProcessor.download(processedResult.blob, filename);
      showToast(`Downloaded ${filename}`, 'success');
    });
  }

  // ── Reset ──
  function bindResetBtn() {
    const btn = $('#reset-btn');
    if (!btn) return;
    btn.addEventListener('click', resetUpload);
  }

  // ── Request Modal ──
  function bindRequestModal() {
    const modal = $('#request-modal');
    const form = $('#request-form');
    if (!modal) return;

    // Open triggers
    const openers = ['#open-request-btn', '#open-request-hero', '#open-request-inline'];
    openers.forEach((sel) => {
      const el = $(sel);
      if (el) el.addEventListener('click', () => modal.classList.add('active'));
    });

    // Close
    const closeBtn = $('#close-request-modal');
    if (closeBtn) closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
      resetRequestForm();
    });

    // Click outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        resetRequestForm();
      }
    });

    // Submit
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitRequest();
      });
    }
  }

  async function submitRequest() {
    const examName = $('#req-exam-name').value.trim();
    const email = $('#req-email').value.trim();
    const message = $('#req-message').value.trim();
    const submitBtn = $('#req-submit-btn');

    if (!examName || !email) {
      showToast('Please fill in exam name and email', 'error');
      return;
    }

    if (!firebaseReady) {
      showToast('Request service is not available right now. Please try later.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';

    try {
      await db.collection('requests').add({
        examName,
        email,
        message: message || '',
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      // Show success
      $('#request-form').style.display = 'none';
      $('#request-success').style.display = 'block';
      showToast('Request submitted successfully!', 'success');
    } catch (err) {
      console.error('Submit error:', err);
      showToast('Failed to submit request. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>🚀 Submit Request</span>';
    }
  }

  function resetRequestForm() {
    const form = $('#request-form');
    const success = $('#request-success');
    if (form) { form.reset(); form.style.display = 'flex'; }
    if (success) success.style.display = 'none';
  }

  // ── Toast Notification ──
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

  // ── Scroll Animations ──
  function initScrollAnimations() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.1 }
    );

    $$('.animate-on-scroll').forEach((el) => observer.observe(el));
  }

  // ── Animated Particles Background ──
  function initParticles() {
    const canvas = $('#particle-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    const PARTICLE_COUNT = 50;

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = document.querySelector('.hero').offsetHeight;
    }

    function createParticle() {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.1,
      };
    }

    function init() {
      resizeCanvas();
      particles = Array.from({ length: PARTICLE_COUNT }, createParticle);
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 92, 246, ${p.opacity})`;
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(139, 92, 246, ${0.1 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(draw);
    }

    init();
    draw();
    window.addEventListener('resize', init);
  }
})();
