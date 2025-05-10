chrome.runtime.onInstalled.addListener(() => {
    chrome.action.setBadgeText({ text: "🔊" });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.audible !== undefined) {
        chrome.runtime.sendMessage({ type: "update_tabs" });
    }
});
