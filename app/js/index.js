'use strict';
const ipcRenderer = require('electron').ipcRenderer;
const path = require('path');

let channels2 = [];
let selectedChannel;
let userName;

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

    doNotify();

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
    if (message.to == selectedChannel.name) {
        appendMessage(message);
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
    let line = '<line><nick>' + message.from + '</nick><message>' + message.message + '</message></line>';
    $('#messageArea').append(line);
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


let options = {
    title: "Basic Notification",
    body: "Short message part"
};

function doNotify() {
    new Notification(options.title, options);
}
