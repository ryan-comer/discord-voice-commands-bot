
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

module.exports = {
    deleteMessage
}