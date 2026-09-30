/**
 * checkout.js — Checkout Page
 *
 * Multi-step checkout with address selection, address insertion, payment selection, and Stripe elements/mock confirmation.
 */

import { apiFetch } from '../core/api.js';
import { getState, setState } from '../core/state.js';
import { setView, formatCurrency, showToast } from '../core/ui.js';
import { navigate } from '../core/router.js';

let checkoutAddresses = [];
let selectedAddressId = null;
let currentStep = 'address'; // 'address', 'payment', 'confirm'

export async function renderCheckout() {
  const state = getState();
  if (!state.cart || (state.cart.items || []).length === 0) {
    showToast('Your cart is empty. Cannot checkout.', 'warning');
    navigate('/cart');
    return;
  }

  currentStep = 'address';
  selectedAddressId = null;

  setView(`
    <div class="page-wrapper">
      <div class="page-container">
        <!-- Progress Steps -->
        <div class="step-progress">
          <div class="step-item">
            <div class="step-circle active" id="step-c-address">1</div>
            <span class="step-label active" id="step-l-address">Address</span>
          </div>
          <div class="step-connector" id="step-conn-payment"></div>
          <div class="step-item">
            <div class="step-circle" id="step-c-payment">2</div>
            <span class="step-label" id="step-l-payment">Payment</span>
          </div>
          <div class="step-connector" id="step-conn-confirm"></div>
          <div class="step-item">
            <div class="step-circle" id="step-c-confirm">3</div>
            <span class="step-label" id="step-l-confirm">Confirm</span>
          </div>
        </div>

        <div class="cart-layout" style="grid-template-columns: 1fr 360px; align-items: start;">
          <!-- Step Outlet -->
          <div id="checkout-step-outlet" class="d-flex flex-col gap-6">
            <div class="page-loading"><div class="spinner"></div>Loading step…</div>
          </div>

          <!-- Summary Sidebar -->
          <aside class="summary-panel">
            <h2 class="summary-panel-title">Order Items</h2>
            <div class="d-flex flex-col gap-3" style="max-height: 240px; overflow-y: auto; margin-bottom: 20px;">
              ${(state.cart.items || []).map(item => `
                <div class="d-flex justify-between text-sm gap-4" style="border-bottom:1px solid var(--border); padding-bottom:8px">
                  <span class="truncate" style="flex:1">${item.productName} (x${item.quantity})</span>
                  <span class="font-semibold">${formatCurrency(item.price * item.quantity)}</span>
                </div>
              `).join('')}
            </div>
            <div class="summary-row">
              <span>Subtotal</span>
              <span>${formatCurrency(state.cart.total)}</span>
            </div>
            <div class="summary-row">
              <span>Shipping</span>
              <span class="text-success">FREE</span>
            </div>
            <div class="summary-total">
              <span>Grand Total</span>
              <span>${formatCurrency(state.cart.total)}</span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  `);

  await loadAddressStep();
}

async function loadAddressStep() {
  currentStep = 'address';
  updateProgressUI();

  const outlet = document.getElementById('checkout-step-outlet');
  if (!outlet) return;

  outlet.innerHTML = `<div class="page-loading"><div class="spinner"></div>Loading saved addresses…</div>`;

  try {
    checkoutAddresses = await apiFetch('/customers/me/addresses');
    
    // Automatically select default address
    const defaultAddr = checkoutAddresses.find(a => a.isDefault || a.defaultAddress);
    if (defaultAddr) selectedAddressId = defaultAddr.id;
    else if (checkoutAddresses.length > 0) selectedAddressId = checkoutAddresses[0].id;

    renderAddressUI();
  } catch (err) {
    showToast('Failed to load saved addresses.', 'error');
    outlet.innerHTML = `<div class="text-danger">Could not retrieve shipping details. Please try refreshing.</div>`;
  }
}

