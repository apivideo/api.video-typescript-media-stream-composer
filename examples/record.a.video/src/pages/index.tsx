import { MediaStreamComposer, MouseTool, StreamDetails } from '@api.video/media-stream-composer'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import AspectRatioIcon from '@mui/icons-material/AspectRatio'
import DeleteIcon from '@mui/icons-material/Delete'
import StartRecordingIcon from '@mui/icons-material/FiberManualRecord'
import GestureIcon from '@mui/icons-material/Gesture'
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown'
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp'
import SettingsIcon from '@mui/icons-material/Settings'
import StopRecordingIcon from '@mui/icons-material/StopCircle'
import VisibilityOnIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { Alert, FormControl, FormGroup, FormLabel, InputLabel, Menu, MenuItem, Paper, Select, Snackbar, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, ThemeProvider, ToggleButton, ToggleButtonGroup } from '@mui/material'
import Button from '@mui/material/Button'
import { createTheme } from '@mui/material/styles'
import PopupState from 'material-ui-popup-state'
import {
  bindMenu, bindTrigger
} from 'material-ui-popup-state/hooks'
import type { NextPage } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import { CirclePicker } from 'react-color'
import styles from '../../styles/Home.module.css'
import StreamDialog, { StreamFormValues } from '../components/StreamDialog'
import UploadSettingsDialog, { UploadSettings } from '../components/UploadSettingsDialog'

const theme = createTheme({
  palette: {
    primary: {
      light: '#757ce8',
      main: '#FA5B30',
      dark: '#FF6B40',
      contrastText: '#fff',
    },
    secondary: {
      light: '#ff7961',
      main: '#f44336',
      dark: '#ba000d',
      contrastText: '#000',
    },

  },
});

const WIDTH = 1024;
const HEIGHT = 768;
const DEFAULT_UPLOAD_TOKEN = process.env.NEXT_PUBLIC_UPLOAD_TOKEN!;

const composer = (() => {
  const mediaStreamComposer = new MediaStreamComposer({
    resolution: {
      width: WIDTH,
      height: HEIGHT
    },
  });
  mediaStreamComposer.setMouseTool("move-resize");
  mediaStreamComposer.setDrawingSettings({
    color: "#ff0000",
    lineWidth: 6,
    autoEraseDelay: 2
  });
  return mediaStreamComposer;
})();



