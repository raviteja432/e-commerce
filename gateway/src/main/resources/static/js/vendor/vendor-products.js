/**
 * vendor-products.js — Vendor Products Catalog Management
 *
 * Implements listing table, product details form modal, multi-image upload to S3, and deletions.
 * Supports up to 5 product images (front, back, side, detail views) for full customer observability.
 */

import { apiFetch, apiUpload } from '../core/api.js';
import { getState, setState } from '../core/state.js';
import { showToast, openModal, closeModal, formatCurrency, tableRowsSkeleton } from '../core/ui.js';
import { renderVendorLayout } from './vendor-layout.js';

let vendorProducts = [];

export async function renderVendorProducts() {
  const contentHTML = `
    <div class="d-flex justify-between items-center mb-6 flex-wrap gap-4">
      <div>
        <h1 class="section-title">My Catalog Listings</h1>
        <p class="text-muted">Manage your catalog items, upload multiple product images, and check inventory details.</p>
      </div>
      <div>
        <button class="btn btn-primary" id="vendor-add-product-btn">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Product
        </button>
      </div>
    </div>

    <!-- Products Table card -->
    <div class="card overflow-hidden">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody id="vendor-products-list">
            ${tableRowsSkeleton(5, 5)}
          </tbody>
        </table>
      </div>
    </div>
  `;

  renderVendorLayout(contentHTML, 'vendor-nav-products');
  setupPageListeners();
  ensureCategoriesLoaded().catch(() => {});
  await loadVendorProducts();
}

async function ensureCategoriesLoaded() {
  const state = getState();
  if (!state.categories || state.categories.length === 0) {
    try {
      const cats = await apiFetch('/categories');
      if (Array.isArray(cats) && cats.length > 0) {
        setState({ categories: cats });
      }
    } catch (err) {
      console.warn('Could not fetch categories:', err);
    }
  }
}

function setupPageListeners() {
  document.getElementById('vendor-add-product-btn')?.addEventListener('click', async () => {
    await ensureCategoriesLoaded();
    openProductFormModal();
  });
}

