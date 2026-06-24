const express = require('express');
const cors = require('cors');
const f13Routes = require('./src/routes/f13Routes');
const importRoutes = require('./src/routes/importRoutes');
const { startWatcher } = require('./src/services/importWatcher');

const app = express();
const PORT = 5050;

app.use(cors());
app.use(express.json());

app.use('/api/f13', f13Routes);
app.use('/api/import', importRoutes);

app.listen(PORT, () => {
    console.log(`TTVH Backend running on port ${PORT}`);
    startWatcher();
});
