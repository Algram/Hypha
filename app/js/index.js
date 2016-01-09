'use strict';
const ipcRenderer = require('electron').ipcRenderer;
const path = require('path');
const shell = require('electron').shell;

let displayedServers = [];
let selectedServer = '';
let selectedChannel;
let selectedUsername = '';

/*
New message needs to be sent to main process
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
New username needs to be sent to main process
 */
$("#usernameInput").keydown(function (e) {
    if (e.keyCode == 13) {
        let username = $(this).val();
        console.log('pressed');

        if (username !== '') {
            selectedUsername = username;

            $("#usernameInput").val('');
            $("#usernameInput").attr('placeholder', username);
            ipcRenderer.send('usernameChanged', selectedServer, username);
        }
    }
});

$("#messageInput").keyup(function (e) {
    if (e.keyCode == 9) {
        //e.preventDefault();
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
            autocomplete(lastWord, function(name) {
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
New channel was selected, tell main and trigger visual changes
 */
$('#channelList').on('click', 'channel', function(e) {
    e.preventDefault();

    let serverAddress = $(this).siblings('name').text();
    console.log(serverAddress);

    $('#channelList server channel').removeClass('selected');
    $(this).removeClass('unread');
    $(this).addClass('selected');

    ipcRenderer.send('channelSelected', serverAddress, $(this).text());
})

/*
Link in a message was clicked, open it with default browser
 */
$('#messageArea').on('click', 'a', function(e) {
    e.preventDefault();

    //Check if "http://" is there and add it if necessary
    if ($(this).text().match(/^[^/]+:\/\//)) {
        shell.openExternal($(this).text());
    } else {
        shell.openExternal('http://' + $(this).text());
    }
})

/*
Tell main to close the window
 */
$('#titlebar').on('click', 'close', function(e) {
    e.preventDefault();
    ipcRenderer.send('closeWindow');
})

$('#titlebar').on('click', 'usermenu', function(e) {
    e.preventDefault();
    e.stopPropagation();

    $('#titlebar usermenu').toggleClass('closed');
})

$(document).click( function(){
    $('#titlebar usermenu').addClass('closed');
});


//////////////////////
// Receiving Events //
//////////////////////

ipcRenderer.on('channelData', function(event, address, channel) {
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
            adress: address,
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

ipcRenderer.on('messageReceived', function(event, address, message) {
    if (message.event === false && message.action === false) {
        //Mark as unread if not in selectedChannel
        if (address !== selectedServer || message.to !== selectedChannel.name) {
            let affectedServer = $('server name:contains(' + address + ')').parent();
            let affectedChannel = affectedServer.children('channel').filter(function() {
                return ($(this).text() === message.to)
            });

            $(affectedChannel).addClass('unread');
        }

        appendMessage(address, message);

    } else if (message.event === true) {
        //This message is an event
        appendEvent(address, message);
    }
});

ipcRenderer.on('userlistChanged', function(event, address, channel) {
    console.log(channel.users);
});

ipcRenderer.on('channelSelected_reply', function(event, address, channel, username) {
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
    fillUsermenu(channel.users);

    //Scroll to last appended message
    updateScrollState();
});

function appendMessage(address, message) {
    let nick = message.from;
    let messageEnc = encodeEntities(message.message);
    let selServer = $('[name="' + address + '"]');
    let selChannel = selServer.children('[name="' + message.to + '"]');

    //Remove nick if message before was sent by the same nick
    if (!lastNicksUnique(nick, selChannel)) {
        nick = '';
    }

    //Create line and appen it
    let line = '<line><nick>' + nick + '</nick><message>' + messageEnc +
        '</message></line>';
    selChannel.append(line);


    //Check if username is mentioned somewhere in the message,
    //send a notification if there is
    let pattern = new RegExp('\\b' + selectedUsername + '\\b', 'ig');
    if (pattern.test(messageEnc)) {
        selChannel.find('line:last message').addClass('highlighted');
        doNotify(selectedChannel.name + ' ' + message.from, message.message);
    }

    //Check if message contains links
    let links = findLinks(messageEnc);
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
    updateScrollState();
}

function appendEvent(address, message) {
    let line = '<line><event>' + message.message + '</event></line>';

    let selServer = $('[name="' + address + '"]');
    let selChannel = selServer.children('[name="' + message.to + '"]');

    selChannel.append(line);

    //Scroll to last appended message
    updateScrollState();
}

/*
Updates the scroll state to the last appended line
 */
function updateScrollState() {
    //Scroll to last appended message
    $("#messageArea").animate({
        scrollTop: $("#messageArea")[0].scrollHeight
    },0);
}

/*
This uses a permissive regex to find urls in a string
 */
function findLinks(str) {
    let pattern =  /\b(?:[a-z]{2,}?:\/\/)?[^\s/]+\.\w{2,}(?::\d{1,5})?(?:\/[^\s]*\b|\b)(?![:.?#]\S)/gi;

    return str.match(pattern);
}

/**
 * Returns true if the last nicks up until the last different nick
 * are unique. This is used to remove the nickname when possible, for example
 * when one user sends multiple messages
 */
function lastNicksUnique(nextNick, $channel) {
    let unique = true;
    let iteratedNicks = [];

    //Get last nicks of provided channel
    let lastNicks = $channel.find('line nick');

    //Iterate over nicks in reverse, break if nextNick is not empty,
    //add all nicks to a list
    $(lastNicks).reverse().each(function() {
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

/*
TODO add returning of multiple names, not just the first match
 */
function autocomplete(str, callback) {
    let users = Object.keys(selectedChannel.users[0]);

    for (let key in users) {
        let user = users[key];
        user = user.split(':')[0];

        //Check if str is the start of user
        if(user.indexOf(str) === 0) {
            callback(user);
        }
    }
}

function fillUsermenu(usersObj) {
    $('usermenu users').not(':first').empty();

    let users = Object.keys(usersObj[0]);

    for (let key in users) {
        let user = users[key];
        user = user.split(':')[0];

        $('usermenu users').append('<user>' + user + '</user>');
    }
}

/**
 * Use native notification-system libnotify. Works on most Mac and
 * most Linux-Systems, no support for windows
 */
function doNotify(title, body) {
    let options = {
        title: title,
        body: body,
        icon: path.join(__dirname, '/images/icon.png')
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
        replace(surrogate_pair_regexp, function(value) {
            var hi = value.charCodeAt(0);
            var low = value.charCodeAt(1);
            return '&#' + (((hi - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000) + ';';
        }).
        replace(non_alphanumeric_regexp, function(value) {
            return '&#' + value.charCodeAt(0) + ';';
        }).
        replace(/</g, '&lt;').
        replace(/>/g, '&gt;');
}

/**
 * Insert string into string at specified index
 */
String.prototype.insert = function (index, string) {
  if (index > 0)
    return this.substring(0, index) + string + this.substring(index, this.length);
  else
    return string + this;
};

jQuery.fn.reverse = function() {
    return this.pushStack(this.get().reverse(), arguments);
};

/*(function loop(i){
    if(i<messages.length){
        setTimeout(function(){
            let message = messages[i];

            if (message.event === false && message.action === false) {
                appendMessage(message);
            } else if (message.event === true) {
                //This message is an event
                appendEvent(message);
            }

            loop(++i)
        },1);
    }
}(0));*/
