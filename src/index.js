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
const RadioCommand = require('./commandPlugins/RadioCommand')

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
    commandManager.addPluginHandle('radio', new RadioCommand())
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

    // Set up the listener callbacks
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
        commandManager.close({
            musicChannel,
            botChannel
        })
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
    if(botChannel){
        botChannel.send(`Processing Command: ${options.command}`)
    }

    console.log(`Processing command: ${options.command}`)

    commandManager.processCommand({
        ...options,
        musicChannel: musicChannel,
        botChannel: botChannel,
        player: player
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

    await findTextChannels(message.guild)   // Get the text channels the bot interacts with

    switch(message.content.toLowerCase()){
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
        case ';;stop':
            if(player != null){
                player.stopPlaying()
            }
        default:
            if(message.content.startsWith(';;')){
                message.channel.fetch(message.channelId)
                .then(channel => {
                    processCommand({
                        message: message,
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

client.login(process.env.BOT_TOKEN);
//client.login(process.env.BOT_TOKEN_DEV);