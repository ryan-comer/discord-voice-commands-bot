const ICommand = require("./ICommand");
const tts = require('../tts')
const psl = require('psl')

const googleIt = require('google-it')

class QuestionCommand extends ICommand{
    isSpeaking
    speakingStream

    constructor(options){
        super(options)

        this.isSpeaking = false
        this.speakingStream = null
    }

    extractHostname(url) {
        var hostname;
        //find & remove protocol (http, ftp, etc.) and get hostname

        if (url.indexOf("//") > -1) {
            hostname = url.split('/')[2];
        }
        else {
            hostname = url.split('/')[0];
        }

        //find & remove port number
        hostname = hostname.split(':')[0];
        //find & remove "?"
        hostname = hostname.split('?')[0];

        return hostname;
    }

    async googleSearch(searchQuery){
        return new Promise((resolve, reject) => {
            googleIt({'query' : searchQuery})
            .then(results => {
                resolve(results)
            })
            .catch(err => {
                console.error(`Error searching google: ${err}`)
            })
        })
    }

    wakeWordDetected(options){
        if(this.isSpeaking){
            this.speakingStream.destroy()
            return false
        }

        return true
    }

    command(options){
        this.googleSearch(options.commandText)
        .then(results => {
            // Check for results
            if(results.length == 0){
                tts.speak('I don\'t know')
                .then(ttsStream => {
                    options.player.playStream(ttsStream)
                })

                return
            }

            // Get first result
            const hostName = psl.get(this.extractHostname(results[0].link))
            const resultText = results[0].snippet
            //const resultText = results[0].snippet.split('.')[0]
            const text = `According to ${hostName}. ${resultText}`

            if(options.botChannel){
                options.botChannel.send(`**Question:** ${options.command}`)
                options.botChannel.send(`**Answer:** ${text}`)
            }

            if(options.commandType === 'voice'){
                this.isSpeaking = true
                tts.speak(text)
                .then(ttsStream => {
                    this.speakingStream = ttsStream
                    options.player.playStream(ttsStream)
                    .then(() => {
                        this.isSpeaking = false
                    })
                })
            }
        })
    }

    close(options){
        this.isSpeaking = false
        this.speakingStream?.destroy()
        this.speakingStream = null
    }
}

module.exports = QuestionCommand