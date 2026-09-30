/**
 * forgot-password.js — Forgot Password & Reset Password Pages
 */

import { apiFetch } from '../core/api.js';
import { setView, showToast } from '../core/ui.js';
import { navigate } from '../core/router.js';

export function renderForgotPassword() {
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
            <div class="auth-brand-headline">Forgot<br>Your Password?</div>
            <div class="auth-brand-sub" style="margin-top:16px">
              No worries! Enter your email and we'll send you a secure link to reset your password.
            </div>
          </div>
          <div class="auth-features">
            <div class="auth-feature">
              <div class="auth-feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <span class="auth-feature-text">Reset link sent to your registered email</span>
            </div>
            <div class="auth-feature">
              <div class="auth-feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <span class="auth-feature-text">Link expires in 15 minutes for security</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Form Panel -->
      <div class="auth-form-panel">
        <div class="auth-form-box">
          <div class="auth-form-logo">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="url(#g2)" stroke-width="2">
              <defs><linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient></defs>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>Reset Password</span>
          </div>

          <div class="auth-form-title">Forgot Password</div>
          <div class="auth-form-subtitle">We'll send a reset link to your registered email address.</div>

          <!-- Initial form -->
          <div id="forgot-form-wrap">
            <form class="auth-form" id="forgot-form" novalidate>
              <div class="form-group">
                <label class="form-label" for="forgot-email">Email Address</label>
                <div class="form-control-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <input type="email" id="forgot-email" class="form-control" placeholder="you@example.com" required autocomplete="email">
                </div>
              </div>
              <button type="submit" id="forgot-btn" class="btn btn-primary btn-xl w-full" style="margin-top:8px">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                Send Reset Link
              </button>
            </form>
          </div>

          <!-- Success state (hidden initially) -->
          <div id="forgot-success" class="d-none" style="text-align:center;padding:var(--space-8) 0">
            <div style="width:72px;height:72px;border-radius:50%;background:var(--success-bg);border:1px solid rgba(16,185,129,0.3);display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-5)">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" style="width:36px;height:36px">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div style="font-size:var(--text-xl);font-weight:700;margin-bottom:var(--space-3)">Check your inbox!</div>
            <div style="font-size:var(--text-sm);color:var(--text-muted);line-height:1.7;margin-bottom:var(--space-8)" id="forgot-email-sent-msg">
              We've sent a password reset link to your email.
              The link expires in 15 minutes.
            </div>
            <a href="#/login" class="btn btn-secondary w-full">Back to Sign In</a>
          </div>

          <div class="auth-footer-text" id="forgot-back-link">
            Remember your password?
            <a href="#/login" class="auth-footer-link">Sign In</a>
          </div>
        </div>
      </div>
    </div>
  `);

  document.getElementById('forgot-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();
    const btn   = document.getElementById('forgot-btn');

    if (!email) { showToast('Please enter your email.', 'warning'); return; }

    btn.disabled = true;
    btn.innerHTML = `<div class="spinner spinner-sm"></div> Sending…`;

    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      document.getElementById('forgot-form-wrap').classList.add('d-none');
      document.getElementById('forgot-back-link').classList.add('d-none');
      document.getElementById('forgot-email-sent-msg').textContent =
        `We've sent a password reset link to ${email}. The link expires in 15 minutes.`;
      document.getElementById('forgot-success').classList.remove('d-none');

    } catch (err) {
      // Show success even on error (security: don't reveal if email exists)
      document.getElementById('forgot-form-wrap').classList.add('d-none');
      document.getElementById('forgot-back-link').classList.add('d-none');
      document.getElementById('forgot-success').classList.remove('d-none');
    }
  });
}

export function renderResetPassword(token) {
  if (!token) {
    showToast('Invalid or missing reset token.', 'error');
    navigate('/forgot-password');
    return;
  }

  setView(`
    <div class="auth-layout">
      <div class="auth-brand-panel">
        <div class="auth-brand-bg"></div>
        <div class="auth-brand-grid"></div>
        <div class="auth-brand-content">
          <div class="auth-brand-logo">
            <div class="auth-brand-logo-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <span class="auth-brand-logo-text">ApexMarket</span>
          </div>
          <div>
            <div class="auth-brand-headline">Set a New<br>Password.</div>
            <div class="auth-brand-sub" style="margin-top:16px">
              Choose a strong password. It must be at least 8 characters long.
            </div>
          </div>
        </div>
      </div>

      <div class="auth-form-panel">
        <div class="auth-form-box">
          <div class="auth-form-title">New Password</div>
          <div class="auth-form-subtitle">Enter and confirm your new password below.</div>

          <form class="auth-form" id="reset-form" novalidate style="margin-top:var(--space-8)">
            <div class="form-group">
              <label class="form-label" for="reset-password">New Password</label>
              <div class="form-control-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input type="password" id="reset-password" class="form-control" placeholder="Min. 8 characters" required autocomplete="new-password">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="reset-confirm">Confirm New Password</label>
              <div class="form-control-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input type="password" id="reset-confirm" class="form-control" placeholder="Repeat password" required autocomplete="new-password">
              </div>
            </div>
            <button type="submit" id="reset-btn" class="btn btn-primary btn-xl w-full" style="margin-top:8px">
              Reset Password
            </button>
          </form>
        </div>
      </div>
    </div>
  `);

  document.getElementById('reset-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword     = document.getElementById('reset-password').value;
    const confirmPassword = document.getElementById('reset-confirm').value;
    const btn             = document.getElementById('reset-btn');

    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.', 'warning');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<div class="spinner spinner-sm"></div> Resetting…`;

    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
      showToast('Password reset successfully! Please sign in.', 'success');
      navigate('/login');
    } catch (err) {
      showToast(err.message || 'Reset failed. The link may have expired.', 'error');
      btn.disabled = false;
      btn.textContent = 'Reset Password';
    }
  });
}
