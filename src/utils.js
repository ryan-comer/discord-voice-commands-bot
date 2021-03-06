// Helper function to check for messages before deleting
function deleteMessage(message){
    if(message == null){
        return
    }

    // Don't delete DM messages from the user
    if(!message.author.bot && message.channel.type === 'DM'){
        return
    }

    message.channel.messages.fetch(message.id)
    .then(messageCheck => {
        if(!(messageCheck?.deleted)){
            try{
                messageCheck.delete()
            }
            catch(err){
                console.error(err)
            }
        }
    })
    .catch(err => {
        console.error(`Error deleting message ${message.id}:\t${err}`)
    })
}

// Helper function to send a channel message
// Return a list of message objects (in case of splitting on 2000 character limit)
async function sendMessage(options){
    const messages = []
    let i, j, temporary, chunk=2000
    for(i = 0, j = options.message.length; i < j; i += chunk){
        temporary = options.message.slice(i, i+chunk)
        const message = await options.channel.send(temporary)
        messages.push(message)
    }

    return messages
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

// Shuffle an array
function shuffle(array) {
  let currentIndex = array.length,  randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

module.exports = {
    deleteMessage,
    sendMessage,
    getChannelFromClient,
    shuffle
}