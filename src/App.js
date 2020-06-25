/*global chrome*/

import React, { useState, useEffect, useRef } from "react"

import { TOOLTIP_TEXTS } from "./constants"

import "./base.scss"

import equal from "deep-equal"

const DEFAUL_PROFILE = {
  profileName: "Default",
  profileId: "Default",
}

const App = () => {
  const [undoList, setUndoList] = useState({})
  const [netflixTabs, setNetflixTabs] = useState([])

  const [addProfileMode, toggleAddProfileMode] = useState(false)
  const [changePasswordMode, toggleChangePasswordMode] = useState(false)

  const [selectedProfile, toggleSelectedProfile] = useState(false)
  const [appLastUsedProfile, setAppLastUsedProfile] = useState(false)
  const [profileList, updateProfileList] = useState({})

  const [fieldInput, setFieldInput] = useState("")
  const [profilePassword, setProfilePassword] = useState("")
  const [newPasswordInput, setNewPasswordInput] = useState(false)

  const [isDesignMode, toggleDesignMode] = useState(false)

  const isPasswordVerified = useRef(false)

  const setChanges = () => {
    if (addProfileMode || changePasswordMode) {
      manageProfileUpdateActions(true)
    } else {
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
  }

  const addMsgListener = () => {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === "checkDesignMode") {
        toggleDesignMode(request.isDesignMode)
      }
    })
  }

  useEffect(() => {
    chrome.tabs.query({}, (tabs) => {
      const reqTabs = tabs.filter((t) => t.url.includes("netflix.com/"))
      setNetflixTabs(reqTabs)
      addMsgListener()
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
            setAppLastUsedProfile(result.lastUsedProfile)
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
    if (netflixTabs.length > 0) {
      sendMsg({
        type: "checkDesignMode",
      })
    }
  }, [netflixTabs.length])

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
        // sendMsg({
        //   type: "toggleDesignMode",
        //   ...updatedProfiles[selectedProfile],
        // })
      })
    }
  }, [profileList, selectedProfile])

  const sendMsg = (message) => {
    netflixTabs.forEach((t) => {
      chrome.tabs.sendMessage(t.id, message, (response) => {})
    })
  }

  const undoChange = () => {
    const profileUndos = undoList[selectedProfile]

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

    if (isProfileMode || isProfileMode) {
      setTimeout(() => {
        document
          .querySelector(`#${isProfileMode ? "profileName" : "password"}`)
          .focus()
      }, 300)
    }

    if (type === "renameProfile") {
      console.log(
        1111,
        profileList,
        selectedProfile,
        profileList[selectedProfile]
      )
      setFieldInput(profileList[selectedProfile].profileName)
    }
  }

  const handleEnter = async (keyCode) => {
    if (keyCode === 13) {
      manageProfileUpdateActions()
    }
  }

  const manageProfileUpdateActions = (withSave = false) => {
    if (addProfileMode === "newProfile") {
      if (
        Object.values(profileList).some((x) => x.profileName === fieldInput)
      ) {
        alert("profile with same name exists...")
      } else if (fieldInput === "") {
        alert(`profile name cannot be blank`)
      } else {
        const profileListClone = { ...profileList }
        const clearedFieldInput = fieldInput.replace(" ", "_")
        profileListClone[clearedFieldInput] = {
          profileName: fieldInput,
          profileId: clearedFieldInput,
        }

        if (profilePassword) {
          const promptPassword = prompt(`Please confirm password`)

          if (
            promptPassword == null ||
            promptPassword == "" ||
            promptPassword !== profilePassword
          ) {
            alert("invalid password entered...")
            return false
          } else {
            profileListClone[clearedFieldInput] = {
              profileName: fieldInput,
              profileId: clearedFieldInput,
              password: profilePassword,
            }
          }
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
      } else if (fieldInput === "") {
        alert(`profile name cannot be blank`)
      } else {
        const profileListClone = { ...profileList }

        if (profileListClone[selectedProfile].profileName === fieldInput) {
          return
        }

        profileListClone[selectedProfile].profileName = fieldInput

        chrome.storage.local.set({ profileList: profileListClone }, () => {
          updateProfileList(profileListClone)
          resetInputStates()
          alert("profile name updated...")
        })
      }
    }
    if (changePasswordMode === "changePassword") {
      const oldPassword = profileList[selectedProfile].password

      if (oldPassword) {
        if (oldPassword !== profilePassword) {
          alert(
            "Old password invalid. Please authorize password change by typing profile old password into password field."
          )
          return
        } else {
          if (profilePassword) {
            const promptPassword = prompt(`Please confirm new password`)

            if (
              promptPassword == null ||
              promptPassword == "" ||
              promptPassword !== newPasswordInput
            ) {
              alert("invalid password entered...")
              return false
            }
          }
        }
      }

      if (!newPasswordInput) return
      alert("New password has been set for profile")
      const profileListClone = { ...profileList }
      profileListClone[selectedProfile].password = newPasswordInput

      chrome.storage.local.set({ profileList: profileListClone }, () => {
        updateProfileList(profileListClone)
        resetInputStates()
        alert("password changed...")
      })
    }

    setTimeout(() => {
      if (withSave) {
        setChanges()
      }
    }, 300)
  }

  const resetInputStates = () => {
    toggleAddProfileMode(false)
    toggleChangePasswordMode(false)
    setFieldInput("")
    setNewPasswordInput("")
    setProfilePassword("")
  }

  const handleProfileSelect = (profile) => {
    resetInputStates()
    if (managePasswordAuth(profile)) {
      toggleSelectedProfile(profile)
      setAppLastUsedProfile(profile)
      if (profile !== selectedProfile) {
        isPasswordVerified.current = false
      }
    }
  }

  const switchDesignMode = (value) => {
    const isPasswordAuth = value === false ? true : managePasswordAuth()
    if (isPasswordAuth) {
      toggleDesignMode(value)
      sendMsg({
        type: "toggleDesignMode",
        isDesignMode: value,
      })
    }
  }

  const handleProfileSettingUpdate = ({
    isInput = false,
    setting,
    value,
    skipAuth = false,
  }) => {
    // check if profile requires password //

    const bypass = (setting === "isDesignMode" && value === false) || skipAuth

    const isPasswordAuth =
      !(profileList[selectedProfile] || {}).passwordProtectForSettings || bypass
        ? true
        : managePasswordAuth()

    if (isPasswordAuth)
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

  const managePasswordAuth = (user = selectedProfile) => {
    const passwordType = (profileList[user] || {}).password ? "user" : "admin"

    if (appLastUsedProfile === user && user === "Default") {
      return true
    }

    if (!isPasswordVerified.current) {
      const promptPassword = prompt(
        `Please enter ${
          passwordType === "user" ? "profile" : "service-account"
        } password`
      )

      if (promptPassword == null || promptPassword == "") {
        alert("no password entered...")
        return false
      } else {
        let isVerified = false
        if (passwordType === "user") {
          isVerified = profileList[user].password === promptPassword
        }

        if (passwordType === "admin") {
          isVerified = promptPassword === "admin"
        }

        if (isVerified) {
          isPasswordVerified.current = true
          return true
        } else {
          alert("invalid password ...")
          return false
        }
      }
    }
    if (isPasswordVerified.current) {
      return true
    }
  }

  const handleProfileRemove = () => {
    if (managePasswordAuth("admin")) {
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
  }

  const handleApplyClick = () => {
    if (addProfileMode || changePasswordMode) {
      manageProfileUpdateActions()
    } else {
      sendMsg({
        type: "settingsUpdate",
        ...(profileList[selectedProfile] || {}),
      })
    }
  }

  const handleSettingsClose = () => {
    if (addProfileMode || changePasswordMode) {
      resetInputStates()
      return
    }
    chrome.storage.local.get(
      {
        profileList: {},
      },
      (result) => {
        if (result) {
          const areOldProfilesSame = equal(result.profileList, profileList)
          if (areOldProfilesSame) {
            window.close()
          } else {
            const r = window.confirm(
              " The settings you changed have not been Saved or Applied, press OK to discard changes or Cancel to return to settings."
            )
            if (r) {
              window.close()
            }
          }
        }
      }
    )
  }

  console.log(
    234,
    profileList,
    selectedProfile,
    profileList[selectedProfile],
    fieldInput,
    profilePassword
  )

  console.log(66666, changePasswordMode, addProfileMode)
  const isDisabled = addProfileMode || changePasswordMode

  return (
    <div className="app-wrapper">
      <div
        className="close-icon-container"
        onClick={() => handleSettingsClose()}
      >
        X
      </div>
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
        <div className="input-container">
          <label className="label" for="profileName">
            Profile Name:
          </label>
          <input
            type="text"
            value={
              !addProfileMode
                ? (profileList[selectedProfile] || {}).profileName || ""
                : fieldInput
            }
            disabled={!addProfileMode}
            placeholder={
              addProfileMode === "renameProfile"
                ? (profileList[selectedProfile] || {}).profileName || ""
                : "Profile Name"
            }
            id="profileName"
            onChange={(e) => setFieldInput(e.target.value)}
            onKeyDown={(e) => handleEnter(e.keyCode)}
          />
        </div>
        <div className="input-container for-password">
          <label className="label" for="password">
            Profile Password:
          </label>
          <input
            type="password"
            value={
              addProfileMode === "newProfile" || changePasswordMode
                ? profilePassword || ""
                : (profileList[selectedProfile] || {}).password || ""
            }
            disabled={!(addProfileMode === "newProfile" || changePasswordMode)}
            placeholder={
              addProfileMode
                ? (profileList[selectedProfile] || {}).password || ""
                : changePasswordMode
                ? "Password"
                : ""
            }
            id="password"
            onChange={(e) => {
              setProfilePassword(e.target.value)
            }}
            onKeyDown={(e) => handleEnter(e.keyCode)}
          />
          {changePasswordMode === "changePassword" && (
            <>
              <label className="label" for="password">
                New Password:
              </label>
              <input
                type="password"
                value={newPasswordInput || ""}
                placeholder="New Password"
                id="fieldInput"
                onChange={(e) => setNewPasswordInput(e.target.value)}
                onKeyDown={(e) => handleEnter(e.keyCode)}
              />
            </>
          )}
          <div className="profile-action-buttons">
            <button onClick={() => handleProfileAction("changePassword")}>
              Change Password
            </button>
          </div>
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
            disabled={isDisabled || !selectedProfile}
            // checked={(profileList[selectedProfile] || {}).isDesignMode || false}
            checked={isDesignMode}
            onChange={() =>
              // handleProfileSettingUpdate({ setting: "isDesignMode" })
              switchDesignMode(!isDesignMode)
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
            disabled={isDisabled}
            checked={(profileList[selectedProfile] || {}).isKidsMode || false}
            onChange={() =>
              handleProfileSettingUpdate({ setting: "isKidsMode" })
            }
          />
          <label className="label" for="kidsMode">
            Kids Mode
          </label>
        </div>
        <div className="checbox-container">
          <input
            type="checkbox"
            name="passwordProtectForSettings"
            id="passwordProtectForSettings"
            className="input-checkbox"
            checked={
              (profileList[selectedProfile] || {}).passwordProtectForSettings ||
              false
            }
            disabled={isDisabled}
            onChange={() =>
              handleProfileSettingUpdate({
                setting: "passwordProtectForSettings",
              })
            }
          />
          <label className="label" for="passwordProtectForSettings">
            Password protect to change settings
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
            checked={
              (profileList[selectedProfile] || {}).hideWithoutMatch || false
            }
            disabled={isDisabled}
            onChange={() =>
              handleProfileSettingUpdate({ setting: "hideWithoutMatch" })
            }
          />
          <label className="label" for="unMatchScore">
            Hide shows without match score
          </label>
        </div>
        <div
          className="checbox-container"
          title={TOOLTIP_TEXTS.HIDE_WITHOUT_MATCH}
        >
          <input
            type="checkbox"
            name="dimMatchScoreFitler"
            id="dimMatchScoreFitler"
            className="input-checkbox"
            disabled={isDisabled}
            checked={
              (profileList[selectedProfile] || {}).dimMatchScoreFitler || false
            }
            onChange={() =>
              handleProfileSettingUpdate({ setting: "dimMatchScoreFitler" })
            }
          />
          <label className="label" for="dimMatchScoreFitler">
            Dim instead of hide with match score
          </label>
        </div>
        <div className="checbox-container" title={TOOLTIP_TEXTS.HIDE_DISLIKE}>
          <input
            type="checkbox"
            name="hideDisLiked"
            id="hideDisLiked"
            className="input-checkbox"
            disabled={isDisabled}
            checked={(profileList[selectedProfile] || {}).hideDisLiked || false}
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
            disabled={isDisabled}
            checked={(profileList[selectedProfile] || {}).hideLiked || false}
            onChange={() =>
              handleProfileSettingUpdate({ setting: "hideLiked" })
            }
          />
          <label className="label" for="hideLiked">
            Hide Liked Shows
          </label>
        </div>
        <div className="buttons-container">
          <button onClick={() => handleSettingsClose()}>Cancel</button>
          <button
            disabled={
              !(
                (profileList[selectedProfile] || {}).isDesignMode &&
                (undoList[selectedProfile] || []).length > 0
              )
            }
            onClick={() => undoChange()}
            title="When in design mode, click Undo to reverse the previous show/hide/dim selection on a Netflix show."
          >
            Undo
          </button>
          <button
            onClick={() => {
              handleApplyClick()
            }}
            title="Pressing Apply will activate the settings but it will not save or remember the settings across browser restarts"
          >
            Apply
          </button>
          <button
            onClick={() => setChanges()}
            title=" Pressing Save will save and activate the settings to remember them across browser restarts. Saving settings is a paid feature which allows sharing saved settings also across our other web browsers which are using the same Paid Subscription Account."
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
