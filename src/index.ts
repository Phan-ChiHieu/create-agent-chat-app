#!/usr/bin/env node

import path from "path";
import fs from "fs-extra";
import chalk, { ChalkInstance } from "chalk";
import { fileURLToPath } from "url";
import prompts from "prompts";
import { execSync } from "child_process";
import {
  BASE_GITIGNORE,
  NEXTJS_GITIGNORE,
  VITE_GITIGNORE,
} from "./gitignore.js";

// Get the directory name of the current module
const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = path.dirname(__filename);

type PackageManager = "npm" | "pnpm" | "yarn";
type Framework = "nextjs" | "vite";

interface ProjectAnswers {
  /**
   * @default "agent-chat-app"
   */
  projectName: string;
  /**
   * @default "npm"
   */
  packageManager: PackageManager;
  /**
   * @default true
   */
  autoInstallDeps: boolean;
  /**
   * @default "nextjs"
   */
  framework: Framework;
  /**
   * @default true
   */
  includeAllAgents: boolean;
  /**
   * This only runs if you set `includeAllAgents` to false.
   * @default false
   */
  includeReactAgent: boolean;
  /**
   * This only runs if you set `includeAllAgents` to false.
   * @default false
   */
  includeMemoryAgent: boolean;
  /**
   * This only runs if you set `includeAllAgents` to false.
   * @default false
   */
  includeResearchAgent: boolean;
  /**
   * This only runs if you set `includeAllAgents` to false.
   * @default false
   */
  includeRetrievalAgent: boolean;
}

async function createYarnRcYml(
  baseDir: string,
  chalk: ChalkInstance,
): Promise<void> {
  const yarnRcYmlContents = `nodeLinker: node-modules
`;
  const fileName = `.yarnrc.yml`;

  try {
    await fs.promises.writeFile(
      path.join(baseDir, fileName),
      yarnRcYmlContents,
    );
  } catch (e) {
    console.log(`${chalk.red("Error: ")} Failed to create ${fileName}`);
  }
}

async function setPackageJsonFields(
  packageManager: PackageManager,
  baseDir: string,
  chalk: ChalkInstance,
): Promise<void> {
  // Add the `packageManager` field to package.json
  const pkgManagerMap = {
    yarn: "yarn@3.5.1",
    pnpm: "pnpm@10.6.3",
    npm: "npm@11.2.1",
  };

  // Overrides to ensure the same version of @langchain/core is set across all workspaces.
  const overridesPkgManagerMap = {
    yarn: "resolutions",
    pnpm: "resolutions",
    npm: "overrides",
  };

  try {
    const pkgJsonPath = path.join(baseDir, "package.json");
    const pkgJson: Record<string, any> = JSON.parse(
      await fs.promises.readFile(pkgJsonPath, "utf8"),
    );
    pkgJson.packageManager = `${pkgManagerMap[packageManager]}`;
    pkgJson[overridesPkgManagerMap[packageManager]] = {
      "@langchain/core": "^0.3.42",
    };
    await fs.promises.writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
  } catch (e) {
    console.log(
      `${chalk.red("Error: ")} Failed to set package manager in package.json`,
    );
  }
}

async function writeGitignore(
  baseDir: string,
  framework: Framework,
  chalk: ChalkInstance,
): Promise<void> {
  try {
    const gitignorePath = path.join(baseDir, ".gitignore");
    // Write the base .gitignore file in the root
    await fs.promises.writeFile(gitignorePath, BASE_GITIGNORE);

    // write the framework-specific .gitignore file inside baseDir/apps/web
    const frameworkGitignorePath = path.join(
      baseDir,
      "apps",
      "web",
      ".gitignore",
    );
    if (framework === "nextjs") {
      await fs.promises.writeFile(frameworkGitignorePath, NEXTJS_GITIGNORE);
    } else {
      await fs.promises.writeFile(frameworkGitignorePath, VITE_GITIGNORE);
    }
  } catch (e) {
    console.error(e);
    console.log(`${chalk.red("Error: ")} Failed to write .gitignore`);
  }
}

