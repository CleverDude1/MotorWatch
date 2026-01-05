import http from "http";
import nacl from "tweetnacl";

/* ========= CONFIG ========= */
const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;

/* ========= SERVER ========= */
const server = http.createServer(async (req, res) => {
  // ---- Allow GET (health check) ----
  if (req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("MotorWatch bot is online");
    return;
  }

  // ---- Only POST beyond this point ----
  if (req.method !== "POST") {
    res.writeHead(405);
    res.end("Method Not Allowed");
    return;
  }

  let body = "";
  for await (const chunk of req) {
    body += chunk;
  }

  const signature = req.headers["x-signature-ed25519"];
  const timestamp = req.headers["x-signature-timestamp"];

  if (!signature || !timestamp) {
    res.writeHead(401);
    res.end("Missing signature");
    return;
  }

  const isValid = nacl.sign.detached.verify(
    Buffer.concat([
      Buffer.from(timestamp),
      Buffer.from(body),
    ]),
    Buffer.from(signature, "hex"),
    Buffer.from(DISCORD_PUBLIC_KEY, "hex")
  );

  if (!isValid) {
    res.writeHead(401);
    res.end("Invalid signature");
    return;
  }

  const interaction = JSON.parse(body);

  // ---- Discord PING ----
  if (interaction.type === 1) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ type: 1 }));
    return;
  }

  // ---- Slash command response ----
  if (interaction.type === 2) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      type: 4,
      data: {
        content: "✅ MotorWatch is responding correctly!"
      }
    }));
    return;
  }

  res.writeHead(400);
  res.end("Unhandled interaction");
});

/* ========= START ========= */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`MotorWatch running on port ${PORT}`);
});