async function loadVendorProducts() {
  const list = document.getElementById('vendor-products-list');
  if (!list) return;

  try {
    const response = await apiFetch('/products/vendor/me?size=100');
    vendorProducts = response.content || [];

    if (vendorProducts.length === 0) {
      list.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted p-8">
            You haven't listed any products yet. Click "Add Product" to get started.
          </td>
        </tr>
      `;
      return;
    }

    list.innerHTML = vendorProducts.map(prod => {
      // Use primaryImageUrl — the correct field from ProductCardResponse DTO
      const primaryImage = prod.primaryImageUrl
        ? prod.primaryImageUrl
        : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100';
      const outOfStock = (prod.stockQuantity || 0) <= 0;

      return `
        <tr class="fade-in">
          <td>
            <div class="table-product-cell">
              <div style="position:relative;flex-shrink:0;">
                <img src="${primaryImage}" alt="${prod.name}" class="table-product-thumb" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'">
              </div>
              <div>
                <div class="user-info-name">${prod.name}</div>
                <div class="text-xs text-muted">ID: #${prod.id}</div>
              </div>
            </div>
          </td>
          <td>${prod.categoryName || 'General'}</td>
          <td class="font-semibold text-primary-color">${formatCurrency(prod.price)}</td>
          <td>
            ${outOfStock
              ? `<span class="badge badge-danger">Out of stock</span>`
              : `<span class="font-medium">${prod.stockQuantity} units</span>`}
          </td>
          <td class="td-actions">
            <button class="btn btn-secondary btn-sm edit-prod-btn" data-id="${prod.id}">Edit</button>
            <button class="btn btn-danger btn-sm delete-prod-btn" data-id="${prod.id}" data-name="${prod.name}">Delete</button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row events
    list.querySelectorAll('.edit-prod-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        // Fetch full ProductDetailResponse to get all images, not just primaryImageUrl
        try {
          btn.disabled = true;
          btn.textContent = '...';
          const fullProd = await apiFetch(`/products/${btn.dataset.id}`);
          // Flatten images list into a format usable by the modal
          const flatProd = {
            ...fullProd,
            // Build comma-separated imageUrl from the images array for backward compat
            imageUrls: (fullProd.images || []).map(img => img.imageUrl),
            categoryName: fullProd.category ? fullProd.category.name : ''
          };
          openProductFormModal(flatProd);
        } catch (err) {
          showToast('Could not load product details. Please try again.', 'error');
        } finally {
          btn.disabled = false;
          btn.textContent = 'Edit';
        }
      });
    });

    list.querySelectorAll('.delete-prod-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const prodId = btn.dataset.id;
        const prodName = btn.dataset.name || 'this product';

        const confirmHTML = `
          <div style="padding:16px 8px; text-align:center;">
            <div style="width:60px;height:60px;border-radius:50%;background:rgba(239,68,68,0.12);color:var(--danger);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:30px;height:30px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </div>
            <h3 style="font-size:20px;font-weight:700;margin-bottom:8px;color:var(--text-primary);">Delete Product Listing?</h3>
            <p style="font-size:14px;color:var(--text-muted);line-height:1.5;margin-bottom:24px;">
              Are you sure you want to delete <strong style="color:var(--text-primary);">"${prodName}"</strong>? This will remove the listing from the marketplace.
            </p>
            <div style="display:flex;gap:12px;justify-content:center;">
              <button type="button" class="btn btn-secondary" id="cancel-del-btn" style="min-width:120px">Cancel</button>
              <button type="button" class="btn btn-danger" id="confirm-del-btn" style="min-width:120px">Delete Product</button>
            </div>
          </div>
        `;

        openModal(confirmHTML, 'Confirm Product Deletion');

        document.getElementById('cancel-del-btn')?.addEventListener('click', closeModal);
        document.getElementById('confirm-del-btn')?.addEventListener('click', async () => {
          const delBtn = document.getElementById('confirm-del-btn');
          if (delBtn) {
            delBtn.disabled = true;
            delBtn.innerHTML = `<div class="spinner spinner-sm"></div> Deleting…`;
          }
          try {
            await apiFetch(`/products/${prodId}`, { method: 'DELETE' });
            closeModal();
            showToast('Listing successfully deleted.', 'success');
            await loadVendorProducts();
          } catch (err) {
            closeModal();
            showToast(err.message || 'Failed to delete listing.', 'error');
          }
        });
      });
    });

  } catch (err) {
    list.innerHTML = `<tr><td colspan="5" class="text-center text-danger p-6">Could not load catalog.</td></tr>`;
  }
}

