'use strict';
const please = require('./external/Please');
const util = require('./js/util');
const ipcRenderer = require('electron').ipcRenderer;
const remote = require('remote');
const Menu = remote.require('menu');
const MenuItem = remote.require('menu-item');

let displayedServers = [];
let selectedServer = '';
let selectedChannel;
let selectedUsername;
initializeMenus();
util.activateSpellChecking();

/*
New channel was selected, tell main and trigger visual changes
 */
$('#channelList').on('click', 'channel', function (e) {
	e.preventDefault();

	//Enable input-fields
	$('input').prop('disabled', false);

	let serverAddress = $(this).siblings('name').text();

	$('#channelList server channel').removeClass('selected');
	$(this).removeClass('unread');
	$(this).addClass('selected');

	ipcRenderer.send('channelSelected', serverAddress, $(this).text());
});

ipcRenderer.on('channelSelected_reply', function (event, address, channel, username) {
	//Set global variables
	selectedServer = address;
	selectedChannel = channel;
	selectedUsername = username;

	//Make messages of now selectedChannel visible, hide all others
	$("#messageArea server").children('channel').css('display', 'none');
	let selServer = $('[name="' + address + '"]');
	let selChannel = selServer.children('[name="' + channel.name + '"]');
	selChannel.css('display', 'block');

	//Set new username und fill usermenu
	$('#usernameInput').attr('placeholder', username);
	console.log(channel);
	util.fillUsermenu(channel.users);

	//Scroll to last appended message
	util.updateScrollState();
});

/*
Gets triggered when the userlist changes. Fill usermenu accordingly.
 */
ipcRenderer.on('userlistChanged', function (event, address, channel) {
	//Only call when channel is currently selected to prevent duplicate entries
	if (selectedServer === address && selectedChannel.name === channel.name) {
		selectedChannel.users = channel.users;
		util.fillUsermenu(channel.users);
	}
});

ipcRenderer.on('usernameChanged', function (event, address, nick) {
	//Only call when server is currently selected to prevent duplicate entries
	if (selectedServer === address) {
		//Set new username und fill usermenu
		$('#usernameInput').attr('placeholder', nick);
	}
});

/**
 *  Send keypresses not used elsewhere into the input area
 */
$(document).keydown(function (e) {
	if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return;

	const ignored = ['input', 'settings'];
	if (ignored.includes(e.target.tagName.toLowerCase())) return;

	$('#messageInput').focus();

});

$('#titlebar').on('click', 'add', function (e) {
	$('body').toggleClass('prevent');
	$('.modal').toggleClass('active');

	$('.modal select').empty();

	//testing
	for (let key in displayedServers) {
		let server = displayedServers[key];
		$('.modal select').append('<option>' + server.address + '</option>');
	}
});

$('.modal .close').click(function (e) {
	$('body').toggleClass('prevent');
	$('.modal').toggleClass('active');
});

$('#addServer').click(function (e) {
	let serverAddress = $('#serverInput').val();
	let serverExists = $('select:contains("' + serverAddress + '")').length > 0;
	if (!serverExists) {
		let username = $('#nickInput').val();

		if (serverAddress.indexOf(':') > -1) {
			let arr = serverAddress.split(':');
			let name = arr[0];
			let port = arr[1];

			ipcRenderer.send('serverAdded', username, name, {
				port: port
			});

			$('.modal select').append('<option>' + name + '</option>');

		} else {
			ipcRenderer.send('serverAdded', username, serverAddress);

			$('.modal select').append('<option>' + serverAddress + '</option>');
		}
	} else {
		console.log('Server already added.');
	}
});

$('#addChannel').click(function (e) {
	let selServer = $('.modal select :selected').text();
	let newChannel = $('#channelInput').val();

	ipcRenderer.send('channelAdded', selServer, newChannel);
});

//////////////////////
// Receiving Events //
//////////////////////

/*
Gets triggerred when information about a channel arrives. Adds server/channel
to the interface in alphabetical order
 */
ipcRenderer.on('channelData', function (event, address, channel) {
	if (selectedChannel === undefined) {
		$("input").prop('disabled', true);
	}

	addChannelItem(address, channel);
});

/*
A message was received. Check what kind of message it is and act accordingly.
Also check for username mentions, links and encoding.
 */
