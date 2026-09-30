/**
 * orders.js — Order History Page (Amazon/Flipkart style)
 *
 * Rich order cards showing product images, names, prices, and status
 * with a premium, polished UI similar to top e-commerce platforms.
 */

import { apiFetch } from '../core/api.js';
import { setView, formatCurrency, formatDate, statusBadge } from '../core/ui.js';

export async function renderOrders() {
  setView(`
    <div class="page-wrapper">
      <div class="page-container" style="max-width: 960px; margin: 0 auto;">

        <!-- Page Header -->
        <div class="orders-page-header">
          <div>
            <h1 class="section-title mb-1">My Orders</h1>
            <p class="text-muted text-sm">Track and manage your purchases</p>
          </div>
          <a href="#/catalog" class="btn btn-primary btn-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            Continue Shopping
          </a>
        </div>

        <div id="orders-list-container" class="d-flex flex-col gap-5 mt-6">
          <!-- Skeleton Loaders -->
          ${[1,2,3].map(() => `
            <div class="order-card-skeleton card p-6">
              <div class="skeleton" style="height:18px;width:200px;border-radius:6px;margin-bottom:12px"></div>
              <div class="d-flex gap-4">
                <div class="skeleton" style="width:80px;height:80px;border-radius:10px;flex-shrink:0"></div>
                <div class="d-flex flex-col gap-2 flex-1">
                  <div class="skeleton" style="height:14px;width:70%;border-radius:4px"></div>
                  <div class="skeleton" style="height:12px;width:40%;border-radius:4px"></div>
                  <div class="skeleton" style="height:12px;width:30%;border-radius:4px"></div>
                </div>
                <div class="skeleton" style="width:90px;height:32px;border-radius:8px;align-self:center"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <style>
      .orders-page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        padding-bottom: 20px;
        border-bottom: 1px solid var(--border);
      }

      .order-card {
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 16px;
        overflow: hidden;
        transition: box-shadow 0.2s, transform 0.2s;
      }
      .order-card:hover {
        box-shadow: 0 8px 30px rgba(0,0,0,0.18);
        transform: translateY(-2px);
      }

      .order-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        padding: 14px 20px;
        background: var(--surface);
        border-bottom: 1px solid var(--border);
      }
      .order-card-header-left {
        display: flex;
        align-items: center;
        gap: 20px;
        flex-wrap: wrap;
      }
      .order-meta-group {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .order-meta-label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--text-muted);
        font-weight: 600;
      }
      .order-meta-value {
        font-size: 13px;
        font-weight: 700;
        color: var(--text);
      }

      .order-items-list {
        padding: 0;
      }
      .order-item-row {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px 20px;
        border-bottom: 1px solid var(--border);
        transition: background 0.15s;
      }
      .order-item-row:last-child {
        border-bottom: none;
      }
      .order-item-row:hover {
        background: var(--surface);
      }

      .order-item-img {
        width: 80px;
        height: 80px;
        object-fit: cover;
        border-radius: 10px;
        border: 1px solid var(--border);
        flex-shrink: 0;
        background: var(--surface);
      }

      .order-item-info {
        flex: 1;
        min-width: 0;
      }
      .order-item-name {
        font-size: 14px;
        font-weight: 600;
        color: var(--text);
        margin-bottom: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .order-item-meta {
        font-size: 12px;
        color: var(--text-muted);
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin-top: 4px;
      }
      .order-item-price-block {
        text-align: right;
        flex-shrink: 0;
      }
      .order-item-subtotal {
        font-size: 15px;
        font-weight: 700;
        color: var(--accent);
      }
      .order-item-unit {
        font-size: 11px;
        color: var(--text-muted);
        margin-top: 2px;
      }

      .order-card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        padding: 12px 20px;
        background: var(--surface);
        border-top: 1px solid var(--border);
      }
      .order-total-summary {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
      }
      .order-total-label {
        color: var(--text-muted);
      }
      .order-total-amount {
        font-size: 17px;
        font-weight: 800;
        color: var(--text);
      }
      .order-card-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .order-card-skeleton {
        border-radius: 16px;
        border: 1px solid var(--border);
      }

      .status-pill-DELIVERED { background: rgba(34,197,94,0.12); color: #22c55e; }
      .status-pill-SHIPPED   { background: rgba(59,130,246,0.12); color: #3b82f6; }
      .status-pill-PROCESSING{ background: rgba(234,179,8,0.12);  color: #eab308; }
      .status-pill-PENDING   { background: rgba(148,163,184,0.12);color: #94a3b8; }
      .status-pill-CANCELLED { background: rgba(239,68,68,0.12);  color: #ef4444; }
      .status-pill-REFUNDED  { background: rgba(168,85,247,0.12); color: #a855f7; }
      .status-pill-RETURN    { background: rgba(245,158,11,0.12); color: #f59e0b; }
      .status-pill-EXCHANGE  { background: rgba(59,130,246,0.12); color: #3b82f6; }

      .track-chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
      }
      .track-chip::before {
        content: '';
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: currentColor;
        animation: pulse-dot 1.4s infinite;
      }
      @keyframes pulse-dot {
        0%,100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(0.8); }
      }
    </style>
  `);

  try {
    const orders = await apiFetch('/orders');
    renderOrdersUI(orders);
  } catch (err) {
    console.error('Failed to load orders:', err);
    document.getElementById('orders-list-container').innerHTML = `
      <div class="empty-state card p-8">
        <div class="empty-state-icon mx-auto" style="background:var(--danger-bg); border-color:rgba(239,68,68,0.3)">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2" style="width:36px; height:36px">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div class="empty-state-title">Unable to retrieve history</div>
        <div class="empty-state-desc">Something went wrong while communicating with the server. Please try again.</div>
      </div>
    `;
  }
}

function getStatusChipClass(status) {
  if (!status) return 'status-pill-PENDING';
  if (status.includes('CANCEL')) return 'status-pill-CANCELLED';
  if (status.includes('REFUND')) return 'status-pill-REFUNDED';
  if (status.includes('RETURN')) return 'status-pill-RETURN';
  if (status.includes('EXCHANGE')) return 'status-pill-EXCHANGE';
  const map = {
    DELIVERED: 'status-pill-DELIVERED',
    SHIPPED: 'status-pill-SHIPPED',
    PROCESSING: 'status-pill-PROCESSING',
    PENDING: 'status-pill-PENDING',
  };
  return map[status] || 'status-pill-PENDING';
}

function getStatusIcon(status) {
  const icons = {
    DELIVERED: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    SHIPPED:   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
    PROCESSING:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>`,
    PENDING:   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    CANCELLED: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  };
  return icons[status] || icons.PENDING;
}

function renderOrdersUI(orders) {
  const container = document.getElementById('orders-list-container');
  if (!container) return;

  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div class="empty-state card p-10 fade-in" style="text-align:center;">
        <div class="empty-state-icon mx-auto" style="width:72px;height:72px;font-size:36px;display:flex;align-items:center;justify-content:center;">
          🛍️
        </div>
        <div class="empty-state-title mt-4">No orders yet</div>
        <div class="empty-state-desc">You haven't placed any orders yet. Explore our catalog and start shopping!</div>
        <a href="#/catalog" class="btn btn-primary mt-6">Start Shopping</a>
      </div>
    `;
    return;
  }

  container.innerHTML = orders.map((order, idx) => {
    const items = order.items || [];
    const previewItems = items.slice(0, 3); // Show up to 3 items
    const extraCount = items.length - previewItems.length;
    const statusClass = getStatusChipClass(order.status);

    return `
      <div class="order-card fade-in stagger-${(idx % 4) + 1}">

        <!-- Card Header: Order meta -->
        <div class="order-card-header">
          <div class="order-card-header-left">
            <div class="order-meta-group">
              <span class="order-meta-label">Order ID</span>
              <span class="order-meta-value">#${order.id}</span>
            </div>
            <div class="order-meta-group">
              <span class="order-meta-label">Date Placed</span>
              <span class="order-meta-value" style="font-weight:500">${formatDate(order.createdAt || order.orderDate)}</span>
            </div>
            <div class="order-meta-group">
              <span class="order-meta-label">Items</span>
              <span class="order-meta-value" style="font-weight:500">${items.length} item${items.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="order-meta-group">
              <span class="order-meta-label">Payment</span>
              <span class="order-meta-value" style="font-weight:500">${order.paymentMethod || 'Online'}</span>
            </div>
          </div>
          <div class="d-flex items-center gap-3">
            <span class="track-chip ${statusClass}">
              ${getStatusIcon(order.status)}
              ${order.status || 'PENDING'}
            </span>
          </div>
        </div>

        <!-- Items Preview -->
        <div class="order-items-list">
          ${previewItems.map(item => `
            <div class="order-item-row">
              <img
                src="${item.productImage || ''}"
                alt="${item.productName}"
                class="order-item-img"
                onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80'"
              >
              <div class="order-item-info">
                <div class="order-item-name">${item.productName}</div>
                <div class="order-item-meta">
                  <span>Qty: <strong>${item.quantity}</strong></span>
                  <span>Unit Price: <strong>${formatCurrency(item.price)}</strong></span>
                </div>
              </div>
              <div class="order-item-price-block">
                <div class="order-item-subtotal">${formatCurrency(item.price * item.quantity)}</div>
                <div class="order-item-unit">${item.quantity} × ${formatCurrency(item.price)}</div>
              </div>
            </div>
          `).join('')}

          ${extraCount > 0 ? `
            <div class="order-item-row" style="justify-content:center;padding:10px;background:var(--surface)">
              <span class="text-xs text-muted font-semibold">+${extraCount} more item${extraCount !== 1 ? 's' : ''} in this order</span>
            </div>
          ` : ''}
        </div>

        <!-- Card Footer: Total & Actions -->
        <div class="order-card-footer">
          <div class="order-total-summary">
            <span class="order-total-label">Order Total:</span>
            <span class="order-total-amount">${formatCurrency(order.totalAmount)}</span>
          </div>
          <div class="order-card-actions">
            <button
              class="btn btn-secondary btn-sm"
              onclick="window.location.hash='#/order/${order.id}'"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              View Details
            </button>
          </div>
        </div>

      </div>
    `;
  }).join('');
}
