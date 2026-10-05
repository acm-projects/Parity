const express = require("express");
const supabase = require("./supabase");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Parity backend is running");
});

app.get("/figma-projects", async (req, res) => {
  const { data, error } = await supabase
    .from("figma_projects")
    .select("*");

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

app.listen(3000, () => {
  console.log("Parity backend running on port 3000");
});