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
    playing

    constructor(voiceConnection){
        this.voiceConnection = voiceConnection;
        this.audioPlayer = createAudioPlayer();
        this.playerSubscription = this.voiceConnection.subscribe(this.audioPlayer)
        
        this.audioPlayer.on('debug', (message) => {
            console.log(message)
        })
        this.audioPlayer.on('error', (error) => {
            console.log("ERROR")
            console.log(error)
        })
    }

    // Play an audio file
    play(audioFile){
        return new Promise(async (resolve, reject) => {
            console.log(`Playing: ${audioFile}`)

            const resource = createAudioResource(createReadStream(audioFile))
            resource.playStream.on('close', () => {
                console.log('Play stream close')
                resolve()
            })
            this.audioPlayer.play(resource)
        })

    }

    playYoutube(url){
        const audioStream = stream(url)
        const thisRef = this
        audioStream.on('close', () => {
            console.log('Song closed')
            thisRef.playing = false
        })
        const audioResource = createAudioResource(audioStream)
        this.audioPlayer.play(audioResource)
        this.playing = true
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