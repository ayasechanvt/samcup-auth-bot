import express from "express";
import nacl from "tweetnacl";

const app = express();

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  })
);

const PORT = process.env.PORT || 3000;
const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
const APP_ID = process.env.DISCORD_APP_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

function hexToUint8Array(hex) {
  return new Uint8Array(Buffer.from(hex, "hex"));
}

function verifyDiscordRequest(req) {
  const signature = req.get("X-Signature-Ed25519");
  const timestamp = req.get("X-Signature-Timestamp");

  if (!signature || !timestamp || !req.rawBody || !PUBLIC_KEY) {
    return false;
  }

  return nacl.sign.detached.verify(
    Buffer.concat([Buffer.from(timestamp), req.rawBody]),
    hexToUint8Array(signature),
    hexToUint8Array(PUBLIC_KEY)
  );
}

app.get("/", (req, res) => {
  res.status(200).send("SAMCup auth bot is running");
});

app.post("/interactions", async (req, res) => {
  if (!verifyDiscordRequest(req)) {
    return res.status(401).send("invalid request signature");
  }

  const interaction = req.body;

  // Discordの疎通確認
  if (interaction.type === 1) {
    return res.json({ type: 1 });
  }

  // /verify コマンドに反応
  if (interaction.type === 2 && interaction.data?.name === "verify") {
    return res.json({
      type: 4,
      data: {
        content: "認証コマンド受信OK 👍"
      }
    });
  }

  return res.status(200).end();
});

// /verify コマンドをDiscordに登録
async function registerCommands() {
  if (!APP_ID || !BOT_TOKEN) {
    console.log("DISCORD_APP_ID または DISCORD_BOT_TOKEN が未設定です");
    return;
  }

  const body = [
    {
      name: "verify",
      description: "SAM Cup参加認証を開始します"
    }
  ];

  const response = await fetch(
    `https://discord.com/api/v10/applications/${APP_ID}/commands`,
    {
      method: "PUT",
      headers: {
        "Authorization": `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  const text = await response.text();
  console.log("Command register status:", response.status, text);
}

app.listen(PORT, async () => {
  console.log(`BOT started on port ${PORT}`);
  await registerCommands();
});
