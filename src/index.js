const { Client, Intents, VoiceChannel } = require("discord.js")
const { joinVoiceChannel} = require('@discordjs/voice')
const client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES]})
const Player = require('./player.js')
const Listener = require('./listener.js')

require('dotenv').config();

let player
let listener
let voiceConnection

// Connect to a voice channel
async function connectToChannel(channel, id){
    voiceConnection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: false
    });

    player = new Player(voiceConnection)
    listener = new Listener(voiceConnection)
    listener.startListening()
    listener.subscribeToUser(id)
    listener.on('wakeWord', (userId) => {
        playBeep()
    })
}

async function leaveChannel(){
    if(player != null){
        player.voiceConnection.disconnect()
    }

    player = null
    listener = null
    voiceConnection = null
}

async function playBeep(){
    player.play('beep.wav');
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Interactions with chat messages
client.on('messageCreate', (message) => {
    switch(message.content){
        case ';;join':
            if(message.member.voice.channel != null){
                connectToChannel(message.member.voice.channel, message.author.id)
            }
        break;
        case ';;leave':
            leaveChannel()
        break;
        case ';;test':
            playBeep()
    }
});

client.login(process.env.BOT_TOKEN);