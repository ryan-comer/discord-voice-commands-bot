# Overview
This repo is a framework for a voice command Discord bot.

# Building
This project is built and run using Docker. There are scripts in the repo to build the docker image and run a new container (buildandrundocker.ps1). Look at the top of the script for configuration parameters. The following parameters are available:

|Parameter Name|Description|
|---|---|
|CONTAINER_NAME|The name of the Docker container that is created|
|RECORDINGS_PATH|OPTIONAL: Absolute path to the recordings folder in the repo. This folder holds the {user_id}.wav command files that are processed for commands. If this variable is set, the recordings folder will be mounted to the Docker host|

# Configuration
You need to create a .env file at the root directory of the bot and set the desired values. The .env file holds the configuration values for the bot. The following table describes each value:

|PROPERTY_NAME|Description|Optional?|
|---|---|---|
|BOT_TOKEN|The bot token for the Discord bot. This is used so that the Discord servers knows which bot account this bot is logging in to. You can get this by creating a bot at https://discord.com/developers/applications. | Required

# Running
To run the bot, run the buildandrundocker.ps1 script in the root directory. This will build the docker image and run it in a new container. After the container is running, the bot should log in to the bot account, and listen for chat messages on any of the joined servers

# Voice Commands
After joining a voice channel, the bot will listen for a wake word from any user (each user audio stream is separate). If the wake word is heard on the user's audio stream, the bot will play a beep. After the beep, the bot will listen for a command on that user audio stream. The command audio will be saved to ./recordings/{userId}.wav. After 2 seconds of silence, the command audio will be processed using speech-to-text. The first word of the command denotes the command type (e.g. 'play').