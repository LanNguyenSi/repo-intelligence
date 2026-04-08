/**
 * Reset command - clear metrics database
 */

import chalk from "chalk";
import { resetDb } from "../lib/db.js";
import { createInterface } from "readline";

export async function resetData(options: { force?: boolean }): Promise<void> {
  if (!options.force) {
    const confirmed = await confirm("This will delete all tracked metrics. Are you sure? (y/N) ");
    if (!confirmed) {
      console.log(chalk.yellow("Aborted."));
      return;
    }
  }

  resetDb();
  console.log(chalk.green("✓ All metrics have been cleared."));
}

function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}
