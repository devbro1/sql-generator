const { orderedWorkspaces, workspaces } = require("./get_dependency_tree");
const workspacePath = require("path").resolve(__dirname, "..");
const { execSync } = require("child_process");

const useBun = process.argv.includes("--bun");
const testScript = useBun ? "test:bun" : "test";

const wcs = orderedWorkspaces.filter(
  (wc) => workspaces[wc].packageJson?.tags?.needsCompile,
);

console.log(`Testing ${wcs.length} workspaces with ${testScript}...`);
for (const wc of wcs) {
  console.log(`Testing ${wc} with ${testScript}...`);
  try {
    execSync(`yarn workspace ${wc} ${testScript}`, {
      cwd: workspacePath,
      stdio: "inherit",
    });
    console.log(`Successfully tested ${wc} with ${testScript}`);
  } catch (error) {
    console.error(`Failed to run ${testScript} for ${wc}:`, error.message);
    process.exit(1);
  }
}
