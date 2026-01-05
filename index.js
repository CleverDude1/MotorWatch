import nacl from "tweetnacl";

const API_URL = "https://mainserver.serv00.net/DiscordbotAPI/API.php"; // Your light API

export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    const signature = request.headers.get("X-Signature-Ed25519");
    const timestamp = request.headers.get("X-Signature-Timestamp");

    if (!signature || !timestamp) return new Response("Missing signature", { status: 401 });

    const body = await request.clone().arrayBuffer();

    const isValid = nacl.sign.detached.verify(
      new Uint8Array([...new TextEncoder().encode(timestamp), ...new Uint8Array(body)]),
      hexToUint8(signature),
      hexToUint8(env.DISCORD_PUBLIC_KEY)
    );

    if (!isValid) return new Response("Invalid signature", { status: 401 });

    const interaction = JSON.parse(new TextDecoder().decode(body));

    if (interaction.type === 1) return json({ type: 1 }); // Ping

    if (interaction.type === 2) {
      const command = interaction.data.name.toLowerCase();

      // Step 1: Immediately send a deferred response
      const deferred = json({ type: 5 }); // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
      setTimeout(async () => {
        try {
          // Step 2: Fetch the data
          const players = await fetchPlayerData();
          let content;

          if (!players) {
            content = "❌ Unable to fetch player data.";
          } else if (players.length === 0) {
            content = "😴 No players online right now.";
          } else {
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
              else {
                content =
                  `🕒 **Recent Players (last 7 days)**\n` +
                  recent
                    .slice(0, 10)
                    .map((p) => `${p.nickname || "Unknown"} (${p.last_login})`)
                    .join("\n");
              }
            } else {
              content = "❓ Unknown command.";
            }
          }

          // Step 3: Update the deferred message
          await fetch(
            `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content }),
            }
          );
        } catch (err) {
          console.error("Error sending final message:", err);
        }
      }, 1000); // You can adjust 1000ms to 10000ms (10 seconds) if you want a delay

      return deferred;
    }

    return new Response("Unhandled interaction", { status: 400 });
  },
};

async function fetchPlayerData() {
  try {
    const res = await fetch(API_URL);
    return await res.json();
  } catch {
    return null;
  }
}

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}

function hexToUint8(hex) {
  return new Uint8Array(hex.match(/.{1,2}/g).map((b) => parseInt(b, 16)));
}
