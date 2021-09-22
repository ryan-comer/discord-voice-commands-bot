const { Client, Intents, VoiceChannel } = require("discord.js")
const { joinVoiceChannel} = require('@discordjs/voice')
const client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES]})
const Player = require('./player.js')
const Listener = require('./listener.js')
const TextToSpeech = require("./tts.js")
const CommandManager = require('./CommandManager.js')
const PlayCommand = require('./commandPlugins/PlayCommand')
const QuestionCommand = require('./commandPlugins/QuestionCommand')
const {join} = require('path')
const path = require('path')
const {getRedbullScores} = require('./redbull')

const tts = require('./tts')

require('dotenv').config();

let player = null
let listener = null
let voiceConnection = null
let currentChannel = null
let commandManager = new CommandManager()

// Name of the music bot
// Voice commands from this user are ignored
// Bot name is used to facilitate communication from the voice command bot
const musicBotName = 'FredBoat♪♪'

// Name of this bot - ignore voice commands
const voiceBotName = 'Jarvis'

// Handle to the music channel
let musicChannel
let botChannel

const ignoreNames = [
    musicBotName,
    voiceBotName
]

// Add command handlers for command words
function registerCommands(){
    commandManager.addPluginHandle('play', new PlayCommand())
    for(let word of ['who', 'what', 'when', 'where', 'why']){
        commandManager.addPluginHandle(word, new QuestionCommand())
    }
}

// Find the music channel for chat messages
function findMusicChannel(guild){
    guild.channels.fetch()
    .then(channels => {
        for(let [key, value] of channels){
            if(value.name == process.env.MUSIC_CHANNEL_NAME){
                musicChannel = value
                break
            }
        }
    })
}

function findBotChannel(guild){
    guild.channels.fetch()
    .then(channels => {
        for(let [key, value] of channels){
            if(value.name == process.env.BOT_CHANNEL_NAME){
                botChannel = value
                break
            }
        }
    })
}

// Connect to a voice channel
function connectToChannel(channel, id){
    if(channel.id == currentChannel?.id){
        return
    }

    // Leave current channel if in one
    if(voiceConnection != null){
        leaveChannel()
    }

    voiceConnection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: false
    });

    player = new Player({voiceConnection: voiceConnection})
    listener = new Listener({
            voiceConnection: voiceConnection,
            speechToTextMethod : process.env.SPEECH_TO_TEXT_METHOD,
            wakeWorkSensitivity : process.env.WAKE_WORD_SENSITIVITY,
            ibmWatsonServiceUrl: process.env.IBM_WATSON_SERVICE_URL
        })
    currentChannel = channel

    listener.on('wakeWord', (userId) => {
        console.log(`Wake word for: ${userId}`)

        // Tell all the commands the wakeword was said
        if(!commandManager.wakeWordDetected({
            musicChannel: musicChannel,
            player: player
        })){
            // Stop propogation of wakeword
            return
        }

        const user = currentChannel.members.get(userId)
        if(!user){
            console.error(`Can't find user with user ID: ${userId}`)
            return
        }
        tts.speak(`Yes ${user.displayName}`)
        .then(ttsStream => {
            player.playStream(ttsStream)
            .then(() => {
                listener.listenForCommand(userId)
            })
        })
    })

    listener.on('command', (userId, command) => {
        processCommand(command)
    })

    refreshUsers()
}

// Leave the voice channel
// Close the resources
async function leaveChannel(){
    console.log('Leaving channel')

    currentChannel = null

    if(listener != null){
        listener.close()
        listener = null
    }

    if(player != null){
        player.close()
        player = null
    }

    if(voiceConnection != null){
        voiceConnection.destroy()
        voiceConnection = null
    }

    if(commandManager != null){
        commandManager.close()
    }
}

// Refresh the users that are being listened to
function refreshUsers(){
    if(currentChannel == null){
        return
    }

    console.log('Refreshing users')

    listener.close()
    currentChannel.members.forEach(member => {
        if(ignoreNames.includes(member.displayName)){
            // Ignore this user
            return
        }
        if(member.user.bot){
            // Ignore bots
            return
        }
        listener.subscribeToUser(member.id)
    });
}

function playBeep(){
    const path = join(__dirname, '../res/beep.wav')
    player.playFile(path)
}

// Queue up a song in the music player
function processCommand(command){
    musicChannel.send(`Processing Command: ${command}`)

    commandManager.processCommand(command, {
        musicChannel: musicChannel,
        player: player
    })
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Interactions with chat messages
client.on('messageCreate', (message) => {
    if(message.member.user.bot){
        // Igore bots
        return
    }
    switch(message.content){
        case ';;join':
            if(message.member.voice.channel != null){
                if(this.voiceConnection == null){
                    findMusicChannel(message.guild)
                    findBotChannel(message.guild)
                    connectToChannel(message.member.voice.channel, message.author.id)
                }
            }
        break;
        case ';;leave':
            leaveChannel()
        break;
        case ';;test':
            if(player != null){
                player.stopPlaying()
            }
        break;
        case ';;stop':
            if(player != null){
                player.stopPlaying()
            }
        case ';;redbull':
            const playerNames = ['The Diana', 'Jamie Butler']
            getRedbullScores({
                leaderboardIndex: 1,
                playerNames: playerNames
            })
            .then(players => {
                const sendMessage = []
                for(let player of players){
                    sendMessage.push(`${player.username}:\n`)
                    sendMessage.push(`Score: ${player.score}\n`)
                    sendMessage.push(`Place: ${player.position}\n`)
                    sendMessage.push('\n')
                }
                client.channels.fetch(message.channelId)
                .then(channel => {
                    channel.send(sendMessage.join(""))
                })
            })
        break;
    }
});

client.on('voiceStateUpdate', (oldState, newState) => {
    if(currentChannel === null){
        // No connected channel
        return
    }

    refreshUsers()

    // Leave if everyone leaves
    // == 1 to account for the bot itself
    if(currentChannel.members.size === 1){
        leaveChannel()
    }
})

registerCommands()

//client.login(process.env.BOT_TOKEN);
client.login(process.env.BOT_TOKEN_DEV);