'use strict';
const ipcRenderer = require('electron').ipcRenderer;
const util = require('./js/util');

let displayedServers = [];
let selectedServer = '';
let selectedChannel;
let selectedUsername = '';

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

    //testing
    for(let key in displayedServers) {
        let server = displayedServers[key];
        $('.modal select').append('<option>' + server.address + '</option>');
    }
});

$('.modal').on('click', 'button',function (e) {
	$('body').toggleClass('prevent');
	$('.modal').toggleClass('active');

    //selectedServer
    let selServer = $('.modal select :selected').text();

    //Add new channel
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
		if (address !== selectedServer || message.to !== selectedChannel.name ||
				selectedChannel === null) {
			let affectedServer = $('server name:contains(' + address + ')').parent();
			let affectedChannel = affectedServer.children('channel').filter(function () {
				return ($(this).text() === message.to)
			});

			$(affectedChannel).addClass('unread');
		}

		//Make messages of now selectedChannel visible, hide all others
		//TODO code-duplication
		$("#messageArea server").children('channel').css('display', 'none');
		let selServer = $('[name="' + address + '"]');
		let selChannel = selServer.children('[name="' + selectedChannel.name + '"]');
		selChannel.css('display', 'block');

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

	//Create line and appen it
	let line = '<line><nick>' + nick + '</nick><message>' + messageEnc +
		'</message></line>';
	selChannel.append(line);

	//Color nick based on string-hash
	$('#messageArea line:last nick').css('color', util.stringToColour(nick));

	//Check if username is mentioned somewhere in the message,
	//send a notification if there is
	let pattern = new RegExp('\\b' + selectedUsername + '\\b', 'ig');
	if (pattern.test(messageEnc)) {
		selChannel.find('line:last message').addClass('highlighted');
		util.doNotify(selectedChannel.name + ' ' + message.from, message.message);
	}

	//Check if message contains links
	let links = util.findLinks(messageEnc);
	if (links !== null) {
		let insertStr = messageEnc;

		for (let key in links) {
			let link = links[key];

			let start = insertStr.indexOf(link);
			insertStr = insertStr.insert(start, '<a>');

			let end = start + link.length + 3;
			insertStr = insertStr.insert(end, '</a>');
		}

		$('#messageArea line:last message').html(insertStr);
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
 * Reverse the given array
 */
jQuery.fn.reverse = function () {
	return this.pushStack(this.get().reverse(), arguments);
};
