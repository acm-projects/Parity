const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("Parity backend is running");
});

app.listen(3000, () => {
  console.log("Parity backend running on port 3000");
});