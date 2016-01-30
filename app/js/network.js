'use strict';
const irc = require('./client');
const util = require('util');
const events = require('events');

class Network {
	constructor(name) {
		this.name = name;
		this.clients = [];
	}

	/**
	 * Adds a new client to the network and initializes it
	 * @param {string} nick    Nickname for the client
	 * @param {string} address Address of the client
	 * @param {object} options Options for the client
	 */
	addClient(nick, address, options) {
		let defaultOptions = {
			autoConnect: false,
			realName: 'Hypha IRC',
			debug: true,
			autoRejoin: true
		}

		let cleanOptions = Object.assign({}, defaultOptions, options);
		let client = new irc.Client(nick, address, cleanOptions);
		this.clients.push(client);

		this.addListeners(client);
	}

	/**
	 * Get a client by its address
	 * @param  {string} address Address to be matched
	 * @return {client}         Matched client
	 */
	getClient(address) {
		for (let key in this.clients) {
			let selClient = this.clients[key]

			if (selClient.address == address) {
				return selClient;
			}
		}
	}

	/**
	 * Gets all clients
	 * @return {array} Array of clients
	 */
	getAllClients() {
		return this.clients;
	}

	/**
	 * Adds listeners for the client by passing a reference to it
	 * @param {client} client Client to add listeners for
	 */
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

		client.on('usernameChanged', (address, nick) => {
			this.emit('usernameChanged', address, nick);
		})
	}

}

util.inherits(Network, events);
exports.Network = Network;
