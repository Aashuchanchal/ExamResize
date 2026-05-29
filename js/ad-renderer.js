/**
 * Ad Renderer — Loads and displays ads from Firestore on the public site.
 * Tracks impressions and clicks.
 */

(function () {
  'use strict';

  let adsLoaded = false;
  let activeAds = [];

  // ── Load Ads ──
  async function loadAds() {
    if (!firebaseReady || adsLoaded) return;
    try {
      const now = new Date();
      const snapshot = await db.collection('ads').where('enabled', '==', true).get();
      activeAds = [];
      snapshot.forEach((doc) => {
        const ad = { id: doc.id, ...doc.data() };
        // Check date range
        const start = ad.startDate ? new Date(ad.startDate) : new Date(0);
        const end = ad.endDate ? new Date(ad.endDate) : new Date('2099-12-31');
        if (now >= start && now <= end) {
          activeAds.push(ad);
        }
      });
      adsLoaded = true;
      renderAllAds();
    } catch (err) {
      console.warn('Could not load ads:', err.message);
    }
  }

  // ── Render Ads by Position ──
  function renderAllAds() {
    const positions = ['top-banner', 'between-sections', 'sidebar', 'footer-banner'];
    positions.forEach((pos) => {
      const container = document.querySelector(`[data-ad-slot="${pos}"]`);
      if (!container) return;

      const posAds = activeAds.filter((a) => a.position === pos);
      if (posAds.length === 0) return;

      // Pick random ad if multiple for same position
      const ad = posAds[Math.floor(Math.random() * posAds.length)];
      renderAd(container, ad);
    });
  }

  function renderAd(container, ad) {
    container.innerHTML = `
      <div class="ad-unit" data-ad-id="${ad.id}">
        <span class="ad-label">Sponsored</span>
        <a href="${escapeAttr(ad.destinationUrl)}" target="_blank" rel="noopener sponsored" class="ad-link" data-ad-id="${ad.id}">
          ${ad.imageUrl
            ? `<img src="${escapeAttr(ad.imageUrl)}" alt="${escapeAttr(ad.title)}" class="ad-image" loading="lazy">`
            : `<div class="ad-text-unit">
                <strong>${escapeHtml(ad.title)}</strong>
                ${ad.description ? `<p>${escapeHtml(ad.description)}</p>` : ''}
                <span class="ad-cta">${ad.ctaText || 'Learn More'} →</span>
              </div>`
          }
        </a>
      </div>
    `;
    container.style.display = 'block';

    // Track impression
    trackImpression(ad.id);

    // Track click
    container.querySelector('.ad-link').addEventListener('click', () => {
      trackClick(ad.id);
    });
  }

  // ── Tracking ──
  async function trackImpression(adId) {
    if (!firebaseReady) return;
    try {
      await db.collection('ads').doc(adId).update({
        impressions: firebase.firestore.FieldValue.increment(1)
      });
    } catch (e) { /* silent */ }
  }

  async function trackClick(adId) {
    if (!firebaseReady) return;
    try {
      await db.collection('ads').doc(adId).update({
        clicks: firebase.firestore.FieldValue.increment(1)
      });
    } catch (e) { /* silent */ }
  }

  // ── Helpers ──
  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }
  function escapeAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ── Init after DOM + Firebase ──
  document.addEventListener('DOMContentLoaded', () => {
    // Wait a moment for Firebase to initialize
    setTimeout(loadAds, 1000);
  });
})();
