import { MCPServer } from "mcp-framework";
import dotenv from "dotenv";

dotenv.config();

class MyMCPServer {
    private server: MCPServer;

    constructor() {
        this.server = new MCPServer({
            name: "my-mcp-server",
            version: "1.0.0",
            transport: { type: "stdio" }
        });

        // Handle process signals
        process.on('SIGINT', () => this.shutdown());
        process.on('SIGTERM', () => this.shutdown());
    }

    async start() {
        try {
            await this.server.start();
        } catch (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
    }

    private async shutdown() {
        console.error('Shutting down...');
        try {
            await this.server.stop();
            process.exit(0);
        } catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
        }
    }
}

// Start the server
new MyMCPServer().start().catch(console.error);