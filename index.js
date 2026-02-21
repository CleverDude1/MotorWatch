import fetch from "node-fetch";

const API_URL = process.env.API_URL;
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

if (!API_URL || !WEBHOOK_URL) {
  console.error("❌ Missing API_URL or DISCORD_WEBHOOK_URL environment variable!");
  process.exit(1);
}

// Fetch online users from your API
async function fetchPlayers() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    if (!data.success || !Array.isArray(data.users)) {
      console.error("❌ Invalid API response:", data);
      return [];
    }

    return data.users;

  } catch (err) {
    console.error("❌ Error fetching players:", err.message);
    return [];
  }
}

// Send Discord webhook
async function sendWebhook(player) {
  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          title: "🟢 Player Online",
          description: `**${player.display_name}** is active in the last 10 minutes.`,
          fields: [
            { name: "User ID", value: String(player.id), inline: true },
            { name: "Last Login", value: player.last_login, inline: true }
          ],
          color: 0x00ff99,
          timestamp: new Date().toISOString()
        }]
      })
    });

    console.log(`✅ Sent webhook for ${player.display_name}`);

  } catch (err) {
    console.error("❌ Error sending webhook:", err.message);
  }
}

// Main check loop
async function checkPlayers() {
  const players = await fetchPlayers();

  for (const player of players) {
    await sendWebhook(player);
  }
}

// Run every 60 seconds
setInterval(checkPlayers, 60 * 1000);

// Run immediately
checkPlayers();
