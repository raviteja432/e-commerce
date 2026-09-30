/**
 * wallet.js — User App Wallet View
 */

import { setView } from '../core/ui.js';
import { getState } from '../core/state.js';

export async function renderWallet() {
  const state = getState();
  if (!state.user) {
    window.location.hash = '#/login';
    return;
  }

  setView(`
    <div class="page-wrapper">
      <div class="page-container">
        
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:28px">
          <div style="width:48px; height:48px; border-radius:var(--radius-xl); background:rgba(124,58,237,0.12); color:var(--primary); display:flex; align-items:center; justify-content:center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
          </div>
          <div>
            <h1 class="section-title" style="margin:0">App Wallet</h1>
            <p class="text-muted text-sm" style="margin-top:2px">Manage your funds, wallet top-ups, and transaction history.</p>
          </div>
        </div>

        <div class="d-grid gap-8" style="grid-template-columns: 1fr 2fr; align-items: start;">
          
          <!-- Balance Summary Card -->
          <div class="card p-6" style="background:var(--gradient-brand); border:none; border-radius:var(--radius-2xl); color:#fff; box-shadow:0 8px 32px rgba(124,58,237,0.25)">
            <div style="font-size:var(--text-xs); text-transform:uppercase; letter-spacing:0.08em; opacity:0.85">Wallet Balance</div>
            <div style="font-size:42px; font-weight:800; margin:16px 0 24px; font-family:var(--font-display)">$250.00</div>
            
            <div style="display:flex; flex-direction:column; gap:10px">
              <button class="btn btn-primary" id="wallet-topup-btn" style="background:#fff; color:var(--primary); border:none; padding:12px; font-weight:600; width:100%; border-radius:var(--radius-lg)">
                + Add Money
              </button>
              <button class="btn btn-outline" id="wallet-withdraw-btn" style="border-color:rgba(255,255,255,0.4); color:#fff; padding:12px; font-weight:600; width:100%; border-radius:var(--radius-lg)">
                Withdraw Funds
              </button>
            </div>
          </div>

          <!-- Transaction History List -->
          <div class="card p-6">
            <h3 class="mb-4">Recent Transactions</h3>
            
            <div class="d-flex flex-col gap-4">
              <div class="d-flex justify-between items-center" style="padding-bottom:14px; border-bottom:1px solid var(--border)">
                <div>
                  <div style="font-weight:600; font-size:14px; color:var(--text-primary)">Refund for Order #10032</div>
                  <div style="font-size:12px; color:var(--text-muted); margin-top:2px">Aug 02, 2026 • 14:32 • Completed</div>
                </div>
                <div style="color:var(--success); font-weight:700; font-size:16px">+$45.00</div>
              </div>
              
              <div class="d-flex justify-between items-center" style="padding-bottom:14px; border-bottom:1px solid var(--border)">
                <div>
                  <div style="font-weight:600; font-size:14px; color:var(--text-primary)">Payment for Order #10029</div>
                  <div style="font-size:12px; color:var(--text-muted); margin-top:2px">Jul 28, 2026 • 18:15 • Completed</div>
                </div>
                <div style="color:var(--danger); font-weight:700; font-size:16px">-$120.00</div>
              </div>

              <div class="d-flex justify-between items-center" style="padding-bottom:14px; border-bottom:1px solid var(--border)">
                <div>
                  <div style="font-weight:600; font-size:14px; color:var(--text-primary)">Added Funds via Debit Card</div>
                  <div style="font-size:12px; color:var(--text-muted); margin-top:2px">Jul 25, 2026 • 09:00 • Completed</div>
                </div>
                <div style="color:var(--success); font-weight:700; font-size:16px">+$325.00</div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  `);

  document.getElementById('wallet-topup-btn')?.addEventListener('click', () => {
    alert('Top up feature simulated successfully! Funds will be added to your balance.');
  });
  document.getElementById('wallet-withdraw-btn')?.addEventListener('click', () => {
    alert('Withdrawal request initiated successfully.');
  });
}
