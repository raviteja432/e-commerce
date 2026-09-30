/**
 * profile.js — User Profile Dashboard
 *
 * Professional sidebar-based profile page with Personal Details,
 * Address Book, and Security sections. Each section is a distinct
 * scrollable area in the main content panel.
 */

import { apiFetch } from '../core/api.js';
import { getState } from '../core/state.js';
import { setView, showToast, updateHeaderUI } from '../core/ui.js';

let profileAddresses = [];
let currentSection = 'details'; // 'details' | 'addresses' | 'security'

export async function renderProfile() {
  let state = getState();
  if (!state.user && state.token) {
    try {
      const { fetchUserProfile } = await import('../app.js');
      await fetchUserProfile();
      state = getState();
    } catch (err) {
      console.error('Could not fetch user profile:', err);
    }
  }

  if (!state.user) {
    showToast('Sign in to view your profile.', 'info');
    window.location.hash = '#/login';
    return;
  }

  const u = state.user;
  const initials = u.name
    ? u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  setView(`
    <div class="page-wrapper">
      <div class="page-container">
        
        <div class="profile-layout">

          <!-- ─── Sidebar ─────────────────────────────────────────────────── -->
          <aside class="profile-sidebar-card fade-in">

            <!-- User identity block -->
            <div class="profile-sidebar-user">
              <div class="profile-avatar-lg">${initials}</div>
              <div class="profile-sidebar-info">
                <div class="profile-name">${u.name}</div>
                <div class="profile-email">${u.email}</div>
                <span class="badge badge-primary" style="margin-top:6px; font-size:10px">${u.role}</span>
              </div>
            </div>

            <!-- Navigation links -->
            <nav style="display:flex; flex-direction:column; gap:4px; padding-top:4px;">
              <button class="profile-nav-item ${currentSection==='details'?'active':''}" data-section="details">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <span>Personal Details</span>
              </button>
              <button class="profile-nav-item ${currentSection==='addresses'?'active':''}" data-section="addresses">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                <span>Address Book</span>
              </button>
              <button class="profile-nav-item ${currentSection==='security'?'active':''}" data-section="security">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span>Security</span>
              </button>

              <a href="#/orders" class="profile-nav-item">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>My Orders</span>
              </a>
              <a href="#/wallet" class="profile-nav-item">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M16 12h2"/><circle cx="16" cy="12" r="1"/>
                </svg>
                <span>App Wallet</span>
              </a>

              <div style="height:1px; background:var(--border); margin:8px 0;"></div>

              <button class="profile-nav-item profile-nav-danger" id="profile-logout-btn">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                <span>Sign Out</span>
              </button>
            </nav>
          </aside>

          <!-- ─── Main Content ─────────────────────────────────────────────── -->
          <div class="fade-in stagger-2" id="profile-main-content">
            ${renderSectionHTML(currentSection, u)}
          </div>

        </div>
      </div>
    </div>
  `);

  setupListeners();
  if (currentSection === 'addresses') {
    await loadProfileAddresses();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Section HTML renderers
// ─────────────────────────────────────────────────────────────────────────────

function renderSectionHTML(section, u) {
  if (section === 'details') return renderDetailsSection(u);
  if (section === 'addresses') return renderAddressesSection();
  if (section === 'security') return renderSecuritySection();
  return renderDetailsSection(u);
}

function renderDetailsSection(u) {
  return `
    <div class="card p-6">
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:28px">
        <div style="width:44px; height:44px; border-radius:var(--radius-lg); background:rgba(124,58,237,0.1); color:var(--primary); display:flex; align-items:center; justify-content:center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div>
          <h2 style="font-size:18px; font-weight:700; margin:0">Personal Details</h2>
          <p class="text-muted text-sm" style="margin:2px 0 0">Manage your name, contact info and personal data</p>
        </div>
      </div>

      <form class="d-flex flex-col gap-5" id="profile-update-form">
        <div class="d-grid gap-4" style="grid-template-columns: 1fr 1fr">
          <div class="form-group">
            <label class="form-label" for="prof-name">Full Name</label>
            <input type="text" id="prof-name" class="form-control" value="${u.name || ''}" required placeholder="John Doe">
          </div>
          <div class="form-group">
            <label class="form-label" for="prof-phone">Phone Number</label>
            <input type="tel" id="prof-phone" class="form-control" value="${u.phone || ''}" required placeholder="+91 99999 99999">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="prof-email">Email Address</label>
          <div style="position:relative">
            <input type="email" id="prof-email" class="form-control" value="${u.email || ''}" disabled
              style="cursor:not-allowed; background:var(--bg-secondary); padding-right:120px;">
            <span style="position:absolute; right:12px; top:50%; transform:translateY(-50%); font-size:11px; color:var(--text-muted); background:var(--bg-secondary); padding:2px 8px; border-radius:var(--radius-full); border:1px solid var(--border)">
              Verified ✓
            </span>
          </div>
          <p class="text-xs text-muted" style="margin-top:4px;">Email address cannot be changed for security reasons.</p>
        </div>

        <div style="display:flex; gap:12px; align-items:center; padding:16px; background:var(--bg-secondary); border-radius:var(--radius-lg); border:1px solid var(--border)">
          <div style="width:36px; height:36px; border-radius:var(--radius-full); background:var(--gradient-brand); display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; color:#fff; flex-shrink:0">
            ${(u.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style="font-size:13px; font-weight:600;">${u.name}</div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:1px">Member since ${new Date().getFullYear()}</div>
          </div>
          <span class="badge badge-success" style="margin-left:auto">Active</span>
        </div>

        <div style="display:flex; gap:12px; padding-top:8px">
          <button type="submit" class="btn btn-primary" id="prof-update-btn" style="min-width:140px">
            Save Changes
          </button>
          <button type="reset" class="btn btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  `;
}

function renderAddressesSection() {
  return `
    <div class="card p-6">
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:28px">
        <div style="width:44px; height:44px; border-radius:var(--radius-lg); background:rgba(124,58,237,0.1); color:var(--primary); display:flex; align-items:center; justify-content:center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <div style="flex:1">
          <h2 style="font-size:18px; font-weight:700; margin:0">Address Book</h2>
          <p class="text-muted text-sm" style="margin:2px 0 0">Manage your saved delivery addresses</p>
        </div>
        <button class="btn btn-primary btn-sm" id="prof-add-addr-btn">+ Add Address</button>
      </div>

      <!-- New/Edit address form (hidden by default) -->
      <div id="prof-add-addr-form-container" class="d-none" style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-lg); padding:20px; margin-bottom:20px;">
        <h4 class="mb-4" id="addr-form-title" style="font-size:15px; font-weight:700">New Address</h4>
        <form class="d-flex flex-col gap-4" id="profile-address-form">
          <input type="hidden" id="addr-id">
          <div class="d-grid gap-4" style="grid-template-columns: 1fr 1fr">
            <div class="form-group">
              <label class="form-label" for="prof-addr-name">Receiver Name</label>
              <input type="text" id="prof-addr-name" class="form-control" required placeholder="Full name">
            </div>
            <div class="form-group">
              <label class="form-label" for="prof-addr-phone">Phone Number</label>
              <input type="tel" id="prof-addr-phone" class="form-control" required placeholder="+91 98765 43210">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="prof-addr-line1">Address Line 1</label>
            <input type="text" id="prof-addr-line1" class="form-control" required placeholder="House/Flat No., Street, Area">
          </div>
          <div class="form-group">
            <label class="form-label" for="prof-addr-line2">Address Line 2 <span class="text-muted">(Optional)</span></label>
            <input type="text" id="prof-addr-line2" class="form-control" placeholder="Landmark, Colony">
          </div>
          <div class="d-grid gap-4" style="grid-template-columns: 1fr 1fr 1fr">
            <div class="form-group">
              <label class="form-label" for="prof-addr-city">City</label>
              <input type="text" id="prof-addr-city" class="form-control" required placeholder="City">
            </div>
            <div class="form-group">
              <label class="form-label" for="prof-addr-state">State</label>
              <input type="text" id="prof-addr-state" class="form-control" required placeholder="State">
            </div>
            <div class="form-group">
              <label class="form-label" for="prof-addr-zip">ZIP / Postal</label>
              <input type="text" id="prof-addr-zip" class="form-control" required placeholder="560001">
            </div>
          </div>
          <div class="d-flex gap-3">
            <button type="submit" class="btn btn-primary btn-sm" id="addr-save-btn">Save Address</button>
            <button type="button" class="btn btn-secondary btn-sm" id="addr-cancel-btn">Cancel</button>
          </div>
        </form>
      </div>

      <!-- Address list -->
      <div class="d-flex flex-col gap-4" id="profile-addresses-list">
        <div class="page-loading"><div class="spinner"></div>Loading addresses…</div>
      </div>
    </div>
  `;
}

function renderSecuritySection() {
  return `
    <div class="card p-6">
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:28px">
        <div style="width:44px; height:44px; border-radius:var(--radius-lg); background:rgba(124,58,237,0.1); color:var(--primary); display:flex; align-items:center; justify-content:center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <div>
          <h2 style="font-size:18px; font-weight:700; margin:0">Security</h2>
          <p class="text-muted text-sm" style="margin:2px 0 0">Change your password and manage account security</p>
        </div>
      </div>

      <!-- Security info strip -->
      <div style="display:flex; gap:16px; padding:16px; background:rgba(6,182,212,0.06); border:1px solid rgba(6,182,212,0.2); border-radius:var(--radius-lg); margin-bottom:24px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" style="flex-shrink:0; margin-top:1px"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <div>
          <div style="font-size:13px; font-weight:600; color:var(--accent)">Your account is secured</div>
          <div style="font-size:12px; color:var(--text-muted); margin-top:2px">We recommend using a strong, unique password with at least 8 characters, numbers, and symbols.</div>
        </div>
      </div>

      <form class="d-flex flex-col gap-5" id="profile-password-form">
        <div class="form-group">
          <label class="form-label" for="pass-current">Current Password</label>
          <input type="password" id="pass-current" class="form-control" required autocomplete="current-password" placeholder="Enter your current password">
        </div>
        <div class="form-group">
          <label class="form-label" for="pass-new">New Password</label>
          <input type="password" id="pass-new" class="form-control" required autocomplete="new-password" placeholder="At least 8 characters">
          <p class="text-xs text-muted" style="margin-top:4px">Use a mix of uppercase, lowercase, numbers and symbols.</p>
        </div>
        <div class="form-group">
          <label class="form-label" for="pass-confirm">Confirm New Password</label>
          <input type="password" id="pass-confirm" class="form-control" required autocomplete="new-password" placeholder="Re-enter new password">
        </div>

        <div style="display:flex; gap:12px; padding-top:8px">
          <button type="submit" class="btn btn-primary" id="pass-update-btn" style="min-width:160px">
            Update Password
          </button>
          <button type="reset" class="btn btn-secondary">
            Clear
          </button>
        </div>
      </form>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Listeners
// ─────────────────────────────────────────────────────────────────────────────

function setupListeners() {
  const state = getState();

  // Sign out
  document.getElementById('profile-logout-btn')?.addEventListener('click', () => {
    import('../app.js').then(m => m.logOut());
  });

  // Sidebar section switching
  document.querySelectorAll('[data-section]').forEach(btn => {
    btn.addEventListener('click', async () => {
      currentSection = btn.dataset.section;

      // Update active class on all nav items
      document.querySelectorAll('[data-section]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Swap main content
      const main = document.getElementById('profile-main-content');
      if (!main) return;
      const u = getState().user;
      main.style.opacity = '0';
      main.style.transform = 'translateY(6px)';
      
      setTimeout(() => {
        main.innerHTML = renderSectionHTML(currentSection, u);
        main.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        main.style.opacity = '1';
        main.style.transform = 'translateY(0)';
        
        // Attach the correct form listeners
        if (currentSection === 'details') attachDetailsListeners();
        if (currentSection === 'security') attachSecurityListeners();
        if (currentSection === 'addresses') {
          attachAddressListeners();
          loadProfileAddresses();
        }
      }, 80);
    });
  });

  // Attach initial section listeners
  if (currentSection === 'details') attachDetailsListeners();
  if (currentSection === 'security') attachSecurityListeners();
  if (currentSection === 'addresses') attachAddressListeners();
}

function attachDetailsListeners() {
  document.getElementById('profile-update-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('prof-update-btn');
    const name = document.getElementById('prof-name').value.trim();
    const phone = document.getElementById('prof-phone').value.trim();

    if (!name || !phone) {
      showToast('Name and phone number are required.', 'warning');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<div class="spinner spinner-sm"></div> Saving…`;

    try {
      await apiFetch('/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ name, phone })
      });
      showToast('Personal details updated!', 'success');

      // Refresh local profile state
      const { fetchUserProfile } = await import('../app.js');
      await fetchUserProfile();
      updateHeaderUI();

      // Re-render profile with fresh state
      renderProfile();
    } catch (err) {
      showToast(err.message || 'Failed to update details.', 'error');
      btn.disabled = false;
      btn.textContent = 'Save Changes';
    }
  });
}

