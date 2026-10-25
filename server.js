
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8085;
const CALENDAR_ICS_URL = process.env.CALENDAR_ICS_URL || "";

app.disable("x-powered-by");
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/calendar.ics", async (req, res) => {
  if (!CALENDAR_ICS_URL) {
    return res.status(503).json({
      error: "A CALENDAR_ICS_URL környezeti változó nincs beállítva."
    });
  }

  try {
    const response = await fetch(CALENDAR_ICS_URL, {
      headers: { "User-Agent": "HomeDashboard/1.0" },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      return res.status(502).json({
        error: `A naptár lekérése sikertelen: HTTP ${response.status}`
      });
    }

    const calendar = await response.text();

    if (!calendar.includes("BEGIN:VCALENDAR")) {
      return res.status(502).json({
        error: "A megadott cím nem érvényes iCalendar-fájl."
      });
    }

    res.set("Cache-Control", "private, max-age=300");
    res.type("text/calendar").send(calendar);
  } catch (error) {
    console.error("Calendar error:", error.message);
    res.status(502).json({ error: "A naptár jelenleg nem érhető el." });
  }
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }

  res.sendFile(path.join(__dirname, "public", "index.html"));
});


app.listen(PORT, "0.0.0.0", () => {
  console.log(`Dashboard running on port ${PORT}`);
});
