(function () {
    const tabIdKey = `volume_${window.location.hostname}`;

    chrome.storage.local.get(tabIdKey, function (result) {
        const volume = result[tabIdKey] !== undefined ? result[tabIdKey] : 1;
        document.querySelectorAll("video, audio").forEach(v => v.volume = volume);
    });

    chrome.storage.onChanged.addListener(function (changes) {
        if (changes[tabIdKey]) {
            document.querySelectorAll("video, audio").forEach(v => v.volume = changes[tabIdKey].newValue);
        }
    });
})();
