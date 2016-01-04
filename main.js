'use strict';
const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const irc = require('irc');
const ipcMain = require('electron').ipcMain;
const channels = require('./app/js/channels');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform != 'darwin') {
    app.quit();
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      frame: true,
      x: 400,
      y: 400,
      minWidth: 500,
      minHeight: 300,
      overlayScrollbar: true
  });

  mainWindow.setMenu(null);

  // and load the index.html of the app.
  mainWindow.loadURL('file://' + __dirname + '/app/index.html');

  initializeIRC();

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
});

function initializeIRC() {
    let config = {
    	channels: ["#dblabla", "#nonexistentas", "#linuxmasterrace"],
    	server: "irc.freenode.net",
    	name: "testignoreme"
    };

    /*let config = {
    	channels: ["#linuxmasterracecirclejerk", "#supersecretproject"],
    	server: "irc.snoonet.org",
    	name: "Algram_"
    };*/

    let client = new irc.Client(config.server, config.name, {
    	channels: config.channels
    });

    /*
    This event happens everytime the client connects to a channel
    If it is successful, all the channel-data is provided
     */
    client.addListener('names', function(channel, nicks) {
        let availChannels = client.chans;
        let nick = client.nick;

        for (let key in availChannels) {
            let channel = availChannels[key];
            let channelName = channel.serverName;
            let channelUsers = channel.users;

            //Add the channel to the channels module
            channels.addChannel(channelName, nick, channelUsers);

            //Tell the renderer that channel data was received and send it over
            mainWindow.webContents.send(
                'channelData', nick, channelName, channelUsers);
        }
    });

    /*
    This event gets fired when the client receives a new message
     */
    client.addListener('message', function (from, to, messageContent) {
        let message = {
            from: from,
            to: to,
            message: messageContent
        }

        //Add the message to the channel object
        channels.addMessageToChannel(message.to, message);

        //Tell the renderer that a message was received and send it over
        mainWindow.webContents.send('messageReceived', message);
    });

    /*
    Listening to errors, otherwise the program will exit on error
     */
    client.addListener('error', function(message) {
        console.log('error: ', message);
    });


    //////////////////////
    // Receiving Events //
    //////////////////////

    /*
    They renderer wants to send a message and fires the event for it
    that contains the message content
     */
    ipcMain.on('messageSent', function(event, messageContent) {
        channels.getSelectedChannel(function(channel) {
            let message = {
                from: channel.username,
                to: channel.name,
                message: messageContent
            }

            //Add the message to the appropriate channel
            channels.addMessageToChannel(message.to, message);

            //Tell the client to send the message to its channel
            client.say(message.to, message.message);
        })
    });


    ipcMain.on('channelSelected', function(event, arg) {
        channels.setSelectedChannel(arg, function(r) {
            channels.getMessagesOfChannel(r.name, function(messages) {
                event.sender.send('channelSelected_reply', messages);
            })
        });
    });







    /*client.addListener('registered', function(message) {
        setTimeout(function () {
            client.say('#supersecretproject', "test");
        }, 4000);
    });

    client.addListener('topic', function(channel, nicks) {
        console.log('names: ', nicks);


        //event.sender.send('messageSent', 'message received');
    });*/
}
