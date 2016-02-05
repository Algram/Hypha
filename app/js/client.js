'use strict';
const channel = require('./channel');
const irc = require('irc');
const util = require('util');
const events = require('events');

class Client {
	constructor(nick, address, options) {
		this.nick = nick;
		this.address = address;
		this.channels = [];
		this.selectedChannel = '';

		this.client = new irc.Client(address, nick, options);

		this.addListeners();
	}

	addChannel(name, mode) {
		let exists = false;
		for (let key in this.channels) {
			let selChannel = this.channels[key];

			if (selChannel.getName() === name) {
				exists = true;
			}
		}

		if (!exists) {
			//Create a new channel object
			let ircchannel = new channel.Channel(name, mode);

			//Special handling if channel is a pm channel
			if (mode === 'pm') {
				ircchannel.addUser({
					name: this.nick,
					rank: ''
				})
				ircchannel.addUser({
					name: name,
					rank: ''
				})

				// Add it to the collection.
				this.channels.push(ircchannel);
			} else {
				// Add it to the collection.
				this.channels.push(ircchannel);
				this.join(name);
			}
		}
	}

	removeChannel(name) {
		for (let key in this.channels) {
			let selChannel = this.channels[key];

			if (selChannel.getName() === name) {
				this.channels.splice(key, 1);
				this.client.part(name);
			}
		}

		if (this.channels.length === 0) {
			this.disconnect('Connection closed');
		}
	}

	getChannel(name) {
		for (let key in this.channels) {
			let channel = this.channels[key];

			if (channel.getName() == name) {
				return channel;
			}
		}
	}

	setSelectedChannel(channel) {
		this.selectedChannel = channel;
	}

	getSelectedChannel() {
		return this.selectedChannel;
	}

	changeNick(newNick) {
		this.client.send('NICK', newNick);
	}

	getNick(name) {
		return this.nick;
	}

	say(channel, message) {
		this.client.say(channel, message);
	}

	sendAction(target, message) {
		this.client.action(target, message);
	}

	connect() {
		console.log('Connecting..', this.address);
		let client = this.client;
		let channels = this.channels;

		client.connect(function () {
			for (let key in channels) {
				let channel = channels[key];
				client.join(channel.getName());
			}
		});
	}

	disconnect(message) {
		console.log('beepdiscon');
		this.client.disconnect(message, function (e) {
			console.log('OUTBIY', e);
		});
	}

	join(name) {
		this.client.join(name);
	}

	addListeners() {
		/*
		This event happens everytime the client connects to a channel
		If it is successful, all the channel-data is provided
		 */
		this.client.on('names', (channel, nicks) => {
			let joinedChannels = this.client.chans;

			for (let key in joinedChannels) {
				let selChannel = joinedChannels[key];
				let channelName = selChannel.serverName;
				let channelUsers = selChannel.users;

				for (let key in this.channels) {
					let selChannel = this.channels[key];

					if (selChannel.getName() == channelName) {
						for (let key in channelUsers) {
							let name = key;
							let rank = channelUsers[key];

							let user = {
								name: name,
								rank: rank
							}

							selChannel.addUser(user);
						}

						this.emit('channelData', this.address, selChannel);
					}
				}
			}
		});

		/*
		This event gets fired when the client receives a new message
		 */
		this.client.addListener('message', (from, to, messageContent) => {
			let message = {
				from: from,
				to: to,
				message: messageContent,
				event: false,
				action: false
			}

			for (let key in this.channels) {
				let channel = this.channels[key];

				if (channel.getName() == message.to) {
					//Add the message to the channel object
					channel.addMessage(message);
					this.emit('messageReceived', this.address, message);
				}
			}
		});

		this.client.addListener('join', (channelName, nick, messageObj) => {
			//Filter out own join message
			if (nick !== this.nick) {
				let channel = this.getChannel(channelName);

				let message = {
					from: nick,
					to: channelName,
					message: nick + ' joined.',
					event: true,
					action: false
				}

				let user = {
					name: nick,
					rank: ''
				}

				channel.addUser(user);
				channel.addMessage(message);

				this.emit('messageReceived', this.address, message);
			}
		});

		this.client.addListener('part', (channelName, nick, reason, messageObj) => {
			if (nick !== this.nick) {
				let channel = this.getChannel(channelName);

				let message = {
					from: nick,
					to: channelName,
					message: nick + ' left. ' + '(' + reason + ')',
					event: true,
					action: false
				}

				channel.removeUser(nick);
				channel.addMessage(message);

				this.emit('messageReceived', this.address, message);
			}
		});

		this.client.addListener('quit', (nick, reason, channels, messageObj) => {
			for (let key in this.channels) {
				let channel = this.channels[key];
				let usersClean = channel.users.map(user => user.name);

				if (usersClean.indexOf(nick) > -1) {
					//Add this message to every channel, if user exists in it
					if (nick !== this.nick) {
						let message = {
							from: nick,
							to: channel.getName(),
							message: nick + ' quit. ' + '(' + reason + ')',
							event: true,
							action: false
						}

						channel.removeUser(nick);
						channel.addMessage(message);

						this.emit('messageReceived', this.address, message);
					}
				}
			}
		});

		this.client.addListener('action', (from, to, text, messageObj) => {
			let message = {
				from: from,
				to: to,
				message: text,
				event: false,
				action: true
			}

			for (let key in this.channels) {
				let channel = this.channels[key];

				if (channel.getName() == message.to) {
					//Add the message to the channel object
					channel.addMessage(message);
					this.emit('messageReceived', this.address, message);
				}
			}
		});

		//TODO add rank and not only empty string
		this.client.addListener('nick', (oldNick, newNick, channels, messageObj) => {
			let changedUser = false;

			for (let key in this.channels) {
				let channel = this.channels[key];
				let users = channel.users;

				//Only execute once to prevent multiple message-events
				if (!changedUser) {
					changedUser = true;
					let userToRemove = channel.getUser(oldNick);

					if (userToRemove !== null) {
						channel.removeUser(userToRemove.name);
						channel.addUser({
							name: newNick,
							rank: userToRemove.rank
						});
					} else {

						if (channel.getUser(newNick) !== null) {
							channel.removeUser(channel.getUser(newNick).name);
						}
						channel.addUser({
							name: newNick,
							rank: ''
						});
					}

				}

				for (let key in users) {
					let user = users[key];
					if (user.name === oldNick || user.name === newNick) {
						let message = {
							from: newNick,
							to: channel.getName(),
							message: oldNick + ' is now ' + newNick,
							event: true,
							action: false
						}

						this.emit('messageReceived', this.address, message);

						//Emit when username was updated due to errors
						if (this.nick === oldNick) {
							this.nick = newNick;
							this.emit('usernameChanged', this.address, newNick);
						}
					}
				}
			}
		});

		this.client.addListener('notice', (nick, to, text, message) => {
			//console.log('NOTICE: ', nick, to, text, message);
		});

		this.client.addListener('pm', (nick, text, messageObj) => {
			let message = {
				from: nick,
				to: nick,
				message: text,
				event: false,
				action: false
			}

			this.emit('messageReceived', this.address, message);
		});

		/*
		Listening to errors, otherwise the program will exit on error
		 */
		this.client.addListener('error', function (message) {
			console.log('error: ', message);
		});
	}
}

util.inherits(Client, events);
exports.Client = Client;
