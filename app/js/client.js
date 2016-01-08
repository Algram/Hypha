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
        }

        // Return this object reference to allow for method chaining.
        return(this);
    }

    getChannel(name) {
        for (let key in this.channels) {
            let channel = this.channels[key];

            if (channel.getName() == name) {
                return channel;
            }
        }

        // Return this object reference to allow for method chaining.
        return(this);
    }

    setSelectedChannel(channel) {
        this.selectedChannel = channel;

        // Return this object reference to allow for method chaining.
        return(this);
    }

    getSelectedChannel() {
        return this.selectedChannel;
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

        client.connect(function() {
            for (let key in channels) {
                let channel = channels[key];
                client.join(channel.getName());
            }
        });
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
                        selChannel.addUsers(channelUsers);
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

                channel.addUser(nick);
                channel.addMessage(message);

                //this.emit('messageReceived', this.address, message);
            }
        });

        this.client.addListener('part', (channelName, nick, reason, messageObj) => {
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

            //this.emit('messageReceived', this.address, message);
        });

        //BUGFIX atm get's added to every open channel, even if person
        //wasn't in that
        this.client.addListener('quit', (nick, reason, channels, messageObj) => {
            for (let key in this.channels) {
                let channel = this.channels[key];

                //Add this message to every channel
                let message = {
                    from: nick,
                    to: channel.getName(),
                    message: nick + ' quit. ' + '(' + reason + ')',
                    event: true,
                    action: false
                }

                channel.removeUser(nick);
                channel.addMessage(message);

                //this.emit('messageReceived', this.address, message);
            }
        });

        /*
        Listening to errors, otherwise the program will exit on error
         */
        this.client.addListener('error', function(message) {
            console.log('error: ', message);
        });
    }
}

util.inherits(Client, events);
exports.Client = Client;
