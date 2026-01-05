import fetch from "node-fetch";
import fs from "fs";

const API_URL = process.env.API_URL;
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const STATE_FILE = "./seenPlayers.json";

// Check env variables
if (!API_URL || !WEBHOOK_URL) {
  console.error("❌ Missing API_URL or DISCORD_WEBHOOK_URL environment variable!");
  process.exit(1);
}

// Load seen players (persist across restarts)
let seenPlayers = new Set();
if (fs.existsSync(STATE_FILE)) {
  try {
    const data = JSON.parse(fs.readFileSync(STATE_FILE));
    seenPlayers = new Set(data);
  } catch (err) {
    console.warn("⚠ Could not read state file, starting fresh:", err.message);
  }
}

// Fetch players from API
async function fetchPlayers() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    if (!Array.isArray(data)) {
      console.error("❌ API did not return an array of players:", data);
      return [];
    }

    return data;
  } catch (err) {
    console.error("❌ Error fetching players:", err.message);
    return [];
  }
}

// Send message to Discord webhook
async function sendWebhook(player) {
  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          title: "🆕 New Player Detected",
          description: `**${player.nickname}** just appeared in the API.`,
          color: 0x00ff99,
          timestamp: new Date().toISOString()
        }]
      })
    });
    console.log(`✅ Sent webhook for player: ${player.nickname}`);
  } catch (err) {
    console.error("❌ Error sending webhook:", err.message);
  }
}

// Check for new players
async function checkForNewPlayers() {
  const players = await fetchPlayers();

  for (const player of players) {
    const id = player.nickname; // Use nickname as unique identifier

    if (!seenPlayers.has(id)) {
      seenPlayers.add(id);
      await sendWebhook(player);
    }
  }

  // Persist state
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify([...seenPlayers]));
  } catch (err) {
    console.error("❌ Error saving state:", err.message);
  }
}

// Run every 60 seconds
setInterval(checkForNewPlayers, 60 * 1000);

// Run immediately on startup
checkForNewPlayers();