async function updateLangGraphConfig(
  baseDir: string,
  chalk: ChalkInstance,
  args: {
    includeReactAgent: boolean;
    includeMemoryAgent: boolean;
    includeResearchAgent: boolean;
    includeRetrievalAgent: boolean;
  },
): Promise<void> {
  try {
    const langGraphConfigPath = path.join(baseDir, "langgraph.json");
    const config: Record<string, any> = JSON.parse(
      await fs.promises.readFile(langGraphConfigPath, "utf8"),
    );
    if (args.includeReactAgent) {
      config.graphs["agent"] = "./apps/agents/src/react-agent/graph.ts:graph";
    }
    if (args.includeMemoryAgent) {
      config.graphs["memory_agent"] =
        "./apps/agents/src/memory-agent/graph.ts:graph";
    }
    if (args.includeResearchAgent) {
      config.graphs["research_agent"] =
        "./apps/agents/src/research-agent/retrieval-graph/graph.ts:graph";
      config.graphs["research_index_graph"] =
        "./apps/agents/src/research-agent/index-graph/graph.ts:graph";
    }
    if (args.includeRetrievalAgent) {
      config.graphs["retrieval_agent"] =
        "./apps/agents/src/retrieval-agent/graph.ts:graph";
    }
    await fs.promises.writeFile(
      langGraphConfigPath,
      JSON.stringify(config, null, 2) + "\n",
    );
  } catch (e) {
    console.log(`${chalk.red("Error: ")} Failed to update LangGraph config`);
  }
}

const createStartServersMessage = (
  chalk: ChalkInstance,
  packageManager: PackageManager,
  framework: "nextjs" | "vite",
): string => {
  return `Then, start both the web, and LangGraph development servers with one command:
  ${chalk.cyan(`${packageManager} dev`)}

This will start the web server at:
  ${chalk.cyan(framework === "nextjs" ? "http://localhost:3000" : "http://localhost:5173")}

And the LangGraph server at:
  ${chalk.cyan("http://localhost:2024")}`;
};

const AGENT_DEPENDENCIES_MAP = {
  "react-agent": {
    "@langchain/community": "^0.3.35",
    "@langchain/anthropic": "^0.3.15",
  },
  "memory-agent": {
    "@langchain/anthropic": "^0.3.15",
  },
  "research-agent": {
    "@langchain/anthropic": "^0.3.15",
    "@elastic/elasticsearch": "^8.17.1",
    "@langchain/community": "^0.3.35",
    "@langchain/pinecone": "^0.2.0",
    "@langchain/mongodb": "^0.1.0",
    mongodb: "^6.14.2",
    "@pinecone-database/pinecone": "^5.1.1",
    "@langchain/cohere": "^0.3.2",
    "@langchain/openai": "^0.4.4",
  },
  "retrieval-agent": {
    "@langchain/anthropic": "^0.3.15",
    "@elastic/elasticsearch": "^8.17.1",
    "@langchain/community": "^0.3.35",
    "@langchain/pinecone": "^0.2.0",
    "@langchain/mongodb": "^0.1.0",
    mongodb: "^6.14.2",
    "@pinecone-database/pinecone": "^5.1.1",
    "@langchain/cohere": "^0.3.2",
    "@langchain/openai": "^0.4.4",
  },
};

async function setAgentPackageJsonFields(
  baseDir: string,
  args: {
    includeReactAgent: boolean;
    includeMemoryAgent: boolean;
    includeResearchAgent: boolean;
    includeRetrievalAgent: boolean;
  },
  chalk: ChalkInstance,
): Promise<void> {
  try {
    const agentsPkgJsonPath = path.join(
      baseDir,
      "apps",
      "agents",
      "package.json",
    );
    const pkgJson: Record<string, any> = JSON.parse(
      await fs.promises.readFile(agentsPkgJsonPath, "utf8"),
    );
    const requiredPackages: Record<string, string> = {};
    if (args.includeReactAgent) {
      Object.assign(requiredPackages, AGENT_DEPENDENCIES_MAP["react-agent"]);
    }
    if (args.includeMemoryAgent) {
      Object.assign(requiredPackages, AGENT_DEPENDENCIES_MAP["memory-agent"]);
    }
    if (args.includeResearchAgent) {
      Object.assign(requiredPackages, AGENT_DEPENDENCIES_MAP["research-agent"]);
    }
    if (args.includeRetrievalAgent) {
      Object.assign(
        requiredPackages,
        AGENT_DEPENDENCIES_MAP["retrieval-agent"],
      );
    }
    pkgJson.dependencies = {
      ...pkgJson.dependencies,
      ...requiredPackages,
    };
    await fs.promises.writeFile(
      agentsPkgJsonPath,
      JSON.stringify(pkgJson, null, 2),
    );
  } catch (e) {
    console.log(
      `${chalk.red("Error: ")} Failed to set agent package.json fields`,
    );
  }
}

