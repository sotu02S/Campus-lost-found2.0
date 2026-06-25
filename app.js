// API Base URL (replace with your Vercel deployment URL)
const API_BASE_URL = '/api';

// DOM Elements
const postItemBtn = document.getElementById('postItemBtn');
const postModal = document.getElementById('postModal');
const detailModal = document.getElementById('detailModal');
const messageModal = document.getElementById('messageModal');
const claimModal = document.getElementById('claimModal');

const postItemForm = document.getElementById('postItemForm');
const messageForm = document.getElementById('messageForm');
const claimForm = document.getElementById('claimForm');

const itemsGrid = document.getElementById('itemsGrid');
const searchInput = document.getElementById('searchInput');
const typeFilter = document.getElementById('typeFilter');
const categoryFilter = document.getElementById('categoryFilter');
const statusFilter = document.getElementById('statusFilter');
const sortBy = document.getElementById('sortBy');
const clearFilters = document.getElementById('clearFilters');

// Photo Upload Elements
const photoInput = document.getElementById('photo');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');
const removePreviewBtn = document.getElementById('removePreviewBtn');

// Toast Container
const toastContainer = document.getElementById('toastContainer');

// State
let allItems = [];
let currentItemId = null;

const CATEGORY_LABELS = {
    electronics: 'Electronics',
    clothing: 'Clothing',
    books: 'Books & Stationery',
    accessories: 'Accessories',
    keys: 'Keys & Cards',
    other: 'Other'
};

function getCategoryLabel(category) {
    if (!category) return '';
    return CATEGORY_LABELS[category] || category;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadItems();
    setupEventListeners();
    setMaxDate();
});

// Setup Event Listeners
function setupEventListeners() {
    // Modal Open triggers
    postItemBtn.addEventListener('click', () => openModal(postModal));
    
    // Modal Close triggers (using data attributes)
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const targetModalId = this.getAttribute('data-modal');
            const targetModal = document.getElementById(targetModalId);
            if (targetModal) {
                closeModal(targetModal);
            }
        });
    });

    document.getElementById('cancelPost').addEventListener('click', () => closeModal(postModal));
    document.getElementById('cancelMessage').addEventListener('click', () => closeModal(messageModal));
    document.getElementById('cancelClaim').addEventListener('click', () => closeModal(claimModal));
    
    // Close modal on clicking backdrop
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }
    });

    // Form submissions
    postItemForm.addEventListener('submit', handlePostItem);
    messageForm.addEventListener('submit', handleSendMessage);
    claimForm.addEventListener('submit', handleClaimItemSubmit);

    // Search and filters
    searchInput.addEventListener('input', filterAndSortItems);
    typeFilter.addEventListener('change', filterAndSortItems);
    categoryFilter.addEventListener('change', filterAndSortItems);
    statusFilter.addEventListener('change', filterAndSortItems);
    sortBy.addEventListener('change', filterAndSortItems);
    clearFilters.addEventListener('click', resetFilters);

    // Photo input preview listeners
    photoInput.addEventListener('change', handleImagePreview);
    removePreviewBtn.addEventListener('click', clearImagePreview);
}

// Modal Control Functions
function openModal(modal) {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
    
    // Reset specific forms and states on close
    if (modal === postModal) {
        postItemForm.reset();
        clearImagePreview();
    }
    if (modal === messageModal) {
        messageForm.reset();
    }
    if (modal === claimModal) {
        claimForm.reset();
    }
}

// Set max date to today
function setMaxDate() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.setAttribute('max', today);
    }
}

// Handle Image Preview
async function handleImagePreview(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showToast('Photo size must be less than 5MB', 'error');
        photoInput.value = '';
        return;
    }

    try {
        const base64Data = await fileToBase64(file);
        imagePreview.src = base64Data;
        imagePreviewContainer.style.display = 'block';
    } catch (error) {
        console.error('Image preview error:', error);
        showToast('Failed to load image preview', 'error');
    }
}

// Clear Image Preview
function clearImagePreview() {
    photoInput.value = '';
    imagePreview.src = '';
    imagePreviewContainer.style.display = 'none';
}

