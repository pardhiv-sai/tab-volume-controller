document.addEventListener("DOMContentLoaded", async function () {
    const tabList = document.getElementById("tabList");
    const tabs = await chrome.tabs.query({});

    async function isTabPlayingAudio(tabId) {
        return new Promise((resolve) => {
            chrome.scripting.executeScript({
                target: { tabId },
                func: () => {
                    const mediaElements = document.querySelectorAll("video, audio");
                    return Array.from(mediaElements).some(el => !el.paused && el.currentTime > 0);
                }
            }, (results) => {
                resolve(results && results[0] && results[0].result);
            });
        });
    }

    const audibleTabs = [];
    for (const tab of tabs) {
        try {
            if (await isTabPlayingAudio(tab.id)) {
                audibleTabs.push(tab);
            }
        } catch (e) {
            console.log(`Error checking tab ${tab.id}:`, e);
        }
    }

    function saveVolume(tabId, volume) {
        chrome.storage.local.set({ [tabId]: volume });
    }

    function loadVolume(tabId, callback) {
        chrome.storage.local.get([String(tabId)], function (result) {
            callback(result[String(tabId)] !== undefined ? result[String(tabId)] : 1);
        });
    }

    function updateTabVolume(tabId, volume) {
        chrome.scripting.executeScript({
            target: { tabId },
            func: (vol) => {
                localStorage.setItem("persistedVolume", vol);
                document.querySelectorAll("video, audio").forEach(v => v.volume = vol);
            },
            args: [volume]
        });
    }

    function applyPersistedVolume(tabId) {
        chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
                const persistedVol = localStorage.getItem("persistedVolume");
                if (persistedVol !== null) {
                    document.querySelectorAll("video, audio").forEach(v => v.volume = parseFloat(persistedVol));
                }
            }
        });
    }

    function injectAutoVolumeScript(tabId) {
        chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
                const persistedVol = localStorage.getItem("persistedVolume");
                if (persistedVol !== null) {
                    document.querySelectorAll("video, audio").forEach(v => v.volume = parseFloat(persistedVol));
                }

                const observer = new MutationObserver(() => {
                    const persistedVol = localStorage.getItem("persistedVolume");
                    if (persistedVol !== null) {
                        document.querySelectorAll("video, audio").forEach(v => v.volume = parseFloat(persistedVol));
                    }
                });

                observer.observe(document.body, { childList: true, subtree: true });
            }
        });
    }

    function createTabItem(tab) {
        const item = document.createElement("div");
        item.classList.add("tab-item");

        const icon = document.createElement("img");
        icon.classList.add("tab-icon");
        icon.src = tab.favIconUrl || "image.png";
        icon.style.cursor = "pointer";
        icon.addEventListener("click", () => {
            chrome.tabs.update(tab.id, { active: true });
        });

        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = 0;
        slider.max = 1;
        slider.step = 0.01;
        slider.classList.add("volume-slider");

        const muteBtn = document.createElement("button");
        muteBtn.classList.add("mute-btn");
        const muteIcon = document.createElement("img");
        muteIcon.classList.add("mute-icon");
        muteBtn.appendChild(muteIcon);

        loadVolume(tab.id, (volume) => {
            slider.value = volume;
            muteIcon.src = volume > 0 ? "speaker.png" : "mute.png";
            updateTabVolume(tab.id, volume);
            applyPersistedVolume(tab.id);
            injectAutoVolumeScript(tab.id);
        });

        slider.addEventListener("input", function () {
            const volume = parseFloat(this.value);
            saveVolume(tab.id, volume);
            updateTabVolume(tab.id, volume);
            muteIcon.src = volume > 0 ? "speaker.png" : "mute.png";
        });

        muteBtn.addEventListener("click", function () {
            if (slider.value > 0) {
                saveVolume(tab.id + "_lastVolume", slider.value);
                saveVolume(tab.id, 0);
                updateTabVolume(tab.id, 0);
                slider.value = 0;
                muteIcon.src = "mute.png";
            } else {
                loadVolume(tab.id + "_lastVolume", (lastVolume) => {
                    const restoredVolume = lastVolume > 0 ? lastVolume : 1;
                    saveVolume(tab.id, restoredVolume);
                    updateTabVolume(tab.id, restoredVolume);
                    slider.value = restoredVolume;
                    muteIcon.src = "speaker.png";
                });
            }
        });

        item.appendChild(icon);
        item.appendChild(slider);
        item.appendChild(muteBtn);
        tabList.appendChild(item);
    }

    audibleTabs.forEach(createTabItem);
    audibleTabs.forEach(tab => injectAutoVolumeScript(tab.id));

    document.addEventListener("keydown", function (event) {
        if (event.ctrlKey && event.key === "m") {
            chrome.runtime.sendMessage({ action: "openPopup" });
        }
    });
});
