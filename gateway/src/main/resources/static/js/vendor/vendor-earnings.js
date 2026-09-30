/**
 * vendor-earnings.js — Vendor Earnings & Weekly Payout History
 *
 * Shows total earnings, pending payouts, 10% platform fee breakdown,
 * and payout status per transaction.
 */

import { apiFetch } from '../core/api.js';
import { showToast, formatCurrency, tableRowsSkeleton, statCardsSkeleton } from '../core/ui.js';
import { renderVendorLayout } from './vendor-layout.js';

export async function renderVendorEarnings() {
  const contentHTML = `
    <div class="d-flex justify-between items-center mb-6 flex-wrap gap-4">
      <div>
        <h1 class="section-title">My Sales Earnings</h1>
        <p class="text-muted">Track your product revenue, 10% platform commission deductions, and weekly payouts.</p>
      </div>
    </div>

    <!-- Stat cards -->
    <div id="vendor-earnings-stats">
      ${statCardsSkeleton(2)}
    </div>

    <!-- Earnings table -->
    <div class="card overflow-hidden mt-8">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer Paid</th>
              <th>Platform Fee (10%)</th>
              <th>Your Share (90%)</th>
              <th>Payout Week</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="earnings-table-container">
            ${tableRowsSkeleton(6, 4)}
          </tbody>
        </table>
      </div>
    </div>
  `;

  renderVendorLayout(contentHTML, 'vendor-nav-earnings');
  await loadVendorEarnings();
}

async function loadVendorEarnings() {
  const statsContainer = document.getElementById('vendor-earnings-stats');
  const tableContainer = document.getElementById('earnings-table-container');

  try {
    const data = await apiFetch('/vendors/me/earnings');

    const pendingPayout = data.pendingPayout || 0;
    const totalPaidOut = data.totalPaidOut || 0;
    const earningsList = data.earningsList || [];

    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="stat-cards-grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));">
          <div class="stat-card">
            <div class="stat-card-icon" style="background:var(--warning-bg);color:var(--warning)">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div class="stat-card-value text-warning">${formatCurrency(pendingPayout)}</div>
            <div class="stat-card-label">Pending Weekly Payout (90%)</div>
          </div>

          <div class="stat-card">
            <div class="stat-card-icon" style="background:var(--success-bg);color:var(--success)">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div class="stat-card-value text-success">${formatCurrency(totalPaidOut)}</div>
            <div class="stat-card-label">Total Transferred to Bank</div>
          </div>
        </div>
      `;
    }

    if (tableContainer) {
      if (earningsList.length === 0) {
        tableContainer.innerHTML = `
          <div class="text-center p-8 text-muted">
            <div>No sales earnings recorded yet.</div>
          </div>
        `;
        return;
      }

      let rowsHTML = '';
      earningsList.forEach(e => {
        const isPaid = e.payoutStatus === 'PAID';
        rowsHTML += `
          <tr>
            <td>
              <div class="font-bold">Order #${e.orderId}</div>
              <div class="text-xs text-muted">Stripe: ${e.paymentIntentId || 'N/A'}</div>
            </td>
            <td>${formatCurrency(e.totalAmount)}</td>
            <td><span class="text-muted">-${formatCurrency(e.platformFee)}</span> (10%)</td>
            <td><span class="font-bold text-success">${formatCurrency(e.vendorEarning)}</span> (90%)</td>
            <td><span class="badge font-mono">${e.payoutWeek || 'N/A'}</span></td>
            <td>
              ${isPaid 
                ? '<span class="badge badge-success">PAID</span>' 
                : '<span class="badge badge-warning">PENDING</span>'}
            </td>
          </tr>
        `;
      });

      tableContainer.innerHTML = rowsHTML;
    }
  } catch (err) {
    if (statsContainer) statsContainer.innerHTML = `<div class="text-danger p-4">Could not load earnings data.</div>`;
  }
}
