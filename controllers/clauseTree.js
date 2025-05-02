/*
Reformat clause array into nested dict (nested clauses in parents)

example_tree = {
  '5': {
    clause: { number: '5' },
    'children': {
      '5.1': {
        clause: { number: '5.1' },
        'children': {
          '5.1.1': {
            clause: { number: '5.1.1' },
            children: {}
          }
        }
      }
    }
  }
}
*/

module.exports = (clauses) => {
	clauses = clauses.sort((a, b) =>
		a.number.localeCompare(b.number, undefined, { numeric: true })
	);

	const clauseMap = {};
	const rootTree = {};

	// Build a flat map first
	for (const clause of clauses) {
		clauseMap[clause.number] = {
			clause,
			children: {},
		};
	}

	// Now build the hierarchy
	for (const clause of clauses) {
		const number = clause.number;
		const parts = number.split('.');
		const parentNumber = parts.slice(0, -1).join('.');

		if (parts.length === 1) {
			// Top-level clause
			rootTree[number] = clauseMap[number];
		} else {
			const parent = clauseMap[parentNumber];
			if (parent) {
				parent.children[number] = clauseMap[number];
			} else {
				console.warn(`Missing parent clause: ${parentNumber} for ${number}`);
				// Optionally add to root if orphaned
				rootTree[number] = clauseMap[number];
			}
		}
	}

	// Convert children objects to sorted arrays recursively
	const sortChildren = (tree) => {
		const sorted = Object.values(tree).sort((a, b) =>
			a.clause.number.localeCompare(b.clause.number, undefined, { numeric: true })
		);
		for (const node of sorted) {
			node.children = sortChildren(node.children);
		}
		return sorted;
	};

	return sortChildren(rootTree);
};
