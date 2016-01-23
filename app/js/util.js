'use strict';
const path = require('path');
const shell = require('shell');

/**
 * Autocompletes a list of users and returns the next matched user.
 * @param  {string}   str      String that is used for autocompletion
 * @param  {array}   users     List of users
 * @param  {function} callback callback
 * @return {string}            Username that was matched
 */
function autocomplete(str, users, callback) {
	for (let key in users) {
		let user = users[key];
		user = user.split(':')[0];

		//Check if str is the start of user
		if (user.indexOf(str) === 0) {
			callback(user);
		}
	}
}

/**
 * Fills the usermenu with the entries from the given array.
 * @param  {array} usersArr Array of users
 * @return {void}           void
 */
function fillUsermenu(usersArr) {
	$('usermenu users').empty();

	let sortedUsers = usersArr.sort(function(a, b) {
	    return (a.name > b.name) - (a.name < b.name);
	});

	for (let key in sortedUsers) {
		let user = sortedUsers[key];

		if (user.rank === '') {
			$('usermenu users').append('<user>' + user.name + '</user>');
		} else if (user.rank === '+') {
			$('usermenu users').append('<user><i class="fa fa-user-plus"></i>' + user.name + '</user>');
		} else if (user.rank === '%') {
			$('usermenu users').append('<user><i class="fa fa-percent"></i>' + user.name + '</user>');
		} else if (user.rank === '@') {
			$('usermenu users').append('<user><i class="fa fa-user-md"></i>' + user.name + '</user>');
		} else {
			$('usermenu users').append('<user>' + user.name + '</user>');
		}
	}

	$('usermenu').attr('data-before', usersArr.length);
}

/**
 * Use native notification-system libnotify. Works on most Mac and
 * Linux systems, no support for windows.
 * @param  {string} title Title to display
 * @param  {string} body  Body to display
 * @return {void}       void
 */
function doNotify(title, body) {
	let options = {
		title: title,
		body: body,
		icon: path.join(__dirname, '../images/icon.png')
	};

	new Notification(options.title, options);
}

/**
 * Escapes all potentially dangerous characters, so that the
 * resulting string can be safely inserted into attribute or
 * element text.
 * @param value
 * @returns {string} escaped text
 */
function encodeEntities(value) {
	let surrogate_pair_regexp = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
	// Match everything outside of normal chars and " (quote character)
	let non_alphanumeric_regexp = /([^\#-~| |!])/g;

	return value.
	replace(/&/g, '&amp;').
	replace(surrogate_pair_regexp, function (value) {
		let hi = value.charCodeAt(0);
		let low = value.charCodeAt(1);
		return '&#' + (((hi - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000) + ';';
	}).
	replace(non_alphanumeric_regexp, function (value) {
		return '&#' + value.charCodeAt(0) + ';';
	}).
	replace(/</g, '&lt;').
	replace(/>/g, '&gt;');
}

/**
 * Takes a string and returns a matching color for that specific string.
 * @param  {string} str String to match against
 * @return {string}     Hex-color code
 */
function stringToColour(str) {
	let colorsExtrapol = [];

	let colors = [
		'#859900','#cb4b16',
		'#2aa198','#dc322f',
		'#268bd2','#6c71c4',
		'#d33682','#b58900'
	]

	for (let i = 0; i < colors.length; i++) {
		let hsvColor = please.HEX_to_HSV(colors[i]);
		let scheme = please.make_scheme(hsvColor, {
			scheme_type: 'analogous',
			format: 'hex'
		})

		colorsExtrapol = colorsExtrapol.concat(scheme);
	}

	let hashCode = str.hashCode();
	let number = Math.abs(hashCode % colorsExtrapol.length);

	return colorsExtrapol[number];
}

/**
 * Sets the scrollState of the messageArea to the last appended line.
 * @return {void} void
 */
function updateScrollState() {
	//Scroll to last appended message
	$("#messageArea").animate({
		scrollTop: $("#messageArea")[0].scrollHeight
	}, 0);
}

/**
 * Regex that matches urls in a string in a permissive way.
 * @param  {string} str String to match against
 * @return {boolean}     If the string contains urls
 */
function findLinks(str) {
	let pattern = /\b(?:[a-z]{2,}?:\/\/)?([^\s./]+\.)+[^\d\s./:?]\w+(?::\d{1,5})?(?:\/[^\s]*\b|\b)(?![:.?#]\S)/gi;

	return str.match(pattern);
}

/**
 * Checks if the last nick appended is unique until the next nick. This is
 * used to remove the nickname from the ui when possible, e.g. when one
 * user sends multiple messages.
 * @param  {string} nextNick The next nick to be appended
 * @param  {jquery-object} $channel The dom node where the nicks are at
 * @return {boolean}          If nick is unique
 */
function lastNicksUnique(nextNick, $channel) {
	let unique = true;
	let iteratedNicks = [];

	//Get last nicks of provided channel
	let lastNicks = $channel.find('line nick');

	//Iterate over nicks in reverse, break if nextNick is not empty,
	//add all nicks to a list
	$(lastNicks).reverse().each(function () {
		iteratedNicks.push($(this).text());
		if ($(this).text() !== '') {
			return false;
		}
	})

	//Iterate over all nicks, return true when nick is not nextNick,
	//return false, when nick is empty or nextNick
	for (let key in iteratedNicks) {
		let nick = iteratedNicks[key];
		if (nick != nextNick) {
			unique = true;
		} else if (nick === '' || nick == nextNick) {
			unique = false;

			//Break loop since nick can't be unique anymore
			break;
		}
	}

	return unique;
}

/**
 * Opens a given url with the default browser of the systems
 * @param  {string} string Url to open
 * @return {void}        void
 */
function openLink(string) {
	//Check if "http://" is there and add it if necessary
	if (string.match(/^[^/]+:\/\//)) {
		shell.openExternal(string);
	} else {
		shell.openExternal('http://' + string);
	}
}

module.exports = {
    autocomplete: autocomplete,
    fillUsermenu: fillUsermenu,
	doNotify: doNotify,
	encodeEntities: encodeEntities,
	stringToColour: stringToColour,
	lastNicksUnique: lastNicksUnique,
	findLinks: findLinks,
	updateScrollState: updateScrollState,
	openLink: openLink
}
