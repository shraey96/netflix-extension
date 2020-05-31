console.log("~~ Running Content Script ~~")

let videoStates = {}
let videoIdRatings = {}
let undoList = []

const settings = {
  isKidsMode: false,
  matchScoreFilter: false,
  isDesignMode: false,
}

const statusMaps = {
  hide: 0,
  dim: 1,
  show: 2,
}

const statusMapsReverse = {
  0: "hide",
  1: "dim",
  2: "show",
}

const pendingMatchAPIRequests = {}
const successMatchAPIRequests = {}

let apiURL = null
let shaktiAPIAuthURL = null

chrome.storage.local.get(
  { videoStates: {}, undoList: [], extensionSettings: {} },
  (r) => {
    console.log("Value currently is ", r)

    if (r) {
      videoStates = { ...videoStates, ...(r.videoStates || {}) }
      undoList = [...undoList, ...(r.undoList || [])]

      settings.isKidsMode = (r.extensionSettings || {}).isKidsMode || false
      settings.matchScoreFilter =
        (r.extensionSettings || {}).matchScoreFilter || false
      settings.isDesignMode = (r.extensionSettings || {}).isDesignMode || false
    }

    setFetchAPIURL()

    setInterval(() => {
      addMarkersToCard()
    }, 500)

    setInterval(() => {
      makeMatchAPIFetchRequest()
    }, 5000)
  }
)

