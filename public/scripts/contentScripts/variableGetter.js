const s = document.createElement("script")
s.innerHTML = `
const divNode = document.createElement("div")
divNode.setAttribute("data-a1", window.netflix.appContext.state.model.models.serverDefs.data.BUILD_IDENTIFIER)
divNode.setAttribute("data-a2", window.netflix.reactContext.models.userInfo.data.authURL)
document.querySelector('body').appendChild(divNode)
`
document.head.appendChild(s)
