import fetch from "node-fetch";
import fs from "fs";

const API_URL = process.env.API_URL;
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

const STATE_FILE = "./seenPlayers.json";

// Load seen players (persist across restarts)
let seenPlayers = new Set();

if (fs.existsSync(STATE_FILE)) {
  const data = JSON.parse(fs.readFileSync(STATE_FILE));
  seenPlayers = new Set(data);
}

async function fetchPlayers() {
  const res = await fetch(API_URL);
  return res.json();
}

async function sendWebhook(player) {
  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [{
        title: "🆕 New Player Detected",
        description: `**${player.name}** just appeared in the API.`,
        color: 0x00ff99,
        timestamp: new Date().toISOString()
      }]
    })
  });
}

async function checkForNewPlayers() {
  try {
    const players = await fetchPlayers();

    for (const player of players) {
      const id = player.id ?? player.name;

      if (!seenPlayers.has(id)) {
        seenPlayers.add(id);
        await sendWebhook(player);
      }
    }

    // Persist state
    fs.writeFileSync(STATE_FILE, JSON.stringify([...seenPlayers]));
  } catch (err) {
    console.error("Error checking players:", err.message);
  }
}

// Check every 60 seconds
setInterval(checkForNewPlayers, 60 * 1000);

// Run immediately on startup
checkForNewPlayers();
