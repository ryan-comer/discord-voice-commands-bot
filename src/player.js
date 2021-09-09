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
const { createReadStream, fstat, createWriteStream } = require('fs')
const {Transform, Writable} = require('stream')
const stream = require('youtube-audio-stream')

const { OpusEncoder } = require('@discordjs/opus')
const Lame = require('node-lame').Lame
const encoder = new OpusEncoder(48000, 2)

class OpusEncodingStream extends Transform{
    constructor(options){
        super(options)
    }

    _transform(data, encoding, callback){
        this.push(encoder.encode(data))
        callback()
    }
}

class DiscordOutputStream extends Writable{
    constructor(options, voiceConnection){
        super(options)
        this.voiceConnection = voiceConnection
    }

    _write(chunk, encoding, callback){
        this.voiceConnection.playOpusPacket(chunk)
        callback()
    }
}

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
        this.audioPlayer.stop()

        const resource = createAudioResource(audioFile)

        this.audioPlayer.play(resource);
        return entersState(this.audioPlayer, AudioPlayerStatus.Playing, 5e3);
    }

    playYoutube(url){
        this.audioPlayer.stop()

        const currentMusicStream = stream(url)
        const audioResource = createAudioResource(currentMusicStream)
        this.audioPlayer.play(audioResource)
        return entersState(this.audioPlayer, AudioPlayerStatus.Playing, 5e3);
    }

    close(){
        this.audioPlayer.stop()
        this.playerSubscription.unsubscribe()
    }
}

module.exports = Player