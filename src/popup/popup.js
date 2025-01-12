console.log("popup.js loaded");

document.addEventListener("DOMContentLoaded", () => {
	console.log("DOM CONTENT LOADED");

	const toggle = document.getElementById("toggle");
	const toggleStatus = document.getElementById("toggle-status");

	toggle.addEventListener("change", () => {
		toggleStatus.textContent = toggle.checked ? "On" : "Off";

		// Send toggle state to the background script
		chrome.runtime.sendMessage({ toggleState: toggle.checked });
	});
});