const Home: NextPage = () => {
  const [addStreamDialogIsOpen, setAddStreamDialogOpen] = useState(false);
  const [uploadSettingsDialogIsOpen, setUploadSettingsDialogOpen] = useState(false);

  const [streams, setStreams] = useState<StreamDetails[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [mouseTool, setMouseTool] = useState<MouseTool>("move-resize");
  const [videoDevices, setVideoDevices] = useState<InputDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<InputDeviceInfo[]>([]);
  const [uploadToken, setUploadToken] = useState<string>(DEFAULT_UPLOAD_TOKEN);
  const [videoName, setVideoName] = useState<string>('')

  const [drawingColor, setDrawingColor] = useState("#ff6900");
  const [drawingAutoEraseDelay, setDrawingAutoEraseDelay] = useState(0);

  const [firstStreamAddedAlertOpen, setFirstStreamAddedAlertOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [audioSource, setAudioSource] = useState<string>("none");
  const [audioStreamId, setAudioStreamId] = useState<string | undefined>();
  const [uploadSettings, setUploadSettings] = useState<UploadSettings>({
    videoName: "My record.a.video composition",
  });

  const router = useRouter()

  useEffect(() => {
    (window as any).composer = composer;
    if (router.query.uploadToken) {
      setUploadToken(router.query.uploadToken as string);
    }
  }, [router.query])

  // update the drawing settings when related states are changed
  useEffect(() => {
    if (composer) {
      composer.setDrawingSettings({
        color: drawingColor,
        lineWidth: 6,
        autoEraseDelay: drawingAutoEraseDelay,
      });
    }
  }, [drawingColor, drawingAutoEraseDelay]);


  // handle the record duration timer
  useEffect(() => {
    if (isRecording) {
      setRecordingDuration(0);
      const interval = setInterval(() => {
        setRecordingDuration(recordingDuration => recordingDuration + 1);
      }, 1000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [isRecording])

  // retrieve the list of webcam on init
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      .then((stream) => {
        navigator.mediaDevices.enumerateDevices()
          .then((devices) => {
            setVideoDevices(devices.filter(d => d.kind === "videoinput"));
            setAudioDevices(devices.filter(d => d.kind === "audioinput"));
            stream.getTracks().forEach(x => x.stop());
          })
      })
      .catch(e => console.log(e));
  }, []);


  const addStream = async (opts: StreamFormValues) => {
    setAddStreamDialogOpen(false);
    let stream: MediaStream | HTMLImageElement; 
    switch(opts.type) {
      case "screen":
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        break;
      case "webcam":
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { deviceId: opts.deviceId } })
        break;
      case "image":
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.src = opts.imageUrl!;
        stream = image;
    }
      /*opts.type === "webcam"
        ? await navigator.mediaDevices.getUserMedia({ audio: true, video: { deviceId: opts.deviceId } })
        : await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });*/

    setTimeout(() => {
      composer.addStream(stream, {
        position: opts.position,
        width: opts.width ? parseInt(opts.width, 10) * WIDTH / 100 : undefined,
        height: opts.height ? parseInt(opts.height, 10) * HEIGHT / 100 : undefined,
        x: opts.left ? parseInt(opts.left, 10) * WIDTH / 100 : undefined,
        y: opts.top ? parseInt(opts.top, 10) * HEIGHT / 100 : undefined,
        resizable: opts.resizable,
        draggable: opts.draggable,
        opacity: opts.opacity,
        mask: opts.mask,
        mute: true,
        name: `${opts.type}`,
      });
      composer.appendCanvasTo("#canvas-container");
      const canvas = composer.getCanvas();
      canvas!.style.width = "100%";
      canvas!.style.boxSizing = "unset";
      setStreams(composer.getStreams());
    }, 100);
  }


  return (
    <div className={styles.container}>
      <ThemeProvider theme={theme}>
        <Head>
          <title>@api.video/media-stream-composer library sample application</title>
          <meta name="description" content="Next.js application showing the features offered by the @api.video/media-stream-composer library." />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <h1>@api.video/media-stream-composer library sample application</h1>
        <div>
          <p>This Next.js application aims to show the features offered by the <a target="_blank" rel="noreferrer" href="https://github.com/apivideo/api.video-typescript-media-stream-composer">@api.video/media-stream-composer</a> library. </p>
          <p>The code of the application is available on GitHub here: <a target="_blank" rel="noreferrer" href="https://github.com/apivideo/api.video-typescript-media-stream-composer/tree/main/examples/record.a.video">record.a.video</a>.</p>
          <Snackbar
            open={firstStreamAddedAlertOpen}
            onClose={() => setFirstStreamAddedAlertOpen(false)}
            autoHideDuration={4000}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert onClose={() => setFirstStreamAddedAlertOpen(false)} severity="success" sx={{ width: '100%' }}>
              You have added your first stream. You can now add more to create your composition!
            </Alert>
          </Snackbar>
          <Snackbar
            open={!!errorMessage}
            onClose={() => setErrorMessage(undefined)}
            autoHideDuration={4000}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert onClose={() => setErrorMessage(undefined)} severity="error" sx={{ width: '100%' }}>
              {errorMessage}
            </Alert>
          </Snackbar>
        </div>
        <div className={styles.columnsContainer}>
          <Paper className={styles.settingsPaper} elevation={4}>
            <h2>
              <p>Video streams</p>
              <PopupState variant="popover" popupId="addStreamMenu">
                {(popupState) => (
                  <React.Fragment>
                    <Button variant="text" {...bindTrigger(popupState)}><AddCircleIcon sx={{ mr: 1 }} /> add a stream</Button>
                    <Menu {...bindMenu(popupState)}>
                      <MenuItem onClick={async () => { popupState.close(); setAddStreamDialogOpen(true); }}>Add a custom stream ...</MenuItem>
                      <MenuItem onClick={async () => {
                          popupState.close();
                          addStream({
                            type: "image",
                            imageUrl: "/Logo_white_text.svg",
                            position: "fixed",
                            width: "38%",
                            top: "88%",
                            left: "60%",
                            mask: "none",
                            draggable: true,
                            resizable: true,
                          });
                        }}>Add api.video logo :)</MenuItem>

                      {videoDevices.map(d =>
                      ([
                        <MenuItem key={d.deviceId + "_screen"} onClick={async () => {
                          popupState.close();
                          addStream({
                            type: "screen",
                            position: "contain",
                            mask: "none",
                            draggable: true,
                            resizable: true,
                          });
                          addStream({
                            type: "webcam",
                            deviceId: d.deviceId,
                            position: "fixed",
                            height: "30%",
                            top: "68%",
                            left: "2%",
                            mask: "circle",
                            draggable: true,
                            resizable: true,
                          });
                        }}>Add screencast + rounded webcam ({d.label})</MenuItem>,
                        <MenuItem key={d.deviceId} onClick={async () => {
                          popupState.close();
                          addStream({
                            type: "webcam",
                            deviceId: d.deviceId,
                            position: "fixed",
                            height: "30%",
                            top: "68%",
                            left: "2%",
                            mask: "circle",
                            draggable: true,
                            resizable: true,
                          });
                        }}>Add rounded webcam only ({d.label})</MenuItem>,]))
                      }

                      <MenuItem onClick={async () => {
                        popupState.close();
                        addStream({
                          type: "screen",
                          position: "contain",
                          mask: "none",
                          draggable: false,
                          resizable: false,
                        });
                      }}>Add screencast only</MenuItem>

                    </Menu>
                  </React.Fragment>
                )}
              </PopupState>
            </h2>

            {streams.length === 0
              ? <p className={styles.noStream}>No stream yet. Click <a onClick={async () => setAddStreamDialogOpen(true)}>here</a> to add a stream.</p>
              : <TableContainer className={styles.table}>
                <Table size="small" aria-label="simple table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Streams</TableCell>
                      <TableCell align="right"></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {streams.map((val, index, array) => array[array.length - 1 - index]).map((stream, i) => (
                      <TableRow
                        key={i}
                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                      >
                        <TableCell component="th" scope="row">
                          #{stream.id} ({stream.options.name} {stream.options.index})
                        </TableCell>
                        <TableCell className={styles.tableActions} align="right">
                          <Button disabled={i === 0} onClick={() => { composer.moveUp(stream.id); setStreams(composer.getStreams()); }}><KeyboardDoubleArrowUpIcon /></Button>
                          <Button disabled={i === streams.length - 1} onClick={() => { composer.moveDown(stream.id); setStreams(composer.getStreams()); }}><KeyboardDoubleArrowDownIcon /></Button>
                          {stream.options.hidden
                            ? <Button onClick={() => { composer.updateStream(stream.id, { hidden: false }); setStreams(composer.getStreams()); }}><VisibilityOnIcon></VisibilityOnIcon></Button>
                            : <Button onClick={() => { composer.updateStream(stream.id, { hidden: true }); setStreams(composer.getStreams()); }}><VisibilityOffIcon></VisibilityOffIcon></Button>}

                          <Button onClick={() => { composer.removeStream(stream.id); setStreams(composer.getStreams()); }}><DeleteIcon></DeleteIcon></Button>
                        </TableCell>

                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            }

            <h2>Audio source</h2>
            <FormControl fullWidth>
              <InputLabel id="audio-source-select-label">Audio source</InputLabel>
              <Select
                labelId="audio-source-select-label"
                id="audio-source-select"
                value={audioSource}
                label="Audio source"
                onChange={async (a) => {
                  if (audioStreamId) {
                    composer.removeAudioSource(audioStreamId);
                  }
                  const selectedAudioSource = a.target.value;
                  let newAudioStreamId;
                  if (selectedAudioSource !== "none") {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: selectedAudioSource } });
                    newAudioStreamId = await composer.addAudioSource(stream);
                  }
                  setAudioStreamId(newAudioStreamId);
                  setAudioSource(selectedAudioSource);
                }}
              >
                <MenuItem key={"undefined"} value={"none"}>none</MenuItem>
                {audioDevices.map(d => <MenuItem key={d.deviceId} value={d.deviceId}>{d.label}</MenuItem>)}
              </Select>
            </FormControl>

            <h2>Tool</h2>
            <FormControl component="fieldset">
              <FormGroup>
                <ToggleButtonGroup
                  fullWidth
                  size="small"
                  color="primary"
                  value={mouseTool}
                  exclusive
                  onChange={(v, w) => {
                    composer.setMouseTool(w);
                    setMouseTool(w);
                  }
                  }
                >
                  <ToggleButton disabled={streams.length === 0} value="move-resize"><AspectRatioIcon className={styles.toogleButtonIcon} /> Move / resize</ToggleButton>
                  <ToggleButton disabled={streams.length === 0} value="draw"><GestureIcon className={styles.toogleButtonIcon} /> Draw</ToggleButton>
                </ToggleButtonGroup>
                {mouseTool === "draw" && <>
                  <FormLabel component="legend">Line color</FormLabel>
                  <CirclePicker
                    color={drawingColor}
                    colors={['#FF6900', '#FCB900', '#9900EF', '#00D084', '#8ED1FC', '#0693E3']}
                    onChange={(color: any) => { setDrawingColor(color.hex) }}
                  />
                  <FormControl variant="standard">
                    <FormLabel component="legend">Auto erase delay</FormLabel>
                    <Select
                      labelId="width-select-standard-label"
                      id="width-select-standard"
                      value={drawingAutoEraseDelay}
                      onChange={(v, w) => { setDrawingAutoEraseDelay(parseInt(v.target.value as string)) }}
                      label="Auto erase delay"
                    >
                      <MenuItem value={0}>disabled</MenuItem>
                      <MenuItem value={3}>3 seconds</MenuItem>
                      <MenuItem value={5}>5 seconds</MenuItem>
                      <MenuItem value={10}>10 seconds</MenuItem>
                    </Select>
                  </FormControl>

                  <Button variant="outlined" style={{ marginTop: "1em" }} onClick={() => composer.clearDrawing()}>clear drawings</Button>

                </>}
              </FormGroup>
            </FormControl>


            <h2>Progressive upload <Button
              onClick={() => setUploadSettingsDialogOpen(true)}
            ><SettingsIcon /></Button></h2>

            <Button disabled={streams.length === -1} variant="contained" fullWidth color={isRecording ? "error" : "success"} onClick={async () => {
              if (!isRecording) {
                composer.startRecording({
                  uploadToken,
                  videoName: uploadSettings.videoName,
                  origin: {
                    application: {
                      name: "record-a-video",
                      version: "1.0.0",
                    }
                  }
                });
                composer.addEventListener("error", (e) => {
                  setErrorMessage((e as any).data.title || "An unknown error occurred");
                  setIsRecording(false);
                });
                setPlayerUrl(null);
                setIsRecording(true);
              } else {
                composer.stopRecording().then(e => setPlayerUrl(e.assets?.player || ""));
                setIsRecording(false);
              }
            }}>{!isRecording
              ? <><StartRecordingIcon className={styles.toogleButtonIcon} />start recording</>
              : <><StopRecordingIcon className={styles.toogleButtonIcon} />stop recording ({recordingDuration} sec)</>}
            </Button>
            {playerUrl !== null && <p>Your recording is available: <br /><a href={playerUrl} rel="noreferrer" target="_blank">recording</a>.</p>}
          </Paper>


          <Paper elevation={4} className={styles.previewPaper} style={{ flex: 1 }}>
            <h2>Preview</h2>
            <div id="canvas-container" style={{ width: "100%", aspectRatio: `${WIDTH}/${HEIGHT}` }} />
          </Paper>

          <StreamDialog
            open={addStreamDialogIsOpen}
            devices={videoDevices}
            onClose={() => setAddStreamDialogOpen(false)}
            onSubmit={(values) => {
              addStream(values);
              setAddStreamDialogOpen(false);
            }} />

          <UploadSettingsDialog
            open={uploadSettingsDialogIsOpen}
            onClose={() => setUploadSettingsDialogOpen(false)}
            uploadSettings={uploadSettings}
            onSubmit={(values) => { setUploadSettings(values); setUploadSettingsDialogOpen(false) }} />
          
        </div>
      </ThemeProvider>
    </div>
  )
}

export default Home
