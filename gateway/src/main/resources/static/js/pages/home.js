/**
 * home.js — Home Page View
 *
 * Clean, search-first homepage with:
 *  1. Top Search Bar Hero
 *  2. Product Categories Grid (direct link to products for that category)
 *  3. Featured Products Grid (with quick Add to Cart)
 *  4. Trust Badges Strip
 */

import { apiFetch } from '../core/api.js';
import { getState, setState } from '../core/state.js';
import { setView, productGridSkeleton, formatCurrency, starsHTML } from '../core/ui.js';
import { addToCart } from '../pages/cart.js';
import { navigate } from '../core/router.js';

export async function renderHome() {
  setView(`
    <div class="page-wrapper">
      <div class="page-container">
        
        <!-- Search Hero Section -->
        <div class="hero" style="min-height: 220px; padding: 48px 32px; border-radius: var(--radius-2xl); margin-bottom: 40px;">
          <div class="hero-bg">
            <div class="hero-bg-gradient"></div>
            <div class="hero-bg-grid"></div>
            <div class="hero-bg-orbs">
              <div class="hero-orb hero-orb-1"></div>
              <div class="hero-orb hero-orb-2"></div>
            </div>
          </div>
          <div class="hero-content" style="max-width: 720px; margin: 0 auto; text-align: center;">
            <h1 class="hero-title" style="font-size: clamp(1.8rem, 4vw, 2.6rem); margin-bottom: 12px;">
              Find Products, Brands & More
            </h1>
            <p class="hero-desc" style="margin-bottom: 24px; font-size: var(--text-base); color: var(--text-muted);">
              Search over thousands of products from top verified sellers.
            </p>

            <!-- Search Form -->
            <form id="home-search-form" style="display: flex; gap: 10px; max-width: 600px; margin: 0 auto; background: rgba(255,255,255,0.08); padding: 6px; border-radius: 40px; border: 1px solid var(--border); backdrop-filter: blur(12px);">
              <div class="search-wrapper" style="flex: 1; border: none; background: transparent;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon" style="left: 16px;">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input type="text" id="home-search-input" class="search-input" placeholder="Search for products, categories, or sellers..." style="padding-left: 44px; font-size: 16px; border: none; background: transparent; height: 48px;">
              </div>
              <button type="submit" class="btn btn-primary btn-lg" style="border-radius: 30px; padding: 0 28px; height: 48px; font-weight: 600; flex-shrink: 0;">
                Search
              </button>
            </form>
          </div>
        </div>

        <!-- Categories Section -->
        <div class="mb-10">
          <div class="d-flex items-center justify-between mb-4">
            <div>
              <h2 class="section-title" style="margin: 0;">Shop by Category</h2>
              <p class="text-muted text-sm" style="margin-top: 4px;">Click any category to explore all products in that category</p>
            </div>
            <a href="#/products" class="text-primary-color font-semibold text-sm">View All Products &rarr;</a>
          </div>

          <div id="home-categories" class="category-grid">
            <div class="skeleton" style="height:120px;border-radius:var(--radius-xl)"></div>
            <div class="skeleton" style="height:120px;border-radius:var(--radius-xl)"></div>
            <div class="skeleton" style="height:120px;border-radius:var(--radius-xl)"></div>
            <div class="skeleton" style="height:120px;border-radius:var(--radius-xl)"></div>
            <div class="skeleton" style="height:120px;border-radius:var(--radius-xl)"></div>
            <div class="skeleton" style="height:120px;border-radius:var(--radius-xl)"></div>
          </div>
        </div>

        <!-- Featured Products Section -->
        <div class="section-header mt-10">
          <div>
            <h2 class="section-title">Featured Products</h2>
            <p class="text-muted text-sm">Top rated products handpicked for you</p>
          </div>
          <a href="#/products?sort=rating,desc" class="btn btn-outline btn-sm">Explore Top Rated</a>
        </div>

        <div id="home-featured-grid" class="product-grid mb-12">
          ${productGridSkeleton(4)}
        </div>

        <!-- Trust Badges Strip -->
        <div class="trust-strip">
          <div class="trust-item">
            <div class="trust-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              <div class="trust-title">Secure Payments</div>
              <div class="trust-desc">Protected transactions</div>
            </div>
          </div>
          <div class="trust-item">
            <div class="trust-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <div>
              <div class="trust-title">Fast Delivery</div>
              <div class="trust-desc">Direct from verified sellers</div>
            </div>
          </div>
          <div class="trust-item">
            <div class="trust-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
            </div>
            <div>
              <div class="trust-title">Easy Returns</div>
              <div class="trust-desc">Hassle-free guarantee</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `);

  // Bind Home Search Bar Submit
  document.getElementById('home-search-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = document.getElementById('home-search-input')?.value.trim();
    if (query) {
      navigate(`/products?search=${encodeURIComponent(query)}`);
    } else {
      navigate('/products');
    }
  });

  // Fetch Category Data
  try {
    const categories = await apiFetch('/categories');
    if (Array.isArray(categories) && categories.length > 0) {
      setState({ categories });
      renderCategoriesUI(categories);
    } else {
      useFallbackCategories();
    }
  } catch (err) {
    console.warn('Could not load categories:', err);
    useFallbackCategories();
  }

  // Fetch Featured Products
  try {
    const response = await apiFetch('/products?featured=true&size=4');
    const products = response.content || [];
    renderFeaturedUI(products);
  } catch (err) {
    console.warn('Could not load featured products:', err);
    const container = document.getElementById('home-featured-grid');
    if (container) {
      container.innerHTML = `<div class="w-full text-center text-muted p-8" style="grid-column:1/-1">Unable to load featured products. Try refreshing.</div>`;
    }
  }
}

