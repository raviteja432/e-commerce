/**
 * product-detail.js — Product Detail View
 *
 * Detailed specifications, photo preview, reviews, writing a new review
 */

import { apiFetch } from '../core/api.js';
import { getState } from '../core/state.js';
import { setView, formatCurrency, starsHTML, showToast, formatDate } from '../core/ui.js';
import { addToCart } from '../pages/cart.js';

let productData = null;
let reviewsData = [];
let relatedProducts = [];

export async function renderProductDetail(productId) {
  setView(`
    <div class="page-wrapper">
      <div class="page-container">
        <div class="page-loading" id="detail-loader">
          <div class="spinner spinner-lg"></div>
          <div>Loading details for you…</div>
        </div>
        <div id="product-detail-content" class="d-none"></div>
      </div>
    </div>
  `);

  try {
    productData = await apiFetch(`/products/${productId}`);
    
    let reviewsRes = { content: [] };
    try {
      reviewsRes = await apiFetch(`/products/${productId}/reviews?size=10`);
    } catch (e) {
      console.warn('Could not load reviews:', e);
    }
    reviewsData = reviewsRes.content || [];

    // Safely extract category and vendor name from DTO
    const categoryName = productData.category ? (productData.category.name || productData.category) : (productData.categoryName || '');
    const vendorName = productData.vendorStoreName || productData.vendorName || 'Apex Seller';
    
    // Extract brand/keyword from product name (e.g. "Roadster", "HP", "Samsung")
    const nameWords = (productData.name || '').trim().split(/\s+/);
    const brandKeyword = nameWords.length > 0 && nameWords[0].length >= 2 ? nameWords[0] : vendorName;

    // Fetch Amazon/Flipkart-style Related Products:
    // 1. Same Brand/Keyword search (e.g. "Roadster" shirts / "HP" laptops)
    // 2. Same Category browse (e.g. "Clothing" / "Laptops")
    relatedProducts = [];
    let brandProducts = [];
    let categoryProducts = [];

    try {
      if (brandKeyword) {
        const brandRes = await apiFetch(`/products?search=${encodeURIComponent(brandKeyword)}&size=10`);
        brandProducts = (brandRes?.content || []).filter(p => String(p.id) !== String(productId));
      }
    } catch (e) {
      console.warn('Could not load brand related products:', e);
    }

    try {
      if (categoryName) {
        const catRes = await apiFetch(`/products?category=${encodeURIComponent(categoryName)}&size=12`);
        categoryProducts = (catRes?.content || []).filter(p => String(p.id) !== String(productId));
      }
    } catch (e) {
      console.warn('Could not load category related products:', e);
    }

    // Merge and deduplicate by product ID
    const seenIds = new Set([String(productId)]);
    const combined = [];
    
    for (const p of [...brandProducts, ...categoryProducts]) {
      const sId = String(p.id);
      if (!seenIds.has(sId)) {
        seenIds.add(sId);
        combined.push(p);
      }
    }

    relatedProducts = combined.slice(0, 12);

    renderPageContent(categoryName, vendorName, brandKeyword);

  } catch (err) {
    console.error('Error fetching product detail:', err);
    document.getElementById('detail-loader').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon" style="background:var(--danger-bg);border-color:rgba(239,68,68,0.3)">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div class="empty-state-title">Item not found</div>
        <div class="empty-state-desc">The product might have been deleted by the vendor or the link is invalid.</div>
        <a href="#/catalog" class="btn btn-primary mt-6">Return to Shop</a>
      </div>
    `;
  }
}

function renderPageContent(categoryName, vendorName, brandKeyword) {
  const container = document.getElementById('product-detail-content');
  const loader = document.getElementById('detail-loader');
  if (!container || !productData) return;

  loader.classList.add('d-none');
  container.classList.remove('d-none');

  const state = getState();
  // Extract images from backend ProductDetailResponse (images array) or fallback imageUrl property
  let allImages = [];
  if (Array.isArray(productData.images) && productData.images.length > 0) {
    allImages = productData.images.map(img => typeof img === 'string' ? img : img.imageUrl).filter(Boolean);
  } else if (typeof productData.imageUrl === 'string' && productData.imageUrl) {
    allImages = productData.imageUrl.split(',').map(u => u.trim()).filter(Boolean);
  }
  
  if (allImages.length === 0) {
    allImages = ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'];
  }

  const primaryImage = allImages[0];
  const stockVal = productData.stockQuantity !== undefined ? productData.stockQuantity : (productData.stock || 0);
  const outOfStock = stockVal <= 0;
  const ratingVal = productData.averageRating || productData.rating || 4.5;
  const reviewsCountVal = productData.reviewCount !== undefined ? productData.reviewCount : reviewsData.length;

  container.innerHTML = `
    <!-- Top info split -->
    <div class="d-grid gap-8" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); margin-bottom: 48px;">
      <!-- Product Image Gallery -->
      <div class="d-flex flex-col gap-3">
        <!-- Main large image -->
        <div class="overflow-hidden rounded-xl border" style="background:var(--bg-secondary); aspect-ratio:1; position:relative;">
          <img id="pd-main-img" src="${primaryImage}" alt="${productData.name}" style="width:100%; height:100%; object-fit:cover; transition:opacity 0.2s;" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'">
        </div>
        <!-- Thumbnail strip (only shown if more than 1 image) -->
        ${allImages.length > 1 ? `
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${allImages.map((url, i) => `
            <div class="pd-thumb ${i === 0 ? 'pd-thumb-active' : ''}" data-src="${url}" data-idx="${i}" style="width:64px;height:64px;border-radius:8px;overflow:hidden;border:2px solid ${i === 0 ? 'var(--primary)' : 'var(--border-color)'};cursor:pointer;flex-shrink:0;background:var(--bg-secondary);transition:border-color 0.2s;">
              <img src="${url}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.background='var(--bg-tertiary)'">
            </div>
          `).join('')}
        </div>
        ` : ''}
      </div>

      <!-- Specs & Purchase -->
      <div class="d-flex flex-col gap-4">
        <div class="product-card-category" style="font-size:var(--text-sm)">${categoryName || 'General'}</div>
        <h1 class="font-display font-bold" style="font-size:clamp(var(--text-2xl), 4vw, var(--text-4xl)); line-height:1.2">${productData.name}</h1>
        
        <div class="d-flex items-center gap-4 flex-wrap">
          ${starsHTML(ratingVal)}
          <span class="text-muted">(${reviewsCountVal} Reviews)</span>
          <span class="text-muted">|</span>
          <span class="text-muted">Sold by <strong class="text-secondary">${vendorName}</strong></span>
        </div>

        <div class="divider" style="margin:8px 0"></div>

        <div class="d-flex items-end gap-3">
          <div class="font-display font-bold text-accent" style="font-size:var(--text-3xl)">${formatCurrency(productData.price)}</div>
        </div>

        <p class="text-secondary mt-2" style="font-size:var(--text-sm); line-height:1.7">
          ${productData.description || 'No description provided by the vendor.'}
        </p>

        <div class="d-flex items-center gap-3 mt-4">
          <span class="text-sm font-semibold">Availability:</span>
          ${outOfStock 
            ? `<span class="badge badge-danger">Out of stock</span>` 
            : `<span class="badge badge-success">In Stock (${stockVal} units)</span>`}
        </div>

        <div class="d-flex gap-4 mt-6">
          <div class="qty-stepper">
            <button class="qty-btn" id="stepper-minus">-</button>
            <div class="qty-value" id="stepper-val">1</div>
            <button class="qty-btn" id="stepper-plus">+</button>
          </div>
          <button class="btn btn-primary btn-lg flex-1" id="detail-add-cart-btn" ${outOfStock ? 'disabled' : ''}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            Add to Cart
          </button>
        </div>
      </div>
    </div>

    <!-- Tabs (Specifications / Reviews) -->
    <div>
      <div class="tab-nav mb-6">
        <button class="tab-btn active" data-target="tab-desc">Overview</button>
        <button class="tab-btn" data-target="tab-reviews">Customer Reviews (${reviewsData.length})</button>
      </div>

      <!-- Tab Content: Overview -->
      <div class="tab-content active" id="tab-desc">
        <div class="card p-6">
          <h3 class="mb-4">Specifications</h3>
          <p class="text-secondary" style="font-size:var(--text-sm)">This premium item matches high industry standard builds. Tested for quality assurance.</p>
          <div class="d-grid gap-4 mt-4" style="grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))">
            <div style="border-bottom: 1px solid var(--border); padding-bottom:8px">
              <div class="text-xs text-muted">Category</div>
              <div class="text-sm font-semibold mt-1">${categoryName || 'General'}</div>
            </div>
            <div style="border-bottom: 1px solid var(--border); padding-bottom:8px">
              <div class="text-xs text-muted">Vendor</div>
              <div class="text-sm font-semibold mt-1">${vendorName}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Content: Reviews -->
      <div class="tab-content" id="tab-reviews">
        <div class="d-grid gap-8" style="grid-template-columns: 1fr 340px; align-items: start;">
          <!-- Reviews list -->
          <div class="d-flex flex-col gap-4">
            ${reviewsData.length === 0 
              ? `<div class="empty-state card p-6">
                   <div class="empty-state-icon mx-auto"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
                   <div class="empty-state-title">No reviews yet</div>
                   <div class="empty-state-desc">Be the first to review this product and share your thoughts.</div>
                 </div>`
              : reviewsData.map(rev => `
                  <div class="review-card">
                    <div class="review-header">
                      <div class="reviewer">
                        <div class="reviewer-avatar">
                          ${rev.reviewerName ? rev.reviewerName[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div class="reviewer-name">${rev.reviewerName || 'Anonymous Customer'}</div>
                          <div class="review-date">${formatDate(rev.createdAt)}</div>
                        </div>
                      </div>
                      ${starsHTML(rev.rating)}
                    </div>
                    <div class="review-text">${rev.comment || ''}</div>
                  </div>
                `).join('')
            }
          </div>

          <!-- Add Review Form -->
          <div class="card p-6">
            <h3 class="mb-4">Write a Review</h3>
            ${!state.token 
              ? `<p class="text-muted text-sm">Please <a href="#/login" class="text-primary-color font-semibold">sign in</a> to write a review.</p>`
              : `
                <form class="d-flex flex-col gap-4" id="review-submit-form">
                  <div class="form-group">
                    <label class="form-label">Your Rating</label>
                    <select class="form-control" id="review-rating-select" required>
                      <option value="5">5 Stars — Excellent</option>
                      <option value="4">4 Stars — Very Good</option>
                      <option value="3">3 Stars — Average</option>
                      <option value="2">2 Stars — Poor</option>
                      <option value="1">1 Star — Terrible</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="review-comment">Review Comment</label>
                    <textarea class="form-control" id="review-comment" placeholder="What did you like or dislike about this product?" required></textarea>
                  </div>
                  <button type="submit" class="btn btn-primary" id="review-submit-btn">Submit Review</button>
                </form>
              `
            }
          </div>
        </div>
      </div>
    </div>

    <!-- Related Products — Amazon / Flipkart-style horizontal carousel & recommendations -->
    ${relatedProducts.length > 0 ? `
    <div style="margin-top:64px; padding-top:32px; border-top:2px solid var(--border);">

      <!-- Section heading + scroll arrows -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <div>
          <h2 class="font-display font-bold" style="font-size:var(--text-xl); margin:0; display:flex; align-items:center; gap:8px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            Customers Also Viewed
          </h2>
          <div class="text-muted text-sm mt-1">Recommended products based on <strong>${brandKeyword || vendorName}</strong> & <strong>${categoryName}</strong></div>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          ${categoryName ? `
          <a href="#/catalog?category=${encodeURIComponent(categoryName)}" class="btn btn-secondary btn-sm">
            View All in ${categoryName} →
          </a>
          ` : ''}
          <button id="rel-scroll-left" style="width:36px;height:36px;border-radius:50%;border:1px solid var(--border);background:var(--card-bg);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text);" aria-label="Previous">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button id="rel-scroll-right" style="width:36px;height:36px;border-radius:50%;border:1px solid var(--border);background:var(--card-bg);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text);" aria-label="Next">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      <!-- Carousel track -->
      <div id="related-carousel" style="display:flex; gap:16px; overflow-x:auto; scroll-behavior:smooth; padding-bottom:16px; -webkit-overflow-scrolling:touch; scrollbar-width:thin; scrollbar-color:var(--border) transparent;">
        ${relatedProducts.map(prod => {
          const img = prod.primaryImageUrl || prod.imageUrl || (prod.imageUrls && prod.imageUrls[0]) || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';
          const rVal = prod.rating || prod.averageRating || 4.5;
          const fullStars = Math.round(rVal);
          const starsMarkup = Array.from({length: 5}, (_, i) => '<span style="color:' + (i < fullStars ? '#f59e0b' : 'var(--border)') + ';font-size:13px;">★</span>').join('');
          const catLabel = prod.categoryName || (prod.category ? (prod.category.name || prod.category) : '');
          const vendLabel = prod.vendorName || prod.vendorStoreName || 'Apex Seller';
          return '<div class="rel-prod-card" onclick="window.location.hash=\'#/product/' + prod.id + '\'" style="flex-shrink:0;width:210px;background:var(--card-bg);border:1px solid var(--border);border-radius:14px;overflow:hidden;cursor:pointer;transition:box-shadow 0.22s,transform 0.22s;display:flex;flex-direction:column;">'
            + '<div style="height:185px;overflow:hidden;background:var(--surface);position:relative;">'
              + '<img src="' + img + '" alt="' + prod.name + '" style="width:100%;height:100%;object-fit:cover;transition:transform 0.3s;" class="rel-img" onerror="this.src=\'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500\'">'
              + (prod.featured ? '<span style="position:absolute;top:8px;left:8px;background:var(--accent);color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;">FEATURED</span>' : '')
            + '</div>'
            + '<div style="padding:12px 14px;flex:1;display:flex;flex-direction:column;gap:3px;">'
              + '<div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">' + catLabel + '</div>'
              + '<div style="font-size:13px;font-weight:700;color:var(--text);line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' + prod.name + '</div>'
              + '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">by ' + vendLabel + '</div>'
              + '<div style="display:flex;align-items:center;gap:4px;margin-top:6px;">' + starsMarkup + '<span style="font-size:11px;color:var(--text-muted);margin-left:2px;">(' + Number(rVal).toFixed(1) + ')</span></div>'
            + '</div>'
            + '<div style="padding:10px 14px 14px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--border);background:var(--surface);">'
              + '<div style="font-size:16px;font-weight:800;color:var(--accent);">' + formatCurrency(prod.price) + '</div>'
              + '<button class="related-add-cart-btn" data-id="' + prod.id + '" onclick="event.stopPropagation()" style="width:34px;height:34px;border-radius:50%;border:none;background:var(--accent);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform 0.2s,opacity 0.2s;" title="Add to Cart">'
                + '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>'
              + '</button>'
            + '</div>'
          + '</div>';
        }).join('')}
      </div>
    </div>
    ` : ''}
  `;

  // Setup Event Listeners
  setupPageListeners();
}

function setupPageListeners() {
  const stepperVal   = document.getElementById('stepper-val');
  const stepperMinus = document.getElementById('stepper-minus');
  const stepperPlus  = document.getElementById('stepper-plus');
  const addCartBtn   = document.getElementById('detail-add-cart-btn');
  const mainImg      = document.getElementById('pd-main-img');

  let qty = 1;
  const maxStock = productData.stockQuantity ?? productData.stock ?? 0;

  // Thumbnail gallery switcher
  document.querySelectorAll('.pd-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      // Update main image with fade
      if (mainImg) {
        mainImg.style.opacity = '0';
        setTimeout(() => {
          mainImg.src = thumb.dataset.src;
          mainImg.style.opacity = '1';
        }, 150);
      }
      // Update active border
      document.querySelectorAll('.pd-thumb').forEach(t => {
        t.style.borderColor = 'var(--border-color)';
      });
      thumb.style.borderColor = 'var(--primary)';
    });
  });

  stepperMinus?.addEventListener('click', () => {
    if (qty > 1) {
      qty--;
      stepperVal.textContent = qty;
    }
  });

  stepperPlus?.addEventListener('click', () => {
    if (qty < maxStock) {
      qty++;
      stepperVal.textContent = qty;
    } else {
      showToast(`Cannot select more than ${maxStock} in stock.`, 'warning');
    }
  });

  addCartBtn?.addEventListener('click', async () => {
    if (addCartBtn.disabled) return;
    const origText = addCartBtn.innerHTML;
    addCartBtn.disabled = true;
    addCartBtn.innerHTML = `<div class="spinner spinner-sm" style="display:inline-block;margin-right:6px"></div> Adding…`;
    await addToCart(productData.id, qty);
    addCartBtn.disabled = false;
    addCartBtn.innerHTML = origText;
  });

  // Tab switching
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      const target = tab.dataset.target;
      document.getElementById(target)?.classList.add('active');
    });
  });

  // Review submission
  const reviewForm = document.getElementById('review-submit-form');
  reviewForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rating = parseInt(document.getElementById('review-rating-select').value);
    const comment = document.getElementById('review-comment').value.trim();
    const btn = document.getElementById('review-submit-btn');

    if (!comment) {
      showToast('Please provide a comment.', 'warning');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<div class="spinner spinner-sm"></div> Submitting…`;

    try {
      await apiFetch(`/products/${productData.id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment })
      });
      showToast('Review submitted successfully!', 'success');
      
      // Reload page state to display new review
      renderProductDetail(productData.id);
    } catch (err) {
      showToast(err.message || 'Failed to submit review.', 'error');
      btn.disabled = false;
      btn.textContent = 'Submit Review';
    }
  });

  // Related products: add-to-cart
  document.querySelectorAll('.related-add-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      addToCart(btn.dataset.id);
    });
  });

  // Related products: hover lift effect
  document.querySelectorAll('.rel-prod-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.boxShadow = '0 8px 32px rgba(0,0,0,0.18)';
      card.style.transform = 'translateY(-4px)';
      const img = card.querySelector('.rel-img');
      if (img) img.style.transform = 'scale(1.06)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.boxShadow = '';
      card.style.transform = '';
      const img = card.querySelector('.rel-img');
      if (img) img.style.transform = '';
    });
  });

  // Carousel scroll buttons
  const carousel = document.getElementById('related-carousel');
  document.getElementById('rel-scroll-left')?.addEventListener('click', () => {
    if (carousel) carousel.scrollBy({ left: -440, behavior: 'smooth' });
  });
  document.getElementById('rel-scroll-right')?.addEventListener('click', () => {
    if (carousel) carousel.scrollBy({ left: 440, behavior: 'smooth' });
  });
}
