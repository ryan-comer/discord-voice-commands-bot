const {
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
} = require('@discordjs/voice')
const { createReadStream, fstat, createWriteStream } = require('fs')

class Player {
    voiceConnection
    audioPlayer
    playerSubscription
    isPlaying

    constructor(options){
        this.voiceConnection = options.voiceConnection;
        this.audioPlayer = createAudioPlayer({
            behaviors: {
                maxMissedFrames: process.env.PLAYER_MAX_MISSED_FRAMES
            }
        });
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
        console.log(`Playing: ${audioFile}`)
        return this.playStream(createReadStream(audioFile))
    }

    // Play the audio stream through the voice connection
    playStream(audioStream){
        return new Promise(async (resolve, reject) => {
            // Play the audio resource
            const audioResource = createAudioResource(audioStream)

            // Watch for state changes
            this.audioPlayer.on('stateChange', (oldState, newState) => {
                if(newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle){
                    // Resource has finished playing
                    this.isPlaying = false
                    resolve()
                }
            })

            // Stream error occured
            audioResource.playStream.on('error', err => {
                console.error('Stream closed', err)
                reject(err)
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