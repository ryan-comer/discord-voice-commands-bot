const path = require('path')
const ICommand = require('./ICommand')

const ytdl = require('ytdl-core')
const youtube = require('../youtube')
const tts = require('../tts')

class PlayCommand extends ICommand{
    isStopping
    errorOccured
    songStartTime
    isPlaying

    constructor(options){
        super(options)
    }

    name(){
        return 'play'
    }

    description(){
        return 'Play a song from YouTube. Select the first video based on a search.\n' +
        'Example: \';;play you say run\''
    }

    wakeWordDetected(options){
        if(this.isPlaying){
            this.stopPlaying(options)
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

        youtube.getYoutubeVideoUrl(`${options.commandText} lyrics`)
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
                    .catch(err => {
                        console.error(err)
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

    stopPlaying(options){
        if(this.isPlaying){
            console.log('Stopping song')

            this.stoppingSong = true
            options.player.stopPlaying()

            tts.speak('Stopping song')
            .then(ttsStream => {
                options.player.playStream(ttsStream)
            })
            .catch(err => {
                console.error(err)
            })
        }
    }

    playSong(options){
        // Find the youtube URL
        const {videoUrl, videoName} = options

        let audioStream
        try{
            audioStream = ytdl(videoUrl, { filter: 'audioonly' })
        }catch(error){
            console.error(`Error getting YouTube stream: ${error}`)
            return
        }

        if(options.commandType === 'voice'){
            options.musicChannel.send(`Playing: ${videoName}`)
            tts.speak(`Playing ${videoName}`)
            .then(ttsStream => {
                options.player.playStream(ttsStream)
                .then(() => {
                    this.isPlaying = true
                    options.player.playStream(audioStream)
                    .then(() => {
                        this.isPlaying = false
                    })
                    .catch(err => {
                        console.error(err)
                        this.isPlaying = false
                    })
                })
                .catch(err => {
                    console.error(err)
                })
            })
        }else if(options.commandType === 'text'){
            options.musicChannel.send(`Playing: ${videoName}`)
            this.isPlaying = true
            options.player.playStream(audioStream)
            .then(() => {
                this.isPlaying = false
            })
            .catch(err => {
                console.error(err)
                this.isPlaying = false
            })
        }
    }

}

module.exports = PlayCommand