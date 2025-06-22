(function () {
	let emojidata = null;

	// (0..Number.MAX_VALUE) 
	// Emoji outside of this don't get added to results
	const distanceThreshold = 2.5;

	// (0..100) 
	// Emoji outside of this don't get displayed 
	const ratioThreshold = 0;

	window.addEventListener("DOMContentLoaded", onload);

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

		// Init clear button
		let ele = document.querySelector(".search svg");
		ele.addEventListener("click", clear);

		// Init search box
		ele = document.querySelector(".search input[type='text']");
		ele.value = getQueryFromLocation() || ele.value;
		ele.addEventListener("input", (evt) => searchDebounced(evt.target.value));
		ele.select();
		ele.focus();

		// Perform search
		search(ele.value);
	}

	// Searchs a list of words for one with the shortest levenshtein distance to the query
	function getBestDistance(query, words) {
		let bestDist = Number.MAX_VALUE;
		let bestWord;

		for (const word of words) {
			let dist = osaDistance(query, word);
			if (dist <= distanceThreshold && dist < bestDist) {
				bestDist = dist;
				bestWord = word;
			}
		}

		return { distance: bestDist, word: bestWord };
	}

	function search(query) {
		let results = [], 
			minDistance = Number.MAX_VALUE, 
			maxDistance = 0;

		query = query.trim().toLowerCase();

		if (emojidata) {
			// If input is emoji, use the first descriptive word as the query
			if (/\p{Emoji}/u.test(query)) {
				let found = emojidata.find(
					([emoji, name, descs]) => emoji === query
				);
				query = found != undefined ? found[2][0] : query;
			}
			
			// Perform search
			if (query.length > 1) {
				console.log(`Searching for "${query}"`);

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
						results.push({ ...bestResult, emoji, name, descs });
						minDistance = Math.min(bestResult.distance, minDistance);
						maxDistance = Math.max(bestResult.distance, maxDistance);
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

			showResults(results, minDistance, maxDistance);
		}
		else if (query.length > 1) {
			showTemplate("error");
		}
		else {
			showTemplate("intro");
		}

		// Update location
		updateLocation(query);
	}

	function copyEmoji(emoji, name, ele) {
		navigator.clipboard.writeText(emoji);
		ele.classList.add("copied");
		setTimeout(() => ele.classList.remove("copied"), 1000);
		console.log(`Copied ${emoji} "${name}" to clipboard`);
	}

	function clear(evt) {
		let ele = document.querySelector(".search input[type='text']");
		ele.value = "";
		ele.focus();
		search("");
	}

	function showTemplate(name) {
		let template = document.querySelector(`template[name='template-${name}']`);
		let clone = template.content.cloneNode(true);
		let ele = document.querySelector("#output");
		ele.className = name;
		ele.innerHTML = "";
		ele.appendChild(clone);
	}

	let itemTemplate = null;

	function cloneItemTemplate() {
		itemTemplate = itemTemplate ?? document.querySelector("template[name='template-item']");
		let node = itemTemplate.content.cloneNode(true);
		let item = node.querySelector(".item");
		let word = node.querySelector(".word");
		let emoji = node.querySelector(".emoji");
		let name = node.querySelector(".name");
		return { node, item, word, emoji, name };
	}

	function showResults(items, minDistance, maxDistance) {
		console.log(`Showing ${items.length} out of ${emojidata.length}`);

		// Set output
		let ele = document.querySelector("#output");
		ele.className = "results";
		ele.innerHTML = "";

		// Show feedback if clipboard available
		if (navigator.clipboard) {
			ele.classList.add("clickable");
		}

		// Output results
		for (const item of items) {
			// Stop iterating if past threshold
			let ratio = (maxDistance > minDistance)
				? 100 - ((item.distance - minDistance) / maxDistance * 100)
				: 100;
			if (ratio < ratioThreshold) break;

			// Used for colour of word bubble
			let rank = Math.round(((100 - ratio) / (100 - ratioThreshold)) * 5);

			// Clone template
			let clone = cloneItemTemplate();
			clone.item.title = item.descs.join(", ");
			clone.word.innerHTML = item.word;
			clone.word.title = `Score: ${item.distance.toFixed(3)} (${ratio.toFixed(1)}%)`;
			clone.word.dataset["rank"] = rank;
			clone.emoji.innerHTML = item.emoji;
			clone.name.innerHTML = item.name;

			// Enable copying to clipboard if available
			if (navigator.clipboard) {
				clone.item.onclick = (evt) => copyEmoji(item.emoji, item.name, clone.item);
			}

			ele.appendChild(clone.node);
		}
	}

	function splitName(n) {
		let a = n.replaceAll(" ", "_").split("_");
		a.push(n.replace("_", " "));
		return a;
	}

	function wordFilter(w) {
		return w != "the" && w != "and";
	}

	function getQueryFromLocation() {
		let params = new URLSearchParams(window.location.search);
		// URLSearchParams.size not reported when targeting Safari / iOS <17 
		if (Array.from(params).length > 0) {
			return params.keys().next().value;
		}
		return null;
	}

	function updateLocation(query) {
		let search = query.length > 1 ? `?${query}` : "";
		let url = new URL(window.location);
		if (url.search !== search) {
			url.search = search;
			history.pushState(null, "", url);
		}
	}

	function debounced(fn, delay = 50) {
		let timer;
		return (...args) => {
			clearTimeout(timer);
			timer = setTimeout(() => { fn.apply(this, args); }, delay);
		};
	}

	const searchDebounced = debounced(search, 250);
})();