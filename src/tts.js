const textToSpeechGoogle = require('@google-cloud/text-to-speech')

const fs = require('fs')
const { resolve } = require('path')
const util = require('util')

require('dotenv').config();

const client = new textToSpeechGoogle.TextToSpeechClient()

// Class used to generate audio from text
class TextToSpeech{
    ttsMethod

    constructor(options){
        if(!options.ttsMethod){
            console.error('TEXT_TO_SPEECH_METHOD in .env required for TTS to work')
            return
        }

        this.ttsMethod = options.ttsMethod
    }

    // Return an audio stream from GOOGLE tts
    async ttsGoogle(text){
        const speechFileName = 'google_tts.mp3'
        return new Promise(async (resolve, reject) => {
            // Build the request
            const request = {
                input: {text: text},
                voice: {
                    languageCode: 'en-GB',
                    name: 'en-GB-Wavenet-B',
                    ssmlGender: 'MALE'
                },
                audioConfig: {audioEncoding: 'MP3'}
            }

            // Perform the TTS
            const [response] = await client.synthesizeSpeech(request)
            const writeFile = util.promisify(fs.writeFile)
            await writeFile(speechFileName, response.audioContent, 'binary')

            resolve(fs.createReadStream(speechFileName))
        })
    }
    
    // Get an audio stream from the provided text
    async speak(text){
        switch(this.ttsMethod){
            case 'GOOGLE':
                return this.ttsGoogle(text)
        }
    }
}

module.exports = new TextToSpeech({ttsMethod: process.env.TEXT_TO_SPEECH_METHOD})