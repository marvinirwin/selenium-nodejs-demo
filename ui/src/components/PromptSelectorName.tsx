import React, {ChangeEvent, useState} from 'react';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

export default function ({open, selector, handleClose}: {open: boolean, selector: string, handleClose: (s: string) => void}) {
    const [name, setName] = useState('');
    const handleChange = (e: ChangeEvent) => {
        setName(e.target.value);
    };
    return (
        <div>
            <Dialog open={open} aria-labelledby="form-dialog-title">
                <DialogTitle id="form-dialog-title">Subscribe</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="name"
                        label={selector}
                        value={name}
                        onChange={handleChange}
                        fullWidth
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={e => handleClose('') } color="primary">
                        Cancel
                    </Button>
                    <Button onClick={e => handleClose(name)} color="primary">
                        done
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}