const addMarkersToCard = (reInit = false) => {
  const DOMQuery = `.title-card-container`
  const videoCardDOM = document.querySelectorAll(DOMQuery)

  const headerVideoDOM = document.querySelector(
    ".jawBoneContainer.slider-hover-trigger-layer"
  )

  const bigRowDOM = document.querySelector('[data-list-context="bigRow"]')

  const { isDesignMode } = settings

  if (videoCardDOM) {
    Array.from(videoCardDOM).forEach((x) => {
      const data = x.querySelector(".ptrack-content .slider-refocus")
      const videoName = data.getAttribute("aria-label")
      const videoId = data
        .getAttribute("href")
        .match(/\/(.*)\?/)
        .pop()
        .replace("watch/", "")

      x.setAttribute("data-extension-marked", videoId)

      addToFetchQueue(videoId)

      const moddedVideoState = getShowToggleStatus(videoId)

      if (typeof moddedVideoState !== undefined) {
        resetCardClasses(x)
        elemClass = `extension-card-${statusMapsReverse[moddedVideoState]}`
        if (moddedVideoState === 1) {
          x.querySelector(".slider-refocus").classList.add(elemClass)
        } else {
          data.closest(".slider-item").classList.add(elemClass)
        }
      }

      const videoStateControllerDOM = x.querySelector(
        ".extension-video-toggle-container"
      )

      addControllerCard(x, videoId, videoName)

      // if (isDesignMode) {
      //   if (videoStateControllerDOM !== null) return

      //   const divNode = document.createElement("div")

      //   divNode.innerHTML = `
      //   <div class="extension-video-toggle-container" data-video-id=${videoId} data-video-name="${videoName}">
      //     <span class="extension-video-toggle-action pin-remove" data-action-type="hide">
      //     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="context-fill" d="M11.414 10l2.293-2.293a1 1 0 0 0 0-1.414 4.418 4.418 0 0 0-.8-.622L11.425 7.15h.008l-4.3 4.3v-.017l-1.48 1.476a3.865 3.865 0 0 0 .692.834 1 1 0 0 0 1.37-.042L10 11.414l3.293 3.293a1 1 0 0 0 1.414-1.414zm3.293-8.707a1 1 0 0 0-1.414 0L9.7 4.882A2.382 2.382 0 0 1 8 2.586V2a1 1 0 0 0-1.707-.707l-5 5A1 1 0 0 0 2 8h.586a2.382 2.382 0 0 1 2.3 1.7l-3.593 3.593a1 1 0 1 0 1.414 1.414l12-12a1 1 0 0 0 0-1.414zm-9 6a4.414 4.414 0 0 0-1.571-1.015l2.143-2.142a4.4 4.4 0 0 0 1.013 1.571 4.191 4.191 0 0 0 .9.684L6.39 8.2a4.2 4.2 0 0 0-.683-.907z"></path></svg>
      //     </span>
      //     <span class="extension-video-toggle-action pin-out" data-action-type="dim">
      //     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="context-fill" d="M14.707 13.293L11.414 10l2.293-2.293a1 1 0 0 0 0-1.414A4.384 4.384 0 0 0 10.586 5h-.172A2.415 2.415 0 0 1 8 2.586V2a1 1 0 0 0-1.707-.707l-5 5A1 1 0 0 0 2 8h.586A2.415 2.415 0 0 1 5 10.414v.169a4.036 4.036 0 0 0 1.337 3.166 1 1 0 0 0 1.37-.042L10 11.414l3.293 3.293a1 1 0 0 0 1.414-1.414zm-7.578-1.837A2.684 2.684 0 0 1 7 10.583v-.169a4.386 4.386 0 0 0-1.292-3.121 4.414 4.414 0 0 0-1.572-1.015l2.143-2.142a4.4 4.4 0 0 0 1.013 1.571A4.384 4.384 0 0 0 10.414 7h.172a2.4 2.4 0 0 1 .848.152z"></path></svg>
      //     </span>
      //     <span class="extension-video-toggle-action pinned" data-action-type="show">
      //     <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><path fill="context-fill" d="M10.53 9.47L8.25 7.19 9.8 5.643a.694.694 0 0 0 0-.98 3.04 3.04 0 0 0-2.161-.894h-.122A1.673 1.673 0 0 1 5.846 2.1v-.408A.693.693 0 0 0 4.664 1.2L1.2 4.664a.693.693 0 0 0 .49 1.182h.41a1.672 1.672 0 0 1 1.669 1.671v.117a2.8 2.8 0 0 0 .925 2.192.693.693 0 0 0 .949-.026L7.19 8.251l2.28 2.28a.75.75 0 0 0 1.06-1.061z"></path></svg>
      //     </span>
      //   </div>
      //   `
      //   x.appendChild(divNode)
      // } else {
      //   videoStateControllerDOM && videoStateControllerDOM.remove()
      // }
    })

    document.querySelectorAll(".no-pulsate").forEach((x) => {
      x.classList.add("extension-card-hide")
    })

    if (isDesignMode) {
      addClickListeners()
    }
  }

  if (bigRowDOM) {
    const videoName = bigRowDOM
      .querySelector(".billboard-title .title-logo")
      .getAttribute("title")
    const videoId = bigRowDOM
      .querySelector(".billboard-links a")
      .getAttribute("href")
      .match(/\/(.*)\?/)
      .pop()
      .replace("watch/", "")

    const videoStateControllerDOM = bigRowDOM.querySelector(
      ".extension-video-toggle-container"
    )
    addControllerCard(bigRowDOM, videoId, videoName)

    // if (isDesignMode) {
    //   if (videoStateControllerDOM !== null) return
    //   const divNode = document.createElement("div")

    //   divNode.innerHTML = `
    //   <div class="extension-video-toggle-container" data-video-id=${videoId} data-video-name="${videoName}">
    //     <span class="extension-video-toggle-action pin-remove" data-action-type="hide">
    //     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="context-fill" d="M11.414 10l2.293-2.293a1 1 0 0 0 0-1.414 4.418 4.418 0 0 0-.8-.622L11.425 7.15h.008l-4.3 4.3v-.017l-1.48 1.476a3.865 3.865 0 0 0 .692.834 1 1 0 0 0 1.37-.042L10 11.414l3.293 3.293a1 1 0 0 0 1.414-1.414zm3.293-8.707a1 1 0 0 0-1.414 0L9.7 4.882A2.382 2.382 0 0 1 8 2.586V2a1 1 0 0 0-1.707-.707l-5 5A1 1 0 0 0 2 8h.586a2.382 2.382 0 0 1 2.3 1.7l-3.593 3.593a1 1 0 1 0 1.414 1.414l12-12a1 1 0 0 0 0-1.414zm-9 6a4.414 4.414 0 0 0-1.571-1.015l2.143-2.142a4.4 4.4 0 0 0 1.013 1.571 4.191 4.191 0 0 0 .9.684L6.39 8.2a4.2 4.2 0 0 0-.683-.907z"></path></svg>
    //     </span>
    //     <span class="extension-video-toggle-action pin-out" data-action-type="dim">
    //     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="context-fill" d="M14.707 13.293L11.414 10l2.293-2.293a1 1 0 0 0 0-1.414A4.384 4.384 0 0 0 10.586 5h-.172A2.415 2.415 0 0 1 8 2.586V2a1 1 0 0 0-1.707-.707l-5 5A1 1 0 0 0 2 8h.586A2.415 2.415 0 0 1 5 10.414v.169a4.036 4.036 0 0 0 1.337 3.166 1 1 0 0 0 1.37-.042L10 11.414l3.293 3.293a1 1 0 0 0 1.414-1.414zm-7.578-1.837A2.684 2.684 0 0 1 7 10.583v-.169a4.386 4.386 0 0 0-1.292-3.121 4.414 4.414 0 0 0-1.572-1.015l2.143-2.142a4.4 4.4 0 0 0 1.013 1.571A4.384 4.384 0 0 0 10.414 7h.172a2.4 2.4 0 0 1 .848.152z"></path></svg>
    //     </span>
    //     <span class="extension-video-toggle-action pinned" data-action-type="show">
    //     <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><path fill="context-fill" d="M10.53 9.47L8.25 7.19 9.8 5.643a.694.694 0 0 0 0-.98 3.04 3.04 0 0 0-2.161-.894h-.122A1.673 1.673 0 0 1 5.846 2.1v-.408A.693.693 0 0 0 4.664 1.2L1.2 4.664a.693.693 0 0 0 .49 1.182h.41a1.672 1.672 0 0 1 1.669 1.671v.117a2.8 2.8 0 0 0 .925 2.192.693.693 0 0 0 .949-.026L7.19 8.251l2.28 2.28a.75.75 0 0 0 1.06-1.061z"></path></svg>
    //     </span>
    //   </div>
    //   `
    //   bigRowDOM.appendChild(divNode)
    //   addClickListeners()
    // } else {
    //   videoStateControllerDOM && videoStateControllerDOM.remove()
    // }
  }

  if (headerVideoDOM) {
    const videoStateControllerDOM = headerVideoDOM.querySelector(
      ".extension-video-toggle-container"
    )

    const videoId = headerVideoDOM.getAttribute("id")
    const videoName = document
      .querySelector(".jawBoneContainer.slider-hover-trigger-layer img")
      .getAttribute("alt")

    const moddedVideoState = getShowToggleStatus(videoId)

    if (typeof moddedVideoState !== undefined) {
      resetHeaderCardClasses()
      elemClass = `extension-card-${statusMapsReverse[moddedVideoState]}`
      if (moddedVideoState === 1) {
        headerVideoDOM.querySelector(".background").classList.add(elemClass)
        headerVideoDOM.querySelector(".jawBone").classList.add(elemClass)
      } else {
        headerVideoDOM.classList.add(elemClass)
      }
    }

    addControllerCard(headerVideoDOM, videoId, videoName)

    // if (isDesignMode) {
    //   if (videoStateControllerDOM !== null) return
    //   const divNode = document.createElement("div")

    //   divNode.innerHTML = `
    //   <div class="extension-video-toggle-container" data-video-id=${videoId} data-video-name="${videoName}">
    //     <span class="extension-video-toggle-action pin-remove" data-action-type="hide">
    //     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="context-fill" d="M11.414 10l2.293-2.293a1 1 0 0 0 0-1.414 4.418 4.418 0 0 0-.8-.622L11.425 7.15h.008l-4.3 4.3v-.017l-1.48 1.476a3.865 3.865 0 0 0 .692.834 1 1 0 0 0 1.37-.042L10 11.414l3.293 3.293a1 1 0 0 0 1.414-1.414zm3.293-8.707a1 1 0 0 0-1.414 0L9.7 4.882A2.382 2.382 0 0 1 8 2.586V2a1 1 0 0 0-1.707-.707l-5 5A1 1 0 0 0 2 8h.586a2.382 2.382 0 0 1 2.3 1.7l-3.593 3.593a1 1 0 1 0 1.414 1.414l12-12a1 1 0 0 0 0-1.414zm-9 6a4.414 4.414 0 0 0-1.571-1.015l2.143-2.142a4.4 4.4 0 0 0 1.013 1.571 4.191 4.191 0 0 0 .9.684L6.39 8.2a4.2 4.2 0 0 0-.683-.907z"></path></svg>
    //     </span>
    //     <span class="extension-video-toggle-action pin-out" data-action-type="dim">
    //     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="context-fill" d="M14.707 13.293L11.414 10l2.293-2.293a1 1 0 0 0 0-1.414A4.384 4.384 0 0 0 10.586 5h-.172A2.415 2.415 0 0 1 8 2.586V2a1 1 0 0 0-1.707-.707l-5 5A1 1 0 0 0 2 8h.586A2.415 2.415 0 0 1 5 10.414v.169a4.036 4.036 0 0 0 1.337 3.166 1 1 0 0 0 1.37-.042L10 11.414l3.293 3.293a1 1 0 0 0 1.414-1.414zm-7.578-1.837A2.684 2.684 0 0 1 7 10.583v-.169a4.386 4.386 0 0 0-1.292-3.121 4.414 4.414 0 0 0-1.572-1.015l2.143-2.142a4.4 4.4 0 0 0 1.013 1.571A4.384 4.384 0 0 0 10.414 7h.172a2.4 2.4 0 0 1 .848.152z"></path></svg>
    //     </span>
    //     <span class="extension-video-toggle-action pinned" data-action-type="show">
    //     <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><path fill="context-fill" d="M10.53 9.47L8.25 7.19 9.8 5.643a.694.694 0 0 0 0-.98 3.04 3.04 0 0 0-2.161-.894h-.122A1.673 1.673 0 0 1 5.846 2.1v-.408A.693.693 0 0 0 4.664 1.2L1.2 4.664a.693.693 0 0 0 .49 1.182h.41a1.672 1.672 0 0 1 1.669 1.671v.117a2.8 2.8 0 0 0 .925 2.192.693.693 0 0 0 .949-.026L7.19 8.251l2.28 2.28a.75.75 0 0 0 1.06-1.061z"></path></svg>
    //     </span>
    //   </div>
    //   `
    //   headerVideoDOM.appendChild(divNode)
    //   addClickListeners()
    // } else {
    //   videoStateControllerDOM && videoStateControllerDOM.remove()
    // }
  }
}

