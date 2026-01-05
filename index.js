import fetch from "node-fetch";

const API_URL = process.env.API_URL;
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// Check env variables
if (!API_URL || !WEBHOOK_URL) {
  console.error("❌ Missing API_URL or DISCORD_WEBHOOK_URL environment variable!");
  process.exit(1);
}

// Fetch players from API
async function fetchPlayers() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    // Convert object to array if necessary
    const playersArray = Array.isArray(data) ? data : Object.values(data);

    if (!Array.isArray(playersArray)) {
      console.error("❌ API did not return an array of players:", data);
      return [];
    }

    return playersArray;
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
          title: "🆕 Player Detected",
          description: `**${player.nickname}** is currently in the game.`,
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

// Check players and send webhooks
async function checkPlayers() {
  const players = await fetchPlayers();

  for (const player of players) {
    await sendWebhook(player);
  }
}

// Run every 60 seconds
setInterval(checkPlayers, 60 * 1000);

// Run immediately on startup
checkPlayers();
