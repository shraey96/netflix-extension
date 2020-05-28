/*global chrome*/

import React, { useState, useEffect } from "react"
import "./base.scss"

const App = () => {
  const [settings, setSettings] = useState({})
  const [undoList, setUndoList] = useState([])
  const [netflixTabs, setNetflixTabs] = useState([])

  const setChanges = () => {
    chrome.storage.local.set({ extensionSettings: settings }, (value) => {
      sendMsg({ type: "settingsUpdate", ...settings })
    })
  }

  useEffect(() => {
    chrome.tabs.query({}, (tabs) => {
      const reqTabs = tabs.filter((t) => t.url.includes("netflix.com/"))
      setNetflixTabs(reqTabs)
      attachMsgListener()
    })
    chrome.storage.local.get(
      { extensionSettings: {}, undoList: [] },
      (result) => {
        console.log("Value currently is ", result)
        if (result) {
          setSettings(result.extensionSettings)
          setUndoList(result.undoList)
        }
      }
    )
  }, [])

  const attachMsgListener = () => {}

  const sendMsg = (message) => {
    netflixTabs.forEach((t) => {
      chrome.tabs.sendMessage(t.id, message, (response) => {
        if (response) {
          console.log(2222, response)
        }
      })
    })
  }

  const undoChange = () => {
    if (undoList.length > 0) {
      sendMsg({ type: "itemUndo", videoId: undoList[0] })
      setUndoList((prevList) => [...prevList].slice(1))
    }
  }

  console.log(111, settings, undoList)

  return (
    <div className="app-wrapper">
      <div className="controls">
        <div className="checbox-container">
          <label className="label" for="kidsMode">
            Kids Mode
          </label>
          <input
            type="checkbox"
            name="kidsMode"
            className="input-checkbox"
            checked={settings.isKidsMode}
            onChange={() =>
              setSettings((prevSettings) => ({
                ...settings,
                isKidsMode: !prevSettings.isKidsMode,
              }))
            }
          />
        </div>
        <div className="match-score">
          <label for="matchScore">Filter Match Score: </label>
          <input
            type="number"
            name="matchScore"
            value={settings.matchScoreFilter}
            onChange={(e) =>
              setSettings({
                ...settings,
                matchScoreFilter: parseInt(e.target.value, 10),
              })
            }
          />
        </div>
        <div className="buttons-container">
          <button onClick={() => setChanges()}>Apply</button>
          <button disabled={undoList.length === 0} onClick={() => undoChange()}>
            Undo
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
