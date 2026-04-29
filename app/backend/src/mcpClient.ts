import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

let mcpClient: Client | null = null;

export const setupMcpClient = async () => {
  const command = process.env.MCP_SERVER_COMMAND;
  const args = process.env.MCP_SERVER_ARGS ? process.env.MCP_SERVER_ARGS.split(',') : [];

  if (!command) {
    console.warn('MCP_SERVER_COMMAND is not set. Running in mock mode.');
    return;
  }

  const transport = new StdioClientTransport({
    command,
    args,
  });

  mcpClient = new Client({
    name: 'geospatial-app-backend',
    version: '1.0.0',
  }, {
    capabilities: {}
  });

  try {
    await mcpClient.connect(transport);
    console.log('Connected to MLIT Geospatial MCP Server');
  } catch (error) {
    console.error('Failed to connect to MCP Server:', error);
  }
};

export const getMcpClient = () => mcpClient;
