import app from '../app.js';
import db from '../db.js';

await db.initializeSchema();

export default app;
