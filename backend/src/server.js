require('dotenv').config();
const app = require('./app');

const port = Number(process.env.PORT || 4000);

app.listen(port, () => {
  // keep startup logging simple for local dev
  console.log(`Backend listening on port ${port}`);
});
