
/*
 * Google Photos album:
 * Illeszd be az album megosztási linkjét a PHOTOS_ALBUM_URL értékéhez.
 *
 * Google Calendar:
 * A szerveren a CALENDAR_ICS_URL környezeti változót kell beállítani.
 */

const CONFIG = {
  photosAlbumUrl: "https://photos.app.goo.gl/L5uqmad2uirLZraH7/",
  latitude: 47.586,
  longitude: 18.394,
  timezone: "Europe/Budapest"
};

const $ = (id) => document.getElementById(id);

function formatNumber(value, maximumFractionDigits = 1) {
  return new Intl.NumberFormat("hu-HU", {
    maximumFractionDigits
  }).format(value);
}

function formatHuf(value) {
  return `${formatNumber(value, 2)} Ft`;
}

function setText(id, text) {
  const element = $(id);
  if (element) element.textContent = text;
}

function updateClock() {
  const now = new Date();

  setText("clock", new Intl.DateTimeFormat("hu-HU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: CONFIG.timezone
  }).format(now));

  setText("today", new Intl.DateTimeFormat("hu-HU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: CONFIG.timezone
  }).format(now));
}

function weatherInfo(code, isDay = true) {
  if (code === 0) return { icon: isDay ? "☀️" : "🌙", text: "Derült" };
  if (code === 1) return { icon: isDay ? "🌤️" : "🌙", text: "Többnyire derült" };
  if (code === 2) return { icon: "⛅", text: "Részben felhős" };
  if (code === 3) return { icon: "☁️", text: "Borult" };
  if ([45, 48].includes(code)) return { icon: "🌫️", text: "Ködös" };
  if ([51, 53, 55, 56, 57].includes(code)) return { icon: "🌦️", text: "Szitálás" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return { icon: "🌧️", text: "Esős" };
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: "🌨️", text: "Havas" };
  if ([95, 96, 99].includes(code)) return { icon: "⛈️", text: "Zivatar" };
  return { icon: "🌡️", text: "Változó idő" };
}

function formatDay(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat("hu-HU", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: CONFIG.timezone
  }).format(date);
}

async function loadWeather() {
  const url = new URL("https://api.open-meteo.com/v1/forecast");

  url.search = new URLSearchParams({
    latitude: CONFIG.latitude,
    longitude: CONFIG.longitude,
    timezone: CONFIG.timezone,
    forecast_days: "4",
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
    wind_speed_unit: "kmh"
  });

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Időjárási API-hiba");

    const data = await response.json();
    const current = data.current;
    const info = weatherInfo(current.weather_code, current.is_day === 1);

    setText("current-icon", info.icon);
    setText("current-temp", `${Math.round(current.temperature_2m)}°C`);
    setText("current-description", info.text);
    setText("current-wind", `${formatNumber(current.wind_speed_10m)} km/h`);
    setText("current-rain", `${formatNumber(current.precipitation)} mm`);
    setText("current-humidity", `${current.relative_humidity_2m}%`);
    setText("weather-updated", `Frissítve: ${new Date().toLocaleTimeString("hu-HU", {
      hour: "2-digit",
      minute: "2-digit"
    })}`);

    const forecast = $("forecast");
    forecast.replaceChildren();

    // A mai napot követő három nap.
    for (let i = 1; i <= 3; i++) {
      const dayInfo = weatherInfo(data.daily.weather_code[i]);
      const card = document.createElement("div");
      card.className = "forecast-day";

      const name = document.createElement("div");
      name.className = "forecast-name";
      name.textContent = formatDay(data.daily.time[i]);

      const icon = document.createElement("div");
      icon.className = "forecast-icon";
      icon.textContent = dayInfo.icon;

      const temps = document.createElement("div");
      temps.className = "forecast-temps";

      const high = document.createElement("span");
      high.className = "forecast-high";
      high.textContent = `${Math.round(data.daily.temperature_2m_max[i])}°`;

      const low = document.createElement("span");
      low.className = "forecast-low";
      low.textContent = `${Math.round(data.daily.temperature_2m_min[i])}°`;

      temps.append(high, low);

      const description = document.createElement("div");
      description.className = "forecast-description";
      description.textContent = dayInfo.text;

      const rain = document.createElement("div");
      rain.className = "forecast-detail";
      rain.innerHTML = "<span>🌧️ Csapadék</span>";

      const rainValue = document.createElement("strong");
      rainValue.textContent = `${formatNumber(data.daily.precipitation_sum[i])} mm`;
      rain.append(rainValue);

      const wind = document.createElement("div");
      wind.className = "forecast-detail";
      wind.innerHTML = "<span>💨 Max. szél</span>";

      const windValue = document.createElement("strong");
      windValue.textContent = `${formatNumber(data.daily.wind_speed_10m_max[i])} km/h`;
      wind.append(windValue);

      card.append(name, icon, temps, description, rain, wind);
      forecast.append(card);
    }
  } catch (error) {
    console.error(error);
    setText("current-description", "Az időjárás most nem érhető el.");
    setText("weather-updated", "Lekérési hiba");
    $("forecast").textContent = "Az előrejelzés jelenleg nem tölthető be.";
  }
}

async function loadExchangeRate() {
  try {
    const response = await fetch("https://api.frankfurter.dev/v1/latest?base=EUR&symbols=HUF");
    if (!response.ok) throw new Error("Árfolyam API-hiba");

    const data = await response.json();
    setText("eur-huf", formatHuf(data.rates.HUF));
    setText("eur-updated", `Dátum: ${data.date} · Frankfurter`);
  } catch (error) {
    console.error(error);
    setText("eur-huf", "Nem elérhető");
    setText("eur-updated", "Az árfolyam most nem tölthető be.");
  }
}

