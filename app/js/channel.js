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

		// Return this object reference to allow for method chaining.
		return (this);
	}

	getUser(name) {
		for (let key in this.users) {
			let user = this.users[key];

			if (user.name === name) {
				return user;
			}
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

		// Return this object reference to allow for method chaining.
		return (this);
	}

	addMessage(message) {
		// Add it to the collection.
		this.messages.push(message);

		// Return this object reference to allow for method chaining.
		return (this);
	}

	getMessages() {
		return this.messages;
	}

	getName() {
		return this.name;
	}
}

exports.Channel = Channel;
