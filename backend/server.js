const express = require('express');
const cors = require('cors');
const importRoutes = require('./src/routes/importRoutes');
const kpiRoutes = require('./src/routes/kpiRoutes');

const app = express();
const PORT = 5050;

app.use(cors());
app.use(express.json());

app.use('/api/import', importRoutes);
app.use('/api/kpi', kpiRoutes);

app.listen(PORT, () => {
    console.log(`TTVH Backend running on port ${PORT}`);
});
