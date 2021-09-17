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
    playing
    stoppingSong = false    // Used to igonre a single resume attempt when stopping the song
    currentUrl  // Current YouTube URL being played

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
                resolve()
            })
            this.audioPlayer.play(resource)
        })

    }

    // Play a youtube song
    playYoutube(url, opt){
        this.currentUrl = url

        console.log(`Playing: ${url}`)
        const audioStream = stream(url, opt)

        const songStartTime = new Date()    
        let errorOccured = false

        audioStream.on('close', () => {
            console.log('Song closed')
            this.playing = false

            // Check if the song was manually stopped
            if(this.stoppingSong){
                // Ignore restart attempt
                this.stoppingSong = false
                return
            }

            if(errorOccured && url === this.currentUrl){
                errorOccured = false

                // Recover the stream
                const songStopTime = new Date()
                const timeInSongMilli = (songStopTime.getTime() - songStartTime.getTime())
                console.log(`Recovering stream for: ${url} at time: ${timeInSongSec / 1000} seconds`)
                this.playYoutube(url, {
                    beginning: timeInSongMilli
                })
            }
        })
        audioStream.on('error', (err) => {
            console.error(`Error playing: ${url}`)
            console.error(err)
            errorOccured = true
        })

        // Play the audio resource
        const audioResource = createAudioResource(audioStream)
        this.audioPlayer.play(audioResource)
        this.playing = true
        this.songStartTime = new Date()
    }

    stopPlaying(){
        this.stoppingSong = true
        this.audioPlayer.stop()
    }

    close(){
        if(this.playerSubscription != null){
            this.playerSubscription.unsubscribe()
        }
    }
}

module.exports = Player