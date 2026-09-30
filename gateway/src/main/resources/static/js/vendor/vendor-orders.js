import { apiFetch } from '../core/api.js';
import { getState } from '../core/state.js';
import { formatCurrency, statusBadge, showToast } from '../core/ui.js';
import { renderVendorLayout } from './vendor-layout.js';

export async function renderVendorOrders() {
  const contentHTML = `
    <div class="d-flex justify-between items-center mb-6">
      <div>
        <h1 class="section-title">Incoming Customer Orders</h1>
        <p class="text-muted">Process pending orders, update shipping statuses, and track store revenue.</p>
      </div>
    </div>

    <!-- Orders Table card -->
    <div class="card overflow-hidden">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Product Details</th>
              <th>Total Value</th>
              <th>Status</th>
              <th class="text-right" style="padding-right:24px">Update Status</th>
            </tr>
          </thead>
          <tbody id="vendor-orders-list">
            <tr><td colspan="6" class="text-center text-muted p-6"><div class="spinner" style="display:inline-block"></div> Loading orders…</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <style>
      .vendor-status-select {
        height: 36px !important;
        padding: 4px 28px 4px 10px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        border-radius: 8px !important;
        border: 1px solid var(--border) !important;
        background-color: var(--card-bg) !important;
        color: var(--text) !important;
        cursor: pointer;
        outline: none;
        box-shadow: none !important;
        min-width: 130px;
        max-width: 150px;
        vertical-align: middle;
        line-height: normal !important;
      }
      .vendor-status-select:focus {
        border-color: var(--accent) !important;
      }
      .vendor-status-select:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        background-color: var(--surface) !important;
      }
    </style>
  `;

  renderVendorLayout(contentHTML, 'vendor-nav-orders');
  await loadVendorOrders();
}

async function loadVendorOrders() {
  const tbody = document.getElementById('vendor-orders-list');
  if (!tbody) return;

  const state = getState();
  if (!state.vendor || !state.vendor.id) {
    try {
      const vendorProfile = await apiFetch('/vendors/me');
      if (vendorProfile) state.vendor = vendorProfile;
    } catch (e) {
      console.warn('Could not fetch vendor profile:', e);
    }
  }

  if (!state.vendor || !state.vendor.id) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted p-8">
          Please complete your vendor store onboarding to view incoming customer orders.
        </td>
      </tr>
    `;
    return;
  }

  try {
    const orders = await apiFetch(`/orders/vendor/${state.vendor.id}`);

    if (!orders || orders.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted p-8">
            No customer orders received yet. When customers purchase your products, their orders will appear here.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = orders.map(order => {
      // Filter items belonging to this vendor
      const vendorItems = (order.items || []).filter(item => !item.vendorId || item.vendorId === state.vendor.id);
      const itemsSummary = vendorItems.length > 0 
        ? vendorItems.map(i => `${i.productName} (x${i.quantity})`).join(', ')
        : (order.items || []).map(i => `${i.productName} (x${i.quantity})`).join(', ');

      const totalVal = vendorItems.length > 0
        ? vendorItems.reduce((acc, i) => acc + (i.price * i.quantity), 0)
        : order.totalAmount;

      const isTerminal = order.status === 'CANCELLED' || order.status === 'REFUNDED';

      return `
        <tr class="fade-in">
          <td><strong>#${order.id}</strong></td>
          <td>
            <div class="font-semibold text-sm">${order.customerName || 'Customer'}</div>
            <div class="text-xs text-muted">${order.customerEmail || ''}</div>
          </td>
          <td>
            <div class="font-semibold text-sm">${itemsSummary || 'Order Item'}</div>
          </td>
          <td class="font-bold text-accent">${formatCurrency(totalVal)}</td>
          <td id="order-status-badge-${order.id}">${statusBadge(order.status)}</td>
          <td class="text-right" style="padding-right:24px">
            ${isTerminal ? `
              <span class="text-xs text-muted italic font-semibold">No action</span>
            ` : `
              <select class="form-control vendor-status-select select-status-trigger" data-id="${order.id}">
                <option value="PENDING" ${order.status === 'PENDING' ? 'selected' : ''}>Pending</option>
                <option value="PROCESSING" ${order.status === 'PROCESSING' ? 'selected' : ''}>Processing</option>
                <option value="SHIPPED" ${order.status === 'SHIPPED' ? 'selected' : ''}>Shipped</option>
                <option value="DELIVERED" ${order.status === 'DELIVERED' ? 'selected' : ''}>Delivered</option>
              </select>
            `}
          </td>
        </tr>
      `;
    }).join('');

    setupStatusChangeListeners();

  } catch (err) {
    console.error('Failed to load vendor orders:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-danger p-8">
          Failed to load incoming customer orders. Please try again.
        </td>
      </tr>
    `;
  }
}

function setupStatusChangeListeners() {
  document.querySelectorAll('.select-status-trigger').forEach(select => {
    select.addEventListener('change', async (e) => {
      const orderId = e.target.dataset.id;
      const newStatus = e.target.value;

      e.target.disabled = true;

      try {
        const updated = await apiFetch(`/orders/${orderId}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: newStatus })
        });

        const badgeCell = document.getElementById(`order-status-badge-${orderId}`);
        if (badgeCell) badgeCell.innerHTML = statusBadge(updated.status || newStatus);

        showToast(`Order #${orderId} status updated to ${newStatus}!`, 'success');
      } catch (err) {
        showToast(err.message || 'Failed to update order status', 'error');
      } finally {
        e.target.disabled = false;
      }
    });
  });
}
