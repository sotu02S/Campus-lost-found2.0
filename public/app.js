/* ============================================================
   Campus Lost & Found — app.js
   Full mobile + desktop support
   ============================================================ */

'use strict';

const API = '/api';

/* ── DOM refs ─────────────────────────────────────────────── */
const postItemBtn       = document.getElementById('postItemBtn');
const postItemBtnMobile = document.getElementById('postItemBtnMobile');
const navToggle         = document.getElementById('navToggle');
const navDrawer         = document.getElementById('navDrawer');

const postModal    = document.getElementById('postModal');
const detailModal  = document.getElementById('detailModal');
const messageModal = document.getElementById('messageModal');
const claimModal   = document.getElementById('claimModal');

const postItemForm = document.getElementById('postItemForm');
const messageForm  = document.getElementById('messageForm');
const claimForm    = document.getElementById('claimForm');

const itemsGrid     = document.getElementById('itemsGrid');
const searchInput   = document.getElementById('searchInput');
const typeFilter    = document.getElementById('typeFilter');
const categoryFilter= document.getElementById('categoryFilter');
const statusFilter  = document.getElementById('statusFilter');
const sortBy        = document.getElementById('sortBy');
const clearFilters  = document.getElementById('clearFilters');

const photoInput           = document.getElementById('photo');
const imagePreviewContainer= document.getElementById('imagePreviewContainer');
const imagePreview         = document.getElementById('imagePreview');
const removePreviewBtn     = document.getElementById('removePreviewBtn');
const fileUploadWrapper    = document.getElementById('fileUploadWrapper');

const toastContainer = document.getElementById('toastContainer');

/* Stats chips */
const statTotal   = document.getElementById('statTotal');
const statLost    = document.getElementById('statLost');
const statFound   = document.getElementById('statFound');
const statResults = document.getElementById('statResults');

/* Submit buttons (for loading-state management) */
const submitPostBtn    = document.getElementById('submitPostBtn');
const submitMessageBtn = document.getElementById('submitMessageBtn');
const submitClaimBtn   = document.getElementById('submitClaimBtn');

/* ── State ────────────────────────────────────────────────── */
let allItems      = [];
let currentItemId = null;

const CATEGORY_LABELS = {
  electronics: 'Electronics',
  clothing:    'Clothing',
  books:       'Books & Stationery',
  accessories: 'Accessories',
  keys:        'Keys & Cards',
  other:       'Other',
};

const TOAST_ICONS = {
  success: '✅',
  error:   '❌',
  warning: '⚠️',
  info:    'ℹ️',
};

/* ── Init ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  setMaxDate();
  loadItems();
  setupEventListeners();
  document.getElementById('footerYear').textContent = new Date().getFullYear();
});

/* ============================================================
   EVENT LISTENERS
   ============================================================ */
function setupEventListeners() {

  /* ── Mobile nav hamburger ─────────────────────────────── */
  navToggle.addEventListener('click', toggleMobileNav);

  /* Close drawer when clicking outside */
  document.addEventListener('click', (e) => {
    if (
      navDrawer.classList.contains('open') &&
      !navDrawer.contains(e.target) &&
      !navToggle.contains(e.target)
    ) {
      closeMobileNav();
    }
  });

  /* ── Post-item button (desktop + mobile) ──────────────── */
  postItemBtn.addEventListener('click', () => {
    closeMobileNav();
    openModal(postModal);
  });
  postItemBtnMobile.addEventListener('click', () => {
    closeMobileNav();
    openModal(postModal);
  });

  /* ── Modal close buttons (data-modal attr) ────────────── */
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', function () {
      const id = this.getAttribute('data-modal');
      const modal = document.getElementById(id);
      if (modal) closeModal(modal);
    });
  });

  /* Cancel buttons */
  document.getElementById('cancelPost').addEventListener('click',    () => closeModal(postModal));
  document.getElementById('cancelMessage').addEventListener('click', () => closeModal(messageModal));
  document.getElementById('cancelClaim').addEventListener('click',   () => closeModal(claimModal));

  /* Click backdrop to close */
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  /* Escape key closes top-most open modal */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const open = [...document.querySelectorAll('.modal.active')].pop();
      if (open) closeModal(open);
      if (navDrawer.classList.contains('open')) closeMobileNav();
    }
  });

  /* ── Forms ────────────────────────────────────────────── */
  postItemForm.addEventListener('submit', handlePostItem);
  messageForm.addEventListener('submit',  handleSendMessage);
  claimForm.addEventListener('submit',    handleClaimSubmit);

  /* ── Search / Filters ─────────────────────────────────── */
  searchInput.addEventListener('input',    debounce(filterAndSort, 180));
  typeFilter.addEventListener('change',    filterAndSort);
  categoryFilter.addEventListener('change',filterAndSort);
  statusFilter.addEventListener('change',  filterAndSort);
  sortBy.addEventListener('change',        filterAndSort);
  clearFilters.addEventListener('click',   resetFilters);

  /* ── Photo upload ─────────────────────────────────────── */
  photoInput.addEventListener('change', handleImagePreview);
  removePreviewBtn.addEventListener('click', clearImagePreview);

  /* Keyboard-accessible file upload wrapper */
  fileUploadWrapper.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      photoInput.click();
    }
  });

  /* Drag-and-drop feedback */
  fileUploadWrapper.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileUploadWrapper.classList.add('drag-over');
  });
  fileUploadWrapper.addEventListener('dragleave', () => {
    fileUploadWrapper.classList.remove('drag-over');
  });
  fileUploadWrapper.addEventListener('drop', (e) => {
    e.preventDefault();
    fileUploadWrapper.classList.remove('drag-over');
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const dt = new DataTransfer();
      dt.items.add(file);
      photoInput.files = dt.files;
      photoInput.dispatchEvent(new Event('change'));
    }
  });
}

