console.log("popup.js loaded");

// TODO: Make sure there are no state mismatches on initial install for negativityFilterToggleState (should work via default boolean variable values in contentScript.js)
document.addEventListener("DOMContentLoaded", () => {
	console.log("DOM CONTENT LOADED");

	const defaultUserSettings = [
		{
			name: "negativityFilterToggleState",
			selector: "#negativity-filter",
			enabled: true,
		},
		{
			name: "shortsFilterToggleState",
			selector: "#shorts-filter",
			enabled: true,
		},
	];

	// 1: Load settings from chrome.storage else use default settings
	chrome.storage.local.get("userSettings", (result) => {
		const activeUserSettings = result.userSettings || defaultUserSettings;

		// 2: Sync the popup.html to these settings
		activeUserSettings.forEach((setting) => {
			const toggleDiv = document.querySelector(setting.selector);
			const toggle = toggleDiv.querySelector("input[type='checkbox']");
			const toggleStatus = toggleDiv.querySelector("#toggle-status");

			const isEnabled = setting.enabled;
			toggle.checked = isEnabled;
			toggleStatus.textContent = isEnabled ? "Enabled" : "Disabled";

			// 3: Add event listener for changes in checkbox's checked state
			toggle.addEventListener("change", () => {
				const newToggleState = toggle.checked;
				toggleStatus.textContent = newToggleState ? "Enabled" : "Disabled";

				// 4. Update the setting in chrome.storage
				setting.enabled = newToggleState;
				chrome.storage.local.set({ userSettings: activeUserSettings }, () => {
					console.log(`Popup.js: ${setting.name} updated to`, newToggleState);

					// 5. Notify background.js of the updated settings
					chrome.runtime.sendMessage({ userSettings: activeUserSettings });
				});
			});
		});
	});
});