ipcRenderer.on('messageReceived', function (event, address, message) {
	if (message.event === false && message.action === false) {
		//Mark as unread if not in selectedChannel
		if (address !== selectedServer || message.to !== selectedChannel.name) {
			let affectedServer = $('server name:contains(' + address + ')').parent();
			let affectedChannel = affectedServer.children('channel').filter(function () {
				return ($(this).text() === message.to)
			});

			$(affectedChannel).addClass('unread');
		}

		//Need to handle when channel is not clicked yet, edge case
		if (selectedChannel !== undefined) {
			//Make messages of now selectedChannel visible, hide all others
			//TODO code-duplication
			$("#messageArea server").children('channel').css('display', 'none');
			let selServer = $('[name="' + selectedServer + '"]');
			let selChannel = selServer.children('[name="' + selectedChannel.name + '"]');
			selChannel.css('display', 'block');
		} else {
			$("#messageArea server").children('channel').css('display', 'none');
		}

		appendMessage(address, message);

	} else if (message.event === true) {
		//This message is an event
		appendEvent(address, message);

	} else if (message.action === true) {
		//This message is an event
		appendAction(address, message);
	}
});

function appendMessage(address, message) {
	let nick = message.from;
	let messageEnc = util.encodeEntities(message.message);
	let selServer = $('[name="' + address + '"]');
	let selChannel = selServer.children('[name="' + message.to + '"]');

	//Remove nick if message before was sent by the same nick
	if (!util.lastNicksUnique(nick, selChannel)) {
		nick = '';
	}

	//Create line and append it
	let line = '<line><nick>' + nick + '</nick><message>' + messageEnc +
		'</message></line>';
	selChannel.append(line);

	//Color nick based on string-hash
	selChannel.find('line:last nick').css('color', util.stringToColour(nick));

	//Check if username is mentioned somewhere in the message,
	//send a notification if there is
	if (selectedUsername !== undefined) {
		let pattern = new RegExp('\\b' + selectedUsername + '\\b', 'ig');
		if (pattern.test(messageEnc)) {
			selChannel.find('line:last message').addClass('highlighted');
			util.doNotify(message.to + ' ' + message.from, message.message);
		}
	}

	//Check if message contains links, use raw message and not encoded one
	let links = util.findLinks(message.message);
	if (links !== null) {
		let insertStr = messageEnc;

		for (let key in links) {
			let link = links[key];

			//Need to use encoded link from now on to consider &amp; inside
			//strings that would move the start and end points
			let linkEnc = util.encodeEntities(link);

			let startEnc = insertStr.indexOf(linkEnc);
			let endEnc = startEnc + linkEnc.length + 3;

			insertStr = insertStr.insert(startEnc, '<a>');
			insertStr = insertStr.insert(endEnc, '</a>');
		}

		selChannel.find('line:last message').html(insertStr);
	}

	//Scroll to last appended message
	util.updateScrollState();
}

function appendEvent(address, message) {
	let line = '<line><event>' + message.message + '</event></line>';

	let selServer = $('[name="' + address + '"]');
	let selChannel = selServer.children('[name="' + message.to + '"]');

	selChannel.append(line);

	//Scroll to last appended message
	util.updateScrollState();
}

function appendAction(address, message) {
	let line = '<line><action>' + message.from + ' ' + message.message + '</action></line>';

	let selServer = $('[name="' + address + '"]');
	let selChannel = selServer.children('[name="' + message.to + '"]');

	selChannel.append(line);

	//Scroll to last appended message
	util.updateScrollState();
}

/*
Usermenu was clicked, open it
 */
$('#titlebar').on('click', 'usermenu', function (e) {
	e.preventDefault();
	e.stopPropagation();

	$('#titlebar usermenu').toggleClass('closed');
})

/*
Close usermenu again if a click occurs somewhere on the document selector
 */
$(document).click(function () {
	$('#titlebar usermenu').addClass('closed');
});

/*
Enter was pressed, new message needs to be sent to main process
 */
