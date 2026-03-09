/* =============================================================
   AVA — Escola Parque | popup.js v2.0
   ============================================================= */

'use strict';

const api = typeof browser !== 'undefined' ? browser : chrome;

const toggleActive = document.getElementById('toggle-active');
const labelActive  = document.getElementById('label-active');

/* Load saved state */
api.storage.local.get({ extensionActive: true }, (state) => {
  toggleActive.checked = state.extensionActive !== false;
  updateActiveLabel(state.extensionActive !== false);
});

/* Toggle: Extension active */
toggleActive.addEventListener('change', () => {
  const active = toggleActive.checked;
  api.storage.local.set({ extensionActive: active });
  updateActiveLabel(active);
  sendToActiveTab({ type: 'SET_ACTIVE', value: active });
});

function updateActiveLabel(active) {
  labelActive.textContent = active ? 'REDESIGN ATIVO' : 'REDESIGN INATIVO';
  labelActive.style.color = active ? '#E0E0E0' : '#444';
}

function sendToActiveTab(message) {
  api.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0) return;
    const tab = tabs[0];
    if (!tab.id) return;
    if (!tab.url || !tab.url.includes('ava.escolaparque.g12.br')) return;
    api.tabs.sendMessage(tab.id, message, () => {
      if (api.runtime.lastError) { /* swallow */ }
    });
  });
}