function renderAddressUI() {
  const outlet = document.getElementById('checkout-step-outlet');
  if (!outlet) return;

  outlet.innerHTML = `
    <h2 class="section-title mb-2">Select Shipping Address</h2>
    <p class="text-muted mb-4">Choose a saved address or add a new one.</p>

    <div class="d-grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))" id="addresses-grid">
      ${checkoutAddresses.length === 0 
        ? `<div class="text-muted p-4" style="grid-column:1/-1">No saved addresses yet.</div>`
        : checkoutAddresses.map(addr => `
            <div class="address-card ${selectedAddressId === addr.id ? 'selected' : ''}" data-id="${addr.id}">
              ${(addr.isDefault || addr.defaultAddress) ? `<span class="badge badge-success default-pill">Default</span>` : ''}
              <div class="address-card-name">${addr.name}</div>
              <div class="address-card-line">${addr.line1}</div>
              ${addr.line2 ? `<div class="address-card-line">${addr.line2}</div>` : ''}
              <div class="address-card-line">${addr.city}, ${addr.state} - ${addr.zip}</div>
              <div class="address-card-line" style="margin-top:8px">Phone: ${addr.phone}</div>
            </div>
          `).join('')
      }
    </div>

    <!-- Toggle add new address -->
    <button class="btn btn-outline w-fit mt-4" id="toggle-add-addr-btn">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Add New Address
    </button>

    <div id="new-address-form-container" class="card p-6 mt-4 d-none">
      <h3 class="mb-4">New Address</h3>
      <form class="d-flex flex-col gap-4" id="checkout-add-address-form">
        <div class="d-grid gap-4" style="grid-template-columns: 1fr 1fr">
          <div class="form-group">
            <label class="form-label" for="addr-name">Receiver Name</label>
            <input type="text" id="addr-name" class="form-control" placeholder="John Doe" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="addr-phone">Phone Number</label>
            <input type="tel" id="addr-phone" class="form-control" placeholder="9999999999" required>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="addr-line1">Address Line 1</label>
          <input type="text" id="addr-line1" class="form-control" placeholder="Flat No / House No / Street Name" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="addr-line2">Address Line 2 (Optional)</label>
          <input type="text" id="addr-line2" class="form-control" placeholder="Landmark / Area">
        </div>
        <div class="d-grid gap-4" style="grid-template-columns: 1fr 1fr 1fr">
          <div class="form-group">
            <label class="form-label" for="addr-city">City</label>
            <input type="text" id="addr-city" class="form-control" placeholder="City" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="addr-state">State</label>
            <input type="text" id="addr-state" class="form-control" placeholder="State" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="addr-zip">ZIP / Postal Code</label>
            <input type="text" id="addr-zip" class="form-control" placeholder="ZIP" required>
          </div>
        </div>
        <button type="submit" class="btn btn-secondary w-fit" id="save-addr-btn">Save Address</button>
      </form>
    </div>

    <div class="divider"></div>

    <button class="btn btn-primary btn-lg w-fit justify-end" id="addr-continue-btn" ${!selectedAddressId ? 'disabled' : ''}>
      Continue to Payment
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
  `;

  // Address selection event
  document.querySelectorAll('#addresses-grid .address-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#addresses-grid .address-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedAddressId = parseInt(card.dataset.id);
      document.getElementById('addr-continue-btn').disabled = false;
    });
  });

  // Toggle add form
  const toggleBtn = document.getElementById('toggle-add-addr-btn');
  const formContainer = document.getElementById('new-address-form-container');
  toggleBtn?.addEventListener('click', () => {
    formContainer.classList.toggle('d-none');
  });

  // Save new address
  document.getElementById('checkout-add-address-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('save-addr-btn');
    const name = document.getElementById('addr-name').value.trim();
    const phone = document.getElementById('addr-phone').value.trim();
    const line1 = document.getElementById('addr-line1').value.trim();
    const line2 = document.getElementById('addr-line2').value.trim();
    const city = document.getElementById('addr-city').value.trim();
    const state = document.getElementById('addr-state').value.trim();
    const zip = document.getElementById('addr-zip').value.trim();

    saveBtn.disabled = true;
    saveBtn.innerHTML = `<div class="spinner spinner-sm"></div> Saving…`;

    try {
      const added = await apiFetch('/customers/me/addresses', {
        method: 'POST',
        body: JSON.stringify({ name, phone, line1, line2, city, state, zip })
      });
      showToast('Address added!', 'success');
      checkoutAddresses.push(added);
      selectedAddressId = added.id;
      renderAddressUI();
    } catch (err) {
      showToast(err.message || 'Failed to save address.', 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Address';
    }
  });

  // Continue to Payment
  document.getElementById('addr-continue-btn')?.addEventListener('click', () => {
    if (!selectedAddressId) return;
    loadPaymentStep();
  });
}

