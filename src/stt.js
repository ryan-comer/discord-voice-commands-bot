const fs = require('fs')

const speech = require('@google-cloud/speech')
const {spawn} = require('child_process')
const SpeechToTextV1 = require('ibm-watson/speech-to-text/v1-generated')

class SpeechToText{
    sttMethod

    constructor(options){
        if(!options.sttMethod){
            console.error('No SPEECH_TO_TEXT method set')
            return
        }
        if(!['LOCAL', 'GOOGLE', 'IBM_WATSON'].includes(options.sttMethod)){
            console.error(`Unrecognized SPEECH_TO_TEXT method: ${options.sttMethod}`)
            return
        }

        this.sttMethod = options.sttMethod
    }

    // Use DeepSpeech speech to text
    speechToTextLocal(audioFilePath){
        return new Promise(async (resolve, reject) => {
            const deepspeech = spawn('deepspeech', [
                '--model',
                'deepspeech-0.9.3-models.pbmm',
                '--audio',
                audioFilePath
            ])

            deepspeech.stdout.on('data', (data) => {
                resolve(data)
            })
        })
    }

    // Use Google speech to text
    speechToTextGoogle(audioFilePath){
        return new Promise(async (resolve, reject) => {
            const client = new speech.SpeechClient()

            const audio = {
                content: fs.readFileSync(audioFilePath).toString('base64')
            }
            const config = {
                encoding: 'LINEAR16',
                sampleRateHertz: 16000,
                languageCode: 'en-US'
            }
            const request = {
                audio: audio,
                config: config
            }

            const [response] = await client.recognize(request)
            const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n')

            resolve(transcription)
        })
    }

    // Use IBM Watson Speech-to-Text
    speechToTextIBMWatson(audioFilePath){
        return new Promise(async (resolve, reject) => {
            // Check for the service URL
            if(!process.env.IBM_WATSON_SERVICE_URL){
                reject('IBM Watson requires a IBM_WATSON_SERVICE_URL in the .env file')
            }

            const speechToText = new SpeechToTextV1({
                serviceUrl: process.env.IBM_WATSON_SERVICE_URL
            })

            const params = {
                contentType: 'audio/wav',
                audio: fs.createReadStream(audioFilePath),
                wordAlternativesThreshold: 0.9
            }

            speechToText.recognize(params)
            .then(speechRecognitionResults => {
                const transcripttion = speechRecognitionResults.result.results
                .map(result => result.alternatives[0].transcript
                    .split(' ').filter(word => word != '%HESITATION').join(' ')    // Filter out %HESITATION
                )
                .join(' ')
                
                resolve(transcripttion)
            })
            .catch(err => {
                reject(err)
            })
        })
    }

    // Get the text from an audio file by using speech to text
    getText(audioFilePath){
        switch(this.sttMethod){
            case 'LOCAL':
                return this.speechToTextLocal(audioFilePath)
            break;
            case 'GOOGLE':
                return this.speechToTextGoogle(audioFilePath)
            break;
            case 'IBM_WATSON':
                return this.speechToTextIBMWatson(audioFilePath)
            break;
            default:
                console.error(`SPEECH_TO_TEXT_METHOD ${this.sttMethod} not recognized`)
            break;
        }
    }
}

module.exports = new SpeechToText({sttMethod: process.env.SPEECH_TO_TEXT_METHOD})