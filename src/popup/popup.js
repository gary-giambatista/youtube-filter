console.log("popup.js loaded");

// TODO: Make sure there are no state mismatches on initial install for negativityFilterToggleState, as nothing is setting chrome.storage to true on initial load
document.addEventListener("DOMContentLoaded", () => {
	console.log("DOM CONTENT LOADED");

	const toggle = document.getElementById("toggle");
	const toggleStatus = document.getElementById("toggle-status");

	// Step 1: Retrieve the initial toggle state from chrome.storage
	chrome.storage.local.get("negativityFilterToggleState", (result) => {
		const isEnabled = result.negativityFilterToggleState ?? false; // Default to false if undefined
		toggle.checked = isEnabled;
		toggleStatus.textContent = isEnabled ? "On" : "Off";
	});

	// Step 2: Add event listener for user interaction with the toggle switch
	toggle.addEventListener("change", () => {
		const newState = toggle.checked;
		toggleStatus.textContent = newState ? "On" : "Off";

		// Step 3: Store the new toggle state in chrome.storage
		chrome.storage.local.set({ negativityFilterToggleState: newState }, () => {
			console.log("Popup.js: Toggle state updated to", newState);

			// Step 4: Notify the background script of the new toggle state
			chrome.runtime.sendMessage({ negativityFilterToggleState: newState });
		});
	});
});
