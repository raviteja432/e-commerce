/**
 * admin-layout.js — Admin Dashboard Sidebar Layout
 *
 * Wraps dashboard content inside a specialized admin sidebar frame
 */

import { getState } from '../core/state.js';
import { setView } from '../core/ui.js';

export function renderAdminLayout(contentHTML, activeLinkId) {
  const state = getState();
  const ownerName = state.user?.name || 'Administrator';

  const viewHTML = `
    <div class="dashboard-layout">
      <!-- Admin Navigation Sidebar -->
      <aside class="sidebar admin-sidebar">
        <div class="sidebar-section">
          <div class="sidebar-section-label">Admin Console</div>
          <div class="sidebar-user" style="padding: 0 8px; margin-top:8px">
            <div class="sidebar-user-avatar" style="background:var(--admin-gradient)">
              AD
            </div>
            <div class="sidebar-user-info">
              <div class="sidebar-user-name">Apex Control</div>
              <div class="sidebar-user-role">Platform Admin</div>
            </div>
          </div>
        </div>

        <div class="divider" style="margin:8px 0"></div>

        <div class="sidebar-section">
          <div class="sidebar-section-label">Management</div>
          <nav class="sidebar-nav">
            <a href="#/admin-dashboard" class="sidebar-link ${activeLinkId === 'admin-nav-dash' ? 'active' : ''}" id="admin-nav-dash">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
              Overview
            </a>
            <a href="#/admin-users" class="sidebar-link ${activeLinkId === 'admin-nav-users' ? 'active' : ''}" id="admin-nav-users">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Users Directory
            </a>
            <a href="#/admin-vendors" class="sidebar-link ${activeLinkId === 'admin-nav-vendors' ? 'active' : ''}" id="admin-nav-vendors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3z"/><path d="M21 9H3"/><path d="M21 15H3"/><path d="M12 3v18"/></svg>
              Vendor Approval
            </a>
            <a href="#/admin-products" class="sidebar-link ${activeLinkId === 'admin-nav-products' ? 'active' : ''}" id="admin-nav-products">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.89 2.24L2.24 12.89a2 2 0 0 0 0 2.82L6.48 20a2 2 0 0 0 2.82 0L20 9.27a2 2 0 0 0 0-2.82l-4.24-4.24a2 2 0 0 0-2.87 0z"/><path d="M14.5 9.5L9.5 14.5"/><path d="M12 22h10"/></svg>
              All Listings
            </a>
            <a href="#/admin-payouts" class="sidebar-link ${activeLinkId === 'admin-nav-payouts' ? 'active' : ''}" id="admin-nav-payouts">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              Vendor Payouts
            </a>
          </nav>
        </div>

        <div class="sidebar-footer">
          <div class="sidebar-user">
            <div class="sidebar-user-avatar" style="background:rgba(255,255,255,0.06); color:var(--text-secondary); border:1px solid var(--border)">
              ${ownerName[0].toUpperCase()}
            </div>
            <div class="sidebar-user-info">
              <div class="sidebar-user-name">${ownerName}</div>
              <div class="sidebar-user-role">${state.user?.email}</div>
            </div>
          </div>
        </div>
      </aside>

      <!-- Dashboard content outlet -->
      <main class="dashboard-content">
        <div class="dashboard-page fade-in">
          ${contentHTML}
        </div>
      </main>
    </div>
  `;

  setView(viewHTML);
}
