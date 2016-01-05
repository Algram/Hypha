'use strict';
const ipcRenderer = require('electron').ipcRenderer;
const path = require('path');

let channels2 = [];
let selectedChannel;
let userName;
jQuery.fn.reverse = function() {
    return this.pushStack(this.get().reverse(), arguments);
};

$("#messageInput").keyup(function (e) {
    if (e.keyCode == 13) {
        let messageContent = $(this).val();

        if (messageContent != '') {
            let message = {
                from: userName,
                to: null,
                message: messageContent
            }

            appendMessage(message);
            $("#messageArea").animate({ scrollTop: $("#messageArea")[0].scrollHeight}, 0);

            $(this).val('');
            ipcRenderer.send('messageSent', message.message);
        }
    }
});

$("#messageInput").keydown(function (e) {
    if (e.keyCode == 9) {
        e.preventDefault();
    }
});

$("#messageInput").keyup(function (e) {
    if (e.keyCode == 9) {
        e.preventDefault();

        let inputContent = $(this).val();
        let lastWord = inputContent.split(' ').pop();

        if (inputContent != '') {
            autocomplete(lastWord, function(name) {
                inputContent = inputContent.substring(
                    0, inputContent.lastIndexOf(" "));

                $("#messageInput").val(inputContent + name + ': ');
            })
        }
    }
});

$('#channelList').on('click', 'li', function(e) {
    e.preventDefault();

    $('#channelList li').removeClass('selected');
    $(this).addClass('selected');

    ipcRenderer.send('channelSelected', $(this).text());
})


//////////////////////
// Receiving Events //
//////////////////////

ipcRenderer.on('channelData', function(event, nick, channelName, channelUsers) {
    userName = nick;

    if (channels2.indexOf(channelName) == -1) {
        channels2.push(channelName);
        let line = '<li>' + channelName + '</li>';
        $('#channelList ul').append(line);
    }
});

ipcRenderer.on('messageReceived', function(event, message) {
    //If message is to currently selected channel, display it there
    if (message.to == selectedChannel.name) {
        appendMessage(message);
    }

    //Check if username is mentioned somewhere in the message
    let pattern = new RegExp('\\b' + selectedChannel.username + '\\b', 'ig');
    if (pattern.test(message.message)) {
        doNotify(selectedChannel.name + ' ' + message.from, message.message);
    }

    $("#messageArea").animate({ scrollTop: $("#messageArea")[0].scrollHeight}, 0);
});


ipcRenderer.on('channelSelected_reply', function(event, channel) {
    selectedChannel = channel;
    let messages = channel.messages;

    $('#messageArea').empty();

    for (let key in messages) {
        let message = messages[key];
        appendMessage(message);
    }
});

function appendMessage(message) {
    let nick = message.from;

    //Remove nick if message before was sent by the same nick
    if (!lastNicksUnique(nick)) {
        nick = '';
    }

    let line = '<line><nick>' + nick + '</nick><message>' + message.message + '</message></line>';
    $('#messageArea').append(line);

    //Check if username is mentioned somewhere in the message
    let pattern = new RegExp('\\b' + selectedChannel.username + '\\b', 'ig');
    if (pattern.test(message.message)) {
        $('#messageArea line:last message').addClass('highlighted');
    }
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
    let users = Object.keys(selectedChannel.users);

    for (let key in users) {
        let user = users[key];
        user = user.split(':')[0];

        //Check if str is the start of user
        if(user.indexOf(str) == 0) {
            callback(user);
        }
    }
}

function doNotify(title, body) {
    let options = {
        title: title,
        body: body,
        icon: path.join(__dirname, 'icon.png')
    };

    new Notification(options.title, options);
}
