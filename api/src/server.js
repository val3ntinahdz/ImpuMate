'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const app  = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`ImpuMate API running on port ${PORT}`);
});
