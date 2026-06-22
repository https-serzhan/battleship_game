import http from "node:http";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { Server } from "socket.io";
import { initializeSchema } from "./db/schema";
import { healthRouter } from "./routes/health";
import { registerSocketServer } from "./socket/socketServer";

dotenv.config();

const port = Number(process.env.PORT ?? 3001);
const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";

initializeSchema();

const app = express();

app.use(cors({ origin: frontendUrl }));
app.use(express.json());
app.use(healthRouter);

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: frontendUrl,
  },
});

registerSocketServer(io);

httpServer.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
