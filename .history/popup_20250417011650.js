document.addEventListener("DOMContentLoaded", async function () {
    const tabList = document.getElementById("tabList");
    console.log("tabList found:", tabList);
    const tabs = await chrome.tabs.query({ audible: true });
    console.log("Tabs found:", tabs);
    
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
        console.log("Creating tab item for:", tab);
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
        
        loadVolume(tab.id, (volume) => {
            slider.value = volume;
            updateTabVolume(tab.id, volume);
            applyPersistedVolume(tab.id);
            injectAutoVolumeScript(tab.id);
            muteIcon.src = volume > 0 ? "speaker.png" : "mute.png";
        });
        
        
        slider.addEventListener("input", function () {
            const volume = parseFloat(this.value);
            saveVolume(tab.id, volume);
            updateTabVolume(tab.id, volume);
        });
        
        const muteBtn = document.createElement("button");
        muteBtn.classList.add("mute-btn");
        const muteIcon = document.createElement("img");
        muteIcon.classList.add("mute-icon");
        muteIcon.src = "speaker.png";
        muteBtn.appendChild(muteIcon);
        
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
        console.log("Added tab:", tab.title);
    }
    
    tabs.forEach(createTabItem);
    
    tabs.forEach(tab => injectAutoVolumeScript(tab.id));

    document.addEventListener("keydown", function (event) {
        if (event.ctrlKey && event.key === "m") {
            chrome.runtime.sendMessage({ action: "openPopup" });
        }
    });
});
