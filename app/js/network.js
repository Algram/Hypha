'use strict';
const irc = require('./client');
const util = require('util');
const events = require('events');

class Network {
	constructor(name) {
		this.name = name;
		this.clients = [];
	}

	addClient(nick, address, options) {
		//CLEANUP check for multiple adding of same client

		let defaultOptions = {

		}

		let cleanOptions = Object.assign({}, defaultOptions, options);
		let client = new irc.Client(nick, address, cleanOptions);
		this.clients.push(client);

		this.addListeners(client);
	}

	getClient(address) {
		for (let key in this.clients) {
			let selClient = this.clients[key]

			if (selClient.address == address) {
				return selClient;
			}
		}
	}

	addListeners(client) {
		client.on('channelData', (address, channel) => {
			this.emit('channelData', address, channel);
		})

		client.on('messageReceived', (address, message) => {
			this.emit('messageReceived', address, message);

			//A user event happened --> refresh userlist
			if (message.event === true) {
				let channel = client.getChannel(message.to);
				this.emit('userlistChanged', address, channel);
			}
		})
	}

}

util.inherits(Network, events);
exports.Network = Network;
