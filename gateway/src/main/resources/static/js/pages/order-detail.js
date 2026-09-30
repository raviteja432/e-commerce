/**
 * order-detail.js — Enhanced Order Detail & Tracking Page
 *
 * Flipkart / Amazon style order details with:
 * - Bold, crystal-clear step tracking timeline
 * - Eligible Order Cancellation with reason collection (COD vs Online Refund)
 * - Return and Exchange request system for delivered items
 */

import { apiFetch } from '../core/api.js';
import { setView, formatCurrency, formatDate, showToast, openModal, closeModal } from '../core/ui.js';

let currentOrderData = null;

export async function renderOrderDetail(orderId) {
  setView(`
    <div class="page-wrapper">
      <div class="od-container">
        <a href="#/orders" class="btn btn-ghost btn-sm mb-6" style="padding-left:0; display:inline-flex; align-items:center; gap:6px;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px"><polyline points="15 18 9 12 15 6"/></svg>
          Back to My Orders
        </a>
        <div id="order-detail-container">
          <div class="page-loading"><div class="spinner"></div>Loading order details…</div>
        </div>
      </div>
    </div>

    <style>
      .od-container {
        max-width: 1040px;
        margin: 0 auto;
        padding: 24px 20px 60px;
      }

      .od-grid {
        display: grid;
        grid-template-columns: 1fr 340px;
        gap: 24px;
        align-items: start;
      }
      @media (max-width: 840px) {
        .od-grid { grid-template-columns: 1fr; }
      }

      .od-card {
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 16px;
        overflow: hidden;
        margin-bottom: 20px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.04);
      }
      .od-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--border);
        background: var(--surface);
      }
      .od-card-title {
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.3px;
        color: var(--text);
        display: flex;
        align-items: center;
        gap: 8px;
      }

      /* ── Hero Header ── */
      .od-hero {
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 22px 24px;
        margin-bottom: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 16px;
      }
      .od-hero-id {
        font-size: 22px;
        font-weight: 800;
        color: var(--text);
      }
      .od-hero-date {
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .od-hero-meta {
        display: flex;
        gap: 24px;
        flex-wrap: wrap;
      }
      .od-meta-block {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .od-meta-label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        color: var(--text-muted);
        font-weight: 700;
      }
      .od-meta-val {
        font-size: 14px;
        font-weight: 700;
        color: var(--text);
      }

      /* ── Amazon / Flipkart Tracking Timeline ── */
      .od-tracker-wrapper {
        padding: 28px 24px;
        background: var(--card-bg);
      }
      .od-tracker-steps {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        position: relative;
      }
      .od-tracker-track {
        position: absolute;
        top: 20px;
        left: 48px;
        right: 48px;
        height: 6px;
        background: var(--border);
        border-radius: 3px;
        z-index: 0;
      }
      .od-tracker-fill {
        height: 100%;
        background: linear-gradient(90deg, #3b82f6, #22c55e);
        border-radius: 3px;
        transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .od-tracker-node {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        z-index: 1;
        flex: 1;
      }
      .od-node-circle {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        border: 3px solid var(--border);
        background: var(--card-bg);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-muted);
        font-weight: 800;
        font-size: 14px;
        transition: all 0.3s;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      }
      .od-tracker-node.done .od-node-circle {
        background: #22c55e;
        border-color: #22c55e;
        color: #ffffff;
      }
      .od-tracker-node.active .od-node-circle {
        background: #3b82f6;
        border-color: #3b82f6;
        color: #ffffff;
        box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.25);
        animation: activePulse 2s infinite;
      }
      @keyframes activePulse {
        0%, 100% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.25); }
        50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.15); }
      }
      .od-node-text {
        text-align: center;
      }
      .od-node-title {
        font-size: 13px;
        font-weight: 700;
        color: var(--text-muted);
      }
      .od-tracker-node.done .od-node-title,
      .od-tracker-node.active .od-node-title {
        color: var(--text);
      }
      .od-node-sub {
        font-size: 11px;
        color: var(--text-muted);
        margin-top: 2px;
      }

      /* Banner for special statuses (Cancelled, Refunded, Return Requested, etc.) */
      .status-alert-banner {
        padding: 16px 20px;
        border-radius: 12px;
        margin: 16px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 13px;
        font-weight: 600;
      }
      .alert-banner-CANCELLED { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; }
      .alert-banner-REFUNDED  { background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.3); color: #a855f7; }
      .alert-banner-RETURN    { background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); color: #f59e0b; }
      .alert-banner-EXCHANGE  { background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.3); color: #3b82f6; }

      /* Item Rows */
      .od-item-row {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 18px 20px;
        border-bottom: 1px solid var(--border);
      }
      .od-item-row:last-child { border-bottom: none; }
      .od-item-img {
        width: 88px;
        height: 88px;
        object-fit: cover;
        border-radius: 12px;
        border: 1px solid var(--border);
        background: var(--surface);
        flex-shrink: 0;
      }
      .od-item-name {
        font-size: 15px;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 4px;
      }
      .od-item-sub {
        font-size: 12px;
        color: var(--text-muted);
      }
      .od-item-price-block {
        text-align: right;
        margin-left: auto;
      }
      .od-item-subtotal {
        font-size: 16px;
        font-weight: 800;
        color: var(--accent);
      }

      /* Sidebar & Action Buttons */
      .action-card {
        padding: 20px;
        background: var(--surface);
        border-top: 1px solid var(--border);
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      .status-badge-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 700;
      }
      .sb-PENDING   { background: rgba(148,163,184,0.15); color: #64748b; }
      .sb-PROCESSING{ background: rgba(234,179,8,0.15);  color: #ca8a04; }
      .sb-SHIPPED   { background: rgba(59,130,246,0.15); color: #2563eb; }
      .sb-DELIVERED { background: rgba(34,197,94,0.15); color: #16a34a; }
      .sb-CANCELLED { background: rgba(239,68,68,0.15); color: #dc2626; }
      .sb-REFUNDED  { background: rgba(168,85,247,0.15); color: #9333ea; }
      .sb-RETURN    { background: rgba(245,158,11,0.15); color: #d97706; }
      .sb-EXCHANGE  { background: rgba(59,130,246,0.15); color: #2563eb; }

      /* Modal styling overrides */
      .modal-reason-option {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        border: 1px solid var(--border);
        border-radius: 8px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: background 0.15s;
      }
      .modal-reason-option:hover {
        background: var(--surface);
      }
      .modal-reason-option input {
        accent-color: var(--accent);
      }
    </style>
  `);

  try {
    const order = await apiFetch(`/orders/${orderId}`);
    currentOrderData = order;
    renderOrderDetailUI(order);
  } catch (err) {
    console.error('Failed to load order detail:', err);
    document.getElementById('order-detail-container').innerHTML = `
      <div class="empty-state card p-8">
        <div class="empty-state-title">Order Not Found</div>
        <div class="empty-state-desc">The requested order could not be found or you do not have permission to view it.</div>
        <a href="#/orders" class="btn btn-primary mt-4">Back to My Orders</a>
      </div>
    `;
  }
}

