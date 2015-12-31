'use strict';
const ipcRenderer = require('electron').ipcRenderer;

let channels = [];
let currentChannel = '';
let userName = '';

/*ipcRenderer.on('asynchronous-reply', function(event, arg) {
  console.log(arg);
});*/

$("#messageInput").keyup(function (e) {
    if (e.keyCode == 13) {
        let message = $(this).val();

        if (message != '') {
            let line = '<p><span id="from">' + userName + '</span>' + message + '</p>';
            $('#content').append(line);
            $("#content").animate({ scrollTop: $("#content")[0].scrollHeight}, 0);

            ipcRenderer.send('messageSent', message);
            $(this).val('');
        }
    }
});

ipcRenderer.on('messageReceived', function(event, from, to, message) {
    let line = '<p><span id="from">' + from + '</span>' + message + '</p>';
    $('#content').append(line);
    $("#content").animate({ scrollTop: $("#content")[0].scrollHeight}, 0);
});

ipcRenderer.on('channelData', function(event, nick, channelName, channelUsers) {
    userName = nick;

    if (channels.indexOf(channelName) == -1) {
        channels.push(channelName);
        let line = '<li>' + channelName + '</li>';
        $('#channelList ul').append(line);
    }

});
