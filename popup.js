const PLATFORMS_META = [
    { id: 'ebay', baseName: 'eBay', desc: 'Category-specific final value fee + $0.30' },
    { id: 'amazon', baseName: 'Amazon', desc: 'Category referral fee (+ closing fee for media)' },
    { id: 'walmart', baseName: 'Walmart', desc: '15% referral fee (8% for electronics), $0.00 fixed' },
    { id: 'poshmark', baseName: 'Poshmark', desc: '20.00% flat sales fee' },
    { id: 'stripe', baseName: 'Direct / Stripe', desc: '2.90% + $0.30 payment fee' }
];

const CATEGORY_RATES = {
    general: {
        ebay: { rate: 0.1325, fixed: 0.30, label: 'eBay (~13.25% + $0.30)' },
        amazon: { rate: 0.15, fixed: 0.00, label: 'Amazon (15%)' },
        walmart: { rate: 0.15, fixed: 0.00, label: 'Walmart (15%)' },
        poshmark: { rate: 0.20, fixed: 0.00, label: 'Poshmark (20%)' },
        stripe: { rate: 0.029, fixed: 0.30, label: 'Direct / Stripe (2.9% + $0.30)' }
    },
    electronics: {
        ebay: { rate: 0.0935, fixed: 0.30, label: 'eBay (~9.35% + $0.30)' },
        amazon: { rate: 0.08, fixed: 0.00, label: 'Amazon (8%)' },
        walmart: { rate: 0.08, fixed: 0.00, label: 'Walmart (8%)' },
        poshmark: { rate: 0.20, fixed: 0.00, label: 'Poshmark (20%)' },
        stripe: { rate: 0.029, fixed: 0.30, label: 'Direct / Stripe (2.9% + $0.30)' }
    },
    apparel: {
        ebay: { rate: 0.15, fixed: 0.30, label: 'eBay (15% + $0.30)' },
        amazon: { rate: 0.17, fixed: 0.00, label: 'Amazon (17%)' },
        walmart: { rate: 0.15, fixed: 0.00, label: 'Walmart (15%)' },
        poshmark: { rate: 0.20, fixed: 0.00, label: 'Poshmark (20%)' },
        stripe: { rate: 0.029, fixed: 0.30, label: 'Direct / Stripe (2.9% + $0.30)' }
    },
    media: {
        ebay: { rate: 0.146, fixed: 0.30, label: 'eBay (14.6% + $0.30)' },
        amazon: { rate: 0.15, fixed: 1.80, label: 'Amazon (15% + $1.80)' },
        walmart: { rate: 0.15, fixed: 0.00, label: 'Walmart (15%)' },
        poshmark: { rate: 0.20, fixed: 0.00, label: 'Poshmark (20%)' },
        stripe: { rate: 0.029, fixed: 0.30, label: 'Direct / Stripe (2.9% + $0.30)' }
    }
};

const STORAGE_KEY = 'seller_calc_enabled_stores';
const PRO_STORAGE_KEY = 'seller_calc_is_pro';
const SOURCING_STORAGE_KEY = 'seller_calc_sourcing_list';
const MAX_SOURCING_ITEMS = 50;

// State
let currentScrapedUrl = '';

// DOM Elements - Views
const calcView = document.getElementById('calcView');
const settingsView = document.getElementById('settingsView');
const sourcingView = document.getElementById('sourcingView');
const proModal = document.getElementById('proModal');

// Navigation Buttons
const toSettingsBtn = document.getElementById('toSettingsBtn');
const toCalcBtn = document.getElementById('toCalcBtn');
const headerListBtn = document.getElementById('headerListBtn');
const headerListCount = document.getElementById('headerListCount');
const toCalcFromListBtn = document.getElementById('toCalcFromListBtn');

// Pro Tier Elements
const proBadgeBtn = document.getElementById('proBadgeBtn');
const tierText = document.getElementById('tierText');
const closeProModalBtn = document.getElementById('closeProModalBtn');
const toggleProStatusBtn = document.getElementById('toggleProStatusBtn');

// Scraping & Input Elements
const scrapeBtn = document.getElementById('scrapeBtn');
const scrapeStatus = document.getElementById('scrapeStatus');
const scrapedItemBanner = document.getElementById('scrapedItemBanner');
const scrapedPlatform = document.getElementById('scrapedPlatform');
const scrapedTitleText = document.getElementById('scrapedTitleText');
const clearScrapedBtn = document.getElementById('clearScrapedBtn');

const categorySelect = document.getElementById('category');
const costInput = document.getElementById('cost');
const sellPriceInput = document.getElementById('sellPrice');
const shippingInput = document.getElementById('shipping');
const tableBody = document.getElementById('tableBody');
const resultsSection = document.getElementById('resultsSection');
const noStoresMsg = document.getElementById('noStoresMsg');
const storesList = document.getElementById('storesList');

// Sourcing List & CSV Elements
const sourcingActionBar = document.getElementById('sourcingActionBar');
const saveToSourcingBtn = document.getElementById('saveToSourcingBtn');
const openSourcingListBtn = document.getElementById('openSourcingListBtn');
const sourcingCountBadge = document.getElementById('sourcingCountBadge');
const sourcingListTitleCount = document.getElementById('sourcingListTitleCount');
const statTotalItems = document.getElementById('statTotalItems');
const statTotalProfit = document.getElementById('statTotalProfit');
const statAvgRoi = document.getElementById('statAvgRoi');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const clearSourcingListBtn = document.getElementById('clearSourcingListBtn');
const sourcingItemsContainer = document.getElementById('sourcingItemsContainer');

// --- PRO TIER STATE MANAGEMENT ---
function isPro() {
    try {
        const val = localStorage.getItem(PRO_STORAGE_KEY);
        return val === 'true';
    } catch (e) {
        return false;
    }
}

function setPro(status) {
    try {
        localStorage.setItem(PRO_STORAGE_KEY, status ? 'true' : 'false');
    } catch (e) {
        console.error('Error saving pro state', e);
    }
    updateProUI();
}

function updateProUI() {
    const userIsPro = isPro();
    if (userIsPro) {
        tierText.textContent = 'PRO';
        proBadgeBtn.classList.add('is-pro');
        toggleProStatusBtn.textContent = 'Switch to Free Tier (Demo)';
    } else {
        tierText.textContent = 'Free';
        proBadgeBtn.classList.remove('is-pro');
        toggleProStatusBtn.textContent = '⭐ Activate Pro Tier (Demo / Full Access)';
    }
}

proBadgeBtn.addEventListener('click', () => {
    proModal.style.display = 'flex';
});

closeProModalBtn.addEventListener('click', () => {
    proModal.style.display = 'none';
});

toggleProStatusBtn.addEventListener('click', () => {
    const current = isPro();
    setPro(!current);
    showStatus(
        !current ? '👑 Seller Pro Tier Activated!' : 'Switched back to Free Tier.',
        !current ? 'status-success' : 'status-warn'
    );
    proModal.style.display = 'none';
});

