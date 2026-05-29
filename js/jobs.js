/**
 * Job Portal — Multi-source job search with autocomplete, filters, and bookmarks.
 * Sources: JSearch (RapidAPI) + Arbeitnow (free) + RemoteOK (free)
 * Shows jobs on portal; user clicks Apply to go to application page.
 */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  let jobs = [];
  let filteredJobs = [];
  let savedJobs = loadSaved();
  let currentTab = 'search';
  let currentPage = 1;
  let searchQuery = '';
  let searchLocation = '';
  let workMode = '';

  const JOB_TITLES = [
    'Software Developer','Software Engineer','Frontend Developer','Backend Developer','Full Stack Developer',
    'Data Scientist','Data Analyst','Data Engineer','Machine Learning Engineer','AI Engineer',
    'DevOps Engineer','Cloud Engineer','System Administrator','Network Engineer','Cybersecurity Analyst',
    'Product Manager','Project Manager','Business Analyst','Scrum Master','Technical Lead',
    'UI/UX Designer','Graphic Designer','Web Designer','Motion Designer',
    'Marketing Manager','Digital Marketing','SEO Specialist','Content Writer','Copywriter',
    'Sales Executive','Account Manager','Customer Success','HR Manager','Recruiter',
    'Java Developer','Python Developer','React Developer','Angular Developer','Node.js Developer',
    'iOS Developer','Android Developer','Flutter Developer','React Native Developer',
    'QA Engineer','Test Automation Engineer','Manual Tester',
    'Accountant','Financial Analyst','CA','Civil Engineer','Mechanical Engineer',
    'Electrical Engineer','Teacher','Professor','Pharmacist','Doctor','Nurse',
    'Intern','Fresher','Graduate Trainee','Management Trainee',
    'Blockchain Developer','Ethical Hacker','Game Developer','Embedded Engineer'
  ];

  const LOCATIONS = [
    'Bangalore','Mumbai','Delhi','Hyderabad','Pune','Chennai','Kolkata','Noida','Gurgaon','Ahmedabad',
    'Jaipur','Lucknow','Chandigarh','Indore','Bhopal','Nagpur','Coimbatore','Kochi','Trivandrum',
    'Remote','Work from Home','Hybrid','Pan India','International',
    'New York','San Francisco','London','Singapore','Dubai','Toronto','Berlin','Sydney','Tokyo'
  ];

  function loadSaved() {
    try { return JSON.parse(localStorage.getItem('examresize_saved_jobs')) || []; } catch { return []; }
  }
  function saveSavedJobs() {
    localStorage.setItem('examresize_saved_jobs', JSON.stringify(savedJobs));
    const el = $('#saved-count');
    if (el) el.textContent = savedJobs.length;
  }

  /* ═══════════════ INIT ═══════════════ */
  function init() {
    try { if (typeof initFirebase === 'function') initFirebase(); } catch (e) { console.warn('Firebase:', e.message); }

    const btn = $('#job-search-btn');
    if (!btn) { console.error('Jobs: DOM not ready'); return; }

    $('#saved-count').textContent = savedJobs.length;
    btn.addEventListener('click', doSearch);
    $('#job-query').addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
    $('#job-location').addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
    $('#jobs-load-more').addEventListener('click', loadMore);

    $$('.jobs-tab').forEach((t) => t.addEventListener('click', (e) => {
      currentTab = e.target.dataset.tab;
      $$('.jobs-tab').forEach((x) => x.classList.remove('active'));
      e.target.classList.add('active');
      render();
    }));

    $$('.filter-chip').forEach((c) => c.addEventListener('click', (e) => {
      $$('.filter-chip').forEach((x) => x.classList.remove('active'));
      e.target.classList.add('active');
      workMode = e.target.dataset.mode;
      applyClientFilters();
      render();
    }));

    ['filter-salary', 'filter-date', 'filter-exp'].forEach((id) => {
      const el = $(`#${id}`);
      if (el) el.addEventListener('change', () => { applyClientFilters(); render(); });
    });

    setupAutocomplete('job-query', 'query-suggestions', JOB_TITLES);
    setupAutocomplete('job-location', 'location-suggestions', LOCATIONS);
    updatePlatformLinks();
    showEmpty('Search for jobs above to get started 🚀');
    $('#job-query').value = 'Software Developer';
    console.log('Jobs portal initialized ✅');
    doSearch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ═══════════════ AUTOCOMPLETE ═══════════════ */
  function setupAutocomplete(inputId, listId, suggestions) {
    const input = $(`#${inputId}`);
    const list = $(`#${listId}`);
    let hlIdx = -1;

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (q.length < 1) { list.classList.remove('show'); return; }
      const matches = suggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 8);
      if (!matches.length) { list.classList.remove('show'); return; }
      hlIdx = -1;
      list.innerHTML = matches.map((m) => {
        const idx = m.toLowerCase().indexOf(q);
        return `<div class="autocomplete-item">${m.substring(0, idx)}<span class="ac-match">${m.substring(idx, idx + q.length)}</span>${m.substring(idx + q.length)}</div>`;
      }).join('');
      list.classList.add('show');
      list.querySelectorAll('.autocomplete-item').forEach((item) => {
        item.addEventListener('click', () => { input.value = item.textContent; list.classList.remove('show'); updatePlatformLinks(); });
      });
    });

    input.addEventListener('keydown', (e) => {
      const items = list.querySelectorAll('.autocomplete-item');
      if (!list.classList.contains('show') || !items.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); hlIdx = Math.min(hlIdx + 1, items.length - 1); items.forEach((it, i) => it.classList.toggle('highlighted', i === hlIdx)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); hlIdx = Math.max(hlIdx - 1, 0); items.forEach((it, i) => it.classList.toggle('highlighted', i === hlIdx)); }
      else if (e.key === 'Enter' && hlIdx >= 0) { e.preventDefault(); input.value = items[hlIdx].textContent; list.classList.remove('show'); }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest(`#${inputId}`) && !e.target.closest(`#${listId}`)) list.classList.remove('show');
    });
  }

  /* ═══════════════ PLATFORM LINKS ═══════════════ */
  function updatePlatformLinks() {
    const q = encodeURIComponent($('#job-query').value.trim() || 'jobs');
    const loc = encodeURIComponent($('#job-location').value.trim() || 'India');
    $('#pl-naukri').href = `https://www.naukri.com/${q.replace(/%20/g, '-')}-jobs`;
    $('#pl-linkedin').href = `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${loc}`;
    $('#pl-indeed').href = `https://www.indeed.co.in/jobs?q=${q}&l=${loc}`;
    $('#pl-ambitionbox').href = `https://www.ambitionbox.com/jobs/search?q=${q}`;
    $('#pl-internshala').href = `https://internshala.com/internships/${q.replace(/%20/g, '-')}-internship`;
  }

  /* ═══════════════ SEARCH ═══════════════ */
  async function doSearch() {
    searchQuery = $('#job-query').value.trim();
    searchLocation = $('#job-location').value.trim();
    const type = $('#job-type').value;
    if (!searchQuery) { showToast('Please enter a job title or keyword', 'error'); return; }

    updatePlatformLinks();
    currentPage = 1;
    jobs = [];
    filteredJobs = [];
    showLoading();

    console.log(`Searching: "${searchQuery}" in "${searchLocation || 'anywhere'}"...`);

    // Fetch from ALL sources in parallel
    const results = await Promise.allSettled([
      fetchJSearch(searchQuery, searchLocation, type, 1),
      fetchArbeitnow(searchQuery),
      fetchRemoteOK(searchQuery)
    ]);

    const names = ['JSearch', 'Arbeitnow', 'RemoteOK'];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length > 0) {
        console.log(`${names[i]}: ✅ ${r.value.length} jobs`);
        jobs.push(...r.value);
      } else {
        console.log(`${names[i]}: ❌ ${r.status === 'rejected' ? r.reason : '0 jobs'}`);
      }
    });

    // Deduplicate by title+company
    const seen = new Set();
    jobs = jobs.filter((j) => {
      const key = (j.title + j.company).toLowerCase().replace(/\s+/g, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    jobs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    applyClientFilters();

    console.log(`Total unique jobs: ${filteredJobs.length}`);

    if (filteredJobs.length === 0) {
      showEmpty('No jobs found. Try different keywords or use the platform links above to search Naukri, LinkedIn, Indeed directly.');
    } else {
      render();
    }
  }

  /* ═══════════════ FILTERS ═══════════════ */
  function applyClientFilters() {
    let list = [...jobs];
    if (workMode === 'remote') list = list.filter((j) => j.remote);
    else if (workMode === 'onsite') list = list.filter((j) => !j.remote && !j.hybrid);
    else if (workMode === 'hybrid') list = list.filter((j) => j.hybrid);

    const salaryMin = parseInt($('#filter-salary')?.value) || 0;
    if (salaryMin > 0) {
      list = list.filter((j) => j.salaryNum && j.salaryNum >= salaryMin * 100000);
    }
    filteredJobs = list;
  }

  /* ═══════════════ JSEARCH API ═══════════════ */
  async function fetchJSearch(query, location, type, page) {
    if (!JSEARCH_API_KEY || JSEARCH_API_KEY.includes('PASTE')) return [];
    try {
      const params = new URLSearchParams({
        query: `${query}${location ? ' in ' + location : ''}`,
        page: String(page), num_pages: '1',
        date_posted: $('#filter-date')?.value || 'month'
      });
      if (type === 'remote') params.set('remote_jobs_only', 'true');
      if (type === 'fulltime') params.set('employment_types', 'FULLTIME');
      if (type === 'parttime') params.set('employment_types', 'PARTTIME');
      if (type === 'intern') params.set('employment_types', 'INTERN');
      if (type === 'freelance') params.set('employment_types', 'CONTRACTOR');
      const expReq = $('#filter-exp')?.value;
      if (expReq) params.set('job_requirements', expReq);

      const res = await fetch(`https://jsearch.p.rapidapi.com/search?${params}`, {
        headers: { 'x-rapidapi-key': JSEARCH_API_KEY, 'x-rapidapi-host': 'jsearch.p.rapidapi.com' }
      });
      if (!res.ok) { console.warn(`JSearch: ${res.status}`); return []; }
      const data = await res.json();
      return (data.data || []).map((j) => ({
        id: j.job_id, title: j.job_title, company: j.employer_name,
        location: j.job_city ? `${j.job_city}, ${j.job_state || j.job_country}` : j.job_country || 'Not specified',
        salary: j.job_min_salary && j.job_max_salary ? `${fmtSal(j.job_min_salary)} - ${fmtSal(j.job_max_salary)} ${j.job_salary_currency || ''}` : '',
        salaryNum: j.job_max_salary || j.job_min_salary || 0,
        type: j.job_employment_type || '', remote: j.job_is_remote, hybrid: false,
        description: (j.job_description || '').substring(0, 350),
        url: j.job_apply_link || j.job_google_link || '#',
        source: j.employer_name || 'JSearch', logo: j.employer_logo,
        date: j.job_posted_at_datetime_utc, highlights: j.job_highlights?.Qualifications?.slice(0, 2) || []
      }));
    } catch (e) { console.warn('JSearch:', e.message); return []; }
  }

  /* ═══════════════ ARBEITNOW API (Free, No Key) ═══════════════ */
  async function fetchArbeitnow(query) {
    try {
      const res = await fetch(`https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(query)}`);
      if (!res.ok) { console.warn(`Arbeitnow: ${res.status}`); return []; }
      const data = await res.json();
      return (data.data || []).slice(0, 30).map((j) => ({
        id: 'an-' + (j.slug || Math.random().toString(36).substr(2)),
        title: j.title, company: j.company_name,
        location: j.location || 'Not specified', salary: '', salaryNum: 0,
        type: j.employment_type || '', remote: j.remote || false,
        hybrid: (j.title + ' ' + (j.location || '')).toLowerCase().includes('hybrid'),
        description: (j.description || '').replace(/<[^>]*>/g, '').substring(0, 350),
        url: j.url || '#', source: j.company_name || 'Arbeitnow',
        logo: j.company_logo || '', date: j.created_at,
        highlights: (j.tags || []).slice(0, 3)
      }));
    } catch (e) { console.warn('Arbeitnow:', e.message); return []; }
  }

  /* ═══════════════ REMOTEOK API (Free, No Key) ═══════════════ */
  async function fetchRemoteOK(query) {
    try {
      const res = await fetch('https://remoteok.com/api');
      if (!res.ok) { console.warn(`RemoteOK: ${res.status}`); return []; }
      const data = await res.json();
      const q = query.toLowerCase();
      return data
        .filter((j) => j.position && j.company && (
          j.position.toLowerCase().includes(q) ||
          (j.tags || []).some((t) => t.toLowerCase().includes(q)) ||
          j.company.toLowerCase().includes(q)
        ))
        .slice(0, 20)
        .map((j) => ({
          id: 'rok-' + j.id, title: j.position, company: j.company,
          location: j.location || 'Remote', salary: j.salary || '', salaryNum: parseSalNum(j.salary),
          type: 'Remote', remote: true, hybrid: false,
          description: (j.description || '').replace(/<[^>]*>/g, '').substring(0, 350),
          url: j.url || `https://remoteok.com/l/${j.id}`, source: 'RemoteOK',
          logo: j.company_logo, date: j.date, highlights: (j.tags || []).slice(0, 3)
        }));
    } catch (e) { console.warn('RemoteOK:', e.message); return []; }
  }

  function parseSalNum(s) { if (!s) return 0; const n = s.match(/\d[\d,]*/g); return n ? parseInt(n[0].replace(/,/g, '')) : 0; }
  function fmtSal(n) { if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L'; if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'K'; return n; }

  /* ═══════════════ RENDER ═══════════════ */
  function render() {
    const grid = $('#jobs-grid');
    const list = currentTab === 'saved' ? savedJobs : filteredJobs;

    const info = $('#jobs-result-info');
    if (currentTab === 'search' && filteredJobs.length > 0) {
      info.style.display = 'flex';
      info.innerHTML = `<span class="result-count">${filteredJobs.length} jobs found</span><span>for "${esc(searchQuery)}"${searchLocation ? ' in ' + esc(searchLocation) : ''}</span>`;
    } else { info.style.display = 'none'; }

    if (!list.length) {
      showEmpty(currentTab === 'saved' ? 'No saved jobs yet.' : 'No results.');
      return;
    }
    grid.innerHTML = list.map(renderJobCard).join('');
    bindJobEvents();
    $('#jobs-load-more').style.display = currentTab === 'search' && filteredJobs.length >= 10 ? 'block' : 'none';
  }

  function renderJobCard(j) {
    const saved = savedJobs.some((s) => s.id === j.id);
    const dateStr = j.date ? timeAgo(new Date(j.date)) : '';
    const mode = j.remote ? '<span class="job-tag remote">🌐 Remote</span>'
      : j.hybrid ? '<span class="job-tag hybrid">🔄 Hybrid</span>'
      : '<span class="job-tag onsite">🏢 On-site</span>';

    return `<div class="job-card" data-job-id="${esc(j.id)}">
      <div class="job-card-header">
        ${j.logo ? `<img src="${esc(j.logo)}" alt="${esc(j.company)}" class="job-logo" onerror="this.style.display='none'">` : ''}
        <div class="job-title-wrap">
          <div class="job-title">${esc(j.title)}</div>
          <div class="job-company">${esc(j.company)}</div>
        </div>
        <button class="job-bookmark" data-job-id="${esc(j.id)}" title="${saved ? 'Remove' : 'Save'}">${saved ? '❤️' : '🤍'}</button>
      </div>
      <div class="job-meta">
        <span class="job-tag">📍 ${esc(j.location)}</span>
        ${j.type ? `<span class="job-tag">${esc(j.type)}</span>` : ''}
        ${mode}
        ${j.salary ? `<span class="job-tag salary">💰 ${esc(j.salary)}</span>` : ''}
      </div>
      ${j.description ? `<div class="job-desc">${esc(j.description)}</div>` : ''}
      ${j.highlights?.length ? `<div class="job-meta" style="margin-bottom:12px">${j.highlights.map((h) => `<span class="job-tag fresh">${esc(String(h).substring(0, 40))}</span>`).join('')}</div>` : ''}
      <div class="job-actions">
        <a href="${esc(j.url)}" target="_blank" rel="noopener" class="job-apply-btn">Apply Now →</a>
        <span class="job-source">via ${esc(j.source)}</span>
        ${dateStr ? `<span class="job-date">${dateStr}</span>` : ''}
      </div>
    </div>`;
  }

  function timeAgo(d) {
    const diff = Date.now() - d; if (diff < 0) return '';
    const m = Math.floor(diff / 60000); if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
    const dd = Math.floor(h / 24); if (dd < 7) return dd + 'd ago';
    const w = Math.floor(dd / 7); if (w < 4) return w + 'w ago';
    return Math.floor(w / 4) + 'mo ago';
  }

  function bindJobEvents() {
    $$('.job-bookmark').forEach((b) => b.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.jobId;
      const idx = savedJobs.findIndex((s) => s.id === id);
      if (idx >= 0) { savedJobs.splice(idx, 1); showToast('Removed', 'info'); }
      else { const j = jobs.find((x) => x.id === id); if (j) { savedJobs.push(j); showToast('Saved!', 'success'); } }
      saveSavedJobs(); render();
    }));
  }

  async function loadMore() {
    currentPage++;
    const btn = $('#jobs-load-more'); btn.textContent = 'Loading...';
    const nj = await fetchJSearch(searchQuery, searchLocation, $('#job-type').value, currentPage);
    if (nj?.length) { jobs.push(...nj); applyClientFilters(); render(); }
    else { btn.style.display = 'none'; showToast('No more jobs', 'info'); }
    btn.textContent = 'Load More Jobs';
  }

  function showLoading() {
    $('#jobs-grid').innerHTML = Array(6).fill('').map(() =>
      '<div class="job-skeleton"><div class="skel-line medium"></div><div class="skel-line short"></div><div class="skel-line"></div><div class="skel-line short"></div></div>'
    ).join('');
    $('#jobs-result-info').style.display = 'none';
  }

  function showEmpty(msg) {
    $('#jobs-grid').innerHTML = `<div class="jobs-empty"><span>🔍</span><p>${msg}</p></div>`;
    $('#jobs-load-more').style.display = 'none';
    $('#jobs-result-info').style.display = 'none';
  }

  function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function showToast(msg, type) {
    const c = $('#toast-container'); if (!c) return;
    const t = document.createElement('div');
    t.className = `toast toast-${type || 'info'}`;
    t.innerHTML = `<span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span><span>${msg}</span>`;
    c.appendChild(t); requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
  }
})();
