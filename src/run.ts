import { spawn } from "node:child_process";
import { join } from "node:path";

const commandForPlatform = (command: string) =>
  process.platform === "win32" ? `${command}.cmd` : command;

export const run = (
  command: string,
  args: string[],
  {
    cwd = process.cwd(),
    env = {},
  }: {
    cwd?: string;
    env?: Record<string, string>;
  } = {},
) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(commandForPlatform(command), args, {
      cwd,
      env: {
        ...process.env,
        ...env,
      },
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });

export const runLocalBin = (
  bin: string,
  args: string[],
  options: {
    cwd?: string;
    env?: Record<string, string>;
  } = {},
) => run(join("node_modules", ".bin", bin), args, options);