const AGENT_ENV_VARS_MAP = {
  "react-agent": ["TAVILY_API_KEY", "ANTHROPIC_API_KEY"],
  "memory-agent": ["ANTHROPIC_API_KEY"],
  "research-agent": [
    "ANTHROPIC_API_KEY",
    "ELASTICSEARCH_URL",
    "ELASTICSEARCH_USER",
    "ELASTICSEARCH_PASSWORD",
    "ELASTICSEARCH_API_KEY",
    "MONGODB_URI",
    "PINECONE_API_KEY",
    "PINECONE_ENVIRONMENT",
    "PINECONE_INDEX_NAME",
    "COHERE_API_KEY",
    "OPENAI_API_KEY",
  ],
  "retrieval-agent": [
    "ANTHROPIC_API_KEY",
    "ELASTICSEARCH_URL",
    "ELASTICSEARCH_USER",
    "ELASTICSEARCH_PASSWORD",
    "ELASTICSEARCH_API_KEY",
    "MONGODB_URI",
    "PINECONE_API_KEY",
    "PINECONE_ENVIRONMENT",
    "PINECONE_INDEX_NAME",
    "COHERE_API_KEY",
    "OPENAI_API_KEY",
  ],
};

async function setEnvExampleFile(
  baseDir: string,
  args: {
    includeReactAgent: boolean;
    includeMemoryAgent: boolean;
    includeResearchAgent: boolean;
    includeRetrievalAgent: boolean;
  },
  chalk: ChalkInstance,
): Promise<void> {
  try {
    const envExamplePath = path.join(baseDir, ".env.example");
    const requiredEnvVarsSet = new Set<string>();
    if (args.includeReactAgent) {
      AGENT_ENV_VARS_MAP["react-agent"].forEach((v) =>
        requiredEnvVarsSet.add(v),
      );
    }
    if (args.includeMemoryAgent) {
      AGENT_ENV_VARS_MAP["memory-agent"].forEach((v) =>
        requiredEnvVarsSet.add(v),
      );
    }
    if (args.includeResearchAgent) {
      AGENT_ENV_VARS_MAP["research-agent"].forEach((v) =>
        requiredEnvVarsSet.add(v),
      );
    }
    if (args.includeRetrievalAgent) {
      AGENT_ENV_VARS_MAP["retrieval-agent"].forEach((v) =>
        requiredEnvVarsSet.add(v),
      );
    }
    const requiredEnvVars = Array.from(requiredEnvVarsSet);
    const baseEnvVars = `# LANGSMITH_API_KEY=""
# LANGSMITH_TRACING_V2="true"
# LANGSMITH_PROJECT="default"`;

    const envExampleContent = `${baseEnvVars}\n\n${requiredEnvVars
      .map((envVar) => `${envVar}=""`)
      .join("\n")}`;
    await fs.promises.writeFile(envExamplePath, envExampleContent);
  } catch (e) {
    console.log(`${chalk.red("Error: ")} Failed to set env example file`);
  }
}

async function createPnpmWorkspacesFile(
  baseDir: string,
  chalk: ChalkInstance,
): Promise<void> {
  try {
    // first read package.json file
    const packageJsonPath = path.join(baseDir, "package.json");
    const packageJson: Record<string, any> = JSON.parse(
      await fs.promises.readFile(packageJsonPath, "utf8"),
    );
    // Remove the workspaces field
    delete packageJson.workspaces;
    // Write the updated package.json file
    await fs.promises.writeFile(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2),
    );

    const pnpmWorkspacesPath = path.join(baseDir, "pnpm-workspace.yaml");
    const pnpmWorkspacesContents = `packages:
  - 'packages/*'
`;
    await fs.promises.writeFile(pnpmWorkspacesPath, pnpmWorkspacesContents);
  } catch (e) {
    console.log(
      `${chalk.red("Error: ")} Failed to create pnpm workspaces file`,
    );
  }
}

