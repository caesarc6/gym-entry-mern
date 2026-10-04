import fs from "node:fs";

const configPath = new URL(
  "../ios/App/App/capacitor.config.json",
  import.meta.url,
);
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

if (config.server?.url) {
  console.error(
    `Store build still points at a live-reload server: ${config.server.url}`,
  );
  process.exit(1);
}

console.log("iOS store config has no live-reload server.url");
