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
const REGISTER_SECRET = process.env.REGISTER_SECRET;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

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

// チェックインチャンネルに認証ボタン付きメッセージを送る
app.get("/post-checkin-button", async (req, res) => {
  const secret = req.query.secret;

  if (!REGISTER_SECRET || secret !== REGISTER_SECRET) {
    return res.status(403).send("forbidden");
  }

  if (!CHANNEL_ID || !BOT_TOKEN) {
    return res.status(500).send("DISCORD_CHANNEL_ID または DISCORD_BOT_TOKEN が未設定です");
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content:
            "参加認証が必要な方は、下のボタンを押してください。",
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 1,
                  label: "参加認証",
                  custom_id: "start_verify"
                }
              ]
            }
          ]
        })
      }
    );

    const text = await response.text();

    if (!response.ok) {
      console.error("post-checkin-button failed:", response.status, text);
      return res.status(500).send(`post failed: ${response.status} ${text}`);
    }

    return res.status(200).send("checkin button posted");
  } catch (err) {
    console.error("post-checkin-button error:", err);
    return res.status(500).send("post failed");
  }
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

  // ボタン押下時
  if (interaction.type === 3 && interaction.data?.custom_id === "start_verify") {
    return res.json({
      type: 4,
      data: {
        content: "参加認証ボタンを受け取りました 👍\n次はチーム番号入力に進む予定です。"
      }
    });
  }

  return res.status(200).end();
});

app.listen(PORT, () => {
  console.log(`BOT started on port ${PORT}`);
});
