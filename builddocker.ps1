# Name of the Docker container that is created
$CONTAINER_NAME="voice-commands-bot"

# OPTIONAL
# Path for the recorded command.wav files
# EXAMPLE: "C:\\Users\\UserName\\src\\discord\\voice-commands-bot\\recordings"
$RECORDINGS_PATH = ""

# Build the image
docker build -t $CONTAINER_NAME .