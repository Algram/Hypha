'use strict';
const ipcRenderer = require('electron').ipcRenderer;

let channels2 = [];
let currentChannel = '';
let userName = '';

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

            ipcRenderer.send('messageSent', message.message);
            $(this).val('');
        }
    }
});

ipcRenderer.on('messageReceived', function(event, message) {
    appendMessage(message);
    $("#messageArea").animate({ scrollTop: $("#messageArea")[0].scrollHeight}, 0);
});

ipcRenderer.on('channelData', function(event, nick, channelName, channelUsers) {
    userName = nick;

    if (channels2.indexOf(channelName) == -1) {
        channels2.push(channelName);
        let line = '<li>' + channelName + '</li>';
        $('#channelList ul').append(line);
    }
});

$('#channelList').on('click', 'li', function(e) {
    e.preventDefault();

    $('#channelList li').removeClass('selected');
    $(this).addClass('selected');

    ipcRenderer.send('channelSelected', $(this).text());
})

ipcRenderer.on('channelSelected_reply', function(event, messages) {
    $('#messageArea').empty();

    for (let key in messages) {
        let message = messages[key];
        appendMessage(message);
    }
});

function appendMessage(message) {
    console.log(message.message);
    let line = '<line><nick>' + message.from + '</nick><message>' + message.message + '</message></line>';
    $('#messageArea').append(line);
}
