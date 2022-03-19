const tts = require("../tts");
const ICommand = require("./ICommand");

// Remove the user from the voice channel
class ByeCommand extends ICommand {
    constructor(options){
        super(options)
    }

    name(){
        return 'bye'
    }

    description(){
        return 'Remove the user from their voice channel' +
        'Example: \';;bye\''
    }

    command(options){
        // Must be voice
        if(options.commandType !== 'voice'){
            return
        }

        // TTS for goodbye
        tts.speak(`Goodbye ${options.member.displayName}`)
        .then(ttsStream => {
            options.player.playStream(ttsStream)
            .then(() => {
                // Disconnect the user
                options.member.voice.disconnect()
            })
        })
        .catch(err => {
            console.error(err)
        })
    }

    wakeWordDetected(options){
        return true
    }

    close(options){

    }
}

module.exports = ByeCommand