// Toast Helper
let statusTimeout;
function showStatus(msg, type = 'status-success') {
    if (!scrapeStatus) return;
    clearTimeout(statusTimeout);
    scrapeStatus.className = `scrape-status ${type}`;
    scrapeStatus.textContent = msg;
    scrapeStatus.style.display = 'block';
    statusTimeout = setTimeout(() => {
        scrapeStatus.style.display = 'none';
    }, 4500);
}

// Clear Scraped Item Info
clearScrapedBtn.addEventListener('click', () => {
    scrapedItemBanner.style.display = 'none';
    scrapedTitleText.textContent = '';
    currentScrapedUrl = '';
});

// --- SOURCING LIST MANAGEMENT ---
function getSourcingList() {
    try {
        const stored = localStorage.getItem(SOURCING_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Error reading sourcing list', e);
    }
    return [];
}

function saveSourcingList(list) {
    try {
        localStorage.setItem(SOURCING_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
        console.error('Error saving sourcing list', e);
    }
    updateSourcingBadges();
}

function updateSourcingBadges() {
    const list = getSourcingList();
    const count = list.length;
    const countStr = `${count}/${MAX_SOURCING_ITEMS}`;
    
    if (headerListCount) headerListCount.textContent = count;
    if (sourcingCountBadge) sourcingCountBadge.textContent = countStr;
    if (sourcingListTitleCount) sourcingListTitleCount.textContent = count;
    if (statTotalItems) statTotalItems.textContent = countStr;
}

function renderSourcingView() {
    const list = getSourcingList();
    updateSourcingBadges();
    sourcingItemsContainer.innerHTML = '';

    if (list.length === 0) {
        sourcingItemsContainer.innerHTML = `
            <div class="empty-sourcing-msg">
                <strong>Your Sourcing List is empty.</strong><br>
                Calculate item margins or 1-Click scrape listings, then click <strong>"💾 Save to Sourcing List"</strong> to track up to 50 scouted items with their direct product URLs.
            </div>
        `;
        statTotalProfit.textContent = '$0.00';
        statAvgRoi.textContent = '0%';
        return;
    }

    let totalProfit = 0;
    let totalRoi = 0;

    list.forEach((item, idx) => {
        totalProfit += (item.bestProfit || 0);
        totalRoi += (item.bestRoi || 0);

        const card = document.createElement('div');
        card.className = 'sourcing-item-card';

        const isNegative = (item.bestProfit || 0) < 0;
        const profitFormatted = isNegative
            ? `-$${Math.abs(item.bestProfit).toFixed(2)}`
            : `+$${(item.bestProfit || 0).toFixed(2)}`;

        const urlLinkHtml = item.url ? `<a href="${item.url}" target="_blank" class="item-link" title="Open product page">🔗 Link</a>` : '';

        card.innerHTML = `
            <div class="item-header">
                <div style="display: flex; align-items: center; overflow: hidden;">
                    <span class="item-title" title="${item.title}">${item.title}</span>
                    ${urlLinkHtml}
                </div>
                <button class="item-delete-btn" data-index="${idx}" title="Remove item">×</button>
            </div>
            <div class="item-details">
                <span>Cost: $${item.cost.toFixed(2)} → Sell: $${item.sellPrice.toFixed(2)}</span>
                <div class="item-metrics">
                    <span>${item.bestChannel}</span>
                    <span class="item-profit-badge ${isNegative ? 'negative' : ''}">${profitFormatted} (${item.bestRoi.toFixed(0)}%)</span>
                </div>
            </div>
        `;

        const delBtn = card.querySelector('.item-delete-btn');
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteSourcingItem(idx);
        });

        sourcingItemsContainer.appendChild(card);
    });

    const avgRoi = list.length > 0 ? (totalRoi / list.length) : 0;
    statTotalProfit.textContent = totalProfit >= 0 ? `$${totalProfit.toFixed(2)}` : `-$${Math.abs(totalProfit).toFixed(2)}`;
    statAvgRoi.textContent = `${avgRoi.toFixed(0)}%`;
}

function deleteSourcingItem(index) {
    const list = getSourcingList();
    if (index >= 0 && index < list.length) {
        const removed = list.splice(index, 1);
        saveSourcingList(list);
        renderSourcingView();
        showStatus(`🗑️ Removed "${removed[0]?.title || 'Item'}" from Sourcing List.`);
    }
}

clearSourcingListBtn.addEventListener('click', () => {
    const list = getSourcingList();
    if (list.length === 0) return;
    if (confirm('Are you sure you want to clear all items in your Sourcing List?')) {
        saveSourcingList([]);
        renderSourcingView();
        showStatus('🗑️ Sourcing List cleared.');
    }
});

// Save Current Calculation to Sourcing List
saveToSourcingBtn.addEventListener('click', async () => {
    if (!isPro()) {
        proModal.style.display = 'flex';
        showStatus('📊 Sourcing List & CSV Export is a Pro feature. Unlock below!', 'status-warn');
        return;
    }

    const cost = parseFloat(costInput.value) || 0;
    const sellPrice = parseFloat(sellPriceInput.value);
    const shipping = parseFloat(shippingInput.value) || 0;

    if (isNaN(sellPrice) || sellPrice <= 0) {
        showStatus('⚠️ Please enter a valid selling price before saving.', 'status-warn');
        return;
    }

    const list = getSourcingList();
    if (list.length >= MAX_SOURCING_ITEMS) {
        showStatus(`⚠️ Sourcing List full (${MAX_SOURCING_ITEMS}/${MAX_SOURCING_ITEMS} max). Export CSV or remove items.`, 'status-warn');
        return;
    }

    const selectedCategory = (categorySelect && categorySelect.value) || 'general';
    const categoryRates = CATEGORY_RATES[selectedCategory] || CATEGORY_RATES.general;
    const enabledStores = getEnabledStores();
    const activePlatforms = PLATFORMS_META.filter(p => enabledStores[p.id] !== false);

    let maxProfit = -Infinity;
    let bestChannel = 'Direct / Stripe';
    let bestRoi = 0;
    let minBreakEven = 0;
    const platformBreakdown = {};

    activePlatforms.forEach(p => {
        const platformRate = categoryRates[p.id] || { rate: 0, fixed: 0, label: p.baseName };
        const fee = (sellPrice * platformRate.rate) + platformRate.fixed;
        const profit = sellPrice - (cost + shipping + fee);
        const roi = cost > 0 ? (profit / cost) * 100 : 0;
        const denom = 1 - platformRate.rate;
        const breakEven = denom > 0 ? (cost + shipping + platformRate.fixed) / denom : 0;

        platformBreakdown[p.id] = { fee, profit, roi, breakEven };

        if (profit > maxProfit) {
            maxProfit = profit;
            bestChannel = p.baseName;
            bestRoi = roi;
            minBreakEven = breakEven;
        }
    });

    const scrapedTitle = scrapedTitleText && scrapedTitleText.textContent.trim();
    const itemTitle = scrapedTitle || `Scouted Item #${list.length + 1} (${selectedCategory})`;

    // Capture URL from scraped item or active browser tab
    let productUrl = currentScrapedUrl || '';
    if (!productUrl && typeof chrome !== 'undefined' && chrome.tabs) {
        try {
            const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
            if (tabs && tabs[0] && tabs[0].url && !tabs[0].url.startsWith('chrome')) {
                productUrl = tabs[0].url;
            }
        } catch (e) {}
    }

    const newItem = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString(),
        timestamp: new Date().toISOString(),
        title: itemTitle,
        category: categorySelect ? categorySelect.options[categorySelect.selectedIndex].text : selectedCategory,
        url: productUrl,
        cost,
        sellPrice,
        shipping,
        bestChannel,
        bestProfit: maxProfit,
        bestRoi,
        breakEven: minBreakEven,
        breakdown: platformBreakdown
    };

    list.unshift(newItem);
    saveSourcingList(list);
    showStatus(`💾 Saved "${itemTitle.substring(0, 25)}..." to Sourcing List (${list.length}/${MAX_SOURCING_ITEMS})`, 'status-success');
});

