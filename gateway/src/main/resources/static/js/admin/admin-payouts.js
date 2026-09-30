/**
 * admin-payouts.js — Admin Vendor Weekly Payouts Management
 *
 * Displays vendors with accumulated unpaid 90% earnings.
 * Admin can initiate a bank transfer via the "Transfer Money" modal,
 * which collects transfer method + UTR reference, marks the payout as PAID,
 * and sends the vendor a professional payout receipt email.
 */

import { apiFetch } from '../core/api.js';
import { showToast, formatCurrency, tableRowsSkeleton } from '../core/ui.js';
import { renderAdminLayout } from './admin-layout.js';

// Current payout context stored for modal usage
let _currentVendor = null;

export async function renderAdminPayouts() {
  const contentHTML = `
    <div class="d-flex justify-between items-center mb-6 flex-wrap gap-4">
      <div>
        <h1 class="section-title">Vendor Weekly Payouts</h1>
        <p class="text-muted">Review accumulated 90% vendor sales shares, initiate bank transfers, and settle weekly payouts.</p>
      </div>
      <div>
        <button class="btn btn-secondary btn-sm" id="refresh-payouts-btn">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Refresh
        </button>
      </div>
    </div>

    <!-- Payout summary table card -->
    <div class="card overflow-hidden">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Store / Compliance</th>
              <th>Bank Account Details</th>
              <th>Owed Amount (90%)</th>
              <th>Status</th>
              <th style="text-align:right">Action</th>
            </tr>
          </thead>
          <tbody id="payouts-table-container">
            ${tableRowsSkeleton(5, 5)}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Transfer Money Modal -->
    <div id="transfer-modal-overlay" class="modal-overlay" style="display:none;align-items:center;justify-content:center">
      <div class="modal-container" style="max-width:520px;width:90%;background:var(--bg-card);border-radius:var(--radius-xl);border:1px solid var(--border);overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.5)">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid var(--border)">
          <div>
            <h3 style="margin:0;font-size:1.1rem;font-weight:700;color:var(--text-primary)">&#x1F4B8; Transfer Money to Vendor</h3>
            <p style="margin:4px 0 0;font-size:0.8rem;color:var(--text-muted)">Review bank details carefully before initiating the transfer.</p>
          </div>
          <button id="close-transfer-modal" class="btn btn-ghost" style="width:32px;height:32px;padding:0;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style="padding:24px">
          <!-- Recipient Details -->
          <div style="background:var(--bg-secondary);border-radius:var(--radius-md);padding:16px;border:1px solid var(--border);margin-bottom:16px">
            <div style="font-size:0.7rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px">Recipient Details</div>
            <div id="modal-store-name" style="font-size:1rem;font-weight:700;color:var(--text-primary)"></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
              <div>
                <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:2px">Account Holder</div>
                <div id="modal-account-name" style="font-size:0.85rem;font-weight:600;color:var(--text-primary)"></div>
              </div>
              <div>
                <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:2px">PAN Number</div>
                <div id="modal-pan" style="font-size:0.85rem;font-weight:600;color:var(--text-primary)"></div>
              </div>
              <div>
                <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:2px">Bank Account No.</div>
                <div id="modal-account-number" style="font-size:0.9rem;font-weight:700;color:var(--primary-light);font-family:monospace;letter-spacing:0.05em"></div>
              </div>
              <div>
                <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:2px">IFSC Code</div>
                <div id="modal-ifsc" style="font-size:0.85rem;font-weight:600;color:var(--text-primary);font-family:monospace"></div>
              </div>
            </div>
          </div>

          <!-- Transfer Amount -->
          <div style="background:linear-gradient(135deg,rgba(34,197,94,0.12),rgba(16,185,129,0.08));border:1px solid rgba(34,197,94,0.3);border-radius:var(--radius-md);padding:16px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em">Transfer Amount</div>
              <div id="modal-amount" style="font-size:1.8rem;font-weight:900;color:#22c55e;margin-top:2px"></div>
              <div style="font-size:0.72rem;color:var(--text-muted)">90% vendor share (10% platform fee deducted)</div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="1.5" style="width:44px;height:44px;opacity:0.5"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>

          <!-- Transfer Method -->
          <div style="margin-bottom:16px">
            <label style="font-size:0.8rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:8px">Transfer Method</label>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px" id="transfer-method-grid">
              <label class="transfer-method-label" style="cursor:pointer">
                <input type="radio" name="transfer_method" value="NEFT" checked style="display:none" id="method-neft">
                <div class="transfer-method-card active-method" style="border:2px solid var(--primary);background:var(--primary-glow);border-radius:var(--radius-md);padding:10px;text-align:center;transition:all 0.2s">
                  <div style="font-size:0.78rem;font-weight:700;color:var(--primary-light)">&#x1F3E6; NEFT</div>
                  <div style="font-size:0.65rem;color:var(--text-muted)">2–4 hours</div>
                </div>
              </label>
              <label class="transfer-method-label" style="cursor:pointer">
                <input type="radio" name="transfer_method" value="IMPS" style="display:none" id="method-imps">
                <div class="transfer-method-card" style="border:2px solid var(--border);border-radius:var(--radius-md);padding:10px;text-align:center;transition:all 0.2s">
                  <div style="font-size:0.78rem;font-weight:700;color:var(--text-primary)">&#x26A1; IMPS</div>
                  <div style="font-size:0.65rem;color:var(--text-muted)">Instant</div>
                </div>
              </label>
              <label class="transfer-method-label" style="cursor:pointer">
                <input type="radio" name="transfer_method" value="UPI" style="display:none" id="method-upi">
                <div class="transfer-method-card" style="border:2px solid var(--border);border-radius:var(--radius-md);padding:10px;text-align:center;transition:all 0.2s">
                  <div style="font-size:0.78rem;font-weight:700;color:var(--text-primary)">&#x1F4F1; UPI</div>
                  <div style="font-size:0.65rem;color:var(--text-muted)">Instant</div>
                </div>
              </label>
            </div>
          </div>

          <!-- Reference Number -->
          <div style="margin-bottom:16px">
            <label style="font-size:0.8rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px">Transfer Reference / UTR Number</label>
            <input type="text" id="transfer-reference" class="form-control" placeholder="e.g. UTR123456789012 or bank ref number" style="font-family:monospace;font-size:0.9rem;width:100%;box-sizing:border-box">
            <p style="font-size:0.72rem;color:var(--text-muted);margin:4px 0 0">This reference will be included in the vendor's payout receipt email.</p>
          </div>

          <!-- Checkbox confirmation -->
          <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:12px;background:var(--bg-secondary);border-radius:var(--radius-md);border:1px solid var(--border);margin-bottom:20px">
            <input type="checkbox" id="transfer-confirm-check" style="margin-top:2px;flex-shrink:0;cursor:pointer">
            <span style="font-size:0.8rem;color:var(--text-secondary);line-height:1.5">
              I confirm that I have initiated the bank transfer of <strong id="modal-confirm-amount" style="color:var(--text-primary)"></strong> to the above account and the UTR/reference number entered is accurate.
            </span>
          </label>
        </div>

        <div style="padding:16px 24px;border-top:1px solid var(--border);display:flex;gap:12px;justify-content:flex-end">
          <button id="cancel-transfer-btn" class="btn btn-ghost">Cancel</button>
          <button id="confirm-transfer-btn" class="btn btn-success" disabled>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><polyline points="20 6 9 17 4 12"/></svg>
            Confirm Transfer
          </button>
        </div>
      </div>
    </div>
  `;

  renderAdminLayout(contentHTML, 'admin-nav-payouts');
  setupPageListeners();
  await loadPayoutsList();
}

