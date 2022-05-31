[![badge](https://img.shields.io/twitter/follow/api_video?style=social)](https://twitter.com/intent/follow?screen_name=api_video) &nbsp; [![badge](https://img.shields.io/github/stars/apivideo/api.video-typescript-media-stream-composer?style=social)](https://github.com/apivideo/api.video-typescript-media-stream-composer) &nbsp; [![badge](https://img.shields.io/discourse/topics?server=https%3A%2F%2Fcommunity.api.video)](https://community.api.video)
![](https://github.com/apivideo/API_OAS_file/blob/master/apivideo_banner.png)
<h1 align="center">api.video media recorder</h1>

![npm](https://img.shields.io/npm/v/@api.video/media-stream-composer) ![ts](https://badgen.net/badge/-/TypeScript/blue?icon=typescript&label)


[api.video](https://api.video) is the video infrastructure for product builders. Lightning fast video APIs for integrating, scaling, and managing on-demand & low latency live streaming features in your app.


# Table of contents
- [Table of contents](#table-of-contents)
- [Project description](#project-description)
- [Getting started](#getting-started)
  - [Installation](#installation)
    - [Installation method #1: requirejs](#installation-method-1-requirejs)
    - [Installation method #2: typescript](#installation-method-2-typescript)
    - [Simple include in a javascript project](#simple-include-in-a-javascript-project)
- [Documentation](#documentation)
  - [Instanciation](#instanciation)
    - [Options](#options)
      - [Using a delegated upload token (recommended):](#using-a-delegated-upload-token-recommended)
      - [Using an access token (discouraged):](#using-an-access-token-discouraged)
      - [Common options](#common-options)
  - [Methods](#methods)
    - [`addStream(mediaStream: MediaStream, options: AddStreamOptions)`](#addstreammediastream-mediastream-options-addstreamoptions)
      - [Options](#options-1)
    - [`updateStream(streamId: number, opts: AddStreamOptions)`](#updatestreamstreamid-number-opts-addstreamoptions)
- [Full examples](#full-examples)
  - ["Loom-like": screencast + webcam in the corner](#loom-like-screencast--webcam-in-the-corner)

# Project description

Library to easily upload videos to api.video from a composition of several media streams. The position and size of each media stream can be set in a flexible and easy way. 

This allows for example, with only a few lines of code, to create a video composed of:
"entire screen capture in the left half, window #1 capture in the right half, and the webcam in a circular shape in the bottom left of the video" 

# Getting started

## Installation

### Installation method #1: requirejs

If you use requirejs you can add the library as a dependency to your project with 

```sh
$ npm install --save @api.video/media-stream-composer
```

You can then use the library in your script: 

```javascript
var { ApiVideoMediaRecorder } = require('@api.video/media-stream-composer');

var composer = new MediaStreamComposer(mediaStream, {
    uploadToken: "YOUR_DELEGATED_TOKEN",
    resolution: {
        width: 1280,
        height: 720
    }
}); 
```

### Installation method #2: typescript

If you use Typescript you can add the library as a dependency to your project with 

```sh
$ npm install --save @api.video/media-stream-composer
```

You can then use the library in your script: 

```typescript
import { ApiVideoMediaRecorder } from '@api.video/media-stream-composer'

const composer = new MediaStreamComposer(mediaStream, {file: files[0],
    uploadToken: "YOUR_DELEGATED_TOKEN"
    resolution: {
        width: 1280,
        height: 720
    }
});
```


### Simple include in a javascript project

Include the library in your HTML file like so:

```html
<head>
    ...
    <script src="https://unpkg.com/@api.video/media-stream-composer" defer></script>
</head>
```

Then, once the `window.onload` event has been trigered, create your player using `new ApiVideoMediaRecorder()`:
```html
...
<script type="text/javascript"> 
    const composer = new MediaStreamComposer(mediaStream, {
        uploadToken: "YOUR_DELEGATED_TOKEN"
        resolution: {
            width: 1280,
            height: 720
        }
    });
</script>
```

# Documentation

## Instanciation

### Options 

The media stream composer is instanciated using and an `options` object. Options to provide depend on the way you want to authenticate to the API: either using a delegated upload token (recommanded), or using a usual access token. 

#### Using a delegated upload token (recommended):

Using delegated upload tokens for authentication is best options when uploading from the client side. To know more about delegated upload token, read the dedicated article on api.video's blog: [Delegated Uploads](https://api.video/blog/tutorials/delegated-uploads).


|                   Option name | Mandatory | Type   | Description             |
| ----------------------------: | --------- | ------ | ----------------------- |
|                   uploadToken | **yes**   | string | your upload token       |
|                       videoId | no        | string | id of an existing video |
| _common options (see bellow)_ |           |        |                         |

#### Using an access token (discouraged):

**Warning**: be aware that exposing your access token client-side can lead to huge security issues. Use this method only if you know what you're doing :).


|                   Option name | Mandatory | Type   | Description             |
| ----------------------------: | --------- | ------ | ----------------------- |
|                   accessToken | **yes**   | string | your access token       |
|                       videoId | **yes**   | string | id of an existing video |
| _common options (see bellow)_ |           |        |                         |


#### Common options


| Option name | Mandatory | Type                            | Description                                               |
| ----------: | --------- | ------------------------------- | --------------------------------------------------------- |
|  resolution | no        | {width: number, height: number} | the resolution of the resulting video (default: 1280x720) |
|     apiHost | no        | string                          | api.video host (default: ws.api.video)                    |
|     retries | no        | number                          | number of retries when an API call fails (default: 5)     |



## Methods

### `addStream(mediaStream: MediaStream, options: AddStreamOptions)`

The addStream() method adds a stream to the composition. It takes a `MediaStream` and an `options` parameter.

#### Options
|     Option name | Mandatory          | Type                              | Description                                          |
| --------------: | ------------------ | --------------------------------- | ---------------------------------------------------- |
|       timeslice | no (default: 5000) | number                            | The number of milliseconds to record into each Blob. |
|        position |                    | "contain" \| "cover" \| "fixed"   | TODO                                                 |
|             top |                    | number \| string                  | TODO                                                 |
|          bottom |                    | number \| string                  | TODO                                                 |
|            left |                    | number \| string                  | TODO                                                 |
|           right |                    | number \| string                  | TODO                                                 |
| horizontalAlign |                    | "left" \| "center" \| "right"     | TODO                                                 |
|   verticalAlign |                    | "top" \| "center" \| "bottom"     | TODO                                                 |
|           width |                    | number \| string                  | TODO                                                 |
|          height |                    | number \| string                  | TODO                                                 |
|           mask? |                    | "none" \| "circle" \| "rectangle" | TODO                                                 |
|           index |                    | number                            | TODO                                                 |
|            mute |                    | boolean                           | TODO                                                 |
|           muted |                    | boolean                           | TODO                                                 |
|            draw |                    | DrawFunction                      | TODO                                                 |
|     audioEffect |                    | AudioEffect                       | TODO                                                 |

**Example**

```javascript
    const webcam = await navigator.mediaDevices.getUserMedia(constraints);
    const webcamStreamId = composer.addStream(webcam, {
        position: "fixed",
        left: 0,
        top: "70%",
        height: "30%",
        mask: "circle",
    });
```

### `updateStream(streamId: number, opts: AddStreamOptions)`

Update the options of a stream that has been added to the composition.

**Example**

```javascript
    // ... mediaRecorder instanciation

    composer.updateStream(webcamStreamId, {
        position: "fixed",
    });
```

# Full examples 

## "Loom-like": screencast + webcam in the corner


```html
<html>

    <head>
        <script src="../dist/index.js"></script>
        <style>
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
            <div>
                <video muted id="video"></video>
            </div>
            <div>
                <button id="start">start recording</button>
                <button id="stop" disabled>stop recording</button>
            </div>
            <div>
                <p>Video link: <span id="video-link"><i>will be displayed when the recording is finished</i></span></p>
            </div>
        </div>

        <script>
            const video = document.querySelector('#video');
            const startButton = document.getElementById("start");
            const stopButton = document.getElementById("stop");
            const videoLink = document.getElementById("video-link");
            const width = 1366;
            const height = 768;

            video.style.width = `${width}px`;
            video.style.height = `${height}px`;


            (async () => {
                const screencast = await navigator.mediaDevices.getDisplayMedia();
                const webcam = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: true
                });

                // create the media stream merger instance
                const mediaStreamMerger = new MediaStreamMerger({
                    resolution: {
                        width,
                        height
                    }
                });

                // add the screencast stream
                mediaStreamMerger.addStream(screencast, {
                    position: "contain",
                    verticalAlign: "center",
                    horizontalAlign: "center",
                    mute: true,
                });

                // add the webcam stream in the lower left corner, with a circle mask
                mediaStreamMerger.addStream(webcam, {
                    position: "fixed",
                    mute: false,
                    top: "70%",
                    left: 0,
                    height: "30%",
                    mask: "circle",
                });

                // display the merged stream in the video element (preview purpose)
                video.srcObject = mediaStreamMerger.result;
                video.play();

                // when the start button is clicked, start the recording
                startButton.onclick = () => {
                    mediaStreamMerger.startRecording({
                        uploadToken: "YOUR_UPLOAD_TOKEN",
                    });
                    startButton.disabled = true;
                    stopButton.disabled = false;
                }

                // when the stop button is clicked, stop the recording and display the video link
                stopButton.onclick = () => {
                    mediaStreamMerger.stopRecording().then(a => videoLink.innerHTML = a.assets.player);
                    stopButton.disabled = true;
                    startButton.disabled = false;
                }

            })();
        </script>
    </body>

</html>
```
