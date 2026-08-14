import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app";
import connectDB from "./config/db";
import { startAllCronJobs } from "./jobs/subscriptionCron";
import { startExamStatusCron } from "./jobs/examCron";
import { initializeSocketServer } from "./services/socketService";

// Connect to database
connectDB();

// Start background jobs
startAllCronJobs();
startExamStatusCron();

const PORT = process.env.PORT || 5000;

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize Socket.IO for live classroom
initializeSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`,
  );
  console.log("Socket.IO server ready for live classroom sessions");
});
