// Background Service Worker for Seller Fees & Profits Calculator

async function toggleWidgetOnTab(tabId) {
    if (!tabId) return;

    try {
        const response = await chrome.tabs.sendMessage(tabId, { action: "TOGGLE_SELLER_CALCULATOR" });
        if (response && response.status === "ok") return;
    } catch (err) {
        // Tab content script not ready or port disconnected
    }

    try {
        await chrome.scripting.insertCSS({
            target: { tabId },
            files: ["content.css"]
        }).catch(() => {});

        await chrome.scripting.executeScript({
            target: { tabId },
            files: ["content.js"]
        }).catch(() => {});

        setTimeout(() => {
            chrome.tabs.sendMessage(tabId, { action: "TOGGLE_SELLER_CALCULATOR" }).catch(() => {
                chrome.scripting.executeScript({
                    target: { tabId },
                    func: () => {
                        if (typeof window.__SELLER_CALC_TOGGLE__ === 'function') {
                            window.__SELLER_CALC_TOGGLE__();
                        }
                    }
                }).catch(() => {});
            });
        }, 80);
    } catch (e) {
        // Suppress expected runtime errors on restricted tabs
    }
}

chrome.action.onClicked.addListener(async (tab) => {
    if (!tab || !tab.id || !tab.url) return;
    if (tab.url.startsWith("chrome://") || tab.url.startsWith("edge://") || tab.url.startsWith("about:") || tab.url.startsWith("chrome-extension://")) {
        return;
    }
    await toggleWidgetOnTab(tab.id);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request && request.action === "DOWNLOAD_CSV") {
        try {
            const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(request.csv);
            if (chrome.downloads && chrome.downloads.download) {
                chrome.downloads.download({
                    url: dataUrl,
                    filename: request.filename || 'sourcing_scout_list.csv',
                    saveAs: false
                }, (downloadId) => {
                    if (chrome.runtime.lastError) {
                        sendResponse({ success: false, error: chrome.runtime.lastError.message });
                    } else {
                        sendResponse({ success: true, downloadId });
                    }
                });
                return true; // Keep channel open for async response
            } else {
                sendResponse({ success: false, error: "Downloads API not available" });
            }
        } catch (e) {
            sendResponse({ success: false, error: e.message });
        }
    }
});
