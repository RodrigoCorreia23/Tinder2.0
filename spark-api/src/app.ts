import express from 'express';
import cors from 'cors';
import { errorHandler } from './shared/middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/user/user.routes';
import swipeRoutes from './modules/swipe/swipe.routes';
import matchRoutes from './modules/match/match.routes';
import chatRoutes from './modules/chat/chat.routes';
import mapRoutes from './modules/map/map.routes';
import plannerRoutes from './modules/date-planner/planner.routes';
import blockRoutes from './modules/block/block.routes';
import { authenticate } from './modules/auth/auth.middleware';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/swipes', swipeRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/date-plans', plannerRoutes);
app.use('/api/matches', chatRoutes);
app.use('/api/blocks', authenticate, blockRoutes);

// Error handling
app.use(errorHandler);

export default app;
