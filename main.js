'use strict';
const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const Menu = electron.Menu;
const Tray = electron.Tray;
const ipcMain = require('electron').ipcMain;
const irc = require('./app/js/client');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let appIcon = null;
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
// Initial createWindow
  createWindow();

  // Create a tray icon, GPL mock icon from http://www.iconarchive.com/show/captiva-icons-by-bokehlicia/chat-irc-icon.html
  appIcon = new Tray('app/images/logo.png');
  appIcon.setToolTip('IRClean');
  let contextMenu = Menu.buildFromTemplate([
    { label: 'Quit', click: function() { app.quit(); }}
  ]);
  appIcon.setContextMenu(contextMenu);


  // Show and hide the application
  appIcon.on('click', function() {

    if (mainWindow !== null && mainWindow.isVisible()) {
      mainWindow.hide();
    }
    else if(mainWindow !== null && mainWindow.isVisible() === 0) {
      mainWindow.show();
    }
   if(mainWindow === null) {
    createWindow();
  }
});

  mainWindow.setMenu(null);

  // and load the index.html of the app.
  mainWindow.loadURL('file://' + __dirname + '/app/index.html');

    addClient('testignoreme', 'irc.snoonet.org');

  //initializeIRC();

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  ipcMain.on('closeWindow', function(event) {
      mainWindow.close();
  });
});


function addClient(name, address) {
    let client = new irc.Client(name, address);

    client.on('channelData', function(channel) {
        mainWindow.webContents.send('channelData', channel);
    })

    client.on('messageReceived', function(message) {
        mainWindow.webContents.send('messageReceived', message);
    })

    client.on('action', function(data) {

    })

    client.on('event', function(data) {
        mainWindow.webContents.send('event', data);
    })


    //////////////////////
    // Receiving Events //
    //////////////////////

    /*
    They renderer wants to send a message and fires the event for it
    that contains the message content
     */
    ipcMain.on('messageSent', function(event, messageContent) {
        let selChannel = client.getSelectedChannel();

        let message = {
            from: client.getNick(),
            to: selChannel.getName(),
            message: messageContent
        }

        //Add message to selected channel
        selChannel.addMessage(message);

        //Tell the client to send the message to its channel
        client.say(message.to, message.message);
    });

    /*
    In the renderer a channel got selected and the event contains
    the name of the selected channel
     */
    ipcMain.on('channelSelected', function(event, name) {
        let selChannel = client.getChannel(name);
        client.setSelectedChannel(selChannel);

        event.sender.send('channelSelected_reply', selChannel, client.getNick());
    });

    /*
    The username in the renderer got changes, update the client module
    accordingly and send the name-change command to the server
     */
    ipcMain.on('usernameChanged', function(event, username) {
        /*channels.getSelectedChannel(function(channel) {
            channels.setChannelUsername(channel.name, username, function(r) {
                console.log(r.username);
            });
        });*/

        client.send('NICK', username);
    });

    client.addChannel('#linuxmasterracecirclejerk');
    client.addChannel('#supersecretproject');

    client.connect();
}

function createWindow() {
  mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      frame: false,
      x: 400,
      y: 400,
      minWidth: 500,
      minHeight: 300,
      overlayScrollbar: true,
      icon: __dirname + '/app/images/logo.png'
  });
}


/*function initializeIRC() {
    ipcMain.on('setNewUsername', function(event, username) {
        channels.getSelectedChannel(function(channel) {
            channels.setChannelUsername(channel.name, username, function(r) {
                console.log(r.username);
            });
        });

        client.send('NICK', username);
    });
}*/
