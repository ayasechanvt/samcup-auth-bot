import express from "express";
import nacl from "tweetnacl";

const app = express();

// Discord署名検証のため raw body を保持する
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  })
);

// Renderは PORT 環境変数を使う
const PORT = process.env.PORT || 3000;

// Developer Portal の「公開キー」
const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;

if (!PUBLIC_KEY) {
  console.error("DISCORD_PUBLIC_KEY が未設定です");
}

// 16進文字列 → Uint8Array
function hexToUint8Array(hex) {
  return new Uint8Array(Buffer.from(hex, "hex"));
}

// Discord署名検証
function verifyDiscordRequest(req) {
  const signature = req.get("X-Signature-Ed25519");
  const timestamp = req.get("X-Signature-Timestamp");

  if (!signature || !timestamp || !req.rawBody || !PUBLIC_KEY) {
    return false;
  }

  const isValid = nacl.sign.detached.verify(
    Buffer.concat([Buffer.from(timestamp), req.rawBody]),
    hexToUint8Array(signature),
    hexToUint8Array(PUBLIC_KEY)
  );

  return isValid;
}

app.get("/", (req, res) => {
  res.status(200).send("SAMCup auth bot is running");
});

app.post("/interactions", (req, res) => {
  // 署名検証
  if (!verifyDiscordRequest(req)) {
    return res.status(401).send("invalid request signature");
  }

  const interaction = req.body;

  // DiscordのPINGにPONGで返す
  if (interaction.type === 1) {
    return res.json({ type: 1 });
  }

  // いったん簡易テスト
  if (interaction.type === 2) {
    return res.json({
      type: 4,
      data: {
        content: "認証BOT接続テスト成功 👍"
      }
    });
  }

  return res.status(200).end();
});

app.listen(PORT, () => {
  console.log(`BOT started on port ${PORT}`);
});
