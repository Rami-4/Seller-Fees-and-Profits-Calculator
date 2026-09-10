// Seller Fees & Profits Calculator - Complete On-Page Floating Extension Widget

(function () {
    const existingContainer = document.getElementById('seller-calc-overlay-container');
    if (existingContainer && !window.__SELLER_CALC_ACTIVE__) {
        existingContainer.remove();
    }
    window.__SELLER_CALC_ACTIVE__ = true;

    const PLATFORMS_META = [
        { id: 'ebay', baseName: 'eBay', desc: 'Category-specific final value fee + $0.30' },
        { id: 'amazon', baseName: 'Amazon', desc: 'Category referral fee (+ closing fee for media)' },
        { id: 'poshmark', baseName: 'Poshmark', desc: '20.00% flat sales fee' },
        { id: 'stripe', baseName: 'Direct / Stripe', desc: '2.90% + $0.30 payment fee' }
    ];

    const CATEGORY_RATES = {
        general: {
            ebay: { rate: 0.1325, fixed: 0.30, label: 'eBay (~13.25% + $0.30)' },
            amazon: { rate: 0.15, fixed: 0.00, label: 'Amazon (15%)' },
            poshmark: { rate: 0.20, fixed: 0.00, label: 'Poshmark (20%)' },
            stripe: { rate: 0.029, fixed: 0.30, label: 'Direct / Stripe (2.9% + $0.30)' }
        },
        electronics: {
            ebay: { rate: 0.0935, fixed: 0.30, label: 'eBay (~9.35% + $0.30)' },
            amazon: { rate: 0.08, fixed: 0.00, label: 'Amazon (8%)' },
            poshmark: { rate: 0.20, fixed: 0.00, label: 'Poshmark (20%)' },
            stripe: { rate: 0.029, fixed: 0.30, label: 'Direct / Stripe (2.9% + $0.30)' }
        },
        apparel: {
            ebay: { rate: 0.15, fixed: 0.30, label: 'eBay (15% + $0.30)' },
            amazon: { rate: 0.17, fixed: 0.00, label: 'Amazon (17%)' },
            poshmark: { rate: 0.20, fixed: 0.00, label: 'Poshmark (20%)' },
            stripe: { rate: 0.029, fixed: 0.30, label: 'Direct / Stripe (2.9% + $0.30)' }
        },
        media: {
            ebay: { rate: 0.146, fixed: 0.30, label: 'eBay (14.6% + $0.30)' },
            amazon: { rate: 0.15, fixed: 1.80, label: 'Amazon (15% + $1.80)' },
            poshmark: { rate: 0.20, fixed: 0.00, label: 'Poshmark (20%)' },
            stripe: { rate: 0.029, fixed: 0.30, label: 'Direct / Stripe (2.9% + $0.30)' }
        }
    };

    const STORAGE_KEY = 'seller_calc_enabled_stores';
    const PRO_STORAGE_KEY = 'seller_calc_is_pro';
    const SOURCING_STORAGE_KEY = 'seller_calc_sourcing_list';
    const MAX_SOURCING_ITEMS = 50;

    let proCache = false; // Free tier by default
    let storesCache = { ebay: true, amazon: true, poshmark: true, stripe: true };
    let sourcingCache = [];

    function syncFromStorage() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get([PRO_STORAGE_KEY, STORAGE_KEY, SOURCING_STORAGE_KEY], (res) => {
                if (res) {
                    if (res[PRO_STORAGE_KEY] !== undefined) {
                        proCache = res[PRO_STORAGE_KEY] === true || res[PRO_STORAGE_KEY] === 'true';
                    }
                    if (res[STORAGE_KEY] && typeof res[STORAGE_KEY] === 'object') {
                        storesCache = { ...res[STORAGE_KEY] };
                    }
                    if (Array.isArray(res[SOURCING_STORAGE_KEY])) {
                        sourcingCache = [...res[SOURCING_STORAGE_KEY]];
                    }
                    if (activeWidgetInstance) {
                        activeWidgetInstance.updateData(scrapeCurrentListing());
                    }
                }
            });
        } else {
            try {
                const storedPro = localStorage.getItem(PRO_STORAGE_KEY);
                if (storedPro !== null) proCache = storedPro === 'true';
            } catch(e){}
            try {
                const s = localStorage.getItem(STORAGE_KEY);
                if (s) storesCache = JSON.parse(s);
            } catch(e){}
            try {
                const l = localStorage.getItem(SOURCING_STORAGE_KEY);
                if (l) sourcingCache = JSON.parse(l);
            } catch(e){}
        }
    }
    syncFromStorage();

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local') {
                if (changes[PRO_STORAGE_KEY] !== undefined) {
                    proCache = changes[PRO_STORAGE_KEY].newValue === true || changes[PRO_STORAGE_KEY].newValue === 'true';
                }
                if (changes[STORAGE_KEY] && changes[STORAGE_KEY].newValue) {
                    storesCache = { ...changes[STORAGE_KEY].newValue };
                }
                if (changes[SOURCING_STORAGE_KEY] && Array.isArray(changes[SOURCING_STORAGE_KEY].newValue)) {
                    sourcingCache = [...changes[SOURCING_STORAGE_KEY].newValue];
                }
                if (activeWidgetInstance) {
                    activeWidgetInstance.updateData(scrapeCurrentListing());
                }
            }
        });
    }

    function isPro() {
        return proCache;
    }
    function setPro(status) {
        proCache = !!status;
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ [PRO_STORAGE_KEY]: proCache });
        }
        try { localStorage.setItem(PRO_STORAGE_KEY, proCache ? 'true' : 'false'); } catch (e) {}
        if (activeWidgetInstance) {
            activeWidgetInstance.updateData(scrapeCurrentListing());
        }
    }
    function getEnabledStores() {
        return { ...storesCache };
    }
    function saveEnabledStores(state) {
        storesCache = { ...state };
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ [STORAGE_KEY]: storesCache });
        }
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(storesCache)); } catch (e) {}
    }
    function getSourcingList() {
        return [...sourcingCache];
    }
    function saveSourcingList(list) {
        sourcingCache = [...list];
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ [SOURCING_STORAGE_KEY]: sourcingCache });
        }
        try { localStorage.setItem(SOURCING_STORAGE_KEY, JSON.stringify(sourcingCache)); } catch (e) {}
    }

    const cleanPrice = (str) => {
        if (!str && str !== 0) return null;
        if (typeof str === 'number') return str > 0 ? str : null;
        const cleanStr = String(str).replace(/,/g, '').trim();
        const match = cleanStr.match(/\$?\s*([0-9]+(?:\.[0-9]{1,2})?)/);
        if (match && match[1]) {
            const val = parseFloat(match[1]);
            return isNaN(val) || val <= 0 ? null : val;
        }
        return null;
    };

    const parseShippingText = (text) => {
        if (!text) return null;
        const lower = text.toLowerCase().trim();
        if (lower === 'free' || lower.includes('free shipping')) return 0.00;
        const patterns = [
            /(?:shipping|delivery|postage)\s*:?\s*(?:us)?\s*\$?\s*([0-9]+\.[0-9]{2})/i,
            /(?:us\s*)?\$([0-9]+\.[0-9]{2})\s*(?:shipping|delivery|postage|standard|expedited|economy|priority)/i,
            /\+\s*\$([0-9]+\.[0-9]{2})/i,
            /\$([0-9]+\.[0-9]{2})/
        ];
        for (const pat of patterns) {
            const m = text.match(pat);
            if (m && m[1]) {
                const val = parseFloat(m[1]);
                if (!isNaN(val)) return val;
            }
        }
        return null;
    };

    const detectCategory = (title, extraText) => {
        const raw = `${title || ''} ${extraText || ''}`.toLowerCase();
        if (/(laptop|computer|phone|electronics|camera|gaming|console|audio|headphone|earbud|speaker|tv)/i.test(raw)) return 'electronics';
        if (/(book|dvd|cd|vinyl|manga|media|novel|textbook)/i.test(raw)) return 'media';
        if (/(shirt|shoes|apparel|clothing|dress|jacket|pants|sneaker|boots|purse|bag|sweater|hoodie)/i.test(raw)) return 'apparel';
        return 'general';
    };

    function scrapeCurrentListing() {
        const url = (window.location && window.location.href ? window.location.href : '');
        const urlLower = url.toLowerCase();
        const isAmazon = urlLower.includes('amazon.');
        const isEbay = urlLower.includes('ebay.');
        const isPoshmark = urlLower.includes('poshmark.');

        let platform = isPoshmark ? 'Poshmark' : (isAmazon ? 'Amazon' : (isEbay ? 'eBay' : 'Custom'));
        let title = '';
        let price = null;
        let shipping = 0.00;
        let categoryContext = '';

        if (isPoshmark) {
            const nextScript = document.querySelector('#__NEXT_DATA__');
            if (nextScript && nextScript.textContent) {
                try {
                    const nextData = JSON.parse(nextScript.textContent);
                    const pp = nextData?.props?.pageProps;
                    const listing = pp?.listing || pp?.post || pp?.item || pp?.data || pp?.initialReduxState?.listing;
                    if (listing) {
                        if (listing.title) title = listing.title;
                        else if (listing.name) title = listing.name;

                        if (listing.price_amount && listing.price_amount.val) price = cleanPrice(listing.price_amount.val);
                        else if (listing.price) price = cleanPrice(listing.price);
                        else if (listing.original_price) price = cleanPrice(listing.original_price);

                        if (listing.shipping_price) shipping = cleanPrice(listing.shipping_price) || 0;
                        else if (listing.shipping_rate) shipping = cleanPrice(listing.shipping_rate) || 0;
                        else if (listing.shipping_fee) shipping = cleanPrice(listing.shipping_fee) || 0;

                        const getFieldText = (f) => (typeof f === 'object' ? f.display || f.name || f.title || '' : String(f || ''));
                        categoryContext += ` ${getFieldText(listing.department)} ${getFieldText(listing.category)} ${getFieldText(listing.sub_category)} ${listing.description || ''}`;
                    }
                } catch (e) {}
            }

            if (!price || !title) {
                const schemas = document.querySelectorAll('script[type="application/ld+json"]');
                for (const s of schemas) {
                    try {
                        const parsed = JSON.parse(s.textContent);
                        const items = Array.isArray(parsed) ? parsed : (parsed && parsed['@graph'] ? parsed['@graph'] : [parsed]);
                        for (const item of items) {
                            if (item && (item['@type'] === 'Product' || item.offers || item.name)) {
                                if (!title && item.name) title = item.name;
                                if (!price && item.offers) {
                                    const pVal = Array.isArray(item.offers) ? item.offers[0].price : (item.offers.price || item.offers.lowPrice);
                                    if (pVal) price = cleanPrice(pVal);
                                }
                                if (item.category) categoryContext += ` ${item.category}`;
                            }
                        }
                    } catch (e) {}
                }
            }

            if (!title) {
                const ogTitle = document.querySelector('meta[property="og:title"]') || document.querySelector('meta[name="twitter:title"]');
                if (ogTitle && ogTitle.content) title = ogTitle.content;
            }
            if (!price) {
                const ogPrice = document.querySelector('meta[property="product:price:amount"]') ||
                                document.querySelector('meta[property="og:price:amount"]') ||
                                document.querySelector('meta[name="twitter:data1"]');
                if (ogPrice && ogPrice.content) price = cleanPrice(ogPrice.content);
            }

            if (!title) {
                const titleSelectors = [
                    'h1.listing__title-large',
                    'h1.listing__title',
                    '[data-test="listing-title"]',
                    '[data-testid="listing-title"]',
                    '.listing__title',
                    'div.listing__title-container h1',
                    'header.listing-header h1',
                    'h1'
                ];
                for (const sel of titleSelectors) {
                    const el = document.querySelector(sel);
                    if (el && el.textContent && el.textContent.trim()) {
                        title = el.textContent.trim().replace(/\s+/g, ' ');
                        break;
                    }
                }
                if (!title) {
                    title = document.title ? document.title.replace(/\s*-\s*poshmark/i, '').trim() : 'Poshmark Listing';
                }
            }

            if (!price) {
                const priceSelectors = [
                    '[data-test="listing-price"]',
                    '[data-testid="listing-price"]',
                    'p.listing__price',
                    'span.listing__price',
                    '.listing__price',
                    '.listing__inventory-info .listing__price',
                    'div.listing__price-info',
                    'span[data-et-name="listing_price"]',
                    'p.h1.listing__price',
                    'p.h1',
                    'span.price',
                    'div.listing__title-container .price',
                    '.price',
                    '[class*="listing__price"]',
                    '[class*="price"]'
                ];
                for (const sel of priceSelectors) {
                    const el = document.querySelector(sel);
                    if (el && el.textContent) {
                        const parsed = cleanPrice(el.textContent);
                        if (parsed && parsed > 0) {
                            price = parsed;
                            break;
                        }
                    }
                }
            }

            if (shipping === 0) {
                shipping = urlLower.includes('poshmark.ca') ? 13.49 : 7.97;
            }
        } else if (isAmazon) {
            const titleEl = document.querySelector('#productTitle') || document.querySelector('#title');
            if (titleEl) title = titleEl.textContent.trim();

            const wholeEl = document.querySelector('.a-price-whole') || document.querySelector('#corePriceDisplay_desktop_feature_div .a-price-whole');
            const fracEl = document.querySelector('.a-price-fraction') || document.querySelector('#corePriceDisplay_desktop_feature_div .a-price-fraction');
            if (wholeEl && wholeEl.textContent) {
                const wholeStr = wholeEl.textContent.replace(/[^0-9]/g, '');
                const fracStr = fracEl ? fracEl.textContent.replace(/[^0-9]/g, '') : '00';
                price = parseFloat(`${wholeStr}.${fracStr}`);
            }

            if (!price) {
                const offscreenEl = document.querySelector('#corePriceDisplay_desktop_feature_div span.a-price span.a-offscreen') ||
                                    document.querySelector('.a-price span.a-offscreen') ||
                                    document.querySelector('#priceblock_ourprice');
                if (offscreenEl) price = cleanPrice(offscreenEl.textContent);
            }

            const csaEl = document.querySelector('[data-csa-c-delivery-price]');
            if (csaEl) shipping = parseShippingText(csaEl.getAttribute('data-csa-c-delivery-price')) || 0;

            const breadcrumbs = document.querySelector('#wayfinding-breadcrumbs_container');
            if (breadcrumbs) categoryContext += ` ${breadcrumbs.textContent}`;
        } else if (isEbay) {
            const titleEl = document.querySelector('.x-item-title__mainTitle .ux-textspans') || document.querySelector('#itemTitle') || document.querySelector('h1');
            if (titleEl) title = titleEl.textContent.trim().replace(/^details about\s*/i, '');

            const priceEl = document.querySelector('.x-price-primary .ux-textspans') || document.querySelector('#prcIsum') || document.querySelector('[itemprop="price"]');
            if (priceEl) price = cleanPrice(priceEl.textContent);

            const shipEl = document.querySelector('[data-testid="ux-labels-values--shipping"]') || document.querySelector('.ux-labels-values--shipping');
            if (shipEl) shipping = parseShippingText(shipEl.textContent) || 0;

            const breadcrumbs = document.querySelector('.breadcrumbs') || document.querySelector('.seo-breadcrumb-text');
            if (breadcrumbs) categoryContext += ` ${breadcrumbs.textContent}`;
        }

        const category = detectCategory(title, categoryContext);
        return {
            platform,
            title: title || (document.title ? document.title.substring(0, 60) : `${platform} Listing`),
            price: price || 0,
            shipping: shipping || 0,
            category,
            url: window.location.href
        };
    }

    let activeWidgetInstance = null;

    function createOrUpdateWidget(forcedData = null) {
        if (!document.body && !document.documentElement) return null;

        const data = forcedData || scrapeCurrentListing();
        let container = document.getElementById('seller-calc-overlay-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'seller-calc-overlay-container';
            const parent = document.body || document.documentElement;
            parent.appendChild(container);
        }

        let currentData = { ...data };
        let costVal = 0.00;
        let sellPriceVal = isPro() && currentData.price > 0 ? currentData.price : 0.00;
        let shippingVal = isPro() && currentData.shipping > 0 ? currentData.shipping : 0.00;
        let selectedCategory = isPro() && currentData.category ? currentData.category : 'general';
        let isWindowExpanded = false;

        function renderFullWidget() {
            isWindowExpanded = true;
            const list = getSourcingList();
            const listCount = list.length;
            const userIsPro = isPro();
            const showScrapedBanner = userIsPro && currentData.price > 0;

            container.innerHTML = `
                <div class="seller-calc-window">
                    <!-- Main Calculator View -->
                    <div id="seller-calc-view-main">
                        <div class="seller-calc-header-bar">
                            <h3 class="seller-calc-title">⚡ Seller Fees & Profits</h3>
                            <div class="seller-calc-header-actions">
                                <button id="sc-headerListBtn" class="seller-calc-header-btn" title="View Sourcing Scout List">
                                    <span>📋 Sheet</span><span class="seller-calc-count-pill" id="sc-headerListCount">${listCount}</span>
                                </button>
                                <button id="sc-proBadgeBtn" class="seller-calc-header-btn seller-calc-pro-btn ${userIsPro ? 'is-pro' : ''}" title="Seller Pro Status">
                                    👑 <span id="sc-tierText">${userIsPro ? 'PRO' : 'Free'}</span>
                                </button>
                                <button id="sc-toSettingsBtn" class="seller-calc-header-btn" title="Configure Stores">
                                    🏪 Stores
                                </button>
                                <button id="sc-minimizeBtn" class="seller-calc-close-btn" title="Minimize Widget">✕</button>
                            </div>
                        </div>

                        <!-- 1-Click Auto-Fill Button -->
                        <button id="sc-scrapeBtn" class="seller-calc-scrape-btn">
                            <div class="seller-calc-btn-left">
                                <span>⚡</span>
                                <span>1-Click Listing Auto-Fill</span>
                            </div>
                            <span class="seller-calc-pro-pill">PRO</span>
                        </button>

                        <!-- Scraped Item Banner -->
                        <div id="sc-scrapedBanner" class="seller-calc-scraped-banner" style="${showScrapedBanner ? '' : 'display: none;'}">
                            <div class="seller-calc-scraped-details">
                                <span class="seller-calc-scraped-tag" id="sc-scrapedPlatform">${currentData.platform}</span>
                                <span class="seller-calc-scraped-title" id="sc-scrapedTitle" title="${currentData.title}">${currentData.title}</span>
                            </div>
                        </div>

                        <!-- Status Toast Message -->
                        <div id="sc-statusMsg" class="seller-calc-status" style="display: none;"></div>

                        <div class="seller-calc-field">
                            <label>Product Category</label>
                            <select id="sc-category" class="seller-calc-select">
                                <option value="general" ${selectedCategory === 'general' ? 'selected' : ''}>General Merchandise</option>
                                <option value="electronics" ${selectedCategory === 'electronics' ? 'selected' : ''}>Consumer Electronics (8%–9.35%)</option>
                                <option value="apparel" ${selectedCategory === 'apparel' ? 'selected' : ''}>Apparel / Fashion (15%–17%)</option>
                                <option value="media" ${selectedCategory === 'media' ? 'selected' : ''}>Books & Media</option>
                            </select>
                        </div>

                        <div class="seller-calc-grid-2">
                            <div class="seller-calc-field">
                                <label>Cost of Item ($)</label>
                                <input type="number" id="sc-cost" class="seller-calc-input" placeholder="0.00" step="0.01" value="${costVal > 0 ? costVal.toFixed(2) : ''}">
                            </div>
                            <div class="seller-calc-field">
                                <label>Selling Price ($)</label>
                                <input type="number" id="sc-sellPrice" class="seller-calc-input" placeholder="0.00" step="0.01" value="${sellPriceVal > 0 ? sellPriceVal.toFixed(2) : ''}">
                            </div>
                        </div>

                        <div class="seller-calc-field">
                            <label>Est. Shipping & Materials ($)</label>
                            <input type="number" id="sc-shipping" class="seller-calc-input" placeholder="0.00" step="0.01" value="${shippingVal > 0 ? shippingVal.toFixed(2) : '0.00'}">
                        </div>

                        <!-- 5-Column Results Table -->
                        <table class="seller-calc-table" id="sc-table">
                            <thead>
                                <tr>
                                    <th>Channel</th>
                                    <th>Fee</th>
                                    <th>Break-Even</th>
                                    <th>Profit</th>
                                    <th>ROI</th>
                                </tr>
                            </thead>
                            <tbody id="sc-tableBody"></tbody>
                        </table>

                        <!-- Sourcing Action Bar -->
                        <div class="seller-calc-action-bar">
                            <button id="sc-saveToSourcingBtn" class="seller-calc-action-btn seller-calc-save-action" title="Save to Sourcing List">
                                <span>💾 Save to Sourcing List</span>
                                <span class="seller-calc-pro-pill">PRO</span>
                            </button>
                            <button id="sc-openSourcingBtn" class="seller-calc-action-btn seller-calc-view-action" title="Open Scouted List">
                                <span>📋 Scout List</span>
                                <span class="seller-calc-count-pill" id="sc-sourcingBadge">${listCount}/50</span>
                            </button>
                        </div>
                    </div>

                    <!-- Sourcing Scout List View -->
                    <div id="seller-calc-view-sourcing" style="display: none;">
                        <div class="seller-calc-header-bar">
                            <h3 class="seller-calc-title">Sourcing Scout List (<span id="sc-sourcingTitleCount">${listCount}</span>/50)</h3>
                            <button id="sc-backFromListBtn" class="seller-calc-header-btn">← Back</button>
                        </div>
                        <div class="seller-calc-stats-grid">
                            <div class="seller-calc-stat-card">
                                <span class="seller-calc-stat-label">Total Items</span>
                                <span class="seller-calc-stat-val" id="sc-statItems">${listCount} / 50</span>
                            </div>
                            <div class="seller-calc-stat-card">
                                <span class="seller-calc-stat-label">Total Profit</span>
                                <span class="seller-calc-stat-val seller-calc-stat-profit" id="sc-statProfit">$0.00</span>
                            </div>
                            <div class="seller-calc-stat-card">
                                <span class="seller-calc-stat-label">Avg ROI</span>
                                <span class="seller-calc-stat-val" id="sc-statRoi">0%</span>
                            </div>
                        </div>
                        <div class="seller-calc-sourcing-btns-row">
                            <button id="sc-exportCsvBtn" class="seller-calc-export-csv-btn">📥 Export Clean CSV Sheet</button>
                            <button id="sc-clearListBtn" class="seller-calc-clear-list-btn" title="Clear all scouted items">🗑️ Clear</button>
                        </div>
                        <div class="seller-calc-items-container" id="sc-itemsContainer"></div>
                    </div>

                    <!-- Stores Settings View -->
                    <div id="seller-calc-view-settings" style="display: none;">
                        <div class="seller-calc-header-bar">
                            <h3 class="seller-calc-title">🏪 Store Preferences</h3>
                            <button id="sc-backFromSettingsBtn" class="seller-calc-header-btn">← Back</button>
                        </div>
                        <div id="sc-storesList"></div>
                    </div>

                    <!-- Seller Pro Modal Overlay -->
                    <div id="sc-proModal" class="seller-calc-modal-overlay" style="display: none;">
                        <div class="seller-calc-pro-card">
                            <div class="seller-calc-pro-title">👑 Seller Pro Tier</div>
                            <div class="seller-calc-pro-subtitle">Supercharge your sourcing and fee calculations.</div>
                            <div class="seller-calc-pro-features">
                                <div class="seller-calc-pro-feature"><span>⚡</span> <span><strong>1-Click Listing Auto-Fill:</strong> Instant DOM scraping</span></div>
                                <div class="seller-calc-pro-feature"><span>📊</span> <span><strong>Sourcing List & Export:</strong> Up to 50 items with direct URLs</span></div>
                                <div class="seller-calc-pro-feature"><span>🎯</span> <span><strong>Live Break-Even Pricing:</strong> Real-time margin safety</span></div>
                            </div>
                            <button id="sc-toggleProBtn" class="seller-calc-pro-toggle-btn">${userIsPro ? 'Downgrade to Free Tier' : '⭐ Activate Pro Tier (Demo)'}</button>
                            <button id="sc-closeProBtn" class="seller-calc-pro-close-btn">Close</button>
                        </div>
                    </div>
                </div>
            `;

            const viewMain = container.querySelector('#seller-calc-view-main');
            const viewSourcing = container.querySelector('#seller-calc-view-sourcing');
            const viewSettings = container.querySelector('#seller-calc-view-settings');
            const proModal = container.querySelector('#sc-proModal');

            const costInp = container.querySelector('#sc-cost');
            const sellPriceInp = container.querySelector('#sc-sellPrice');
            const shippingInp = container.querySelector('#sc-shipping');
            const categorySelect = container.querySelector('#sc-category');
            const tableBody = container.querySelector('#sc-tableBody');
            const statusMsg = container.querySelector('#sc-statusMsg');

            function showToast(msg, typeClass = 'seller-calc-status-success') {
                if (!statusMsg) return;
                statusMsg.className = `seller-calc-status ${typeClass}`;
                statusMsg.textContent = msg;
                statusMsg.style.display = 'block';
                setTimeout(() => {
                    statusMsg.style.display = 'none';
                }, 3000);
            }

            function calculate() {
                const cost = parseFloat(costInp.value) || 0;
                const sellPrice = parseFloat(sellPriceInp.value) || 0;
                const shipping = parseFloat(shippingInp.value) || 0;
                const cat = categorySelect.value || 'general';

                costVal = cost;
                sellPriceVal = sellPrice;
                shippingVal = shipping;
                selectedCategory = cat;

                const rates = CATEGORY_RATES[cat] || CATEGORY_RATES.general;
                const enabledStores = getEnabledStores();
                const activePlatforms = PLATFORMS_META.filter(p => enabledStores[p.id] !== false);

                tableBody.innerHTML = '';
                if (sellPrice <= 0 || activePlatforms.length === 0) return;

                let maxProfit = -Infinity;
                const results = activePlatforms.map(p => {
                    const platformRate = rates[p.id] || { rate: 0.15, fixed: 0.30, label: p.baseName };
                    const fee = (sellPrice * platformRate.rate) + platformRate.fixed;
                    const profit = sellPrice - (cost + shipping + fee);
                    const roi = cost > 0 ? (profit / cost) * 100 : 0;
                    const denom = 1 - platformRate.rate;
                    const breakEven = denom > 0 ? (cost + shipping + platformRate.fixed) / denom : 0;
                    const isUnderBreakEven = sellPrice < breakEven;
                    if (profit > maxProfit) maxProfit = profit;
                    return { ...p, label: platformRate.label, fee, profit, roi, breakEven, isUnderBreakEven };
                });

                results.forEach(item => {
                    const tr = document.createElement('tr');
                    const isBest = item.profit === maxProfit && item.profit > 0;
                    const isNeg = item.profit < 0;
                    const profitClass = item.isUnderBreakEven || isNeg ? 'seller-calc-negative-val seller-calc-under-breakeven' : (isBest ? 'seller-calc-best-val' : '');
                    const formattedProfit = isNeg ? `-$${Math.abs(item.profit).toFixed(2)}` : `$${item.profit.toFixed(2)}`;

                    tr.innerHTML = `
                        <td>${item.label}</td>
                        <td>$${item.fee.toFixed(2)}</td>
                        <td>$${item.breakEven.toFixed(2)}</td>
                        <td class="${profitClass}">
                            <div>${formattedProfit}</div>
                            ${item.isUnderBreakEven ? '<span class="seller-calc-badge-under">Under</span>' : ''}
                        </td>
                        <td>${cost > 0 ? `${item.roi.toFixed(0)}%` : '-'}</td>
                    `;
                    tableBody.appendChild(tr);
                });
            }

            // Input Event Listeners
            costInp.addEventListener('input', calculate);
            sellPriceInp.addEventListener('input', calculate);
            shippingInp.addEventListener('input', calculate);
            categorySelect.addEventListener('change', calculate);

            // 1-Click Auto-Fill Handler
            container.querySelector('#sc-scrapeBtn').addEventListener('click', () => {
                if (!isPro()) {
                    proModal.style.display = 'flex';
                    showToast('⚡ 1-Click Auto-Fill requires Seller Pro.', 'seller-calc-status-warn');
                    return;
                }
                const refreshed = scrapeCurrentListing();
                if (refreshed && refreshed.price > 0) {
                    currentData = refreshed;
                    sellPriceInp.value = refreshed.price.toFixed(2);
                    shippingInp.value = refreshed.shipping.toFixed(2);
                    categorySelect.value = refreshed.category || 'general';
                    const banner = container.querySelector('#sc-scrapedBanner');
                    if (banner) {
                        banner.style.display = 'flex';
                        container.querySelector('#sc-scrapedTitle').textContent = refreshed.title;
                        container.querySelector('#sc-scrapedPlatform').textContent = refreshed.platform;
                    }
                    showToast(`✨ Auto-filled listing data from ${refreshed.platform}!`);
                    calculate();
                } else {
                    showToast('⚠️ Could not detect price from listing.', 'seller-calc-status-warn');
                }
            });

            // Navigation
            container.querySelector('#sc-headerListBtn').addEventListener('click', () => {
                viewMain.style.display = 'none';
                viewSettings.style.display = 'none';
                viewSourcing.style.display = 'block';
                renderSourcingList();
            });

            container.querySelector('#sc-openSourcingBtn').addEventListener('click', () => {
                viewMain.style.display = 'none';
                viewSettings.style.display = 'none';
                viewSourcing.style.display = 'block';
                renderSourcingList();
            });

            container.querySelector('#sc-backFromListBtn').addEventListener('click', () => {
                viewSourcing.style.display = 'none';
                viewMain.style.display = 'block';
                const count = getSourcingList().length;
                container.querySelector('#sc-headerListCount').textContent = count;
                container.querySelector('#sc-sourcingBadge').textContent = `${count}/50`;
                calculate();
            });

            container.querySelector('#sc-toSettingsBtn').addEventListener('click', () => {
                viewMain.style.display = 'none';
                viewSourcing.style.display = 'none';
                viewSettings.style.display = 'block';
                renderStoresSettings();
            });

            container.querySelector('#sc-backFromSettingsBtn').addEventListener('click', () => {
                viewSettings.style.display = 'none';
                viewMain.style.display = 'block';
                calculate();
            });

            // Pro Modal Listeners
            container.querySelector('#sc-proBadgeBtn').addEventListener('click', () => {
                proModal.style.display = 'flex';
            });
            container.querySelector('#sc-closeProBtn').addEventListener('click', () => {
                proModal.style.display = 'none';
            });
            container.querySelector('#sc-toggleProBtn').addEventListener('click', () => {
                const current = isPro();
                setPro(!current);
                const updated = isPro();
                const badge = container.querySelector('#sc-proBadgeBtn');
                const tierText = container.querySelector('#sc-tierText');
                if (updated) {
                    badge.classList.add('is-pro');
                    tierText.textContent = 'PRO';
                    if (currentData.price > 0) {
                        sellPriceInp.value = currentData.price.toFixed(2);
                        sellPriceVal = currentData.price;
                        if (currentData.shipping > 0) {
                            shippingInp.value = currentData.shipping.toFixed(2);
                            shippingVal = currentData.shipping;
                        }
                        if (currentData.category) {
                            categorySelect.value = currentData.category;
                            selectedCategory = currentData.category;
                        }
                        const banner = container.querySelector('#sc-scrapedBanner');
                        if (banner) {
                            banner.style.display = 'flex';
                            container.querySelector('#sc-scrapedTitle').textContent = currentData.title;
                            container.querySelector('#sc-scrapedPlatform').textContent = currentData.platform;
                        }
                        calculate();
                    }
                } else {
                    badge.classList.remove('is-pro');
                    tierText.textContent = 'Free';
                    const banner = container.querySelector('#sc-scrapedBanner');
                    if (banner) banner.style.display = 'none';
                }
                container.querySelector('#sc-toggleProBtn').textContent = updated ? 'Downgrade to Free Tier' : '⭐ Activate Pro Tier (Demo)';
                proModal.style.display = 'none';
                showToast(updated ? '👑 Seller Pro Tier Activated!' : 'Switched to Free Tier');
            });

            // Sourcing Sheet View Rendering
            function renderSourcingList() {
                const list = getSourcingList();
                const itemsContainer = container.querySelector('#sc-itemsContainer');
                const statProfit = container.querySelector('#sc-statProfit');
                const statRoi = container.querySelector('#sc-statRoi');
                const statItems = container.querySelector('#sc-statItems');
                const sourcingTitleCount = container.querySelector('#sc-sourcingTitleCount');
                const headerListCount = container.querySelector('#sc-headerListCount');
                const sourcingBadge = container.querySelector('#sc-sourcingBadge');

                const countStr = `${list.length}/${MAX_SOURCING_ITEMS}`;
                if (headerListCount) headerListCount.textContent = list.length;
                if (sourcingBadge) sourcingBadge.textContent = countStr;
                if (sourcingTitleCount) sourcingTitleCount.textContent = list.length;
                if (statItems) statItems.textContent = countStr;

                itemsContainer.innerHTML = '';
                if (list.length === 0) {
                    itemsContainer.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 20px; font-size: 11px;">Your Sourcing List is empty. Save items from the calculator to track margins!</div>';
                    statProfit.textContent = '$0.00';
                    statRoi.textContent = '0%';
                    return;
                }

                let totalP = 0;
                let totalR = 0;

                list.forEach((item, idx) => {
                    totalP += (item.bestProfit || 0);
                    totalR += (item.bestRoi || 0);

                    const card = document.createElement('div');
                    card.className = 'seller-calc-item-card';
                    const isNeg = (item.bestProfit || 0) < 0;
                    const pStr = isNeg ? `-$${Math.abs(item.bestProfit).toFixed(2)}` : `+$${(item.bestProfit || 0).toFixed(2)}`;
                    const urlHtml = item.url ? `<a href="${item.url}" target="_blank" class="seller-calc-item-link">🔗 Link</a>` : '';

                    card.innerHTML = `
                        <div class="seller-calc-item-card-header">
                            <div style="display: flex; align-items: center; overflow: hidden;">
                                <span class="seller-calc-item-card-title" title="${item.title}">${item.title}</span>
                                ${urlHtml}
                            </div>
                            <button class="seller-calc-item-del-btn" data-index="${idx}">×</button>
                        </div>
                        <div class="seller-calc-item-card-details">
                            <span>Cost: $${item.cost.toFixed(2)} → Sell: $${item.sellPrice.toFixed(2)}</span>
                            <span style="color: ${isNeg ? '#ef4444' : '#4ade80'}; font-weight: 700;">${pStr} (${item.bestRoi.toFixed(0)}%)</span>
                        </div>
                    `;

                    card.querySelector('.seller-calc-item-del-btn').addEventListener('click', () => {
                        list.splice(idx, 1);
                        saveSourcingList(list);
                        renderSourcingList();
                    });
                    itemsContainer.appendChild(card);
                });

                statProfit.textContent = totalP >= 0 ? `$${totalP.toFixed(2)}` : `-$${Math.abs(totalP).toFixed(2)}`;
                statRoi.textContent = `${(totalR / list.length).toFixed(0)}%`;
            }

            // Stores Settings Rendering
            function renderStoresSettings() {
                const storesList = container.querySelector('#sc-storesList');
                const enabled = getEnabledStores();
                storesList.innerHTML = '';

                PLATFORMS_META.forEach(p => {
                    const row = document.createElement('div');
                    row.className = 'seller-calc-store-item';
                    const checked = enabled[p.id] !== false;

                    row.innerHTML = `
                        <div>
                            <span class="seller-calc-store-name">${p.baseName}</span>
                            <span class="seller-calc-store-desc">${p.desc}</span>
                        </div>
                        <label class="seller-calc-switch">
                            <input type="checkbox" data-id="${p.id}" ${checked ? 'checked' : ''}>
                            <span class="seller-calc-slider"></span>
                        </label>
                    `;

                    row.querySelector('input').addEventListener('change', (e) => {
                        enabled[p.id] = e.target.checked;
                        saveEnabledStores(enabled);
                        calculate();
                    });
                    storesList.appendChild(row);
                });
            }

            // Save to Sourcing List
            container.querySelector('#sc-saveToSourcingBtn').addEventListener('click', () => {
                if (!isPro()) {
                    proModal.style.display = 'flex';
                    showToast('📊 Saving to Sourcing List requires Seller Pro.', 'seller-calc-status-warn');
                    return;
                }

                const list = getSourcingList();
                if (list.length >= MAX_SOURCING_ITEMS) {
                    showToast('⚠️ Sourcing List full (50 max). Export CSV or remove items.', 'seller-calc-status-warn');
                    return;
                }

                const cost = parseFloat(costInp.value) || 0;
                const price = parseFloat(sellPriceInp.value) || 0;
                const ship = parseFloat(shippingInp.value) || 0;
                const cat = categorySelect.options[categorySelect.selectedIndex] ? categorySelect.options[categorySelect.selectedIndex].text : 'General Merchandise';

                const rates = CATEGORY_RATES[categorySelect.value] || CATEGORY_RATES.general;
                const enabled = getEnabledStores();
                const activePlatforms = PLATFORMS_META.filter(p => enabled[p.id] !== false);

                let bestProfit = -Infinity;
                let bestChannel = currentData.platform || 'Direct';
                let bestRoi = 0;

                activePlatforms.forEach(p => {
                    const pRates = rates[p.id] || { rate: 0.15, fixed: 0.30 };
                    const fee = (price * pRates.rate) + pRates.fixed;
                    const profit = price - (cost + ship + fee);
                    if (profit > bestProfit) {
                        bestProfit = profit;
                        bestChannel = p.baseName;
                        bestRoi = cost > 0 ? (profit / cost) * 100 : 0;
                    }
                });

                if (bestProfit === -Infinity) {
                    bestProfit = 0;
                    bestRoi = 0;
                }

                const newItem = {
                    id: Date.now().toString(),
                    date: new Date().toLocaleDateString(),
                    title: currentData.title || document.title || 'Product Listing',
                    category: cat,
                    url: currentData.url || window.location.href,
                    cost,
                    sellPrice: price,
                    shipping: ship,
                    bestChannel,
                    bestProfit,
                    bestRoi
                };

                list.unshift(newItem);
                saveSourcingList(list);
                renderSourcingList();
                const count = list.length;
                const headerCount = container.querySelector('#sc-headerListCount');
                const badge = container.querySelector('#sc-sourcingBadge');
                if (headerCount) headerCount.textContent = count;
                if (badge) badge.textContent = `${count}/50`;
                showToast(`💾 Saved "${(newItem.title || 'Item').substring(0, 22)}..." to Sourcing List!`);
            });

            // Robust Multi-Engine CSV Export
            function downloadCsvData(csvText, filename) {
                // Try Chrome Extension Background Download API first (bypasses CSP on Poshmark, Amazon, eBay)
                if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                    try {
                        chrome.runtime.sendMessage({
                            action: "DOWNLOAD_CSV",
                            filename: filename,
                            csv: csvText
                        }, (response) => {
                            if (chrome.runtime.lastError || !response || !response.success) {
                                triggerClientDownload(csvText, filename);
                            }
                        });
                        return;
                    } catch (e) {
                        // Fallback to client download
                    }
                }
                triggerClientDownload(csvText, filename);
            }

            function triggerClientDownload(csvText, filename) {
                try {
                    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.style.display = 'none';
                    link.setAttribute('href', url);
                    link.setAttribute('download', filename);
                    (document.body || document.documentElement).appendChild(link);
                    link.click();
                    setTimeout(() => {
                        try {
                            link.remove();
                            URL.revokeObjectURL(url);
                        } catch (e) {}
                    }, 1500);
                } catch (err) {
                    // Fallback to Data URI if Blob is restricted
                    try {
                        const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvText);
                        const link = document.createElement('a');
                        link.style.display = 'none';
                        link.setAttribute('href', dataUri);
                        link.setAttribute('download', filename);
                        (document.body || document.documentElement).appendChild(link);
                        link.click();
                        setTimeout(() => {
                            try { link.remove(); } catch (e) {}
                        }, 1500);
                    } catch (e2) {
                        console.error('CSV Export Error:', e2);
                    }
                }
            }

            // CSV Export Button
            container.querySelector('#sc-exportCsvBtn').addEventListener('click', () => {
                if (!isPro()) {
                    proModal.style.display = 'flex';
                    showToast('📥 CSV Export requires Seller Pro.', 'seller-calc-status-warn');
                    return;
                }

                const list = getSourcingList();
                if (list.length === 0) {
                    showToast('⚠️ Sourcing List is empty. Save items from the calculator to export!', 'seller-calc-status-warn');
                    return;
                }

                const headers = ["Date", "Item Title", "Category", "Product URL", "Item Cost ($)", "Sell Price ($)", "Shipping ($)", "Best Channel", "Net Profit ($)", "ROI (%)"];
                const escapeCsv = (val) => `"${String(val !== undefined && val !== null ? val : '').replace(/"/g, '""')}"`;

                const rows = list.map(item => [
                    escapeCsv(item.date || new Date().toLocaleDateString()),
                    escapeCsv(item.title || 'Untitled Item'),
                    escapeCsv(item.category || 'General Merchandise'),
                    escapeCsv(item.url || 'N/A'),
                    (typeof item.cost === 'number' ? item.cost : parseFloat(item.cost) || 0).toFixed(2),
                    (typeof item.sellPrice === 'number' ? item.sellPrice : parseFloat(item.sellPrice) || 0).toFixed(2),
                    (typeof item.shipping === 'number' ? item.shipping : parseFloat(item.shipping) || 0).toFixed(2),
                    escapeCsv(item.bestChannel || 'N/A'),
                    (typeof item.bestProfit === 'number' ? item.bestProfit : parseFloat(item.bestProfit) || 0).toFixed(2),
                    `${(typeof item.bestRoi === 'number' ? item.bestRoi : parseFloat(item.bestRoi) || 0).toFixed(0)}%`
                ].join(','));

                const csvContent = "\uFEFF" + [headers.map(escapeCsv).join(','), ...rows].join('\r\n');
                const filename = `sourcing_scout_list_${new Date().toISOString().split('T')[0]}.csv`;
                downloadCsvData(csvContent, filename);
                showToast(`📥 Exported CSV sheet with ${list.length} scouted items!`);
            });

            // Clear List
            container.querySelector('#sc-clearListBtn').addEventListener('click', () => {
                if (confirm('Clear all scouted items in Sourcing List?')) {
                    saveSourcingList([]);
                    renderSourcingList();
                    showToast('🗑️ Sourcing List cleared.');
                }
            });

            // Minimize to floating badge
            const minBtn = container.querySelector('#sc-minimizeBtn');
            if (minBtn) {
                minBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    renderMinimizedBadge();
                });
            }

            calculate();
        }

        function renderMinimizedBadge() {
            isWindowExpanded = false;
            const userIsPro = isPro();
            if (userIsPro && (!currentData.price || currentData.price <= 0)) {
                const fresh = scrapeCurrentListing();
                if (fresh && fresh.price > 0) {
                    currentData = { ...currentData, ...fresh };
                    if (!sellPriceVal || sellPriceVal <= 0) sellPriceVal = fresh.price;
                }
            }
            const activePrice = userIsPro ? (sellPriceVal > 0 ? sellPriceVal : (currentData.price > 0 ? currentData.price : 0)) : 0;
            const displayPrice = activePrice > 0 ? `$${activePrice.toFixed(2)}` : '';
            const badgeText = displayPrice ? `⚡ Seller Calculator (${displayPrice})` : `⚡ Seller Calculator`;
            container.innerHTML = `
                <div class="seller-calc-floating-badge" id="sc-floatingBadgeBtn" title="Open Seller Fees & Profits Calculator">
                    <span>${badgeText}</span>
                </div>
            `;
            const btn = container.querySelector('#sc-floatingBadgeBtn');
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    renderFullWidget();
                });
            }
        }

        renderMinimizedBadge();

        return {
            expand: () => renderFullWidget(),
            minimize: () => renderMinimizedBadge(),
            isExpanded: () => isWindowExpanded,
            getContainer: () => container,
            updateData: (newData) => {
                if (!newData) newData = scrapeCurrentListing();
                if (!newData) return;
                const userIsPro = isPro();
                if (newData.price > 0) {
                    currentData.price = newData.price;
                    if (userIsPro && (!sellPriceVal || sellPriceVal <= 0)) {
                        sellPriceVal = newData.price;
                    }
                }
                if (newData.shipping > 0) {
                    currentData.shipping = newData.shipping;
                    if (userIsPro && (!shippingVal || shippingVal <= 0)) {
                        shippingVal = newData.shipping;
                    }
                }
                if (newData.title) currentData.title = newData.title;
                if (newData.platform) currentData.platform = newData.platform;
                if (newData.url) currentData.url = newData.url;
                if (newData.category && userIsPro) selectedCategory = newData.category;

                if (!isWindowExpanded) {
                    const badgeSpan = container.querySelector('#sc-floatingBadgeBtn span');
                    if (badgeSpan) {
                        const activePrice = userIsPro ? (sellPriceVal > 0 ? sellPriceVal : (currentData.price > 0 ? currentData.price : 0)) : 0;
                        const displayPrice = activePrice > 0 ? `$${activePrice.toFixed(2)}` : '';
                        badgeSpan.textContent = displayPrice ? `⚡ Seller Calculator (${displayPrice})` : `⚡ Seller Calculator`;
                    }
                }
            }
        };
    }

    function toggleWidget() {
        if (!activeWidgetInstance) {
            activeWidgetInstance = createOrUpdateWidget();
        }
        if (activeWidgetInstance) {
            const parent = document.body || document.documentElement;
            const container = activeWidgetInstance.getContainer();
            if (parent && container && !document.getElementById('seller-calc-overlay-container')) {
                parent.appendChild(container);
            }

            if (activeWidgetInstance.isExpanded()) {
                activeWidgetInstance.minimize();
            } else {
                activeWidgetInstance.expand();
            }
        }
    }

    window.__SELLER_CALC_TOGGLE__ = toggleWidget;

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        try {
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                if (request && request.action === "TOGGLE_SELLER_CALCULATOR") {
                    toggleWidget();
                    sendResponse({ status: "ok" });
                }
            });
        } catch (e) {}
    }

    function init() {
        const parent = document.body || document.documentElement;
        if (!parent) {
            window.addEventListener('DOMContentLoaded', init, { once: true });
            return;
        }

        let retries = 0;
        function checkAndMount() {
            const data = scrapeCurrentListing();
            if (!activeWidgetInstance) {
                activeWidgetInstance = createOrUpdateWidget(data);
            } else {
                const currentParent = document.body || document.documentElement;
                const container = activeWidgetInstance.getContainer();
                if (currentParent && container && !document.getElementById('seller-calc-overlay-container')) {
                    currentParent.appendChild(container);
                }
                if (data && data.price > 0 && !activeWidgetInstance.isExpanded()) {
                    activeWidgetInstance.updateData(data);
                }
            }

            if (retries < 12) {
                retries++;
                setTimeout(checkAndMount, 500);
            }
        }

        checkAndMount();

        let lastHref = location.href;
        setInterval(() => {
            if (location.href !== lastHref) {
                lastHref = location.href;
                const freshData = scrapeCurrentListing();
                if (activeWidgetInstance) {
                    activeWidgetInstance.updateData(freshData);
                }
            }
        }, 800);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

