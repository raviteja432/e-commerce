/**
 * admin-dashboard.js — Admin Overview Dashboard
 *
 * Displays overview stats across the platform, category addition controls
 */

import { apiFetch } from '../core/api.js';
import { getState, setState } from '../core/state.js';
import { showToast, statCardsSkeleton } from '../core/ui.js';
import { renderAdminLayout } from './admin-layout.js';

export async function renderAdminDashboard() {
  const contentHTML = `
    <div class="d-flex justify-between items-center mb-6 flex-wrap gap-4">
      <div>
        <h1 class="section-title">Admin Dashboard</h1>
        <p class="text-muted">Platform-wide statistics, active users, vendor applications, and database oversight.</p>
      </div>
      <div>
        <button class="btn btn-primary btn-sm" id="admin-add-category-btn">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Category
        </button>
      </div>
    </div>

    <!-- Stats metric boxes -->
    <div id="admin-stats-container">
      ${statCardsSkeleton(4)}
    </div>

    <div class="d-grid gap-6 mt-8" style="grid-template-columns: 2fr 1fr; align-items: start;">
      <div class="card p-6">
        <h3 class="font-bold text-base mb-4">Platform Activity Growth</h3>
        
        <div class="bar-chart mt-6">
          <div class="bar-chart-col">
            <span class="bar-value">120</span>
            <div class="bar-fill admin" style="height: 40%"></div>
            <span class="bar-label">Week 1</span>
          </div>
          <div class="bar-chart-col">
            <span class="bar-value">180</span>
            <div class="bar-fill admin" style="height: 55%"></div>
            <span class="bar-label">Week 2</span>
          </div>
          <div class="bar-chart-col">
            <span class="bar-value">250</span>
            <div class="bar-fill admin" style="height: 75%"></div>
            <span class="bar-label">Week 3</span>
          </div>
          <div class="bar-chart-col">
            <span class="bar-value">310</span>
            <div class="bar-fill admin" style="height: 100%"></div>
            <span class="bar-label">Week 4</span>
          </div>
        </div>
      </div>

      <div class="card p-6">
        <h3 class="font-bold text-base mb-4">Database Health</h3>
        <div class="d-flex flex-col gap-3">
          <div>
            <div class="text-xs text-muted">MySQL Host</div>
            <div class="text-sm font-semibold mt-1">localhost:3306</div>
          </div>
          <div>
            <div class="text-xs text-muted">Platform Services</div>
            <div class="text-sm mt-1 text-success font-semibold">8/8 Operational</div>
          </div>
          <div>
            <div class="text-xs text-muted">Gateway Status</div>
            <div class="mt-1"><span class="badge badge-success">Healthy</span></div>
          </div>
        </div>
      </div>
    </div>
  `;

  renderAdminLayout(contentHTML, 'admin-nav-dash');
  setupPageListeners();
  await loadAdminStats();
}

function setupPageListeners() {
  document.getElementById('admin-add-category-btn')?.addEventListener('click', () => {
    openCategoryFormModal();
  });
}

async function loadAdminStats() {
  const container = document.getElementById('admin-stats-container');
  if (!container) return;

  try {
    // Fetch users count
    const usersRes = await apiFetch('/admin/users?size=1');
    const totalUsers = usersRes.totalElements || 0;

    // Fetch approved/pending vendors count
    const pendingVendorsRes = await apiFetch('/admin/vendors?status=PENDING&size=1');
    const approvedVendorsRes = await apiFetch('/admin/vendors?status=APPROVED&size=1');
    
    const pendingVendors = pendingVendorsRes.totalElements || 0;
    const totalVendors = (approvedVendorsRes.totalElements || 0) + pendingVendors;

    // Fetch total products
    const productsRes = await apiFetch('/products?size=1');
    const totalProducts = productsRes.totalElements || 0;

    container.innerHTML = `
      <div class="stat-cards-grid">
        <div class="stat-card">
          <div class="stat-card-icon" style="background:var(--admin-glow);color:var(--admin-primary)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <div class="stat-card-value">${totalUsers}</div>
          <div class="stat-card-label">Total Users</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background:rgba(245,158,11,0.12);color:var(--vendor-primary)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3z"/><path d="M21 9H3"/><path d="M12 3v18"/></svg>
          </div>
          <div class="stat-card-value">${totalVendors}</div>
          <div class="stat-card-label">Registered Vendors</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background:var(--success-bg);color:var(--success)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.89 2.24L2.24 12.89a2 2 0 0 0 0 2.82L6.48 20a2 2 0 0 0 2.82 0L20 9.27a2 2 0 0 0 0-2.82l-4.24-4.24a2 2 0 0 0-2.87 0z"/></svg>
          </div>
          <div class="stat-card-value">${totalProducts}</div>
          <div class="stat-card-label">Active Listings</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background:var(--warning-bg);color:var(--warning)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="stat-card-value text-warning">${pendingVendors}</div>
          <div class="stat-card-label">Pending Approvals</div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="text-danger">Could not retrieve administrative stats.</div>`;
  }
}

function openCategoryFormModal() {
  const { openModal, closeModal } = window.__apexUI || {};
  if (!openModal) return;

  const formHTML = `
    <form class="d-flex flex-col gap-4" id="category-form">
      <div class="form-group">
        <label class="form-label" for="f-cat-name">Category Name</label>
        <input type="text" id="f-cat-name" class="form-control" placeholder="e.g. Sports Equipment" required>
      </div>
      <div class="form-group">
        <label class="form-label" for="f-cat-desc">Description</label>
        <textarea id="f-cat-desc" class="form-control" placeholder="Brief explanation of listed products..." required></textarea>
      </div>

      <div class="modal-footer" style="padding-right:0;padding-bottom:0">
        <button type="button" class="btn btn-secondary" id="cat-form-cancel">Cancel</button>
        <button type="submit" class="btn btn-primary" id="cat-form-submit-btn">Save Category</button>
      </div>
    </form>
  `;

  openModal(formHTML, 'Add New Category');

  document.getElementById('cat-form-cancel')?.addEventListener('click', closeModal);

  document.getElementById('category-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('cat-form-submit-btn');
    const name = document.getElementById('f-cat-name').value.trim();
    const description = document.getElementById('f-cat-desc').value.trim();

    saveBtn.disabled = true;
    saveBtn.innerHTML = `<div class="spinner spinner-sm"></div> Saving…`;

    try {
      await apiFetch('/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name, description })
      });
      showToast('Category created successfully!', 'success');
      
      // Reload categories list in state
      const categories = await apiFetch('/categories');
      setState({ categories });
      
      closeModal();
      await loadAdminStats();
    } catch (err) {
      showToast(err.message || 'Failed to save category.', 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Category';
    }
  });
}
