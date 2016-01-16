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
function initializeMenus() {
	//TEXT EDIT MENU
	let textMenu = Menu.buildFromTemplate([{
	        label: 'Copy',
	        role: 'copy',
	    }
	]);

	$('#messageArea').on('contextmenu', 'line', function (e) {
		e.preventDefault();
		textMenu.popup(remote.getCurrentWindow());
	})


	//CHANNEL REMOVE MENU
	let channelMenu = new Menu();
	let elementTargeted;
	channelMenu.append(new MenuItem({ label: 'Remove', click: function() {
		let serverName = elementTargeted.siblings('name').text();
		let channelName = elementTargeted.text();

		for (let key in displayedServers) {
			let server = displayedServers[key];

			if (server.address == serverName) {
				let indexOfChannel = server.channels.indexOf(channelName);
				if (indexOfChannel > -1) {
					server.channels.splice(indexOfChannel, 1);
				}
			}
		}

		elementTargeted.remove();

		ipcRenderer.send('channelRemoved', serverName, channelName);
	}}));

	$('#channelList').on('contextmenu', 'channel', function (e) {
		e.preventDefault();
		elementTargeted = $(this);
		channelMenu.popup(remote.getCurrentWindow());
	})
}

/*
New channel was selected, tell main and trigger visual changes
 */
$('#channelList').on('click', 'channel', function (e) {
	e.preventDefault();

	let serverAddress = $(this).siblings('name').text();

	$('#channelList server channel').removeClass('selected');
	$(this).removeClass('unread');
	$(this).addClass('selected');

	ipcRenderer.send('channelSelected', serverAddress, $(this).text());
})

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
	util.fillUsermenu(channel.users);

	//Scroll to last appended message
	util.updateScrollState();
});

$('#titlebar').on('click', 'add',function (e) {
	$('body').toggleClass('prevent');
	$('.modal').toggleClass('active');

	$('.modal select').empty();

    //testing
    for(let key in displayedServers) {
        let server = displayedServers[key];
        $('.modal select').append('<option>' + server.address + '</option>');
    }
});

$('.modal .close').click(function (e) {
	$('body').toggleClass('prevent');
	$('.modal').toggleClass('active');
});

$('#addServer').click(function(e) {
	let serverAddress = $('#serverInput').val();
	let serverExists = $('select:contains("' + serverAddress + '")' ).length > 0 ;
	if (!serverExists) {
		let username = $('#nickInput').val();

		$('.modal select').append('<option>' + serverAddress + '</option>');

		ipcRenderer.send('serverAdded', username, serverAddress);
	} else {
		console.log('Server already added.');
	}
});

$('#addChannel').click(function(e) {
    let selServer = $('.modal select :selected').text();
	let newChannel = $('#channelInput').val();

    ipcRenderer.send('channelAdded', selServer, newChannel);
});


//////////////////////
// Receiving Events //
//////////////////////

ipcRenderer.on('channelData', function (event, address, channel) {
	//First channel to arrive, add it
	if (displayedServers.length < 1) {
		let serverData = {
			address: address,
			channels: [channel.name]
		}

		displayedServers.push(serverData);

		let line = '<server><name>' + address + '</name><channel>' +
			channel.name + '</channel></server>';
		$('#channelList').append(line);

		//Add channel-tag to messageArea, refactor to also add server-tag
		let msgLine = '<server name="' + address + '"><channel name="' +
			channel.name + '"></channel></server>';
		$('#messageArea').append(msgLine);
	}

	let serverExists = false;
	for (let key in displayedServers) {
		let server = displayedServers[key];

		if (server.address == address) {
			//Server exists, check if channel does in server
			serverExists = true;

			if (server.channels.indexOf(channel.name) == -1) {
				//Channel doesnt exist, add it to the server
				server.channels.push(channel.name)

				let line = '<channel>' + channel.name + '</channel>';
				$('server name:contains(' + address + ')').parent().append(line);

				//Add channel-tag to messageArea, refactor to also add server-tag
				let selServer = $('[name="' + address + '"]');
				let msgLine = '<channel name="' + channel.name + '"></channel>';
				selServer.append(msgLine);
			}
		}
	}

	//Server doesn't exist, add it
	if (!serverExists) {
		let serverData = {
			address: address,
			channels: [channel.name]
		}

		displayedServers.push(serverData);

		let line = '<server><name>' + address + '</name><channel>' +
			channel.name + '</channel></server>';
		$('#channelList').append(line);

		//Add channel-tag to messageArea, refactor to also add server-tag
		let msgLine = '<server name="' + address + '"><channel name="' +
			channel.name + '"></channel></server>';
		$('#messageArea').append(msgLine);
	}
});

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

			let start = insertStr.indexOf(link);
			insertStr = insertStr.insert(start, '<a>');

			let end = start + link.length + 3;
			insertStr = insertStr.insert(end, '</a>');
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

		if (messageContent !== '') {
			let message = {
				from: selectedUsername,
				to: selectedChannel.name,
				message: messageContent
			}

			$(this).val('');

			appendMessage(selectedServer, message);
			ipcRenderer.send('messageSent', selectedServer, message.message);
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
$("#messageInput").keydown(function (e) {
	if (e.keyCode == 9) {
		e.preventDefault();

		let inputContent = $(this).val();
		let lastWord = inputContent.split(' ').pop();

		if (inputContent !== '') {
			util.autocomplete(lastWord, selectedChannel.users[0], function (name) {
				let cachedContent = inputContent.substring(
					0, inputContent.lastIndexOf(" "));

				if (cachedContent === '') {
					$("#messageInput").val(name + ': ');
				} else {
					$("#messageInput").val(cachedContent + ' ' + name);
				}
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
String.prototype.hashCode = function() {
  var hash = 0, i, chr, len;
  if (this.length === 0) return hash;
  for (i = 0, len = this.length; i < len; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
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
