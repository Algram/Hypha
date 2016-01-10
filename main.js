'use strict';
const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const Menu = electron.Menu;
const Tray = electron.Tray;
const ipcMain = require('electron').ipcMain;
const irc = require('./app/js/network');
const storage = require('./app/js/storage');

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

  //mainWindow.setMenu(null);

  // and load the index.html of the app.
  mainWindow.loadURL('file://' + __dirname + '/app/index.html');

    /*let clientSnoo = addClient('Testgram', 'irc.snoonet.org');
    clientSnoo.addChannel('#linuxmasterracecirclejerk');
    clientSnoo.addChannel('#supersecretproject');

    let clientFree = addClient('HelloWorld165', 'irc.freenode.net');
    clientFree.addChannel('#linuxmasterrace');*/

  let network = new irc.Network('testnetwork');
  //network.addClient('Testgram', 'irc.snoonet.org');
  network.addClient('helloworld16', 'irc.freenode.net');
  //network.addClient('helloworld167', 'irc.esper.net');

  /*let c1 = network.getClient('irc.snoonet.org');
  c1.addChannel('#supersecretproject');
  c1.addChannel('#linuxmasterrace');
  c1.connect();*/

  let c2 = network.getClient('irc.freenode.net');
  c2.addChannel('#linuxmasterrace');
  c2.addChannel('#linasdasde');
  c2.connect();

  /*let c2 = network.getClient('irc.freenode.net');
  c2.addChannel('#ubuntu');
  c2.addChannel('#arch');
  c2.connect();*/

  /*let c3 = network.getClient('irc.esper.net');
  c3.addChannel('#linuxmasterrace');
  c3.addChannel('#asdasdsad');
  c3.connect();*/


  network.on('channelData', function(address, channel) {
      mainWindow.webContents.send('channelData', address, channel);
  })

  network.on('messageReceived', function(address, message) {
      mainWindow.webContents.send('messageReceived', address, message);
  })

  network.on('userlistChanged', function(address, channel) {
      mainWindow.webContents.send('userlistChanged', address, channel);
  })


  //////////////////////
  // Receiving Events //
  //////////////////////

  /*
  They renderer wants to send a message and fires the event for it
  that contains the message content
   */
  ipcMain.on('messageSent', function(event, adress, messageContent) {
      let selChannel = network.getClient(adress).getSelectedChannel();

      let message = {
          from: network.getClient(adress).getNick(),
          to: selChannel.getName(),
          message: messageContent,
          event: false,
          action: false
      }

      //Add message to selected channel
      selChannel.addMessage(message);

      //Tell the client to send the message to its channel
      network.getClient(adress).say(message.to, message.message);
  });

  /*
  In the renderer a channel got selected and the event contains
  the name of the selected channel
   */
  ipcMain.on('channelSelected', function(event, address, name) {
      let selChannel = network.getClient(address).getChannel(name);
      network.getClient(address).setSelectedChannel(selChannel);

      event.sender.send('channelSelected_reply', address, selChannel, network.getClient(address).getNick());
  });



  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  // Emitted when the window is being closed.
  mainWindow.on('close', function() {
    let bounds = mainWindow.getBounds();
    storage.set("lastWindowState", {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        maximized: mainWindow.isMaximized()
    });
  });

  ipcMain.on('closeWindow', function(event) {
      mainWindow.close();
  });
});

function createWindow() {
    let lastWindowState = storage.get("lastWindowState");
    if (lastWindowState === null) {
        lastWindowState = {
            width: 800,
            height: 600,
            maximized: false
        }
    }

    mainWindow = new BrowserWindow({
        x: lastWindowState.x,
        y: lastWindowState.y,
        width: lastWindowState.width,
        height: lastWindowState.height,
        minWidth: 500,
        minHeight: 300,
        frame: false,
        overlayScrollbar: true,
        icon: __dirname + '/app/images/logo.png'
    });

    if (lastWindowState.maximized) {
        mainWindow.maximize();
    }
}

function addClient(name, address) {
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

    client.connect();

    return client;
}