function setupPageListeners() {
  document.getElementById('refresh-payouts-btn')?.addEventListener('click', loadPayoutsList);
  document.getElementById('close-transfer-modal')?.addEventListener('click', closeTransferModal);
  document.getElementById('cancel-transfer-btn')?.addEventListener('click', closeTransferModal);

  document.getElementById('transfer-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'transfer-modal-overlay') closeTransferModal();
  });

  // Transfer method selection visual feedback
  document.querySelectorAll('input[name="transfer_method"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.transfer-method-card').forEach(card => {
        card.style.border = '2px solid var(--border)';
        card.style.background = 'transparent';
      });
      const selected = radio.closest('.transfer-method-label')?.querySelector('.transfer-method-card');
      if (selected) {
        selected.style.border = '2px solid var(--primary)';
        selected.style.background = 'var(--primary-glow)';
      }
    });
  });

  document.getElementById('transfer-confirm-check')?.addEventListener('change', validateTransferForm);
  document.getElementById('transfer-reference')?.addEventListener('input', validateTransferForm);
}

function validateTransferForm() {
  const checked = document.getElementById('transfer-confirm-check')?.checked;
  const ref     = (document.getElementById('transfer-reference')?.value || '').trim();
  const btn     = document.getElementById('confirm-transfer-btn');
  if (btn) btn.disabled = !(checked && ref.length >= 6);
}