function attachSecurityListeners() {
  document.getElementById('profile-password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('pass-update-btn');
    const currentPassword = document.getElementById('pass-current').value;
    const newPassword = document.getElementById('pass-new').value;
    const confirmPassword = document.getElementById('pass-confirm').value;

    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.', 'warning');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<div class="spinner spinner-sm"></div> Updating…`;

    try {
      await apiFetch('/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      showToast('Password changed successfully!', 'success');
      document.getElementById('profile-password-form').reset();
    } catch (err) {
      showToast(err.message || 'Failed to change password.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Update Password';
    }
  });
}

function attachAddressListeners() {
  const addrFormContainer = document.getElementById('prof-add-addr-form-container');
  const addressForm = document.getElementById('profile-address-form');

  document.getElementById('prof-add-addr-btn')?.addEventListener('click', () => {
    document.getElementById('addr-form-title').textContent = 'New Address';
    document.getElementById('addr-id').value = '';
    addressForm?.reset();
    addrFormContainer?.classList.remove('d-none');
    addrFormContainer?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  document.getElementById('addr-cancel-btn')?.addEventListener('click', () => {
    addrFormContainer?.classList.add('d-none');
  });

  addressForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('addr-save-btn');
    const id = document.getElementById('addr-id').value;

    const name = document.getElementById('prof-addr-name').value.trim();
    const phone = document.getElementById('prof-addr-phone').value.trim();
    const line1 = document.getElementById('prof-addr-line1').value.trim();
    const line2 = document.getElementById('prof-addr-line2').value.trim();
    const city = document.getElementById('prof-addr-city').value.trim();
    const state = document.getElementById('prof-addr-state').value.trim();
    const zip = document.getElementById('prof-addr-zip').value.trim();

    saveBtn.disabled = true;
    saveBtn.innerHTML = `<div class="spinner spinner-sm"></div>`;

    try {
      if (id) {
        await apiFetch(`/customers/me/addresses/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ name, phone, line1, line2, city, state, zip })
        });
        showToast('Address updated!', 'success');
      } else {
        await apiFetch('/customers/me/addresses', {
          method: 'POST',
          body: JSON.stringify({ name, phone, line1, line2, city, state, zip })
        });
        showToast('Address saved!', 'success');
      }
      addrFormContainer?.classList.add('d-none');
      await loadProfileAddresses();
    } catch (err) {
      showToast(err.message || 'Failed to save address.', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Address';
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Address CRUD helpers
// ─────────────────────────────────────────────────────────────────────────────

async function loadProfileAddresses() {
  const container = document.getElementById('profile-addresses-list');
  if (!container) return;

  try {
    profileAddresses = await apiFetch('/customers/me/addresses');
    renderAddressesList();
  } catch (err) {
    container.innerHTML = `<div class="text-danger p-4">Could not load addresses.</div>`;
  }
}

function renderAddressesList() {
  const container = document.getElementById('profile-addresses-list');
  if (!container) return;

  if (profileAddresses.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:40px 20px; color:var(--text-muted)">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:12px; opacity:0.4"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <div style="font-size:15px; font-weight:600; margin-bottom:4px">No saved addresses</div>
        <div style="font-size:13px">Add a delivery address to speed up checkout</div>
      </div>
    `;
    return;
  }

  container.innerHTML = profileAddresses.map(addr => `
    <div style="display:flex; gap:16px; padding:18px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-lg); transition:border-color var(--transition-fast);" class="addr-card">
      <div style="width:36px; height:36px; border-radius:var(--radius-md); background:rgba(124,58,237,0.1); color:var(--primary); display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
      <div style="flex:1; min-width:0">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px">
          <strong style="font-size:14px">${addr.name}</strong>
          ${(addr.isDefault || addr.defaultAddress) ? `<span class="badge badge-success" style="font-size:10px">Default</span>` : ''}
        </div>
        <div style="font-size:13px; color:var(--text-secondary); line-height:1.6">
          ${addr.line1}${addr.line2 ? ', ' + addr.line2 : ''}<br>
          ${addr.city}, ${addr.state} — ${addr.zip}
        </div>
        <div style="font-size:12px; color:var(--text-muted); margin-top:4px">📞 ${addr.phone}</div>
      </div>
      <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end; flex-shrink:0;">
        ${!(addr.isDefault || addr.defaultAddress) ? `
          <button class="btn btn-secondary btn-sm default-addr-btn" data-id="${addr.id}" style="font-size:11px; white-space:nowrap">Set Default</button>
        ` : ''}
        <button class="btn btn-secondary btn-sm edit-addr-btn" data-id="${addr.id}" style="font-size:11px">Edit</button>
        <button class="btn btn-danger btn-sm delete-addr-btn" data-id="${addr.id}" style="font-size:11px">Delete</button>
      </div>
    </div>
  `).join('');

  // Set Default
  container.querySelectorAll('.default-addr-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await apiFetch(`/customers/me/addresses/${btn.dataset.id}/default`, { method: 'PATCH' });
        showToast('Default address updated!', 'success');
        await loadProfileAddresses();
      } catch {
        showToast('Failed to update default.', 'error');
      }
    });
  });

  // Edit
  container.querySelectorAll('.edit-addr-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const addr = profileAddresses.find(a => a.id === parseInt(btn.dataset.id));
      if (!addr) return;

      const container = document.getElementById('prof-add-addr-form-container');
      document.getElementById('addr-form-title').textContent = 'Edit Address';
      document.getElementById('addr-id').value = addr.id;
      document.getElementById('prof-addr-name').value = addr.name;
      document.getElementById('prof-addr-phone').value = addr.phone;
      document.getElementById('prof-addr-line1').value = addr.line1;
      document.getElementById('prof-addr-line2').value = addr.line2 || '';
      document.getElementById('prof-addr-city').value = addr.city;
      document.getElementById('prof-addr-state').value = addr.state;
      document.getElementById('prof-addr-zip').value = addr.zip;

      container?.classList.remove('d-none');
      container?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });

  // Delete
  container.querySelectorAll('.delete-addr-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this address?')) return;
      try {
        await apiFetch(`/customers/me/addresses/${btn.dataset.id}`, { method: 'DELETE' });
        showToast('Address deleted!', 'success');
        await loadProfileAddresses();
      } catch {
        showToast('Failed to delete address.', 'error');
      }
    });
  });
}
