'use strict';

class Channel {
	constructor(name) {
		this.name = name;
		this.users = [];
		this.messages = [];
	}

	addUser(user) {
		// Add it to the collection.
		this.users.push(user);

		// Return this object reference to allow for method chaining.
		return (this);
	}

	getUsers() {
		return this.users;
	}

	removeUser(nick) {
		for (let i = 0; i < this.users.length; i++) {
			let name = this.users[i].name;

			if (nick === name) {
				this.users.splice(i, 1);
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
