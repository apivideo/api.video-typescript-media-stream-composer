import { FormControl, FormLabel, Input } from '@mui/material'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import { useState } from 'react'


export interface UploadSettings {
    videoName: string;
}

interface UploadSettingsDialogProps {
    open: boolean;
    onSubmit?: (toto: UploadSettings) => void;
    onClose?: () => void;
    uploadSettings: UploadSettings;
}


const UploadSettingsDialog = (props: UploadSettingsDialogProps) => {
    const [videoName, setVideoName] = useState<string>(props.uploadSettings.videoName);


    return <Dialog fullWidth={true} open={props.open} onClose={() => props.onClose && props.onClose()}>
        <DialogTitle>Upload settings</DialogTitle>
        
        <DialogContent>
            <FormControl component="fieldset" style={{ width: "100%" }}>
                <FormLabel component="legend">Video name</FormLabel>
                <Input value={videoName} onChange={(e) => setVideoName(e.target.value)} />
            </FormControl>
        </DialogContent>

        <DialogActions>
            <Button onClick={() => props.onClose && props.onClose()}>Cancel</Button>
            <Button onClick={() => props.onSubmit && props.onSubmit({
                videoName
            })}>Submit</Button>
        </DialogActions>
    </Dialog>
}

export default UploadSettingsDialog;