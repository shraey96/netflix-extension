/*global chrome*/

import React, { useState, useEffect, useRef } from "react"
import "./base.scss"

const App = () => {
  const [settings, setSettings] = useState({})
  const [undoList, setUndoList] = useState([])
  const [netflixTabs, setNetflixTabs] = useState([])

  const prevDesignMode = useRef(settings.isDesignMode || false)

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

  useEffect(() => {
    if (prevDesignMode.current !== settings.isDesignMode) {
      // send message
      sendMsg({ type: "toggleDesignMode", isDesignMode: settings.isDesignMode })
      prevDesignMode.current = settings.isDesignMode
    }
  }, [settings.isDesignMode])

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

  console.log(111, settings, undoList, prevDesignMode)

  return (
    <div className="app-wrapper">
      <div className="controls">
        <div className="checbox-container">
          <input
            type="checkbox"
            name="designMode"
            id="designMode"
            className="input-checkbox"
            checked={settings.isDesignMode}
            onChange={() =>
              setSettings((prevSettings) => ({
                ...settings,
                isDesignMode: !prevSettings.isDesignMode,
              }))
            }
          />
          <label className="label" for="designMode">
            Design Mode
          </label>
        </div>
        <div className="checbox-container">
          <input
            type="checkbox"
            name="kidsMode"
            id="kidsMode"
            className="input-checkbox"
            checked={settings.isKidsMode}
            onChange={() =>
              setSettings((prevSettings) => ({
                ...settings,
                isKidsMode: !prevSettings.isKidsMode,
              }))
            }
          />
          <label className="label" for="kidsMode">
            Kids Mode
          </label>
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
