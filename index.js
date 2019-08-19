var midi = require('midi');
var OBSWebSocket = require('obs-websocket-js');
const config = require('./config.json');
const input = new midi.Input();
const output = new midi.Output();
var mpcin, mpcout;
for (let i = 0; i < input.getPortCount(); i++) {
    if (input.getPortName(i).toUpperCase().includes(config.device.toUpperCase())) {
        mpcin = i;
    }
}
for (let i = 0; i < output.getPortCount(); i++) {
    if (output.getPortName(i).toUpperCase().includes(config.device.toUpperCase())) {
        mpcout = i;
    }
}
output.openPort(mpcout);
input.openPort(mpcin);
var status = "free";
var order = [];
for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
        var i = 7 - y;
        order.push(i * 8 + x)
    }
}
var onPadScenes = []
var desktopMuted = false;
var micMuted = false;

const obs = new OBSWebSocket();
(async () => {
    await obs.connect(config.password == '' ? {
        address: config.host
    } : {
        address: config.host,
        password: config.password
    });
    console.log(`Successfully connected`);
    var scenes = await obs.send('GetSceneList');
    var currentScene = await obs.send('GetCurrentScene');
    scenes.scenes.forEach(s => {
        onPadScenes[order[scenes.scenes.indexOf(s)]] = s.name
    })
    newScene(currentScene.name)
    output.sendMessage([144, 87, 1])
    output.sendMessage([144, 88, 1])
})()

// Switch current scene light function
function newScene(name) {
    for (let i = 0; i < 64; i++) {
        if (onPadScenes[i] != undefined) {
            if (onPadScenes[i] == name) {
                output.sendMessage([144, i, 1])
            } else {
                output.sendMessage([144, i, 5])
            }
        } else {
            output.sendMessage([144, i, 0])
        }
    }
}

// Switch current scene light
obs.on('SwitchScenes', c => {
    newScene(c["scene-name"])
})

// Mute light updater
obs.on('SourceMuteStateChanged', data => {
    if (data.sourceName == config.DesktopChannel) {
        desktopMuted = data.muted
        output.sendMessage([144, 64, data.muted ? 1 : 0])
    }
    if (data.sourceName == config.MicChannel) {
        micMuted = data.muted
        output.sendMessage([144, 65, data.muted ? 1 : 0])
    }
})

// Error catching with obs-websocket-js
obs.on('error', err => {
    console.error('socket error:', err);
});

input.on('message', (d, m) => {
    // Audio Sliders
    if (m[1] == 48) {
        obs.send('SetVolume', {
            'source': config.DesktopChannel,
            'volume': m[2] / 127
        })
    }
    if (m[1] == 49) {
        obs.send('SetVolume', {
            'source': config.MicChannel,
            'volume': m[2] / 127
        })
    }

    // Scene switching
    if (order.includes(m[1]) && m[0] == 144) {
        output.sendMessage([144, m[1], 3])
        if (onPadScenes[m[1]] != undefined) {
            obs.send('SetCurrentScene', {
                'scene-name': onPadScenes[m[1]]
            })
        } else {
            output.sendMessage([144, m[1], 4])
            setTimeout(() => {
                output.sendMessage([144, m[1], 0])
            }, 1500);
        }
    }

    // Mute unmute
    if (m[1] == 64 && m[0] == 144) {
        obs.send('SetMute', {
            'source': config.DesktopChannel,
            'mute': !desktopMuted
        })
    }
    if (m[1] == 65 && m[0] == 144) {
        obs.send('SetMute', {
            'source': config.MicChannel,
            'mute': !micMuted
        })
    }

    // Record Stream Buttons
    if (m[1] == 87 && m[0] == 144) {
        if (status == "free") {
            obs.send('StartStreaming')
        }
        if (status == "streaming") {
            obs.send('StopStreaming')
        }
    }
    if (m[1] == 88 && m[0] == 144) {
        if (status == "free") {
            obs.send('StartRecording')
        }
        if (status == "recording") {
            obs.send('StopRecording')
        }
    }
});

// Stream/record start/stop events
obs.on('StreamStarting', () => {
    status = "Sbusy"
    output.sendMessage([144, 87, 0])
})
obs.on('StreamStarted', () => {
    status = "streaming"
    output.sendMessage([144, 87, 2])
})
obs.on('StreamStopping', () => {
    status = "Sbusy"
    output.sendMessage([144, 87, 0])
})
obs.on('StreamStopped', () => {
    status = "free"
    output.sendMessage([144, 87, 1])
})
obs.on('RecordingStarting', () => {
    status = "Rbusy"
    output.sendMessage([144, 88, 0])
})
obs.on('RecordingStarted', () => {
    status = "recording"
    output.sendMessage([144, 88, 2])
})
obs.on('RecordingStopping', () => {
    status = "Rbusy"
    output.sendMessage([144, 88, 0])
})
obs.on('RecordingStopped', () => {
    status = "free"
    output.sendMessage([144, 88, 1])
})

process.on('SIGINT', () => {
    console.log(`Exiting...`)
    for (let i = 0; i < 100; i++) {
        output.sendMessage([144, i, 0])
    }
    output.closePort();
    input.closePort();
    process.exit(0);
})