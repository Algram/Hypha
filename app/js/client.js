'use strict';
const channel = require('./channel');
const irc = require('irc');
const util = require('util');
const events = require('events');

class Client {
	constructor(nick, address) {
		this.nick = nick;
		this.address = address;
		this.channels = [];
		this.selectedChannel = '';

		this.client = new irc.Client(address, nick, {
			autoConnect: false,
			realName: 'irclean_wip',
			debug: true,
			autoRejoin: true
		});

		this.addListeners();
	}

	addChannel(name) {
		let exists = false;
		for (let key in this.channels) {
			let selChannel = this.channels[key];

			if (selChannel.getName() === name) {
				exists = true;
			}
		}

		if (!exists) {
			//Create a new channel object
			let ircchannel = new channel.Channel(name);

			// Add it to the collection.
			this.channels.push(ircchannel);
			this.join(name);
		}

		// Return this object reference to allow for method chaining.
		return (this);
	}

	removeChannel(name) {
		for (let key in this.channels) {
			let selChannel = this.channels[key];

			if (selChannel.getName() === name) {
				this.channels.splice(key, 1);
				this.client.part(name);
			}
		}

		// Return this object reference to allow for method chaining.
		return (this);
	}

	getChannel(name) {
		for (let key in this.channels) {
			let channel = this.channels[key];

			if (channel.getName() == name) {
				return channel;
			}
		}

		// Return this object reference to allow for method chaining.
		return (this);
	}

	setSelectedChannel(channel) {
		this.selectedChannel = channel;

		// Return this object reference to allow for method chaining.
		return (this);
	}

	getSelectedChannel() {
		return this.selectedChannel;
	}

	changeNick(newNick) {
		this.client.send('NICK', newNick);
		this.nick = newNick;
	}

	getNick(name) {
		return this.nick;
	}

	say(channel, message) {
		this.client.say(channel, message);
	}

	connect() {
		let client = this.client;
		let channels = this.channels;

		client.connect(function () {
			for (let key in channels) {
				let channel = channels[key];
				client.join(channel.getName());
			}
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

		//BUGFIX atm get's added to every open channel, even if person
		//wasn't in that
		this.client.addListener('quit', (nick, reason, channels, messageObj) => {
			for (let key in this.channels) {
				let channel = this.channels[key];

				if (channel.users.indexOf(nick) > -1) {
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

		//TODO add rank and not only empty string
		this.client.addListener('nick', (oldNick, newNick, channels, messageObj) => {
			for (let key in this.channels) {
				let channel = this.channels[key];
				let users = channel.users;

				channel.removeUser(oldNick);
				channel.addUser({name: newNick, rank: ''});

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
					}
				}
			}
		});

		this.client.addListener('notice', function (nick, to, text, message) {
			//console.log('NOTICE: ', nick, to, text, message);
		});

		this.client.addListener('pm', function (nick, text, message) {
			console.log('PRIVATEM: ', nick, text, message);
			this.emit('pmReceived', this.address, nick, text);
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
