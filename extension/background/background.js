console.log("Parity background service worker started.");

chrome.runtime.onInstalled.addListener(() => {
  console.log("Parity installed.");
});