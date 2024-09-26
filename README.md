<!--<documentation_excluded>-->
[![badge](https://img.shields.io/twitter/follow/api_video?style=social)](https://twitter.com/intent/follow?screen_name=api_video) &nbsp; [![badge](https://img.shields.io/github/stars/apivideo/api.video-typescript-media-stream-composer?style=social)](https://github.com/apivideo/api.video-typescript-media-stream-composer) &nbsp; [![badge](https://img.shields.io/discourse/topics?server=https%3A%2F%2Fcommunity.api.video)](https://community.api.video)
![](https://github.com/apivideo/.github/blob/main/assets/apivideo_banner.png)
<h1 align="center">api.video media composer</h1>

![npm](https://img.shields.io/npm/v/@api.video/media-stream-composer) ![ts](https://badgen.net/badge/-/TypeScript/blue?icon=typescript&label)


[api.video](https://api.video) is the video infrastructure for product builders. Lightning fast video APIs for integrating, scaling, and managing on-demand & low latency live streaming features in your app.


## Table of contents
- [Table of contents](#table-of-contents)
- [Project description](#project-description)
- [Getting started](#getting-started)
  - [Installation](#installation)
    - [Installation method #1: requirejs](#installation-method-1-requirejs)
    - [Installation method #2: ES6 modules](#installation-method-2-es6-modules)
    - [Simple include in a javascript project](#simple-include-in-a-javascript-project)
- [Documentation](#documentation)
  - [Instantiation](#instantiation)
    - [Options](#options)
  - [Methods](#methods)
    - [`addStream(mediaStream: MediaStream | HTMLImageElement, options: StreamOptions): string`](#addstreammediastream-mediastream--htmlimageelement-options-streamoptions-string)
      - [Options](#options-1)
    - [`updateStream(streamId: string, options: StreamOptions): void`](#updatestreamstreamid-string-options-streamoptions-void)
    - [`removeStream(id: string): void`](#removestreamid-string-void)
    - [`getStreams(): StreamDetails[]`](#getstreams-streamdetails)
    - [`getStream(id: string): StreamDetails`](#getstreamid-string-streamdetails)
    - [`addAudioSource(mediaStream: MediaStream): string`](#addaudiosourcemediastream-mediastream-string)
    - [`removeAudioSource(id: string): void`](#removeaudiosourceid-string-void)
    - [`getAudioSources(): AudioSourceDetails[]`](#getaudiosources-audiosourcedetails)
    - [`getAudioSource(audioSourceId: string): AudioSourceDetails`](#getaudiosourceaudiosourceid-string-audiosourcedetails)
    - [`moveUp(streamId: string): void`](#moveupstreamid-string-void)
    - [`moveDown(streamId: string): void`](#movedownstreamid-string-void)
    - [`startRecording(options: RecordingOptions): void`](#startrecordingoptions-recordingoptions-void)
      - [Options](#options-2)
        - [Using a delegated upload token (recommended):](#using-a-delegated-upload-token-recommended)
        - [Using an access token (discouraged):](#using-an-access-token-discouraged)
        - [Common options](#common-options)
    - [`stopRecording(): Promise<VideoUploadResponse>`](#stoprecording-promisevideouploadresponse)
    - [`getCanvas(): HTMLCanvasElement | undefined`](#getcanvas-htmlcanvaselement--undefined)
    - [`appendCanvasTo(containerQuerySelector: string): void`](#appendcanvastocontainerqueryselector-string-void)
    - [`setMouseTool(tool: "draw" | "move-resize"): void`](#setmousetooltool-draw--move-resize-void)
    - [`setDrawingSettings(settings: Partial<DrawingSettings>): void`](#setdrawingsettingssettings-partialdrawingsettings-void)
    - [`clearDrawing(): void`](#cleardrawing-void)
    - [`addEventListener(event: string, listener: Function)`](#addeventlistenerevent-string-listener-function)
    - [`destroy()`](#destroy)
- [Full examples](#full-examples)
  - ["Loom-like"](#loom-like)

<!--</documentation_excluded>-->
<!--<documentation_only>
---
title: api.video TypeScript Media Composer
meta: 
  description: The official api.video TypeScript Media Composer for api.video. [api.video](https://api.video/) is the video infrastructure for product builders. Lightning fast video APIs for integrating, scaling, and managing on-demand & low latency live streaming features in your app.
---

# api.video TypeScript Media Composer

[api.video](https://api.video/) is the video infrastructure for product builders. Lightning fast video APIs for integrating, scaling, and managing on-demand & low latency live streaming features in your app.

</documentation_only>-->
## Project description

This library lets you easily record & upload videos to api.video from a composition of several media streams. The position and size of each stream can be set in a flexible and easy way. 

This allows for example, with only a few lines of code, to create a video composed of:
"entire screen capture in the left half, window #1 capture in the right half, and the webcam in a circular shape in the bottom left of the video".

The code of a small Next.js application demonstrating the different features offered by the library is available in the [examples/record.a.video](https://github.com/apivideo/api.video-typescript-media-stream-composer/tree/main/examples/record.a.video) folder. If you want to try it live, go here: [https://record.a.video](https://record.a.video/).


## Getting started

### Installation

#### Installation method #1: requirejs

If you use requirejs you can add the library as a dependency to your project with 

```sh
$ npm install --save @api.video/media-stream-composer
```

You can then use the library in your script: 

```javascript
var { MediaStreamComposer } = require('@api.video/media-stream-composer');

var composer = new MediaStreamComposer({
    resolution: {
        width: 1280,
        height: 720
    }
}); 
```

#### Installation method #2: ES6 modules

You can add the library as a dependency to your project with 

```sh
$ npm install --save @api.video/media-stream-composer
```

You can then use the library in your script: 

```javascript
import { MediaStreamComposer } from '@api.video/media-stream-composer'

const composer = new MediaStreamComposer({
    resolution: {
        width: 1280,
        height: 720
    }
});
```


#### Simple include in a javascript project

Include the library in your HTML file like so:

```html
<head>
    ...
    <script src="https://unpkg.com/@api.video/media-stream-composer" defer></script>
</head>
```

Then you can instantiate the composer using `new MediaStreamComposer()`:
```html
...
<script type="text/javascript"> 
    const composer = new MediaStreamComposer({
        resolution: {
            width: 1280,
            height: 720
        }
    });
</script>
```

## Documentation

### Instantiation

#### Options 

The media stream composer is instantiated using an `options` object. At the moment, it contains only one option: `resolution`. If provided, this option must contain a `width` and a `height` property. This resolution will be used to create the canvas element that will be used to draw the streams. It will also be used to set the resolution of the video when it is uploaded.

If the `resolution` option is not provided, the canvas will be created with this resolution: 1280x720.

### Methods


#### `addStream(mediaStream: MediaStream | HTMLImageElement, options: StreamOptions): string`

The addStream() method adds a stream to the composition. A stream can be either a `MediaStream` (for example, the webcam, the screen, or a window capture) or an `HTMLImageElement` (for example, a logo).

It takes a `MediaStream | HTMLImageElement` and an `StreamOptions` parameter.

**Note regarding images origin** 

When you load an image onto the composition, the origin of the image must be the same as the origin of the webpage in order for the image to be displayed correctly. This means that the image must be served from the same domain, or the server hosting the image must include the appropriate CORS (Cross-Origin Resource Sharing) headers to allow the image to be displayed on the canvas from a different origin. More details here: https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image .

##### Options

| Option name | Type                                                         | Default value | Description                                                                                                                                               |
| ----------: | ------------------------------------------------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
|        name | string                                                       | undefined     | An optional name for the stream                                                                                                                           |
|    position | `contain` \| `cover` \| `fixed`                              | `contain`     | `contain`: the stream will be contained in the canvas, `cover`: the stream will be covered by the canvas, `fixed`: the stream will be fixed in the canvas |
|           x | number                                                       | undefined     | x position of the stream (in pixels, only if position = `fixed`)                                                                                          |
|           y | number                                                       | undefined     | y position of the stream (in pixels, only if position = `fixed`)                                                                                          |
|       width | number                                                       | undefined     | width  of the stream (in pixels, only if position = `fixed`)                                                                                              |
|      height | number                                                       | undefined     | height  of the stream (in pixels, only if position = `fixed`)                                                                                             |
|   draggable | boolean                                                      | false         | Whether the stream can be moved by dragging it (see bellow [mouse interactions](#mouse-interactions))                                                     |
|   resizable | boolean                                                      | false         | Whether the stream can be resized by dragging its borders (see bellow [mouse interactions](#mouse-interactions))                                          |
|        mask | `none` \| `circle`                                           | `none`        | Whether the stream should be masked with a circle or not                                                                                                  |
|        mute | boolean                                                      | false         | Whether the stream should be muted or not                                                                                                                 |
|      hidden | boolean                                                      | false         | Whether the stream should be hidden or not
|     opacity | number                                                       | 100         | Opacity of the stream (from 0 to 100)                                                                                                       |
|     onClick | (streamId: string, event: `{ x: number; y: number; }`) => void | undefined     | A callback function that will be called when the stream is clicked                                                                                        |

**Example (screen capture)**

```javascript

navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }).then((stream) => {
    const streamId = composer.addStream(stream, {
        position: "fixed",
        x: 100,
        y: 100,
        width: 300,
        draggable: true,
        resizable: true,
        mask: "circle",
        opacity: 90,
        onClick: (streamId, event) => {
            console.log(streamId, event.x, event.y);
        }
    });

    // ...
});
```

**Example (image)**

```javascript

const image = new Image();
image.crossOrigin = 'anonymous';
image.src = "./my-logo.jpg"; 

const streamId = composer.addStream(image, {
    position: "fixed",
    x: 100,
    y: 100,
    width: 300,
    draggable: true,
    resizable: true,
    mask: "none"
});
```

#### `updateStream(streamId: string, options: StreamOptions): void`

Update the options of an existing stream. It takes the id of the stream (the one returned by the addStream() method) and an `StreamOptions` parameter (same as for the addStream() method).

**Example**

```javascript
composer.updateStream(streamId, {
    hidden: true,
});
```

#### `removeStream(id: string): void`

Remove a stream from the composition. The id is the same as the one returned by the addStream() method.

**Example**

```javascript
composer.removeStream(streamId);
```

#### `getStreams(): StreamDetails[]`

Returns an array of objects containing the details of all the streams in the composition.

**Example**

```javascript
const streams = composer.getStreams();
/*
    streams: [{
        "id": "0",
        "options": {
            "position": "fixed",
            "height": 192,
            "x": 0,
            "y": 0,
            "resizable": true,
            "draggable": true,
            "mask": "circle",
            "name": "#0 webcam"
        },
        "displaySettings": {
            "radius": 96,
            "displayResolution": {
                "width": 192,
                "height": 192
            },
            "position": {
                "x": 0,
                "y": 0
            },
            "streamResolution": {
                "width": 640,
                "height": 480
            },
            "index": 1
        },
        "stream": {}
    }]
*/

```

#### `getStream(id: string): StreamDetails`

Get the details of a stream. It takes the id of the stream. The id is the same as the one returned by the addStream() method.

**Example**

```javascript
const stream = composer.getStream(streamId);
```







#### `addAudioSource(mediaStream: MediaStream): string`

The addAudioSource() method adds a stream as an audio source to the composition. It takes a `MediaStream` parameter. The display won't be impacted by the stream. Only the audio will be mixed.
                                                                           |

**Example**

```javascript

navigator.mediaDevices.getDisplayMedia({ audio: { deviceId: selectedAudioSource }).then((stream) => {
    const audioSourceId = composer.addAudioSource(stream);
});

```

#### `removeAudioSource(id: string): void`

Remove an audio source from the composition. The id is the same as the one returned by the addAudioSource() method.

**Example**

```javascript
composer.removeAudioSource(audioSourceId);
```

#### `getAudioSources(): AudioSourceDetails[]`

Returns an array of objects containing the details of all the streams in the composition.

**Example**

```javascript
const audioSources = composer.getAudioSources();
/*
    audioSources: [{
        "id": "audio_0",
        "stream": {}
    }]
*/

```

#### `getAudioSource(audioSourceId: string): AudioSourceDetails`

Get the details of an audio source. It takes the id of the audio source. The id is the same as the one returned by the addAudioSource() method.

**Example**

```javascript
const stream = composer.getAudioSource(audioSourceId);
```



#### `moveUp(streamId: string): void`

Move a stream up in the composition (ie. move it above the stream that was above it). The id is the same as the one returned by the addStream() method.

**Example**

```javascript
composer.moveUp(streamId);
```

#### `moveDown(streamId: string): void`

Move a stream down in the composition (ie. move it below the stream that was below it). The id is the same as the one returned by the addStream() method.

**Example**

```javascript
composer.moveDown(streamId);
```

#### `startRecording(options: RecordingOptions): void`

Start recording the composition & upload it to your api.video account. It takes an `RecordingOptions` parameter.

##### Options

Options to provide depend on the way you want to authenticate to the api.video API: either using a delegated upload token (recommanded), or using a usual access token. 

###### Using a delegated upload token (recommended):

Using delegated upload tokens for authentication is best options when uploading from the client side. To know more about delegated upload token, read the dedicated article on api.video's blog: [Delegated Uploads](https://api.video/blog/tutorials/delegated-uploads/).


|                   Option name | Mandatory | Type   | Description             |
| ----------------------------: | --------- | ------ | ----------------------- |
|                   uploadToken | **yes**   | string | your upload token       |
|                       videoId | no        | string | id of an existing video |
| _common options (see bellow)_ |           |        |                         |

###### Using an access token (discouraged):

**Warning**: be aware that exposing your access token client-side can lead to huge security issues. Use this method only if you know what you're doing :).


|                   Option name | Mandatory | Type   | Description             |
| ----------------------------: | --------- | ------ | ----------------------- |
|                   accessToken | **yes**   | string | your access token       |
|                       videoId | **yes**   | string | id of an existing video |
| _common options (see bellow)_ |           |        |                         |


###### Common options

| Option name | Mandatory          | Type   | Description                                                         |
| ----------: | ------------------ | ------ | ------------------------------------------------------------------- |
|   videoName | no                 | string | the name of your recorded video (overrides the default "file" name) |
|     apiHost | no                 | string | api.video host (default: ws.api.video)                              |
|     retries | no                 | number | number of retries when an API call fails (default: 5)               |
|   timeslice | no (default: 5000) | number | The number of milliseconds to record into each Blob.                |



**Example**

```javascript
composer.startRecording({
    uploadToken: "YOUR_DELEGATED_TOKEN",
    retries: 10,
});
```

#### `stopRecording(): Promise<VideoUploadResponse>`

The stopRecording() method stops the recording of the composition. It takes no parameter. It returns a Promise that resolves with the newly created video.

**Example**

```javascript
composer.stopRecording().then(e => console.log(`player url: ${e.assets.player}`));
```

#### `getCanvas(): HTMLCanvasElement | undefined`

Returns the canvas used to draw the composition. It takes no parameter.

**Example**

```javascript
const canvas = composer.getCanvas();
```

#### `appendCanvasTo(containerQuerySelector: string): void`

Append the canvas used to draw the composition to an HTML container. It takes a string containing the query selector of the container.

That's useful if you want to display the composition in a web page.

Additionally, it's mandatory is you want to use mouse-based features like dragging, resizing and drawing.

**Example**

```html
<div id="container"></div>
<script>
    // ....
    composer.appendCanvasTo("#container");
</script>

```


#### `setMouseTool(tool: "draw" | "move-resize"): void`

Define the kind of action that will be performed when the user interact with the canvas using the mouse. It takes a string containing the name of the tool.

Tools: 
- `move-resize`: move and resize a stream
- `draw`: draw on a stream (drawing settings can be defined using the `setDrawingSettings()` method)
 
**Example**

```javascript
composer.setMouseTool("draw");

```

#### `setDrawingSettings(settings: Partial<DrawingSettings>): void`

Set the drawing settings for the `draw` tool. It takes a `DrawingSettings` parameter that contains the following attributes:
- `color`: the color of the drawing
- `lineWidth`: the width of the drawing
- `autoEraseDelay`: the delay before the drawing is erased (in seconds - 0 means no delay)
  
**Example**

```javascript
composer.setDrawingSettings({
    color: "#FF0000",
    lineWidth: 5,
    autoEraseDelay: 3,
});
```

#### `clearDrawing(): void`

Clear all the drawings on the canvas. It takes no parameter.

**Example**

```javascript
composer.clearDrawing();
```

#### `addEventListener(event: string, listener: Function)`

Define an event listener for the media recorder. The following events are available:
- `"error"`: when an error occurs
- `"recordingStopped"`: when the recording is stopped

**Example**

```javascript
    composer.addEventListener("error", (event) => {
       console.log(event.data);
    });
```

#### `destroy()`

Destroys all streams and releases all resources in use.

## Full examples 

### "Loom-like"

This samples shows how to use the composer to create a screencast with a webcam stream in the corner.

It has the following features:
- the screencast stream is added in the background and it's size is automatically adjusted to the size of the composition (`contain` dimensions)
- the webcam stream is added in front of the screencast stream, in the bottom-left corner, and it's displayed in a circle - the stream is draggable and resizable
- switching between the "drawing" and "moving/resizing" tools is possible using radio buttons

```html
<html>
    <head>
        <script src="https://unpkg.com/@api.video/media-stream-composer"></script>
        <style>
            body {
                font-family: 'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande', 'Lucida Sans Unicode', Geneva, Verdana, sans-serif;
            }
            #container {
                display: flex;
                flex-direction: column;
                align-items: center;
            }

            #video {
                border: 1px solid gray;
            }

            #container div {
                margin: 10px 0;
            }
        </style>
    </head>

    <body>
        <div id="container">
            <div id="canvas-container"> </div>
            <div>
                <button id="start">start recording</button>
                <button id="stop" disabled>stop recording</button>
            </div>
            <div>
                <label for="tool-select">Tool:</label>
                <select id="tool-select">
                    <option value="draw">draw</option>
                    <option selected value="move-resize">move/resize</option>
                </select>
            </div>
            <div>
                <p>Video link: <span id="video-link"><i>will be displayed when the recording is finished</i></span></p>
            </div>
        </div>

        <script>
            const canvasContainer = document.getElementById('canvas-container');
            const toolSelect = document.getElementById("tool-select");
            const startButton = document.getElementById("start");
            const stopButton = document.getElementById("stop");
            const videoLink = document.getElementById("video-link");
            const width = 1366;
            const height = 768;

            canvasContainer.style.width = `${width}px`;
            canvasContainer.style.height = `${height}px`;



            (async () => {
                const screencast = await navigator.mediaDevices.getDisplayMedia();
                const webcam = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: true
                });

                // create the media stream composer instance
                const mediaStreamComposer = new MediaStreamComposer({
                    resolution: {
                        width,
                        height
                    }
                });

                // add the screencast stream
                mediaStreamComposer.addStream(screencast, {
                    position: "contain",
                    mute: true,
                });

                // add the webcam stream in the lower left corner, with a circle mask
                mediaStreamComposer.addStream(webcam, {
                    position: "fixed",
                    mute: false,
                    y: height - 200,
                    left: 0,
                    height: 200,
                    mask: "circle",
                    draggable: true,
                    resizable: true,
                });

                // display the canvas (preview purpose)
                mediaStreamComposer.appendCanvasTo("#canvas-container");

                // when the start button is clicked, start the recording
                startButton.onclick = () => {
                    mediaStreamComposer.startRecording({
                        uploadToken: "YOUR_UPLOAD_TOKEN",
                    });
                    startButton.disabled = true;
                    stopButton.disabled = false;
                }

                // when the stop button is clicked, stop the recording and display the video link
                stopButton.onclick = () => {
                    mediaStreamComposer.stopRecording().then(a => videoLink.innerHTML = a.assets.player);
                    stopButton.disabled = true;
                    startButton.disabled = false;
                }


                mediaStreamComposer.setDrawingSettings({
                    color: "#FF0000",
                    lineWidth: 5,
                    autoEraseDelay: 3,
                });

                toolSelect.onchange = (a) => mediaStreamComposer.setMouseTool(a.target.value);
            })();
        </script>
    </body>

</html>
```
