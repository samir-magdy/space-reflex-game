import "dotenv/config";
import http from "http";
import fs from "fs";
import path from "path";
import client from "./db.js";
import { initializeDatabase } from "./db.js";
import { fileURLToPath } from "url";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const PORT = process.env.PORT || 3003;

const mimeTypes = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".png": "image/png",
  ".mp3": "audio/mpeg",
  ".woff2": "font/woff2",
};

// 1. Make the request handler ASYNCHRONOUS
const server = http.createServer(async (req, res) => {
  if (req.url === "/api/scores") {
    if (req.method === "GET") {
      try {
        const result = await client.execute(
          "SELECT name, time FROM scores ORDER BY time ASC LIMIT 10"
        );

        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(result.rows));
      } catch (error) {
        console.error("Error fetching scores:", error);
        fs.readFile(
          path.join(dirname, "public/error-pages", "500.html"),
          (_, content500) => {
            res.writeHead(500, { "Content-Type": "text/html" });
            res.end(content500 || "<h1>500 - Server Error</h1>", "utf-8");
          }
        );
      }
      return;
    } else if (req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", async () => {
        let userData;
        try {
          userData = JSON.parse(body);
        } catch (error) {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON" }));
          return;
        }

        if (!validateName(userData.name)) {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid name format" }));
          return;
        }

        try {
          const checkResult = await client.execute({
            sql: "SELECT name, time FROM scores WHERE name = ?",
            args: [userData.name],
          });
          const userExistsInDB = checkResult.rows[0]; // Get the first row, if any

          if (!userExistsInDB) {
            await client.execute({
              sql: "INSERT INTO scores (name, time) VALUES (?, ?)",
              args: [userData.name, userData.time],
            });
            res.writeHead(201, { "content-type": "application/json" });
            res.end(JSON.stringify({ saved: true }));
          } else if (userExistsInDB.time > userData.time) {
            await client.execute({
              sql: "UPDATE scores SET time = ? WHERE name = ?",
              args: [userData.time, userData.name],
            });
            res.writeHead(201, { "content-type": "application/json" });
            res.end(JSON.stringify({ updated: true }));
          } else {
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ updated: false }));
          }
        } catch (error) {
          console.error("Error processing score POST:", error);
          fs.readFile(
            path.join(dirname, "public/error-pages", "500.html"),
            (_, content500) => {
              res.writeHead(500, { "Content-Type": "text/html" });
              res.end(content500 || "<h1>500 - Server Error</h1>", "utf-8");
            }
          );
        }
      });
      return;
    }
  }

  if (req.url === "/api/check-name" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const { name } = JSON.parse(body);
        if (!validateName(name)) {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(
            JSON.stringify({
              available: false,
              message: "Name must match the requirements",
            })
          );
          return;
        }

        const checkResult = await client.execute({
          sql: "SELECT name FROM scores WHERE name = ?",
          args: [name],
        });

        const userExists = checkResult.rows.length > 0;

        if (userExists) {
          res.writeHead(200, { "content-type": "application/json" });
          res.end(
            JSON.stringify({
              available: false,
              message: "This name is already taken.",
            })
          );
        } else {
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ available: true }));
        }
      } catch (error) {
        console.error("Error checking name:", error);
        res.writeHead(400, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            available: false,
            message: "Invalid request or server error",
          })
        );
      }
    });
    return;
  }

  let filePath = req.url === "/" ? "/index.html" : req.url;
  filePath = path.join(dirname, "public", filePath);
  const extname = path.extname(filePath);
  const contentType = mimeTypes[extname] || "application/octet-stream";

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        fs.readFile(
          path.join(dirname, "public/error-pages", "404.html"),
          (_, content404) => {
            res.writeHead(404, { "Content-Type": "text/html" });
            res.end(content404 || "<h1>404 - Not Found</h1>", "utf-8");
          }
        );
      } else {
        fs.readFile(
          path.join(dirname, "public/error-pages", "500.html"),
          (_, content500) => {
            res.writeHead(500, { "Content-Type": "text/html" });
            res.end(content500 || "<h1>500 - Server Error</h1>", "utf-8");
          }
        );
      }
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    }
  });
});

// Initialize DB and start server
async function startServer() {
  await initializeDatabase(); // Wait for the DB to be ready first
  server.listen(PORT);
}

// main
startServer();

function validateName(userName) {
  const regExp = /^(?![0-9]+$)[a-z0-9]{2,12}$/;
  return regExp.test(userName);
}