$("#messageInput").keydown(function (e) {
	if (e.keyCode == 13) {
		let messageContent = $(this).val();
		$(this).val('');

		if (messageContent !== '') {
			if (messageContent[0] === '/') {
				//This is a command, parse it and send it
				let command = messageContent.substring(1).split(' ', 1)[0].toUpperCase();
				let args = messageContent.substring(command.length + 2);

				switch (command) {
				case 'ME':
					ipcRenderer.send('actionSent', selectedServer,
						selectedChannel.name, args);

					let message = {
						from: selectedUsername,
						to: selectedChannel.name,
						message: args,
					}

					appendAction(selectedServer, message);
					break;

				case 'CLEAR':
					let selServer = $('[name="' + selectedServer + '"]');
					let selChannel = selServer.children('[name="' + selectedChannel.name + '"]');
					selChannel.empty();
					break;

				case 'MSG':
					//TODO add check if args is a valid username
					if (args !== selectedUsername) {
						let channel = {
							name: args,
							users: [selectedUsername, args],
							messages: []
						}

						addChannelItem(selectedServer, channel);
						ipcRenderer.send('channelAdded', selectedServer, channel.name, 'pm');
					}
					break;

				case 'NICK':
					ipcRenderer.send('usernameChanged', selectedServer, args);
					break;

				case 'PART':
					removeChannelItem(selectedServer, selectedChannel.name);
					ipcRenderer.send('channelRemoved', selectedServer, selectedChannel.name);
					break;

				case 'JOIN':
					addChannelItem(selectedServer, args);
					ipcRenderer.send('channelAdded', selectedServer, args);
					break;

				default:
					console.log('Unknown command');
				}

			} else {
				let message = {
					from: selectedUsername,
					to: selectedChannel.name,
					message: messageContent,
					event: false,
					action: false
				}

				appendMessage(selectedServer, message);
				ipcRenderer.send('messageSent', selectedServer, message);
			}
		}
	}
});

/*
Enter was pressed, new username needs to be sent to main process
 */
$("#usernameInput").keydown(function (e) {
	if (e.keyCode == 13) {
		let username = $(this).val();

		if (username !== '') {
			selectedUsername = username;

			$("#usernameInput").val('');
			$("#usernameInput").attr('placeholder', username);
			ipcRenderer.send('usernameChanged', selectedServer, username);
		}
	}
});

/*
Tab was pressed, autocomplete word to next username match
 */
$("#messageInput").keyup(function (e) {
	if (e.keyCode == 9) {
		e.preventDefault();
	}
});

/*
Tab was pressed, autocomplete word to next username match
 */
$("#messageInput").keydown(function (e) {
	if (e.keyCode == 9) {
		e.preventDefault();

		let messageInput = $("#messageInput");
		let inputContent = $(this).val();
		let lastWord = inputContent.split(' ').pop();

		if (inputContent !== '') {
			let usersClean = selectedChannel.users.map(user => user.name);

			util.autocomplete(lastWord, usersClean, function (name) {
				let cachedContent = inputContent.substring(
					0, inputContent.lastIndexOf(" "));

				if (cachedContent === '') {
					messageInput.val(name + ': ');
				} else {
					messageInput.val(cachedContent + ' ' + name);
				}

				util.setCursorToEnd(messageInput);
			})
		}
	}
});

/*
Link in a message was clicked, open it with default browser
 */
$('#messageArea').on('click', 'a', function (e) {
	e.preventDefault();
	util.openLink($(this).text());
})

/*
Tell main to close the window
 */
$('#titlebar').on('click', 'close', function (e) {
	e.preventDefault();
	ipcRenderer.send('closeWindow');
})