// Reusable Custom Toast System
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    toast.innerHTML = `
        <span class="toast-message">${escapeHtml(message)}</span>
        <button class="toast-close" type="button">&times;</button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Setup automatic removal after 4 seconds
    const autoRemoveTimeout = setTimeout(() => {
        dismissToast(toast);
    }, 4000);
    
    // Close button event
    toast.querySelector('.toast-close').addEventListener('click', () => {
        clearTimeout(autoRemoveTimeout);
        dismissToast(toast);
    });
}

function dismissToast(toast) {
    if (toast.classList.contains('toast-exit')) return; // prevent double-dismiss
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => {
        if (toast.parentNode) toast.remove();
    });
    // Fallback if animationend doesn't fire
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 500);
}

// Render Loading Skeleton Cards
function renderSkeletons() {
    itemsGrid.innerHTML = Array(6).fill(0).map(() => `
        <div class="skeleton-card">
            <div class="skeleton-image"></div>
            <div class="skeleton-content">
                <div class="skeleton-text badge"></div>
                <div class="skeleton-text title"></div>
                <div class="skeleton-text desc"></div>
                <div class="skeleton-text desc-short"></div>
            </div>
        </div>
    `).join('');
}

// Load Items from API
async function loadItems() {
    try {
        renderSkeletons();
        const response = await fetch(`${API_BASE_URL}/items`);
        
        if (!response.ok) {
            throw new Error('Failed to load items');
        }
        
        allItems = await response.json();
        filterAndSortItems();
    } catch (error) {
        console.error('Error loading items:', error);
        showToast('Unable to connect to database server', 'error');
        itemsGrid.innerHTML = `
            <div class="no-items">
                <h3>Unable to load items</h3>
                <p>Ensure your database connection settings are correct and try again.</p>
            </div>
        `;
    }
}

// Display Items
function displayItems(items) {
    if (items.length === 0) {
        itemsGrid.innerHTML = `
            <div class="no-items">
                <h3>No items found</h3>
                <p>Try adjusting your search query or filters.</p>
            </div>
        `;
        return;
    }

    itemsGrid.innerHTML = items.map(item => createItemCard(item)).join('');
    
    // Attach click event listeners dynamically
    document.querySelectorAll('.item-card').forEach(card => {
        card.addEventListener('click', () => {
            const itemId = card.dataset.id;
            showItemDetail(itemId);
        });
    });
}

// Create Item Card HTML
function createItemCard(item) {
    const imageHTML = item.photo_data 
        ? `<img src="${item.photo_data}" alt="${escapeHtml(item.title)}" class="item-image">`
        : `<div class="item-image placeholder">📦</div>`;
    
    const dateStr = new Date(item.date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    
    const categoryLabel = getCategoryLabel(item.category);
    
    return `
        <div class="item-card" data-id="${item.id}">
            <div class="item-image-wrapper">
                <div class="item-card-badge-container">
                    <span class="item-badge badge-${item.type}">${item.type}</span>
                </div>
                <div class="item-card-status-badge">
                    <span class="item-badge badge-${item.status}">${item.status}</span>
                </div>
                ${imageHTML}
            </div>
            <div class="item-content">
                <div class="item-top">
                    <span class="item-category">${escapeHtml(categoryLabel)}</span>
                    <h3 class="item-title">${escapeHtml(item.title)}</h3>
                </div>
                <p class="item-description">${escapeHtml(item.description)}</p>
                <div class="item-meta">
                    <div class="meta-line">
                        <span class="meta-icon">📍</span>
                        <span>${escapeHtml(item.location)}</span>
                    </div>
                    <div class="meta-line">
                        <span class="meta-icon">📅</span>
                        <span>${dateStr}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Show Item Detail Modal
function showItemDetail(itemId) {
    const item = allItems.find(i => i.id === parseInt(itemId));
    if (!item) return;

    currentItemId = item.id;
    
    const imageHTML = item.photo_data 
        ? `<img src="${item.photo_data}" alt="${escapeHtml(item.title)}" class="detail-image">`
        : `<div class="detail-image placeholder">📦</div>`;
    
    const dateStr = new Date(item.date).toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    const categoryLabel = getCategoryLabel(item.category);

    const claimButton = item.status === 'unclaimed' 
        ? `<button class="btn btn-success-gradient" onclick="openClaimModal(${item.id})">🔑 Mark as Claimed</button>`
        : '';

    document.getElementById('itemDetail').innerHTML = `
        <div class="detail-container">
            <div class="detail-image-container">
                ${imageHTML}
            </div>
            <div class="detail-info">
                <div class="detail-badges">
                    <span class="item-badge badge-${item.type}">${item.type}</span>
                    <span class="item-badge badge-${item.status}">${item.status}</span>
                </div>
                <h2>${escapeHtml(item.title)}</h2>
                <span class="item-category" style="margin-bottom: 20px;">${escapeHtml(categoryLabel)}</span>
                
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
                    <h3>Listing Contact</h3>
                    <div class="detail-contact-card">
                        <p>👤 <strong>${escapeHtml(item.contact_name)}</strong></p>
                        <p>✉️ ${escapeHtml(item.contact_email)}</p>
                    </div>
                </div>
                
                <div class="detail-actions">
                    <button class="btn btn-primary-gradient" onclick="openContactModal(${item.id})">✉️ Contact Owner</button>
                    ${claimButton}
                </div>
            </div>
        </div>
    `;
    
    openModal(detailModal);
}