function closeTransferModal() {
  const overlay = document.getElementById('transfer-modal-overlay');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
}

function openTransferModal(vendor) {
  _currentVendor = vendor;

  document.getElementById('modal-store-name').textContent     = vendor.storeName || `Vendor #${vendor.vendorId}`;
  document.getElementById('modal-account-name').textContent   = vendor.bankAccountName || 'N/A';
  document.getElementById('modal-pan').textContent            = vendor.panNumber || 'N/A';
  document.getElementById('modal-account-number').textContent = vendor.bankAccountNumber || '••••••••';
  document.getElementById('modal-ifsc').textContent           = vendor.bankIfscCode || 'N/A';
  document.getElementById('modal-amount').textContent         = formatCurrency(vendor.totalPending || 0);
  document.getElementById('modal-confirm-amount').textContent = formatCurrency(vendor.totalPending || 0);

  // Reset form state
  document.getElementById('transfer-reference').value = '';
  document.getElementById('transfer-confirm-check').checked = false;
  document.getElementById('confirm-transfer-btn').disabled = true;

  // Reset method selection to NEFT
  document.getElementById('method-neft').checked = true;
  document.querySelectorAll('.transfer-method-card').forEach((card, i) => {
    card.style.border  = i === 0 ? '2px solid var(--primary)' : '2px solid var(--border)';
    card.style.background = i === 0 ? 'var(--primary-glow)' : 'transparent';
  });

  // Bind confirm action
  const confirmBtn = document.getElementById('confirm-transfer-btn');
  confirmBtn.onclick = executeTransfer;

  document.getElementById('transfer-modal-overlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

async function executeTransfer() {
  if (!_currentVendor) return;

  const method    = document.querySelector('input[name="transfer_method"]:checked')?.value || 'NEFT';
  const reference = (document.getElementById('transfer-reference')?.value || '').trim();
  const btn       = document.getElementById('confirm-transfer-btn');

  btn.disabled = true;
  btn.innerHTML = `<div class="spinner spinner-sm" style="width:14px;height:14px;border-width:2px;margin-right:6px"></div> Processing…`;

  try {
    // Call backend transfer endpoint (records payout + sends vendor email)
    await apiFetch(`/admin/payouts/vendor/${_currentVendor.vendorId}/transfer`, {
      method: 'POST',
      body: JSON.stringify({
        transferMethod: method,
        referenceNumber: reference,
        notes: `Weekly payout transferred via ${method}. UTR/Ref: ${reference}`
      })
    });

    showToast(
      `✅ Transfer of ${formatCurrency(_currentVendor.totalPending)} to ${_currentVendor.storeName} confirmed! Vendor notified via email.`,
      'success'
    );
    closeTransferModal();
    await loadPayoutsList();
  } catch (err) {
    showToast(err.message || 'Transfer confirmation failed. Please try again.', 'error');
    btn.disabled = false;
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><polyline points="20 6 9 17 4 12"/></svg> Confirm Transfer`;
  }
}

async function loadPayoutsList() {
  const container = document.getElementById('payouts-table-container');
  if (!container) return;

  container.innerHTML = tableRowsSkeleton(5, 5);

  try {
    const list = await apiFetch('/admin/payouts/summary');

    if (!list || list.length === 0) {
      container.innerHTML = `
        <tr><td colspan="5" style="text-align:center;padding:48px">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;margin:0 auto 12px;display:block;opacity:0.35"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          <div style="color:var(--text-muted)">All vendor payouts are up to date. No pending transfers.</div>
        </td></tr>
      `;
      return;
    }

    container.innerHTML = list.map(v => `
      <tr>
        <td>
          <div style="font-weight:700;font-size:0.9rem;color:var(--text-primary)">${v.storeName || 'Vendor #' + v.vendorId}</div>
          <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px">ID: #${v.vendorId} | PAN: ${v.panNumber || 'N/A'}</div>
        </td>
        <td>
          <div style="font-size:0.85rem;font-weight:600;color:var(--text-primary)">${v.bankAccountName || 'N/A'}</div>
          <div style="font-size:0.82rem;font-family:monospace;color:var(--primary-light);margin:2px 0">A/C: ${v.bankAccountNumber || '••••••••'}</div>
          <div style="font-size:0.72rem;color:var(--text-muted)">IFSC: ${v.bankIfscCode || 'N/A'}</div>
        </td>
        <td>
          <div style="font-size:1.05rem;font-weight:800;color:#22c55e">${formatCurrency(v.totalPending || 0)}</div>
          <div style="font-size:0.72rem;color:var(--text-muted)">90% share · 10% fee deducted</div>
        </td>
        <td>
          <span class="badge badge-warning">&#x23F3; Pending</span>
        </td>
        <td style="text-align:right">
          <div class="td-actions" style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
            <button class="btn btn-success btn-sm transfer-money-btn"
              data-vendor-id="${v.vendorId}"
              data-vendor-idx="${list.indexOf(v)}">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              Manual Transfer
            </button>
            <button class="btn btn-primary btn-sm stripe-pay-btn"
              data-vendor-id="${v.vendorId}"
              data-store-name="${v.storeName || 'Vendor #' + v.vendorId}"
              data-amount="${formatCurrency(v.totalPending || 0)}">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
              Pay via Stripe
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    // Store list globally for modal access
    window._payoutList = list;

    // Bind Manual Transfer Money buttons
    document.querySelectorAll('.transfer-money-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.vendorIdx);
        const vendor = window._payoutList[idx];
        if (vendor) openTransferModal(vendor);
      });
    });

    // Bind Pay via Stripe buttons
    document.querySelectorAll('.stripe-pay-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const vendorId  = btn.dataset.vendorId;
        const storeName = btn.dataset.storeName;
        const amount    = btn.dataset.amount;

        // Confirm before making the Stripe call
        const confirmed = window.confirm(
          `⚡ Initiate a Stripe Transfer of ${amount} to ${storeName}?\n\n` +
          `This will:\n` +
          `• Create a Stripe Connected Account for the vendor (if not already done)\n` +
          `• Transfer ${amount} from the platform Stripe balance to the vendor\n` +
          `• Mark all pending earnings as PAID\n` +
          `• Send the vendor a payout receipt email\n\n` +
          `Confirm?`
        );
        if (!confirmed) return;

        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<div class="spinner spinner-sm" style="width:12px;height:12px;border-width:2px;margin-right:5px"></div> Processing…`;

        try {
          const result = await apiFetch(`/admin/payouts/vendor/${vendorId}/stripe-transfer`, {
            method: 'POST'
          });

          showToast(
            `✅ Stripe Transfer successful! Transfer ID: ${result.stripeTransferId}. ${storeName} has been paid ${amount} and notified via email.`,
            'success'
          );
          await loadPayoutsList();
        } catch (err) {
          showToast(
            `❌ Stripe Transfer failed: ${err.message || 'Unknown error. Check that the Stripe account has sufficient balance.'}`,
            'error'
          );
          btn.disabled = false;
          btn.innerHTML = originalHTML;
        }
      });
    });

  } catch (err) {
    container.innerHTML = `<tr><td colspan="5" style="color:var(--danger);padding:24px">Could not retrieve payout summary list.</td></tr>`;
  }
}

