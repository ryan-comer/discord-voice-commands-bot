const path = require('path')
const ICommand = require('./ICommand')

const search = require('youtube-search')
const stream = require('youtube-audio-stream')
const {join} = require('path')

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

    // Get the YouTube URL from the query
    getYoutubeUrl(songQuery){
        return new Promise(async (resolve, reject) => {
            const opts = {
                maxResults: 5,
                key: require(path.join(__dirname, '../../keys/youtube_v3_api_key.json')).key
            }
            search(songQuery, opts, (err, results) => {
                if(err){
                    console.error(err)
                    resolve(null)
                }
                if(results.length == 0){
                    resolve(null)
                }
                for(let result of results){
                    if(result.kind !== 'youtube#video'){
                        continue
                    }

                    resolve({
                        songUrl: result.link,
                        songName: result.title
                    })
                }

                // No results found
                resolve(null)
            })
        })
    }

    playSong(options){
        // Find the youtube URL
        const {songUrl, songName} = options
        const audioStream = stream(songUrl, options.streamOptions)
        audioStream.on('close', () => {
            this.isPlaying = false
            // Check if the song was manually stopped
            if(this.stoppingSong){
                // Ignore restart attempt
                this.stoppingSong = false
                return
            }

            if(this.errorOccured && songUrl === this.currentUrl){
                this.errorOccured = false

                // Recover the stream
                const songStopTime = new Date()
                const timeInSongMilli = (songStopTime.getTime() - this.songStartTime.getTime())
                console.log(`Recovering stream for: ${songUrl} at time: ${timeInSongMilli / 1000} seconds`)
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

        this.currentUrl = songUrl
        this.songStartTime = new Date()

        if(options.recovered){
            options.player.playStream(audioStream)
        }else{
            options.musicChannel.send(`Playing: ${songName}`)
            tts.speak(`Playing ${songName}`)
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
        if(!options.player){
            options.messageChannel.send(`Not in a voice channel. Please type ;;join first`)
            return
        }

        this.getYoutubeUrl(options.commandText)
        .then(results => {
            if(!results){
                if(options.musicChannel){
                    options.musicChannel.send(`No results for: ${options.commandText}`)
                }
                return
            }

            this.playSong({
                ...options,
                ...results
            })
        })
    }

    close(options){
        this.isStopping = this.isPlaying = this.errorOccured = false
    }
}

module.exports = PlayCommand