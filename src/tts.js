const textToSpeechGoogle = require('@google-cloud/text-to-speech')

const fs = require('fs')
const util = require('util')
const crypto = require('crypto')
const {spawn} = require('child_process')

const client = new textToSpeechGoogle.TextToSpeechClient()

// Class used to generate audio from text
class TextToSpeech{
    ttsMethod

    constructor(options){
        if(!options.ttsMethod){
            console.error('TEXT_TO_SPEECH_METHOD in .env required for TTS to work')
            return
        }
        if(!['LOCAL', 'GOOGLE'].includes(options.ttsMethod)){
            console.error(`Unrecognized TEXT_TO_SPEECH method: ${options.ttsMethod}`)
        }

        this.ttsMethod = options.ttsMethod
    }

    // Return an audio stream from GOOGLE text-to-speech
    async ttsGoogle(text){
        const speechFileName = crypto.randomBytes(20).toString('hex') + '.mp3'
        return new Promise(async (resolve, reject) => {
            // Build the request
            const request = {
                input: {text: text},
                voice: {
                    languageCode: 'en-GB',
                    name: 'en-GB-Wavenet-B',
                    ssmlGender: 'MALE',
                   /*
                    name: `ru-RU-Wavenet-A`,
                    ssmlGender: 'FEMALE',
                    */
                },
                audioConfig: {
                    audioEncoding: 'MP3',
                    volumeGainDb: parseInt(process.env.TEXT_TO_SPEECH_VOLUME_GAIN_DB)
                }
            }

            // Perform the TTS
            const [response] = await client.synthesizeSpeech(request)
            const writeFile = util.promisify(fs.writeFile)
            await writeFile(speechFileName, response.audioContent, 'binary')

            const readStream = fs.createReadStream(speechFileName)
            readStream.on('close', () => {
                fs.unlink(speechFileName, err => {
                    console.error(`Error deleting ${speechFileName}: ${err}`)
                })
            })
            resolve(readStream)
        })
    }

    // Return an audi ostream from a local text-to-speech
    async ttsLocal(text){
        const speechFileName = crypto.randomBytes(20).toString('hex') + '.wav'

        return new Promise((resolve, reject) => {
            const tts = spawn('tts', [
                '--text',
                text,
                '--out_path',
                speechFileName
            ])

            tts.on('exit', (code, signal) => {
                // Try to open the file
                try{
                    const ttsStream = fs.createReadStream(speechFileName)
                    ttsStream.on('close', () => {
                        // Delete the file once the stream is read
                        fs.unlink(speechFileName, err => {
                            console.error(`Error deleting: ${speechFileName}: ${err}`)
                        })
                    })
                    resolve(ttsStream)
                }catch(error){
                    console.error(`Error reading text-to-speech file: ${error}`)
                    reject(error)
                }
            })
        })

    }
    
    // Get an audio stream from the provided text
    async speak(text){
        switch(this.ttsMethod){
            case 'GOOGLE':
                return this.ttsGoogle(text)
            case 'LOCAL':
                return this.ttsLocal(text)
            default:
                console.error(`TEXT_TO_SPEECH_METHOD ${this.ttsMethod} not recognized`)
        }
    }
}

module.exports = new TextToSpeech({ttsMethod: process.env.TEXT_TO_SPEECH_METHOD})