#!/usr/bin/env node

import path from "path";
import fs from "fs-extra";
import chalk, { ChalkInstance } from "chalk";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import {
  BASE_GITIGNORE,
  NEXTJS_GITIGNORE,
  VITE_GITIGNORE,
} from "./gitignore.js";
import {
  intro,
  confirm,
  select,
  multiselect,
  isCancel,
  cancel,
  text,
} from "@clack/prompts";

// Get the directory name of the current module
const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = path.dirname(__filename);

type PackageManager = "npm" | "pnpm" | "yarn";
type Framework = "nextjs" | "vite";

/**
 * Whether or not specific prebuilt agents should be included
 * in the project. Each individual agent defaults to false.
 */
type IncludeAgents = {
  /**
   * @default false
   */
  includeReactAgent: boolean;
  /**
   * @default false
   */
  includeMemoryAgent: boolean;
  /**
   * @default false
   */
  includeResearchAgent: boolean;
  /**
   * @default false
   */
  includeRetrievalAgent: boolean;
};

interface ProjectAnswers extends IncludeAgents {
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
}

/**
 * Creates a .yarnrc.yml file in the base directory of the project.
 *
 * @param {string} baseDir - The base directory of the project
 * @param {ChalkInstance} chalk - The chalk instance for logging
 */
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
  } catch (_) {
    console.log(`${chalk.red("Error: ")} Failed to create ${fileName}`);
  }
}

/**
 * Sets the `packageManager` field in package.json, and the `overrides` field
 * to ensure the same version of @langchain/core is set across all workspaces.
 *
 * @param {PackageManager} packageManager - The package manager to use
 * @param {string} baseDir - The base directory of the project
 * @param {ChalkInstance} chalk - The chalk instance for logging
 */
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
  } catch (_) {
    console.log(
      `${chalk.red("Error: ")} Failed to set package manager in package.json`,
    );
  }
}

/**
 * Writes the .gitignore file for the project. This creates one in the root of the project,
 * along with one inside the web directory.
 *
 * @param {string} baseDir - The base directory of the project
 * @param {Framework} framework - The framework to use
 * @param {ChalkInstance} chalk - The chalk instance for logging
 */
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
  } catch (_) {
    console.log(`${chalk.red("Error: ")} Failed to write .gitignore`);
  }
}

/**
 * Updates the 'graph' field in the 'langgraph.json' configuration
 * file with the selected prebuilt agents.
 *
 * @param {string} baseDir - The base directory of the project
 * @param {ChalkInstance} chalk - The chalk instance for logging
 * @param {IncludeAgents} args The prebuilt agents which are included in the project
 */
async function updateLangGraphConfig(
  baseDir: string,
  chalk: ChalkInstance,
  args: IncludeAgents,
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
  } catch (_) {
    console.log(`${chalk.red("Error: ")} Failed to update LangGraph config`);
  }
}

/**
 * Creates a message to display to the user after the project has been created.
 *
 * @param {ChalkInstance} chalk - The chalk instance for logging
 * @param {PackageManager} packageManager - The package manager to use
 * @param {Framework} framework - The framework to use
 * @returns {string} The message to display
 */
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

/**
 * Updates the 'package.json' file inside the agents workspace to include
 * all the necessary dependencies for the selected agents.
 *
 * @param baseDir
 * @param {IncludeAgents} args The prebuilt agents which are included in the project
 * @param chalk
 */
async function setAgentPackageJsonFields(
  baseDir: string,
  args: IncludeAgents,
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
  } catch (_) {
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

/**
 * Creates a '.env.example' file containing all the required environment variables,
 * depending on the selected agents.
 *
 * @param {string} baseDir - The base directory of the project
 * @param {IncludeAgents} args The prebuilt agents which are included in the project
 * @param {ChalkInstance} chalk - The chalk instance for logging
 */
async function setEnvExampleFile(
  baseDir: string,
  args: IncludeAgents,
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
  } catch (_) {
    console.log(`${chalk.red("Error: ")} Failed to set env example file`);
  }
}

/**
 * PNPM manages workspaces differently than NPM/Yarn, so if the user
 * selects PNPM as their package manager, we need to create a pnpm-workspace.yaml
 * file, and remove the workspaces field from the root package.json file.
 *
 * @param {string} baseDir - The base directory of the project
 * @param {ChalkInstance} chalk - The chalk instance for logging
 */
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
  - 'apps/*'
