/**
 * login.js — Login Page
 *
 * Split layout: animated brand panel (left) + login form (right)
 * Features: email/password, forgot password link, redirect by role
 */

import { apiFetch } from '../core/api.js';
import { getState, setState } from '../core/state.js';
import { setView, showToast, updateHeaderUI } from '../core/ui.js';
import { navigate } from '../core/router.js';
import { fetchUserProfile, fetchCart } from '../app.js';

export async function renderLogin() {
  const state = getState();
  if (state.user) { navigate('/'); return; }

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
            <div class="auth-brand-headline">Welcome<br>Back.</div>
            <div class="auth-brand-sub" style="margin-top:16px">
              Sign in to continue your premium shopping experience.
            </div>
          </div>
          <div class="auth-features">
            <div class="auth-feature">
              <div class="auth-feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <span class="auth-feature-text">Bank-grade security on every transaction</span>
            </div>
            <div class="auth-feature">
              <div class="auth-feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
                </svg>
              </div>
              <span class="auth-feature-text">Lightning-fast checkout experience</span>
            </div>
            <div class="auth-feature">
              <div class="auth-feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </div>
              <span class="auth-feature-text">Access to thousands of premium products</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Form Panel -->
      <div class="auth-form-panel">
        <div class="auth-form-box">
          <div class="auth-form-logo">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="url(#g)" stroke-width="2">
              <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient></defs>
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            <span>ApexMarket</span>
          </div>

          <div class="auth-form-title">Sign In</div>
          <div class="auth-form-subtitle">Enter your credentials to access your account.</div>

          <form class="auth-form" id="login-form" novalidate>
            <div class="form-group">
              <label class="form-label" for="login-email">Email Address</label>
              <div class="form-control-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                <input type="email" id="login-email" class="form-control" placeholder="you@example.com" required autocomplete="email">
              </div>
            </div>

            <div class="form-group">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <label class="form-label" for="login-password">Password</label>
                <a href="#/forgot-password" class="auth-footer-link" style="font-size:var(--text-xs)">Forgot password?</a>
              </div>
              <div class="form-control-icon" style="position:relative">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input type="password" id="login-password" class="form-control" placeholder="••••••••" required autocomplete="current-password" style="padding-right:42px">
                <button type="button" id="toggle-pw" aria-label="Toggle password visibility" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-muted);padding:6px;line-height:0;z-index:10;display:flex;align-items:center;justify-content:center">
                  <!-- eye-show icon -->
                  <svg xmlns="http://www.w3.org/2000/svg" id="pw-eye-show" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;display:block">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  <!-- eye-off icon (hidden initially) -->
                  <svg xmlns="http://www.w3.org/2000/svg" id="pw-eye-hide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;display:none">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
              </div>
            </div>

            <button type="submit" id="login-btn" class="btn btn-primary btn-xl w-full" style="margin-top:8px">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              Sign In
            </button>
          </form>

          <div class="auth-footer-text">
            Don't have an account?
            <a href="#/register" class="auth-footer-link">Create one here</a>
          </div>
        </div>
      </div>
    </div>
  `);

  // Password visibility toggle
  document.getElementById('toggle-pw')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const pw      = document.getElementById('login-password');
    const eyeShow = document.getElementById('pw-eye-show');
    const eyeHide = document.getElementById('pw-eye-hide');
    if (!pw) return;

    const isHidden = pw.type === 'password' || pw.getAttribute('type') === 'password' || pw.style.webkitTextSecurity === 'disc';
    if (isHidden) {
      pw.type = 'text';
      pw.setAttribute('type', 'text');
      pw.style.webkitTextSecurity = 'none';
      if (eyeShow) eyeShow.style.display = 'none';
      if (eyeHide) eyeHide.style.display = 'block';
    } else {
      pw.type = 'password';
      pw.setAttribute('type', 'password');
      pw.style.webkitTextSecurity = 'disc';
      if (eyeShow) eyeShow.style.display = 'block';
      if (eyeHide) eyeHide.style.display = 'none';
    }
  });

  // Form submit
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn      = document.getElementById('login-btn');

    if (!email || !password) {
      showToast('Please fill in all fields.', 'warning');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<div class="spinner spinner-sm"></div> Signing in…`;

    try {
      const response = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      // 1. Immediately update state with user details returned directly from login API
      const initialUser = {
        id: response.userId,
        name: response.name,
        email: email,
        role: response.role
      };

      setState({ token: response.token, user: initialUser });
      localStorage.setItem('token', response.token);

      showToast(`Welcome back, ${response.name || 'User'}!`, 'success');
      updateHeaderUI();

      // 2. Navigate immediately based on user role without waiting for background sync
      const targetRoute = response.role === 'VENDOR' 
        ? '/vendor-dashboard' 
        : response.role === 'ADMIN' 
        ? '/admin-dashboard' 
        : '/';
      
      navigate(targetRoute);

      // 3. Sync full profile & cart in parallel in the background
      Promise.all([fetchUserProfile(), fetchCart()]).catch(err => {
        console.warn('Background sync after login non-fatal error:', err);
      });

    } catch (err) {
      showToast(err.message || 'Login failed. Please try again.', 'error');
      btn.disabled = false;
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> Sign In`;
    }
  });
}
