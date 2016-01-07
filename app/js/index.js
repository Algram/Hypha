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

        if (messageContent != '') {
            let message = {
                from: selectedUsername,
                to: selectedChannel.name,
                message: messageContent
            }

            appendMessage(message);

            $(this).val('');
            ipcRenderer.send('messageSent', message.message);
        }
    }
});

$("#usernameInput").keydown(function (e) {
    if (e.keyCode == 13) {
        let username = $(this).val();
        console.log('pressed');

        if (username != '') {
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

        if (inputContent != '') {
            autocomplete(lastWord, function(name) {
                let cachedContent = inputContent.substring(
                    0, inputContent.lastIndexOf(" "));

                if (cachedContent == '') {
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

//CLEANUP
ipcRenderer.on('channelData', function(event, channel) {
    if (displayedChannels.indexOf(channel.name) == -1) {
        displayedChannels.push(channel.name);
        let line = '<li>' + channel.name + '</li>';
        $('#channelList ul').append(line);
    }
});

ipcRenderer.on('messageReceived', function(event, message) {
    //If message is to currently selected channel, display it there
    if (message.to == selectedChannel.name) {
        appendMessage(message);
    } else {
        let affectedChannel = $("#channelList li").filter(function() {
            return ($(this).text() === message.to)
        });

        $(affectedChannel).addClass('unread');
    }
});

ipcRenderer.on('channelSelected_reply', function(event, channel, username) {
    selectedChannel = channel;
    selectedUsername = username;

    let messages = channel.messages;

    $('#usernameInput').attr('placeholder', selectedUsername);
    $('#messageArea').empty();

    for (let key in messages) {
        let message = messages[key];
        appendMessage(message);
    }

    fillUsermenu(channel.users);
});

function appendMessage(message) {
    let nick = message.from;

    //Remove nick if message before was sent by the same nick
    if (!lastNicksUnique(nick)) {
        nick = '';
    }

    /*let line = '<line><timestamp>' + moment().format("HH:mm:ss") +
        '</timestamp><nick>' + nick + '</nick><message>' +
        message.message + '</message></line>';*/

    let line = '<line><nick>' + nick + '</nick><message>' + message.message + '</message></line>';


    $('#messageArea').append(line);

    //Check if username is mentioned somewhere in the message
    let pattern = new RegExp('\\b' + selectedUsername + '\\b', 'ig');
    if (pattern.test(message.message)) {
        $('#messageArea line:last message').addClass('highlighted');
        doNotify(selectedChannel.name + ' ' + message.from, message.message);
    }

    //Check if message contains links
    let links = findLinks(message.message);
    if (links != null) {
        let insertStr = message.message;

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
    $("#messageArea").animate({ scrollTop: $("#messageArea")[0].scrollHeight}, 0);
}

/*
This uses a permissive regex to find urls in a string
 */
function findLinks(str) {
    let pattern = /\b(?:[a-z]{2,}?:\/\/)?[^\s/]+\.\w{2,}(?::\d{1,5})?(?:\/[^\s]*\b|\b)(?![:.?#]\S)/gi;

    return str.match(pattern);
}

/*
Clean that up and comment or I will forget by tomorrow
 */
function lastNicksUnique(nextNick) {
    let unique = true;
    let lastNicks = $('#messageArea line nick');
    let iteratedNicks = [];

    $(lastNicks).reverse().each(function() {
        iteratedNicks.push($(this).text());

        if ($(this).text() != '') {
            return false;
        }
    })

    for (let key in iteratedNicks) {
        let nick = iteratedNicks[key];
        if (nick != nextNick) {
            unique = true;
        } else if (nick == '' || nick == nextNick) {
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
        if(user.indexOf(str) == 0) {
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


String.prototype.insert = function (index, string) {
  if (index > 0)
    return this.substring(0, index) + string + this.substring(index, this.length);
  else
    return string + this;
};

jQuery.fn.reverse = function() {
    return this.pushStack(this.get().reverse(), arguments);
};
