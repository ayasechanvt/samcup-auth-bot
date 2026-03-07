import express from "express";

const app = express();
app.use(express.json());

app.post("/interactions", (req, res) => {
  const interaction = req.body;

  // Discord接続確認（PING）
  if (interaction.type === 1) {
    return res.json({ type: 1 });
  }

  // テストコマンド
  if (interaction.type === 2) {
    return res.json({
      type: 4,
      data: {
        content: "認証BOT接続テスト成功 👍"
      }
    });
  }

  res.status(200).end();
});

app.listen(3000, () => {
  console.log("BOT started");
});
