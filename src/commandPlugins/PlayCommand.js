const path = require('path')
const ICommand = require('./ICommand')

const search = require('youtube-search')
const stream = require('youtube-audio-stream')
const {join} = require('path')

const youtube = require('../youtube')

const tts = require('../tts')

class PlayCommand extends ICommand{
    isStopping
    errorOccured
    currentUrl
    songStartTime
    isPlaying

    constructor(){
        super()
    }

    playSong(options){
        // Find the youtube URL
        const {videoUrl, videoName} = options
        console.log(`Playing: ${videoUrl}\twith options: ${options.streamOptions}`)

        let audioStream
        try{
            audioStream = stream(videoUrl, options.streamOptions)
        }catch(error){
            console.error(`Error getting YouTube stream: ${error}`)
            return
        }

        audioStream.on('close', () => {
            this.isPlaying = false
            // Check if the song was manually stopped
            if(this.stoppingSong){
                // Ignore restart attempt
                this.stoppingSong = false
                return
            }

            if(this.errorOccured && videoUrl === this.currentUrl){
                this.errorOccured = false

                // Recover the stream
                const songStopTime = new Date()
                const timeInSongMilli = (songStopTime.getTime() - this.songStartTime.getTime())
                console.log(`Recovering stream for: ${videoUrl} at time: ${timeInSongMilli / 1000} seconds`)
                this.playSong({
                    ...options,
                    streamOptions: {
                        beginning: timeInSongMilli
                    },
                    recovered: true
                })
            }
        })
        audioStream.on('error', () => {
            this.errorOccured = true
        })

        this.currentUrl = videoUrl
        this.songStartTime = new Date()

        if(options.recovered){
            options.player.playStream(audioStream)
        }else{
            options.musicChannel.send(`Playing: ${videoName}`)
            tts.speak(`Playing ${videoName}`)
            .then(ttsStream => {
                options.player.playStream(ttsStream)
                .then(() => {
                    options.player.playStream(audioStream)
                })
            })
        }
        this.isPlaying = true
    }

    wakeWordDetected(options){
        if(this.isPlaying){
            this.stopPlaying(options)
            return false
        }

        return true
    }

    stopPlaying(options){
        if(this.isPlaying){
            console.log('Stopping song')

            this.stoppingSong = true
            options.player.stopPlaying()

            tts.speak('Stopping song')
            .then(ttsStream => {
                options.player.playStream(ttsStream)
            })

            return false
        }

        return true
    }

    command(options){
        if(this.isPlaying){
            this.stopPlaying(options)
        }

        if(!options.player){
            options.messageChannel.send(`Not in a voice channel. Please type ;;join first`)
            return
        }

        youtube.getYoutubeVideoUrl(options.commandText)
        .then(response => {
            this.playSong({
                ...options,
                ...response
            })
        })
        .catch(err => {
            if(err.name === 'NoResultsError'){
                if(options.commandType === 'voice'){
                    tts.speak(`No results found for ${options.commandText}`)
                    .then(ttsStream => {
                        options.player.playStream(ttsStream)
                    })
                }
                if(options.musicChannel){
                    options.musicChannel.send(`No results found for ${options.commandText}`)
                }
            }
        })
    }

    close(options){
        this.isStopping = this.isPlaying = this.errorOccured = false
    }
}

module.exports = PlayCommand