// CSV Export Engine with Product URL
exportCsvBtn.addEventListener('click', () => {
    if (!isPro()) {
        proModal.style.display = 'flex';
        showStatus('📊 CSV Export requires Seller Pro. Unlock below!', 'status-warn');
        return;
    }

    const list = getSourcingList();
    if (list.length === 0) {
        showStatus('⚠️ Sourcing List is empty. Save items before exporting.', 'status-warn');
        return;
    }

    const headers = [
        "Date",
        "Item Title",
        "Category",
        "Product URL",
        "Item Cost ($)",
        "Sell Price ($)",
        "Shipping ($)",
        "Break-Even Price ($)",
        "Best Channel",
        "Best Net Profit ($)",
        "Best ROI (%)",
        "eBay Net Profit ($)",
        "Amazon Net Profit ($)",
        "Walmart Net Profit ($)",
        "Poshmark Net Profit ($)",
        "Direct/Stripe Net Profit ($)"
    ];

    const escapeCsv = (val) => {
        if (val === undefined || val === null) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
    };

    const rows = list.map(item => {
        const ebayP = item.breakdown?.ebay?.profit !== undefined ? item.breakdown.ebay.profit.toFixed(2) : 'N/A';
        const amazonP = item.breakdown?.amazon?.profit !== undefined ? item.breakdown.amazon.profit.toFixed(2) : 'N/A';
        const walmartP = item.breakdown?.walmart?.profit !== undefined ? item.breakdown.walmart.profit.toFixed(2) : 'N/A';
        const poshP = item.breakdown?.poshmark?.profit !== undefined ? item.breakdown.poshmark.profit.toFixed(2) : 'N/A';
        const stripeP = item.breakdown?.stripe?.profit !== undefined ? item.breakdown.stripe.profit.toFixed(2) : 'N/A';

        return [
            escapeCsv(item.date),
            escapeCsv(item.title),
            escapeCsv(item.category),
            escapeCsv(item.url || 'N/A'),
            item.cost.toFixed(2),
            item.sellPrice.toFixed(2),
            item.shipping.toFixed(2),
            item.breakEven ? item.breakEven.toFixed(2) : '0.00',
            escapeCsv(item.bestChannel),
            item.bestProfit.toFixed(2),
            item.bestRoi.toFixed(0),
            ebayP,
            amazonP,
            walmartP,
            poshP,
            stripeP
        ].join(',');
    });

    const csvContent = "\uFEFF" + [headers.map(escapeCsv).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `sourcing_scout_list_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showStatus(`📥 Clean CSV spreadsheet exported (${list.length} scouted items with product URLs)!`, 'status-success');
});

// View Navigation Listeners
headerListBtn.addEventListener('click', () => {
    calcView.style.display = 'none';
    settingsView.style.display = 'none';
    sourcingView.style.display = 'block';
    renderSourcingView();
});

openSourcingListBtn.addEventListener('click', () => {
    calcView.style.display = 'none';
    settingsView.style.display = 'none';
    sourcingView.style.display = 'block';
    renderSourcingView();
});

toCalcFromListBtn.addEventListener('click', () => {
    sourcingView.style.display = 'none';
    calcView.style.display = 'block';
    calculate();
});

toSettingsBtn.addEventListener('click', () => {
    calcView.style.display = 'none';
    sourcingView.style.display = 'none';
    settingsView.style.display = 'block';
});

toCalcBtn.addEventListener('click', () => {
    settingsView.style.display = 'none';
    calcView.style.display = 'block';
    calculate();
});

// --- 1-CLICK LISTING SCRAPER (PRO FEATURE) ---
scrapeBtn.addEventListener('click', async () => {
    if (!isPro()) {
        proModal.style.display = 'flex';
        showStatus('⚡ 1-Click Scraping requires Seller Pro. Activate Pro below!', 'status-warn');
        return;
    }

    showStatus('🔍 Reading active listing from browser tab...', 'status-warn');

    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting) {
        showStatus('⚠️ Chrome extension API not detected. Please reload the extension in chrome://extensions.', 'status-error');
        return;
    }

    try {
        let tab = null;
        const tabsInLastFocused = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (tabsInLastFocused && tabsInLastFocused.length > 0) {
            tab = tabsInLastFocused[0];
        } else {
            const tabsInCurrent = await chrome.tabs.query({ active: true, currentWindow: true });
            tab = tabsInCurrent && tabsInCurrent[0];
        }

        if (!tab || !tab.id) {
            showStatus('⚠️ No active browser tab detected.', 'status-error');
            return;
        }

        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: extractListingDataFromDOM
        });

        if (results && results[0] && results[0].result) {
            const data = results[0].result;
            if (data.price !== null && data.price > 0) {
                applyScrapedData(data);
            } else if (data.foundPage) {
                showStatus(`⚠️ Found ${data.platform} page, but could not detect a live price. Is it an active listing?`, 'status-warn');
            } else {
                showStatus('⚠️ Current active tab is not a supported Amazon, eBay, or Poshmark listing page.', 'status-warn');
            }
        } else {
            showStatus('⚠️ Could not extract data. Please refresh the listing tab and try again.', 'status-error');
        }
    } catch (err) {
        console.error('Scraping error:', err);
        showStatus('⚠️ Extension needs reload. Go to chrome://extensions and click 🔄 on this extension.', 'status-error');
    }
});

function applyScrapedData(data) {
    if (data.price !== undefined && data.price !== null) {
        const floatPrice = parseFloat(data.price);
        if (!isNaN(floatPrice) && floatPrice > 0) {
            sellPriceInput.value = floatPrice.toFixed(2);
            sellPriceInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
    if (data.shipping !== undefined && data.shipping !== null) {
        const floatShip = parseFloat(data.shipping);
        shippingInput.value = (!isNaN(floatShip) && floatShip >= 0 ? floatShip : 0).toFixed(2);
        shippingInput.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
        shippingInput.value = '0.00';
        shippingInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (data.category && categorySelect) {
        categorySelect.value = data.category;
        categorySelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    currentScrapedUrl = data.url || '';

    if (data.title) {
        scrapedPlatform.textContent = data.platform || 'Listing';
        scrapedTitleText.textContent = data.title;
        scrapedItemBanner.style.display = 'flex';
    }

    const shipInfo = data.shipping > 0 ? ` + $${data.shipping.toFixed(2)} ship` : ' (Free Ship)';
    const shortTitle = data.title ? ` (${data.title.substring(0, 22)}...)` : '';
    showStatus(`✅ Scraped: $${parseFloat(data.price).toFixed(2)}${shipInfo}${shortTitle}`, 'status-success');
    calculate();
}

// Injected into active tab
function extractListingDataFromDOM() {
    try {
        const url = (window.location && window.location.href ? window.location.href : '');
        const urlLower = url.toLowerCase();
        const hostname = (window.location && window.location.hostname ? window.location.hostname : '');
        const isAmazon = hostname.includes('amazon.') || urlLower.includes('amazon.');
        const isEbay = hostname.includes('ebay.') || urlLower.includes('ebay.');
        const isPoshmark = hostname.includes('poshmark.') || urlLower.includes('poshmark.');
        const isWalmart = hostname.includes('walmart.') || urlLower.includes('walmart.');

        const cleanPrice = (str) => {
            if (str === null || str === undefined) return null;
            if (typeof str === 'number') return str > 0 ? parseFloat(str) : null;
            // Clean extracted strings: remove $, USD, commas, and extra whitespace
            const cleanStr = String(str)
                .replace(/USD/gi, '')
                .replace(/[$,]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            const match = cleanStr.match(/([0-9]+(?:\.[0-9]{1,2})?)/);
            if (match && match[1]) {
                const val = parseFloat(match[1]);
                return isNaN(val) || val <= 0 ? null : val;
            }
            return null;
        };

        const parseShippingText = (text) => {
            if (!text) return null;
            const lower = text.toLowerCase().trim();
            if (lower === 'free' || lower === 'free shipping' || lower === 'free delivery' || lower === 'fast \'n free' || lower === 'free standard shipping') {
                return 0.00;
            }
            const patterns = [
                /(?:shipping|delivery|postage)\s*:?\s*(?:us)?\s*\$?\s*([0-9]+\.[0-9]{2})/i,
                /(?:us\s*)?\$([0-9]+\.[0-9]{2})\s*(?:shipping|delivery|postage|standard|expedited|economy|priority)/i,
                /\+\s*\$([0-9]+\.[0-9]{2})/i,
                /(?:or\s+fastest\s+delivery[^\$]*)\$\s*([0-9]+\.[0-9]{2})/i,
                /\$([0-9]+\.[0-9]{2})/
            ];
            for (const pat of patterns) {
                const m = text.match(pat);
                if (m && m[1]) {
                    const val = parseFloat(m[1]);
                    if (!isNaN(val)) return val;
                }
            }
            if (lower.includes('free')) return 0.00;
            return null;
        };

        const detectCategory = (title, extraText, platform) => {
            const rawCombined = `${title || ''} ${extraText || ''}`.toLowerCase();
            const cleanCombined = rawCombined.replace(/[^a-z0-9\s-]/g, ' ');

            // 1. Direct High-Confidence Taxonomy / Breadcrumb Classification
            const strongElectronicsSignals = [
                'electronics', 'electronic', 'cell phones', 'cell phone', 'smartphone',
                'computers', 'computer', 'laptops', 'laptop', 'tablets', 'tablet',
                'audio & sound', 'audio', 'headphones', 'earbuds', 'speakers',
                'cameras, camcorders & drones', 'cameras & photo', 'camera', 'drone',
                'video games & consoles', 'video games', 'gaming console', 'smart home',
                'wearables', 'wearable technology', 'car electronics', 'media players',
                'home audio', 'portable audio', 'computer accessories', 'pc gaming'
            ];
            for (const signal of strongElectronicsSignals) {
                if (rawCombined.includes(signal)) {
                    return 'electronics';
                }
            }

            const strongMediaSignals = [
                'books & magazines', 'textbooks', 'books', 'music & cds', 'vinyl records',
                'movies & tv', 'dvds & blu-ray', 'audiobooks', 'comic books', 'manga'
            ];
            for (const signal of strongMediaSignals) {
                if (rawCombined.includes(signal)) {
                    return 'media';
                }
            }

            // 2. Comprehensive Electronics & Tech Keyword Dictionary
            const electronicsKeywords = [
                // Computing & Peripherals
                'laptop', 'macbook', 'chromebook', 'desktop', 'computer', 'pc', 'monitor', 'display',
                'gpu', 'cpu', 'processor', 'motherboard', 'ram', 'ssd', 'hdd', 'hard drive', 'flash drive',
                'memory card', 'sd card', 'microsd', 'keyboard', 'keycap', 'mouse', 'trackpad', 'webcam',
                'microphone', 'router', 'modem', 'wifi', 'ethernet', 'hub', 'dock', 'docking station',
                'scanner', 'printer', 'toner', 'ink cartridge', 'projector', 'stylus', 'apple pencil',
                // Audio & Sound
                'headphone', 'headphones', 'earbud', 'earbuds', 'airpod', 'airpods', 'headset', 'earphone',
                'earphones', 'speaker', 'speakers', 'soundbar', 'subwoofer', 'amplifier', 'amp', 'dac',
                'bluetooth', 'wireless', 'tws', 'noise canceling', 'noise cancelling', 'over-ear', 'in-ear',
                'walkman', 'ipod', 'mp3 player', 'boombox', 'soundcore',
                // Mobile & Wearables
                'phone', 'smartphone', 'iphone', 'android', 'samsung galaxy', 'pixel', 'ipad', 'tablet',
                'smartwatch', 'smart watch', 'apple watch', 'fitbit', 'garmin', 'whoop', 'smart ring',
                'aura ring', 'fitness tracker',
                // Photography & Video
                'camera', 'dslr', 'mirrorless', 'camcorder', 'gopro', 'action cam', 'drone', 'quadcopter',
                'lens', 'tripod', 'gimbal', 'stabilizer', 'ring light', 'softbox', 'flash', 'speedlite',
                'dash cam', 'security camera', 'cctv', 'ring doorbell', 'nest cam',
                // Gaming & VR
                'playstation', 'ps5', 'ps4', 'ps3', 'ps2', 'psp', 'ps vita', 'xbox', 'xbox series', 'xbox one',
                'nintendo', 'switch', 'joy-con', 'joycon', 'wii', 'gamecube', 'gameboy', '3ds', '2ds',
                'steam deck', 'rog ally', 'legion go', 'vr headset', 'meta quest', 'oculus', 'htc vive',
                'pico vr', 'controller', 'gamepad', 'joystick', 'arcade stick',
                // Power, Cables & Accessories
                'charger', 'charging', 'fast charger', 'power bank', 'portable charger', 'battery pack',
                'magsafe', 'wireless charger', 'usb-c', 'type-c', 'lightning cable', 'hdmi', 'displayport',
                'ac adapter', 'power adapter', 'surge protector', 'power strip', 'inverter',
                // Electronic Grooming, Health & Personal Care
                'electric razor', 'shaver', 'razor', 'trimmer', 'beard trimmer', 'hair clipper', 'clippers',
                'hair dryer', 'blow dryer', 'straightener', 'curling iron', 'curling wand', 'hot air brush',
                'electric toothbrush', 'sonicare', 'oral-b', 'water flosser', 'epilator', 'massage gun',
                'electric massager', 'heating pad', 'treadmill', 'pedometer',
                // Smart Home & TV / Appliances
                'smart home', 'alexa', 'echo dot', 'echo show', 'google home', 'nest', 'smart plug',
                'smart bulb', 'led strip', 'smart light', 'tv', 'television', 'oled', 'qled', '4k tv',
                'roku', 'fire tv', 'firestick', 'chromecast', 'apple tv', 'remote control', 'robot vacuum',
                'roomba', 'air purifier', 'dehumidifier', 'humidifier', 'thermostat',
                // Tech Brands & Key Signifiers
                'apple', 'sony', 'bose', 'sennheiser', 'audio-technica', 'jbl', 'beats', 'anker',
                'belkin', 'logitech', 'razer', 'corsair', 'steelseries', 'hyperx', 'elgato', 'dji',
                'insta360', 'canon', 'nikon', 'fujifilm', 'panasonic lumix', 'asus', 'acer', 'dell',
                'lenovo', 'thinkpad', 'alienware', 'msi', 'braun', 'norelco', 'philips norelco', 'dyson',
                'shark ninja', 'electronic', 'gadget', 'cordless', 'rechargeable', 'digital', 'infrared'
            ];

            // 3. Comprehensive Media Keyword Dictionary
            const mediaKeywords = [
                'book', 'books', 'hardcover', 'paperback', 'novel', 'textbook', 'comic', 'manga',
                'graphic novel', 'dvd', 'blu-ray', 'bluray', '4k uhd', 'vhs', 'cassette', 'vinyl',
                'record album', 'lp', 'cd', 'compact disc', 'audiobook', 'video game disc',
                'game cartridge', 'movie', 'soundtrack', 'magazine', 'periodical', 'sheet music',
                'playbill', 'score', 'anthology', 'audio cd'
            ];

            // 4. Comprehensive Apparel Keyword Dictionary
            const apparelKeywords = [
                'shirt', 't-shirt', 'tee', 'top', 'blouse', 'sweater', 'hoodie', 'sweatshirt', 'cardigan',
                'jacket', 'coat', 'parka', 'blazer', 'vest', 'pants', 'jeans', 'trousers', 'shorts',
                'leggings', 'joggers', 'sweatpants', 'skirt', 'dress', 'gown', 'romper', 'jumpsuit',
                'suit', 'tuxedo', 'shoe', 'shoes', 'sneaker', 'sneakers', 'boot', 'boots', 'heel',
                'heels', 'sandal', 'sandals', 'loafer', 'loafers', 'flat', 'flats', 'slippers', 'socks',
                'underwear', 'boxers', 'briefs', 'bra', 'lingerie', 'sleepwear', 'pajamas', 'swimsuit',
                'bikini', 'trunks', 'hat', 'cap', 'beanie', 'scarf', 'gloves', 'belt', 'tie', 'bag',
                'handbag', 'purse', 'tote', 'backpack', 'wallet', 'clutch', 'crossbody', 'satchel',
                'sunglasses', 'glasses', 'jewelry', 'necklace', 'bracelet', 'ring', 'earring', 'earrings',
                'pendant', 'brooch', 'apparel', 'clothing', 'wear', 'outfit', 'activewear', 'denim'
            ];

            // Match helper that handles word boundaries and multi-word phrases cleanly
            const hasKeyword = (keywords) => {
                for (const kw of keywords) {
                    if (kw.includes(' ') || kw.includes('-')) {
                        if (rawCombined.includes(kw) || cleanCombined.includes(kw.replace(/-/g, ' '))) {
                            return true;
                        }
                    } else {
                        const regex = new RegExp(`(^|[^a-z0-9])${kw}([^a-z0-9]|$)`, 'i');
                        if (regex.test(cleanCombined)) {
                            return true;
                        }
                    }
                }
                return false;
            };

            // Priority 1: Check Electronics (tech items, grooming gadgets, electronics)
            if (hasKeyword(electronicsKeywords)) {
                return 'electronics';
            }

            // Priority 2: Check Media (books, music, movies)
            if (hasKeyword(mediaKeywords)) {
                return 'media';
            }

            // Priority 3: Check Apparel
            if (hasKeyword(apparelKeywords)) {
                return 'apparel';
            }

            // Fallback: General Merchandise
            return 'general';
        };

        // Universal Fallback: Scan script[type="application/ld+json"] tags for standard schema entities
        function scanUniversalSchema() {
            let schemaTitle = '';
            let schemaPrice = null;
            const schemas = document.querySelectorAll('script[type="application/ld+json"]');
            for (const s of schemas) {
                try {
                    if (!s.textContent) continue;
                    const parsed = JSON.parse(s.textContent);
                    const queue = Array.isArray(parsed) ? [...parsed] : [parsed];
                    while (queue.length > 0) {
                        const item = queue.shift();
                        if (!item || typeof item !== 'object') continue;

                        if (Array.isArray(item['@graph'])) {
                            queue.push(...item['@graph']);
                        }

                        if (!schemaTitle && typeof item.name === 'string' && item.name.trim()) {
                            schemaTitle = item.name.trim();
                        }

                        if (!schemaPrice && (item.price !== undefined && item.price !== null)) {
                            schemaPrice = cleanPrice(item.price);
                        }

                        if (!schemaPrice && item.offers) {
                            if (Array.isArray(item.offers)) {
                                for (const off of item.offers) {
                                    if (off && (off.price !== undefined || off.lowPrice !== undefined)) {
                                        schemaPrice = cleanPrice(off.price !== undefined ? off.price : off.lowPrice);
                                        if (schemaPrice) break;
                                    }
                                }
                            } else if (typeof item.offers === 'object') {
                                schemaPrice = cleanPrice(item.offers.price !== undefined ? item.offers.price : item.offers.lowPrice);
                            }
                        }

                        if (schemaTitle && schemaPrice) break;
                    }
                } catch (e) {}
                if (schemaTitle && schemaPrice) break;
            }
            return { title: schemaTitle, price: schemaPrice };
        }

        // --- POSHMARK SCRAPER ---
        if (isPoshmark) {
            // Title Selectors: h1.listing__title, [data-test="listing-title"]
            let title = '';
            const titleEl = document.querySelector('h1.listing__title') ||
                            document.querySelector('[data-test="listing-title"]') ||
                            document.querySelector('h1.listing__title-large') ||
                            document.querySelector('.listing__title');
            if (titleEl && titleEl.textContent) {
                title = titleEl.textContent.trim().replace(/\s+/g, ' ');
            }

            // Price Selectors:
            // 1. p.p--t--1.fw--bold
            // 2. [data-test="listing-price"]
            // 3. .listing__price
            let price = null;
            const poshPriceSelectors = [
                'p.p--t--1.fw--bold',
                '[data-test="listing-price"]',
                '.listing__price'
            ];
            for (const sel of poshPriceSelectors) {
                const el = document.querySelector(sel);
                if (el && el.textContent) {
                    const parsed = cleanPrice(el.textContent);
                    if (parsed && parsed > 0) {
                        price = parsed;
                        break;
                    }
                }
            }

            let shipping = 0.00;
            let categoryContext = '';

            // Next.js fallback if not in DOM
            if (!price || !title) {
                const nextScript = document.querySelector('#__NEXT_DATA__');
                if (nextScript && nextScript.textContent) {
                    try {
                        const nextData = JSON.parse(nextScript.textContent);
                        const pageProps = nextData && nextData.props && nextData.props.pageProps;
                        const listing = pageProps && (pageProps.listing || pageProps.post);
                        if (listing) {
                            if (!title) {
                                if (listing.title) title = listing.title;
                                else if (listing.name) title = listing.name;
                            }
                            if (!price) {
                                if (listing.price) price = cleanPrice(listing.price);
                                else if (listing.original_price) price = cleanPrice(listing.original_price);
                            }
                            if (listing.shipping_price) shipping = cleanPrice(listing.shipping_price) || 0;
                            else if (listing.shipping_rate) shipping = cleanPrice(listing.shipping_rate) || 0;
                            else if (listing.shipping_fee) shipping = cleanPrice(listing.shipping_fee) || 0;

                            const getFieldText = (f) => {
                                if (!f) return '';
                                if (typeof f === 'string') return f;
                                if (typeof f === 'object') return f.display || f.name || f.title || f.label || '';
                                return String(f);
                            };
                            categoryContext += ` ${getFieldText(listing.department)}`;
                            categoryContext += ` ${getFieldText(listing.category)}`;
                            categoryContext += ` ${getFieldText(listing.sub_category)}`;
                            if (listing.brand) categoryContext += ` ${getFieldText(listing.brand)}`;
                        }
                    } catch (e) {}
                }
            }

            // Poshmark Shipping Detection
            if (shipping === 0) {
                const poshShippingSelectors = [
                    '.listing__shipping-info',
                    '[data-test="shipping-info"]',
                    '.shipping-discount-text',
                    '[data-test="shipping-discount"]',
                    '.listing__policy-info',
                    'div.listing__shipping',
                    'p.listing__shipping'
                ];
                for (const sel of poshShippingSelectors) {
                    const el = document.querySelector(sel);
                    if (el && el.textContent) {
                        const parsed = parseShippingText(el.textContent);
                        if (parsed !== null) {
                            shipping = parsed;
                            break;
                        }
                    }
                }
            }
            if (shipping === 0) {
                shipping = urlLower.includes('poshmark.ca') ? 13.49 : 7.97;
            }

            const catEl = document.querySelector('.listing__category-tag') ||
                          document.querySelector('.breadcrumbs') ||
                          document.querySelector('.listing__header-category');
            if (catEl && catEl.textContent) categoryContext += ` ${catEl.textContent}`;

            // Universal Fallback (Schema / JSON-LD)
            if (!price || !title) {
                const schema = scanUniversalSchema();
                if (!title && schema.title) title = schema.title;
                if (!price && schema.price) price = schema.price;
            }

            if (!title) title = document.title ? document.title.replace(/\s*-\s*poshmark/i, '').trim() : 'Poshmark Listing';

            const category = detectCategory(title, categoryContext, 'Poshmark');

            // Sanitization & Event Trigger for #sellPrice if present in DOM
            const hostSellPrice = document.getElementById('sellPrice');
            if (hostSellPrice && price !== null && price > 0) {
                const floatPrice = parseFloat(price);
                hostSellPrice.value = floatPrice.toFixed(2);
                hostSellPrice.dispatchEvent(new Event('input', { bubbles: true }));
            }

            return { foundPage: true, platform: 'Poshmark', title, price, shipping, category, url };
        }

        // --- AMAZON SCRAPER ---
        if (isAmazon) {
            // Title Selectors: #productTitle, h1#title
            let title = '';
            const titleEl = document.querySelector('#productTitle') || 
                            document.querySelector('h1#title') ||
                            document.querySelector('#title');
            if (titleEl && titleEl.textContent) {
                title = titleEl.textContent.trim().replace(/\s+/g, ' ');
            }

            // Price Selectors:
            // 1. .a-price .a-offscreen (primary hidden clean value)
            let price = null;
            const primaryOffscreen = document.querySelector('.a-price .a-offscreen');
            if (primaryOffscreen && primaryOffscreen.textContent) {
                price = cleanPrice(primaryOffscreen.textContent);
            }

            // 2. #corePrice_feature_div .a-price .a-offscreen
            if (!price) {
                const coreOffscreen = document.querySelector('#corePrice_feature_div .a-price .a-offscreen');
                if (coreOffscreen && coreOffscreen.textContent) {
                    price = cleanPrice(coreOffscreen.textContent);
                }
            }

            // 3. #corePriceDisplay_desktop_feature_div span.a-price-whole (paired with .a-price-fraction)
            if (!price) {
                const wholeEl = document.querySelector('#corePriceDisplay_desktop_feature_div span.a-price-whole') ||
                                document.querySelector('.a-price-whole');
                const fracEl = document.querySelector('#corePriceDisplay_desktop_feature_div .a-price-fraction') ||
                               document.querySelector('.a-price-fraction');
                if (wholeEl && wholeEl.textContent) {
                    const wholeStr = wholeEl.textContent.replace(/[^0-9]/g, '');
                    const fracStr = fracEl ? fracEl.textContent.replace(/[^0-9]/g, '') : '00';
                    if (wholeStr) {
                        price = cleanPrice(`${wholeStr}.${fracStr}`);
                    }
                }
            }

            // 4. #priceblock_ourprice, #priceblock_dealprice
            if (!price) {
                const fallbackEl = document.querySelector('#priceblock_ourprice') ||
                                   document.querySelector('#priceblock_dealprice');
                if (fallbackEl && fallbackEl.textContent) {
                    price = cleanPrice(fallbackEl.textContent);
                }
            }

            let shipping = 0.00;
            const csaEl = document.querySelector('[data-csa-c-delivery-price]');
            if (csaEl) {
                const csaVal = csaEl.getAttribute('data-csa-c-delivery-price');
                const parsedCsa = parseShippingText(csaVal);
                if (parsedCsa !== null) shipping = parsedCsa;
            }

            let breadcrumbsText = '';
            const breadcrumbs = document.querySelector('#wayfinding-breadcrumbs_container');
            if (breadcrumbs && breadcrumbs.textContent) {
                breadcrumbsText = breadcrumbs.textContent;
            }

            // Universal Fallback (Schema / JSON-LD)
            if (!price || !title) {
                const schema = scanUniversalSchema();
                if (!title && schema.title) title = schema.title;
                if (!price && schema.price) price = schema.price;
            }

            if (!title && document.title) title = document.title.replace(/amazon(\.[a-z]+)?\s*:\s*/i, '').trim();

            const category = detectCategory(title, breadcrumbsText, 'Amazon');

            // Sanitization & Event Trigger for #sellPrice if present in DOM
            const hostSellPrice = document.getElementById('sellPrice');
            if (hostSellPrice && price !== null && price > 0) {
                const floatPrice = parseFloat(price);
                hostSellPrice.value = floatPrice.toFixed(2);
                hostSellPrice.dispatchEvent(new Event('input', { bubbles: true }));
            }

            return { foundPage: true, platform: 'Amazon', title, price, shipping, category, url };
        }

        // --- EBAY SCRAPER ---
        if (isEbay) {
            // Title Selectors: h1.x-item-title__mainTitle .ux-textspans, h1#itemTitle
            let title = '';
            const titleEl = document.querySelector('h1.x-item-title__mainTitle .ux-textspans') ||
                            document.querySelector('h1#itemTitle') ||
                            document.querySelector('.x-item-title__mainTitle .ux-textspans') ||
                            document.querySelector('#itemTitle');
            if (titleEl && titleEl.textContent) {
                title = titleEl.textContent.trim().replace(/^details about\s*/i, '').replace(/\s+/g, ' ');
            }

            // Price Selectors:
            // 1. [data-testid="x-price-primary"] .ux-textspans
            // 2. .x-bin-price__content .ux-textspans
            // 3. #prcIsum, #mm-saleDscPrc
            // 4. .main-price-val .ux-textspans
            let price = null;
            const ebayPriceSelectors = [
                '[data-testid="x-price-primary"] .ux-textspans',
                '.x-bin-price__content .ux-textspans',
                '#prcIsum',
                '#mm-saleDscPrc',
                '.main-price-val .ux-textspans'
            ];
            for (const sel of ebayPriceSelectors) {
                const el = document.querySelector(sel);
                if (el && el.textContent) {
                    const parsed = cleanPrice(el.textContent);
                    if (parsed && parsed > 0) {
                        price = parsed;
                        break;
                    }
                }
            }

            let shipping = 0.00;
            const shipEl = document.querySelector('[data-testid="ux-labels-values--shipping"]') ||
                           document.querySelector('.ux-labels-values--shipping');
            if (shipEl) {
                const parsedShip = parseShippingText(shipEl.textContent);
                if (parsedShip !== null) shipping = parsedShip;
            }

            let catBreadcrumbsText = '';
            const catBreadcrumbs = document.querySelector('.breadcrumbs') || document.querySelector('.seo-breadcrumb-text');
            if (catBreadcrumbs && catBreadcrumbs.textContent) {
                catBreadcrumbsText = catBreadcrumbs.textContent;
            }

            // Universal Fallback (Schema / JSON-LD)
            if (!price || !title) {
                const schema = scanUniversalSchema();
                if (!title && schema.title) title = schema.title;
                if (!price && schema.price) price = schema.price;
            }

            if (!title && document.title) title = document.title.replace(/\s*\|\s*ebay/i, '').trim();

            const category = detectCategory(title, catBreadcrumbsText, 'eBay');

            // Sanitization & Event Trigger for #sellPrice if present in DOM
            const hostSellPrice = document.getElementById('sellPrice');
            if (hostSellPrice && price !== null && price > 0) {
                const floatPrice = parseFloat(price);
                hostSellPrice.value = floatPrice.toFixed(2);
                hostSellPrice.dispatchEvent(new Event('input', { bubbles: true }));
            }

            return { foundPage: true, platform: 'eBay', title, price, shipping, category, url };
        }

        // --- WALMART SCRAPER ---
        if (isWalmart) {
            // Title Selectors: h1#main-title, h1[itemprop="name"]
            let title = '';
            const titleEl = document.querySelector('h1#main-title') ||
                            document.querySelector('h1[itemprop="name"]') ||
                            document.querySelector('#main-title') ||
                            document.querySelector('h1');
            if (titleEl && titleEl.textContent) {
                title = titleEl.textContent.trim().replace(/\s+/g, ' ');
            }

            // Price Selectors:
            // 1. span[itemprop="price"]
            // 2. [data-testid="price-wrap"] span
            // 3. span.inline-flex.flex-column
            let price = null;
            const walmartPriceSelectors = [
                'span[itemprop="price"]',
                '[data-testid="price-wrap"] span',
                'span.inline-flex.flex-column'
            ];

            for (const sel of walmartPriceSelectors) {
                const el = document.querySelector(sel);
                if (el && el.textContent) {
                    const parsed = cleanPrice(el.textContent);
                    if (parsed && parsed > 0) {
                        price = parsed;
                        break;
                    }
                }
            }

            let shipping = 0.00;
            const shipEl = document.querySelector('[data-testid="fulfillment-shipping"]') || document.querySelector('[data-testid="shipping-info"]');
            if (shipEl && shipEl.textContent) {
                const parsedShip = parseShippingText(shipEl.textContent);
                if (parsedShip !== null) shipping = parsedShip;
            }

            let catBreadcrumbsText = '';
            const catBreadcrumbs = document.querySelector('nav[aria-label="breadcrumb"]') || document.querySelector('.breadcrumb');
            if (catBreadcrumbs && catBreadcrumbs.textContent) {
                catBreadcrumbsText = catBreadcrumbs.textContent;
            }

            // Universal Fallback (Schema / JSON-LD)
            if (!price || !title) {
                const schema = scanUniversalSchema();
                if (!title && schema.title) title = schema.title;
                if (!price && schema.price) price = schema.price;
            }

            if (!title && document.title) title = document.title.replace(/\s*-\s*Walmart\.com/i, '').trim();

            const category = detectCategory(title, catBreadcrumbsText, 'Walmart');

            // Sanitization & Event Trigger for #sellPrice if present in DOM
            const hostSellPrice = document.getElementById('sellPrice');
            if (hostSellPrice && price !== null && price > 0) {
                const floatPrice = parseFloat(price);
                hostSellPrice.value = floatPrice.toFixed(2);
                hostSellPrice.dispatchEvent(new Event('input', { bubbles: true }));
            }

            return { foundPage: true, platform: 'Walmart', title, price, shipping, category, url };
        }

        // Generic platform Universal Fallback
        const genericSchema = scanUniversalSchema();
        if (genericSchema.price || genericSchema.title) {
            const hostSellPrice = document.getElementById('sellPrice');
            if (hostSellPrice && genericSchema.price !== null && genericSchema.price > 0) {
                const floatPrice = parseFloat(genericSchema.price);
                hostSellPrice.value = floatPrice.toFixed(2);
                hostSellPrice.dispatchEvent(new Event('input', { bubbles: true }));
            }
            return {
                foundPage: true,
                platform: 'Web',
                title: genericSchema.title || document.title,
                price: genericSchema.price,
                shipping: 0,
                category: 'general',
                url
            };
        }

        return { foundPage: false, platform: null, price: null };
    } catch (err) {
        return { foundPage: false, error: err.message, platform: 'Error' };
    }
}

// --- STORE SELECTION PERSISTENCE ---
function getEnabledStores() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Error reading store preferences', e);
    }
    const defaultState = {};
    PLATFORMS_META.forEach(p => { defaultState[p.id] = true; });
    return defaultState;
}

function saveEnabledStores(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('Error saving store preferences', e);
    }
}

function initSettingsView() {
    const enabledStores = getEnabledStores();
    storesList.innerHTML = '';

    PLATFORMS_META.forEach(platform => {
        const item = document.createElement('div');
        item.className = 'store-item';

        const isChecked = enabledStores[platform.id] !== false;

        item.innerHTML = `
            <div class="store-info">
                <span class="store-name">${platform.baseName}</span>
                <span class="store-desc">${platform.desc}</span>
            </div>
            <label class="switch">
                <input type="checkbox" data-id="${platform.id}" ${isChecked ? 'checked' : ''}>
                <span class="slider"></span>
            </label>
        `;

        const checkbox = item.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', (e) => {
            const current = getEnabledStores();
            current[platform.id] = e.target.checked;
            saveEnabledStores(current);
            calculate();
        });

        storesList.appendChild(item);
    });
}

// Dynamic Calculation
function calculate() {
    const cost = parseFloat(costInput.value) || 0;
    const sellPrice = parseFloat(sellPriceInput.value);
    const shipping = parseFloat(shippingInput.value) || 0;
    const selectedCategory = (categorySelect && categorySelect.value) || 'general';
    const categoryRates = CATEGORY_RATES[selectedCategory] || CATEGORY_RATES.general;

    if (isNaN(sellPrice) || sellPrice <= 0) {
        resultsSection.style.display = 'none';
        sourcingActionBar.style.display = 'none';
        noStoresMsg.style.display = 'none';
        tableBody.innerHTML = '';
        return;
    }

    const enabledStores = getEnabledStores();
    const activePlatforms = PLATFORMS_META.filter(p => enabledStores[p.id] !== false);

    if (activePlatforms.length === 0) {
        resultsSection.style.display = 'none';
        sourcingActionBar.style.display = 'none';
        noStoresMsg.style.display = 'block';
        tableBody.innerHTML = '';
        return;
    }

    noStoresMsg.style.display = 'none';
    tableBody.innerHTML = '';

    let maxProfit = -Infinity;
    const calculated = activePlatforms.map(p => {
        const platformRate = categoryRates[p.id] || { rate: 0, fixed: 0, label: p.baseName };
        const fee = (sellPrice * platformRate.rate) + platformRate.fixed;
        const profit = sellPrice - (cost + shipping + fee);
        const roi = cost > 0 ? (profit / cost) * 100 : 0;
        
        // Break-Even Formula: (cost + shipping + fixedFee) / (1 - platformRate)
        const denominator = 1 - platformRate.rate;
        const breakEven = denominator > 0 ? (cost + shipping + platformRate.fixed) / denominator : 0;
        const isUnderBreakEven = sellPrice < breakEven;

        if (profit > maxProfit) maxProfit = profit;
        return { ...p, label: platformRate.label, fee, profit, roi, breakEven, isUnderBreakEven };
    });

    calculated.forEach(item => {
        const tr = document.createElement('tr');
        const isBest = item.profit === maxProfit && item.profit > 0;
        const isUnderBreakEven = item.isUnderBreakEven;
        const isNegative = item.profit < 0;
        
        let profitClass = '';
        if (isUnderBreakEven || isNegative) {
            profitClass = 'profit-negative under-breakeven';
        } else if (isBest) {
            profitClass = 'best-val';
        }

        const formattedProfit = isNegative 
            ? `-$${Math.abs(item.profit).toFixed(2)}` 
            : `$${item.profit.toFixed(2)}`;

        tr.innerHTML = `
            <td>${item.label}</td>
            <td>$${item.fee.toFixed(2)}</td>
            <td>$${item.breakEven.toFixed(2)}</td>
            <td class="${profitClass}" title="${isUnderBreakEven ? `Selling price is under break-even ($${item.breakEven.toFixed(2)})` : ''}">
                <div>${formattedProfit}</div>
                ${isUnderBreakEven ? '<span class="badge-under">Under Break-Even</span>' : ''}
            </td>
            <td>${item.roi.toFixed(0)}%</td>
        `;
        tableBody.appendChild(tr);
    });

    resultsSection.style.display = 'table';
    sourcingActionBar.style.display = 'grid';
}

function debounce(fn, delay = 150) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

const debouncedCalculate = debounce(calculate, 150);

[costInput, sellPriceInput, shippingInput].forEach(input => {
    if (input) {
        input.addEventListener('input', debouncedCalculate);
    }
});

if (categorySelect) {
    categorySelect.addEventListener('change', calculate);
}

// Auto-apply pending listing if user clicked 'Yes, Auto-Fill' on the on-page prompt
async function checkPendingAutoFill() {
    try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['seller_calc_pending_autofill'], (result) => {
                if (result && result.seller_calc_pending_autofill) {
                    const data = result.seller_calc_pending_autofill;
                    chrome.storage.local.remove(['seller_calc_pending_autofill']);
                    applyScrapedData(data);
                }
            });
        }
    } catch (e) {}
}

// Initialize settings, pro state, sourcing count badges, and calculation on load
initSettingsView();
updateProUI();
updateSourcingBadges();
calculate();
checkPendingAutoFill();