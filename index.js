import express from "express";
import { Client, GatewayIntentBits } from "discord.js";

const app = express();
const port = process.env.PORT || 3000;

// Simple route to keep Railway happy
app.get("/", (req, res) => {
  res.send("Bot is running!");
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Express server listening on port ${port}`);
});

// Discord bot setup
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("messageCreate", async (message) => {
  if (message.content === "!fetch") {
    // Step 1: send an initial reply
    await message.reply("Fetching data...");

    // Step 2: wait 10 seconds
    setTimeout(async () => {
      // Step 3: send the data reply
      await message.channel.send("Here is your data! 📊");
    }, 10000);
  }
});

client.login("YOUR_BOT_TOKEN");
