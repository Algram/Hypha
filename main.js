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

//Create the main network for the client
let network = new irc.Network('default');

// Quit when all windows are closed.
app.on('window-all-closed', function () {
	// On OS X it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform != 'darwin') {
		app.quit();
	}
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function () {
	// Initial createWindow
	createWindow();
	restoreState();

	//mainWindow.setMenu(null);

	// and load the index.html of the app.
	mainWindow.loadURL('file://' + __dirname + '/app/index.html');

	network.on('channelData', function (address, channel) {
		mainWindow.webContents.send('channelData', address, channel);
	})

	network.on('messageReceived', function (address, message) {
		mainWindow.webContents.send('messageReceived', address, message);
	})

	network.on('pmReceived', function (address, nick, text) {
		mainWindow.webContents.send('pmReceived', address, nick, text);
	})

	network.on('userlistChanged', function (address, channel) {
		mainWindow.webContents.send('userlistChanged', address, channel);
	})

	network.on('usernameChanged', function (address, nick) {
		mainWindow.webContents.send('usernameChanged', address, nick);
	})

	//////////////////////
	// Receiving Events //
	//////////////////////

	/*
	They renderer wants to send a message and fires the event for it
	that contains the message content
	 */
	ipcMain.on('messageSent', function (event, address, messageContent) {
		let selChannel = network.getClient(address).getSelectedChannel();

		let message = {
			from: network.getClient(address).getNick(),
			to: selChannel.getName(),
			message: messageContent,
			event: false,
			action: false
		}

		//Add message to selected channel
		selChannel.addMessage(message);

		//Tell the client to send the message to its channel
		network.getClient(address).say(message.to, message.message);
	});

	ipcMain.on('actionSent', function (event, address, target, message) {
		let selClient = network.getClient(address);
		selClient.sendAction(target, message);
	});

	/*
	In the renderer a channel got selected and the event contains
	the name of the selected channel
	 */
	ipcMain.on('channelSelected', function (event, address, name) {
		let selChannel = network.getClient(address).getChannel(name);
		network.getClient(address).setSelectedChannel(selChannel);

		event.sender.send('channelSelected_reply', address, selChannel, network.getClient(address).getNick());
	});

    ipcMain.on('channelAdded', function (event, address, channelName) {
        network.getClient(address).addChannel(channelName);
    });

	ipcMain.on('channelRemoved', function (event, address, channelName) {
        network.getClient(address).removeChannel(channelName);
    });

	ipcMain.on('serverAdded', function (event, nick, address, options) {
		network.addClient(nick, address, options);
		network.getClient(address).connect();
	});

	ipcMain.on('usernameChanged', function (event, address, nick) {
		network.getClient(address).changeNick(nick);
	});

	ipcMain.on('closeWindow', function (event) {
		let cls = network.getAllClients();
		for (let key in cls) {
			let cl = cls[key];
			cl.disconnect('Connection closed');
		}

		mainWindow.close()
	});

	// Open the DevTools.
	mainWindow.webContents.openDevTools();

	// Emitted when the window is being closed.
	mainWindow.on('close', function () {
		saveState();
	});

	// Emitted when the window is closed.
	mainWindow.on('closed', function () {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null;
	});

	require('electron').powerMonitor.on('suspend', function() {
	  saveState();
	});

	require('electron').powerMonitor.on('resume', function() {
	  restoreState();
	});
});

function createWindow() {
	let lastWindowState = storage.get('lastWindowState');
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

function saveState() {
	//Set lastWindowState
	let bounds = mainWindow.getBounds();
	storage.set('lastWindowState', {
		x: bounds.x,
		y: bounds.y,
		width: bounds.width,
		height: bounds.height,
		maximized: mainWindow.isMaximized()
	});

	//Set lastConnectionState
	let clients = [];
	let currClients = network.getAllClients();

	for (let key in currClients) {
		let currClient = currClients[key];
		let client = {};
		let nick = currClient.nick;
		let address = currClient.address;
		let channels = [];

		for (let key in currClient.channels) {
			let currChannel = currClient.channels[key];

			channels.push(currChannel.name);
		}

		client.nick = nick;
		client.address = address;
		client.channels = channels;
		clients.push(client);
	}

	storage.set('lastConnectionState', {
		clients: clients
	});
}

function restoreState() {
	let lastConnectionState = storage.get('lastConnectionState');

	if (lastConnectionState !== null) {
		let lastClients = lastConnectionState.clients;

		for (let key in lastClients) {
			let lastClient = lastClients[key];
			network.addClient(lastClient.nick, lastClient.address);

			//Only connect if server has channels
			if (lastClient.channels.length !== 0) {
				network.getClient(lastClient.address).connect();

				for (let key in lastClient.channels) {
					let newChannel = lastClient.channels[key];
					network.getClient(lastClient.address).addChannel(newChannel);
				}
			}
		}
	}
}
