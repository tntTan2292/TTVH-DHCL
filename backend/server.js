const express = require('express');
const cors = require('cors');
const importRoutes = require('./src/routes/importRoutes');
const f13Routes = require('./src/routes/f13Routes');

const app = express();
const PORT = 5050;

app.use(cors());
app.use(express.json());

app.use('/api/import', importRoutes);
app.use('/api/f13', f13Routes);

app.listen(PORT, () => {
    console.log(`TTVH Backend running on port ${PORT}`);
});
