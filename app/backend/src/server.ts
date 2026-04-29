import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupMcpClient } from './mcpClient.js';
import { handleAgentChat } from './agent.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const response = await handleAgentChat(message);
    res.json({ reply: response.text, data: response.data });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, async () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  await setupMcpClient();
});
