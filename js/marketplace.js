/**
 * Affiliate Marketplace — Loads products from Firestore and renders with affiliate links.
 * Admin adds products via admin panel. Click tracking for revenue analytics.
 * Falls back to demo products if Firestore is not configured.
 */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  let products = [];
  let activeCategory = 'all';

  // Demo products shown when Firestore has no data
  const DEMO_PRODUCTS = [
    { id: 'demo1', title: 'Quantitative Aptitude by R.S. Aggarwal', description: 'Best-selling book for SSC, Banking & all competitive exams', category: 'books', price: 449, originalPrice: 650, platform: 'amazon', imageUrl: 'https://m.media-amazon.com/images/I/51eZ0MbMNAL._SY466_.jpg', affiliateUrl: 'https://www.amazon.in/dp/8121925555', discount: 31 },
    { id: 'demo2', title: 'English Grammar by Wren & Martin', description: 'Complete grammar reference for all competitive exams', category: 'books', price: 399, originalPrice: 595, platform: 'amazon', imageUrl: 'https://m.media-amazon.com/images/I/81jqMOtWKIL._SY466_.jpg', affiliateUrl: 'https://www.amazon.in/dp/9352535014', discount: 33 },
    { id: 'demo3', title: 'HP Laptop 15s — Intel i5, 8GB RAM', description: 'Perfect for students: FHD display, SSD, Windows 11', category: 'electronics', price: 42990, originalPrice: 58410, platform: 'amazon', imageUrl: 'https://m.media-amazon.com/images/I/71jG+e7roXL._SX679_.jpg', affiliateUrl: 'https://www.amazon.in/dp/B0CSHP25VD', discount: 26 },
    { id: 'demo4', title: 'Casio FX-991EX Scientific Calculator', description: 'Advanced calculator for JEE, NEET & engineering exams', category: 'accessories', price: 1275, originalPrice: 1695, platform: 'flipkart', imageUrl: 'https://m.media-amazon.com/images/I/61PU6eEW-bL._SX679_.jpg', affiliateUrl: 'https://www.flipkart.com/casio-fx-991ex/p/itm6adb8b35ab3b4', discount: 25 },
    { id: 'demo5', title: 'Lucent General Knowledge Book', description: 'Must-have GK book for SSC, Railway, Banking & UPSC Prelims', category: 'books', price: 210, originalPrice: 395, platform: 'amazon', imageUrl: 'https://m.media-amazon.com/images/I/51mDaVV2LnL._SY466_.jpg', affiliateUrl: 'https://www.amazon.in/dp/938764603X', discount: 47 },
    { id: 'demo6', title: 'boAt Airdopes 141 Bluetooth Earbuds', description: 'Noise cancellation, 42H playback — great for online classes', category: 'accessories', price: 999, originalPrice: 4490, platform: 'amazon', imageUrl: 'https://m.media-amazon.com/images/I/51d0iYWjsdL._SX679_.jpg', affiliateUrl: 'https://www.amazon.in/dp/B09N3ZNHTY', discount: 78 },
    { id: 'demo7', title: 'Made Easy Handwritten Notes — CSE', description: 'Complete GATE CS handwritten notes set', category: 'study', price: 1899, originalPrice: 2999, platform: 'amazon', imageUrl: 'https://m.media-amazon.com/images/I/51KKR5P-tpL._SY466_.jpg', affiliateUrl: 'https://www.amazon.in/dp/B0BKJMX6R6', discount: 37 },
    { id: 'demo8', title: 'Logitech K380 Bluetooth Keyboard', description: 'Multi-device keyboard — switch between laptop, tablet & phone', category: 'accessories', price: 2795, originalPrice: 3495, platform: 'flipkart', imageUrl: 'https://m.media-amazon.com/images/I/51bMBHGGj-L._SX679_.jpg', affiliateUrl: 'https://www.flipkart.com/logitech-k380/p/itm8dbf8ec0e2d37', discount: 20 }
  ];

  document.addEventListener('DOMContentLoaded', async () => {
    initFirebase();
    await loadProducts();
    render();
    bindFilters();
  });

  async function loadProducts() {
    if (!firebaseReady) { products = DEMO_PRODUCTS; return; }
    try {
      const snap = await db.collection('products').where('enabled', '==', true).get();
      products = [];
      snap.forEach((doc) => products.push({ id: doc.id, ...doc.data() }));
      if (products.length === 0) products = DEMO_PRODUCTS;
    } catch { products = DEMO_PRODUCTS; }
  }

  function bindFilters() {
    $$('.mp-filter').forEach((f) => f.addEventListener('click', (e) => {
      activeCategory = e.target.dataset.cat;
      $$('.mp-filter').forEach((x) => x.classList.remove('active'));
      e.target.classList.add('active');
      render();
    }));
  }

  function render() {
    const grid = $('#mp-grid');
    const filtered = activeCategory === 'all' ? products : products.filter((p) => p.category === activeCategory);

    if (filtered.length === 0) {
      grid.innerHTML = '<div class="mp-empty"><span>🛒</span><p>No products in this category yet. Check back soon!</p></div>';
      return;
    }

    grid.innerHTML = filtered.map((p) => {
      const badgeClass = p.platform === 'amazon' ? 'mp-badge-amazon' : p.platform === 'flipkart' ? 'mp-badge-flipkart' : 'mp-badge-other';
      const btnClass = p.platform === 'amazon' ? 'amazon' : p.platform === 'flipkart' ? 'flipkart' : '';
      const platformLabel = p.platform ? p.platform.charAt(0).toUpperCase() + p.platform.slice(1) : 'Shop';
      return `
        <div class="mp-card">
          ${p.imageUrl ? `<img class="mp-card-img" src="${esc(p.imageUrl)}" alt="${esc(p.title)}" loading="lazy" onerror="this.style.display='none'">` : ''}
          <div class="mp-card-body">
            <span class="mp-card-badge ${badgeClass}">${platformLabel}</span>
            <div class="mp-card-title">${esc(p.title)}</div>
            <div class="mp-card-desc">${esc(p.description || '')}</div>
            <div class="mp-card-price">
              <span class="mp-price">₹${formatPrice(p.price)}</span>
              ${p.originalPrice ? `<span class="mp-original-price">₹${formatPrice(p.originalPrice)}</span>` : ''}
              ${p.discount ? `<span class="mp-discount">${p.discount}% OFF</span>` : ''}
            </div>
            <a href="${esc(p.affiliateUrl || '#')}" target="_blank" rel="noopener sponsored" class="mp-buy-btn ${btnClass}" data-product-id="${p.id}">
              🛒 Buy on ${platformLabel}
            </a>
          </div>
        </div>`;
    }).join('');

    // Track clicks
    $$('.mp-buy-btn').forEach((b) => b.addEventListener('click', (e) => {
      const pid = e.currentTarget.dataset.productId;
      trackProductClick(pid);
    }));
  }

  async function trackProductClick(productId) {
    if (!firebaseReady || productId.startsWith('demo')) return;
    try {
      await db.collection('products').doc(productId).update({
        clicks: firebase.firestore.FieldValue.increment(1)
      });
    } catch { /* silent */ }
  }

  function formatPrice(n) {
    return n ? n.toLocaleString('en-IN') : '0';
  }
  function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
})();
