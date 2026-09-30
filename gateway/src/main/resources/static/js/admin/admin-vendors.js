/**
 * admin-vendors.js — Admin Vendor Approval Queue
 *
 * Lists registered vendors, displays shop info, and manages approvals/rejections
 */

import { apiFetch } from '../core/api.js';
import { showToast, formatDate, statusBadge, tableRowsSkeleton, openModal, closeModal } from '../core/ui.js';
import { renderAdminLayout } from './admin-layout.js';

let currentVendorStatus = 'PENDING'; // 'PENDING', 'APPROVED', 'REJECTED'
let currentVendorsPage = 0;

export async function renderAdminVendors() {
  const contentHTML = `
    <div class="d-flex justify-between items-center mb-6 flex-wrap gap-4">
      <div>
        <h1 class="section-title">Vendor Registrations</h1>
        <p class="text-muted">Review, approve, or reject vendor profiles and activate seller store permissions.</p>
      </div>

      <!-- Status Tabs -->
      <div class="tab-nav">
        <button class="tab-btn ${currentVendorStatus === 'PENDING' ? 'active' : ''}" data-status="PENDING">Pending Approval</button>
        <button class="tab-btn ${currentVendorStatus === 'APPROVED' ? 'active' : ''}" data-status="APPROVED">Active Sellers</button>
        <button class="tab-btn ${currentVendorStatus === 'REJECTED' ? 'active' : ''}" data-status="REJECTED">Rejected Applications</button>
      </div>
    </div>

    <!-- Vendors Table card -->
    <div class="card overflow-hidden">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Store details</th>
              <th>Owner details</th>
              <th>Status</th>
              <th>Applied Date</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody id="admin-vendors-list">
            ${tableRowsSkeleton(5, 4)}
          </tbody>
        </table>
      </div>
    </div>

    <div id="admin-vendors-pagination" class="pagination">
      <!-- Pagination dynamic -->
    </div>
  `;

  renderAdminLayout(contentHTML, 'admin-nav-vendors');
  setupPageListeners();
  await loadAdminVendors();
}

function setupPageListeners() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentVendorStatus = btn.dataset.status;
      currentVendorsPage = 0;
      loadAdminVendors();
    });
  });
}