const addControllerCard = (elem, videoId, videoName) => {
  const { isDesignMode } = settings

  const videoStateControllerDOM = elem.querySelector(
    ".extension-video-toggle-container"
  )

  if (isDesignMode) {
    if (videoStateControllerDOM !== null) return
    const divNode = document.createElement("div")

    divNode.innerHTML = `
      <div class="extension-video-toggle-container" data-video-id=${videoId} data-video-name="${videoName}"> 
        <span class="extension-video-toggle-action pin-remove" data-action-type="hide">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="context-fill" d="M11.414 10l2.293-2.293a1 1 0 0 0 0-1.414 4.418 4.418 0 0 0-.8-.622L11.425 7.15h.008l-4.3 4.3v-.017l-1.48 1.476a3.865 3.865 0 0 0 .692.834 1 1 0 0 0 1.37-.042L10 11.414l3.293 3.293a1 1 0 0 0 1.414-1.414zm3.293-8.707a1 1 0 0 0-1.414 0L9.7 4.882A2.382 2.382 0 0 1 8 2.586V2a1 1 0 0 0-1.707-.707l-5 5A1 1 0 0 0 2 8h.586a2.382 2.382 0 0 1 2.3 1.7l-3.593 3.593a1 1 0 1 0 1.414 1.414l12-12a1 1 0 0 0 0-1.414zm-9 6a4.414 4.414 0 0 0-1.571-1.015l2.143-2.142a4.4 4.4 0 0 0 1.013 1.571 4.191 4.191 0 0 0 .9.684L6.39 8.2a4.2 4.2 0 0 0-.683-.907z"></path></svg>
        </span>
        <span class="extension-video-toggle-action pin-out" data-action-type="dim">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="context-fill" d="M14.707 13.293L11.414 10l2.293-2.293a1 1 0 0 0 0-1.414A4.384 4.384 0 0 0 10.586 5h-.172A2.415 2.415 0 0 1 8 2.586V2a1 1 0 0 0-1.707-.707l-5 5A1 1 0 0 0 2 8h.586A2.415 2.415 0 0 1 5 10.414v.169a4.036 4.036 0 0 0 1.337 3.166 1 1 0 0 0 1.37-.042L10 11.414l3.293 3.293a1 1 0 0 0 1.414-1.414zm-7.578-1.837A2.684 2.684 0 0 1 7 10.583v-.169a4.386 4.386 0 0 0-1.292-3.121 4.414 4.414 0 0 0-1.572-1.015l2.143-2.142a4.4 4.4 0 0 0 1.013 1.571A4.384 4.384 0 0 0 10.414 7h.172a2.4 2.4 0 0 1 .848.152z"></path></svg>
        </span>
        <span class="extension-video-toggle-action pinned" data-action-type="show">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><path fill="context-fill" d="M10.53 9.47L8.25 7.19 9.8 5.643a.694.694 0 0 0 0-.98 3.04 3.04 0 0 0-2.161-.894h-.122A1.673 1.673 0 0 1 5.846 2.1v-.408A.693.693 0 0 0 4.664 1.2L1.2 4.664a.693.693 0 0 0 .49 1.182h.41a1.672 1.672 0 0 1 1.669 1.671v.117a2.8 2.8 0 0 0 .925 2.192.693.693 0 0 0 .949-.026L7.19 8.251l2.28 2.28a.75.75 0 0 0 1.06-1.061z"></path></svg>
        </span>
      </div>
      `
    elem.appendChild(divNode)
    addClickListeners()
  } else {
    videoStateControllerDOM && videoStateControllerDOM.remove()
  }
}

