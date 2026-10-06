
const http = require("http");
const fs = require("fs");
const path = require("path");

// ---------- The string functions ----------
const tools = {
  uppercase: { label: "Uppercase", fn: (s) => s.toUpperCase() },

  lowercase: { label: "Lowercase", fn: (s) => s.toLowerCase() },
  
  reverse: { label: "Reverse text", fn: (s) => [...s].reverse().join("") },
  
  palindrome: {
    label: "Palindrome check",
    fn: (s) => {
      const clean = s.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!clean) return "Enter some letters or numbers first.";
      return clean === [...clean].reverse().join("")
        ? "Yes, it is a palindrome."
        : "No, it is not a palindrome.";
    },
  },
};

// ---------- Build the page from index.html ----------
const escapeHtml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function page(input = "", selected = "uppercase", output = null) {
  const template = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

  const options = Object.entries(tools)
    .map(([key, t]) => `<option value="${key}"${key === selected ? " selected" : ""}>${t.label}</option>`)
    .join("");

  const result =
    output === null
      ? ""
      : `<section class="result"><h2>Result</h2><pre>${escapeHtml(output)}</pre></section>`;

  return template
    .replace("{{INPUT}}", () => escapeHtml(input))
    .replace("{{OPTIONS}}", () => options)
    .replace("{{RESULT}}", () => result);
}

// ---------- Server ----------
const server = http.createServer((req, res) => {
  try {
    const pathname = req.url.split("?")[0];

    if (req.method === "GET" && pathname === "/style.css") {
      res.writeHead(200, { "Content-Type": "text/css; charset=utf-8" });
      return res.end(fs.readFileSync(path.join(__dirname, "style.css")));
    }

    if (req.method === "GET" && pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(page());
    }

    if (req.method === "POST" && pathname === "/") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
        if (body.length > 1e6) req.destroy();
      });
      req.on("end", () => {
        const params = new URLSearchParams(body);
        const text = params.get("text") || "";
        const action = params.get("action") || "uppercase";
        const tool = tools[action];
        const output = tool ? tool.fn(text) : "Unknown tool selected.";
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(page(text, action, output));
      });
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found: " + pathname);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Server error: " + err.message);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Running at http://localhost:${PORT}`));