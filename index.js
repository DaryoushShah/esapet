/* Setup express server */
const express = require('express');
const app = express();

app.listen(8080, () => {
  console.log('Express server listening on port 8080');
});