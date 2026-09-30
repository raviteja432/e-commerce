/**
 * register.js — Registration Page
 *
 * Support for Customer and Vendor registration with role selection cards
 */

import { apiFetch } from '../core/api.js';
import { getState } from '../core/state.js';
import { setView, showToast } from '../core/ui.js';
import { navigate } from '../core/router.js';

export function renderRegister() {
  const state = getState();
  if (state.user) { navigate('/'); return; }

  let selectedRole = 'CUSTOMER'; // Default role

  const updateFormView = () => {
    const vendorFields = document.getElementById('vendor-fields-container');
    const roleCards = document.querySelectorAll('.role-card');
    
    roleCards.forEach(card => {
      card.classList.remove('selected-customer', 'selected-vendor');
      if (card.dataset.role === selectedRole) {
        if (selectedRole === 'CUSTOMER') {
          card.classList.add('selected-customer');
        } else {
          card.classList.add('selected-vendor');
        }
      }
    });

    if (selectedRole === 'VENDOR') {
      vendorFields?.classList.remove('d-none');
      document.getElementById('reg-shop-name').required = true;
      document.getElementById('reg-biz-phone').required = false;
      document.getElementById('reg-biz-address').required = false;
      document.getElementById('reg-pan').required = false;
      document.getElementById('reg-bank-name').required = false;
      document.getElementById('reg-bank-acc').required = false;
      document.getElementById('reg-bank-ifsc').required = false;
    } else {
      vendorFields?.classList.add('d-none');
      document.getElementById('reg-shop-name').required = false;
      document.getElementById('reg-biz-phone').required = false;
      document.getElementById('reg-biz-address').required = false;
      document.getElementById('reg-pan').required = false;
      document.getElementById('reg-bank-name').required = false;
      document.getElementById('reg-bank-acc').required = false;
      document.getElementById('reg-bank-ifsc').required = false;
    }
  };

  setView(`
    <div class="auth-layout">
      <!-- Brand Panel -->
      <div class="auth-brand-panel">
        <div class="auth-brand-bg"></div>
        <div class="auth-brand-grid"></div>
        <div class="auth-brand-content">
          <div class="auth-brand-logo">
            <div class="auth-brand-logo-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </div>
            <span class="auth-brand-logo-text">ApexMarket</span>
          </div>
          <div>
            <div class="auth-brand-headline">Join Our<br>Community.</div>
            <div class="auth-brand-sub" style="margin-top:16px">
              Create an account as a buyer or a seller to access premium features.
            </div>
          </div>
          <div class="auth-features">
            <div class="auth-feature">
              <div class="auth-feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <span class="auth-feature-text">Simple and secure account setup</span>
            </div>
            <div class="auth-feature">
              <div class="auth-feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <span class="auth-feature-text">Bank details encrypted with AES-256 at rest</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Form Panel -->
      <div class="auth-form-panel">
        <div class="auth-form-box">
          <div class="auth-form-logo">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="url(#g3)" stroke-width="2">
              <defs><linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient></defs>
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
            <span>Register</span>
          </div>

          <div class="auth-form-title">Create Account</div>
          <div class="auth-form-subtitle">Choose your role and enter your details below.</div>

          <div class="role-picker mb-6">
            <div class="role-card selected-customer" data-role="CUSTOMER">
              <div class="role-card-icon" style="background:var(--primary-glow);color:var(--primary-light)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div class="role-card-name">Customer</div>
              <div class="role-card-desc">Browse & buy premium products</div>
            </div>
            <div class="role-card" data-role="VENDOR">
              <div class="role-card-icon" style="background:var(--vendor-glow);color:var(--vendor-primary)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 3h18v18H3z"/><path d="M21 9H3"/><path d="M21 15H3"/><path d="M12 3v18"/>
                </svg>
              </div>
              <div class="role-card-name">Vendor</div>
              <div class="role-card-desc">Sell goods & manage your shop</div>
            </div>
          </div>

          <form class="auth-form" id="register-form" novalidate>
            <div class="form-group">
              <label class="form-label" for="reg-name">Full Name</label>
              <div class="form-control-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <input type="text" id="reg-name" class="form-control" placeholder="John Doe" required autocomplete="name">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="reg-email">Email Address</label>
              <div class="form-control-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                <input type="email" id="reg-email" class="form-control" placeholder="john@example.com" required autocomplete="email">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="reg-password">Password (Min 8 characters)</label>
              <div class="form-control-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input type="password" id="reg-password" class="form-control" placeholder="••••••••" required autocomplete="new-password" style="padding-right:42px">
                <button type="button" id="toggle-reg-pw" aria-label="Toggle password visibility" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-muted);padding:6px;line-height:0;z-index:10;display:flex;align-items:center;justify-content:center">
                  <svg xmlns="http://www.w3.org/2000/svg" id="reg-pw-eye-show" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;display:block">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg xmlns="http://www.w3.org/2000/svg" id="reg-pw-eye-hide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;display:none">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="reg-phone">Phone Number *</label>
              <div class="form-control-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                <input type="tel" id="reg-phone" class="form-control" placeholder="+91 99999 99999" required autocomplete="tel">
              </div>
            </div>

            <!-- Vendor Fields container -->
            <div id="vendor-fields-container" class="d-none">
              <div class="p-4 mb-4" style="background: rgba(124, 58, 237, 0.08); border-radius: var(--radius-md); border: 1px solid rgba(124, 58, 237, 0.2);">
                <div style="font-weight: 600; color: var(--vendor-primary); font-size: var(--text-sm); margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Vendor Account Setup
                </div>
                <div style="font-size: var(--text-xs); color: var(--text-muted);">
                  Store name is required. Business & banking details are optional and can be updated later.
                </div>
              </div>

              <div class="form-group mb-4">
                <label class="form-label" for="reg-shop-name">Store / Shop Name *</label>
                <input type="text" id="reg-shop-name" class="form-control" placeholder="e.g. Apex Tech Store">
              </div>

              <div class="form-group mb-4">
                <label class="form-label" for="reg-shop-desc">Shop Description (Optional)</label>
                <textarea id="reg-shop-desc" class="form-control" placeholder="Describe your store and products..."></textarea>
              </div>

              <div class="form-group mb-4">
                <label class="form-label" for="reg-biz-phone">Business Phone Number (Optional)</label>
                <input type="tel" id="reg-biz-phone" class="form-control" placeholder="+91 98765 43210">
              </div>

              <div class="form-group mb-4">
                <label class="form-label" for="reg-biz-address">Business Address (Optional)</label>
                <textarea id="reg-biz-address" class="form-control" placeholder="Full street address, city, state, postal code"></textarea>
              </div>

              <div class="d-grid gap-4 mb-4" style="grid-template-columns: 1fr 1fr;">
                <div class="form-group">
                  <label class="form-label" for="reg-pan">PAN Number (Optional)</label>
                  <input type="text" id="reg-pan" class="form-control" placeholder="ABCDE1234F" style="text-transform:uppercase" maxlength="10">
                </div>
                <div class="form-group">
                  <label class="form-label" for="reg-gstin">GSTIN (Optional)</label>
                  <input type="text" id="reg-gstin" class="form-control" placeholder="22AAAAA0000A1Z5" style="text-transform:uppercase" maxlength="15">
                </div>
              </div>

              <div class="form-group mb-4">
                <label class="form-label" for="reg-bank-name">Bank Account Holder Name (Optional)</label>
                <input type="text" id="reg-bank-name" class="form-control" placeholder="Name as per Bank Account">
              </div>

              <div class="d-grid gap-4 mb-4" style="grid-template-columns: 1fr 1fr;">
                <div class="form-group">
                  <label class="form-label" for="reg-bank-acc">Bank Account Number (Optional)</label>
                  <input type="password" id="reg-bank-acc" class="form-control" placeholder="Account Number">
                </div>
                <div class="form-group">
                  <label class="form-label" for="reg-bank-ifsc">IFSC Code (Optional)</label>
                  <input type="text" id="reg-bank-ifsc" class="form-control" placeholder="SBIN0001234" style="text-transform:uppercase" maxlength="11">
                </div>
              </div>
            </div>

            <button type="submit" id="register-btn" class="btn btn-primary btn-xl w-full" style="margin-top:8px">
              Register Account
            </button>
          </form>

          <div class="auth-footer-text">
            Already have an account?
            <a href="#/login" class="auth-footer-link">Sign In</a>
          </div>
        </div>
      </div>
    </div>
  `);

  // Setup Event Listeners for role picker cards
  document.querySelectorAll('.role-card').forEach(card => {
    card.addEventListener('click', () => {
      selectedRole = card.dataset.role;
      updateFormView();
    });
  });

  document.getElementById('toggle-reg-pw')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const pw      = document.getElementById('reg-password');
    const eyeShow = document.getElementById('reg-pw-eye-show');
    const eyeHide = document.getElementById('reg-pw-eye-hide');
    if (!pw) return;

    const isHidden = pw.type === 'password' || pw.getAttribute('type') === 'password';
    if (isHidden) {
      pw.type = 'text';
      pw.setAttribute('type', 'text');
      if (eyeShow) eyeShow.style.display = 'none';
      if (eyeHide) eyeHide.style.display = 'block';
    } else {
      pw.type = 'password';
      pw.setAttribute('type', 'password');
      if (eyeShow) eyeShow.style.display = 'block';
      if (eyeHide) eyeHide.style.display = 'none';
    }
  });

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const phone = document.getElementById('reg-phone').value.trim();
    const btn = document.getElementById('register-btn');

    if (!name || !email || !password || !phone) {
      showToast('Please fill in all required fields.', 'warning');
      return;
    }

    if (password.length < 8) {
      showToast('Password must be at least 8 characters.', 'warning');
      return;
    }

    const payload = {
      name,
      email,
      password,
      role: selectedRole,
      phone: phone || null
    };

    if (selectedRole === 'VENDOR') {
      const storeName = document.getElementById('reg-shop-name').value.trim();
      const businessPhone = document.getElementById('reg-biz-phone').value.trim();
      const businessAddress = document.getElementById('reg-biz-address').value.trim();
      const panNumber = document.getElementById('reg-pan').value.trim().toUpperCase();
      const bankAccountName = document.getElementById('reg-bank-name').value.trim();
      const bankAccountNumber = document.getElementById('reg-bank-acc').value.trim();
      const bankIfscCode = document.getElementById('reg-bank-ifsc').value.trim().toUpperCase();

      if (!storeName) {
        showToast('Please enter your store / shop name.', 'warning');
        return;
      }

      // PAN Regex check (optional)
      if (panNumber) {
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        if (!panRegex.test(panNumber)) {
          showToast('Invalid PAN format. Must be 10 chars e.g. ABCDE1234F', 'warning');
          return;
        }
      }

      // IFSC Regex check (optional)
      if (bankIfscCode) {
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (!ifscRegex.test(bankIfscCode)) {
          showToast('Invalid IFSC format e.g. SBIN0001234', 'warning');
          return;
        }
      }

      payload.storeName = storeName;
      payload.storeDescription = document.getElementById('reg-shop-desc').value.trim() || null;
      payload.businessPhone = businessPhone || null;
      payload.businessAddress = businessAddress || null;
      payload.gstin = document.getElementById('reg-gstin').value.trim().toUpperCase() || null;
      payload.panNumber = panNumber || null;
      payload.bankAccountName = bankAccountName || null;
      payload.bankAccountNumber = bankAccountNumber || null;
      payload.bankIfscCode = bankIfscCode || null;
    }

    btn.disabled = true;
    btn.innerHTML = `<div class="spinner spinner-sm"></div> Creating account…`;

    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      showToast('Registration successful! Please login.', 'success');
      navigate('/login');
    } catch (err) {
      showToast(err.message || 'Registration failed.', 'error');
      btn.disabled = false;
      btn.innerHTML = 'Register Account';
    }
  });
}
