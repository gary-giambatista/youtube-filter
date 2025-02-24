console.log("popup.js loaded");

// TODO: Make sure there are no state mismatches on initial install for negativityFilterToggleState (should work via default boolean variable values in contentScript.js)
document.addEventListener("DOMContentLoaded", () => {
	console.log("DOM CONTENT LOADED");

	const defaultUserSettings = [
		{
			name: "negativityFilterToggleState",
			type: "filter",
			selector: "#negativity-filter",
			enabled: true,
		},
		{
			name: "shortsFilterToggleState",
			type: "filter",
			selector: "#shorts-filter",
			enabled: true,
		},
		{
			name: "filterBlurOptions",
			type: "setting",
			selector: "#filter-blur-options",
			activeSetting: "medium",
		},
		{
			name: "videoHoverPreviewOptions",
			type: "setting",
			selector: "#video-hover-preview-options",
			activeSetting: "show",
		},
	];

	// 1: Load settings from chrome.storage, else use default settings
	chrome.storage.local.get("userSettings", (result) => {
		const activeUserSettings = result.userSettings || defaultUserSettings;

		// 2: Sync the popup.html to user's active settings
		activeUserSettings.forEach((setting) => {
			// For checkboxes - enabling and disabling filters
			if (setting.type === "filter") {
				handleFilterSetting(setting);
			}
			// For fieldset -> radios - customizing filter settings
			if (setting.type === "setting") {
				handleSetting(setting);
			}
		});

		/**
		 * Handles syncing and updating checkbox settings (for enabling/disabling filters)
		 * @param {object} setting - an active user setting object either default or from chrome.storage
		 */
		function handleFilterSetting(setting) {
			const toggleDiv = document.querySelector(setting.selector);
			const toggle = toggleDiv.querySelector("input[type='checkbox']");
			const toggleStatus = toggleDiv.querySelector("#toggle-status");

			const isEnabled = setting.enabled;
			// Set the correct checked ✔️ state and status text from activeUserSettings
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
		}

		/**
		 * Handles syncing and updating radio settings (for updating filter settings)
		 * @param {object} setting - an active user setting object either default or from chrome.storage
		 */
		function handleSetting(setting) {
			const fieldset = document.querySelector(setting.selector);
			const radios = fieldset.querySelectorAll("input[type='radio']");
			const activeSetting = setting.activeSetting;

			// Check ✔️ the correct radio from activeUserSettings
			radios.forEach((radio) => {
				if (radio.value === activeSetting) {
					radio.checked = true;
				}

				// 3: Add event listener for changes in fieldset's checked radio
				radio.addEventListener("change", () => {
					const newSetting = radio.value;

					// 4. Update the setting in chrome.storage
					setting.activeSetting = newSetting;
					chrome.storage.local.set({ userSettings: activeUserSettings }, () => {
						console.log(`Popup.js: ${setting.name} updated to`, newSetting);

						// 5. Notify background.js of the updated settings
						chrome.runtime.sendMessage({ userSettings: activeUserSettings });
					});
				});
			});
		}
	});
});