`;
    await fs.promises.writeFile(pnpmWorkspacesPath, pnpmWorkspacesContents);
  } catch (_) {
    console.log(
      `${chalk.red("Error: ")} Failed to create pnpm workspaces file`,
    );
  }
}

/**
 * PNPM does not resolve the LangGraph Checkpoint package direct dependency
 * the same way NPM/Yarn do. For this reason, if the user selects PNPM as their
 * package manager, we need to explicitly install it in the 'agents' workspace.
 *
 * @param {string} baseDir - The base directory of the project
 * @param {ChalkInstance} chalk - The chalk instance for logging
 */
async function addPnpmDirectDependencyWorkaround(
  baseDir: string,
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
    const additionalPackages = {
      "@langchain/langgraph-checkpoint": "^0.0.16",
    };
    pkgJson.dependencies = {
      ...pkgJson.dependencies,
      ...additionalPackages,
    };
    await fs.promises.writeFile(
      agentsPkgJsonPath,
      JSON.stringify(pkgJson, null, 2),
    );
  } catch (_) {
    console.log(
      `${chalk.red("Error: ")} Failed to update agents package.json dependencies`,
    );
  }
}

async function promptUser(): Promise<ProjectAnswers> {
  intro(chalk.green(" create-agent-chat-app "));

  const projectNameResponse = await text({
    message: "What is the name of your project?",
    placeholder: "agent-chat-app",
    defaultValue: "agent-chat-app",
  });

  if (isCancel(projectNameResponse)) {
    cancel("Operation cancelled");
    process.exit(0);
  }
  const projectName = projectNameResponse as string;

  const packageManagerResponse = await select({
    message: "Which package manager would you like to use?",
    options: [
      { value: "npm", label: "npm" },
      { value: "pnpm", label: "pnpm" },
      { value: "yarn", label: "yarn" },
    ],
  });

  if (isCancel(packageManagerResponse)) {
    cancel("Operation cancelled");
    process.exit(0);
  }
  const packageManager = packageManagerResponse as PackageManager;

  const autoInstallDepsResponse = await confirm({
    message: "Would you like to automatically install dependencies?",
    initialValue: true,
  });

  if (isCancel(autoInstallDepsResponse)) {
    cancel("Operation cancelled");
    process.exit(0);
  }
  const autoInstallDeps = autoInstallDepsResponse as boolean;

  const frameworkResponse = await select({
    message: "Which framework would you like to use?",
    options: [
      { value: "nextjs", label: "Next.js" },
      { value: "vite", label: "Vite" },
    ],
  });

  if (isCancel(frameworkResponse)) {
    cancel("Operation cancelled");
    process.exit(0);
  }
  const framework = frameworkResponse as Framework;

  const selectedAgentsResponse = await multiselect({
    message:
      'Which pre-built agents would you like to include? (Press "space" to select/unselect)',
    options: [
      { value: "react", label: "ReAct Agent" },
      { value: "memory", label: "Memory Agent" },
      { value: "research", label: "Research Agent" },
      { value: "retrieval", label: "Retrieval Agent" },
    ],
    initialValues: ["react", "memory", "research", "retrieval"],
    required: false,
  });

  if (isCancel(selectedAgentsResponse)) {
    cancel("Operation cancelled");
    process.exit(0);
  }

  const selectedAgents = selectedAgentsResponse as string[];

  // Determine which agents are included
  const includeReactAgent = selectedAgents.includes("react");
  const includeMemoryAgent = selectedAgents.includes("memory");
  const includeResearchAgent = selectedAgents.includes("research");
  const includeRetrievalAgent = selectedAgents.includes("retrieval");

  // Combine all answers
  return {
    packageManager,
    autoInstallDeps,
    projectName,
    framework,
    includeReactAgent,
    includeMemoryAgent,
    includeResearchAgent,
    includeRetrievalAgent,
  };
}

async function init(): Promise<void> {
  // Get user input using our new promptUser function
  const answers = await promptUser();

  const { projectName, packageManager, autoInstallDeps, framework } = answers;

  // Create project directory
  const targetDir: string = path.join(process.cwd(), projectName);

  if (await fs.exists(targetDir)) {
    console.error(chalk.red(`Error: Directory ${projectName} already exists.`));
    process.exit(1);
  }

  // Log the collected values
  console.log(`Project will be created at: ${chalk.green(targetDir)}\n`);
  console.log(`Framework: ${chalk.green(framework)}`);

  const includesAgentSelectionsMap: IncludeAgents = {
    includeReactAgent: answers.includeReactAgent,
    includeMemoryAgent: answers.includeMemoryAgent,
    includeResearchAgent: answers.includeResearchAgent,
    includeRetrievalAgent: answers.includeRetrievalAgent,
  };

  if (Object.values(includesAgentSelectionsMap).every(Boolean)) {
    console.log(`Including: ${chalk.green("All pre-built agents")}`);
  } else {
    const selectedAgents = [];
    if (includesAgentSelectionsMap.includeReactAgent)
      selectedAgents.push("ReAct");
    if (includesAgentSelectionsMap.includeMemoryAgent)
      selectedAgents.push("Memory");
    if (includesAgentSelectionsMap.includeResearchAgent)
      selectedAgents.push("Research");
    if (includesAgentSelectionsMap.includeRetrievalAgent)
      selectedAgents.push("Retrieval");

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
  await fs.mkdir(targetDir, { recursive: true });

  // Copy the monorepo template to the target directory
  const monorepoTemplateDir: string = path.join(
    __dirname,
    "templates",
    "monorepo",
  );
  await fs.copy(monorepoTemplateDir, targetDir);

  await Promise.all([
    updateLangGraphConfig(targetDir, chalk, includesAgentSelectionsMap),
    setAgentPackageJsonFields(targetDir, includesAgentSelectionsMap, chalk),
    setEnvExampleFile(targetDir, includesAgentSelectionsMap, chalk),
  ]);

  // Create web directory inside apps and copy the framework template
  const appsDir: string = path.join(targetDir, "apps");
  const webDir: string = path.join(appsDir, "web");
  await fs.mkdir(webDir, { recursive: true });

  // Copy the framework template to the web directory
  const frameworkTemplateDir: string = path.join(
    __dirname,
    "templates",
    framework,
  );
  await fs.copy(frameworkTemplateDir, webDir);
  await writeGitignore(targetDir, framework, chalk);

  // Get the path to the agents src directory which already exists in the monorepo template
  const agentsDir: string = path.join(appsDir, "agents", "src");

  // Copy agent templates if selected - run in parallel for better performance
  const copyOperations = [];

  if (answers.includeReactAgent) {
    copyOperations.push(copyAgentTemplate("react-agent", agentsDir));
  }

  if (answers.includeMemoryAgent) {
    copyOperations.push(copyAgentTemplate("memory-agent", agentsDir));
  }

  if (answers.includeResearchAgent) {
    copyOperations.push(copyAgentTemplate("research-agent", agentsDir));
  }

  if (answers.includeRetrievalAgent) {
    copyOperations.push(copyAgentTemplate("retrieval-agent", agentsDir));
  }

  // Execute all copy operations concurrently
  await Promise.all(copyOperations);

  // Update root package.json with project name
  const rootPkgJsonPath: string = path.join(targetDir, "package.json");
  if (await fs.exists(rootPkgJsonPath)) {
    const rootPkgJson: Record<string, any> = JSON.parse(
      await fs.readFile(rootPkgJsonPath, "utf8"),
    );
    rootPkgJson.name = projectName;
    await fs.writeFile(rootPkgJsonPath, JSON.stringify(rootPkgJson, null, 2));
  }

  if (packageManager === "yarn") {
    await createYarnRcYml(targetDir, chalk);
  }
  if (packageManager === "pnpm") {
    await Promise.all([
      createPnpmWorkspacesFile(targetDir, chalk),
      addPnpmDirectDependencyWorkaround(targetDir, chalk),
    ]);
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
async function copyAgentTemplate(
  agentName: string,
  agentsDir: string,
): Promise<void> {
  const agentTemplateDir: string = path.join(__dirname, "templates", agentName);

  // Determine the destination directory for the agent
  const agentDestDir: string = path.join(agentsDir, agentName);

  // Create the destination directory if it doesn't exist
  await fs.mkdir(agentDestDir, { recursive: true });

  // Copy the agent template files
  await fs.copy(agentTemplateDir, agentDestDir);

  console.log(`${chalk.green("✓")} Added ${chalk.cyan(agentName)}`);
}

init().catch((err: Error) => {
  console.error(chalk.red("Error:"), err);
  process.exit(1);
});
