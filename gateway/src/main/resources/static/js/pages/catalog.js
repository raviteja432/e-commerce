/**
 * catalog.js — Unified Products Listing & Search Page
 *
 * Full-width product grid. Filters are hidden by default.
 * A "Filters" button in the toolbar opens a slide-over drawer
 * with Amazon/Flipkart-style filters (Category, Price, Rating, Sort).
 */

import { apiFetch } from '../core/api.js';
import { getState, setState } from '../core/state.js';
import { setView, productGridSkeleton, formatCurrency, starsHTML } from '../core/ui.js';
import { addToCart } from '../pages/cart.js';

let currentFilters = {
  category: '',
  search: '',
  minPrice: '',
  maxPrice: '',
  minRating: '',
  sort: '',
  page: 0,
  size: 12
};

export async function renderCatalog(queryParams) {
  currentFilters = {
    category: queryParams ? (queryParams.get('category') || '') : '',
    search:   queryParams ? (queryParams.get('search')   || '') : '',
    minPrice: queryParams ? (queryParams.get('minPrice') || '') : '',
    maxPrice: queryParams ? (queryParams.get('maxPrice') || '') : '',
    minRating: '',
    sort:     queryParams ? (queryParams.get('sort')     || '') : '',
    page: 0,
    size: 12
  };

  const state = getState();
  let categoriesList = state.categories || [];
  if (categoriesList.length === 0) {
    try {
      categoriesList = await apiFetch('/categories') || [];
      setState({ categories: categoriesList });
    } catch (e) {
      console.warn('Could not fetch categories:', e);
    }
  }

  const pageTitle = currentFilters.category
    ? `${currentFilters.category}`
    : currentFilters.search
    ? `Results for "${currentFilters.search}"`
    : 'All Products';

  const activeFilterCount = [
    currentFilters.category, currentFilters.search,
    currentFilters.minPrice || currentFilters.maxPrice ? 'price' : '',
    currentFilters.minRating, currentFilters.sort
  ].filter(Boolean).length;

  setView(`
    <div class="page-wrapper">
      <div class="page-container">

        <!-- Top Toolbar -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
          <div>
            <h1 class="section-title" style="margin:0; font-size:clamp(18px,3vw,26px);">${pageTitle}</h1>
            <div id="catalog-results-count" class="text-muted text-sm" style="margin-top:4px;">Loading products...</div>
          </div>

          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <!-- Inline search -->
            <div class="search-wrapper" style="min-width:220px;">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" id="catalog-top-search" class="search-input" placeholder="Search within results..." value="${currentFilters.search}">
            </div>

            <!-- Sort -->
            <select id="catalog-sort-select" class="form-control" style="height:42px; min-width:175px;">
              <option value="" ${currentFilters.sort==='' ? 'selected':''}>Sort: Featured</option>
              <option value="price_asc"  ${currentFilters.sort==='price_asc'  ? 'selected':''}>Price: Low to High</option>
              <option value="price_desc" ${currentFilters.sort==='price_desc' ? 'selected':''}>Price: High to Low</option>
              <option value="rating_desc"${currentFilters.sort==='rating_desc'? 'selected':''}>Top Rated</option>
            </select>

            <!-- Filters Button -->
            <button id="open-filter-btn" class="btn btn-secondary d-flex items-center gap-2" style="height:42px; padding:0 18px; border-radius:var(--radius-md); position:relative;">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
              Filters
              <span id="filter-active-badge" class="d-none" style="position:absolute; top:-6px; right:-6px; background:var(--primary); color:#fff; font-size:10px; font-weight:700; border-radius:50%; width:18px; height:18px; display:flex; align-items:center; justify-content:center; line-height:1;">0</span>
            </button>
          </div>
        </div>

        <!-- Active Filter Tags -->
        <div id="active-filter-tags" class="d-flex items-center gap-2 flex-wrap mb-4 d-none"></div>

        <!-- Product Grid (full width) -->
        <div id="catalog-grid" class="product-grid" style="grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));">
          ${productGridSkeleton(8)}
        </div>

        <div id="catalog-pagination" class="pagination" style="margin-top:40px;"></div>

      </div>
    </div>

    <!-- Filter Slide-Over Drawer -->
    <div id="filter-backdrop" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:1000; backdrop-filter:blur(4px); opacity:0; transition:opacity 0.25s;">
      <div id="filter-drawer" style="
        position:fixed; top:0; right:0; bottom:0; width:100%; max-width:380px;
        background:var(--bg-secondary); border-left:1px solid var(--border);
        display:flex; flex-direction:column; z-index:1001;
        transform:translateX(110%); transition:transform 0.3s cubic-bezier(0.16,1,0.3,1);
        box-shadow: -8px 0 40px rgba(0,0,0,0.3);
      ">
        <!-- Drawer Header -->
        <div style="padding:20px 24px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:17px; font-weight:700; display:flex; align-items:center; gap:8px;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" style="width:20px;height:20px;">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filter Products
          </div>
          <button id="close-filter-btn" style="background:none; border:none; cursor:pointer; color:var(--text-muted); padding:4px; border-radius:50%;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- Drawer Body -->
        <div style="flex:1; overflow-y:auto; padding:24px; display:flex; flex-direction:column; gap:24px;">

          <!-- Category -->
          <div>
            <div style="font-weight:700; font-size:13px; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin-bottom:12px;">Category</div>
            <div style="display:flex; flex-direction:column; gap:8px; max-height:200px; overflow-y:auto;">
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:14px;">
                <input type="radio" name="f-category" value="" style="accent-color:var(--primary);" ${!currentFilters.category ? 'checked' : ''}>
                <span>All Categories</span>
              </label>
              ${categoriesList.map(cat => `
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:14px;">
                  <input type="radio" name="f-category" value="${cat.name}" style="accent-color:var(--primary);" ${currentFilters.category === cat.name ? 'checked' : ''}>
                  <span>${cat.name}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div class="divider"></div>

          <!-- Price Range -->
          <div>
            <div style="font-weight:700; font-size:13px; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin-bottom:12px;">Price Range</div>
            
            <!-- Quick brackets -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px;">
              <button class="btn btn-ghost btn-sm quick-price-btn" data-min="0" data-max="50" style="font-size:12px; justify-content:center;">Under $50</button>
              <button class="btn btn-ghost btn-sm quick-price-btn" data-min="50" data-max="100" style="font-size:12px; justify-content:center;">$50–$100</button>
              <button class="btn btn-ghost btn-sm quick-price-btn" data-min="100" data-max="500" style="font-size:12px; justify-content:center;">$100–$500</button>
              <button class="btn btn-ghost btn-sm quick-price-btn" data-min="500" data-max="" style="font-size:12px; justify-content:center;">$500+</button>
            </div>

            <!-- Custom range -->
            <div style="display:flex; gap:8px; align-items:center;">
              <input type="number" id="f-min-price" class="form-control" placeholder="Min $" value="${currentFilters.minPrice}" style="font-size:13px;">
              <span class="text-muted">–</span>
              <input type="number" id="f-max-price" class="form-control" placeholder="Max $" value="${currentFilters.maxPrice}" style="font-size:13px;">
            </div>
          </div>

          <div class="divider"></div>

          <!-- Customer Rating -->
          <div>
            <div style="font-weight:700; font-size:13px; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin-bottom:12px;">Customer Rating</div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:14px;">
                <input type="radio" name="f-rating" value="" style="accent-color:var(--primary);" ${!currentFilters.minRating ? 'checked' : ''}>
                <span>Any Rating</span>
              </label>
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:14px;">
                <input type="radio" name="f-rating" value="4" style="accent-color:var(--primary);" ${currentFilters.minRating === '4' ? 'checked' : ''}>
                <span style="color:#f59e0b; font-size:16px;">★★★★</span><span>& Up</span>
              </label>
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:14px;">
                <input type="radio" name="f-rating" value="3" style="accent-color:var(--primary);" ${currentFilters.minRating === '3' ? 'checked' : ''}>
                <span style="color:#f59e0b; font-size:16px;">★★★</span><span>& Up</span>
              </label>
            </div>
          </div>

        </div>

        <!-- Drawer Footer -->
        <div style="padding:16px 24px; border-top:1px solid var(--border); display:flex; gap:12px; background:var(--bg-primary);">
          <button id="filter-reset-btn" class="btn btn-ghost flex-1">Reset All</button>
          <button id="filter-apply-btn" class="btn btn-primary flex-1">Apply Filters</button>
        </div>
      </div>
    </div>
  `);

  setupListeners(categoriesList);
  await fetchProducts();
}

function openDrawer() {
  const backdrop = document.getElementById('filter-backdrop');
  const drawer   = document.getElementById('filter-drawer');
  if (!backdrop || !drawer) return;
  backdrop.style.display = 'block';
  requestAnimationFrame(() => {
    backdrop.style.opacity = '1';
    drawer.style.transform = 'translateX(0)';
  });
}

function closeDrawer() {
  const backdrop = document.getElementById('filter-backdrop');
  const drawer   = document.getElementById('filter-drawer');
  if (!backdrop || !drawer) return;
  backdrop.style.opacity = '0';
  drawer.style.transform = 'translateX(110%)';
  setTimeout(() => { backdrop.style.display = 'none'; }, 300);
}

function updateFilterBadge() {
  const badge = document.getElementById('filter-active-badge');
  if (!badge) return;
  const count = [
    currentFilters.category,
    currentFilters.minPrice || currentFilters.maxPrice ? 'price' : '',
    currentFilters.minRating,
  ].filter(Boolean).length;

  if (count > 0) {
    badge.textContent = count;
    badge.classList.remove('d-none');
    badge.style.display = 'flex';
  } else {
    badge.classList.add('d-none');
    badge.style.display = 'none';
  }
}

function updateActiveFilterTags() {
  const container = document.getElementById('active-filter-tags');
  if (!container) return;

  const tags = [];
  if (currentFilters.category) tags.push({ key: 'category', label: `Category: ${currentFilters.category}` });
  if (currentFilters.minPrice || currentFilters.maxPrice) tags.push({ key: 'price', label: `Price: $${currentFilters.minPrice || 0} – $${currentFilters.maxPrice || '∞'}` });
  if (currentFilters.minRating) tags.push({ key: 'rating', label: `${currentFilters.minRating}★ & Up` });

  if (tags.length === 0) { container.classList.add('d-none'); container.innerHTML = ''; return; }

  container.classList.remove('d-none');
  container.innerHTML = `
    <span class="text-xs text-muted font-semibold">Active Filters:</span>
    ${tags.map(t => `
      <span class="badge badge-secondary d-flex items-center gap-1" style="font-size:12px; padding:4px 10px; border-radius:20px;">
        ${t.label}
        <button class="rm-tag" data-key="${t.key}" style="background:none;border:none;color:inherit;cursor:pointer;padding:0;margin-left:2px;font-size:14px;line-height:1;">&times;</button>
      </span>
    `).join('')}
    <button id="clear-all-tags" class="text-xs text-primary-color font-semibold" style="background:none;border:none;cursor:pointer;">Clear all</button>
  `;

  container.querySelectorAll('.rm-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.key;
      if (k === 'category') currentFilters.category = '';
      if (k === 'price') { currentFilters.minPrice = ''; currentFilters.maxPrice = ''; }
      if (k === 'rating') currentFilters.minRating = '';
      currentFilters.page = 0;
      fetchProducts();
    });
  });

  document.getElementById('clear-all-tags')?.addEventListener('click', () => {
    currentFilters.category = '';
    currentFilters.minPrice = '';
    currentFilters.maxPrice = '';
    currentFilters.minRating = '';
    currentFilters.page = 0;
    fetchProducts();
  });
}

function setupListeners(categoriesList) {
  // Drawer open/close
  document.getElementById('open-filter-btn')?.addEventListener('click', openDrawer);
  document.getElementById('close-filter-btn')?.addEventListener('click', closeDrawer);
  document.getElementById('filter-backdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'filter-backdrop') closeDrawer();
  });

  // Top search debounce
  let searchTimeout;
  document.getElementById('catalog-top-search')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentFilters.search = e.target.value.trim();
      currentFilters.page = 0;
      fetchProducts();
    }, 400);
  });

  // Sort select
  document.getElementById('catalog-sort-select')?.addEventListener('change', (e) => {
    currentFilters.sort = e.target.value;
    currentFilters.page = 0;
    fetchProducts();
  });

  // Quick price brackets
  document.querySelectorAll('.quick-price-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilters.minPrice = btn.dataset.min || '';
      currentFilters.maxPrice = btn.dataset.max || '';
      const minEl = document.getElementById('f-min-price');
      const maxEl = document.getElementById('f-max-price');
      if (minEl) minEl.value = currentFilters.minPrice;
      if (maxEl) maxEl.value = currentFilters.maxPrice;
    });
  });

  // Apply filters
  document.getElementById('filter-apply-btn')?.addEventListener('click', () => {
    currentFilters.category  = document.querySelector('input[name="f-category"]:checked')?.value || '';
    currentFilters.minRating = document.querySelector('input[name="f-rating"]:checked')?.value || '';
    currentFilters.minPrice  = document.getElementById('f-min-price')?.value || '';
    currentFilters.maxPrice  = document.getElementById('f-max-price')?.value || '';
    currentFilters.page = 0;
    closeDrawer();
    fetchProducts();
  });

  // Reset filters
  document.getElementById('filter-reset-btn')?.addEventListener('click', () => {
    currentFilters.category  = '';
    currentFilters.minPrice  = '';
    currentFilters.maxPrice  = '';
    currentFilters.minRating = '';
    currentFilters.page      = 0;
    document.querySelectorAll('input[name="f-category"]').forEach(r => r.checked = r.value === '');
    document.querySelectorAll('input[name="f-rating"]').forEach(r => r.checked = r.value === '');
    const minEl = document.getElementById('f-min-price');
    const maxEl = document.getElementById('f-max-price');
    if (minEl) minEl.value = '';
    if (maxEl) maxEl.value = '';
    closeDrawer();
    fetchProducts();
  });
}

async function fetchProducts() {
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;

  grid.innerHTML = productGridSkeleton(8);
  updateFilterBadge();
  updateActiveFilterTags();

  const params = new URLSearchParams();
  if (currentFilters.category) params.append('category', currentFilters.category);
  if (currentFilters.search)   params.append('search',   currentFilters.search);
  if (currentFilters.minPrice) params.append('minPrice', currentFilters.minPrice);
  if (currentFilters.maxPrice) params.append('maxPrice', currentFilters.maxPrice);
  if (currentFilters.sort)     params.append('sort',     currentFilters.sort);
  params.append('page', currentFilters.page);
  params.append('size', currentFilters.size);

  try {
    const response = await apiFetch(`/products?${params.toString()}`);
    let products = response.content || [];

    // Client-side star rating filter
    if (currentFilters.minRating) {
      const minR = parseFloat(currentFilters.minRating);
      products = products.filter(p => (p.rating || 4.5) >= minR);
    }

    const countEl = document.getElementById('catalog-results-count');
    if (countEl) countEl.textContent = `${products.length} of ${response.totalElements || products.length} products`;

    if (products.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:60px 0;">
          <div class="empty-state-icon mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <div class="empty-state-title">No products found</div>
          <div class="empty-state-desc">Try adjusting your filters or search query.</div>
        </div>`;
      document.getElementById('catalog-pagination').innerHTML = '';
      return;
    }

    grid.innerHTML = products.map((prod, idx) => {
      const img = prod.primaryImageUrl || prod.imageUrl || (prod.imageUrls && prod.imageUrls[0]) || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';
      return `
        <div class="product-card fade-in stagger-${(idx % 3) + 1}" data-id="${prod.id}">
          <div class="product-card-img-wrapper" onclick="window.location.hash='#/product/${prod.id}'">
            <img src="${img}" alt="${prod.name}" class="product-card-img" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'">
            ${prod.featured ? `<span class="product-card-badge badge badge-primary">Featured</span>` : ''}
          </div>
          <div class="product-card-body" onclick="window.location.hash='#/product/${prod.id}'">
            <div class="product-card-category">${prod.categoryName || 'General'}</div>
            <div class="product-card-name">${prod.name}</div>
            <div class="product-card-vendor">by ${prod.vendorName || 'Apex Seller'}</div>
            <div class="mt-auto">${starsHTML(prod.rating || 4.5)}</div>
          </div>
          <div class="product-card-footer">
            <div class="product-card-price">${formatCurrency(prod.price)}</div>
            <button class="product-card-add-btn add-to-cart-trigger" data-id="${prod.id}" title="Add to Cart">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
            </button>
          </div>
        </div>`;
    }).join('');

    grid.querySelectorAll('.add-to-cart-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); addToCart(btn.dataset.id); });
    });

    renderPagination(response.totalPages, response.number);

  } catch (err) {
    console.error('Products fetch error:', err);
    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:60px; color:var(--text-muted);">Failed to load products. Try refreshing.</div>`;
  }
}

function renderPagination(totalPages, currentPage) {
  const container = document.getElementById('catalog-pagination');
  if (!container || !totalPages || totalPages <= 1) { if (container) container.innerHTML = ''; return; }

  let html = `<button class="pagination-btn" ${currentPage === 0 ? 'disabled' : ''} data-page="${currentPage - 1}">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><polyline points="15 18 9 12 15 6"/></svg>
  </button>`;

  for (let i = 0; i < totalPages; i++) {
    html += `<button class="pagination-btn ${currentPage === i ? 'active' : ''}" data-page="${i}">${i + 1}</button>`;
  }

  html += `<button class="pagination-btn" ${currentPage === totalPages - 1 ? 'disabled' : ''} data-page="${currentPage + 1}">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><polyline points="9 18 15 12 9 6"/></svg>
  </button>`;

  container.innerHTML = html;
  container.querySelectorAll('.pagination-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled || btn.classList.contains('active')) return;
      currentFilters.page = parseInt(btn.dataset.page);
      fetchProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}