function useFallbackCategories() {
  const fallback = [
    { name: 'Electronics', icon: 'cpu' },
    { name: 'Fashion', icon: 'shirt' },
    { name: 'Home & Kitchen', icon: 'home' },
    { name: 'Books & Stationery', icon: 'book-open' }
  ];
  renderCategoriesUI(fallback);
}

function renderCategoriesUI(categories) {
  const container = document.getElementById('home-categories');
  if (!container || !categories) return;

  const iconMap = {
    'Electronics': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="15" x2="23" y2="15"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="15" x2="4" y2="15"/></svg>`,
    'Fashion': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>`,
    'Home & Kitchen': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    'Home Decor': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    'Books': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`
  };

  const defaultIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`;

  container.innerHTML = categories.map(cat => {
    const icon = iconMap[cat.name] || defaultIcon;
    return `
      <a class="category-tile" href="#/products?category=${encodeURIComponent(cat.name)}">
        <div class="category-icon" style="background:rgba(124,58,237,0.12); color:var(--primary); width:52px; height:52px;">
          ${icon}
        </div>
        <div class="category-name">${cat.name}</div>
        <div class="category-count">Browse &rarr;</div>
      </a>
    `;
  }).join('');
}

function renderFeaturedUI(products) {
  const container = document.getElementById('home-featured-grid');
  if (!container) return;

  if (!products || products.length === 0) {
    container.innerHTML = `<div class="w-full text-center text-muted p-8" style="grid-column:1/-1">No featured items available right now.</div>`;
    return;
  }

  container.innerHTML = products.map((prod, idx) => {
    const image = prod.primaryImageUrl || prod.imageUrl || (prod.imageUrls && prod.imageUrls[0]) || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';
    return `
      <div class="product-card fade-in stagger-${(idx % 3) + 1}" data-id="${prod.id}">
        <div class="product-card-img-wrapper" onclick="window.location.hash='#/product/${prod.id}'">
          <img src="${image}" alt="${prod.name}" class="product-card-img" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'">
          <span class="product-card-badge badge badge-primary">Featured</span>
        </div>
        <div class="product-card-body" onclick="window.location.hash='#/product/${prod.id}'">
          <div class="product-card-category">${prod.categoryName || 'General'}</div>
          <div class="product-card-name">${prod.name}</div>
          <div class="product-card-vendor">by ${prod.vendorName || 'Apex Seller'}</div>
          <div class="mt-auto">
            ${starsHTML(prod.rating || 4.5)}
          </div>
        </div>
        <div class="product-card-footer">
          <div class="product-card-price">${formatCurrency(prod.price)}</div>
          <button class="product-card-add-btn add-to-cart-trigger" data-id="${prod.id}" title="Add to Cart" aria-label="Add to Cart">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.add-to-cart-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      addToCart(btn.dataset.id);
    });
  });
}
