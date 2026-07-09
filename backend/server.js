import app from './app.js';
import db from './db.js';

const PORT = process.env.PORT || 3000;

await db.initializeSchema();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
