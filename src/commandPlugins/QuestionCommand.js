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

    name(){
        return 'question'
    }

    description(){
        return 'Searches Google for the answer to a question and responds with a summary. Start the command with a \'question\' word.\n' +
        'Possible question words are (who, what, when, where, why, how, do, is, was, will, would, can, could, did, should, whose, which, whom, are)\n' +
        'Example: \';;who is the richest person in the world\''
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
                if(options.player){
                    tts.speak('I don\'t know')
                    .then(ttsStream => {
                        options.player.playStream(ttsStream)
                    })
                }else{
                    options.messageChannel.send('I don\'t know')
                }

                return
            }

            // Get first result
            const hostName = psl.get(this.extractHostname(results[0].link))
            const resultText = results[0].snippet
            //const resultText = results[0].snippet.split('.')[0]
            const text = `According to ${hostName}. ${resultText}`

            if(options.messageChannel){
                options.messageChannel.send(`**Question:** ${options.command}`)
                options.messageChannel.send(`**Answer:** ${text}`)
            }else if(options.botChannel){
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