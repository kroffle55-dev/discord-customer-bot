const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("I'm alive!");
});

// Render가 제공하는 포트 사용
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});