require('dotenv-defaults').config()

const { Client, Intents, VoiceChannel } = require("discord.js")
const { joinVoiceChannel} = require('@discordjs/voice')
const client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES]})
const Player = require('./player.js')
const Listener = require('./listener.js')
const TextToSpeech = require("./tts.js")
const CommandManager = require('./CommandManager.js')
const PlayCommand = require('./commandPlugins/PlayCommand')
const QuestionCommand = require('./commandPlugins/QuestionCommand')
const RedbullCommand = require("./commandPlugins/RedbullCommand")
const {join} = require('path')
const path = require('path')
const {getRedbullScores} = require('./redbull')

const tts = require('./tts')

let player = null
let listener = null
let voiceConnection = null
let currentChannel = null
let commandManager = new CommandManager()

// Handle to the music channel
let musicChannel
let botChannel

// Add command handlers for command words
function registerCommands(){
    commandManager.addPluginHandle('play', new PlayCommand())
    for(let word of ['who', 'what', 'when', 'where', 'why', 'how', 'do', 'is', 'was', 'will', 'would', 'can', 'could', 'did', 'should', 'whose', 'which', 'whom', 'are']){
        commandManager.addPluginHandle(word, new QuestionCommand())
    }
    commandManager.addPluginHandle('redbull', new RedbullCommand())
}


// Find the music channel for chat messages
async function findTextChannels(guild){
    return new Promise((resolve, reject) => {
        guild.channels.fetch()
        .then(channels => {
            for(let [key, value] of channels){
                if(value.name == process.env.MUSIC_CHANNEL_NAME){
                    musicChannel = value
                }
                if(value.name == process.env.BOT_CHANNEL_NAME){
                    botChannel = value
                }
            }
        })
        resolve()
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
    listener = new Listener({voiceConnection: voiceConnection})
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
        processCommand({
            command,
            userId,
            commandType: 'voice'
        })
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
        if(member.user.bot){
            // Ignore bots
            return
        }
        listener.subscribeToUser(member.id)
    });
}

// Process a command from a user
function processCommand(options){
    botChannel.send(`Processing Command: ${options.command}`)

    commandManager.processCommand({
        ...options,
        musicChannel: musicChannel,
        botChannel: botChannel,
        player: player
    })
}

// Get the redbull leaderboard scores and print to channel
function redbull(message){
    const playerNames = ['The Diana', 'Jamie Butler']
    getRedbullScores({
        leaderboardIndex: 1,
        playerNames: playerNames
    })
    .then(response => {
        const sendMessage = []
        sendMessage.push('**Top 3 Players:**\n')
        for(let player of response.topThree){
            sendMessage.push(`${player.username}: ${player.score}\n`)
        }
        sendMessage.push('\n')
        sendMessage.push('**Our Players**: \n')

        for(let player of response.returnPlayers){
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
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Interactions with chat messages
client.on('messageCreate', async (message) => {
    if(message.member.user.bot){
        // Igore bots
        return
    }

    await findTextChannels(message.guild)

    switch(message.content){
        case ';;join':
            if(message.member.voice.channel != null){
                if(this.voiceConnection == null){
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
        default:
            if(message.content.startsWith(';;')){
                message.channel.fetch(message.channelId)
                .then(channel => {
                    processCommand({
                        command: message.content.substr(2),
                        userId: message.member.id,
                        messageChannel: channel,
                        commandType: 'text'
                    })
                })
            }
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