const addClickListeners = () => {
  Array.from(
    document.querySelectorAll(
      ".extension-video-toggle-action:not([data-click-enabled])"
    )
  ).forEach((a) => {
    a.addEventListener("click", () => {
      const parentElement = a.parentElement
      const payload = {
        videoId: parentElement.getAttribute("data-video-id"),
        videoName: parentElement.getAttribute("data-video-name"),
        actionType: a.getAttribute("data-action-type"),
        parentElement,
        childElement: a,
      }

      handleShowToggleClick(payload)
    })

    a.setAttribute("data-click-enabled", true)
  })
}

const handleShowToggleClick = (payload) => {
  const { videoId, videoName, actionType } = payload
  let actionToSet = actionType
  if (
    actionType === "dim" &&
    videoStates[videoId] &&
    videoStates[videoId].action === "dim"
  ) {
    actionToSet = "show"
  }

  videoStates[videoId] = {
    videoId,
    videoName,
    action: actionToSet,
  }

  addToFetchQueue(videoId)

  const videoElementDOM = Array.from(
    document.querySelectorAll(
      `.title-card-container[data-extension-marked="${videoId}"]`
    )
  )

  if (videoElementDOM.length > 0) {
    videoElementDOM.forEach((f) => {
      resetCardClasses(f)
      if (actionType === "dim") {
        f.querySelector(".slider-refocus").classList.add("extension-card-dim")
      }

      if (actionType === "hide") {
        if (settings.isDesignMode) {
          f.querySelector(".slider-refocus").classList.add("extension-card-dim")
        } else {
          f.closest(".slider-item").classList.add(`extension-card-hide`)
        }
      }

      if (actionType === "show") {
        f.closest(".slider-item").classList.add("extension-card-show")
      }
    })

    chrome.storage.local.set({ videoStates: videoStates })
    undoList.push(videoId)
    chrome.storage.local.set({ undoList: undoList })
  }
}