/* ============================================================
   MOBILE NAV
   ============================================================ */
function toggleMobileNav() {
  const isOpen = navDrawer.classList.contains('open');
  isOpen ? closeMobileNav() : openMobileNav();
}

function openMobileNav() {
  navDrawer.classList.add('open');
  navToggle.classList.add('open');
  navToggle.setAttribute('aria-expanded', 'true');
  navToggle.setAttribute('aria-label', 'Close menu');
  navDrawer.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeMobileNav() {
  navDrawer.classList.remove('open');
  navToggle.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.setAttribute('aria-label', 'Open menu');
  navDrawer.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/* ============================================================
   MODAL HELPERS
   ============================================================ */

/* Track focus before modal opens so we can restore it */
let preFocusEl = null;

function openModal(modal) {
  preFocusEl = document.activeElement;
  closeMobileNav();
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  /* Move focus to the first focusable element inside */
  const firstFocusable = modal.querySelector(
    'button, [href], input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  requestAnimationFrame(() => firstFocusable?.focus());

  /* Trap focus inside modal */
  modal._focusTrap = (e) => trapFocus(e, modal);
  modal.addEventListener('keydown', modal._focusTrap);
}

function closeModal(modal) {
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  if (modal._focusTrap) {
    modal.removeEventListener('keydown', modal._focusTrap);
    delete modal._focusTrap;
  }

  /* Restore focus */
  preFocusEl?.focus();

  /* Reset forms */
  if (modal === postModal)    { postItemForm.reset(); clearImagePreview(); }
  if (modal === messageModal) { messageForm.reset(); }
  if (modal === claimModal)   { claimForm.reset(); }
}

function trapFocus(e, modal) {
  if (e.key !== 'Tab') return;
  const focusable = [...modal.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )];
  if (!focusable.length) return;
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
  }
}

/* ============================================================
   LOAD & DISPLAY ITEMS
   ============================================================ */
async function loadItems() {
  /* 1. Show cached data instantly if available */
  const cached = localStorage.getItem('campus_items_cache');
  if (cached) {
    try {
      allItems = JSON.parse(cached);
      filterAndSort();
      updateStats();
    } catch { /* ignore corrupt cache */ }
  } else {
    renderSkeletons();
  }

  /* 2. Fetch fresh data in the background */
  try {
    const res = await fetch(`${API}/items`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const fresh = await res.json();

    if (JSON.stringify(fresh) !== JSON.stringify(allItems)) {
      allItems = fresh;
      localStorage.setItem('campus_items_cache', JSON.stringify(fresh));
      filterAndSort();
      updateStats();
    }
  } catch (err) {
    console.error('Failed to load items:', err);
    if (!cached) {
      itemsGrid.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📡</span>
          <h3>Could not connect</h3>
          <p>Check your database settings and reload the page.</p>
        </div>`;
      showToast('Unable to reach the server', 'error');
    } else {
      showToast('Showing cached data — working offline', 'warning');
    }
  }
}

/* ── Stats bar ──────────────────────────────────────────── */
function updateStats() {
  statTotal.textContent = allItems.length;
  statLost.textContent  = allItems.filter(i => i.type === 'lost').length;
  statFound.textContent = allItems.filter(i => i.type === 'found').length;
}

function updateResultCount(n) {
  statResults.textContent = n;
}

/* ── Skeletons ──────────────────────────────────────────── */
function renderSkeletons(count = 6) {
  itemsGrid.innerHTML = Array(count).fill(0).map(() => `
    <div class="skeleton-card" aria-hidden="true">
      <div class="skeleton-image"></div>
      <div class="skeleton-content">
        <div class="skeleton-text badge"></div>
        <div class="skeleton-text title"></div>
        <div class="skeleton-text desc"></div>
        <div class="skeleton-text desc-s"></div>
      </div>
    </div>`).join('');
}

/* ── Render items ───────────────────────────────────────── */
function displayItems(items) {
  updateResultCount(items.length);

  if (!items.length) {
    itemsGrid.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🔍</span>
        <h3>No items found</h3>
        <p>Try adjusting your search or clearing the filters.</p>
      </div>`;
    return;
  }

  itemsGrid.innerHTML = items.map(item => createItemCard(item)).join('');

  /* Attach click + keyboard listeners */
  itemsGrid.querySelectorAll('.item-card').forEach(card => {
    card.setAttribute('role', 'listitem');
    card.setAttribute('tabindex', '0');

    const open = () => showItemDetail(card.dataset.id);
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });
}

/* ── Card HTML ──────────────────────────────────────────── */
function createItemCard(item) {
  const imgHTML = item.photo_data
    ? `<img src="${item.photo_data}" alt="${escapeHtml(item.title)}" class="item-image" loading="lazy">`
    : `<div class="item-image placeholder" aria-hidden="true">📦</div>`;

  const dateStr = formatDate(item.date, { month: 'short', day: 'numeric', year: 'numeric' });
  const cat     = getCategoryLabel(item.category);

  return `
    <div class="item-card" data-id="${item.id}" aria-label="${escapeHtml(item.title)} — ${item.type}">
      <div class="item-image-wrapper">
        <div class="item-card-badge-container">
          <span class="item-badge badge-${item.type}">${item.type === 'lost' ? '🔴' : '🟢'} ${item.type}</span>
        </div>
        <div class="item-card-status-badge">
          <span class="item-badge badge-${item.status}">${item.status === 'claimed' ? '✅' : '⏳'} ${item.status}</span>
        </div>
        ${imgHTML}
      </div>
      <div class="item-content">
        <div class="item-top">
          <span class="item-category">${escapeHtml(cat)}</span>
          <h3 class="item-title">${escapeHtml(item.title)}</h3>
        </div>
        <p class="item-description">${escapeHtml(item.description)}</p>
        <div class="item-meta">
          <div class="meta-line">
            <span class="meta-icon" aria-hidden="true">📍</span>
            <span>${escapeHtml(item.location)}</span>
          </div>
          <div class="meta-line">
            <span class="meta-icon" aria-hidden="true">📅</span>
            <span>${dateStr}</span>
          </div>
        </div>
      </div>
    </div>`;
}

/* ============================================================
   ITEM DETAIL MODAL
   ============================================================ */
function showItemDetail(itemId) {
  const item = allItems.find(i => i.id === parseInt(itemId, 10));
  if (!item) return;

  currentItemId = item.id;

  const imgHTML = item.photo_data
    ? `<img src="${item.photo_data}" alt="${escapeHtml(item.title)}" class="detail-image">`
    : `<div class="detail-image placeholder" aria-hidden="true">📦</div>`;

  const dateStr = formatDate(item.date, { year: 'numeric', month: 'long', day: 'numeric' });
  const cat     = getCategoryLabel(item.category);

  const claimBtn = item.status === 'unclaimed'
    ? `<button class="btn btn-success-gradient" onclick="openClaimModal(${item.id})">
         🔑 Mark as Claimed
       </button>`
    : `<span class="item-badge badge-claimed" style="padding:10px 16px;font-size:0.85rem;">✅ Already Claimed</span>`;

  document.getElementById('itemDetail').innerHTML = `
    <div class="detail-container">
      <div class="detail-image-container">${imgHTML}</div>
      <div class="detail-info">
        <div class="detail-badges">
          <span class="item-badge badge-${item.type}">${item.type === 'lost' ? '🔴' : '🟢'} ${item.type}</span>
          <span class="item-badge badge-${item.status}">${item.status === 'claimed' ? '✅' : '⏳'} ${item.status}</span>
        </div>
        <h2 id="detailModalTitle">${escapeHtml(item.title)}</h2>
        <span class="item-category" style="margin-bottom:18px;">${escapeHtml(cat)}</span>

        <div class="detail-section">
          <h3>Description</h3>
          <p>${escapeHtml(item.description)}</p>
        </div>
        <div class="detail-section">
          <h3>Location</h3>
          <p>📍 ${escapeHtml(item.location)}</p>
        </div>
        <div class="detail-section">
          <h3>Date</h3>
          <p>📅 ${dateStr}</p>
        </div>
        <div class="detail-section">
          <h3>Posted by</h3>
          <div class="detail-contact-card">
            <p>👤 <strong>${escapeHtml(item.contact_name)}</strong></p>
            <p>✉️ ${escapeHtml(item.contact_email)}</p>
          </div>
        </div>

        <div class="detail-actions">
          <button class="btn btn-primary-gradient" onclick="openContactModal(${item.id})">
            ✉️ Contact Owner
          </button>
          ${claimBtn}
        </div>
      </div>
    </div>`;

  openModal(detailModal);
}

function openContactModal(itemId) {
  currentItemId = itemId;
  closeModal(detailModal);
  openModal(messageModal);
}

function openClaimModal(itemId) {
  currentItemId = itemId;
  closeModal(detailModal);
  openModal(claimModal);
}

/* Expose for inline onclick handlers in detail HTML */
window.openContactModal = openContactModal;
window.openClaimModal   = openClaimModal;

/* ============================================================
   FORM HANDLERS
   ============================================================ */

/* ── Post item ──────────────────────────────────────────── */
async function handlePostItem(e) {
  e.preventDefault();

  const data = new FormData(postItemForm);

  /* Basic client-side validation */
  const required = ['type','title','category','description','location','date','contactName','contactEmail'];
  for (const field of required) {
    if (!data.get(field)?.trim()) {
      showToast('Please fill in all required fields.', 'error');
      postItemForm.querySelector(`[name="${field}"]`)?.focus();
      return;
    }
  }

  /* Use already-compressed preview src */
  let photoBase64 = null;
  if (photoInput.files?.length && imagePreview.src) {
    photoBase64 = imagePreview.src;
  }

  const payload = {
    type:          data.get('type'),
    title:         data.get('title').trim(),
    category:      data.get('category'),
    description:   data.get('description').trim(),
    location:      data.get('location').trim(),
    date:          data.get('date'),
    contact_name:  data.get('contactName').trim(),
    contact_email: data.get('contactEmail').trim(),
    photo_data:    photoBase64,
  };

  setButtonLoading(submitPostBtn, true);
  try {
    const res = await fetch(`${API}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || err.error || 'Failed to post item');
    }
    showToast('Listing published successfully!', 'success');
    closeModal(postModal);
    loadItems();
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Failed to post item. Try again.', 'error');
  } finally {
    setButtonLoading(submitPostBtn, false);
  }
}

/* ── Send message ───────────────────────────────────────── */
async function handleSendMessage(e) {
  e.preventDefault();

  const data = new FormData(messageForm);

  const payload = {
    item_id:      currentItemId,
    sender_name:  data.get('senderName').trim(),
    sender_email: data.get('senderEmail').trim(),
    message:      data.get('message').trim(),
  };

  if (!payload.sender_name || !payload.sender_email || !payload.message) {
    showToast('Please fill in all fields.', 'error');
    return;
  }

  setButtonLoading(submitMessageBtn, true);
  try {
    const res = await fetch(`${API}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to send message');
    showToast('Message sent! The owner has been notified.', 'success');
    closeModal(messageModal);
  } catch (err) {
    console.error(err);
    showToast('Failed to deliver message. Try again.', 'error');
  } finally {
    setButtonLoading(submitMessageBtn, false);
  }
}

/* ── Claim item ─────────────────────────────────────────── */
async function handleClaimSubmit(e) {
  e.preventDefault();

  const email = document.getElementById('claimEmail').value.trim();
  if (!email) { showToast('Please enter the verification email.', 'error'); return; }

  setButtonLoading(submitClaimBtn, true);
  try {
    const res = await fetch(`${API}/items/${currentItemId}/claim`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_email: email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Verification failed');
    }
    showToast('Item marked as claimed!', 'success');
    closeModal(claimModal);
    loadItems();
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Email verification failed.', 'error');
  } finally {
    setButtonLoading(submitClaimBtn, false);
  }
}

/* ============================================================
   FILTER & SORT ENGINE
   ============================================================ */
function filterAndSort() {
  const q      = searchInput.value.trim().toLowerCase();
  const type   = typeFilter.value;
  const cat    = categoryFilter.value;
  const status = statusFilter.value;
  const sort   = sortBy.value;

  let result = allItems.filter(item => {
    if (type   !== 'all' && item.type     !== type)   return false;
    if (cat    !== 'all' && item.category !== cat)    return false;
    if (status !== 'all' && item.status   !== status) return false;
    if (q) {
      const haystack = `${item.title} ${item.description} ${item.location}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  if (sort === 'newest')       result.sort((a, b) => new Date(b.date) - new Date(a.date));
  else if (sort === 'oldest')  result.sort((a, b) => new Date(a.date) - new Date(b.date));
  else if (sort === 'alphabetical') result.sort((a, b) => a.title.localeCompare(b.title));

  displayItems(result);
}

function resetFilters() {
  searchInput.value    = '';
  typeFilter.value     = 'all';
  categoryFilter.value = 'all';
  statusFilter.value   = 'all';
  sortBy.value         = 'newest';
  filterAndSort();
  showToast('Filters cleared', 'info');
}

/* ============================================================
   PHOTO HANDLING
   ============================================================ */
function setMaxDate() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('date')?.setAttribute('max', today);
}

async function handleImagePreview(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showToast('Image must be under 5 MB.', 'error');
    clearImagePreview();
    return;
  }

  try {
    const compressed = await compressImage(file);
    imagePreview.src = compressed;
    imagePreviewContainer.style.display = 'block';
    imagePreview.setAttribute('alt', 'Preview of ' + escapeHtml(file.name));
  } catch {
    showToast('Could not load image preview.', 'error');
  }
}

function clearImagePreview() {
  photoInput.value = '';
  imagePreview.src = '';
  imagePreviewContainer.style.display = 'none';
  imagePreview.removeAttribute('alt');
}

function compressImage(file, maxW = 800, maxH = 800, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        if (h > maxH) { w = Math.round(w * maxH / h); h = maxH; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ============================================================
   TOAST SYSTEM
   ============================================================ */
function showToast(message, type = 'info', title = '') {
  const icon  = TOAST_ICONS[type] ?? 'ℹ️';
  const label = title || { success:'Done', error:'Error', warning:'Heads up', info:'Info' }[type] || 'Notice';

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${icon}</span>
    <div class="toast-body">
      <div class="toast-title">${escapeHtml(label)}</div>
      <div class="toast-message">${escapeHtml(message)}</div>
    </div>
    <button class="toast-close" type="button" aria-label="Dismiss notification">&#x2715;</button>`;

  toastContainer.appendChild(toast);

  const dismiss = () => {
    clearTimeout(timer);
    if (toast.classList.contains('toast-exit')) return;
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
    setTimeout(() => toast.remove(), 400); /* fallback */
  };

  const timer = setTimeout(dismiss, 4500);
  toast.querySelector('.toast-close').addEventListener('click', dismiss);

  /* Limit stacked toasts to 5 */
  const toasts = toastContainer.querySelectorAll('.toast:not(.toast-exit)');
  if (toasts.length > 5) toasts[0].querySelector('.toast-close')?.click();
}

/* ============================================================
   BUTTON LOADING STATE
   ============================================================ */
function setButtonLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.classList.add('btn-loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('btn-loading');
    btn.disabled = false;
  }
}

/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */
function debounce(fn, wait) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
  })[c]);
}

function getCategoryLabel(cat) {
  return CATEGORY_LABELS[cat] || (cat ? String(cat) : '');
}

function formatDate(dateStr, opts = {}) {
  const d = new Date(dateStr);
  /* Use UTC to avoid timezone date-shifting */
  const utc = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
  return utc.toLocaleDateString(undefined, opts);
}
