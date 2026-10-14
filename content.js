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

    let proCache = false; // Free tier by default
    let storesCache = { ebay: true, amazon: true, walmart: true, poshmark: true, stripe: true };
    let sourcingCache = [];

    function syncFromStorage() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get([PRO_STORAGE_KEY, STORAGE_KEY, SOURCING_STORAGE_KEY], (res) => {
                if (res) {
                    if (res[PRO_STORAGE_KEY] !== undefined) {
                        proCache = res[PRO_STORAGE_KEY] === true || res[PRO_STORAGE_KEY] === 'true';
                    }
                    if (res[STORAGE_KEY] && typeof res[STORAGE_KEY] === 'object') {
                        storesCache = { ebay: true, amazon: true, walmart: true, poshmark: true, stripe: true, ...res[STORAGE_KEY] };
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
                if (s) storesCache = { ebay: true, amazon: true, walmart: true, poshmark: true, stripe: true, ...JSON.parse(s) };
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
                    storesCache = { ebay: true, amazon: true, walmart: true, poshmark: true, stripe: true, ...changes[STORAGE_KEY].newValue };
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
        const str = String(text).replace(/\s+/g, ' ').trim();
        const lower = str.toLowerCase();

        // 1. High priority: "Cost to ship: $X.XX" or "Cost to ship: FREE"
        const costToShipMatch = str.match(/cost\s+to\s+ship\s*:?\s*(free|\$?\s*[0-9]+(?:\.[0-9]{2})?)/i);
        if (costToShipMatch && costToShipMatch[1]) {
            const valStr = costToShipMatch[1].trim();
            if (/free/i.test(valStr)) return 0.00;
            const num = parseFloat(valStr.replace(/[^0-9.]/g, ''));
            if (!isNaN(num)) return num;
        }

        // 2. High priority: Check for explicit "Free Shipping" / "Free delivery" when not accompanied by conditional spend/order requirements
        if (/^(?:free|free\s+shipping|free\s+delivery|fast\s+'n\s+free|free\s+standard\s+shipping)$/i.test(lower)) {
            return 0.00;
        }

        // 3. Patterns matching shipping with exact dollar amounts
        const patterns = [
            /(?:cost\s+to\s+ship|shipping|delivery|postage)\s*:?\s*(?:us)?\s*\$?\s*([0-9]+\.[0-9]{2})/i,
            /(?:us\s*)?\$([0-9]+\.[0-9]{2})\s*(?:shipping|delivery|postage|standard|expedited|economy|priority)/i,
            /\+\s*\$([0-9]+\.[0-9]{2})/i,
            /(?:or\s+fastest\s+delivery[^\$]*)\$\s*([0-9]+\.[0-9]{2})/i,
            /\$([0-9]+\.[0-9]{2})/
        ];
        for (const pat of patterns) {
            const m = str.match(pat);
            if (m && m[1]) {
                const val = parseFloat(m[1]);
                if (!isNaN(val)) return val;
            }
        }

        // Only fallback to free if unconditionally free (does not say "spend $35", "orders over", etc.)
        if (lower.includes('free') && !/(?:spend|order|when\s+you|over|\+)/i.test(lower)) {
            return 0.00;
        }
        return null;
    };

    const detectCategory = (title, extraText, platform) => {
        const rawCombined = `${title || ''} ${extraText || ''}`.toLowerCase();
        const cleanCombined = rawCombined.replace(/[^a-z0-9\s-]/g, ' ');

        const hasKeyword = (keywords) => {
            for (const kw of keywords) {
                if (kw.includes(' ') || kw.includes('-') || kw.includes('&') || kw.includes('(')) {
                    if (rawCombined.includes(kw) || cleanCombined.includes(kw.replace(/[^a-z0-9]/g, ' '))) {
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

        // 1. Direct High-Confidence Book & Media Taxonomy & Format Signals
        const strongMediaSignals = [
            'books & magazines', 'textbooks', 'books', 'book format', 'hardcover', 'paperback',
            'mass market paperback', 'spiral-bound', 'isbn-10', 'isbn-13', 'isbn', '(author)',
            'print length', 'reading age', 'kindle edition', 'kindle store', 'audiobook',
            'audiobooks', 'music & cds', 'vinyl records', 'movies & tv', 'dvds & blu-ray',
            'comic books', 'manga', 'graphic novel', 'graphic novels', 'bestsellers in books'
        ];
        if (hasKeyword(strongMediaSignals)) {
            return 'media';
        }

        // 2. Direct High-Confidence Electronics Taxonomy
        const strongElectronicsSignals = [
            'electronics', 'electronic', 'cell phones', 'cell phone', 'smartphone',
            'computers', 'computer', 'laptops', 'laptop', 'tablets', 'tablet',
            'audio & sound', 'audio', 'headphones', 'earbuds', 'speakers',
            'cameras, camcorders & drones', 'cameras & photo', 'camera', 'drone',
            'video games & consoles', 'video games', 'gaming console', 'smart home',
            'wearables', 'wearable technology', 'car electronics', 'media players',
            'home audio', 'portable audio', 'computer accessories', 'pc gaming'
        ];
        if (hasKeyword(strongElectronicsSignals)) {
            return 'electronics';
        }

        // 3. Comprehensive Electronics & Tech Keyword Dictionary
        const electronicsKeywords = [
            'laptop', 'macbook', 'chromebook', 'desktop', 'computer', 'pc', 'monitor', 'display',
            'gpu', 'cpu', 'processor', 'motherboard', 'ram', 'ssd', 'hdd', 'hard drive', 'flash drive',
            'memory card', 'sd card', 'microsd', 'keyboard', 'keycap', 'mouse', 'trackpad', 'webcam',
            'microphone', 'router', 'modem', 'wifi', 'ethernet', 'hub', 'dock', 'docking station',
            'scanner', 'printer', 'toner', 'ink cartridge', 'projector', 'stylus', 'apple pencil',
            'headphone', 'headphones', 'earbud', 'earbuds', 'airpod', 'airpods', 'headset', 'earphone',
            'earphones', 'speaker', 'speakers', 'soundbar', 'subwoofer', 'amplifier', 'amp', 'dac',
            'bluetooth', 'wireless', 'tws', 'noise canceling', 'noise cancelling', 'over-ear', 'in-ear',
            'walkman', 'ipod', 'mp3 player', 'boombox', 'soundcore',
            'phone', 'smartphone', 'iphone', 'android', 'samsung galaxy', 'pixel', 'ipad', 'tablet',
            'smartwatch', 'smart watch', 'apple watch', 'fitbit', 'garmin', 'whoop', 'smart ring',
            'aura ring', 'fitness tracker',
            'camera', 'dslr', 'mirrorless', 'camcorder', 'gopro', 'action cam', 'drone', 'quadcopter',
            'lens', 'tripod', 'gimbal', 'stabilizer', 'ring light', 'softbox', 'flash', 'speedlite',
            'dash cam', 'security camera', 'cctv', 'ring doorbell', 'nest cam',
            'playstation', 'ps5', 'ps4', 'ps3', 'ps2', 'psp', 'ps vita', 'xbox', 'xbox series', 'xbox one',
            'nintendo', 'switch', 'joy-con', 'joycon', 'wii', 'gamecube', 'gameboy', '3ds', '2ds',
            'steam deck', 'rog ally', 'legion go', 'vr headset', 'meta quest', 'oculus', 'htc vive',
            'pico vr', 'controller', 'gamepad', 'joystick', 'arcade stick',
            'charger', 'charging', 'fast charger', 'power bank', 'portable charger', 'battery pack',
            'magsafe', 'wireless charger', 'usb-c', 'type-c', 'lightning cable', 'hdmi', 'displayport',
            'ac adapter', 'power adapter', 'surge protector', 'power strip', 'inverter',
            'electric razor', 'shaver', 'razor', 'trimmer', 'beard trimmer', 'hair clipper', 'clippers',
            'hair dryer', 'blow dryer', 'straightener', 'curling iron', 'curling wand', 'hot air brush',
            'electric toothbrush', 'sonicare', 'oral-b', 'water flosser', 'epilator', 'massage gun',
            'electric massager', 'heating pad', 'treadmill', 'pedometer',
            'smart home', 'alexa', 'echo dot', 'echo show', 'google home', 'nest', 'smart plug',
            'smart bulb', 'led strip', 'smart light', 'tv', 'television', 'oled', 'qled', '4k tv',
            'roku', 'fire tv', 'firestick', 'chromecast', 'apple tv', 'remote control', 'robot vacuum',
            'roomba', 'air purifier', 'dehumidifier', 'humidifier', 'thermostat',
            'apple', 'sony', 'bose', 'sennheiser', 'audio-technica', 'jbl', 'beats', 'anker',
            'belkin', 'logitech', 'razer', 'corsair', 'steelseries', 'hyperx', 'elgato', 'dji',
            'insta360', 'canon', 'nikon', 'fujifilm', 'panasonic lumix', 'asus', 'acer', 'dell',
            'lenovo', 'thinkpad', 'alienware', 'msi', 'braun', 'norelco', 'philips norelco', 'dyson',
            'shark ninja', 'electronic', 'gadget', 'cordless', 'rechargeable', 'digital', 'infrared'
        ];
        if (hasKeyword(electronicsKeywords)) {
            return 'electronics';
        }

        // 4. Comprehensive Media & Book Keyword Dictionary
        const mediaKeywords = [
            'book', 'books', 'hardcover', 'paperback', 'novel', 'novels', 'textbook', 'textbooks',
            'comic', 'comics', 'manga', 'graphic novel', 'graphic novels', 'dvd', 'dvds',
            'blu-ray', 'bluray', '4k uhd', 'vhs', 'cassette', 'vinyl', 'record album', 'lp',
            'cd', 'cds', 'compact disc', 'audiobook', 'audiobooks', 'video game disc',
            'game cartridge', 'movie', 'movies', 'soundtrack', 'magazine', 'magazines',
            'periodical', 'sheet music', 'playbill', 'score', 'anthology', 'audio cd',
            'kindle', 'audible', 'author', 'isbn', 'isbn-10', 'isbn-13', 'publisher',
            'print length', 'reading age', 'mass market paperback', 'spiral-bound'
        ];
        if (hasKeyword(mediaKeywords)) {
            return 'media';
        }

        // 5. Comprehensive Apparel Keyword Dictionary
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
        if (hasKeyword(apparelKeywords)) {
            return 'apparel';
        }

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

    function scrapeCurrentListing() {
        const url = (window.location && window.location.href ? window.location.href : '');
        const urlLower = url.toLowerCase();
        const hostname = (window.location && window.location.hostname ? window.location.hostname : '');
        const isAmazon = hostname.includes('amazon.') || urlLower.includes('amazon.');
        const isEbay = hostname.includes('ebay.') || urlLower.includes('ebay.');
        const isPoshmark = hostname.includes('poshmark.') || urlLower.includes('poshmark.');
        const isWalmart = hostname.includes('walmart.') || urlLower.includes('walmart.');
        const isEtsy = hostname.includes('etsy.') || urlLower.includes('etsy.');

        let platform = isPoshmark ? 'Poshmark' : (isAmazon ? 'Amazon' : (isEbay ? 'eBay' : (isWalmart ? 'Walmart' : (isEtsy ? 'Etsy' : 'Custom'))));
        let title = '';
        let price = null;
        let shipping = 0.00;
        let categoryContext = '';

        if (isAmazon) {
            // Title Selectors: #productTitle, h1#title
            const titleEl = document.querySelector('#productTitle') ||
                            document.querySelector('h1#title') ||
                            document.querySelector('#title');
            if (titleEl && titleEl.textContent) {
                title = titleEl.textContent.trim().replace(/\s+/g, ' ');
            }

            // Price Selectors:
            // 1. .a-price .a-offscreen (primary hidden clean value)
            const offscreenEl = document.querySelector('.a-price .a-offscreen');
            if (offscreenEl && offscreenEl.textContent) {
                price = cleanPrice(offscreenEl.textContent);
            }

            // 2. #corePrice_feature_div .a-price .a-offscreen
            if (!price) {
                const coreOffscreenEl = document.querySelector('#corePrice_feature_div .a-price .a-offscreen');
                if (coreOffscreenEl && coreOffscreenEl.textContent) {
                    price = cleanPrice(coreOffscreenEl.textContent);
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
                const fallbackPriceEl = document.querySelector('#priceblock_ourprice') ||
                                        document.querySelector('#priceblock_dealprice');
                if (fallbackPriceEl && fallbackPriceEl.textContent) {
                    price = cleanPrice(fallbackPriceEl.textContent);
                }
            }

            const csaEl = document.querySelector('[data-csa-c-delivery-price]');
            if (csaEl) shipping = parseShippingText(csaEl.getAttribute('data-csa-c-delivery-price')) || 0;

            // Amazon Breadcrumbs & Category / Book Context
            const amazonCategorySelectors = [
                '#wayfinding-breadcrumbs_container',
                '#wayfinding-breadcrumbs_feature_div',
                '.a-breadcrumb',
                '#nav-subnav',
                '#nav-search-dropdown-card',
                '#searchDropdownBox option[selected]',
                '#booksTitle',
                '#books_feature_div',
                '[data-feature-name="booksTitle"]',
                '#productSubtitle',
                '#bylineInfo',
                '#bylineInfo_feature_div',
                '.author',
                '#tmmSwatches',
                '#formatSelectorHeader',
                '#detailBullets_feature_div',
                '#detailBulletsWrapper_feature_div',
                '#rpi-attribute-book_details-fiona_pages',
                '#rpi-attribute-book_details-isbn13',
                '#rpi-attribute-book_details-isbn10',
                '#rpi-attribute-book_details-publication_date',
                '#rpi-attribute-audiobook_details-release_date',
                '#productDetailsTable'
            ];
            for (const sel of amazonCategorySelectors) {
                const el = document.querySelector(sel);
                if (el && el.textContent) {
                    categoryContext += ` ${el.textContent.trim().replace(/\s+/g, ' ')}`;
                }
            }

            const ogType = document.querySelector('meta[property="og:type"]');
            if (ogType && ogType.content && ogType.content.toLowerCase().includes('book')) {
                categoryContext += ' book media';
            }

            if (document.querySelector('a[href*="/bestsellers/books"]') ||
                document.querySelector('a[href*="/Books/"]') ||
                document.querySelector('a[href*="node=283155"]') ||
                (window.location && window.location.href && /[\/=](283155|books|stripbooks)[\/?=&#]/i.test(window.location.href))) {
                categoryContext += ' books media';
            }
        } else if (isEbay) {
            // Title Selectors: h1.x-item-title__mainTitle .ux-textspans, h1#itemTitle
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

            const shipEl = document.querySelector('[data-testid="ux-labels-values--shipping"]') ||
                           document.querySelector('.ux-labels-values--shipping');
            if (shipEl) shipping = parseShippingText(shipEl.textContent) || 0;

            const breadcrumbs = document.querySelector('.breadcrumbs') || document.querySelector('.seo-breadcrumb-text');
            if (breadcrumbs) categoryContext += ` ${breadcrumbs.textContent}`;
        } else if (isPoshmark) {
            // Title Selectors: h1.listing__title, [data-test="listing-title"]
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

            // Next.js __NEXT_DATA__ fallback for Poshmark
            if (!price || !title) {
                const nextScript = document.querySelector('#__NEXT_DATA__');
                if (nextScript && nextScript.textContent) {
                    try {
                        const nextData = JSON.parse(nextScript.textContent);
                        const pp = nextData?.props?.pageProps;
                        const listing = pp?.listing || pp?.post || pp?.item || pp?.data || pp?.initialReduxState?.listing;
                        if (listing) {
                            if (!title) {
                                if (listing.title) title = listing.title;
                                else if (listing.name) title = listing.name;
                            }
                            if (!price) {
                                if (listing.price_amount && listing.price_amount.val) price = cleanPrice(listing.price_amount.val);
                                else if (listing.price) price = cleanPrice(listing.price);
                                else if (listing.original_price) price = cleanPrice(listing.original_price);
                            }
                            if (listing.shipping_price) shipping = cleanPrice(listing.shipping_price) || 0;
                            else if (listing.shipping_rate) shipping = cleanPrice(listing.shipping_rate) || 0;
                            else if (listing.shipping_fee) shipping = cleanPrice(listing.shipping_fee) || 0;

                            const getFieldText = (f) => (typeof f === 'object' ? f.display || f.name || f.title || '' : String(f || ''));
                            categoryContext += ` ${getFieldText(listing.department)} ${getFieldText(listing.category)} ${getFieldText(listing.sub_category)} ${listing.description || ''}`;
                        }
                    } catch (e) {}
                }
            }

            if (shipping === 0) {
                shipping = urlLower.includes('poshmark.ca') ? 13.49 : 7.97;
            }
        } else if (isWalmart) {
            // Title Selectors: h1#main-title, h1[itemprop="name"]
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

            const shipEl = document.querySelector('[data-testid="fulfillment-shipping"]') ||
                           document.querySelector('[data-testid="shipping-info"]');
            if (shipEl) shipping = parseShippingText(shipEl.textContent) || 0;

            const breadcrumbs = document.querySelector('nav[aria-label="breadcrumb"]') || document.querySelector('.breadcrumb');
            if (breadcrumbs && breadcrumbs.textContent) categoryContext += ` ${breadcrumbs.textContent}`;
        } else if (isEtsy) {
            // Etsy Title Selectors
            const etsyTitleSelectors = [
                'h1[data-buy-box-listing-title]',
                'h1.wt-text-body-01',
                'h1.wt-text-body-03',
                'h1.wt-line-height-tight',
                'div[data-component="listing-page-title"] h1',
                'h1'
            ];
            for (const sel of etsyTitleSelectors) {
                const el = document.querySelector(sel);
                if (el && el.textContent) {
                    title = el.textContent.trim().replace(/\s+/g, ' ');
                    if (title) break;
                }
            }

            // Etsy Price Selectors
            const etsyPriceSelectors = [
                'p.wt-text-title-larger span.currency-value',
                'div[data-buy-box-region="price"] p',
                'span.currency-value',
                '[data-selector="price-only"]',
                '.wt-text-title-larger',
                'p[data-buy-box-listing-price]',
                'p.wt-text-title-03',
                'div[data-buy-box-region="price"]'
            ];
            for (const sel of etsyPriceSelectors) {
                const el = document.querySelector(sel);
                if (el && el.textContent) {
                    const parsed = cleanPrice(el.textContent);
                    if (parsed && parsed > 0) {
                        price = parsed;
                        break;
                    }
                }
            }

            // Etsy Shipping Selectors
            const etsyShippingSelectors = [
                'div[data-selector="shipping-section"]',
                'div[data-component="shipping-and-returns"]',
                '#shipping-and-returns',
                'div.processing-and-shipping',
                'div[data-buy-box-region="shipping"]',
                '[data-sub-component="shipping-price"]',
                '[data-selector="shipping-cost"]',
                '.wt-badge'
            ];
            for (const sel of etsyShippingSelectors) {
                const el = document.querySelector(sel);
                if (el && el.textContent) {
                    const parsedShip = parseShippingText(el.textContent);
                    if (parsedShip !== null && parsedShip > 0) {
                        shipping = parsedShip;
                        break;
                    }
                }
            }

            // 2. Scan elements containing "Cost to ship" text
            if (shipping === 0) {
                const candidates = Array.from(document.querySelectorAll('div, p, span, tr, td')).filter(el => {
                    return el.children.length <= 3 && /cost\s+to\s+ship/i.test(el.textContent || '');
                });
                for (const el of candidates) {
                    const parsed = parseShippingText(el.textContent);
                    if (parsed !== null && parsed > 0) {
                        shipping = parsed;
                        break;
                    }
                    if (el.nextElementSibling) {
                        const parsedNext = parseShippingText(el.nextElementSibling.textContent);
                        if (parsedNext !== null && parsedNext > 0) {
                            shipping = parsedNext;
                            break;
                        }
                    }
                }
            }

            // 3. Fallback: Search anywhere in document text for "Cost to ship: $X.XX"
            if (shipping === 0 && document.body) {
                const bodyText = document.body.innerText || document.body.textContent || '';
                const match = bodyText.match(/cost\s+to\s+ship\s*:?\s*\$?\s*([0-9]+\.[0-9]{2})/i);
                if (match && match[1]) {
                    const val = parseFloat(match[1]);
                    if (!isNaN(val) && val > 0) {
                        shipping = val;
                    }
                }
            }

            // Etsy Category / Breadcrumbs
            const catBreadcrumbs = document.querySelector('ul[data-bread-crumbs]') ||
                                   document.querySelector('.wt-breadcrumbs') ||
                                   document.querySelector('nav[aria-label="Breadcrumb"]');
            if (catBreadcrumbs && catBreadcrumbs.textContent) {
                categoryContext += ` ${catBreadcrumbs.textContent}`;
            }
        }

        // Universal Fallback (Schema / JSON-LD):
        // If DOM selectors fail on any platform, scan script[type="application/ld+json"] tags
        if (!price || !title) {
            const schema = scanUniversalSchema();
            if (!title && schema.title) title = schema.title;
            if (!price && schema.price) price = schema.price;
        }

        // Final title fallback
        if (!title && document.title) {
            title = document.title.replace(/\s*[-|]\s*(amazon|ebay|poshmark|walmart|etsy).*$/i, '').trim();
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
                                <input type="number" id="sc-cost" class="seller-calc-input" placeholder="0.00" min="0" step="0.01" inputmode="decimal" value="${costVal > 0 ? costVal.toFixed(2) : ''}">
                            </div>
                            <div class="seller-calc-field">
                                <label>Selling Price ($)</label>
                                <input type="number" id="sc-sellPrice" class="seller-calc-input" placeholder="0.00" min="0" step="0.01" inputmode="decimal" value="${sellPriceVal > 0 ? sellPriceVal.toFixed(2) : ''}">
                            </div>
                        </div>

                        <div class="seller-calc-field">
                            <label>Est. Shipping & Materials ($)</label>
                            <input type="number" id="sc-shipping" class="seller-calc-input" placeholder="0.00" min="0" step="0.01" inputmode="decimal" value="${shippingVal > 0 ? shippingVal.toFixed(2) : '0.00'}">
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
                const cost = Math.max(0, parseFloat(costInp.value) || 0);
                const sellPrice = Math.max(0, parseFloat(sellPriceInp.value) || 0);
                const shipping = Math.max(0, parseFloat(shippingInp.value) || 0);
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

            function restrictToPositiveNumbers(input) {
                if (!input) return;

                // 1. Block keydown for -, +, e, E, and duplicate decimal point
                input.addEventListener('keydown', (e) => {
                    if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
                        e.preventDefault();
                        return;
                    }
                    if (e.key === '.') {
                        const val = input.value || '';
                        const selStart = input.selectionStart;
                        const selEnd = input.selectionEnd;
                        const selectedText = (selStart !== null && selEnd !== null) ? val.slice(selStart, selEnd) : '';
                        if (val.includes('.') && !selectedText.includes('.')) {
                            e.preventDefault();
                            return;
                        }
                    }
                });

                // 2. Block beforeinput for mobile, virtual keyboards, drag-and-drop
                input.addEventListener('beforeinput', (e) => {
                    if (e.data) {
                        if (/[-+eE]/.test(e.data)) {
                            e.preventDefault();
                            return;
                        }
                        if (e.data.includes('.')) {
                            const val = input.value || '';
                            const selStart = input.selectionStart;
                            const selEnd = input.selectionEnd;
                            const selectedText = (selStart !== null && selEnd !== null) ? val.slice(selStart, selEnd) : '';
                            if (val.includes('.') && !selectedText.includes('.')) {
                                e.preventDefault();
                                return;
                            }
                        }
                    }
                });

                // 3. Intercept paste to clean any invalid numbers (e.g. -3-4, --4, ++4, +-9000)
                input.addEventListener('paste', (e) => {
                    e.preventDefault();
                    const clipboardData = e.clipboardData || window.clipboardData;
                    const text = clipboardData ? clipboardData.getData('text') : '';
                    if (!text) return;

                    let clean = text.replace(/[^0-9.]/g, '');
                    const dotIndex = clean.indexOf('.');
                    if (dotIndex !== -1) {
                        clean = clean.slice(0, dotIndex + 1) + clean.slice(dotIndex + 1).replace(/\./g, '');
                    }

                    if (clean) {
                        const val = input.value || '';
                        const selStart = input.selectionStart !== null ? input.selectionStart : val.length;
                        const selEnd = input.selectionEnd !== null ? input.selectionEnd : val.length;
                        let combined = val.slice(0, selStart) + clean + val.slice(selEnd);
                        const firstDot = combined.indexOf('.');
                        if (firstDot !== -1) {
                            combined = combined.slice(0, firstDot + 1) + combined.slice(firstDot + 1).replace(/\./g, '');
                        }

                        const num = parseFloat(combined);
                        if (!isNaN(num) && num >= 0) {
                            input.value = combined;
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    }
                });

                // 4. Block drag and drop of text
                input.addEventListener('drop', (e) => {
                    e.preventDefault();
                });

                // 5. On input event: clear bad input or negative numbers
                input.addEventListener('input', () => {
                    if (input.validity && input.validity.badInput) {
                        input.value = '';
                        return;
                    }
                    if (input.value !== '') {
                        const val = parseFloat(input.value);
                        if (isNaN(val) || val < 0) {
                            input.value = '';
                        }
                    }
                });
            }

            // Input Event Listeners
            [costInp, sellPriceInp, shippingInp].forEach(inp => {
                if (inp) restrictToPositiveNumbers(inp);
            });
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
                    const floatPrice = parseFloat(refreshed.price);
                    
                    // Insert into #sc-sellPrice and dispatch 'input' event so calculations update immediately
                    sellPriceInp.value = floatPrice.toFixed(2);
                    sellPriceInp.dispatchEvent(new Event('input', { bubbles: true }));

                    // Also check for #sellPrice on the document if present and dispatch 'input'
                    const hostSellPrice = document.getElementById('sellPrice');
                    if (hostSellPrice && hostSellPrice !== sellPriceInp) {
                        hostSellPrice.value = floatPrice.toFixed(2);
                        hostSellPrice.dispatchEvent(new Event('input', { bubbles: true }));
                    }

                    shippingInp.value = refreshed.shipping.toFixed(2);
                    shippingInp.dispatchEvent(new Event('input', { bubbles: true }));

                    categorySelect.value = refreshed.category || 'general';
                    categorySelect.dispatchEvent(new Event('change', { bubbles: true }));

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