async function loadAdminVendors() {
  const list = document.getElementById('admin-vendors-list');
  if (!list) return;

  const params = new URLSearchParams();
  if (currentVendorStatus) params.append('status', currentVendorStatus);
  params.append('page', currentVendorsPage);
  params.append('size', 10);

  try {
    const response = await apiFetch(`/admin/vendors?${params.toString()}`);
    const vendors = response.content || [];

    if (vendors.length === 0) {
      list.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted p-8">No vendor profiles found in this queue.</td>
        </tr>
      `;
      document.getElementById('admin-vendors-pagination').innerHTML = '';
      return;
    }

    list.innerHTML = vendors.map(vendor => {
      const showActions = currentVendorStatus === 'PENDING';

      return `
        <tr class="fade-in">
          <td>
            <div class="font-semibold text-sm">${vendor.storeName}</div>
            <div class="text-xs text-secondary mt-1" style="max-width:300px">${vendor.storeDescription || 'No description set.'}</div>
          </td>
          <td>
            <div class="font-semibold text-sm">${vendor.ownerName || 'Seller'}</div>
            <div class="text-xs text-muted">User ID: #${vendor.userId}</div>
          </td>
          <td>${statusBadge(vendor.status)}</td>
          <td class="text-xs">${formatDate(vendor.createdAt)}</td>
          <td class="td-actions">
            <button class="btn btn-secondary btn-sm view-vendor-btn" data-id="${vendor.id}">View Details</button>
            ${showActions ? `
              <button class="btn btn-success btn-sm approve-vendor-btn" data-id="${vendor.id}" data-name="${vendor.storeName}">Approve</button>
              <button class="btn btn-danger btn-sm reject-vendor-btn" data-id="${vendor.id}" data-name="${vendor.storeName}">Reject</button>
            ` : `
              <span class="text-muted text-xs">Processed</span>
            `}
          </td>
        </tr>
      `;
    }).join('');

    // View details event
    list.querySelectorAll('.view-vendor-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        showVendorDetailModal(btn.dataset.id);
      });
    });

    // Approve event — use custom modal instead of confirm()
    list.querySelectorAll('.approve-vendor-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        showApproveModal(id, name);
      });
    });

    // Reject event — use custom modal instead of prompt()
    list.querySelectorAll('.reject-vendor-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        showRejectModal(id, name);
      });
    });

    renderAdminVendorsPagination(response.totalPages, response.number);

  } catch (err) {
    list.innerHTML = `<tr><td colspan="5" class="text-center text-danger p-6">Could not load vendor queue.</td></tr>`;
  }
}

async function showVendorDetailModal(vendorId) {
  try {
    const v = await apiFetch(`/admin/vendors/${vendorId}`);
    
    const detailsHTML = `
      <div class="d-flex flex-col gap-4">
        <div class="p-4" style="background:var(--card-bg); border:1px solid var(--border); border-radius:var(--radius-md)">
          <h4 class="font-bold text-sm text-primary mb-2">Store Information</h4>
          <div class="text-sm font-semibold">${v.storeName}</div>
          <div class="text-xs text-muted mt-1">${v.storeDescription || 'No description provided.'}</div>
        </div>

        <div class="p-4" style="background:var(--card-bg); border:1px solid var(--border); border-radius:var(--radius-md)">
          <h4 class="font-bold text-sm text-primary mb-2">Business & Compliance</h4>
          <div class="d-grid gap-3" style="grid-template-columns:1fr 1fr">
            <div><span class="text-xs text-muted">Business Phone:</span> <div class="text-sm font-semibold">${v.businessPhone || 'N/A'}</div></div>
            <div><span class="text-xs text-muted">PAN Number:</span> <div class="text-sm font-semibold text-warning">${v.panNumber || 'N/A'}</div></div>
            <div><span class="text-xs text-muted">GSTIN:</span> <div class="text-sm font-semibold">${v.gstin || 'N/A'}</div></div>
            <div><span class="text-xs text-muted">Status:</span> <div class="text-sm">${statusBadge(v.status)}</div></div>
          </div>
          <div class="mt-2"><span class="text-xs text-muted">Business Address:</span> <div class="text-sm">${v.businessAddress || 'N/A'}</div></div>
        </div>

        <div class="p-4" style="background:rgba(124, 58, 237, 0.08); border:1px solid rgba(124, 58, 237, 0.2); border-radius:var(--radius-md)">
          <h4 class="font-bold text-sm text-vendor mb-2" style="color:var(--vendor-primary)">Bank Details (AES-256 Decrypted for Admin)</h4>
          <div class="d-grid gap-3" style="grid-template-columns:1fr 1fr">
            <div><span class="text-xs text-muted">Account Holder Name:</span> <div class="text-sm font-bold">${v.bankAccountName || 'N/A'}</div></div>
            <div><span class="text-xs text-muted">Account Number:</span> <div class="text-sm font-mono font-bold text-success">${v.bankAccountNumber || 'N/A'}</div></div>
            <div><span class="text-xs text-muted">IFSC Code:</span> <div class="text-sm font-mono font-bold">${v.bankIfscCode || 'N/A'}</div></div>
          </div>
        </div>

        <div class="modal-footer" style="padding-right:0;padding-bottom:0">
          <button type="button" class="btn btn-secondary" id="modal-close-btn">Close</button>
        </div>
      </div>
    `;

    openModal(detailsHTML, `Vendor Profile — ${v.storeName}`);
    document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
  } catch (err) {
    showToast(err.message || 'Could not fetch vendor details.', 'error');
  }
}

/**
 * Show a custom approval confirmation modal.
 */
function showApproveModal(vendorId, storeName) {
  openModal(`
    <div style="text-align:center; padding: 8px 0 16px;">
      <div style="width:56px;height:56px;border-radius:50%;background:var(--success-light,#d1fae5);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--success,#10b981)" stroke-width="2" style="width:28px;height:28px"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      </div>
      <h3 style="margin:0 0 8px;font-size:1.1rem;">Approve Vendor Store</h3>
      <p style="color:var(--text-muted);font-size:0.9rem;margin:0 0 24px;">
        Are you sure you want to approve <strong>${storeName}</strong>? The vendor will be notified and their store will become active.
      </p>
      <div style="display:flex;gap:12px;justify-content:center;">
        <button id="modal-cancel-approve" class="btn btn-outline">Cancel</button>
        <button id="modal-confirm-approve" class="btn btn-success">Yes, Approve</button>
      </div>
    </div>
  `, 'Approve Vendor');

  document.getElementById('modal-cancel-approve')?.addEventListener('click', closeModal);
  document.getElementById('modal-confirm-approve')?.addEventListener('click', async () => {
    const confirmBtn = document.getElementById('modal-confirm-approve');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Approving...';
    }
    try {
      await apiFetch(`/admin/vendors/${vendorId}/approve`, { method: 'PATCH' });
      closeModal();
      showToast(`"${storeName}" has been approved successfully!`, 'success');
      await loadAdminVendors();
    } catch (err) {
      closeModal();
      showToast(err.message || 'Approval failed. Please try again.', 'error');
    }
  });
}

/**
 * Show a custom rejection reason modal.
 */
function showRejectModal(vendorId, storeName) {
  openModal(`
    <div style="padding: 8px 0 16px;">
      <div style="text-align:center;margin-bottom:16px;">
        <div style="width:56px;height:56px;border-radius:50%;background:var(--danger-light,#fee2e2);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--danger,#ef4444)" stroke-width="2" style="width:28px;height:28px"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <h3 style="margin:0 0 4px;font-size:1.1rem;">Reject Vendor Application</h3>
        <p style="color:var(--text-muted);font-size:0.875rem;margin:0;">Rejecting: <strong>${storeName}</strong></p>
      </div>
      <div style="margin-bottom:20px;">
        <label style="display:block;font-size:0.875rem;font-weight:500;margin-bottom:8px;">Rejection Reason <span style="color:var(--danger)">*</span></label>
        <textarea id="reject-reason-input" rows="3" placeholder="Please explain why this application is being rejected..." 
          style="width:100%;padding:10px 12px;border:1px solid var(--border-color,#e5e7eb);border-radius:8px;font-size:0.9rem;resize:vertical;background:var(--input-bg,#fff);color:var(--text-primary);box-sizing:border-box;"></textarea>
        <div id="reject-reason-error" style="color:var(--danger);font-size:0.8rem;margin-top:4px;display:none;">A rejection reason is required.</div>
      </div>
      <div style="display:flex;gap:12px;justify-content:flex-end;">
        <button id="modal-cancel-reject" class="btn btn-outline">Cancel</button>
        <button id="modal-confirm-reject" class="btn btn-danger">Reject Application</button>
      </div>
    </div>
  `, 'Reject Vendor');

  document.getElementById('modal-cancel-reject')?.addEventListener('click', closeModal);
  document.getElementById('modal-confirm-reject')?.addEventListener('click', async () => {
    const reasonInput = document.getElementById('reject-reason-input');
    const errorDiv = document.getElementById('reject-reason-error');
    const reason = reasonInput?.value.trim();

    if (!reason) {
      if (errorDiv) errorDiv.style.display = 'block';
      if (reasonInput) reasonInput.focus();
      return;
    }
    if (errorDiv) errorDiv.style.display = 'none';

    const confirmBtn = document.getElementById('modal-confirm-reject');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Rejecting...';
    }

    try {
      await apiFetch(`/admin/vendors/${vendorId}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ reason })
      });
      closeModal();
      showToast(`"${storeName}" application has been rejected.`, 'warning');
      await loadAdminVendors();
    } catch (err) {
      closeModal();
      showToast(err.message || 'Rejection failed. Please try again.', 'error');
    }
  });
}

function renderAdminVendorsPagination(totalPages, currentPage) {
  const container = document.getElementById('admin-vendors-pagination');
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
      currentVendorsPage = parseInt(btn.dataset.page);
      loadAdminVendors();
    });
  });
}
