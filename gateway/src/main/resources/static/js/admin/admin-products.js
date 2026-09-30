/**
 * admin-products.js — Administrative Platform-wide Products Management
 *
 * Implements listing of all products across all vendors and administrative deactivations/deletions.
 */

import { apiFetch } from '../core/api.js';
import { showToast, formatCurrency, statusBadge, tableRowsSkeleton } from '../core/ui.js';
import { renderAdminLayout } from './admin-layout.js';

let adminProductsPage = 0;
let adminSearchQuery = '';

export async function renderAdminProducts() {
  const contentHTML = `
    <div class="d-flex justify-between items-center mb-6 flex-wrap gap-4">
      <div>
        <h1 class="section-title">All Products Directory</h1>
        <p class="text-muted">Browse listings published across the platform, hide infringing items, or purge entries.</p>
      </div>

      <div class="search-wrapper" style="width:100%; max-width:340px">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" class="search-input" id="admin-prod-search" placeholder="Search by name..." value="${adminSearchQuery}">
      </div>
    </div>

    <!-- Products Table card -->
    <div class="card overflow-hidden">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Product Details</th>
              <th>Seller</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody id="admin-products-list">
            ${tableRowsSkeleton(6, 6)}
          </tbody>
        </table>
      </div>
    </div>

    <div id="admin-products-pagination" class="pagination">
      <!-- Pagination dynamic -->
    </div>
  `;

  renderAdminLayout(contentHTML, 'admin-nav-products');
  setupPageListeners();
  await loadAdminProducts();
}

function setupPageListeners() {
  const searchInput = document.getElementById('admin-prod-search');
  
  let debounce;
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      adminSearchQuery = e.target.value.trim();
      adminProductsPage = 0;
      loadAdminProducts();
    }, 450);
  });
}

async function loadAdminProducts() {
  const list = document.getElementById('admin-products-list');
  if (!list) return;

  const params = new URLSearchParams();
  if (adminSearchQuery) params.append('search', adminSearchQuery);
  params.append('page', adminProductsPage);
  params.append('size', 10);

  try {
    const response = await apiFetch(`/products?${params.toString()}`);
    const products = response.content || [];

    if (products.length === 0) {
      list.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted p-8">No platform items found matching the search context.</td>
        </tr>
      `;
      document.getElementById('admin-products-pagination').innerHTML = '';
      return;
    }

    list.innerHTML = products.map(prod => {
      const image = prod.primaryImageUrl || prod.imageUrl || (prod.imageUrls && prod.imageUrls[0]) || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100';
      const isOutOfStock = (prod.stockQuantity || 0) <= 0;

      return `
        <tr class="fade-in">
          <td>
            <div class="table-product-cell">
              <img src="${image}" alt="${prod.name}" class="table-product-thumb" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'">
              <div>
                <div class="user-info-name">${prod.name}</div>
                <div class="text-xs text-muted">ID: #${prod.id}</div>
              </div>
            </div>
          </td>
          <td>
            <div class="font-semibold text-sm">${prod.vendorStoreName || prod.vendorName || 'Apex Seller'}</div>
          </td>
          <td>${prod.categoryName || 'General'}</td>
          <td class="font-semibold text-primary-color">${formatCurrency(prod.price)}</td>
          <td>
            ${isOutOfStock 
              ? `<span class="badge badge-danger">Out of stock</span>` 
              : `<span class="font-medium">${prod.stockQuantity} units</span>`}
          </td>
          <td style="text-align:right">
            <div class="td-actions">
              <button class="btn btn-warning btn-sm deactivate-btn" data-id="${prod.id}">Hide/Deactivate</button>
              <button class="btn btn-danger btn-sm purge-btn" data-id="${prod.id}">Purge</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach administrative control listeners
    list.querySelectorAll('.deactivate-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (!confirm('Deactivate listing? This removes the product from customer directory searches.')) return;
        try {
          await apiFetch(`/admin/products/${id}/deactivate`, { method: 'PATCH' });
          showToast('Product listing deactivated by admin.', 'success');
          await loadAdminProducts();
        } catch (err) {
          showToast(err.message || 'Deactivation failed.', 'error');
        }
      });
    });

    list.querySelectorAll('.purge-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (!confirm('Permanently purge this item from database? This cannot be undone.')) return;
        try {
          await apiFetch(`/admin/products/${id}`, { method: 'DELETE' });
          showToast('Product purged permanently.', 'success');
          await loadAdminProducts();
        } catch (err) {
          showToast(err.message || 'Purge failed.', 'error');
        }
      });
    });

    renderAdminProductsPagination(response.totalPages, response.number);

  } catch (err) {
    list.innerHTML = `<tr><td colspan="6" class="text-center text-danger p-6">Could not load platform directory.</td></tr>`;
  }
}

function renderAdminProductsPagination(totalPages, currentPage) {
  const container = document.getElementById('admin-products-pagination');
  if (!container || !totalPages || totalPages <= 1) {
    if (container) container.innerHTML = '';
    return;
  }

  let html = `
    <button class="pagination-btn" ${currentPage === 0 ? 'disabled' : ''} data-page="${currentPage - 1}">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
  `;

  for (let i = 0; i < totalPages; i++) {
    html += `
      <button class="pagination-btn ${currentPage === i ? 'active' : ''}" data-page="${i}">${i + 1}</button>
    `;
  }

  html += `
    <button class="pagination-btn" ${currentPage === totalPages - 1 ? 'disabled' : ''} data-page="${currentPage + 1}">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
  `;

  container.innerHTML = html;

  container.querySelectorAll('.pagination-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled || btn.classList.contains('active')) return;
      adminProductsPage = parseInt(btn.dataset.page);
      loadAdminProducts();
    });
  });
}