// Open Contact Modal
function openContactModal(itemId) {
    currentItemId = itemId;
    closeModal(detailModal);
    openModal(messageModal);
}

// Open Claim Modal
function openClaimModal(itemId) {
    currentItemId = itemId;
    closeModal(detailModal);
    openModal(claimModal);
}

// Handle Post Item Submit
async function handlePostItem(e) {
    e.preventDefault();
    
    const formData = new FormData(postItemForm);
    const photoFile = formData.get('photo');
    
    let photoBase64 = null;
    if (photoFile && photoFile.size > 0) {
        photoBase64 = await fileToBase64(photoFile);
    }
    
    const itemData = {
        type: formData.get('type'),
        title: formData.get('title'),
        category: formData.get('category'),
        description: formData.get('description'),
        location: formData.get('location'),
        date: formData.get('date'),
        contact_name: formData.get('contactName'),
        contact_email: formData.get('contactEmail'),
        photo_data: photoBase64
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/items`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(itemData)
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to post item');
        }
        
        showToast('Item listing created successfully!', 'success');
        closeModal(postModal);
        loadItems();
    } catch (error) {
        console.error('Error posting item:', error);
        showToast(error.message || 'Failed to post item. Try again.', 'error');
    }
}

// Handle Send Message Submit
async function handleSendMessage(e) {
    e.preventDefault();
    
    const formData = new FormData(messageForm);
    const messageData = {
        item_id: currentItemId,
        sender_name: formData.get('senderName'),
        sender_email: formData.get('senderEmail'),
        message: formData.get('message')
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(messageData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to send message');
        }
        
        showToast('Message sent! The owner was notified.', 'success');
        closeModal(messageModal);
    } catch (error) {
        console.error('Error sending message:', error);
        showToast('Failed to deliver message. Try again.', 'error');
    }
}

// Handle Claim Item Submission (Verification check)
async function handleClaimItemSubmit(e) {
    e.preventDefault();
    
    const emailInput = document.getElementById('claimEmail').value;
    if (!emailInput) return;

    try {
        const response = await fetch(`${API_BASE_URL}/items/${currentItemId}/claim`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ contact_email: emailInput.trim() })
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Verification failed');
        }
        
        showToast('Item successfully marked as claimed!', 'success');
        closeModal(claimModal);
        loadItems();
    } catch (error) {
        console.error('Error marking as claimed:', error);
        showToast(error.message || 'Email verification failed.', 'error');
    }
}

// Filter and Sort Engine
function filterAndSortItems() {
    const searchTerm = searchInput.value.toLowerCase();
    const typeValue = typeFilter.value;
    const categoryValue = categoryFilter.value;
    const statusValue = statusFilter.value;
    const sortValue = sortBy.value;
    
    // Apply Filtering
    let filtered = allItems.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm) ||
                            item.description.toLowerCase().includes(searchTerm) ||
                            item.location.toLowerCase().includes(searchTerm);
        
        const matchesType = typeValue === 'all' || item.type === typeValue;
        const matchesCategory = categoryValue === 'all' || item.category === categoryValue;
        const matchesStatus = statusValue === 'all' || item.status === statusValue;
        
        return matchesSearch && matchesType && matchesCategory && matchesStatus;
    });
    
    // Apply Sorting
    if (sortValue === 'newest') {
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (sortValue === 'oldest') {
        filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (sortValue === 'alphabetical') {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
    }
    
    displayItems(filtered);
}

// Reset Filters
function resetFilters() {
    searchInput.value = '';
    typeFilter.value = 'all';
    categoryFilter.value = 'all';
    statusFilter.value = 'all';
    sortBy.value = 'newest';
    displayItems(allItems);
    showToast('Filters cleared', 'info');
}

// Utility Functions
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const safeText = String(text);
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return safeText.replace(/[&<>"']/g, m => map[m]);
}

// Global functions for inline HTML events
window.openClaimModal = openClaimModal;
window.openContactModal = openContactModal;
