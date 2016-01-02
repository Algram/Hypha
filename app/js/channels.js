let channels = {};

var primaryKey = 0;

var noop = function(){};

exports.addChannel = function(name, callback){
    // Make sure a callback is defined.
    callback = (callback || noop);

    // Create the new channel instance.
    var channel = {
        id: ++primaryKey,
        name: name
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
