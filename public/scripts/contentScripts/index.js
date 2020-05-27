console.log("~~ Running Content Script ~~")

const addMarkersToCard = () => {
  const videoCardDOM = document.querySelectorAll(".title-card-container")
  if (videoCardDOM) {
    Array.from(videoCardDOM).forEach((x) => {
      const data = x.querySelector(".ptrack-content .slider-refocus")
      const videoName = data.getAttribute("aria-label")
      const videoId = data
        .getAttribute("href")
        .match(/\/(.*)\?/)
        .pop()
        .replace("watch/", "")

      const divNode = document.createElement("div")
      divNode.innerHTML = `
      <div class="extension-video-toggle-container" data-video-id=${videoId} data-video-name=${videoName}> 
        <span class="extension-video-toggle-action pin-remove">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="context-fill" d="M11.414 10l2.293-2.293a1 1 0 0 0 0-1.414 4.418 4.418 0 0 0-.8-.622L11.425 7.15h.008l-4.3 4.3v-.017l-1.48 1.476a3.865 3.865 0 0 0 .692.834 1 1 0 0 0 1.37-.042L10 11.414l3.293 3.293a1 1 0 0 0 1.414-1.414zm3.293-8.707a1 1 0 0 0-1.414 0L9.7 4.882A2.382 2.382 0 0 1 8 2.586V2a1 1 0 0 0-1.707-.707l-5 5A1 1 0 0 0 2 8h.586a2.382 2.382 0 0 1 2.3 1.7l-3.593 3.593a1 1 0 1 0 1.414 1.414l12-12a1 1 0 0 0 0-1.414zm-9 6a4.414 4.414 0 0 0-1.571-1.015l2.143-2.142a4.4 4.4 0 0 0 1.013 1.571 4.191 4.191 0 0 0 .9.684L6.39 8.2a4.2 4.2 0 0 0-.683-.907z"></path></svg>
        </span>
        <span class="extension-video-toggle-action pin-out">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="context-fill" d="M14.707 13.293L11.414 10l2.293-2.293a1 1 0 0 0 0-1.414A4.384 4.384 0 0 0 10.586 5h-.172A2.415 2.415 0 0 1 8 2.586V2a1 1 0 0 0-1.707-.707l-5 5A1 1 0 0 0 2 8h.586A2.415 2.415 0 0 1 5 10.414v.169a4.036 4.036 0 0 0 1.337 3.166 1 1 0 0 0 1.37-.042L10 11.414l3.293 3.293a1 1 0 0 0 1.414-1.414zm-7.578-1.837A2.684 2.684 0 0 1 7 10.583v-.169a4.386 4.386 0 0 0-1.292-3.121 4.414 4.414 0 0 0-1.572-1.015l2.143-2.142a4.4 4.4 0 0 0 1.013 1.571A4.384 4.384 0 0 0 10.414 7h.172a2.4 2.4 0 0 1 .848.152z"></path></svg>
        </span>
        <span class="extension-video-toggle-action pinned">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><path fill="context-fill" d="M10.53 9.47L8.25 7.19 9.8 5.643a.694.694 0 0 0 0-.98 3.04 3.04 0 0 0-2.161-.894h-.122A1.673 1.673 0 0 1 5.846 2.1v-.408A.693.693 0 0 0 4.664 1.2L1.2 4.664a.693.693 0 0 0 .49 1.182h.41a1.672 1.672 0 0 1 1.669 1.671v.117a2.8 2.8 0 0 0 .925 2.192.693.693 0 0 0 .949-.026L7.19 8.251l2.28 2.28a.75.75 0 0 0 1.06-1.061z"></path></svg>
        </span>
      </div>
      `
      x.appendChild(divNode)
    })

    addClickListeners()
  }
}

const addClickListeners = () => {
  Array.from(
    document.querySelectorAll(".extension-video-toggle-action")
  ).forEach((a) => {
    a.addEventListener("click", () => {
      // const parentElement = a.parentElement
      console.log(a.getAttribute("data-video-id"))
    })
  })
}

// mutation observer for is bob open //
// selected btn click //

addMarkersToCard()
