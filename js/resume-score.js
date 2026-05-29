/**
 * ATS Resume Score Checker — Client-side resume analysis engine.
 * No data is sent anywhere. All analysis happens in the browser.
 */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);

  const SECTIONS = ['summary', 'objective', 'experience', 'education', 'skills', 'projects', 'certifications', 'achievements', 'languages', 'interests', 'references'];
  const CRITICAL_SECTIONS = ['experience', 'education', 'skills'];
  const STOP_WORDS = new Set(['the','a','an','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','shall','can','to','of','in','for','on','with','at','by','from','as','into','through','during','before','after','above','below','between','under','about','against','and','but','or','nor','not','so','yet','both','either','neither','each','every','all','any','few','more','most','other','some','such','no','only','own','same','than','too','very','just','because','if','when','where','how','what','which','who','whom','this','that','these','those','i','me','my','we','our','you','your','he','him','his','she','her','it','its','they','them','their']);

  document.addEventListener('DOMContentLoaded', () => {
    initFirebase();
    $('#rs-analyze-btn').addEventListener('click', analyze);
  });

  function analyze() {
    const resumeText = $('#rs-resume').value.trim();
    const jdText = $('#rs-jd').value.trim();

    if (!resumeText || !jdText) {
      showToast('Please paste both your resume and the job description', 'error');
      return;
    }

    const btn = $('#rs-analyze-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Analyzing...';

    setTimeout(() => {
      try {
        const result = computeScore(resumeText, jdText);
        displayResults(result);
      } catch (e) {
        console.error(e);
        showToast('Analysis failed. Please check your input.', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '🔍 Analyze Resume Score';
      }
    }, 500);
  }

  function extractKeywords(text) {
    return text.toLowerCase()
      .replace(/[^a-z0-9\s\+\#\.]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  }

  function extractPhrases(text) {
    const phrases = [];
    const lower = text.toLowerCase();
    // Extract 2-3 word phrases
    const words = lower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    for (let i = 0; i < words.length - 1; i++) {
      if (!STOP_WORDS.has(words[i])) {
        phrases.push(words[i] + ' ' + words[i + 1]);
        if (i < words.length - 2) phrases.push(words[i] + ' ' + words[i + 1] + ' ' + words[i + 2]);
      }
    }
    return phrases;
  }

  function detectSections(text) {
    const lower = text.toLowerCase();
    const found = [];
    SECTIONS.forEach((s) => {
      const patterns = [
        new RegExp(`\\b${s}\\b`, 'i'),
        new RegExp(`\\b${s}s?\\b`, 'i'),
        s === 'experience' ? /work\s*(history|experience)/i : null,
        s === 'education' ? /academic|qualification/i : null,
        s === 'skills' ? /technical\s*skills|core\s*competencies/i : null,
        s === 'projects' ? /personal\s*projects|academic\s*projects/i : null
      ].filter(Boolean);
      if (patterns.some((p) => p.test(lower))) found.push(s);
    });
    return found;
  }

  function computeScore(resumeText, jdText) {
    const resumeLower = resumeText.toLowerCase();
    const jdKeywords = extractKeywords(jdText);
    const resumeKeywords = extractKeywords(resumeText);
    const jdPhrases = extractPhrases(jdText);

    // 1. Keyword frequency in JD
    const jdFreq = {};
    jdKeywords.forEach((w) => { jdFreq[w] = (jdFreq[w] || 0) + 1; });
    // Top keywords by frequency
    const topJdKeywords = Object.entries(jdFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([word]) => word);

    // 2. Keyword match
    const matched = [];
    const missing = [];
    topJdKeywords.forEach((kw) => {
      if (resumeLower.includes(kw)) matched.push(kw);
      else missing.push(kw);
    });
    const keywordScore = topJdKeywords.length > 0 ? Math.round((matched.length / topJdKeywords.length) * 100) : 0;

    // 3. Section completeness
    const foundSections = detectSections(resumeText);
    const criticalFound = CRITICAL_SECTIONS.filter((s) => foundSections.includes(s));
    const sectionScore = Math.round((criticalFound.length / CRITICAL_SECTIONS.length) * 70 + (Math.min(foundSections.length, 6) / 6) * 30);

    // 4. Format score
    let formatScore = 60;
    if (resumeText.length > 300) formatScore += 10;
    if (resumeText.length > 800) formatScore += 10;
    if (/\b\d{10}\b|\+\d{2}/.test(resumeText)) formatScore += 5; // has phone
    if (/@/.test(resumeText)) formatScore += 5; // has email
    if (/linkedin|github|portfolio/i.test(resumeText)) formatScore += 5;
    if (resumeText.split('\n').length > 15) formatScore += 5;
    formatScore = Math.min(formatScore, 100);

    // 5. Phrase match bonus
    const jdPhraseFreq = {};
    jdPhrases.forEach((p) => { jdPhraseFreq[p] = (jdPhraseFreq[p] || 0) + 1; });
    const topPhrases = Object.entries(jdPhraseFreq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([p]) => p);
    const phraseMatches = topPhrases.filter((p) => resumeLower.includes(p));
    const phraseScore = topPhrases.length > 0 ? Math.round((phraseMatches.length / topPhrases.length) * 100) : 50;

    // Overall ATS score (weighted)
    const overall = Math.round(keywordScore * 0.40 + sectionScore * 0.20 + formatScore * 0.20 + phraseScore * 0.20);

    // Suggestions
    const suggestions = [];
    if (keywordScore < 50) suggestions.push({ type: 'bad', icon: '🔴', title: 'Low Keyword Match', text: `Only ${matched.length}/${topJdKeywords.length} key terms found. Add missing keywords naturally into your resume.` });
    else if (keywordScore < 75) suggestions.push({ type: 'warn', icon: '🟡', title: 'Moderate Keyword Match', text: `${matched.length}/${topJdKeywords.length} key terms found. Try to include more of the missing keywords.` });
    else suggestions.push({ type: 'good', icon: '🟢', title: 'Strong Keyword Match', text: `${matched.length}/${topJdKeywords.length} key terms found. Great job matching the job description!` });

    CRITICAL_SECTIONS.forEach((s) => {
      if (!foundSections.includes(s)) suggestions.push({ type: 'bad', icon: '🔴', title: `Missing "${s}" Section`, text: `ATS systems look for a clear "${s}" section. Add one with a proper heading.` });
    });

    if (!/@/.test(resumeText)) suggestions.push({ type: 'warn', icon: '🟡', title: 'No Email Detected', text: 'Include your email address in the resume header.' });
    if (resumeText.length < 500) suggestions.push({ type: 'warn', icon: '🟡', title: 'Resume Too Short', text: 'Your resume seems too short. Add more detail to your experience and skills.' });
    if (resumeText.length > 5000) suggestions.push({ type: 'warn', icon: '🟡', title: 'Resume May Be Too Long', text: 'Keep your resume concise — ideally 1-2 pages for most roles.' });
    if (missing.length > 0) suggestions.push({ type: 'warn', icon: '📝', title: 'Add These Keywords', text: `Consider adding: ${missing.slice(0, 8).join(', ')}` });
    if (phraseScore < 40) suggestions.push({ type: 'warn', icon: '🟡', title: 'Low Phrase Match', text: 'Use exact phrases from the job description like job titles, tools, and methodologies.' });

    return { overall, keywordScore, sectionScore, formatScore, phraseScore, matched, missing, foundSections, suggestions };
  }

  function displayResults(r) {
    const results = $('#rs-results');
    results.classList.add('visible');

    // Gauge
    const gauge = $('#rs-gauge');
    const grade = r.overall >= 80 ? { text: 'Excellent', color: '#10b981', bg: 'rgba(16,185,129,0.1)' }
      : r.overall >= 60 ? { text: 'Good', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' }
      : r.overall >= 40 ? { text: 'Needs Work', color: '#f97316', bg: 'rgba(249,115,22,0.1)' }
      : { text: 'Poor', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };

    gauge.style.background = `conic-gradient(${grade.color} ${r.overall * 3.6}deg, rgba(255,255,255,0.08) 0deg)`;
    gauge.textContent = r.overall;
    gauge.style.color = grade.color;
    $('#rs-score-grade').textContent = grade.text;
    $('#rs-score-grade').style.background = grade.bg;
    $('#rs-score-grade').style.color = grade.color;

    // Breakdown
    const metrics = [
      { label: 'Keyword Match', value: r.keywordScore, color: '#6366f1' },
      { label: 'Section Score', value: r.sectionScore, color: '#8b5cf6' },
      { label: 'Format Score', value: r.formatScore, color: '#06b6d4' },
      { label: 'Phrase Match', value: r.phraseScore, color: '#ec4899' }
    ];
    $('#rs-breakdown').innerHTML = metrics.map((m) => `
      <div class="rs-metric">
        <div class="rs-metric-value" style="color:${m.color}">${m.value}%</div>
        <div class="rs-metric-label">${m.label}</div>
        <div class="rs-metric-bar"><div class="rs-metric-bar-fill" style="width:${m.value}%;background:${m.color}"></div></div>
      </div>
    `).join('');

    // Keywords
    $('#rs-keywords').innerHTML = `
      <h4>🔑 Keyword Analysis</h4>
      <div class="rs-kw-list">
        ${r.matched.map((k) => `<span class="rs-kw found">✓ ${k}</span>`).join('')}
        ${r.missing.map((k) => `<span class="rs-kw missing">✗ ${k}</span>`).join('')}
      </div>`;

    // Suggestions
    $('#rs-suggestion-list').innerHTML = r.suggestions.map((s) => `
      <div class="rs-suggestion ${s.type}">
        <span class="rs-suggestion-icon">${s.icon}</span>
        <div class="rs-suggestion-text"><strong>${s.title}</strong>${s.text}</div>
      </div>
    `).join('');

    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showToast(msg, type) {
    const c = $('#toast-container'); if (!c) return;
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span class="toast-icon">${type === 'success' ? '✅' : '❌'}</span><span>${msg}</span>`;
    c.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
  }
})();
