import React, { useState } from 'react';
import { TextField, Button, Box, Typography } from '@mui/material';

function ReportForm({ onReport }) {
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [faction, setFaction] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description || !latitude || !longitude) return;

    const newReport = { description, latitude: Number(latitude), longitude: Number(longitude), faction };
    onReport(newReport);

    setDescription('');
    setLatitude('');
    setLongitude('');
    setFaction('');
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 2, mb: 2, boxShadow: 2, borderRadius: 2, bgcolor: '#fff' }}>
      <Typography variant="h6" gutterBottom>Registrar relato anônimo</Typography>
      <TextField
        label="Descrição"
        fullWidth
        margin="dense"
        value={description}
        onChange={e => setDescription(e.target.value)}
        required
      />
      <TextField
        label="Latitude"
        type="number"
        fullWidth
        margin="dense"
        value={latitude}
        onChange={e => setLatitude(e.target.value)}
        required
      />
      <TextField
        label="Longitude"
        type="number"
        fullWidth
        margin="dense"
        value={longitude}
        onChange={e => setLongitude(e.target.value)}
        required
      />
      <TextField
        label="Facção (opcional)"
        fullWidth
        margin="dense"
        value={faction}
        onChange={e => setFaction(e.target.value)}
      />
      <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>Enviar</Button>
    </Box>
  );
}

export default ReportForm;