function addChannelItem(address, channel) {
	let serverExists = false;
	for (let key in displayedServers) {
		let server = displayedServers[key];

		if (server.address == address) {
			//Server exists, check if channel does in server
			serverExists = true;
			console.log('server exists');

			if (server.channels.indexOf(channel.name) == -1) {
				//Channel doesnt exist, add it to the server
				server.channels.push(channel.name);

				let line = '<channel>' + channel.name + '</channel>';
				let selServerCL = $('server name:contains(' + address + ')').parent();

				let toinsert = true;
				selServerCL.children('channel').each(function () {
					let item = $(this).text();
					if (channel.name.toUpperCase() < item.toUpperCase()) {
						if (toinsert) {
							$(this).before(line);
							toinsert = false;
						}
					}
				});

				if (toinsert) {
					selServerCL.append(line);
				}

				//Add server and channel to messageArea
				let selServer = $('[name="' + address + '"]');
				let msgLine = '<channel name="' + channel.name + '"></channel>';
				selServer.append(msgLine);
			}
		}
	}

	//Server doesn't exist, add it
	if (!serverExists) {
		console.log('server new')
		let serverData = {
			address: address,
			channels: [channel.name]
		}

		displayedServers.push(serverData);

		let line = '<server><name>' + address + '</name><channel>' +
			channel.name + '</channel></server>';

		let toinsert = true;
		$('#channelList').children('server').each(function () {
			let item = $(this).children('name').text();
			if (address.toUpperCase() < item.toUpperCase()) {
				if (toinsert) {
					$(this).before(line);
					toinsert = false;
				}
			}
		});

		if (toinsert) {
			$('#channelList').append(line);
		}

		//Add server and channel to messageArea
		let msgLine = '<server name="' + address + '"><channel name="' +
			channel.name + '"></channel></server>';
		$('#messageArea').append(msgLine);
	}

}

function removeChannelItem(address, channelName) {
	//REMOVE FROM SIDEBAR
	let sidebarServer = $('server name:contains(' + address + ')').parent();
	let sidebarChannel = sidebarServer.children('channel').filter(function () {
		return ($(this).text() === channelName)
	});

	sidebarChannel.remove();

	if (sidebarServer.children('channel').length === 0) {
		sidebarServer.remove();
	}

	//REMOVE FROM MESSAGEAREA
	let msgareaServer = $('[name="' + address + '"]');
	let msgareaChannel = msgareaServer.children('[name="' + channelName + '"]');

	msgareaChannel.remove();

	if (msgareaServer.children('channel').length === 0) {
		msgareaServer.remove();
	}

	//REMOVE FROM INTERNALDATA
	if (selectedServer === address) {
		selectedServer = '';
	}

	if (selectedChannel.name === channelName) {
		selectedChannel = undefined;
	}

	for (let key in displayedServers) {
		let serverIndex = key;
		let server = displayedServers[key];

		if (server.address === address) {
			for (let key in server.channels) {
				let channel = server.channels[key];

				if (channel === channelName) {
					server.channels.splice(key, 1);

					if (server.channels.length === 0) {
						displayedServers.splice(serverIndex, 1);
					}
				}
			}
		}
	}
}

function initializeMenus() {
	//TEXT EDIT MENU
	let textMenu = Menu.buildFromTemplate([{
		label: 'Copy',
		role: 'copy',
	}]);

	$('#messageArea').on('contextmenu', 'line', function (e) {
		e.preventDefault();
		textMenu.popup(remote.getCurrentWindow());
	})

	//CHANNEL REMOVE MENU
	let channelMenu = new Menu();
	let elementTargeted;
	channelMenu.append(new MenuItem({
		label: 'Remove',
		click: function () {
			let serverAddress = elementTargeted.siblings('name').text();
			let channelName = elementTargeted.text();

			removeChannelItem(serverAddress, channelName);

			ipcRenderer.send('channelRemoved', serverAddress, channelName);
		}
	}));

	$('#channelList').on('contextmenu', 'channel', function (e) {
		e.preventDefault();
		elementTargeted = $(this);
		channelMenu.popup(remote.getCurrentWindow());
	})
}

$('input').on('focus', function () {
	util.setCursorToEnd($(this));
})

/**
 * Add tooltip for overflow elements
 */
$(document).on('mouseover', 'nick, user', function () {
	var $this = $(this);

	if (this.offsetWidth < this.scrollWidth && !$this.attr('title')) {
		$this.attr('title', $this.text());
	}
});

/**
 * Insert string into string at specified index
 */
String.prototype.insert = function (index, string) {
	if (index > 0)
		return this.substring(0, index) + string + this.substring(index, this.length);
	else
		return string + this;
};

/**
 * Returns a 32bit-int hashcode of a string
 */
String.prototype.hashCode = function () {
	var hash = 0,
		i, chr, len;
	if (this.length === 0) return hash;
	for (i = 0, len = this.length; i < len; i++) {
		chr = this.charCodeAt(i);
		hash = ((hash << 5) - hash) + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
};

/**
 * Reverse the given array
 */
jQuery.fn.reverse = function () {
	return this.pushStack(this.get().reverse(), arguments);
};
