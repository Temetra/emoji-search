// Optimal string alignment distance
// https://en.wikipedia.org/wiki/Damerau%E2%80%93Levenshtein_distance

function osaDistance(a, b) {
	// Costs configured for word completion
	const insertion = (i, j) => j > i ? 1 / j : 3;
	const deletion = 1;
	const substitution = (x, y) => x === y ? 0 : 1;
	const transposition = 1;

	// Regular costs
	// const insertion = (i, j) => 1;
	// const deletion = 1;
	// const substitution = (x, y) => x === y ? 0 : 1;
	// const transposition = 1;

	const d = Array(a.length + 1);
	// note that d is zero-indexed, while a and b are one-indexed.

	for (let i = 0; i < d.length; i++) {
		d[i] = Array(b.length + 1);
		d[i][0] = i;
	}

	for (let j = 0; j < d[0].length; j++) {
		d[0][j] = j;
	}

	for (let i = 1; i <= a.length; i++) {
		for (let j = 1; j <= b.length; j++) {
			d[i][j] = Math.min(
				d[i - 1][j] + deletion,
				d[i][j - 1] + insertion(i, j),
				d[i - 1][j - 1] + substitution(a[i - 1], b[j - 1])
			);

			if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
				d[i][j] = Math.min(
					d[i][j],
					d[i - 2][j - 2] + transposition
				);
			}
		}
	}

	return d[a.length][b.length];
};