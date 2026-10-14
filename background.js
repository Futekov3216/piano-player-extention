// The toolbar icon opens the player in its own window, which stays open (a toolbar popup closes on every click outside it).
// Clicking the icon again focuses the existing window instead of opening a second one.
chrome.action.onClicked.addListener(async () => {
  const url = chrome.runtime.getURL('popup.html');
  const [open] = await chrome.runtime.getContexts({ contextTypes: ['TAB'], documentUrls: [url] });
  if (open) return chrome.windows.update(open.windowId, { focused: true });
  chrome.windows.create({ url, type: 'popup', width: 340, height: 600 });
});
