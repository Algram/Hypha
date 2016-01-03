'use strict'

let channels = {};
let selectedChannel;

var primaryKey = 0;

var noop = function(){};

exports.addChannel = function(name, username, users, callback) {
    // Make sure a callback is defined.
    callback = (callback || noop);

    // Create the new channel instance.
    var channel = {
        id: ++primaryKey,
        name: name,
        username: username,
        users: users,
        messages: []
    };

    // Add it to the collection.
    channels[channel.id] = channel;

    // Pass the channel to the callback (the calling context).
    callback(channel);

    // Return this object reference to allow for method chaining.
    return(this);
};

exports.getAll = function(callback){
    // Make sure a callback is defined.
    callback = (callback || noop);

    // Create a holder for our ordered collection.
    var orderedChannels = [];

    // Loop over the primary keys to build up the collection
    // of ordered channels.
    for (var i = 1; i <= primaryKey; i++){

        // Check to see if a channel exists at this key.
        if (channels[i]){

            // Add this channel to the result in order.
            orderedChannels.push(channels[i]);

        }
    }

    // Pass the collection to the callback (the calling context).
    callback( orderedChannels );

    // Return this object reference to allow for method chaining.
    return(this);
};

exports.setSelectedChannel = function(name, callback) {
    // Make sure a callback is defined.
    callback = (callback || noop);

    // Create the new channel instance.
    for (let key in channels) {
        let channel = channels[key];

        if (channel.name == name) {
            selectedChannel = channel;
        }
    }

    // Pass the channel to the callback (the calling context).
    callback(selectedChannel);

    // Return this object reference to allow for method chaining.
    return(this);
};

exports.getSelectedChannel = function(callback) {
    // Make sure a callback is defined.
    callback = (callback || noop);

    // Pass the channel to the callback (the calling context).
    callback(selectedChannel);

    // Return this object reference to allow for method chaining.
    return(this);
};

exports.addMessageToChannel = function(name, message, callback) {
    // Make sure a callback is defined.
    callback = (callback || noop);

    // Create the new channel instance.
    for (let key in channels) {
        let channel = channels[key];

        if (channel.name == name) {
            
            channel.messages.push(message);

            // Pass the channel to the callback (the calling context).
            callback(channel);
        }
    }

    // Return this object reference to allow for method chaining.
    return(this);
};

exports.getMessagesOfChannel = function(name, callback) {
    // Make sure a callback is defined.
    callback = (callback || noop);

    // Create the new channel instance.
    for (let key in channels) {
        let channel = channels[key];

        if (channel.name == name) {

            // Pass the channel to the callback (the calling context).
            callback(channel.messages);
        }
    }

    // Return this object reference to allow for method chaining.
    return(this);
};
