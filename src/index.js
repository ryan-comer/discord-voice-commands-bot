const { Client, Intents, VoiceChannel } = require("discord.js")
const { joinVoiceChannel} = require('@discordjs/voice')
const client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES]})
const Player = require('./player.js')
const Listener = require('./listener.js')
const {join} = require('path')
const search = require('youtube-search')
const path = require('path')

require('dotenv').config();

let player = null
let listener = null
let voiceConnection = null
let currentChannel = null

// Name of the music bot
// Voice commands from this user are ignored
// Bot name is used to facilitate communication from the voice command bot
const musicBotName = 'FredBoat♪♪'

// Name of this bot - ignore voice commands
const voiceBotName = 'Jarvis'

// Name of the music channel for music commands
const musicChannelName = 'music'
// Handle to the music channel
let musicChannel

const ignoreNames = [
    musicBotName,
    voiceBotName
]

// Find the music channel for chat messages
function findMusicChannel(guild){
    guild.channels.fetch()
    .then(channels => {
        for(let [key, value] of channels){
            if(value.name == musicChannelName){
                musicChannel = value
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

    player = new Player(voiceConnection)
    listener = new Listener(voiceConnection)
    currentChannel = channel

    listener.on('wakeWord', (userId) => {
        console.log(`Wake word for: ${userId}`)
        if(player.playing){
            console.log('Stopping song')
            player.play(join(__dirname, '../res/stopping_song.wav'))
            return
        }

        listener.listenForCommand(userId)
        playBeep()
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
    player.play(path)
}

function playSong(songQuery){
    // Find the youtube URL
    const opts = {
        maxResults: 5,
        key: require('../keys/youtube_v3_api_key.json').key
    }
    search(songQuery, opts, (err, results) => {
        if(err) return console.log(err)
        if(results.length == 0){
            musicChannel.send(`No results for: ${songQuery}`)
            return
        }
        for(let result of results){
            if(result.kind !== 'youtube#video'){
                continue
            }

            const songUrl = result.link
            const songName = result.title
            musicChannel.send(`Playing: ${songName}`)
            player.playYoutube(songUrl)
            return
        }

        // No results found
        musicChannel.send(`No results for: ${songQuery}`)
    })
}

// Queue up a song in the music player
function processCommand(command){
    musicChannel.send(`Processing Command: ${command}`)
    command = command.toLowerCase()
    const commandArray = command.split(' ')
    const commandWord = commandArray.splice(0, 1)[0]
    const commandText = commandArray.join(' ')
    switch(commandWord){
        case 'play':
            player.play(path.join(__dirname, '../res/playing_song.wav'))
            .then(() => playSong(commandText))
            break
        default:
            player.play(path.join(__dirname, '../res/command_not_recognized.wav'))
            break
    }
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
                    connectToChannel(message.member.voice.channel, message.author.id)
                }
            }
        break;
        case ';;leave':
            leaveChannel()
        break;
        case ';;test':
            if(player != null){
                player.play(join(__dirname, '../res/stopping_song.wav'))
            }
        break;
        case ';;stop':
            if(player != null){
                player.stopPlaying()
            }
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

client.login(process.env.BOT_TOKEN);