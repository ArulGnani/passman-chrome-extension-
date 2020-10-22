
var activeTabId = 0;

chrome.tabs.onActivated.addListener(tab => {
    chrome.tabs.get(tab.tabId, current_tab_info => {
        if (current_tab_info.url !== undefined) {

            activeTabId = tab.tabId

            console.log(current_tab_info.url, activeTabId);
        } 
    });
});

chrome.runtime.onMessage.addListener((req,_,sendResponse) => {
    if (req.msg === "tabId") {
        console.log(activeTabId);
        if (activeTabId !== 0) {  
            sendResponse({id: activeTabId});
        } else {
            sendResponse({id: null});
        }
    }
});

function getTabId(callback) {
    return new Promise(function(resolve, _) {
        chrome.tabs.get(activeTabId, current_tab_info => {
            var domin = new URL(current_tab_info.url).hostname;
            if (domin !== "newtab") resolve(domin);
            else resolve("newtab");
        });
    });
}
