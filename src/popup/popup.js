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

// function toggleExtension() {
// 	console.log("toggleExtension Called!");

// 	const toggle = document.getElementById("toggle");
// 	const toggleStatus = document.getElementById("toggle-status");

// 	toggleStatus.textContent = toggle.checked ? "On" : "Off";
// 	// Send toggle state to the background script
// 	chrome.runtime.sendMessage({ toggleState: toggle.checked });
// }

// Executes in the tabs DOM
// document.getElementById("toggle").addEventListener("change", function () {
// 	chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
// 		chrome.scripting.executeScript({
// 			target: { tabId: tabs[0].id },
// 			function: toggleExtension,
// 		});
// 	});
// });

// this code will bind the modifyDOM function to the btnShowOrangeDiv click event
// document.getElementById('btnShowOrangeDiv').addEventListener('click', function() {
// 	chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
// 	  chrome.scripting.executeScript({
// 		target: { tabId: tabs[0].id },
// 		function: modifyDOM
// 	  });
// 	});
//   });

// this code will be executed when the button btnShowOrangeDiv is clicked
// function modifyDOM() {
// 	const version = chrome.runtime.getManifest().version;
// 	const div = document.createElement("div");
// 	div.textContent = `DOM modified by Fresh Chrome Extension boilerplate ${version} (I am in "popup.js")`;
// 	div.style.cssText =
// 		"background-color: orange; color: black; font-weight: bold; padding: 10px; width: 100%; box-sizing: border-box;";
// 	document.body.insertAdjacentElement("afterbegin", div);
// 	console.log("Action executed from popup!");
// }
