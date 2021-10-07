#!/bin/bash

# Name of the Docker container that is created
CONTAINER_NAME="voice-commands-bot"

# OPTIONAL
# Path for the recorded command.wav files
# EXAMPLE: "C:\\Users\\UserName\\src\\discord\\voice-commands-bot\\recordings"
RECORDINGS_PATH=""

# Build the image
docker build -t $CONTAINER_NAME .

# Run the container
# Check if the RECORDINGS_PATH variable is set
if [ -z "$RECORDINGS_PATH" ]
then
    echo "\n\nTEST\n\n"
    docker run -d --name $CONTAINER_NAME $CONTAINER_NAME
else
    echo "\n\nTEST2\n\n"
    docker run -d --name $CONTAINER_NAME -v ${RECORDINGS_PATH}:/usr/src/voice-commands-bot/recordings:rw $CONTAINER_NAME
fi