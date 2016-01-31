'use strict';

class Channel {
	constructor(name, mode) {
		this.name = name;
		this.users = [];
		this.messages = [];
		this.mode = mode || 'default';
	}

	addUser(user) {
		let exists = false;

		for (let key in this.users) {
			let name = this.users[key].name;

			if (user.name === name) {
				exists = true;
			}
		}

		if (!exists) {
			// Add it to the collection.
			this.users.push(user);
		}
	}

	getUser(name) {
		let exists = false;
		for (let key in this.users) {
			let user = this.users[key];

			if (user.name === name) {
				exists = true;
				return user;
			}
		}

		if (!exists) {
			return null;
		}
	}

	getUsers() {
		return this.users;
	}

	removeUser(nick) {
		for (let key in this.users) {
			let name = this.users[key].name;

			if (nick === name) {
				this.users.splice(key, 1);
			}
		}
	}

	addMessage(message) {
		// Add it to the collection.
		this.messages.push(message);
	}

	getMessages() {
		return this.messages;
	}

	getName() {
		return this.name;
	}
}

exports.Channel = Channel;
