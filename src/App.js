/*global chrome*/

import React, { useState, useEffect, useRef } from "react"

import "./base.scss"

const App = () => {
  const [settings, setSettings] = useState({})
  const [undoList, setUndoList] = useState([])
  const [netflixTabs, setNetflixTabs] = useState([])

  const [addProfileMode, toggleAddProfileMode] = useState(false)
  const [changePasswordMode, toggleChangePasswordMode] = useState(false)
  const [profileRenameMode, isProfileRenameMode] = useState(false)

  const [selectedProfile, toggleSelectedProfile] = useState(false)

  const [profileList, setProfileList] = useState({})

  const [fieldInput, setFieldInput] = useState("")

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
      { extensionSettings: {}, undoList: [], profileList: {} },
      (result) => {
        console.log("Value currently is ", result)
        if (result) {
          setSettings(result.extensionSettings)
          setUndoList(result.undoList)
          setProfileList(result.profileList || {})
        }
      }
    )
  }, [])

  useEffect(() => {
    if (prevDesignMode.current !== settings.isDesignMode) {
      chrome.storage.local.get(
        { extensionSettings: {}, undoList: [] },
        (result) => {
          console.log("Value currently is ", result)
          const updatedSettings = {
            ...(result.extensionSettings || {}),
            isDesignMode: settings.isDesignMode,
          }
          chrome.storage.local.set({ extensionSettings: updatedSettings })
          sendMsg({ type: "toggleDesignMode", ...updatedSettings })
        }
      )

      prevDesignMode.current = settings.isDesignMode
    }
  }, [settings.isDesignMode])

  const attachMsgListener = () => {}

  const sendMsg = (message) => {
    netflixTabs.forEach((t) => {
      chrome.tabs.sendMessage(t.id, message, (response) => {
        // if (response) {
        //   console.log(2222, response)
        // }
      })
    })
  }

  const undoChange = () => {
    if (undoList.length > 0) {
      sendMsg({ type: "itemUndo", videoId: undoList[0] })
      setUndoList((prevList) => [...prevList].slice(1))
    }
  }

  const handleFieldInputChange = (e) => {}

  const handleProfileAction = (type) => {
    const isProfileMode = type === "newProfile"
    console.log(isProfileMode)
    toggleAddProfileMode(isProfileMode)
    toggleChangePasswordMode(!isProfileMode)
  }

  const handleEnter = async (keyCode) => {
    if (keyCode === 13) {
      // check mode and action //
      if (addProfileMode) {
        if (Object.keys(profileList).some((x) => x === fieldInput)) {
          alert("profile with same name exists...")
        } else {
          console.log("Add Profile")
          const profileListClone = { ...profileList }
          profileListClone[fieldInput] = {}
          chrome.storage.local.set({ profileList: profileListClone }, () =>
            setProfileList(profileListClone)
          )
        }
      }
    }
  }

  console.log(111, settings)

  return (
    <div className="app-wrapper">
      <div className="profiles">
        <div className="profile-selector">
          <label for="profileList">Choose Profile:</label>
          <select
            id="profileList"
            onChange={(e) => console.log(e.target.value)}
            // value={selectedProfile}
          >
            {Object.keys(profileList).map((o) => {
              return <option value={o}>{o}</option>
            })}
          </select>
        </div>
        {(addProfileMode || changePasswordMode) && (
          <div className="input-container">
            <label className="label" for="fieldInput">
              {changePasswordMode ? "New Password: " : "Profile Name: "}
            </label>
            <input
              type="text"
              value={fieldInput}
              autoFocus
              id="fieldInput"
              onChange={(e) => setFieldInput(e.target.value)}
              onKeyDown={(e) => handleEnter(e.keyCode)}
            />
          </div>
        )}
        <div className="profile-action-buttons">
          <button onClick={() => handleProfileAction("newProfile")}>
            Add New Profile
          </button>
          <button disabled={Object.keys(profileList) <= 1}>
            Remove Profile
          </button>
          <button onClick={() => handleProfileAction("changePassword")}>
            Change Password
          </button>
        </div>
      </div>
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
        <p className="settings-separator">
          <u>Settings:</u>
        </p>
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
        <div className="checbox-container">
          <input
            type="checkbox"
            name="unMatchScore"
            id="unMatchScore"
            className="input-checkbox"
            checked={settings.hideWithoutMatch}
            onChange={() =>
              setSettings((prevSettings) => ({
                ...settings,
                hideWithoutMatch: !prevSettings.hideWithoutMatch,
              }))
            }
          />
          <label className="label" for="unMatchScore">
            Hide shows without match score
          </label>
        </div>
        <div className="checbox-container">
          <input
            type="checkbox"
            name="hideDisLiked"
            id="hideDisLiked"
            className="input-checkbox"
            checked={settings.hideDisLiked}
            onChange={() =>
              setSettings((prevSettings) => ({
                ...settings,
                hideDisLiked: !prevSettings.hideDisLiked,
              }))
            }
          />
          <label className="label" for="hideDisLiked">
            Hide Disliked Shows
          </label>
        </div>
        <div className="checbox-container">
          <input
            type="checkbox"
            name="hideLiked"
            id="hideLiked"
            className="input-checkbox"
            checked={settings.hideLiked}
            onChange={() =>
              setSettings((prevSettings) => ({
                ...settings,
                hideLiked: !prevSettings.hideLiked,
              }))
            }
          />
          <label className="label" for="hideLiked">
            Hide Liked Shows
          </label>
        </div>
        <div className="buttons-container">
          <button onClick={() => setChanges()}>Apply</button>
          {settings.isDesignMode && (
            <button
              disabled={undoList.length === 0}
              onClick={() => undoChange()}
            >
              Undo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
