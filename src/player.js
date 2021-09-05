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
    voiceConnection;
    audioPlayer;

    constructor(voiceConnection){
        this.voiceConnection = voiceConnection;
        this.audioPlayer = createAudioPlayer();
        this.voiceConnection.subscribe(this.audioPlayer)
    }

    // Play an audio file
    play(audioFile){
        const resource = createAudioResource(join(__dirname, '../res/' + audioFile))
        console.log(join(__dirname, '../res/' + audioFile))

        this.audioPlayer.play(resource);
        return entersState(this.audioPlayer, AudioPlayerStatus.Playing, 5e3);
    }
}

module.exports = Player