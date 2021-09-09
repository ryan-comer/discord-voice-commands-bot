const {
    AudioPlayer,
    AudioResource,
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    entersState,
    VoiceConnection,
    StreamType
} = require('@discordjs/voice')
const { join } = require('path')
const { createReadStream } = require('fs')

class Player {
    voiceConnection
    audioPlayer
    playerSubscription

    constructor(voiceConnection){
        this.voiceConnection = voiceConnection;
        this.audioPlayer = createAudioPlayer();
        this.playerSubscription = this.voiceConnection.subscribe(this.audioPlayer)
    }

    // Play an audio file
    play(audioFile){
        const resource = createAudioResource(audioFile)

        this.audioPlayer.play(resource);
        return entersState(this.audioPlayer, AudioPlayerStatus.Playing, 5e3);
    }

    close(){
        this.playerSubscription.unsubscribe()
    }
}

module.exports = Player