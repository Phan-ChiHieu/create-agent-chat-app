#!/usr/bin/env node

import path from "path";
import fs from "fs-extra";
import chalk, { ChalkInstance } from "chalk";
import { fileURLToPath } from "url";
import prompts from "prompts";
import { execSync } from "child_process";

// Get the directory name of the current module
const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = path.dirname(__filename);

type PackageManager = "npm" | "pnpm" | "yarn";

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
  framework: "nextjs" | "vite";
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
  fs.copySync(monorepoTemplateDir, targetDir, {
    dereference: true,
    filter: (_) => {
      // Ensure hidden files (like .gitignore) are copied
      return true;
    }
  });

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
  fs.copySync(frameworkTemplateDir, webDir, {
    dereference: true,
    filter: (_) => {
      // Ensure hidden files (like .gitignore) are copied
      return true;
    }
  });

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