async function init(): Promise<void> {
  console.log(`
  ${chalk.green("Welcome to create-agent-chat-app!")}
  Let's set up your new agent chat application.
  `);

  // Collect user input for project name and framework
  const initialQuestions = await prompts([
    {
      type: "text",
      name: "projectName",
      message: "What is the name of your project?",
      initial: "agent-chat-app",
    },
    {
      type: "select",
      name: "packageManager",
      message: "Which package manager would you like to use?",
      choices: [
        { title: "npm", value: "npm" },
        { title: "pnpm", value: "pnpm" },
        { title: "yarn", value: "yarn" },
      ],
      initial: 0,
    },
    {
      type: "confirm",
      name: "autoInstallDeps",
      message: "Would you like to automatically install dependencies?",
      initial: true,
    },
    {
      type: "select",
      name: "framework",
      message: "Which framework would you like to use?",
      choices: [
        { title: "Next.js", value: "nextjs", selected: true },
        { title: "Vite", value: "vite" },
      ],
      initial: 0,
    },
    {
      type: "confirm",
      name: "includeAllAgents",
      message: "Would you like to include all pre-built agents?",
      initial: true,
    },
  ]);

  // If user doesn't want all agents, ask which specific ones they want
  let agentSelections: {
    includeReactAgent?: boolean;
    includeMemoryAgent?: boolean;
    includeResearchAgent?: boolean;
    includeRetrievalAgent?: boolean;
  } = {
    includeReactAgent: false,
    includeMemoryAgent: false,
    includeResearchAgent: false,
    includeRetrievalAgent: false,
  };

  if (!initialQuestions.includeAllAgents) {
    agentSelections = await prompts([
      {
        type: "confirm",
        name: "includeReactAgent",
        message: "Include ReAct agent?",
        initial: false,
      },
      {
        type: "confirm",
        name: "includeMemoryAgent",
        message: "Include Memory agent?",
        initial: false,
      },
      {
        type: "confirm",
        name: "includeResearchAgent",
        message: "Include Research agent?",
        initial: false,
      },
      {
        type: "confirm",
        name: "includeRetrievalAgent",
        message: "Include Retrieval agent?",
        initial: false,
      },
    ]);
  }

  // Combine all answers
  const answers: ProjectAnswers = {
    packageManager: initialQuestions.packageManager,
    autoInstallDeps: initialQuestions.autoInstallDeps,
    projectName: initialQuestions.projectName,
    framework: initialQuestions.framework,
    includeAllAgents: initialQuestions.includeAllAgents,
    includeReactAgent:
      initialQuestions.includeAllAgents || !!agentSelections.includeReactAgent,
    includeMemoryAgent:
      initialQuestions.includeAllAgents || !!agentSelections.includeMemoryAgent,
    includeResearchAgent:
      initialQuestions.includeAllAgents ||
      !!agentSelections.includeResearchAgent,
    includeRetrievalAgent:
      initialQuestions.includeAllAgents ||
      !!agentSelections.includeRetrievalAgent,
  };

  const { projectName, packageManager, autoInstallDeps, framework } = answers;

  // Create project directory
  const targetDir: string = path.join(process.cwd(), projectName);

  if (fs.existsSync(targetDir)) {
    console.error(chalk.red(`Error: Directory ${projectName} already exists.`));
    process.exit(1);
  }

  // Log the collected values
  console.log(`Project will be created at: ${chalk.green(targetDir)}\n`);
  console.log(`Framework: ${chalk.green(framework)}`);

  if (answers.includeAllAgents) {
    console.log(`Including: ${chalk.green("All pre-built agents")}`);
  } else {
    const selectedAgents = [];
    if (answers.includeReactAgent) selectedAgents.push("ReAct");
    if (answers.includeMemoryAgent) selectedAgents.push("Memory");
    if (answers.includeResearchAgent) selectedAgents.push("Research");
    if (answers.includeRetrievalAgent) selectedAgents.push("Retrieval");

    if (selectedAgents.length > 0) {
      console.log(
        `Including agents: ${chalk.green(selectedAgents.join(", "))}`,
      );
    } else {
      console.log(`No additional agents selected.`);
    }
  }

  console.log(chalk.yellow("Creating project files..."));

  // Create the project directory
  fs.mkdirSync(targetDir, { recursive: true });

  // Copy the monorepo template to the target directory
  const monorepoTemplateDir: string = path.join(
    __dirname,
    "templates",
    "monorepo",
  );
  fs.copySync(monorepoTemplateDir, targetDir);

  const includesAgentSelectionsMap = {
    includeReactAgent: answers.includeReactAgent,
    includeMemoryAgent: answers.includeMemoryAgent,
    includeResearchAgent: answers.includeResearchAgent,
    includeRetrievalAgent: answers.includeRetrievalAgent,
  };

  await updateLangGraphConfig(targetDir, chalk, includesAgentSelectionsMap);
  await setAgentPackageJsonFields(targetDir, includesAgentSelectionsMap, chalk);
  await setEnvExampleFile(targetDir, includesAgentSelectionsMap, chalk);

  // Create web directory inside apps and copy the framework template
  const appsDir: string = path.join(targetDir, "apps");
  const webDir: string = path.join(appsDir, "web");
  fs.mkdirSync(webDir, { recursive: true });

  // Copy the framework template to the web directory
  const frameworkTemplateDir: string = path.join(
    __dirname,
    "templates",
    framework,
  );
  fs.copySync(frameworkTemplateDir, webDir);
  await writeGitignore(targetDir, framework, chalk);

  // Get the path to the agents src directory which already exists in the monorepo template
  const agentsDir: string = path.join(appsDir, "agents", "src");

  // Copy agent templates if selected
  if (answers.includeAllAgents || answers.includeReactAgent) {
    copyAgentTemplate("react-agent", agentsDir);
  }

  if (answers.includeAllAgents || answers.includeMemoryAgent) {
    copyAgentTemplate("memory-agent", agentsDir);
  }

  if (answers.includeAllAgents || answers.includeResearchAgent) {
    copyAgentTemplate("research-agent", agentsDir);
  }

  if (answers.includeAllAgents || answers.includeRetrievalAgent) {
    copyAgentTemplate("retrieval-agent", agentsDir);
  }

  // Update root package.json with project name
  const rootPkgJsonPath: string = path.join(targetDir, "package.json");
  if (fs.existsSync(rootPkgJsonPath)) {
    const rootPkgJson: Record<string, any> = JSON.parse(
      fs.readFileSync(rootPkgJsonPath, "utf8"),
    );
    rootPkgJson.name = projectName;
    fs.writeFileSync(rootPkgJsonPath, JSON.stringify(rootPkgJson, null, 2));
  }

  if (packageManager === "yarn") {
    await createYarnRcYml(targetDir, chalk);
  }
  if (packageManager === "pnpm") {
    await createPnpmWorkspacesFile(targetDir, chalk);
  }

  await setPackageJsonFields(packageManager, targetDir, chalk);

  // Install dependencies if autoInstallDeps is true
  if (autoInstallDeps) {
    console.log(chalk.yellow("\nInstalling dependencies..."));
    try {
      // Navigate to the project directory and run the install command
      process.chdir(targetDir);
      execSync(`${packageManager} install`, { stdio: "inherit" });
      console.log(chalk.green("\nDependencies installed successfully!"));

      console.log(chalk.green("\nSuccess!"));
      console.log(`
  Your agent chat app has been created at ${chalk.green(targetDir)}
  
  To get started:
    ${chalk.cyan(`cd ${projectName}`)}
  
  ${createStartServersMessage(chalk, packageManager, framework)}
      `);
    } catch (error) {
      console.error(chalk.red("\nFailed to install dependencies:"), error);
      console.log(`
  Your agent chat app has been created, but dependencies could not be installed automatically.
  
  To get started:
    ${chalk.cyan(`cd ${projectName}`)}
    ${chalk.cyan(`${packageManager} install`)}

  ${createStartServersMessage(chalk, packageManager, framework)}
      `);
    }

    // Return early to not output the logs for when no auto install is requested.
    return;
  }

  // No auto install
  console.log(chalk.green("\nSuccess!"));
  console.log(`
Your agent chat app has been created at ${chalk.green(targetDir)}

To get started:
  ${chalk.cyan(`cd ${projectName}`)}
  ${chalk.cyan(`${packageManager} install`)}

${createStartServersMessage(chalk, packageManager, framework)}
  `);
}

// Helper function to copy agent templates
function copyAgentTemplate(agentName: string, agentsDir: string): void {
  const agentTemplateDir: string = path.join(__dirname, "templates", agentName);

  // Determine the destination directory for the agent
  const agentDestDir: string = path.join(agentsDir, agentName);

  // Create the destination directory if it doesn't exist
  fs.mkdirSync(agentDestDir, { recursive: true });

  // Copy the agent template files
  fs.copySync(agentTemplateDir, agentDestDir);

  console.log(`${chalk.green("✓")} Added ${chalk.cyan(agentName)}`);
}

init().catch((err: Error) => {
  console.error(chalk.red("Error:"), err);
  process.exit(1);
});