function renderOrderDetailUI(order) {
  const container = document.getElementById('order-detail-container');
  if (!container) return;

  const currentStatus = order.status || 'PENDING';
  const isCancelled = currentStatus === 'CANCELLED';
  const isRefunded = currentStatus === 'REFUNDED';
  const isReturnReq = currentStatus === 'RETURN_REQUESTED' || currentStatus === 'RETURNED';
  const isExchangeReq = currentStatus === 'EXCHANGE_REQUESTED' || currentStatus === 'EXCHANGED';
  const isDelivered = currentStatus === 'DELIVERED';
  const isEligibleForCancel = currentStatus === 'PENDING' || currentStatus === 'PROCESSING';

  // Tracking Timeline Setup
  const steps = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  let curIdx = steps.indexOf(currentStatus);
  if (curIdx === -1 && (isCancelled || isRefunded)) curIdx = 0;
  if (isReturnReq || isExchangeReq) curIdx = 3;

  const stepLabels = {
    PENDING: { title: 'Order Placed', sub: 'Confirmed' },
    PROCESSING: { title: 'Processing', sub: 'Packing by Seller' },
    SHIPPED: { title: 'Dispatched', sub: 'In Transit via Courier' },
    DELIVERED: { title: 'Delivered', sub: 'Handed Over' }
  };

  const fillPercent = curIdx <= 0 ? 0 : Math.round((curIdx / (steps.length - 1)) * 100);

  const trackerHTML = `
    <div class="od-tracker-wrapper">
      <div class="od-tracker-steps">
        <div class="od-tracker-track">
          <div class="od-tracker-fill" style="width: ${fillPercent}%"></div>
        </div>
        ${steps.map((st, idx) => {
          const isDone = idx < curIdx || isDelivered;
          const isActive = idx === curIdx && !isDelivered && !isCancelled && !isRefunded;
          const info = stepLabels[st];
          return `
            <div class="od-tracker-node ${isDone ? 'done' : isActive ? 'active' : ''}">
              <div class="od-node-circle">
                ${isDone ? `✓` : idx + 1}
              </div>
              <div class="od-node-text">
                <div class="od-node-title">${info.title}</div>
                <div class="od-node-sub">${info.sub}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // Status Banner for non-standard order states
  let alertBannerHTML = '';
  if (isCancelled) {
    alertBannerHTML = `
      <div class="status-alert-banner alert-banner-CANCELLED">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        <div>
          <div style="font-weight:700">Order Cancelled</div>
          <div style="font-size:12px; opacity:0.9">This order was cancelled. No charges will be processed for COD orders.</div>
        </div>
      </div>
    `;
  } else if (isRefunded) {
    alertBannerHTML = `
      <div class="status-alert-banner alert-banner-REFUNDED">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        <div>
          <div style="font-weight:700">Order Cancelled & Refund Initiated</div>
          <div style="font-size:12px; opacity:0.9">A full refund of ${formatCurrency(order.totalAmount)} has been credited to your original payment method.</div>
        </div>
      </div>
    `;
  } else if (isReturnReq) {
    alertBannerHTML = `
      <div class="status-alert-banner alert-banner-RETURN">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
        <div>
          <div style="font-weight:700">Return Requested</div>
          <div style="font-size:12px; opacity:0.9">Your return request is registered. Courier pickup will be scheduled within 24-48 hours.</div>
        </div>
      </div>
    `;
  } else if (isExchangeReq) {
    alertBannerHTML = `
      <div class="status-alert-banner alert-banner-EXCHANGE">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><path d="M17 2.1l4 4-4 4"/><path d="M3 12.2v-2a4 4 0 0 1 4-4h14"/><path d="M7 21.9l-4-4 4-4"/><path d="M21 11.8v2a4 4 0 0 1-4 4H3"/></svg>
        <div>
          <div style="font-weight:700">Exchange Request Registered</div>
          <div style="font-size:12px; opacity:0.9">Replacement processing started. Our agent will exchange the product at your delivery address.</div>
        </div>
      </div>
    `;
  }

  // Items List HTML
  const items = order.items || [];
  const itemsHTML = items.map(item => `
    <div class="od-item-row">
      <img src="${item.productImage || ''}" alt="${item.productName}" class="od-item-img" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80'">
      <div>
        <div class="od-item-name">${item.productName}</div>
        <div class="od-item-sub">Quantity: <strong>${item.quantity}</strong> unit(s) • Unit Price: ${formatCurrency(item.price)}</div>
      </div>
      <div class="od-item-price-block">
        <div class="od-item-subtotal">${formatCurrency(item.price * item.quantity)}</div>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <!-- Hero Header -->
    <div class="od-hero fade-in">
      <div>
        <div class="od-hero-id">Order #${order.id}</div>
        <div class="od-hero-date">Placed on ${formatDate(order.createdAt || order.orderDate)}</div>
      </div>
      <div class="od-hero-meta">
        <div class="od-meta-block">
          <span class="od-meta-label">Payment Mode</span>
          <span class="od-meta-val">${order.paymentMethod || 'Online'}</span>
        </div>
        <div class="od-meta-block">
          <span class="od-meta-label">Total Amount</span>
          <span class="od-meta-val" style="color:var(--accent)">${formatCurrency(order.totalAmount)}</span>
        </div>
      </div>
    </div>

    <div class="od-grid">
      <!-- Main Content Left Column -->
      <div>
        <!-- Order Tracking Card -->
        <div class="od-card fade-in">
          <div class="od-card-header">
            <span class="od-card-title">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              Order Status & Live Tracking
            </span>
            <span class="status-badge-pill sb-${currentStatus.includes('RETURN') ? 'RETURN' : currentStatus.includes('EXCHANGE') ? 'EXCHANGE' : currentStatus}">
              ${currentStatus}
            </span>
          </div>
          ${alertBannerHTML}
          ${trackerHTML}

          <!-- Action Buttons Card (Cancel / Return / Exchange) -->
          ${(isEligibleForCancel || isDelivered) ? `
            <div class="action-card">
              ${isEligibleForCancel ? `
                <button class="btn btn-secondary text-danger" id="cancel-order-trigger-btn" style="border-color: rgba(239,68,68,0.3)">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  Cancel Order
                </button>
              ` : ''}

              ${isDelivered ? `
                <button class="btn btn-secondary" id="return-order-trigger-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                  Return Items
                </button>
                <button class="btn btn-primary" id="exchange-order-trigger-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M17 2.1l4 4-4 4"/><path d="M3 12.2v-2a4 4 0 0 1 4-4h14"/><path d="M7 21.9l-4-4 4-4"/><path d="M21 11.8v2a4 4 0 0 1-4 4H3"/></svg>
                  Exchange Product
                </button>
              ` : ''}
            </div>
          ` : ''}
        </div>

        <!-- Items Card -->
        <div class="od-card fade-in">
          <div class="od-card-header">
            <span class="od-card-title">🛒 Ordered Items (${items.length})</span>
          </div>
          <div class="od-card-body">
            ${itemsHTML}
          </div>
        </div>
      </div>

      <!-- Right Column: Address & Payment Summary -->
      <div>
        <div class="od-card fade-in">
          <div class="od-card-header">
            <span class="od-card-title">📍 Shipping Address</span>
          </div>
          <div class="p-5 text-sm" style="line-height:1.6; white-space:pre-wrap; color:var(--text)">${order.shippingAddress || 'No address specified'}</div>
        </div>

        <div class="od-card fade-in">
          <div class="od-card-header">
            <span class="od-card-title">💳 Payment Details</span>
          </div>
          <div class="p-5">
            <div class="d-flex justify-between text-sm mb-2">
              <span class="text-muted">Payment Mode</span>
              <span class="font-semibold">${order.paymentMethod || 'Online Payment'}</span>
            </div>
            <div class="d-flex justify-between text-sm mb-2">
              <span class="text-muted">Subtotal</span>
              <span class="font-semibold">${formatCurrency(order.totalAmount)}</span>
            </div>
            <div class="d-flex justify-between text-sm mb-2">
              <span class="text-muted">Shipping Fee</span>
              <span class="text-success font-semibold">FREE</span>
            </div>
            <hr class="my-3" style="border-color:var(--border)">
            <div class="d-flex justify-between text-base font-bold">
              <span>Total Paid</span>
              <span class="text-accent">${formatCurrency(order.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach Event Listeners for Cancel / Return / Exchange
  document.getElementById('cancel-order-trigger-btn')?.addEventListener('click', openCancelModal);
  document.getElementById('return-order-trigger-btn')?.addEventListener('click', () => openReturnExchangeModal('RETURN'));
  document.getElementById('exchange-order-trigger-btn')?.addEventListener('click', () => openReturnExchangeModal('EXCHANGE'));
}

/* ─────────────────────────────────────────────────────────────
 * CANCEL ORDER MODAL & LOGIC
 * ───────────────────────────────────────────────────────────── */
function openCancelModal() {
  if (!currentOrderData) return;

  const isCOD = currentOrderData.paymentMethod && 
    (currentOrderData.paymentMethod.toUpperCase().includes('COD') || currentOrderData.paymentMethod.toUpperCase().includes('CASH'));

  const modalBody = `
    <div class="p-2">
      <p class="text-sm text-muted mb-4">Please let us know why you are cancelling Order <strong>#${currentOrderData.id}</strong>:</p>

      <label class="modal-reason-option">
        <input type="radio" name="cancel_reason" value="Order placed by mistake" checked>
        <span class="text-sm">Order placed by mistake</span>
      </label>
      <label class="modal-reason-option">
        <input type="radio" name="cancel_reason" value="Item price decreased">
        <span class="text-sm">Found better price elsewhere</span>
      </label>
      <label class="modal-reason-option">
        <input type="radio" name="cancel_reason" value="Delivery time is too long">
        <span class="text-sm">Delivery time is too long</span>
      </label>
      <label class="modal-reason-option">
        <input type="radio" name="cancel_reason" value="Need to change shipping address or payment method">
        <span class="text-sm">Need to change address / payment method</span>
      </label>
      <label class="modal-reason-option">
        <input type="radio" name="cancel_reason" value="Other">
        <span class="text-sm">Other reason</span>
      </label>

      <div class="mt-4 p-3 rounded text-xs" style="background:var(--surface); border:1px solid var(--border)">
        ${isCOD ? `
          <div class="font-semibold text-warning mb-1">Cash on Delivery Order</div>
          <div>No charges were collected. Order will be cancelled immediately.</div>
        ` : `
          <div class="font-semibold text-success mb-1">Online Payment Order</div>
          <div>A full refund of <strong>${formatCurrency(currentOrderData.totalAmount)}</strong> will be credited back to your original payment method within 3-5 business days.</div>
        `}
      </div>

      <div class="d-flex justify-end gap-3 mt-6">
        <button class="btn btn-secondary btn-sm" id="modal-cancel-close-btn">Keep Order</button>
        <button class="btn btn-danger btn-sm" id="modal-confirm-cancel-btn">Confirm Cancellation</button>
      </div>
    </div>
  `;

  openModal(modalBody, 'Cancel Order');

  document.getElementById('modal-cancel-close-btn')?.addEventListener('click', closeModal);

  document.getElementById('modal-confirm-cancel-btn')?.addEventListener('click', async () => {
    const selectedRadio = document.querySelector('input[name="cancel_reason"]:checked');
    const reason = selectedRadio ? selectedRadio.value : 'Cancelled by customer';

    const btn = document.getElementById('modal-confirm-cancel-btn');
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner spinner-sm"></div> Processing…`;

    try {
      const updatedOrder = await apiFetch(`/orders/${currentOrderData.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });

      closeModal();
      showToast(isCOD ? 'Order cancelled successfully' : 'Order cancelled. Refund initiated to original payment source!', 'success');
      currentOrderData = updatedOrder;
      renderOrderDetailUI(updatedOrder);
    } catch (err) {
      showToast(err.message || 'Failed to cancel order', 'error');
      btn.disabled = false;
      btn.textContent = 'Confirm Cancellation';
    }
  });
}

/* ─────────────────────────────────────────────────────────────
 * RETURN & EXCHANGE MODAL & LOGIC
 * ───────────────────────────────────────────────────────────── */
function openReturnExchangeModal(defaultAction = 'RETURN') {
  if (!currentOrderData) return;

  const modalBody = `
    <div class="p-2">
      <div class="d-flex gap-3 mb-4">
        <button type="button" class="btn ${defaultAction === 'RETURN' ? 'btn-primary' : 'btn-secondary'} flex-1 btn-sm" id="tab-action-return">
          Return & Refund
        </button>
        <button type="button" class="btn ${defaultAction === 'EXCHANGE' ? 'btn-primary' : 'btn-secondary'} flex-1 btn-sm" id="tab-action-exchange">
          Exchange Product
        </button>
      </div>

      <p class="text-sm text-muted mb-3" id="action-prompt-text">
        Select reason for ${defaultAction === 'RETURN' ? 'returning' : 'exchanging'} items in Order <strong>#${currentOrderData.id}</strong>:
      </p>

      <label class="modal-reason-option">
        <input type="radio" name="return_reason" value="Size or fit issue" checked>
        <span class="text-sm">Size or fit issue</span>
      </label>
      <label class="modal-reason-option">
        <input type="radio" name="return_reason" value="Item defective or damaged">
        <span class="text-sm">Item defective or damaged</span>
      </label>
      <label class="modal-reason-option">
        <input type="radio" name="return_reason" value="Quality not as expected">
        <span class="text-sm">Quality not as expected</span>
      </label>
      <label class="modal-reason-option">
        <input type="radio" name="return_reason" value="Wrong item delivered">
        <span class="text-sm">Wrong item delivered</span>
      </label>

      <div class="form-group mt-4">
        <label class="form-label text-xs font-semibold">Additional Comments (Optional)</label>
        <textarea id="return-comments-input" class="form-control text-xs" rows="2" placeholder="Tell us more about the issue..."></textarea>
      </div>

      <div class="d-flex justify-end gap-3 mt-6">
        <button class="btn btn-secondary btn-sm" id="modal-return-close-btn">Close</button>
        <button class="btn btn-primary btn-sm" id="modal-confirm-return-btn">Submit Request</button>
      </div>
    </div>
  `;

  openModal(modalBody, defaultAction === 'RETURN' ? 'Return Order' : 'Exchange Product');

  let selectedAction = defaultAction;

  const returnTab = document.getElementById('tab-action-return');
  const exchangeTab = document.getElementById('tab-action-exchange');
  const promptText = document.getElementById('action-prompt-text');

  returnTab?.addEventListener('click', () => {
    selectedAction = 'RETURN';
    returnTab.className = 'btn btn-primary flex-1 btn-sm';
    exchangeTab.className = 'btn btn-secondary flex-1 btn-sm';
    if (promptText) promptText.innerHTML = `Select reason for returning items in Order <strong>#${currentOrderData.id}</strong>:`;
  });

  exchangeTab?.addEventListener('click', () => {
    selectedAction = 'EXCHANGE';
    exchangeTab.className = 'btn btn-primary flex-1 btn-sm';
    returnTab.className = 'btn btn-secondary flex-1 btn-sm';
    if (promptText) promptText.innerHTML = `Select reason for exchanging items in Order <strong>#${currentOrderData.id}</strong>:`;
  });

  document.getElementById('modal-return-close-btn')?.addEventListener('click', closeModal);

  document.getElementById('modal-confirm-return-btn')?.addEventListener('click', async () => {
    const selectedRadio = document.querySelector('input[name="return_reason"]:checked');
    const reason = selectedRadio ? selectedRadio.value : 'Customer request';
    const comments = document.getElementById('return-comments-input')?.value.trim() || '';

    const btn = document.getElementById('modal-confirm-return-btn');
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner spinner-sm"></div> Submitting…`;

    try {
      const updatedOrder = await apiFetch(`/orders/${currentOrderData.id}/return`, {
        method: 'POST',
        body: JSON.stringify({ action: selectedAction, reason, comments })
      });

      closeModal();
      showToast(selectedAction === 'RETURN' ? 'Return request submitted successfully!' : 'Exchange request registered successfully!', 'success');
      currentOrderData = updatedOrder;
      renderOrderDetailUI(updatedOrder);
    } catch (err) {
      showToast(err.message || 'Failed to submit request', 'error');
      btn.disabled = false;
      btn.textContent = 'Submit Request';
    }
  });
}
