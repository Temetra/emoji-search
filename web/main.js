(function () {
	let emojidata = null;

	// Threshold for results
	const distanceThreshold = 2.0;
	
	window.addEventListener("DOMContentLoaded", onload);

	// Searchs a list of words for one with the shortest levenshtein distance to the query
	function getBestDistance(query, words) {
		let bestDist = Number.MAX_VALUE;
		let bestWord;

		for (const word of words) {
			let dist = osaDistance(query, word);
			if (dist < distanceThreshold && dist < bestDist) {
				bestDist = dist;
				bestWord = word;
			}
		}

		return { distance: bestDist, word: bestWord };
	}

	function splitName(n) {
		return n.replaceAll(" ", "_").split("_");
	}

	function wordFilter(w) {
		return w.length > 2
			&& w != "the"
			&& w != "and";
	}

	function search(query) {
		let results = [];

		if (emojidata) {
			query = query.trim();
			if (query.length > 1) {
				for (const [emoji, name, descs] of emojidata) {
					// Get best distance for name
					let words = splitName(name).filter(wordFilter);
					let bestName = getBestDistance(query, words);

					// Get best distance for descriptive words
					words = descs.filter(wordFilter);
					let bestDesc = getBestDistance(query, words);

					// Determine best result
					let bestResult = bestDesc.distance < bestName.distance ? bestDesc
						: bestName.distance < Number.MAX_VALUE ? bestName
							: null;

					// Save
					if (bestResult != null) {
						results.push({ ...bestResult, emoji, name });
					}
				}
			}
		}

		// Update page
		if (results.length > 0) {
			results.sort((a, b) =>
				a.distance - b.distance
				|| a.word.localeCompare(b.word)
				|| a.name.localeCompare(b.name)
			);

			showResults(results);
		}
		else {
			showIntro();
		}

		// Update location
		let url = new URL(window.location);
		url.search = query.length > 1 ? `?${query}` : "";
		history.pushState(null, "", url);
	}

	function showIntro() {
		let template = document.querySelector("template[name='template-intro']");
		let clone = template.content.cloneNode(true);
		let ele = document.querySelector("#output");
		ele.className = "intro";
		ele.innerHTML = "";
		ele.appendChild(clone);
	}

	function showResults(items) {
		// Set output
		let ele = document.querySelector("#output");
		ele.className = "results";
		ele.innerHTML = "";

		// Show feedback if clipboard available
		if (navigator.clipboard) {
			ele.classList.add("clickable");
		}

		// Output results
		let template = document.querySelector("template[name='template-item']");
		for (const item of items) {
			// Get ratio
			let ratio = 100 - (item.distance / distanceThreshold * 100);
			let grade = Math.round(ratio / 20) * 20;

			// Clone template
			let clone = template.content.cloneNode(true);
			clone.querySelector(".item").title = `Score: ${item.distance.toFixed(3)} (${ratio.toFixed(1)}%)`;
			clone.querySelector(".word").innerHTML = item.word;
			clone.querySelector(".word").dataset["grade"] = grade;
			clone.querySelector(".emoji").innerHTML = item.emoji;
			clone.querySelector(".name").innerHTML = item.name;

			// Enable copying to clipboard if available
			if (navigator.clipboard) {
				let container = clone.querySelector(".item");
				container.tabIndex = 0;
				container.onclick = copyEmoji;
			}

			ele.appendChild(clone);
		}
	}

	function copyEmoji(evt) {
		let target = evt.target;
		if (!target.classList.contains("emoji")) {
			target = target.parentNode.querySelector(".emoji");
		}
		navigator.clipboard.writeText(target.innerHTML);
	}

	function clear(evt) {
		let ele = document.querySelector(".search input[type='text']");
		ele.value = "";
		ele.focus();
		search("");
	}

	function onload() {
		fetch("emoji-en-US-reshaped.json")
			.then(response => {
				if (!response.ok) throw new Error(`HTTP error: ${res.status}`);
				return response.json();
			})
			.then(data => prepare(data))
			.catch(err => console.log(err));
	}

	function prepare(data) {
		emojidata = data;

		// Add random emoji to title
		let idx = Math.floor(Math.random() * emojidata.length - 1);
		document.title = document.title.split(" ").join(` ${emojidata[idx][0]} `);

		// Init search box
		let ele = document.querySelector(".search input[type='text']");
		ele.addEventListener("input", (evt) => search(evt.target.value));
		ele.select();
		ele.focus();

		// Get query from location
		let params = new URLSearchParams(window.location.search);
		if (params.size > 0) {
			let query = params.keys().next().value;
			ele.value = query;
		}

		// Perform search
		search(ele.value);

		// Init clear button
		ele = document.querySelector(".search svg");
		ele.addEventListener("click", clear);
	}
})();