function loadPaymentStep() {
  currentStep = 'payment';
  updateProgressUI();

  const outlet = document.getElementById('checkout-step-outlet');
  if (!outlet) return;

  outlet.innerHTML = `
    <h2 class="section-title mb-2">Select Payment Method</h2>
    <p class="text-muted mb-6">Choose how you would like to pay for your order.</p>

    <div class="d-flex flex-col gap-4">
      <label class="address-card d-flex items-center gap-4 selected" style="cursor:pointer; width:100%" id="pay-opt-mock">
        <input type="radio" name="payment-method-radio" value="MOCK" checked style="width:18px;height:18px">
        <div>
          <div class="font-semibold text-sm">Simulate Mock Payment</div>
          <div class="text-xs text-muted">Test order processing immediately without actual charge.</div>
        </div>
      </label>
      
      <label class="address-card d-flex items-center gap-4" style="cursor:pointer; width:100%" id="pay-opt-stripe">
        <input type="radio" name="payment-method-radio" value="STRIPE" style="width:18px;height:18px">
        <div>
          <div class="font-semibold text-sm">Pay with Card (Stripe Sandbox)</div>
          <div class="text-xs text-muted">Securely process payments in Stripe test mode.</div>
        </div>
      </label>
    </div>

    <!-- Stripe Card Elements container (split fields for clear visibility) -->
    <div id="stripe-card-container" class="card p-6 mt-6 d-none" style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg);">
      <h3 class="font-semibold text-base mb-4 d-flex items-center gap-2" style="color:var(--text-primary)">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;color:var(--primary)"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
        Credit or Debit Card Details
      </h3>

      <div class="d-flex flex-col gap-4">
        <div class="form-group">
          <label class="form-label mb-2" style="display:block; font-weight:500; font-size:13px; color:var(--text-secondary)">Card Number</label>
          <div id="stripe-card-number" style="background:var(--bg-input); padding: 12px 14px; border: 1px solid var(--border); border-radius: var(--radius-md); min-height: 44px;"></div>
        </div>

        <div class="d-grid gap-4" style="grid-template-columns: 1fr 1fr;">
          <div class="form-group">
            <label class="form-label mb-2" style="display:block; font-weight:500; font-size:13px; color:var(--text-secondary)">Expiration Date (MM/YY)</label>
            <div id="stripe-card-expiry" style="background:var(--bg-input); padding: 12px 14px; border: 1px solid var(--border); border-radius: var(--radius-md); min-height: 44px;"></div>
          </div>
          <div class="form-group">
            <label class="form-label mb-2" style="display:block; font-weight:500; font-size:13px; color:var(--text-secondary)">CVC / CVV Code</label>
            <div id="stripe-card-cvc" style="background:var(--bg-input); padding: 12px 14px; border: 1px solid var(--border); border-radius: var(--radius-md); min-height: 44px;"></div>
          </div>
        </div>
      </div>

      <div class="form-error mt-3 d-none" id="stripe-error-msg" style="color:var(--danger); font-size:var(--text-xs); padding:6px 10px; background:rgba(239,68,68,0.1); border-radius:4px; border:1px solid rgba(239,68,68,0.2)"></div>
    </div>

    <div class="divider"></div>

    <div class="d-flex gap-4">
      <button class="btn btn-secondary" id="payment-back-btn">Back</button>
      <button class="btn btn-primary btn-lg flex-1" id="payment-continue-btn">Complete Purchase</button>
    </div>
  `;

  // Option toggling & Stripe lazy initialization
  const mockOpt = document.getElementById('pay-opt-mock');
  const stripeOpt = document.getElementById('pay-opt-stripe');
  const stripeContainer = document.getElementById('stripe-card-container');
  const radios = document.querySelectorAll('input[name="payment-method-radio"]');

  // Stripe elements initialisation with split fields (Card Number, Expiry, CVC)
  let stripe = null;
  let elements = null;
  let cardNumberElement = null;
  let cardExpiryElement = null;
  let cardCvcElement = null;
  let stripeInitialized = false;
  let activePendingOrder = null;

  const initStripe = () => {
    if (window.Stripe && !stripeInitialized) {
      try {
        stripe = Stripe('pk_test_51U4xyTRxeftvGbvOhlgn0F0W9Zn1V7xI3PI0XYMdkVa4XqogLe6JUQct13twsCaOEOvQPzEXQhIwMg6evttJMceE00pSyMEcXz');
        elements = stripe.elements();

        const style = {
          base: {
            color: '#f0f0fa',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '15px',
            '::placeholder': { color: '#8080a0' }
          },
          invalid: {
            color: '#ef4444',
            iconColor: '#ef4444'
          }
        };

        cardNumberElement = elements.create('cardNumber', { style, showIcon: true });
        cardNumberElement.mount('#stripe-card-number');

        cardExpiryElement = elements.create('cardExpiry', { style });
        cardExpiryElement.mount('#stripe-card-expiry');

        cardCvcElement = elements.create('cardCvc', { style });
        cardCvcElement.mount('#stripe-card-cvc');

        const handleError = (event) => {
          const errorEl = document.getElementById('stripe-error-msg');
          if (errorEl) {
            if (event.error) {
              errorEl.textContent = event.error.message;
              errorEl.classList.remove('d-none');
            } else {
              errorEl.textContent = '';
              errorEl.classList.add('d-none');
            }
          }
        };

        cardNumberElement.on('change', handleError);
        cardExpiryElement.on('change', handleError);
        cardCvcElement.on('change', handleError);

        // Auto-focus when clicking anywhere inside the field wrappers
        document.getElementById('stripe-card-number')?.parentElement?.addEventListener('click', () => cardNumberElement?.focus());
        document.getElementById('stripe-card-expiry')?.parentElement?.addEventListener('click', () => cardExpiryElement?.focus());
        document.getElementById('stripe-card-cvc')?.parentElement?.addEventListener('click', () => cardCvcElement?.focus());

        stripeInitialized = true;
      } catch (err) {
        console.warn('Could not initialise Stripe card elements:', err);
      }
    }
  };

  const updateSelectedPaymentMethod = () => {
    let method = 'MOCK';
    radios.forEach(r => { if(r.checked) method = r.value; });

    mockOpt.classList.remove('selected');
    stripeOpt.classList.remove('selected');

    if (method === 'STRIPE') {
      stripeOpt.classList.add('selected');
      stripeContainer.classList.remove('d-none');
      // Mount Stripe elements when container is visible in DOM
      setTimeout(initStripe, 60);
    } else {
      mockOpt.classList.add('selected');
      stripeContainer.classList.add('d-none');
    }
  };

  radios.forEach(r => {
    r.addEventListener('change', updateSelectedPaymentMethod);
  });

  // Card wrappers click to trigger selection
  mockOpt.addEventListener('click', (e) => {
    const radio = mockOpt.querySelector('input[type="radio"]');
    if (radio && e.target !== radio) {
      radio.checked = true;
      updateSelectedPaymentMethod();
    }
  });

  stripeOpt.addEventListener('click', (e) => {
    const radio = stripeOpt.querySelector('input[type="radio"]');
    if (radio && e.target !== radio) {
      radio.checked = true;
      updateSelectedPaymentMethod();
    }
  });

  // Back button
  document.getElementById('payment-back-btn').addEventListener('click', loadAddressStep);

  // Complete Purchase
  document.getElementById('payment-continue-btn').addEventListener('click', async () => {
    let method = 'MOCK';
    radios.forEach(r => { if(r.checked) method = r.value; });

    const btn = document.getElementById('payment-continue-btn');
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner spinner-sm"></div> Processing order…`;

    const state = getState();
    const addr = checkoutAddresses.find(a => a.id === selectedAddressId);
    const shippingStr = `${addr.name}, ${addr.line1}, ${addr.line2 ? addr.line2 + ', ' : ''}${addr.city}, ${addr.state} - ${addr.zip}. Phone: ${addr.phone}`;

    try {
      let orderRes = activePendingOrder;
      
      // If no order created yet for this session, place order in order-service
      if (!orderRes) {
        orderRes = await apiFetch('/orders', {
          method: 'POST',
          body: JSON.stringify({
            shippingAddress: shippingStr,
            paymentMethod: method,
            customerEmail: state.user?.email || state.user?.username || '',
            customerName: state.user?.name || state.user?.username || 'Customer'
          })
        });

        if (method === 'STRIPE') {
          activePendingOrder = orderRes;
        }
      }

      if (method === 'STRIPE' && orderRes.clientSecret && stripe) {
        btn.innerHTML = `<div class="spinner spinner-sm"></div> Confirming Stripe payment…`;
        
        // Confirm Stripe Payment using cardNumberElement
        const result = await stripe.confirmCardPayment(orderRes.clientSecret, {
          payment_method: {
            card: cardNumberElement,
            billing_details: {
              name: state.user?.name || 'Customer',
              email: state.user?.email || ''
            }
          }
        });

        if (result.error) {
          showToast(result.error.message || 'Payment confirmation failed.', 'error');
          btn.disabled = false;
          btn.textContent = 'Complete Purchase';
          const errorEl = document.getElementById('stripe-error-msg');
          if (errorEl) {
            errorEl.textContent = result.error.message;
            errorEl.classList.remove('d-none');
          }
          return;
        }

        // Update status to PROCESSING to confirm order and trigger confirmation email
        try {
          await apiFetch(`/orders/${orderRes.id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'PROCESSING' })
          });
        } catch (statusErr) {
          console.warn('Could not update order status via API:', statusErr);
        }
      }

      // Success — clear state cart and pending order
      activePendingOrder = null;
      setState({ cart: { items: [], total: 0 } });
      
      loadConfirmStep(orderRes.id);

    } catch (err) {
      showToast(err.message || 'Failed to place order.', 'error');
      btn.disabled = false;
      btn.textContent = 'Complete Purchase';
    }
  });
}

function loadConfirmStep(orderId) {
  currentStep = 'confirm';
  updateProgressUI();

  const outlet = document.getElementById('checkout-step-outlet');
  if (!outlet) return;

  outlet.innerHTML = `
    <div style="text-align:center; padding: 48px var(--space-4)">
      <div class="empty-state-icon mx-auto success-icon" style="background:var(--success-bg); border-color:rgba(16,185,129,0.3); width:80px; height:80px; margin-bottom:24px">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" style="width:40px; height:40px">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <h2 class="section-title mb-2">Order Confirmed!</h2>
      <p class="text-muted mb-6">Thank you for your purchase. Your order ID is <strong>#${orderId}</strong>.</p>
      <p class="text-secondary text-sm mb-8" style="max-width:440px; margin-left:auto; margin-right:auto; line-height:1.6">
        A confirmation email was sent to your inbox. You can track this order's processing status at any time in your profile dashboard.
      </p>
      <div class="d-flex gap-4 justify-center">
        <a href="#/orders" class="btn btn-primary">Track My Orders</a>
        <a href="#/" class="btn btn-secondary">Continue Shopping</a>
      </div>
    </div>
  `;
}

function updateProgressUI() {
  const steps = ['address', 'payment', 'confirm'];
  const curIdx = steps.indexOf(currentStep);

  steps.forEach((step, idx) => {
    const circle = document.getElementById(`step-c-${step}`);
    const label = document.getElementById(`step-l-${step}`);
    if (!circle || !label) return;

    circle.className = 'step-circle';
    label.className = 'step-label';

    if (idx < curIdx) {
      circle.classList.add('done');
      circle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:14px;height:14px"><polyline points="20 6 9 17 4 12"/></svg>`;
      const conn = document.getElementById(`step-conn-${steps[idx + 1]}`);
      if (conn) conn.classList.add('done');
    } else if (idx === curIdx) {
      circle.classList.add('active');
      circle.textContent = idx + 1;
      label.classList.add('active');
      const conn = document.getElementById(`step-conn-${steps[idx + 1]}`);
      if (conn) conn.classList.remove('done');
    } else {
      circle.textContent = idx + 1;
      const conn = document.getElementById(`step-conn-${step}`);
      if (conn) conn.classList.remove('done');
    }
  });
}
