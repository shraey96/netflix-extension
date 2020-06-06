/*global chrome*/

import React, { useState, useEffect, useRef } from "react"

import "./base.scss"

const DEFAUL_PROFILE = {
  profileName: "Default",
  profileId: "Default",
}

// o: {name: '', ...settings}

const App = () => {
  const [settings, setSettings] = useState({})
  const [undoList, setUndoList] = useState({})
  const [netflixTabs, setNetflixTabs] = useState([])

  const [addProfileMode, toggleAddProfileMode] = useState(false)
  const [changePasswordMode, toggleChangePasswordMode] = useState(false)
  const [profileRenameMode, isProfileRenameMode] = useState(false)

  const [selectedProfile, toggleSelectedProfile] = useState(false)

  const [profileList, updateProfileList] = useState({})

  const [fieldInput, setFieldInput] = useState("")

  const prevDesignMode = useRef(settings.isDesignMode || false)

  const setChanges = () => {
    chrome.storage.local.set(
      {
        profileList: profileList,
        lastUsedProfile: selectedProfile,
      },
      () => {
        sendMsg({
          type: "settingsUpdate",
          ...(profileList[selectedProfile] || {}),
        })
      }
    )
  }

  useEffect(() => {
    chrome.tabs.query({}, (tabs) => {
      const reqTabs = tabs.filter((t) => t.url.includes("netflix.com/"))
      setNetflixTabs(reqTabs)
    })
    chrome.storage.local.get(
      {
        extensionSettings: {},
        undoList: [],
        profileList: {},
        lastUsedProfile: false,
        profileSelectionUndos: {},
      },
      (result) => {
        console.log("Value currently is ", result)
        if (result) {
          const allProfiles = {
            [DEFAUL_PROFILE.profileId]: DEFAUL_PROFILE,
            ...(result.profileList || {}),
          }

          updateProfileList(allProfiles)
          if (result.lastUsedProfile) {
            toggleSelectedProfile(result.lastUsedProfile)
          } else {
            const defaultProfile = Object.keys(allProfiles)[0]
            toggleSelectedProfile(defaultProfile)
          }
          setUndoList(result.profileSelectionUndos)
        }
      }
    )
  }, [])

  useEffect(() => {
    if (
      selectedProfile &&
      typeof (profileList[selectedProfile] || {}).isDesignMode !== undefined
    ) {
      chrome.storage.local.get({ profileList: {} }, (result) => {
        console.log("Value currently is ", result)
        const updatedSettings = {
          ...(result.extensionSettings || {}),
          isDesignMode: settings.isDesignMode,
        }
        const updatedProfiles = {
          ...profileList,
          [selectedProfile]: { ...profileList[selectedProfile] },
        }

        chrome.storage.local.set({
          profileList: updatedProfiles,
          lastUsedProfile: selectedProfile,
        })
        sendMsg({
          type: "toggleDesignMode",
          ...updatedProfiles[selectedProfile],
        })
      })
      // optimize later
      // prevDesignMode.current = settings.isDesignMode
    }
  }, [profileList, selectedProfile])

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
    const profileUndos = undoList[selectedProfile]
    console.log(profileUndos)
    if (profileUndos.length > 0) {
      sendMsg({ type: "itemUndo", videoId: profileUndos[0] })
      setUndoList((prevList) => ({
        ...prevList,
        [selectedProfile]: prevList[selectedProfile].slice(1),
      }))
    }
  }

  const handleProfileAction = (type) => {
    const isProfileMode = type === "newProfile"
    toggleAddProfileMode(isProfileMode)
    toggleChangePasswordMode(!isProfileMode)
  }

  const handleEnter = async (keyCode) => {
    if (keyCode === 13) {
      if (addProfileMode) {
        if (
          Object.values(profileList).some((x) => x.profileName === fieldInput)
        ) {
          alert("profile with same name exists...")
        } else {
          const profileListClone = { ...profileList }
          const clearedFieldInput = fieldInput.replace(" ", "_")
          profileListClone[clearedFieldInput] = {
            profileName: fieldInput,
            profileId: clearedFieldInput,
          }
          chrome.storage.local.set({ profileList: profileListClone }, () => {
            updateProfileList(profileListClone)
            toggleSelectedProfile(clearedFieldInput)
            toggleAddProfileMode(false)
            alert("profile added...")
          })
        }
      }
    }
  }

  const handleProfileSelect = (profile) => {
    toggleSelectedProfile(profile)
  }

  const handleProfileSettingUpdate = ({ isInput = false, setting, value }) => {
    // check if profile requires password //

    if (isInput) {
      updateProfileList((prevProfiles) => ({
        ...prevProfiles,
        [selectedProfile]: {
          ...prevProfiles[selectedProfile],
          [setting]: value,
        },
      }))
    } else {
      updateProfileList((prevProfiles) => ({
        ...prevProfiles,
        [selectedProfile]: {
          ...prevProfiles[selectedProfile],
          [setting]: !(prevProfiles[selectedProfile] || {})[setting],
        },
      }))
    }
  }

  const handleProfileRemove = () => {
    if (Object.keys(profileList).length <= 1) {
      alert(`cannot remove last profile`)
    } else {
      updateProfileList((prevList) => {
        const pClone = { ...prevList }
        delete pClone[selectedProfile]
        return pClone
      })
      const defaultProfile = Object.keys(profileList)[0]
      toggleSelectedProfile(defaultProfile)
      setChanges()
    }
  }

  console.log(
    234,
    settings,
    profileList,
    selectedProfile,
    profileList[selectedProfile]
  )

  return (
    <div className="app-wrapper">
      <div className="profiles">
        <div className="profile-selector">
          <label for="profileList">Choose Profile:</label>
          <select
            id="profileList"
            onChange={(e) => handleProfileSelect(e.target.value)}
            value={selectedProfile}
          >
            <option disabled selected value>
              -- select an option --
            </option>
            {Object.keys(profileList).map((o) => {
              return <option value={o}>{o.profileName || o}</option>
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
          <button
            disabled={Object.keys(profileList) <= 1}
            onClick={() => handleProfileRemove()}
          >
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
            // disabled={!selectedProfile}

            checked={(profileList[selectedProfile] || {}).isDesignMode}
            onChange={() =>
              handleProfileSettingUpdate({ setting: "isDesignMode" })
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
            checked={(profileList[selectedProfile] || {}).isKidsMode}
            onChange={() =>
              handleProfileSettingUpdate({ setting: "isKidsMode" })
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
            value={
              (profileList[selectedProfile] || {}).matchScoreFilter || false
            }
            onChange={(e) => {
              const val = parseInt(e.target.value, 10)
              handleProfileSettingUpdate({
                setting: "matchScoreFilter",
                value: val,
                isInput: true,
              })
            }}
          />
        </div>
        <div className="checbox-container">
          <input
            type="checkbox"
            name="unMatchScore"
            id="unMatchScore"
            className="input-checkbox"
            checked={(profileList[selectedProfile] || {}).hideWithoutMatch}
            onChange={() =>
              handleProfileSettingUpdate({ setting: "hideWithoutMatch" })
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
            checked={(profileList[selectedProfile] || {}).hideDisLiked}
            onChange={() =>
              handleProfileSettingUpdate({ setting: "hideDisLiked" })
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
            checked={(profileList[selectedProfile] || {}).hideLiked}
            onChange={() =>
              handleProfileSettingUpdate({ setting: "hideLiked" })
            }
          />
          <label className="label" for="hideLiked">
            Hide Liked Shows
          </label>
        </div>
        <div className="buttons-container">
          <button onClick={() => setChanges()}>Apply</button>
          {(profileList[selectedProfile] || {}).isDesignMode && (
            <button
              disabled={(undoList[selectedProfile] || []).length === 0}
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
