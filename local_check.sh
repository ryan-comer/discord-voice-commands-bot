#!/bin/bash

# Check for LOCAL text-to-speech
if grep -Fq "TEXT_TO_SPEECH_METHOD=LOCAL" .env
then
    echo "Local text-to-speech found - installing local dependencies"
    pip install TTS
    pip install --upgrade numpy
    tts --text "test"
fi

# Check for LOCAL speech-to-text
if grep -Fq "SPEECH_TO_TEXT_METHOD=LOCAL" .env
then
    echo "Local speech-to-text found - installing local dependencies"
    pip install deepspeech
    pip install --upgrade deepspeech

    # Get the Deepspeech model
    wget https://github.com/mozilla/DeepSpeech/releases/download/v0.9.3/deepspeech-0.9.3-models.pbmm
fi