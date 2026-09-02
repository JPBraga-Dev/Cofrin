import cors from 'cors';
import express from 'express';
import { errorHandler } from './middlewares/errorHandler.js';
import { api } from './routes/index.js';
export const app = express();
app.use(cors({ origin: ['http://localhost:5173'], methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));
app.use(express.json());
app.use('/api', api);
app.use(errorHandler);
