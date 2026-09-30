/**
 * cart.js — Shopping Cart Page
 *
 * Fully aligned with actual Cart API response:
 *   GET/POST /api/cart  -> { cartId, userId, items: [{ itemId, productId, productName, productImage, price, quantity, lineTotal, stockQuantity, available }], subtotal, itemCount }
 *   PUT /api/cart/items/{itemId}  -> { quantity }
 *   DELETE /api/cart/items/{itemId}
 */

import { apiFetch } from '../core/api.js';
import { getState, setState } from '../core/state.js';
import { setView, formatCurrency, updateCartBadge, showToast } from '../core/ui.js';
import { navigate } from '../core/router.js';

export async function renderCart() {
  const state = getState();

  // Always load fresh cart from backend if logged in
  if (state.token) {
    try {
      const fresh = await apiFetch('/cart');
      setState({ cart: fresh });
    } catch (e) {
      console.warn('Could not refresh cart:', e);
    }
  }

  const updatedState = getState();
  const cartData  = updatedState.cart || {};
  const cartItems = cartData.items || [];
  const cartTotal = cartData.subtotal ?? cartData.total ?? 0;

  setView(`
    <div class="page-wrapper">
      <div class="page-container">
        <h1 class="section-title mb-6">Shopping Cart</h1>
        <div class="cart-layout" id="cart-container-inner">

          <!-- Cart Items List -->
          <div class="d-flex flex-col gap-4" id="cart-items-wrapper">
            ${cartItems.length === 0
              ? `<div class="empty-state card p-8">
                   <div class="empty-state-icon mx-auto">
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                       <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                     </svg>
                   </div>
                   <div class="empty-state-title">Your cart is empty</div>
                   <div class="empty-state-desc">Looks like you haven't added anything to your cart yet.</div>
                   <a href="#/catalog" class="btn btn-primary mt-6">Shop Catalog</a>
                 </div>`
              : cartItems.map(item => {
                  // API uses: itemId, productImage, productName, price, quantity, lineTotal
                  const image = item.productImage || item.productImageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';
                  const itemTotal = item.lineTotal ?? (item.price * item.quantity);
                  const qty = item.quantity || 1;
                  const id = item.itemId ?? item.id;
                  return `
                    <div class="cart-item fade-in" data-item-id="${id}">
                      <img src="${image}" alt="${item.productName}" class="cart-item-img"
                           onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'">
                      <div class="cart-item-info">
                        <div class="cart-item-name">${item.productName}</div>
                        <div class="cart-item-vendor" style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:8px">
                          Unit price: ${formatCurrency(item.price)}
                        </div>
                        <div class="cart-item-bottom">
                          <div class="qty-stepper">
                            <button class="qty-btn qty-minus-btn" data-item-id="${id}" data-qty="${qty}" ${qty <= 1 ? 'disabled style="opacity:0.4"' : ''}>-</button>
                            <div class="qty-value">${qty}</div>
                            <button class="qty-btn qty-plus-btn" data-item-id="${id}" data-qty="${qty}">+</button>
                          </div>
                          <button class="remove-btn remove-cart-item-btn" data-item-id="${id}" style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid var(--danger);color:var(--danger);background:transparent;border-radius:8px;cursor:pointer;font-size:var(--text-sm);transition:background 0.2s;">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                            </svg>
                            Remove
                          </button>
                        </div>
                      </div>
                      <div class="cart-item-price ml-auto" style="min-width:90px;text-align:right">${formatCurrency(itemTotal)}</div>
                    </div>
                  `;
                }).join('')
            }
          </div>

          <!-- Checkout Panel -->
          ${cartItems.length === 0 ? '' : `
            <aside class="summary-panel">
              <h2 class="summary-panel-title">Order Summary</h2>
              <div class="summary-row">
                <span>Subtotal (${cartData.itemCount || cartItems.length} item${(cartData.itemCount || cartItems.length) !== 1 ? 's' : ''})</span>
                <span>${formatCurrency(cartTotal)}</span>
              </div>
              <div class="summary-row">
                <span>Shipping</span>
                <span class="text-success">FREE</span>
              </div>
              <div class="summary-row">
                <span>Tax (GST)</span>
                <span>Calculated at checkout</span>
              </div>
              <div class="summary-total">
                <span>Total</span>
                <span>${formatCurrency(cartTotal)}</span>
              </div>
              <button class="btn btn-primary w-full btn-lg mt-6" id="checkout-proceed-btn">Proceed to Checkout</button>
            </aside>
          `}
        </div>
      </div>
    </div>
  `);

  setupCartListeners();
}

function setupCartListeners() {
  // Plus button
  document.querySelectorAll('.qty-plus-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const itemId = btn.dataset.itemId;
      const currentQty = parseInt(btn.dataset.qty, 10);
      btn.disabled = true;
      await updateItemQuantity(itemId, currentQty + 1);
    });
  });

  // Minus button
  document.querySelectorAll('.qty-minus-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const itemId = btn.dataset.itemId;
      const currentQty = parseInt(btn.dataset.qty, 10);
      if (currentQty > 1) {
        btn.disabled = true;
        await updateItemQuantity(itemId, currentQty - 1);
      }
    });
  });

  // Remove button
  document.querySelectorAll('.remove-cart-item-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const itemId = btn.dataset.itemId;
      btn.disabled = true;
      btn.style.opacity = '0.5';
      await removeCartItem(itemId);
    });
  });

  // Proceed to Checkout
  document.getElementById('checkout-proceed-btn')?.addEventListener('click', () => {
    navigate('/checkout');
  });
}

/** Global helper to add a product to the cart */
export async function addToCart(productId, quantity = 1) {
  const state = getState();
  if (!state.token) {
    showToast('Please sign in to add items to your cart.', 'info');
    navigate('/login');
    return;
  }

  try {
    const updatedCart = await apiFetch('/cart', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity })
    });

    setState({ cart: updatedCart });
    updateCartBadge();
    showToast('Added to cart!', 'success');
  } catch (err) {
    showToast(err.message || 'Could not add product to cart.', 'error');
  }
}

/** Update item quantity in cart */
async function updateItemQuantity(itemId, quantity) {
  try {
    const updatedCart = await apiFetch(`/cart/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity })
    });
    setState({ cart: updatedCart });
    updateCartBadge();
    renderCart();
  } catch (err) {
    showToast(err.message || 'Failed to update quantity.', 'error');
    renderCart(); // re-render to restore button state
  }
}

/** Remove item from cart */
async function removeCartItem(itemId) {
  try {
    const updatedCart = await apiFetch(`/cart/items/${itemId}`, {
      method: 'DELETE'
    });
    // DELETE may return null (204) or updated cart
    if (updatedCart) {
      setState({ cart: updatedCart });
    } else {
      // Refresh cart manually
      const fresh = await apiFetch('/cart');
      setState({ cart: fresh });
    }
    updateCartBadge();
    showToast('Item removed from cart.', 'info');
    renderCart();
  } catch (err) {
    showToast(err.message || 'Failed to remove item.', 'error');
    renderCart();
  }
}
