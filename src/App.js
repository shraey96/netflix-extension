/*global chrome*/

import React, { useState, useEffect, useRef } from "react"

import { TOOLTIP_TEXTS } from "./constants"

import "./base.scss"

const DEFAUL_PROFILE = {
  profileName: "Default",
  profileId: "Default",
}

const App = () => {
  const [settings, setSettings] = useState({})
  const [undoList, setUndoList] = useState({})
  const [netflixTabs, setNetflixTabs] = useState([])

  const [addProfileMode, toggleAddProfileMode] = useState(false)
  const [changePasswordMode, toggleChangePasswordMode] = useState(false)

  const [selectedProfile, toggleSelectedProfile] = useState(false)

  const [profileList, updateProfileList] = useState({})

  const [fieldInput, setFieldInput] = useState("")
  const [newPasswordInput, setNewPasswordInput] = useState(false)

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

        const updatedProfiles = {
          ...profileList,
          [selectedProfile]: {
            ...result.profileList[selectedProfile],
            isDesignMode: profileList[selectedProfile].isDesignMode,
          },
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
    const isProfileMode =
      type === "newProfile" || type === "renameProfile" ? type : false
    const isPasswordMode =
      type === "changePassword" || type === "newPassword" ? type : false

    toggleAddProfileMode(isProfileMode)
    toggleChangePasswordMode(isPasswordMode)
  }

  const handleEnter = async (keyCode) => {
    if (keyCode === 13) {
      if (addProfileMode === "newProfile") {
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
            resetInputStates()
            alert("profile added...")
          })
        }
      }
      if (addProfileMode === "renameProfile") {
        if (
          Object.values(profileList).some((x) => x.profileName === fieldInput)
        ) {
          alert("profile with same name exists...")
        } else {
          const profileListClone = { ...profileList }
          profileListClone[selectedProfile].profileName = fieldInput
          chrome.storage.local.set({ profileList: profileListClone }, () => {
            updateProfileList(profileListClone)
            resetInputStates()
            alert("profile name updated...")
          })
        }
      }
      if (changePasswordMode === "changePassword") {
        const profileListClone = { ...profileList }
        profileListClone[selectedProfile].password = fieldInput
        chrome.storage.local.set({ profileList: profileListClone }, () => {
          updateProfileList(profileListClone)
          resetInputStates()
          alert("password changed...")
        })
      }
      if (changePasswordMode === "newPassword") {
        console.log("121212", fieldInput, newPasswordInput)
        if (fieldInput !== newPasswordInput) {
          alert("passwords do not match ...")
        } else {
          const profileListClone = { ...profileList }
          profileListClone[selectedProfile].password = newPasswordInput
          chrome.storage.local.set({ profileList: profileListClone }, () => {
            updateProfileList(profileListClone)
            resetInputStates()
            alert("password changed...")
          })
        }
      }
    }
  }

  const resetInputStates = () => {
    toggleAddProfileMode(false)
    toggleChangePasswordMode(false)
    setFieldInput("")
    setNewPasswordInput("")
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
    profileList[selectedProfile],
    undoList[selectedProfile]
  )

  console.log(66666, changePasswordMode, addProfileMode)

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
              return (
                <option value={o}>{profileList[o].profileName || o}</option>
              )
            })}
          </select>
          <div className="profile-selector__actions">
            <button onClick={() => handleProfileAction("newProfile")}>
              Add Profile
            </button>
            <button onClick={() => handleProfileAction("renameProfile")}>
              Rename Profile
            </button>
            <button
              disabled={Object.keys(profileList) <= 1}
              onClick={() => handleProfileRemove()}
            >
              Remove Profile
            </button>
          </div>
        </div>
        {(addProfileMode || changePasswordMode) && (
          <div className="input-container">
            <label className="label" for="fieldInput">
              {changePasswordMode ? "New Password: " : "Profile Name: "}
            </label>
            <input
              type={
                addProfileMode
                  ? "text"
                  : changePasswordMode
                  ? "passowrd"
                  : "passowrd"
              }
              value={fieldInput}
              autoFocus
              placeholder={
                addProfileMode
                  ? addProfileMode === "renameProfile"
                    ? profileList[selectedProfile].profileName ||
                      selectedProfile
                    : "Profile Name"
                  : changePasswordMode
                  ? changePasswordMode === "changePassword"
                    ? "Change Password"
                    : "New Password"
                  : ""
              }
              id="fieldInput"
              onChange={(e) => setFieldInput(e.target.value)}
              onKeyDown={(e) => handleEnter(e.keyCode)}
            />
            {changePasswordMode === "newPassword" && (
              <input
                type="passowrd"
                value={newPasswordInput || ""}
                placeholder="confirm password"
                id="fieldInput"
                onChange={(e) => setNewPasswordInput(e.target.value)}
                onKeyDown={(e) => handleEnter(e.keyCode)}
              />
            )}
          </div>
        )}
        <div className="profile-action-buttons">
          <button onClick={() => handleProfileAction("changePassword")}>
            Change Password
          </button>
          <button onClick={() => handleProfileAction("newPassword")}>
            New Password
          </button>
        </div>
      </div>
      <div className="controls">
        <div
          className="checbox-container design-mode"
          title={TOOLTIP_TEXTS.DESIGN_MODE}
        >
          <input
            type="checkbox"
            name="designMode"
            id="designMode"
            className="input-checkbox"
            disabled={!selectedProfile}
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
        <div className="checbox-container" title={TOOLTIP_TEXTS.KIDS_MODE}>
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
        <div className="match-score" title={TOOLTIP_TEXTS.FILTER_MATCH_SCORE}>
          <label for="matchScore">Filter Match Score: </label>
          <input
            type="number"
            name="matchScore"
            value={
              (profileList[selectedProfile] || {}).matchScoreFilter || false
            }
            onChange={(e) => {
              const val = parseInt(e.target.value, 10)
              if (val > 100 || val < 0) return
              handleProfileSettingUpdate({
                setting: "matchScoreFilter",
                value: val,
                isInput: true,
              })
            }}
          />{" "}
          <span>%</span>
        </div>
        <div
          className="checbox-container"
          title={TOOLTIP_TEXTS.HIDE_WITHOUT_MATCH}
        >
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
        <div className="checbox-container" title={TOOLTIP_TEXTS.HIDE_DISLIKE}>
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
        <div className="checbox-container" title={TOOLTIP_TEXTS.HIDE_LIKE}>
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

          <button
            disabled={
              !(
                (profileList[selectedProfile] || {}).isDesignMode &&
                (undoList[selectedProfile] || []).length > 0
              )
            }
            onClick={() => undoChange()}
          >
            Undo
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