const resetCardClasses = (elem) => {
  elem.closest(".slider-item").classList.remove("extension-card-hide")
  elem.closest(".slider-item").classList.remove("extension-card-show")
  elem.querySelector(".slider-refocus").classList.remove("extension-card-dim")
}

const resetHeaderCardClasses = () => {
  const headerVideoDOM = document.querySelector(
    ".jawBoneContainer.slider-hover-trigger-layer"
  )
  headerVideoDOM
    .querySelector(".background")
    .classList.remove("extension-card-dim")
  headerVideoDOM
    .querySelector(".jawBone")
    .classList.remove("extension-card-dim")
  headerVideoDOM.classList.remove("extension-card-hide")
  headerVideoDOM.classList.remove("extension-card-show")
}

const setFetchAPIURL = () => {
  const netflixVarDOM = document.querySelector("[data-a1]")
  const shaktiAPIValues = netflixVarDOM.getAttribute("data-a1")
  shaktiAPIAuthURL = netflixVarDOM.getAttribute("data-a2")
  apiURL = `https://www.netflix.com/nq/website/memberapi/${shaktiAPIValues}/pathEvaluator?webp=true&drmSystem=widevine&isVolatileBillboardsEnabled=true&routeAPIRequestsThroughFTL=false&isTop10Supported=true&isLocoSupported=false&categoryCraversEnabled=false&hasVideoMerchInBob=true&falcor_server=0.1.0&withSize=true&materialize=true&original_path=/shakti/${shaktiAPIValues}/pathEvaluator`
}

