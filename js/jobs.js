/**
 * Job Portal — Multi-source job search with autocomplete, filters, and bookmarks.
 * Uses JSearch API (RapidAPI) + RemoteOK API.
 * Shows jobs on our portal; user clicks Apply to redirect to application page.
 * Bookmarks saved in localStorage.
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

  // ── Popular suggestions for autocomplete ──
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
    'Surat','Vadodara','Visakhapatnam','Mysore','Mangalore','Patna','Ranchi','Bhubaneswar',
    'Remote','Work from Home','Hybrid','Pan India','International',
    'New York','San Francisco','London','Singapore','Dubai','Toronto','Berlin','Sydney','Tokyo'
  ];

  function loadSaved() {
    try { return JSON.parse(localStorage.getItem('examresize_saved_jobs')) || []; }
    catch { return []; }
  }
  function saveSavedJobs() {
    localStorage.setItem('examresize_saved_jobs', JSON.stringify(savedJobs));
    const el = $('#saved-count');
    if (el) el.textContent = savedJobs.length;
  }

  document.addEventListener('DOMContentLoaded', () => {
    initFirebase();
    $('#saved-count').textContent = savedJobs.length;
    $('#job-search-btn').addEventListener('click', doSearch);
    $('#job-query').addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
    $('#jobs-load-more').addEventListener('click', loadMore);

    // Tab switching
    $$('.jobs-tab').forEach((t) => t.addEventListener('click', (e) => {
      currentTab = e.target.dataset.tab;
      $$('.jobs-tab').forEach((x) => x.classList.remove('active'));
      e.target.classList.add('active');
      render();
    }));

    // Filter chips (work mode)
    $$('.filter-chip').forEach((c) => c.addEventListener('click', (e) => {
      $$('.filter-chip').forEach((x) => x.classList.remove('active'));
      e.target.classList.add('active');
      workMode = e.target.dataset.mode;
      applyClientFilters();
      render();
    }));

    // Filter dropdowns
    ['filter-salary', 'filter-date', 'filter-exp'].forEach((id) => {
      const el = $(`#${id}`);
      if (el) el.addEventListener('change', () => { applyClientFilters(); render(); });
    });

    // Autocomplete
    setupAutocomplete('job-query', 'query-suggestions', JOB_TITLES);
    setupAutocomplete('job-location', 'location-suggestions', LOCATIONS);

    updatePlatformLinks();
    showEmpty('Search for jobs above to get started');
    // Auto-search trending
    $('#job-query').value = 'Software Developer';
    doSearch();
  });

  // ══════ AUTOCOMPLETE ══════
  function setupAutocomplete(inputId, listId, suggestions) {
    const input = $(`#${inputId}`);
    const list = $(`#${listId}`);
    let highlightIdx = -1;

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (q.length < 1) { list.classList.remove('show'); return; }
      const matches = suggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 8);
      if (matches.length === 0) { list.classList.remove('show'); return; }
      highlightIdx = -1;
      list.innerHTML = matches.map((m, i) => {
        const idx = m.toLowerCase().indexOf(q);
        const before = m.substring(0, idx);
        const match = m.substring(idx, idx + q.length);
        const after = m.substring(idx + q.length);
        return `<div class="autocomplete-item" data-idx="${i}">${before}<span class="ac-match">${match}</span>${after}</div>`;
      }).join('');
      list.classList.add('show');

      list.querySelectorAll('.autocomplete-item').forEach((item) => {
        item.addEventListener('click', () => {
          input.value = item.textContent;
          list.classList.remove('show');
          if (inputId === 'job-query') updatePlatformLinks();
        });
      });
    });

    input.addEventListener('keydown', (e) => {
      const items = list.querySelectorAll('.autocomplete-item');
      if (!list.classList.contains('show') || items.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        highlightIdx = Math.min(highlightIdx + 1, items.length - 1);
        items.forEach((it, i) => it.classList.toggle('highlighted', i === highlightIdx));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        highlightIdx = Math.max(highlightIdx - 1, 0);
        items.forEach((it, i) => it.classList.toggle('highlighted', i === highlightIdx));
      } else if (e.key === 'Enter' && highlightIdx >= 0) {
        e.preventDefault();
        input.value = items[highlightIdx].textContent;
        list.classList.remove('show');
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest(`#${inputId}`) && !e.target.closest(`#${listId}`)) {
        list.classList.remove('show');
      }
    });
  }

  // ══════ PLATFORM LINKS ══════
  function updatePlatformLinks() {
    const q = encodeURIComponent($('#job-query').value.trim() || 'jobs');
    const loc = encodeURIComponent($('#job-location').value.trim() || 'India');
    $('#pl-naukri').href = `https://www.naukri.com/${q.replace(/%20/g, '-')}-jobs`;
    $('#pl-linkedin').href = `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${loc}`;
    $('#pl-indeed').href = `https://www.indeed.co.in/jobs?q=${q}&l=${loc}`;
    $('#pl-ambitionbox').href = `https://www.ambitionbox.com/jobs/search?q=${q}`;
    $('#pl-internshala').href = `https://internshala.com/internships/${q.replace(/%20/g, '-')}-internship`;
  }

  // ══════ SEARCH ══════
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

    // Fetch from multiple sources in parallel
    const results = await Promise.allSettled([
      fetchJSearch(searchQuery, searchLocation, type, 1),
      fetchRemoteOK(searchQuery)
    ]);

    results.forEach((r) => {
      if (r.status === 'fulfilled' && r.value) jobs.push(...r.value);
    });

    // Sort by date (newest first)
    jobs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    applyClientFilters();

    if (filteredJobs.length === 0) showEmpty('No jobs found. Try different keywords or adjust your filters.');
    else render();
  }

  // ══════ CLIENT-SIDE FILTERS ══════
  function applyClientFilters() {
    let list = [...jobs];

    // Work mode filter
    if (workMode === 'remote') list = list.filter((j) => j.remote);
    else if (workMode === 'onsite') list = list.filter((j) => !j.remote && !j.hybrid);
    else if (workMode === 'hybrid') list = list.filter((j) => j.hybrid);

    // Salary filter
    const salaryMin = parseInt($('#filter-salary')?.value) || 0;
    if (salaryMin > 0) {
      list = list.filter((j) => {
        if (!j.salaryNum) return false;
        return j.salaryNum >= salaryMin * 100000;
      });
    }

    filteredJobs = list;
  }

  // ══════ JSEARCH API ══════
  async function fetchJSearch(query, location, type, page) {
    if (!JSEARCH_API_KEY || JSEARCH_API_KEY === 'PASTE_YOUR_RAPIDAPI_KEY_HERE') {
      console.warn('JSearch API key not configured');
      return [];
    }
    try {
      const datePosted = $('#filter-date')?.value || 'month';
      const params = new URLSearchParams({
        query: `${query}${location ? ' in ' + location : ''}`,
        page: String(page),
        num_pages: '1',
        date_posted: datePosted
      });
      if (type === 'remote') params.set('remote_jobs_only', 'true');
      if (type === 'fulltime') params.set('employment_types', 'FULLTIME');
      if (type === 'parttime') params.set('employment_types', 'PARTTIME');
      if (type === 'intern') params.set('employment_types', 'INTERN');
      if (type === 'freelance') params.set('employment_types', 'CONTRACTOR');

      const expReq = $('#filter-exp')?.value;
      if (expReq) params.set('job_requirements', expReq);

      const res = await fetch(`https://jsearch.p.rapidapi.com/search?${params}`, {
        headers: { 'X-RapidAPI-Key': JSEARCH_API_KEY, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' }
      });
      const data = await res.json();
      return (data.data || []).map((j) => {
        const minSal = j.job_min_salary || 0;
        const maxSal = j.job_max_salary || 0;
        return {
          id: j.job_id,
          title: j.job_title,
          company: j.employer_name,
          location: j.job_city ? `${j.job_city}, ${j.job_state || j.job_country}` : j.job_country || 'Not specified',
          salary: minSal && maxSal ? `${formatSalary(minSal)} - ${formatSalary(maxSal)} ${j.job_salary_currency || ''}` : '',
          salaryNum: maxSal || minSal || 0,
          type: j.job_employment_type || '',
          remote: j.job_is_remote,
          hybrid: (j.job_title + ' ' + (j.job_description || '')).toLowerCase().includes('hybrid'),
          description: j.job_description ? j.job_description.substring(0, 350) : '',
          url: j.job_apply_link || j.job_google_link || '#',
          source: j.employer_name || 'JSearch',
          logo: j.employer_logo,
          date: j.job_posted_at_datetime_utc,
          highlights: j.job_highlights?.Qualifications?.slice(0, 2) || []
        };
      });
    } catch (e) { console.warn('JSearch error:', e); return []; }
  }

  // ══════ REMOTEOK API ══════
  async function fetchRemoteOK(query) {
    try {
      const res = await fetch('https://remoteok.com/api');
      const data = await res.json();
      const filtered = data.filter((j) => j.position && j.company);
      const q = query.toLowerCase();
      return filtered
        .filter((j) => j.position.toLowerCase().includes(q) || (j.tags || []).some((t) => t.toLowerCase().includes(q)) || j.company.toLowerCase().includes(q))
        .slice(0, 20)
        .map((j) => ({
          id: 'rok-' + j.id,
          title: j.position,
          company: j.company,
          location: j.location || 'Remote',
          salary: j.salary || '',
          salaryNum: parseSalaryNum(j.salary),
          type: 'Remote',
          remote: true,
          hybrid: false,
          description: (j.description || '').replace(/<[^>]*>/g, '').substring(0, 350),
          url: j.url || `https://remoteok.com/l/${j.id}`,
          source: 'RemoteOK',
          logo: j.company_logo,
          date: j.date,
          highlights: (j.tags || []).slice(0, 3)
        }));
    } catch (e) { console.warn('RemoteOK error:', e); return []; }
  }

  function parseSalaryNum(str) {
    if (!str) return 0;
    const nums = str.match(/\d[\d,]*/g);
    if (nums) return parseInt(nums[0].replace(/,/g, ''));
    return 0;
  }

  function formatSalary(n) {
    if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
    if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'K';
    return n;
  }

  // ══════ RENDER ══════
  function render() {
    const grid = $('#jobs-grid');
    const list = currentTab === 'saved' ? savedJobs : filteredJobs;

    // Update result info
    const info = $('#jobs-result-info');
    if (currentTab === 'search' && filteredJobs.length > 0) {
      info.style.display = 'flex';
      info.innerHTML = `<span class="result-count">${filteredJobs.length} jobs found</span><span>for "${esc(searchQuery)}"${searchLocation ? ' in ' + esc(searchLocation) : ''}</span>`;
    } else {
      info.style.display = 'none';
    }

    if (list.length === 0) {
      showEmpty(currentTab === 'saved' ? 'No saved jobs yet. Search and bookmark jobs to save them.' : 'No results. Try searching or adjust filters.');
      return;
    }
    grid.innerHTML = list.map((j) => renderJobCard(j)).join('');
    bindJobEvents();
    $('#jobs-load-more').style.display = currentTab === 'search' && filteredJobs.length >= 10 ? 'block' : 'none';
  }

  function renderJobCard(j) {
    const isSaved = savedJobs.some((s) => s.id === j.id);
    const dateStr = j.date ? timeAgo(new Date(j.date)) : '';
    const modeTag = j.remote ? '<span class="job-tag remote">🌐 Remote</span>'
      : j.hybrid ? '<span class="job-tag hybrid">🔄 Hybrid</span>'
      : '<span class="job-tag onsite">🏢 On-site</span>';

    return `
      <div class="job-card" data-job-id="${esc(j.id)}">
        <div class="job-card-header">
          ${j.logo ? `<img src="${esc(j.logo)}" alt="${esc(j.company)}" class="job-logo" onerror="this.style.display='none'">` : ''}
          <div class="job-title-wrap">
            <div class="job-title">${esc(j.title)}</div>
            <div class="job-company">${esc(j.company)}</div>
          </div>
          <button class="job-bookmark" data-job-id="${esc(j.id)}" title="${isSaved ? 'Remove bookmark' : 'Save job'}">${isSaved ? '❤️' : '🤍'}</button>
        </div>
        <div class="job-meta">
          <span class="job-tag">📍 ${esc(j.location)}</span>
          ${j.type ? `<span class="job-tag">${esc(j.type)}</span>` : ''}
          ${modeTag}
          ${j.salary ? `<span class="job-tag salary">💰 ${esc(j.salary)}</span>` : ''}
        </div>
        ${j.description ? `<div class="job-desc">${esc(j.description)}</div>` : ''}
        ${j.highlights && j.highlights.length > 0 ? `<div class="job-meta" style="margin-bottom:12px">${j.highlights.map((h) => `<span class="job-tag fresh">${esc(h.substring(0, 40))}${h.length > 40 ? '…' : ''}</span>`).join('')}</div>` : ''}
        <div class="job-actions">
          <a href="${esc(j.url)}" target="_blank" rel="noopener" class="job-apply-btn">Apply Now →</a>
          <span class="job-source">via ${esc(j.source)}</span>
          ${dateStr ? `<span class="job-date">${dateStr}</span>` : ''}
        </div>
      </div>`;
  }

  function timeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
  }

  function bindJobEvents() {
    $$('.job-bookmark').forEach((b) => b.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.jobId;
      const idx = savedJobs.findIndex((s) => s.id === id);
      if (idx >= 0) {
        savedJobs.splice(idx, 1);
        showToast('Job removed from saved', 'info');
      } else {
        const job = jobs.find((j) => j.id === id) || filteredJobs.find((j) => j.id === id) || savedJobs.find((j) => j.id === id);
        if (job) { savedJobs.push(job); showToast('Job saved!', 'success'); }
      }
      saveSavedJobs();
      render();
    }));
  }

  async function loadMore() {
    currentPage++;
    const btn = $('#jobs-load-more');
    btn.textContent = 'Loading...';
    const newJobs = await fetchJSearch(searchQuery, searchLocation, $('#job-type').value, currentPage);
    if (newJobs && newJobs.length > 0) {
      jobs.push(...newJobs);
      applyClientFilters();
      render();
    } else {
      btn.style.display = 'none';
      showToast('No more jobs to load', 'info');
    }
    btn.textContent = 'Load More Jobs';
  }

  function showLoading() {
    const grid = $('#jobs-grid');
    grid.innerHTML = Array(6).fill('').map(() =>
      `<div class="job-skeleton"><div class="skel-line medium"></div><div class="skel-line short"></div><div class="skel-line"></div><div class="skel-line short"></div></div>`
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
    c.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
  }
})();
