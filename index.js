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
var Sstatus = "free";
var Rstatus = "free";
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
                output.sendMessage([144, i, config.activeSceneColor])
            } else {
                output.sendMessage([144, i, getColor(onPadScenes[i])])
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
    if (m[1] == 48 && m[0] == 176) {
        obs.send('SetVolume', {
            'source': config.DesktopChannel,
            'volume': m[2] / 127
        })
    }
    if (m[1] == 49 && m[0] == 176) {
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
        if (Sstatus == "free") {
            obs.send('StartStreaming')
        }
        if (Sstatus == "streaming") {
            obs.send('StopStreaming')
        }
    }
    if (m[1] == 88 && m[0] == 144) {
        if (Rstatus == "free") {
            obs.send('StartRecording')
        }
        if (Rstatus == "recording") {
            obs.send('StopRecording')
        }
    }
});

// Stream/record start/stop events
obs.on('StreamStarting', () => {
    Sstatus = "busy"
    output.sendMessage([144, 87, 0])
})
obs.on('StreamStarted', () => {
    Sstatus = "streaming"
    output.sendMessage([144, 87, 2])
})
obs.on('StreamStopping', () => {
    Sstatus = "busy"
    output.sendMessage([144, 87, 0])
})
obs.on('StreamStopped', () => {
    Sstatus = "free"
    output.sendMessage([144, 87, 1])
})
obs.on('RecordingStarting', () => {
    Rstatus = "busy"
    output.sendMessage([144, 88, 0])
})
obs.on('RecordingStarted', () => {
    Rstatus = "recording"
    output.sendMessage([144, 88, 2])
})
obs.on('RecordingStopping', () => {
    Rstatus = "busy"
    output.sendMessage([144, 88, 0])
})
obs.on('RecordingStopped', () => {
    Rstatus = "free"
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

getColor = (n) => {
    var code = n.match(/\$#[0-6]/g);
    return code ? Number(code[0].substr(2, 1)) : config.inactiveSceneColor;
}
