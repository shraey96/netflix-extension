// event listeners //

console.log("~~ Running Bzackground Script ~~")

const videoIdToggleStates = {}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(
    sender.tab
      ? "from a content script:" + sender.tab.url
      : "from the extension"
  )
  handleMessage(request, sender, sendResponse)
})

const handleMessage = (request, sender, sendResponse) => {
  switch (request.type) {
    case "updateVideoState":
      videoIdToggleStates[request.videoId] = {
        ...(videoIdToggleStates[request.videoId] || []),
        ...request,
      }
      sendResponse(request.videoId)
      break
    case "getVideoState":
      // load object from storage and send
      break

    default:
      break
  }
}

// set to storage