async function loadDogecoin() {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=dogecoin&vs_currencies=huf,usd"
    );
    if (!response.ok) throw new Error("CoinGecko API-hiba");

    const data = await response.json();
    const doge = data.dogecoin;

    setText("doge-huf", formatHuf(doge.huf));
    setText("doge-usd", `≈ ${formatNumber(doge.usd, 4)} USD · CoinGecko`);
  } catch (error) {
    console.error(error);
    setText("doge-huf", "Nem elérhető");
    setText("doge-usd", "Az árfolyam most nem tölthető be.");
  }
}

function unfoldIcs(text) {
  return text.replace(/\r?\n[ \t]/g, "");
}

function parseIcsDate(value) {
  // Google Calendar ICS formátum: YYYYMMDD vagy YYYYMMDDTHHMMSSZ.
  if (/^\d{8}$/.test(value)) {
    return new Date(
      Number(value.slice(0, 4)),
      Number(value.slice(4, 6)) - 1,
      Number(value.slice(6, 8))
    );
  }

  const match = value.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/
  );

  if (!match) return null;

  const [, y, mo, d, h, mi, s, utc] = match;
  if (utc) {
    return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
  }

  // A TZID-paraméteres helyi időket a szerver által küldött értékből
  // helyi időként értelmezzük; a legtöbb otthoni magyar naptárhoz megfelelő.
  return new Date(+y, +mo - 1, +d, +h, +mi, +s);
}

function decodeIcsText(value) {
  return value
    .replace(/\\n/g, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function parseEvents(ics) {
  const unfolded = unfoldIcs(ics);
  const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];

  return blocks.map((block) => {
    const lines = block.split(/\r?\n/);
    const event = {};

    for (const line of lines) {
      const separator = line.indexOf(":");
      if (separator < 0) continue;

      const keyPart = line.slice(0, separator);
      const value = line.slice(separator + 1);
      const key = keyPart.split(";")[0].toUpperCase();

      if (["SUMMARY", "DTSTART", "DTEND", "LOCATION"].includes(key)) {
        event[key] = key === "SUMMARY" || key === "LOCATION"
          ? decodeIcsText(value)
          : value;
      }
    }

    return {
      title: event.SUMMARY || "Névtelen esemény",
      start: parseIcsDate(event.DTSTART || ""),
      end: parseIcsDate(event.DTEND || ""),
      location: event.LOCATION || ""
    };
  }).filter((event) => event.start && !Number.isNaN(event.start.getTime()));
}

function renderCalendar(events) {
  const container = $("calendar-events");
  container.replaceChildren();

  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 14);

  const upcoming = events
    .filter((event) => event.start >= now && event.start <= cutoff)
    .sort((a, b) => a.start - b.start)
    .slice(0, 7);

  if (!upcoming.length) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "A következő 14 napban nincs megjeleníthető esemény.";
    container.append(empty);
    return;
  }

  for (const event of upcoming) {
    const row = document.createElement("div");
    row.className = "event";

    const date = document.createElement("div");
    date.className = "event-date";
    date.textContent = new Intl.DateTimeFormat("hu-HU", {
      weekday: "short",
      day: "numeric",
      month: "short"
    }).format(event.start);

    const details = document.createElement("div");

    const title = document.createElement("div");
    title.className = "event-title";
    title.textContent = event.title;

    const time = document.createElement("div");
    time.className = "event-time";

    const allDay = event.start.getHours() === 0 &&
      event.start.getMinutes() === 0 &&
      (!event.end || event.end.getHours() === 0 && event.end.getMinutes() === 0);

    time.textContent = allDay
      ? "Egész nap"
      : new Intl.DateTimeFormat("hu-HU", {
          hour: "2-digit",
          minute: "2-digit"
        }).format(event.start);

    if (event.location) {
      time.textContent += ` · ${event.location}`;
    }

    details.append(title, time);
    row.append(date, details);
    container.append(row);
  }
}

async function loadCalendar() {
  try {
    const response = await fetch("/api/calendar.ics", { cache: "no-store" });
    if (!response.ok) throw new Error("Naptár nem érhető el");

    const ics = await response.text();
    renderCalendar(parseEvents(ics));
  } catch (error) {
    console.error(error);
    const container = $("calendar-events");
    container.replaceChildren();

    const message = document.createElement("div");
    message.className = "muted";
    message.textContent =
      "A naptár nincs beállítva, vagy jelenleg nem érhető el. Állítsd be a CALENDAR_ICS_URL változót a tárhelyen.";
    container.append(message);
  }
}

function configurePhotos() {
  const link = $("photos-link");
  link.href = CONFIG.photosAlbumUrl;

  if (CONFIG.photosAlbumUrl === "https://photos.google.com/") {
    setText("photos-link", "Google Photos megnyitása ↗");
  } else {
    setText("photos-link", "Családi album megnyitása ↗");
  }
}

function setLastUpdated() {
  setText("last-updated", `Frissítve: ${new Date().toLocaleTimeString("hu-HU", {
    hour: "2-digit",
    minute: "2-digit"
  })}`);
}

async function refreshDashboard() {
  await Promise.allSettled([
    loadWeather(),
    loadExchangeRate(),
    loadDogecoin(),
    loadCalendar()
  ]);

  setLastUpdated();
}

updateClock();
configurePhotos();
refreshDashboard();

setInterval(updateClock, 15000);
setInterval(refreshDashboard, 10 * 60 * 1000);
