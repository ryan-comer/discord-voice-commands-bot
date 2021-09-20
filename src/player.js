const {
    createAudioPlayer,
    createAudioResource,
} = require('@discordjs/voice')
const { createReadStream, fstat, createWriteStream } = require('fs')

class Player {
    voiceConnection
    audioPlayer
    playerSubscription
    isPlaying

    constructor(options){
        this.voiceConnection = options.voiceConnection;
        this.audioPlayer = createAudioPlayer();
        this.playerSubscription = this.voiceConnection.subscribe(this.audioPlayer)
        
        this.audioPlayer.on('debug', (message) => {
            console.log(message)
        })
        this.audioPlayer.on('error', (error) => {
            console.error(error)
        })
    }

    // Play an audio file
    playFile(audioFile){
        return new Promise(async (resolve, reject) => {
            console.log(`Playing: ${audioFile}`)

            const resource = createAudioResource(createReadStream(audioFile))
            resource.playStream.on('close', () => {
                this.isPlaying = false
                resolve()
            })
            this.audioPlayer.play(resource)
            this.isPlaying = true
        })

    }

    // Play the audio stream through the voice connection
    playStream(audioStream){
        return new Promise(async (resolve, reject) => {
            // Play the audio resource
            const audioResource = createAudioResource(audioStream)
            audioResource.playStream.on('close', () => {
                this.isPlaying = false
                resolve()
            })
            this.audioPlayer.play(audioResource)
            this.isPlaying = true
        })
    }

    stopPlaying(){
        this.audioPlayer.stop()
    }

    close(){
        if(this.playerSubscription != null){
            this.playerSubscription.unsubscribe()
        }
    }
}

module.exports = Player