<h1 style="text-align: center"><b>obs-launchpad</b></h1>
<h2 style="text-align: center">This is an app that allows you to use an AKAI APC Mini to control OBS</h2>

### The cool features you get

- Scene switching with pads
- Start/Stop streaming/recording
- Mute/Unmute mics and desktop audio
- Level adjustment with sliders
- Custom scene colors

### How to set up

1. Clone and cd into this repo
2. `npm install`
   If you don't have windows build tools correctly installed, node-midi will freak out. To fix this, google every error you get and find out how to fix it. Some things that worked for me are
   - Uninstalling Mono / Removing Mono from path (If installed)
   - Installing Python 2.7
   - Installing windows build tools using npm (`npm i -g windows-build-tools` from powershell or cmd as administrator)
   - Taking a break
   - Complaining about node-gyp
3. Install obs-websocket from [here](https://github.com/Palakis/obs-websocket/releases/latest)
4. Edit config.json to match your streaming setup
5. `node index.js`

Compiling to .exe is optional, but if you don't you'll need to run it from cli every time

### Mapping

The 8x8 grid of pads is automatically filled with scenes from OBS. The current scene is green and the scene you're switching to becomes red during the transition. The first 2 sliders are for desktop and mic audio, the round buttons above are for muting those inputs. The 2 unlabeled buttons on the right are green, and start flashing when you press either one, the top one is for streaming, the bottom one is for recording.

You can put $#_\[color]_ in a scene's name to change the color on the 8x8 grid, these are the color codes:

0. Off
1. Green
2. Green (blinking)
3. Red
4. Red (Blinking)
5. Yellow
6. Yellow (Blinking)

If I for example have a scene called "Starting sceen $#1", the scene when not currently active will appear green on the 8x8 grid
