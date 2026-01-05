import express from "express";
import nacl from "tweetnacl";

const app = express();
app.use(express.raw({ type: "*/*" }));

/* ================= CONFIG ================= */
const API_URL = process.env.LIGHT_API_URL;
const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;

/* ================= ROUTE ================= */
app.post("/", async (req, res) => {
  const signature = req.headers["x-signature-ed25519"];
  const timestamp = req.headers["x-signature-timestamp"];

  if (!signature || !timestamp) {
    return res.status(401).send("Missing signature");
  }

  const isValid = nacl.sign.detached.verify(
    new Uint8Array([
      ...new TextEncoder().encode(timestamp),
      ...req.body,
    ]),
    hexToUint8(signature),
    hexToUint8(PUBLIC_KEY)
  );

  if (!isValid) {
    return res.status(401).send("Invalid signature");
  }

  const interaction = JSON.parse(req.body.toString());

  /* -------- Discord Ping -------- */
  if (interaction.type === 1) {
    return res.json({ type: 1 });
  }

  /* -------- Slash Command -------- */
  if (interaction.type === 2) {
    // ✅ IMMEDIATE RESPONSE
    res.json({
      type: 5 // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
    });

    // ⏳ Continue async work (Discord already satisfied)
    try {
      const response = await fetch(API_URL);
      const players = await response.json();

      const content =
        players.length === 0
          ? "😴 No players online."
          : "🎮 **Players Online:**\n" +
            players.map(p => p.nickname).join("\n");

      await fetch(
        `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content })
        }
      );
    } catch (e) {
      console.error(e);
    }
  }
});

/* ================= START ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Bot online"));

/* ================= HELPERS ================= */
function hexToUint8(hex) {
  return new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
}
