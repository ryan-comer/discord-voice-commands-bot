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

const {PlayCommand} = require('./commandPlugins/PlayCommand')

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
    isPlaying

    constructor(voiceConnection){
        this.voiceConnection = voiceConnection;
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