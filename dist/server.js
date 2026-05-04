"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const db_1 = __importDefault(require("./config/db"));
const dotenv_1 = __importDefault(require("dotenv"));
const subscriptionCron_1 = require("./jobs/subscriptionCron");
const socketService_1 = require("./services/socketService");
const portUtils_1 = require("./utils/portUtils");
dotenv_1.default.config();
// Global server instance for graceful shutdown
let httpServer = null;
let isShuttingDown = false;
/**
 * Graceful shutdown handler
 */
const gracefulShutdown = async (signal) => {
    if (isShuttingDown) {
        return;
    }
    isShuttingDown = true;
    console.log(`\n${signal} signal received: closing HTTP server gracefully`);
    if (httpServer) {
        httpServer.close((err) => {
            if (err) {
                console.error("Error during server shutdown:", err);
                process.exit(1);
            }
            console.log("HTTP server closed");
            process.exit(0);
        });
        // Force close after 10 seconds
        setTimeout(() => {
            console.error("Could not close connections in time, forcefully shutting down");
            process.exit(1);
        }, 10000);
    }
    else {
        process.exit(0);
    }
};
/**
 * Start server with port conflict handling
 */
const startServer = async () => {
    try {
        // Connect to database
        await (0, db_1.default)();
        // Start background jobs
        (0, subscriptionCron_1.startAllCronJobs)();
        const preferredPort = Number(process.env.PORT) || 5000;
        let PORT = preferredPort;
        // Try to find available port
        try {
            PORT = await (0, portUtils_1.findAvailablePort)(preferredPort);
            if (PORT !== preferredPort) {
                console.warn(`⚠️  Port ${preferredPort} is in use, switching to port ${PORT}`);
                // Optional: Try to kill process on preferred port in development
                if (process.env.NODE_ENV !== "production") {
                    console.log(`Attempting to free port ${preferredPort} (dev mode)...`);
                    const killed = await (0, portUtils_1.killProcessOnPort)(preferredPort);
                    if (killed) {
                        console.log(`✓ Successfully freed port ${preferredPort}`);
                        PORT = preferredPort;
                        // Wait a moment for port to be fully released
                        await new Promise((resolve) => setTimeout(resolve, 1000));
                    }
                }
            }
        }
        catch (error) {
            console.error("Error finding available port:", error);
            PORT = preferredPort; // Fallback to preferred port anyway
        }
        // Create HTTP server
        httpServer = http_1.default.createServer(app_1.default);
        // Initialize Socket.IO for live classroom
        (0, socketService_1.initializeSocketServer)(httpServer);
        // Error handling for server
        httpServer.on("error", async (error) => {
            if (error.code === "EADDRINUSE") {
                console.error(`❌ Port ${PORT} is still in use!`);
                console.log("Trying to find another available port...");
                try {
                    const nextPort = await (0, portUtils_1.findAvailablePort)(PORT + 1);
                    console.log(`✓ Found available port: ${nextPort}`);
                    PORT = nextPort;
                    // Retry with new port
                    setTimeout(() => {
                        httpServer?.listen(PORT);
                    }, 1000);
                }
                catch (err) {
                    console.error("Failed to find available port:", err);
                    process.exit(1);
                }
            }
            else {
                console.error("Server error:", error);
                process.exit(1);
            }
        });
        // Start listening
        httpServer.listen(PORT, () => {
            console.log(`✓ Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
            console.log("✓ Socket.IO server ready for live classroom sessions");
            if (PORT !== preferredPort) {
                console.log(`ℹ️  Update your frontend to use: http://localhost:${PORT}`);
            }
        });
    }
    catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};
// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    gracefulShutdown("UNCAUGHT_EXCEPTION");
});
// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    gracefulShutdown("UNHANDLED_REJECTION");
});
// Start the server
startServer();
