/**
 * ATS Resume Builder — Multi-step wizard with live preview & PDF export.
 * All data stays in localStorage — nothing uploaded anywhere.
 */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const STEPS = [
    { id: 'template', label: '🎨 Template', title: 'Choose Your Template', desc: 'Pick an ATS-friendly design' },
    { id: 'personal', label: '👤 Personal', title: 'Personal Information', desc: 'Your name, title, and contact details' },
    { id: 'education', label: '🎓 Education', title: 'Education', desc: 'Add your academic background' },
    { id: 'experience', label: '💼 Experience', title: 'Work Experience', desc: 'List your professional experience' },
    { id: 'skills', label: '⚡ Skills', title: 'Skills & Extras', desc: 'Technical skills, languages, and summary' },
    { id: 'projects', label: '🚀 Projects', title: 'Projects', desc: 'Showcase your best work (optional)' }
  ];

  const TEMPLATES = [
    { id: 'modern', icon: '🟣', name: 'Modern', desc: 'Clean with accent colors' },
    { id: 'classic', icon: '📜', name: 'Classic', desc: 'Traditional serif layout' },
    { id: 'minimal', icon: '⬜', name: 'Minimal', desc: 'Ultra-clean whitespace' },
    { id: 'professional', icon: '🔷', name: 'Professional', desc: 'Sidebar + main layout' }
  ];

  let currentStep = 0;
  let resumeData = loadDraft();
  let autoSaveTimer = null;

  function defaultData() {
    return {
      template: 'modern',
      personal: { name: '', title: '', email: '', phone: '', location: '', linkedin: '', website: '', summary: '' },
      education: [],
      experience: [],
      skills: [],
      projects: []
    };
  }

  function loadDraft() {
    try {
      const d = JSON.parse(localStorage.getItem('examresize_resume_draft'));
      return d && d.personal ? d : defaultData();
    } catch { return defaultData(); }
  }

  function saveDraft() {
    localStorage.setItem('examresize_resume_draft', JSON.stringify(resumeData));
    const el = $('#rb-save-status');
    if (el) { el.textContent = '💾 Saved!'; setTimeout(() => { el.textContent = '💾 Auto-saved'; }, 1500); }
  }

  // ── Init ──
  document.addEventListener('DOMContentLoaded', () => {
    initFirebase();
    renderProgress();
    renderSteps();
    renderStepContent();
    renderNav();
    renderPreview();
    $('#rb-download-btn').addEventListener('click', downloadPDF);
    autoSaveTimer = setInterval(saveDraft, 30000);
  });

  function renderProgress() {
    $('#rb-progress').innerHTML = STEPS.map((_, i) =>
      `<div class="rb-progress-step ${i < currentStep ? 'done' : ''} ${i === currentStep ? 'active' : ''}"></div>`
    ).join('');
  }

  function renderSteps() {
    $('#rb-steps').innerHTML = STEPS.map((s, i) =>
      `<div class="rb-step-dot ${i < currentStep ? 'done' : ''} ${i === currentStep ? 'active' : ''}" data-step="${i}">${s.label}</div>`
    ).join('');
    $$('.rb-step-dot').forEach((d) => d.addEventListener('click', (e) => {
      currentStep = parseInt(e.currentTarget.dataset.step);
      renderAll();
    }));
  }

  function renderNav() {
    const nav = $('#rb-nav');
    let html = '';
    if (currentStep > 0) html += `<button class="rb-btn-prev" id="rb-prev">← Back</button>`;
    if (currentStep < STEPS.length - 1) html += `<button class="rb-btn-next" id="rb-next">Next →</button>`;
    else html += `<button class="rb-btn-next" id="rb-next">✅ Finish & Download</button>`;
    nav.innerHTML = html;
    if ($('#rb-prev')) $('#rb-prev').addEventListener('click', () => { collectCurrentStep(); currentStep--; renderAll(); });
    if ($('#rb-next')) $('#rb-next').addEventListener('click', () => {
      collectCurrentStep();
      if (currentStep < STEPS.length - 1) { currentStep++; renderAll(); }
      else downloadPDF();
    });
  }

  function renderAll() {
    renderProgress(); renderSteps(); renderStepContent(); renderNav(); renderPreview();
  }

  // ── Step Content ──
  function renderStepContent() {
    const step = STEPS[currentStep];
    const c = $('#rb-step-content');
    c.innerHTML = `<h2>${step.title}</h2><p class="step-desc">${step.desc}</p>` + getStepHTML(step.id);
    bindStepEvents(step.id);
  }

  function getStepHTML(id) {
    if (id === 'template') {
      return `<div class="rb-templates">${TEMPLATES.map((t) =>
        `<div class="rb-template-card ${resumeData.template === t.id ? 'selected' : ''}" data-tpl="${t.id}">
          <span class="tpl-icon">${t.icon}</span><div class="tpl-name">${t.name}</div><div class="tpl-desc">${t.desc}</div>
        </div>`
      ).join('')}</div>`;
    }
    if (id === 'personal') {
      const p = resumeData.personal;
      return `
        <div class="rb-row"><div class="rb-field"><label>Full Name *</label><input id="rp-name" value="${esc(p.name)}" placeholder="Aashutosh Tiwari"></div>
        <div class="rb-field"><label>Professional Title</label><input id="rp-title" value="${esc(p.title)}" placeholder="Full Stack Developer"></div></div>
        <div class="rb-row"><div class="rb-field"><label>Email *</label><input id="rp-email" type="email" value="${esc(p.email)}" placeholder="your@email.com"></div>
        <div class="rb-field"><label>Phone</label><input id="rp-phone" value="${esc(p.phone)}" placeholder="+91 98765 43210"></div></div>
        <div class="rb-row"><div class="rb-field"><label>Location</label><input id="rp-location" value="${esc(p.location)}" placeholder="New Delhi, India"></div>
        <div class="rb-field"><label>LinkedIn URL</label><input id="rp-linkedin" value="${esc(p.linkedin)}" placeholder="linkedin.com/in/yourname"></div></div>
        <div class="rb-field"><label>Website / Portfolio</label><input id="rp-website" value="${esc(p.website)}" placeholder="yourportfolio.com"></div>
        <div class="rb-field"><label>Professional Summary</label><textarea id="rp-summary" rows="4" placeholder="Briefly describe your experience and career goals...">${esc(p.summary)}</textarea></div>`;
    }
    if (id === 'education') {
      return renderRepeatable(resumeData.education, 'edu', [
        { key: 'degree', label: 'Degree / Course', ph: 'B.Tech Computer Science' },
        { key: 'institution', label: 'Institution', ph: 'IIT Delhi' },
        { key: 'year', label: 'Year', ph: '2020 - 2024' },
        { key: 'grade', label: 'Grade / CGPA', ph: '8.5 CGPA' }
      ]);
    }
    if (id === 'experience') {
      return renderRepeatable(resumeData.experience, 'exp', [
        { key: 'role', label: 'Job Title', ph: 'Software Developer' },
        { key: 'company', label: 'Company', ph: 'Google India' },
        { key: 'duration', label: 'Duration', ph: 'Jan 2024 - Present' },
        { key: 'description', label: 'Description', ph: 'Led development of...', type: 'textarea' }
      ]);
    }
    if (id === 'skills') {
      return `
        <div class="rb-field"><label>Add Skills</label>
          <div class="rb-skills-input-wrap"><input id="rb-skill-input" placeholder="Type a skill & press Add"><button id="rb-add-skill-btn">+ Add</button></div>
          <div class="rb-skill-tags" id="rb-skill-tags">${resumeData.skills.map((s, i) =>
            `<span class="rb-skill-tag">${esc(s)} <button data-idx="${i}" class="rb-remove-skill">×</button></span>`
          ).join('')}</div>
        </div>
        <p style="color:var(--text-muted);font-size:0.8rem;margin-top:8px">💡 Tip: Add keywords from the job description for higher ATS scores</p>`;
    }
    if (id === 'projects') {
      return renderRepeatable(resumeData.projects, 'proj', [
        { key: 'name', label: 'Project Name', ph: 'E-commerce Platform' },
        { key: 'tech', label: 'Technologies', ph: 'React, Node.js, MongoDB' },
        { key: 'description', label: 'Description', ph: 'Built a full-stack...', type: 'textarea' },
        { key: 'link', label: 'Link (optional)', ph: 'github.com/user/project' }
      ]);
    }
    return '';
  }

  function renderRepeatable(items, prefix, fields) {
    let html = '<div id="rb-' + prefix + '-list">';
    items.forEach((item, i) => {
      html += `<div class="rb-item-card"><button class="rb-remove-btn" data-prefix="${prefix}" data-idx="${i}">×</button>`;
      fields.forEach((f) => {
        if (f.type === 'textarea') {
          html += `<div class="rb-field"><label>${f.label}</label><textarea class="rb-rep-field" data-prefix="${prefix}" data-idx="${i}" data-key="${f.key}" rows="3" placeholder="${f.ph}">${esc(item[f.key] || '')}</textarea></div>`;
        } else {
          html += `<div class="rb-field"><label>${f.label}</label><input class="rb-rep-field" data-prefix="${prefix}" data-idx="${i}" data-key="${f.key}" value="${esc(item[f.key] || '')}" placeholder="${f.ph}"></div>`;
        }
      });
      html += '</div>';
    });
    html += '</div>';
    html += `<button class="rb-add-btn" data-prefix="${prefix}">+ Add ${prefix === 'edu' ? 'Education' : prefix === 'exp' ? 'Experience' : 'Project'}</button>`;
    return html;
  }

  // ── Bind Events ──
  function bindStepEvents(id) {
    if (id === 'template') {
      $$('.rb-template-card').forEach((c) => c.addEventListener('click', (e) => {
        const tpl = e.currentTarget.dataset.tpl;
        resumeData.template = tpl;
        $$('.rb-template-card').forEach((x) => x.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        renderPreview();
      }));
    }
    if (id === 'skills') {
      const addSkill = () => {
        const inp = $('#rb-skill-input');
        const val = inp.value.trim();
        if (val && !resumeData.skills.includes(val)) { resumeData.skills.push(val); inp.value = ''; renderStepContent(); bindStepEvents('skills'); renderPreview(); }
      };
      $('#rb-add-skill-btn').addEventListener('click', addSkill);
      $('#rb-skill-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } });
      $$('.rb-remove-skill').forEach((b) => b.addEventListener('click', (e) => {
        resumeData.skills.splice(parseInt(e.target.dataset.idx), 1);
        renderStepContent(); bindStepEvents('skills'); renderPreview();
      }));
    }
    // Add buttons for repeatable sections
    $$('.rb-add-btn').forEach((b) => b.addEventListener('click', (e) => {
      const p = e.target.dataset.prefix;
      const arr = p === 'edu' ? resumeData.education : p === 'exp' ? resumeData.experience : resumeData.projects;
      arr.push({});
      renderStepContent(); bindStepEvents(id); renderPreview();
    }));
    // Remove buttons
    $$('.rb-remove-btn').forEach((b) => b.addEventListener('click', (e) => {
      const p = e.currentTarget.dataset.prefix;
      const arr = p === 'edu' ? resumeData.education : p === 'exp' ? resumeData.experience : resumeData.projects;
      arr.splice(parseInt(e.currentTarget.dataset.idx), 1);
      renderStepContent(); bindStepEvents(id); renderPreview();
    }));
    // Live update on input
    $$('.rb-rep-field').forEach((f) => f.addEventListener('input', () => { collectCurrentStep(); renderPreview(); }));
    $$('#rb-step-content input, #rb-step-content textarea').forEach((f) => {
      if (!f.classList.contains('rb-rep-field') && f.id !== 'rb-skill-input') {
        f.addEventListener('input', () => { collectCurrentStep(); renderPreview(); });
      }
    });
  }

  // ── Collect Data ──
  function collectCurrentStep() {
    const id = STEPS[currentStep].id;
    if (id === 'personal') {
      ['name', 'title', 'email', 'phone', 'location', 'linkedin', 'website', 'summary'].forEach((k) => {
        const el = $(`#rp-${k}`);
        if (el) resumeData.personal[k] = el.value;
      });
    }
    if (id === 'education' || id === 'experience' || id === 'projects') {
      const prefix = id === 'education' ? 'edu' : id === 'experience' ? 'exp' : 'proj';
      const arr = id === 'education' ? resumeData.education : id === 'experience' ? resumeData.experience : resumeData.projects;
      $$('.rb-rep-field').forEach((f) => {
        if (f.dataset.prefix === prefix) {
          const idx = parseInt(f.dataset.idx);
          if (arr[idx]) arr[idx][f.dataset.key] = f.value;
        }
      });
    }
  }

  // ── Preview ──
  function renderPreview() {
    const container = $('#rb-resume-preview');
    const d = resumeData;
    const tpl = d.template || 'modern';
    container.className = `resume-${tpl}`;
    container.innerHTML = buildResumeHTML(d, tpl);
  }

  function buildResumeHTML(d, tpl) {
    const p = d.personal;
    const contactItems = [p.email, p.phone, p.location, p.linkedin, p.website].filter(Boolean);

    if (tpl === 'professional') {
      return `
        <div class="r-sidebar">
          <div class="r-name">${esc(p.name) || 'Your Name'}</div>
          <div class="r-title">${esc(p.title) || 'Professional Title'}</div>
          <div class="r-section-title">Contact</div>
          <div class="r-contact">${contactItems.map((c) => `<div>${esc(c)}</div>`).join('')}</div>
          ${d.skills.length ? `<div class="r-section-title">Skills</div><div class="r-skills-list">${d.skills.map((s) => `<span class="r-skill">${esc(s)}</span>`).join('')}</div>` : ''}
          ${d.education.length ? `<div class="r-section-title">Education</div>${d.education.map((e) => `<div style="margin-bottom:10px"><div style="font-weight:600;font-size:10px;color:#fff">${esc(e.degree || '')}</div><div style="font-size:9px;color:#bbb">${esc(e.institution || '')}</div><div style="font-size:9px;color:#888">${esc(e.year || '')} ${e.grade ? '• ' + esc(e.grade) : ''}</div></div>`).join('')}` : ''}
        </div>
        <div class="r-main">
          ${p.summary ? `<div class="r-section"><div class="r-section-title">Summary</div><p style="font-size:10.5px;color:#444">${esc(p.summary)}</p></div>` : ''}
          ${d.experience.length ? `<div class="r-section"><div class="r-section-title">Experience</div>${d.experience.map((e) => `<div class="r-entry"><div class="r-entry-header"><span class="r-entry-title">${esc(e.role || '')}</span><span class="r-entry-date">${esc(e.duration || '')}</span></div><div class="r-entry-sub" style="color:#6366f1;font-size:10px">${esc(e.company || '')}</div>${e.description ? `<div class="r-entry-desc" style="color:#555;font-size:10px;margin-top:4px;white-space:pre-line">${esc(e.description)}</div>` : ''}</div>`).join('')}</div>` : ''}
          ${d.projects.length ? `<div class="r-section"><div class="r-section-title">Projects</div>${d.projects.map((pr) => `<div class="r-entry"><div class="r-entry-title">${esc(pr.name || '')}</div>${pr.tech ? `<div style="font-size:9px;color:#6366f1">${esc(pr.tech)}</div>` : ''}${pr.description ? `<div class="r-entry-desc" style="color:#555;font-size:10px;margin-top:3px;white-space:pre-line">${esc(pr.description)}</div>` : ''}${pr.link ? `<div style="font-size:9px;color:#888;margin-top:2px">${esc(pr.link)}</div>` : ''}</div>`).join('')}</div>` : ''}
        </div>`;
    }

    // Modern, Classic, Minimal
    return `
      <div class="r-header">
        <div class="r-name">${esc(p.name) || 'Your Name'}</div>
        ${p.title ? `<div class="r-title">${esc(p.title)}</div>` : ''}
        <div class="r-contact">${contactItems.map((c) => `<span>${esc(c)}</span>`).join(tpl === 'classic' ? ' | ' : '')}</div>
      </div>
      ${p.summary ? `<div class="r-section"><div class="r-section-title">Professional Summary</div><p style="font-size:10.5px;color:#444">${esc(p.summary)}</p></div>` : ''}
      ${d.experience.length ? `<div class="r-section"><div class="r-section-title">Experience</div>${d.experience.map((e) => `<div class="r-entry"><div class="r-entry-header"><span class="r-entry-title">${esc(e.role || '')}</span><span class="r-entry-date">${esc(e.duration || '')}</span></div><div class="r-entry-sub">${esc(e.company || '')}</div>${e.description ? `<div class="r-entry-desc" style="white-space:pre-line">${esc(e.description)}</div>` : ''}</div>`).join('')}</div>` : ''}
      ${d.education.length ? `<div class="r-section"><div class="r-section-title">Education</div>${d.education.map((e) => `<div class="r-entry"><div class="r-entry-header"><span class="r-entry-title">${esc(e.degree || '')}</span><span class="r-entry-date">${esc(e.year || '')}</span></div><div class="r-entry-sub">${esc(e.institution || '')}${e.grade ? ' — ' + esc(e.grade) : ''}</div></div>`).join('')}</div>` : ''}
      ${d.skills.length ? `<div class="r-section"><div class="r-section-title">Skills</div><div class="r-skills-list">${d.skills.map((s) => `<span class="r-skill">${esc(s)}</span>`).join('')}</div></div>` : ''}
      ${d.projects.length ? `<div class="r-section"><div class="r-section-title">Projects</div>${d.projects.map((pr) => `<div class="r-entry"><div class="r-entry-title">${esc(pr.name || '')}${pr.tech ? ` <span style="font-size:9px;color:#888">(${esc(pr.tech)})</span>` : ''}</div>${pr.description ? `<div class="r-entry-desc" style="white-space:pre-line">${esc(pr.description)}</div>` : ''}${pr.link ? `<div style="font-size:9px;color:#6366f1;margin-top:2px">${esc(pr.link)}</div>` : ''}</div>`).join('')}</div>` : ''}`;
  }

  // ── PDF Download ──
  async function downloadPDF() {
    collectCurrentStep();
    saveDraft();
    const btn = $('#rb-download-btn');
    btn.textContent = '⏳ Generating...';
    btn.disabled = true;

    try {
      const preview = $('#rb-resume-preview');
      const canvas = await html2canvas(preview, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = 210;
      const pageH = 297;
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      let yOffset = 0;

      while (yOffset < imgH) {
        if (yOffset > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, -yOffset, imgW, imgH);
        yOffset += pageH;
      }

      const name = resumeData.personal.name || 'Resume';
      pdf.save(`${name.replace(/\s+/g, '_')}_ATS_Resume.pdf`);
      showToast('Resume downloaded successfully!', 'success');
    } catch (err) {
      console.error('PDF generation error:', err);
      showToast('Failed to generate PDF. Please try again.', 'error');
    } finally {
      btn.textContent = '⬇️ Download PDF';
      btn.disabled = false;
    }
  }

  // ── Helpers ──
  function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function showToast(message, type) {
    const container = $('#toast-container');
    if (!container) return;
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span class="toast-icon">${type === 'success' ? '✅' : '❌'}</span><span>${message}</span>`;
    container.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
  }
})();
