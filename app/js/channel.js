'use strict'

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
        return(this);
    }

    addMessage(message) {
        // Add it to the collection.
        this.messages.push(message);

        // Return this object reference to allow for method chaining.
        return(this);
    }

    getMessages() {
        return this.messages;

        // Return this object reference to allow for method chaining.
        return(this);
    }

    getName() {
        return this.name;
    }
}

exports.Channel = Channel
