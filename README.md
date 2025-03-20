# create-agent-chat-app

A CLI tool to quickly set up a LangGraph agent chat application.

This will clone a frontend chat application (Next.js or Vite), along with up to 4 pre-built agents. You can use this code to get started with a LangGraph application, or to test out the pre-built agents!

![CLI Usage GIF](./static/demo.gif)

## Usage

### Quickstart

The quickest way to get started is to pass flags to the CLI, instead of going through the prompts:

```bash
# Pass `-Y`/`--yes` to accept all default values
npx create-agent-chat-app@latest -Y
```

You can also pass individual flags. Here are all of the options the CLI accepts, and their default values:

```bash
npx create-agent-chat-app@latest --help
```

```
Usage: create-agent-chat-app [options]

Create an agent chat app with one command

Options:
  -V, --version                output the version number
  -Y, --yes                    Skip all prompts and use default values
  --project-name <name>        Name of the project (default: "agent-chat-app")
  --package-manager <manager>  Package manager to use (npm, pnpm, yarn) (default: "yarn")
  --install-deps <boolean>     Automatically install dependencies (default: "true")
  --framework <framework>      Framework to use (nextjs, vite) (default: "nextjs")
  --include-agent <agent...>   Pre-built agents to include (react, memory, research, retrieval)
  -h, --help                   display help for command
```

If you want to pass some flags, and use the defaults for the rest, simply add `-Y`/`--yes`, in addition to the flags you want to pass:

```bash
npx create-agent-chat-app@latest -Y --package-manager pnpm
```

This will accept all default values, except for the package manager, which will be set to `pnpm`.

### Interactive

If you prefer to go through the prompts, you can run the following:

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
◇  What is the name of your project?
◇  Which package manager would you like to use? › npm | pnpm | yarn
◇  Would you like to automatically install dependencies? … y / N
◇  Which framework would you like to use? › Next.js | Vite
```

Then, you'll be prompted to select which agents to include. By default, all are selected.

The following agents are available:

- [React Agent](https://github.com/langchain-ai/react-agent-js)
- [Memory Agent](https://github.com/langchain-ai/memory-agent-js)
- [Research Agent](https://github.com/langchain-ai/rag-research-agent-template-js)
- [Retrieval Agent](https://github.com/langchain-ai/retrieval-agent-template-js)

```
◆  Which pre-built agents would you like to include? (Press "space" to select/unselect)
│  ◼ ReAct Agent
│  ◼ Memory Agent
│  ◼ Research Agent
│  ◼ Retrieval Agent
└
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
