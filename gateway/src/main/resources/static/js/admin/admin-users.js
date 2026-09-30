/**
 * admin-users.js — Platform Users Management
 *
 * Implements user listings, filter by role, and toggle account activation status
 */

import { apiFetch } from '../core/api.js';
import { showToast, formatDate, statusBadge, tableRowsSkeleton } from '../core/ui.js';
import { renderAdminLayout } from './admin-layout.js';

let currentRoleFilter = '';
let currentSearch = '';
let currentUsersPage = 0;

export async function renderAdminUsers() {
  const contentHTML = `
    <div class="d-flex justify-between items-center mb-6 flex-wrap gap-4">
      <div>
        <h1 class="section-title">Users Directory</h1>
        <p class="text-muted">Browse all accounts registered on the platform, disable/enable profiles, and view signup details.</p>
      </div>
      
      <div class="d-flex gap-3 items-center flex-wrap" style="width:100%; max-width:600px">
        <div class="search-wrapper" style="flex:1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" class="search-input" id="admin-user-search" placeholder="Search by name or email..." value="${currentSearch}">
        </div>

        <select class="form-control" id="admin-user-role-select" style="width:160px; height:42px">
          <option value="" ${currentRoleFilter === '' ? 'selected' : ''}>All Roles</option>
          <option value="CUSTOMER" ${currentRoleFilter === 'CUSTOMER' ? 'selected' : ''}>Customer</option>
          <option value="VENDOR" ${currentRoleFilter === 'VENDOR' ? 'selected' : ''}>Vendor</option>
          <option value="ADMIN" ${currentRoleFilter === 'ADMIN' ? 'selected' : ''}>Admin</option>
        </select>
      </div>
    </div>

    <!-- Users Table card -->
    <div class="card overflow-hidden">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Registered</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody id="admin-users-list">
            ${tableRowsSkeleton(6, 5)}
          </tbody>
        </table>
      </div>
    </div>

    <div id="admin-users-pagination" class="pagination">
      <!-- Pagination buttons dynamic -->
    </div>
  `;

  renderAdminLayout(contentHTML, 'admin-nav-users');
  setupPageListeners();
  await loadAdminUsers();
}

function setupPageListeners() {
  const searchInput = document.getElementById('admin-user-search');
  const roleSelect = document.getElementById('admin-user-role-select');

  let debounce;
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      currentSearch = e.target.value.trim();
      currentUsersPage = 0;
      loadAdminUsers();
    }, 400);
  });

  roleSelect?.addEventListener('change', (e) => {
    currentRoleFilter = e.target.value;
    currentUsersPage = 0;
    loadAdminUsers();
  });
}

async function loadAdminUsers() {
  const list = document.getElementById('admin-users-list');
  if (!list) return;

  const params = new URLSearchParams();
  if (currentRoleFilter) params.append('role', currentRoleFilter);
  if (currentSearch) params.append('search', currentSearch);
  params.append('page', currentUsersPage);
  params.append('size', 10);

  try {
    const response = await apiFetch(`/admin/users?${params.toString()}`);
    const users = response.content || [];

    if (users.length === 0) {
      list.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted p-8">No registered users matched the active filters.</td>
        </tr>
      `;
      document.getElementById('admin-users-pagination').innerHTML = '';
      return;
    }

    list.innerHTML = users.map(user => {
      const activeStr = user.active ? 'ACTIVE' : 'INACTIVE';
      const toggleLabel = user.active ? 'Disable' : 'Enable';
      const btnClass = user.active ? 'btn-danger' : 'btn-success';

      return `
        <tr class="fade-in">
          <td>
            <div class="user-cell">
              <div class="user-avatar">
                ${user.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'U'}
              </div>
              <div>
                <div class="user-info-name">${user.name}</div>
                <div class="user-info-email">${user.email}</div>
              </div>
            </div>
          </td>
          <td>${statusBadge(user.role)}</td>
          <td>${user.phone || '—'}</td>
          <td>${statusBadge(activeStr)}</td>
          <td class="text-xs">${formatDate(user.createdAt)}</td>
          <td style="text-align:right">
            <div class="td-actions">
              ${user.role === 'ADMIN' ? '—' : `
                <button class="btn ${btnClass} btn-sm toggle-user-btn" data-id="${user.id}" data-active="${user.active}">
                  ${toggleLabel}
                </button>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach activation toggle listeners
    list.querySelectorAll('.toggle-user-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.id;
        const currentActive = btn.dataset.active === 'true';
        const action = currentActive ? 'disable' : 'enable';

        if (!confirm(`Are you sure you want to ${action} this user account?`)) return;

        try {
          await apiFetch(`/admin/users/${userId}/${action}`, { method: 'PATCH' });
          showToast(`Account successfully ${action}d!`, 'success');
          await loadAdminUsers();
        } catch (err) {
          showToast(err.message || 'Action failed.', 'error');
        }
      });
    });

    renderAdminUsersPagination(response.totalPages, response.number);

  } catch (err) {
    list.innerHTML = `<tr><td colspan="6" class="text-center text-danger p-6">Could not fetch user directory.</td></tr>`;
  }
}

function renderAdminUsersPagination(totalPages, currentPage) {
  const container = document.getElementById('admin-users-pagination');
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
      currentUsersPage = parseInt(btn.dataset.page);
      loadAdminUsers();
    });
  });
}
