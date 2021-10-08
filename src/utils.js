// Helper function to check for messages before deleting
function deleteMessage(message){
    message.channel.messages.fetch(message.id)
    .then(messageCheck => {
        if(!(messageCheck?.deleted)){
            messageCheck.delete()
        }
    })
    .catch(err => {
        console.error(`Error deleting message ${message.id}:\t${err}`)
    })
}

// Helper function to send a channel message
// Return a list of message objects (in case of splitting on 2000 character limit)
function sendMessage(options){
    return options.channel.send(options.message.slice(0, 2000))
}

// Helper function to get a channel by name from a client
function getChannelFromClient(options){
    return new Promise((resolve, reject) => {
        options.client.guilds.fetch()
        .then(guilds => {
            if(guilds.length == 0){
                console.error('Client not in a guild')
                reject
            }

            const guild = guilds.entries().next().value[1]

            // Fetch again to get channels
            options.client.guilds.fetch(guild.id)
            .then(guild2 => {
                guild2.channels.fetch()
                .then(channels => {
                    for(let [key, value] of channels){
                        if(value.name == options.channelName){
                            return resolve(value)
                        }
                    }

                    resolve(null)
                })
            })
        })
    })
}

module.exports = {
    deleteMessage,
    sendMessage,
    getChannelFromClient
}