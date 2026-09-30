/**
 * vendor-layout.js — Vendor Dashboard Sidebar Layout
 *
 * Wraps dashboard content inside a specialized sidebar frame
 */

import { getState } from '../core/state.js';
import { setView } from '../core/ui.js';

export function renderVendorLayout(contentHTML, activeLinkId) {
  const state = getState();
  const storeName = state.vendor?.storeName || 'My Store';
  const ownerName = state.user?.name || 'Vendor';

  const viewHTML = `
    <div class="dashboard-layout">
      <!-- Vendor Navigation Sidebar -->
      <aside class="sidebar vendor-sidebar">
        <div class="sidebar-section">
          <div class="sidebar-section-label">Vendor Store</div>
          <div class="sidebar-user" style="padding: 0 8px; margin-top:8px">
            <div class="sidebar-user-avatar" style="background:var(--vendor-gradient)">
              ${storeName.slice(0, 2).toUpperCase()}
            </div>
            <div class="sidebar-user-info">
              <div class="sidebar-user-name" title="${storeName}">${storeName}</div>
              <div class="sidebar-user-role">Seller Panel</div>
            </div>
          </div>
        </div>

        <div class="divider" style="margin:8px 0"></div>

        <div class="sidebar-section">
          <div class="sidebar-section-label">Management</div>
          <nav class="sidebar-nav">
            <a href="#/vendor-dashboard" class="sidebar-link ${activeLinkId === 'vendor-nav-dash' ? 'active' : ''}" id="vendor-nav-dash">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
              Overview
            </a>
            <a href="#/vendor-products" class="sidebar-link ${activeLinkId === 'vendor-nav-products' ? 'active' : ''}" id="vendor-nav-products">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.89 2.24L2.24 12.89a2 2 0 0 0 0 2.82L6.48 20a2 2 0 0 0 2.82 0L20 9.27a2 2 0 0 0 0-2.82l-4.24-4.24a2 2 0 0 0-2.87 0z"/><path d="M14.5 9.5L9.5 14.5"/><path d="M12 22h10"/></svg>
              My Listings
            </a>
            <a href="#/vendor-orders" class="sidebar-link ${activeLinkId === 'vendor-nav-orders' ? 'active' : ''}" id="vendor-nav-orders">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              Orders
            </a>
            <a href="#/vendor-earnings" class="sidebar-link ${activeLinkId === 'vendor-nav-earnings' ? 'active' : ''}" id="vendor-nav-earnings">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              My Earnings
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
