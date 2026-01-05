import express from "express";
import bodyParser from "body-parser";
import nacl from "tweetnacl";

const app = express();
app.use(bodyParser.json({ type: "*/*" }));

// ================= CONFIG =================
const API_URL = "https://mainserver.serv00.net/DiscordbotAPI/API.php"; // Light API
const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;

// ================= HELPERS =================
function hexToUint8(hex) {
  return new Uint8Array(hex.match(/.{1,2}/g).map((b) => parseInt(b, 16)));
}

async function fetchPlayerData() {
  try {
    const res = await fetch(API_URL);
    return await res.json();
  } catch {
    return null;
  }
}

// ================= DISCORD INTERACTIONS =================
app.post("/interactions", async (req, res) => {
  const signature = req.headers["x-signature-ed25519"];
  const timestamp = req.headers["x-signature-timestamp"];
  const body = JSON.stringify(req.body);

  if (!signature || !timestamp) return res.status(401).send("Missing signature");

  // Verify Discord request
  const isValid = nacl.sign.detached.verify(
    new Uint8Array([...new TextEncoder().encode(timestamp), ...new TextEncoder().encode(body)]),
    hexToUint8(signature),
    hexToUint8(DISCORD_PUBLIC_KEY)
  );

  if (!isValid) return res.status(401).send("Invalid signature");

  const interaction = req.body;

  // PING
  if (interaction.type === 1) return res.json({ type: 1 });

  // Slash commands
  if (interaction.type === 2) {
    const command = interaction.data.name.toLowerCase();

    // DEFER RESPONSE
    res.json({ type: 5 }); // Thinking...

    try {
      const players = await fetchPlayerData();
      let content;

      if (!players) content = "❌ Unable to fetch data.";
      else if (players.length === 0) content = "😴 No players online right now.";
      else {
        const now = Date.now();
        if (command === "online") {
          content =
            `🎮 **${players.length} players online:**\n` +
            players.map((p) => p.nickname || "Unknown").join("\n");
        } else if (command === "recent") {
          const recent = players.filter((p) => {
            if (!p.last_login) return false;
            const lastTime = Date.parse(p.last_login);
            return !isNaN(lastTime) && now - lastTime <= 7 * 24 * 60 * 60 * 1000;
          });

          if (recent.length === 0) content = "😴 No players played in the last 7 days.";
          else
            content =
              `🕒 **Recent Players (last 7 days)**\n` +
              recent
                .slice(0, 10)
                .map((p) => `${p.nickname || "Unknown"} (${p.last_login})`)
                .join("\n");
        } else {
          content = "❓ Unknown command.";
        }
      }

      // UPDATE ORIGINAL DEFERRED RESPONSE
      await fetch(
        `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      );
    } catch (err) {
      console.error(err);
    }
  } else {
    res.status(400).send("Unhandled interaction");
  }
});

// ================= SERVER LISTEN =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
});
