function handleDefaultCardClassToggle(payload) {
  const { isDesignMode, isKidsMode } = payload

  let hide = true

  if (!isDesignMode && isKidsMode) {
    hide = true
  } else {
    hide = false
  }

  const extensionDefaultStyleAttribute = `data-extension-style`
  const styleTagDOM = document.querySelector(
    `[${extensionDefaultStyleAttribute}]`
  )
  if (hide) {
    if (!styleTagDOM) {
      const s = document.createElement("style")
      s.setAttribute("data-extension-style", true)
      s.setAttribute("type", "text/css")
      s.innerHTML = `div[aria-label="Featured Content"], .slider-item, div[data-list-context="bigRow"] {position: fixed!important; top: -100vh!important} .handleNext {display: none !important;} `
      document.querySelector("head").appendChild(s)
    }
  } else {
    if (styleTagDOM) {
      styleTagDOM.remove()
    }
  }
}

chrome.storage.local.get({ profileList: {}, lastUsedProfile: false }, (r) => {
  const { profileList, lastUsedProfile } = r
  if (lastUsedProfile && profileList[lastUsedProfile]) {
    handleDefaultCardClassToggle(profileList[lastUsedProfile])
  }
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("GOT MESSAGE ON DEFAULT CLASS SETTER SCRIPT ===> ", request)
  if (request.type === "settingsUpdate") {
    handleDefaultCardClassToggle(request)
  }
  if (request.type === "toggleDesignMode") {
    handleDefaultCardClassToggle(request)
  }

  sendResponse({ received: true })
})
