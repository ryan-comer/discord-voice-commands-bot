# Name of the Docker container that is created
$CONTAINER_NAME="voice-commands-bot"

# OPTIONAL
# Path for the recorded command.wav files
# EXAMPLE: "C:\\Users\\UserName\\src\\discord\\voice-commands-bot\\recordings"
$RECORDINGS_PATH = ""

# Build the image
docker build -t voice-commands-bot .

# Run the container
# Check if the RECORDINGS_PATH variable is set
if(($null -ne $RECORDINGS_PATH) -and ($RECORDINGS_PATH -ne "")){
    docker run -d --name $CONTAINER_NAME -v ${RECORDINGS_PATH}:/usr/src/voice-commands-bot/recordings:rw voice-commands-bot
}
else{
    docker run -d --name $CONTAINER_NAME voice-commands-bot
}