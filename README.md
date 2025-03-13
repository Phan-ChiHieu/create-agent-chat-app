# create-agent-chat-app

A CLI tool to quickly set up an agent chat application with Vite. This code is based off of the [agent-chat-ui](https://github.com/langchain-ai/agent-chat-ui) repository.

> 💡 Tip
> Want to use Agent Chat, but don't want to set it up locally? Use the deployed site here: [agentchat.vercel.app](https://agentchat.vercel.app)

## Usage

Clone code:

```bash
# Using npx
npx create-agent-chat-app
```

Navigate into the project directory:

```bash
# agent-chat-app is the default project name
cd agent-chat-app
```

Install dependencies:

```bash
# agent-chat-app is configured to use pnpm by default
pnpm install
```

Start development server:

```bash
pnpm dev
```

Once the server is running, you can visit `http://localhost:5173` in your browser. From there, you'll be prompted to enter:

- **Deployment URL**: The API URL of your LangGraph server. This can be a local URL, or a deployed LangGraph server. You must have a LangGraph server running to connect to.
- **Assistant/Graph ID**: The name of the graph, or ID of the assistant to use when fetching, and submitting runs via the chat interface.
- **LangSmith API Key**: (only required for connecting to deployed LangGraph servers) Your LangSmith API key to use when authenticating requests sent to LangGraph servers.

After entering these values, click `Continue`. You'll then be redirected to a chat interface where you can start chatting with your LangGraph server.

## Features

- Quick setup of a LangGraph chat application
- Customizable deployment URL and graph/assistant ID
- Vite-based frontend for fast development
- Ready-to-use configuration

## License

MIT