const addToFetchQueue = (videoId) => {
  if (!pendingMatchAPIRequests[videoId] && !successMatchAPIRequests[videoId]) {
    pendingMatchAPIRequests[videoId] = true
  }
}

const makeMatchAPIFetchRequest = () => {
  const { isDesignMode, matchScoreFilter } = settings

  if (
    matchScoreFilter &&
    (matchScoreFilter !== "" || matchScoreFilter !== 0) &&
    isDesignMode &&
    apiURL !== null
  ) {
    if (Object.keys(pendingMatchAPIRequests).length > 0) {
      const data = new URLSearchParams()
      data.append("authURL", shaktiAPIAuthURL)
      Object.keys(pendingMatchAPIRequests).forEach((k, j) => {
        data.append(
          "path",
          JSON.stringify(["videos", k, "userRating", "length"])
        )
      })

      console.log("## SENDING FETCH REQUEST ##")

      fetch(apiURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: data,
      })
        .then((response) => response.json())
        .then((data) => {
          Object.keys(data.jsonGraph.videos).forEach((a) => {
            delete pendingMatchAPIRequests[a]
            successMatchAPIRequests[a] = true
            videoIdRatings[a] =
              ((data.jsonGraph.videos[a].userRating || {}).value || {})
                .matchScore || false
          })
          getFullLogs()
        })
        .catch((err) => console.log("response err ===> ", err))
    }
  }
}

const undoVideoState = (videoId) => {
  Array.from(
    document.querySelectorAll(`[data-extension-marked="${videoId}"]`)
  ).forEach((f) => {
    f.closest(".slider-item").classList.remove("extension-card-hide")
  })
}

const sendMessage = (msg) => {
  chrome.runtime.sendMessage(msg, (response) => {
    console.log(response)
  })
}

const getShowToggleStatus = (videoId) => {
  const { isKidsMode, isDesignMode, matchScoreFilter } = settings

  let status = 0

  if (isDesignMode) {
    if (!videoStates[videoId]) {
      isKidsMode ? (status = 1) : (status = 2)
    } else {
      if (videoStates[videoId].action === "show") {
        status = 2
      } else {
        status = 1
      }
    }
  } else {
    if (!videoStates[videoId]) {
      isKidsMode ? (status = 0) : (status = 2)
    } else {
      status = statusMaps[videoStates[videoId].action] || 0
    }
  }

  if (
    !isKidsMode &&
    videoIdRatings[videoId] &&
    matchScoreFilter &&
    videoIdRatings[videoId] < matchScoreFilter
  ) {
    status = 1
  }

  return status
}

// msg listener chrome //

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("GOT MESSAGE ===> ", request)
  if (request.type === "settingsUpdate") {
    let shouldUpdate =
      settings.isDesignMode !== request.isDesignMode ||
      settings.isKidsMode !== request.isKidsMode

    settings.isKidsMode = request.isKidsMode || false
    settings.matchScoreFilter = request.matchScoreFilter || false
    settings.isDesignMode = request.isDesignMode || false

    console.log("@@@@@", settings)

    if (shouldUpdate) {
      addMarkersToCard(true)
      console.log("@@@ RESETTING CARDS @@@")
    }
  }
  if (request.type === "toggleDesignMode") {
    settings.isDesignMode = request.isDesignMode || false
    addMarkersToCard(true)
  }

  if (request.type === "itemUndo") {
    delete videoStates[request.videoId]
    undoVideoState(request.videoId)
    chrome.storage.local.set({ videoStates: videoStates })
    undoList = undoList.filter((f) => f !== request.videoId)
    chrome.storage.local.set({
      undoList: undoList,
    })
  }
  sendResponse({ received: true })
})

const getFullLogs = () => {
  console.log({
    settings,
    videoStates,
    videoIdRatings,
    pendingMatchAPIRequests,
    successMatchAPIRequests,
  })
}
