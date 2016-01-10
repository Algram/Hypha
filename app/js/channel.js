'use strict';

class Channel {
	constructor(name) {
		this.name = name;
		this.users = [];
		this.messages = [];
	}

	addUsers(users) {
		// Add it to the collection.
		this.users.push(users);

		// Return this object reference to allow for method chaining.
		return (this);
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

	removeUser(user) {
		let index = this.users.indexOf(user);

		if (index > -1) {
			this.users.splice(index, 1);
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
