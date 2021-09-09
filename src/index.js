const { Client, Intents, VoiceChannel } = require("discord.js")
const { joinVoiceChannel} = require('@discordjs/voice')
const client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES]})
const Player = require('./player.js')
const Listener = require('./listener.js')
const {join} = require('path')
const search = require('youtube-search')

require('dotenv').config();

let player
let listener
let voiceConnection
let currentChannel

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

        console.dir(musicChannel)
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

    if(player != null){
        player.voiceConnection.disconnect()
    }

    listener.close()
    listener = null

    player.close()

    player = null
    voiceConnection = null
    currentChannel = null
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
        }
        const songUrl = results[0].link
        const songName = results[0].title
        musicChannel.send(`Playing: ${songName}`)
        player.playYoutube(songUrl)
    })
}

// Queue up a song in the music player
function processCommand(command){
    command = command.toLowerCase()
    const commandArray = command.split(' ')
    const commandWord = commandArray.splice(0, 1)[0]
    const commandText = commandArray.join(' ')
    switch(commandWord){
        case 'play':
            playSong(commandText)
    }
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Interactions with chat messages
client.on('messageCreate', (message) => {
    switch(message.content){
        case ';;join':
            if(message.member.voice.channel != null){
                findMusicChannel(message.guild)
                connectToChannel(message.member.voice.channel, message.author.id)
            }
        break;
        case ';;leave':
            leaveChannel()
        break;
    }
});

client.on('voiceStateUpdate', (oldState, newState) => {
    if(currentChannel != null && currentChannel.id == newState.channel_id){
        return
    }

    refreshUsers()
})

client.login(process.env.BOT_TOKEN);