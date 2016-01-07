'use strict';
const ipcRenderer = require('electron').ipcRenderer;
const path = require('path');
const shell = require('electron').shell;

let displayedChannels = [];
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

            appendMessage(message);
            ipcRenderer.send('messageSent', message.message);
        }
    }
});

$("#usernameInput").keydown(function (e) {
    if (e.keyCode == 13) {
        let username = $(this).val();
        console.log('pressed');

        if (username !== '') {
            selectedUsername = username;

            $("#usernameInput").val('');
            $("#usernameInput").attr('placeholder', username);
            ipcRenderer.send('usernameChanged', username);
        }
    }
});

$("#messageInput").keyup(function (e) {
    if (e.keyCode == 9) {
        e.preventDefault();
    }
});

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

$('#channelList').on('click', 'li', function(e) {
    e.preventDefault();

    $('#channelList li').removeClass('selected');
    $(this).removeClass('unread');
    $(this).addClass('selected');

    //Need to change that to check for corresponding server too
    //otherwise there will be problem with same names on different
    //servers
    ipcRenderer.send('channelSelected', $(this).text());
})

$('#messageArea').on('click', 'a', function(e) {
    e.preventDefault();

    //Check if "http://" is there and add it if necessary
    if ($(this).text().match(/^[^/]+:\/\//)) {
        shell.openExternal($(this).text());
    } else {
        shell.openExternal('http://' + $(this).text());
    }
})

$('#titlebar').on('click', 'close', function(e) {
    e.preventDefault();
    ipcRenderer.send('closeWindow');
})


//////////////////////
// Receiving Events //
//////////////////////

ipcRenderer.on('channelData', function(event, channel) {
    if (displayedChannels.indexOf(channel.name) == -1) {
        displayedChannels.push(channel.name);

        //Add channel-item to channelList, refactor to also add server-item
        let line = '<li>' + channel.name + '</li>';
        $('#channelList ul').append(line);

        //Add channel-tag to messageArea, refactor to also add server-tag
        let cleanName = channel.name.substr(1);
        $('#messageArea').append('<' + cleanName + '>' + '</' + cleanName + '>');
    }
});

ipcRenderer.on('messageReceived', function(event, message) {
    if (message.event === false && message.action === false) {
        //Mark as unread if not in selectedChannel
        if (message.to !== selectedChannel.name) {
            let affectedChannel = $("#channelList li").filter(function() {
                return ($(this).text() === message.to)
            });

            $(affectedChannel).addClass('unread');
        }

        //Check if username is mentioned somewhere in the message
        let pattern = new RegExp('\\b' + selectedUsername + '\\b', 'ig');
        if (pattern.test(message.message)) {
            doNotify(selectedChannel.name + ' ' + message.from, message.message);
        }

        appendMessage(message);

    } else if (message.event === true) {
        //This message is an event
        appendEvent(message);
    }
});

ipcRenderer.on('channelSelected_reply', function(event, channel, username) {
    selectedChannel = channel;
    selectedUsername = username;

    $('#usernameInput').attr('placeholder', selectedUsername);

    $("#messageArea").children().css('display', 'none');
    let cleanName = channel.name.substr(1);
    $(cleanName).css('display', 'block');

    fillUsermenu(channel.users);
});

ipcRenderer.on('userlistChanged', function(event, users) {
    console.log(users);
});

function appendMessage(message) {
    let nick = message.from;
    let messageEnc = encodeEntities(message.message);

    //Remove nick if message before was sent by the same nick
    if (!lastNicksUnique(nick, message.to)) {
        nick = '';
    }

    let line = '<line><nick>' + nick + '</nick><message>' + messageEnc +
        '</message></line>';

    //Will eventually have to refactor to check server too
    let channelNameToAppendTo = '';
    $('#messageArea').children().each(function(index) {
        let tagName = $(this).prop('tagName').toLowerCase();
        if( tagName === message.to.substr(1)) {
            channelNameToAppendTo = message.to.substr(1);
        }
    });
    $(channelNameToAppendTo).append(line);

    //Check if username is mentioned somewhere in the message
    let pattern = new RegExp('\\b' + selectedUsername + '\\b', 'ig');
    if (pattern.test(messageEnc)) {
        $('#messageArea line:last message').addClass('highlighted');
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

function appendEvent(message) {
    let line = '<line><event>' + message.message + '</event></line>';

    //Will eventually have to refactor to check server too
    let channelNameToAppendTo = '';
    $('#messageArea').children().each(function(index) {
        let tagName = $(this).prop('tagName').toLowerCase();
        if( tagName === message.to.substr(1)) {
            channelNameToAppendTo = message.to.substr(1);
        }
    });
    $(channelNameToAppendTo).append(line);

    $('#messageArea').append(line);

    //Scroll to last appended message
    updateScrollState();
}

/*
Updates the scroll state to the last appended line
 */
function updateScrollState() {
    //Scroll to last appended message
    $("#messageArea").animate(
        {
            scrollTop: $("#messageArea")[0].scrollHeight
        },0
    );
}

/*
This uses a permissive regex to find urls in a string
 */
function findLinks(str) {
    let pattern =  /\b(?:[a-z]{2,}?:\/\/)?[^\s/]+\.\w{2,}(?::\d{1,5})?(?:\/[^\s]*\b|\b)(?![:.?#]\S)/gi;

    return str.match(pattern);
}

/*
Clean that up and comment or I will forget by tomorrow
 */
function lastNicksUnique(nextNick, channelName) {
    let unique = true;
    //Refactor that to also use server-tag name
    let lastNicks = $(channelName + 'line nick');
    let iteratedNicks = [];

    $(lastNicks).reverse().each(function() {
        iteratedNicks.push($(this).text());

        if ($(this).text() !== '') {
            return false;
        }
    })

    for (let key in iteratedNicks) {
        let nick = iteratedNicks[key];
        if (nick != nextNick) {
            unique = true;
        } else if (nick === '' || nick == nextNick) {
            unique = false;
            break;
        }
    }

    return unique;
}

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
    $('usermenu users').empty();

    let users = Object.keys(usersObj);

    for (let key in users) {
        let user = users[key];
        user = user.split(':')[0];

        $('usermenu users').append('<user>' + user + '</user>');
    }
}

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