function openProductFormModal(prod = null) {
  const isEdit = !!prod;
  const state = getState();

  const getCatName = (c) => typeof c === 'string' ? c : (c?.name || c?.categoryName || '');

  let categories = (state.categories && state.categories.length > 0)
    ? state.categories
    : [
        { id: 1, name: 'Fashion' },
        { id: 2, name: 'Electronics' },
        { id: 3, name: 'Mobiles' },
        { id: 4, name: 'Home Decor' },
        { id: 5, name: 'Laptop' },
        { id: 6, name: 'TV' },
        { id: 7, name: 'Appliances' },
        { id: 8, name: 'Beauty & Personal Care' }
      ];

  // Use imageUrls array if available (from full ProductDetailResponse), fall back to primaryImageUrl
  const existingImages = isEdit
    ? (prod.imageUrls && prod.imageUrls.length > 0
        ? prod.imageUrls
        : (prod.primaryImageUrl ? [prod.primaryImageUrl] : []))
    : [];

  const renderThumbsHTML = (urls) => urls.map((url, i) => `
    <div class="img-thumb-slot" data-index="${i}" style="position:relative;width:72px;height:72px;border-radius:8px;overflow:hidden;border:2px solid var(--border-color);background:var(--bg-secondary);flex-shrink:0;">
      <img src="${url}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.background='var(--bg-tertiary)'">
      ${i === 0 ? `<span style="position:absolute;bottom:2px;left:2px;background:var(--primary);color:#fff;font-size:8px;padding:1px 4px;border-radius:3px;font-weight:600;">MAIN</span>` : ''}
      <button type="button" class="remove-img-btn" data-index="${i}" style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.7);border:none;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;font-size:10px;padding:0;line-height:1;">✕</button>
    </div>
  `).join('');

  const modalHTML = `
    <form class="d-flex flex-col gap-4" id="prod-form">
      <div class="form-group">
        <label class="form-label" for="f-prod-name">Product Name</label>
        <input type="text" id="f-prod-name" class="form-control" value="${isEdit ? prod.name : ''}" required>
      </div>

      <div class="form-group">
        <label class="form-label" for="f-prod-cat">Category</label>
        <select id="f-prod-cat" class="form-control" required>
          <option value="">Select a Category</option>
          ${categories.map(c => {
            const name = getCatName(c);
            const sel = isEdit && prod.categoryName === name ? 'selected' : '';
            return `<option value="${name}" ${sel}>${name}</option>`;
          }).join('')}
        </select>
      </div>

      <div class="d-grid gap-4" style="grid-template-columns: 1fr 1fr">
        <div class="form-group">
          <label class="form-label" for="f-prod-price">Price (₹)</label>
          <input type="number" id="f-prod-price" class="form-control" value="${isEdit ? prod.price : ''}" placeholder="2999" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="f-prod-stock">Stock Quantity</label>
          <input type="number" id="f-prod-stock" class="form-control" value="${isEdit ? prod.stockQuantity : ''}" placeholder="10" required>
        </div>
      </div>

      <div class="divider" style="margin:8px 0"></div>

      <!-- Multi-Image Upload Section -->
      <div class="form-group">
        <label class="form-label">
          Product Images
          <span class="text-muted" style="font-weight:400;font-size:var(--text-xs);margin-left:6px">(up to 5 — front, back, side, detail views)</span>
        </label>

        <!-- Thumbnail gallery row -->
        <div id="prod-img-gallery" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;align-items:center;">
          ${renderThumbsHTML(existingImages)}
          <div id="add-img-slot" style="width:72px;height:72px;border-radius:8px;border:2px dashed var(--border-color);background:var(--bg-secondary);display:${existingImages.length >= 5 ? 'none' : 'flex'};flex-direction:column;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;gap:3px;color:var(--text-muted);font-size:11px;transition:border-color 0.2s,color 0.2s;" title="Add photo">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span>Add Photo</span>
          </div>
        </div>

        <input type="file" id="f-prod-file" accept="image/jpeg,image/png,image/webp" multiple style="display:none">
        <div id="upload-progress-msg" class="text-xs" style="min-height:16px;color:var(--text-muted)"></div>
        <div class="text-xs text-muted mt-1">JPG, PNG, WEBP • Max 5 MB each • First image shown as main product photo</div>
      </div>

      <div class="divider" style="margin:8px 0"></div>

      <div class="form-group">
        <label class="form-label" for="f-prod-desc">Description</label>
        <textarea id="f-prod-desc" class="form-control" rows="4" required>${isEdit ? prod.description || '' : ''}</textarea>
      </div>

      <div class="modal-footer" style="padding-right:0;padding-bottom:0">
        <button type="button" class="btn btn-secondary" id="prod-form-cancel">Cancel</button>
        <button type="submit" class="btn btn-primary" id="prod-form-submit-btn">${isEdit ? 'Save Changes' : 'Add Listing'}</button>
      </div>
    </form>
  `;

  openModal(modalHTML, isEdit ? 'Edit Product Details' : 'Add Product to Catalog');

  // ── State ─────────────────────────────────────────────────────
  let uploadedUrls = [...existingImages];

  const gallery     = document.getElementById('prod-img-gallery');
  const fileInput   = document.getElementById('f-prod-file');
  const addSlot     = document.getElementById('add-img-slot');
  const progressMsg = document.getElementById('upload-progress-msg');

  // ── Gallery refresh ───────────────────────────────────────────
  function refreshGallery() {
    gallery.querySelectorAll('.img-thumb-slot').forEach(el => el.remove());

    uploadedUrls.forEach((url, i) => {
      const slot = document.createElement('div');
      slot.className = 'img-thumb-slot';
      slot.dataset.index = i;
      slot.style.cssText = 'position:relative;width:72px;height:72px;border-radius:8px;overflow:hidden;border:2px solid var(--border-color);background:var(--bg-secondary);flex-shrink:0;';
      slot.innerHTML = `
        <img src="${url}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.background='var(--bg-tertiary)'">
        ${i === 0 ? `<span style="position:absolute;bottom:2px;left:2px;background:var(--primary);color:#fff;font-size:8px;padding:1px 4px;border-radius:3px;font-weight:600;">MAIN</span>` : ''}
        <button type="button" class="remove-img-btn" data-index="${i}" style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.7);border:none;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;font-size:10px;padding:0;line-height:1;">✕</button>
      `;
      gallery.insertBefore(slot, addSlot);
    });

    // Show/hide add-slot based on limit
    addSlot.style.display = uploadedUrls.length >= 5 ? 'none' : 'flex';

    // Re-attach remove handlers
    gallery.querySelectorAll('.remove-img-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        uploadedUrls.splice(parseInt(btn.dataset.index), 1);
        refreshGallery();
        progressMsg.textContent = uploadedUrls.length > 0 ? `${uploadedUrls.length} image(s) ready.` : '';
      });
    });
  }

  // ── Add-slot click → open file picker ────────────────────────
  addSlot.addEventListener('click', () => {
    if (uploadedUrls.length < 5) fileInput.click();
  });
  addSlot.addEventListener('mouseenter', () => {
    addSlot.style.borderColor = 'var(--primary)';
    addSlot.style.color = 'var(--primary)';
  });
  addSlot.addEventListener('mouseleave', () => {
    addSlot.style.borderColor = 'var(--border-color)';
    addSlot.style.color = 'var(--text-muted)';
  });

  // ── File selection → sequential upload ───────────────────────
  fileInput.addEventListener('change', async () => {
    const files = Array.from(fileInput.files || []);
    if (!files.length) return;

    const remaining = 5 - uploadedUrls.length;
    const toUpload  = files.slice(0, remaining);

    if (files.length > remaining) {
      showToast(`Only ${remaining} more image(s) allowed (max 5 total).`, 'warning');
    }

    addSlot.style.pointerEvents = 'none';
    addSlot.style.opacity = '0.5';

    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i];
      progressMsg.style.color = 'var(--text-muted)';
      progressMsg.textContent = `Uploading image ${i + 1} of ${toUpload.length}…`;

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await apiUpload('/products/upload-image', formData);
        if (res && res.imageUrl) {
          uploadedUrls.push(res.imageUrl);
          refreshGallery();
        }
      } catch (err) {
        progressMsg.style.color = 'var(--danger)';
        progressMsg.textContent = `Failed: ${err.message}`;
        showToast(`Upload failed for "${file.name}": ${err.message}`, 'error');
      }
    }

    progressMsg.style.color = 'var(--success, #22c55e)';
    progressMsg.textContent = `${uploadedUrls.length} image(s) ready.`;
    addSlot.style.pointerEvents = '';
    addSlot.style.opacity = '';
    fileInput.value = ''; // allow re-selecting same file
  });

  // ── Modal cancel ──────────────────────────────────────────────
  document.getElementById('prod-form-cancel')?.addEventListener('click', closeModal);

  // ── Form submit ───────────────────────────────────────────────
  document.getElementById('prod-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('prod-form-submit-btn');

    const name          = document.getElementById('f-prod-name').value.trim();
    const categoryName  = document.getElementById('f-prod-cat').value;
    const price         = parseFloat(document.getElementById('f-prod-price').value);
    const stockQuantity = parseInt(document.getElementById('f-prod-stock').value);
    const description   = document.getElementById('f-prod-desc').value.trim();

    const categoryObj = (categories || state.categories || []).find(c => c.name === categoryName);
    const categoryId = categoryObj ? categoryObj.id : 1;

    const payload = { 
      name, 
      categoryId, 
      price, 
      stockQuantity, 
      imageUrls: uploadedUrls, 
      description, 
      featured: true 
    };

    saveBtn.disabled = true;
    saveBtn.innerHTML = `<div class="spinner spinner-sm"></div> Saving…`;

    try {
      if (isEdit) {
        await apiFetch(`/products/${prod.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Listing updated successfully!', 'success');
      } else {
        await apiFetch('/products', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Listing added successfully!', 'success');
      }
      closeModal();
      await loadVendorProducts();
    } catch (err) {
      showToast(err.message || 'Failed to save product.', 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = isEdit ? 'Save Changes' : 'Add Listing';
    }
  });
}
