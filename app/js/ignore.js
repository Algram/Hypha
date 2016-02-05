'use strict';

let ignoreList = [];

function add(name) {
	if (ignoreList.indexOf(name) !== -1) {
		//Doesn't exist yet
		ignoreList.push(name);
	}
}

function addAll(array) {
	ignoreList = arrayUnique(ignoreList.concat(array));
}

function remove(name) {
	if (ignoreList.indexOf(name) !== -1) {
		ignoreList.splice(ignoreList.indexOf(name), 1);
	}
}

function getAll() {
	return ignoreList;
}

function arrayUnique(array) {
	var a = array.concat();
	for (var i = 0; i < a.length; ++i) {
		for (var j = i + 1; j < a.length; ++j) {
			if (a[i] === a[j])
				a.splice(j--, 1);
		}
	}

	return a;
}

module.exports = {
	add: add,
	addAll: addAll,
	remove: remove,
	getAll: getAll
}
