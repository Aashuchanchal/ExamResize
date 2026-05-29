/**
 * Job Portal — Multi-source job search with direct platform links.
 * Uses JSearch API (RapidAPI) + RemoteOK API.
 * Redirects users to original job listings for application.
 * Bookmarks saved in localStorage.
 */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  let jobs = [];
  let savedJobs = loadSaved();
  let currentTab = 'search';
  let currentPage = 1;
  let searchQuery = '';
  let searchLocation = '';

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

    // Update platform links on search
    updatePlatformLinks();
    // Show initial state
    showEmpty('Search for jobs above to get started');
    // Auto-search trending
    $('#job-query').value = 'Software Developer';
    doSearch();
  });

  function updatePlatformLinks() {
    const q = encodeURIComponent($('#job-query').value.trim() || 'jobs');
    const loc = encodeURIComponent($('#job-location').value.trim() || 'India');
    $('#pl-naukri').href = `https://www.naukri.com/${q.replace(/%20/g, '-')}-jobs`;
    $('#pl-linkedin').href = `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${loc}`;
    $('#pl-indeed').href = `https://www.indeed.co.in/jobs?q=${q}&l=${loc}`;
    $('#pl-ambitionbox').href = `https://www.ambitionbox.com/jobs/search?q=${q}`;
    $('#pl-internshala').href = `https://internshala.com/internships/${q.replace(/%20/g, '-')}-internship`;
  }

  async function doSearch() {
    searchQuery = $('#job-query').value.trim();
    searchLocation = $('#job-location').value.trim();
    const type = $('#job-type').value;
    if (!searchQuery) { showToast('Please enter a job title or keyword', 'error'); return; }

    updatePlatformLinks();
    currentPage = 1;
    jobs = [];
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

    if (jobs.length === 0) showEmpty('No jobs found. Try different keywords or check the platform links above.');
    else render();
  }

  // ── JSearch API (RapidAPI — aggregates LinkedIn, Indeed, Glassdoor, ZipRecruiter) ──
  async function fetchJSearch(query, location, type, page) {
    if (JSEARCH_API_KEY === 'PASTE_YOUR_RAPIDAPI_KEY_HERE') return [];
    try {
      const params = new URLSearchParams({
        query: `${query}${location ? ' in ' + location : ''}`,
        page: String(page),
        num_pages: '1',
        date_posted: 'month'
      });
      if (type === 'remote') params.set('remote_jobs_only', 'true');
      if (type === 'fulltime') params.set('employment_types', 'FULLTIME');
      if (type === 'parttime') params.set('employment_types', 'PARTTIME');
      if (type === 'intern') params.set('employment_types', 'INTERN');
      if (type === 'freelance') params.set('employment_types', 'CONTRACTOR');

      const res = await fetch(`https://jsearch.p.rapidapi.com/search?${params}`, {
        headers: { 'X-RapidAPI-Key': JSEARCH_API_KEY, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' }
      });
      const data = await res.json();
      return (data.data || []).map((j) => ({
        id: j.job_id,
        title: j.job_title,
        company: j.employer_name,
        location: j.job_city ? `${j.job_city}, ${j.job_state || j.job_country}` : j.job_country || 'Not specified',
        salary: j.job_min_salary && j.job_max_salary ? `${formatSalary(j.job_min_salary)} - ${formatSalary(j.job_max_salary)} ${j.job_salary_currency || ''}` : '',
        type: j.job_employment_type || '',
        remote: j.job_is_remote,
        description: j.job_description ? j.job_description.substring(0, 300) : '',
        url: j.job_apply_link || j.job_google_link || '#',
        source: j.employer_name || 'JSearch',
        logo: j.employer_logo,
        date: j.job_posted_at_datetime_utc
      }));
    } catch (e) { console.warn('JSearch error:', e); return []; }
  }

  // ── RemoteOK API (free, no key) ──
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
          type: 'Remote',
          remote: true,
          description: (j.description || '').replace(/<[^>]*>/g, '').substring(0, 300),
          url: j.url || `https://remoteok.com/l/${j.id}`,
          source: 'RemoteOK',
          logo: j.company_logo,
          date: j.date
        }));
    } catch (e) { console.warn('RemoteOK error:', e); return []; }
  }

  function formatSalary(n) {
    if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
    if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'K';
    return n;
  }

  // ── Render ──
  function render() {
    const grid = $('#jobs-grid');
    const list = currentTab === 'saved' ? savedJobs : jobs;
    if (list.length === 0) {
      showEmpty(currentTab === 'saved' ? 'No saved jobs yet. Search and bookmark jobs to save them.' : 'No results. Try searching.');
      return;
    }
    grid.innerHTML = list.map((j) => renderJobCard(j)).join('');
    bindJobEvents();
    $('#jobs-load-more').style.display = currentTab === 'search' && jobs.length >= 10 ? 'block' : 'none';
  }

  function renderJobCard(j) {
    const isSaved = savedJobs.some((s) => s.id === j.id);
    return `
      <div class="job-card" data-job-id="${esc(j.id)}">
        <div class="job-card-header">
          <div>
            <div class="job-title">${esc(j.title)}</div>
            <div class="job-company">${esc(j.company)}</div>
          </div>
          <button class="job-bookmark" data-job-id="${esc(j.id)}" title="${isSaved ? 'Remove bookmark' : 'Save job'}">${isSaved ? '❤️' : '🤍'}</button>
        </div>
        <div class="job-meta">
          <span class="job-tag">📍 ${esc(j.location)}</span>
          ${j.type ? `<span class="job-tag">${esc(j.type)}</span>` : ''}
          ${j.remote ? '<span class="job-tag remote">🌐 Remote</span>' : ''}
          ${j.salary ? `<span class="job-tag salary">💰 ${esc(j.salary)}</span>` : ''}
        </div>
        ${j.description ? `<div class="job-desc">${esc(j.description)}</div>` : ''}
        <div class="job-actions">
          <a href="${esc(j.url)}" target="_blank" rel="noopener" class="job-apply-btn">Apply Now →</a>
          <span class="job-source">via ${esc(j.source)}</span>
        </div>
      </div>`;
  }

  function bindJobEvents() {
    $$('.job-bookmark').forEach((b) => b.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.jobId;
      const idx = savedJobs.findIndex((s) => s.id === id);
      if (idx >= 0) {
        savedJobs.splice(idx, 1);
        showToast('Job removed from saved', 'info');
      } else {
        const job = jobs.find((j) => j.id === id) || savedJobs.find((j) => j.id === id);
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
    if (newJobs && newJobs.length > 0) { jobs.push(...newJobs); render(); }
    else { btn.style.display = 'none'; showToast('No more jobs to load', 'info'); }
    btn.textContent = 'Load More Jobs';
  }

  function showLoading() {
    const grid = $('#jobs-grid');
    grid.innerHTML = Array(6).fill('').map(() =>
      `<div class="job-skeleton"><div class="skel-line medium"></div><div class="skel-line short"></div><div class="skel-line"></div><div class="skel-line short"></div></div>`
    ).join('');
  }

  function showEmpty(msg) {
    $('#jobs-grid').innerHTML = `<div class="jobs-empty"><span>🔍</span><p>${msg}</p></div>`;
    $('#jobs-load-more').style.display = 'none';
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
