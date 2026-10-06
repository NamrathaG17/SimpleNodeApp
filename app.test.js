const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");
 
let server;
let baseUrl;
 
// Ask the OS for a free port so tests never clash with a running app
function getFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.listen(0, () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
    probe.on("error", reject);
  });
}
 
before(async () => {
  const port = await getFreePort();
  baseUrl = `http://localhost:${port}`;
  server = spawn(process.execPath, [path.join(__dirname, "app.js")], {
    env: { ...process.env, PORT: String(port) },
  });
  // Wait until app.js prints its "Running at" message
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (data) => {
      if (data.toString().includes("Running at")) resolve();
    });
    server.on("error", reject);
    server.on("exit", (code) => reject(new Error(`app.js exited early (code ${code})`)));
  });
});
 
after(() => {
  server.removeAllListeners("exit");
  server.kill();
});
 
// Helper: submit the form and return the text inside <pre>...</pre>
async function runTool(text, action) {
  const body = new URLSearchParams();
  if (text !== undefined) body.set("text", text);
  if (action !== undefined) body.set("action", action);
  const res = await fetch(baseUrl + "/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const html = await res.text();
  const match = html.match(/<pre>([\s\S]*?)<\/pre>/);
  return { res, html, output: match ? match[1] : null };
}
 
// ---------- Pages and routes ----------
test("GET / returns the HTML page", async () => {
  const res = await fetch(baseUrl + "/");
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/html/);
  assert.match(html, /String Tools/);
});
 
test("GET / fills in every placeholder", async () => {
  const html = await (await fetch(baseUrl + "/")).text();
  assert.doesNotMatch(html, /\{\{(INPUT|OPTIONS|RESULT)\}\}/);
});
 
test("GET / lists all four tools in the dropdown", async () => {
  const html = await (await fetch(baseUrl + "/")).text();
  for (const name of ["uppercase", "lowercase", "reverse", "palindrome"]) {
    assert.match(html, new RegExp(`<option value="${name}"`));
  }
});
 
test("GET / shows no result section before a tool is run", async () => {
  const html = await (await fetch(baseUrl + "/")).text();
  assert.doesNotMatch(html, /class="result"/);
});
 
test("GET /style.css returns CSS", async () => {
  const res = await fetch(baseUrl + "/style.css");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/css/);
});
 
test("GET /style.css?v=2 still works (query string ignored)", async () => {
  const res = await fetch(baseUrl + "/style.css?v=2");
  assert.equal(res.status, 200);
});
 
test("unknown path returns 404 with the path in the message", async () => {
  const res = await fetch(baseUrl + "/does-not-exist");
  assert.equal(res.status, 404);
  assert.match(await res.text(), /Not found: \/does-not-exist/);
});
 
test("GET /index.html returns 404 (only / is served)", async () => {
  const res = await fetch(baseUrl + "/index.html");
  assert.equal(res.status, 404);
});
 
// ---------- String tools ----------
test("uppercase", async () => {
  const { output } = await runTool("Hello World", "uppercase");
  assert.equal(output, "HELLO WORLD");
});
 
test("lowercase", async () => {
  const { output } = await runTool("Hello World", "lowercase");
  assert.equal(output, "hello world");
});
 
test("reverse", async () => {
  const { output } = await runTool("abc def", "reverse");
  assert.equal(output, "fed cba");
});
 
test("reverse keeps emoji intact", async () => {
  const { output } = await runTool("a😀b", "reverse");
  assert.equal(output, "b😀a");
});
 
test("palindrome: detects a palindrome, ignoring case and punctuation", async () => {
  const { output } = await runTool("A man, a plan, a canal: Panama", "palindrome");
  assert.equal(output, "Yes, it is a palindrome.");
});
 
test("palindrome: detects a non-palindrome", async () => {
  const { output } = await runTool("hello", "palindrome");
  assert.equal(output, "No, it is not a palindrome.");
});
 
test("palindrome: asks for input when text has no letters or numbers", async () => {
  const { output } = await runTool("!!! ???", "palindrome");
  assert.equal(output, "Enter some letters or numbers first.");
});
 
test("palindrome: works with numbers", async () => {
  const { output } = await runTool("12321", "palindrome");
  assert.equal(output, "Yes, it is a palindrome.");
});
 
// ---------- Form handling ----------
test("empty text still returns a result without crashing", async () => {
  const { res, output } = await runTool("", "uppercase");
  assert.equal(res.status, 200);
  assert.equal(output, "");
});
 
test("missing action defaults to uppercase", async () => {
  const { output } = await runTool("hello", undefined);
  assert.equal(output, "HELLO");
});
 
test("unknown action shows an error message", async () => {
  const { output } = await runTool("hello", "nonsense");
  assert.equal(output, "Unknown tool selected.");
});
 
test("action names like 'constructor' are not treated as tools", async () => {
  const { res, output } = await runTool("hello", "constructor");
  assert.equal(res.status, 200);
  assert.equal(output, "Unknown tool selected.");
});
 
test("the chosen tool stays selected in the dropdown", async () => {
  const { html } = await runTool("hello", "reverse");
  assert.match(html, /<option value="reverse" selected>/);
  assert.doesNotMatch(html, /<option value="uppercase" selected>/);
});
 
test("the submitted text is kept in the text box", async () => {
  const { html } = await runTool("keep me", "lowercase");
  assert.match(html, /<textarea[^>]*>keep me<\/textarea>/);
});
 
// ---------- Safety ----------
test("HTML in the input is escaped in the result", async () => {
  const { output } = await runTool("<b>hi</b>", "lowercase");
  assert.equal(output, "&lt;b&gt;hi&lt;/b&gt;");
});
 
test("HTML in the input is escaped in the text box", async () => {
  const { html } = await runTool("<script>alert(1)</script>", "uppercase");
  assert.doesNotMatch(html, /<script>alert/i);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});
 
test("special replace patterns like $& are not mangled", async () => {
  const { output } = await runTool("price $& $1 $$", "lowercase");
  assert.equal(output, "price $&amp; $1 $$");
});
 