(function () {
	let emojidata = null;

	let distance = DamerauLevenshtein({
		insert: (c, i) => 1.75 / i,
		remove: 2,
		substitute: 2,
		transpose: 0.75
	});

	let threshold = 2;

	window.addEventListener("DOMContentLoaded", onload);

	// Searchs a list of words for one with the shortest levenshtein distance to the query
	function getBestDistance(query, words) {
		let match_dist = Number.MAX_VALUE;
		let match_word;

		for (const word of words) {
			let dist = distance(query, word);
			if (dist <= threshold && dist < match_dist) {
				match_dist = dist;
				match_word = word;
			}
		}

		return [match_dist, match_word];
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
				for (const emoji of emojidata) {
					// Get best distance for name
					let words = splitName(emoji[1]).filter(wordFilter);
					let [name_dist, name_word] = getBestDistance(query, words);

					// Get best distance for descriptive words
					words = emoji[2].filter(wordFilter);
					let [extra_dist, extra_word] = getBestDistance(query, words);

					// Add best result
					if (extra_dist < name_dist) {
						results.push({
							distance: extra_dist,
							word: extra_word,
							emoji: emoji[0],
							name: emoji[1]
						});
					}
					else if (name_dist < Number.MAX_VALUE) {
						results.push({
							distance: name_dist,
							word: name_word,
							emoji: emoji[0],
							name: emoji[1]
						});
					}
				}
			}
		}

		if (results.length > 0) {
			showResults(results);
		}
		else {
			showIntro();
		}
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

		// Sort results
		items.sort((a, b) =>
			a.distance - b.distance
			|| a.word.localeCompare(b.word)
			|| a.name.localeCompare(b.name)
		);

		// Output results
		let template = document.querySelector("template[name='template-item']");
		for (const item of items) {
			let clone = template.content.cloneNode(true);

			// Set values
			clone.querySelector(".item").title = `Score: ${item.distance.toFixed(3)}`;
			clone.querySelector(".word").innerHTML = item.word;
			clone.querySelector(".word").dataset["grade"] = Math.round(item.distance * 2) / 2;
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
		search(ele.value);

		// Init clear button
		ele = document.querySelector(".search svg");
		ele.addEventListener("click", clear);
	}
})();