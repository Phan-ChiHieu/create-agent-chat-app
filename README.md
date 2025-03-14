# create-agent-chat-app

A CLI tool to quickly set up an agent chat application with Vite. This code is based off of the [agent-chat-ui](https://github.com/langchain-ai/agent-chat-ui) repository.

> 💡 Tip
> Want to use Agent Chat, but don't want to set it up locally? Use the deployed site here: [agentchat.vercel.app](https://agentchat.vercel.app)

## Usage

Clone code:

```bash
# Using npx
npx create-agent-chat-app@latest
# or
yarn create agent-chat-app@latest
# or
pnpm create agent-chat-app@latest
# or
bunx create-agent-chat-app@latest
```

You'll then be prompted for the name of the project, the package manager, the web framework, and which, if any, agents to include by default:

```
✔ What is the name of your project?
✔ Which package manager would you like to use? › npm | pnpm | yarn
✔ Would you like to automatically install dependencies? … y / N
✔ Which framework would you like to use? › Next.js | Vite
✔ Would you like to include all pre-built agents? … y / N
```

If you select `y` for the question `Would you like to include all pre-built agents?`, it will include the following agents:

- [React Agent](https://github.com/langchain-ai/react-agent-js)
- [Memory Agent](https://github.com/langchain-ai/memory-agent-js)
- [Research Agent](https://github.com/langchain-ai/rag-research-agent-template-js)
- [Retrieval Agent](https://github.com/langchain-ai/retrieval-agent-template-js)

If you select `N`, it will prompt you one by one to select which agents to include.

```
✔ Include ReAct agent? › y / N
✔ Include Memory agent? › y / N
✔ Include Research agent? › y / N
✔ Include Retrieval agent? › y / N
```

After you finish the prompts, it will automatically create all the necessary files and folders in the project directory. If you selected auto-install dependencies, it will install them for you.

## Setup

Navigate into the project directory:

```bash
# agent-chat-app is the default project name
cd agent-chat-app
```

Copy the `.env.example` file to `.env`:

```bash
cp .env.example .env
```

This will contain all of the required secrets the agent(s) need in order to run.

Finally, start the development servers. This command will start both the web, and LangGraph servers:

```bash
npm run dev
# or
pnpm dev
# or
yarn dev
```

If you choose to run them independently, you can by either running the Turbo command from the root of the project:

Web:

```bash
npm turbo dev --filter=web
# or
pnpm turbo dev --filter=web
# or
yarn turbo dev --filter=web
```

LangGraph:

```bash
npm turbo dev --filter=agents
# or
pnpm turbo dev --filter=agents
# or
yarn turbo dev --filter=agents
```

Or, you can navigate into each workspace, and run `dev`:

Web:

```bash
cd apps/web

npm run dev
# or
pnpm dev
# or
yarn dev
```

LangGraph:

```bash
cd apps/agents

npm run dev
# or
pnpm dev
# or
yarn dev
```

Once the server is running, you can visit `http://localhost:3000` (or `http://localhost:5173` for Vite) in your browser. From there, you'll be prompted to enter:

- **Deployment URL**: The API URL of your LangGraph server. You should use the default value of `http://localhost:2024`, as this is what the LangGraph server which ships with this package is configured to run on.
- **Assistant/Graph ID**: The name of the graph, or ID of the assistant to use when fetching, and submitting runs via the chat interface. If you selected the ReAct agent, you can use the default value of `agent` to connect to it. Otherwise, consult the `langgraph.json` file to find the graph ID of the agent you would like to connect to.
- **LangSmith API Key**: This field is not required for local development. Your LangSmith API key to use when authenticating requests sent to LangGraph servers.

After entering these values, click `Continue`. You'll then be redirected to a chat interface where you can start chatting with your LangGraph server.

## Why use Create Agent Chat App?

This tool is a quick way to get started with a LangGraph chat application. It is based off of the [Agent Chat UI](https://github.com/langchain-ai/agent-chat-ui) repository, and ships by default with 4 pre-built agents.

Using the Agent Chat UI, you're able to interact, and chat with these agents.
