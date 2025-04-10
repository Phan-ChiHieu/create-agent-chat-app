# Agent App Monorepo

This monorepo contains a Chat UI, and up to four pre-built LangGraph agents.

## Setup

First, install dependencies, if you didn't select the auto-install option when creating the app:

```bash
yarn install
# or
pnpm install
# or
npm install
```

Then, set the necessary environment variables:

```bash
cp .env.example .env
```

When running the Chat UI, it will prompt you to enter your deployment URL, assistant ID, and LangSmith API key. If you want to hardcode these values, and bypass the initial setup form, you can set the following environment variables inside `apps/web/.env`:

If using Vite:
```bash
VITE_API_URL=http://localhost:2024
VITE_ASSISTANT_ID=agent
```

If using Next.js:
```bash
NEXT_PUBLIC_API_URL=http://localhost:2024
NEXT_PUBLIC_ASSISTANT_ID=agent
```

> [!TIP]
> If you want to connect to a production LangGraph server, read the [Going to Production](apps/web/README.md#going-to-production) section in the Chat UI readme.

Once you have all the necessary environment variables set, you can run both the Chat UI, and agent server in dev mode:

```bash
yarn dev
# or
pnpm dev
# or
npm run dev
```

For more information on the agents, and Chat UI, read their respective READMEs:

- [Chat UI](apps/web/README.md)
- [Agents](apps/agents/README.md)
