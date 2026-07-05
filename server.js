require("dotenv").config();

const http = require("http");
const fs = require("fs");
const path = require("path");
const { neon } = require("@neondatabase/serverless");

// Initialize Neon client
if (!process.env.DATABASE_URL) {
    console.error("CRITICAL: DATABASE_URL environment variable is missing!");
    process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const PORT = process.env.PORT || 3000;

// Helper to parse JSON request body
const getRequestBody = (req) => {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (err) {
                reject(new Error("Invalid JSON body"));
            }
        });
        req.on('error', (err) => {
            reject(err);
        });
    });
};

// Helper to send JSON responses
const sendJSON = (res, statusCode, data) => {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
};

// Helper to serve static files from public directory
const serveStaticFile = (fileName, contentType, res) => {
    const filePath = path.join(__dirname, 'public', fileName);
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("404 File Not Found");
        } else {
            res.writeHead(200, { "Content-Type": contentType });
            res.end(data);
        }
    });
};

// Database Initialization Script
const initializeDatabase = async () => {
    try {
        console.log("Checking and initializing database tables...");
        await sql`
            CREATE TABLE IF NOT EXISTS items (
                id SERIAL PRIMARY KEY,
                type VARCHAR(10) NOT NULL CHECK (type IN ('lost', 'found')),
                title VARCHAR(255) NOT NULL,
                category VARCHAR(50) NOT NULL,
                description TEXT NOT NULL,
                location VARCHAR(255) NOT NULL,
                date DATE NOT NULL,
                contact_name VARCHAR(255) NOT NULL,
                contact_email VARCHAR(255) NOT NULL,
                photo_data TEXT,
                status VARCHAR(20) DEFAULT 'unclaimed' CHECK (status IN ('claimed', 'unclaimed')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await sql`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
                sender_name VARCHAR(255) NOT NULL,
                sender_email VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        console.log("Database tables checked and ready.");
    } catch (err) {
        console.error("Database connection/initialization error:", err);
    }
};

// Request Handler
const requestHandler = async (req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const url = parsedUrl.pathname;
    const method = req.method;

    // Enable CORS for development flexibility
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    try {
        // --- Static File Routing ---
        if (url === "/" || url === "/index.html") {
            return serveStaticFile("index.html", "text/html", res);
        }
        if (url === "/style.css") {
            return serveStaticFile("style.css", "text/css", res);
        }
        if (url === "/app.js") {
            return serveStaticFile("app.js", "text/javascript", res);
        }

        // --- API Route: GET/POST /api/items ---
        if (url === "/api/items") {
            if (method === "GET") {
                const rows = await sql`
                    SELECT * FROM items 
                    ORDER BY created_at DESC
                `;
                return sendJSON(res, 200, rows);
            }
            
            if (method === "POST") {
                const body = await getRequestBody(req);
                const {
                    type,
                    title,
                    category,
                    description,
                    location,
                    date,
                    contact_name,
                    contact_email,
                    photo_data
                } = body;

                // Validate required fields
                if (!type || !title || !category || !description || !location || !date || !contact_name || !contact_email) {
                    return sendJSON(res, 400, { error: "Missing required fields" });
                }

                // Insert item
                const result = await sql`
                    INSERT INTO items (
                        type, 
                        title, 
                        category, 
                        description, 
                        location, 
                        date, 
                        contact_name, 
                        contact_email, 
                        photo_data, 
                        status
                    )
                    VALUES (
                        ${type}, 
                        ${title}, 
                        ${category}, 
                        ${description}, 
                        ${location}, 
                        ${date}, 
                        ${contact_name}, 
                        ${contact_email}, 
                        ${photo_data || null}, 
                        'unclaimed'
                    )
                    RETURNING *
                `;

                return sendJSON(res, 201, result[0]);
            }
        }

        // --- API Route: POST /api/messages ---
        if (url === "/api/messages" && method === "POST") {
            const body = await getRequestBody(req);
            const {
                item_id,
                sender_name,
                sender_email,
                message
            } = body;

            if (!item_id || !sender_name || !sender_email || !message) {
                return sendJSON(res, 400, { error: "Missing required fields" });
            }

            // Verify item exists
            const items = await sql`SELECT id, title, contact_name, contact_email FROM items WHERE id = ${item_id}`;
            if (items.length === 0) {
                return sendJSON(res, 404, { error: "Item not found" });
            }

            const item = items[0];

            // Insert message
            const result = await sql`
                INSERT INTO messages (item_id, sender_name, sender_email, message)
                VALUES (${item_id}, ${sender_name}, ${sender_email}, ${message})
                RETURNING *
            `;

            console.log(`Message saved. Notify Owner: Message from ${sender_name} (${sender_email}) to ${item.contact_name} (${item.contact_email}) about "${item.title}": ${message}`);

            return sendJSON(res, 201, { success: true, message: "Message saved successfully", data: result[0] });
        }

        // --- API Route: PATCH /api/items/:id/claim ---
        const claimMatch = url.match(/^\/api\/items\/(\d+)\/claim$/);
        if (claimMatch && method === "PATCH") {
            const itemId = parseInt(claimMatch[1], 10);
            const body = await getRequestBody(req);
            const { contact_email } = body;

            if (!contact_email) {
                return sendJSON(res, 400, { error: "Contact email is required to confirm claim" });
            }

            const items = await sql`SELECT contact_email, status FROM items WHERE id = ${itemId}`;
            if (items.length === 0) {
                return sendJSON(res, 404, { error: "Item not found" });
            }

            const item = items[0];
            if (item.status === 'claimed') {
                return sendJSON(res, 409, { error: "Item is already claimed" });
            }

            if (item.contact_email.toLowerCase() !== String(contact_email).trim().toLowerCase()) {
                return sendJSON(res, 403, { error: "Contact email does not match" });
            }

            // Update status
            const result = await sql`
                UPDATE items 
                SET status = 'claimed', 
                    updated_at = NOW()
                WHERE id = ${itemId}
                RETURNING *
            `;

            return sendJSON(res, 200, result[0]);
        }

        // Default 404
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");

    } catch (err) {
        console.error("Server error handling request:", err);
        sendJSON(res, 500, { error: "Internal Server Error", details: err.message });
    }
};

// Start database check and start listening
initializeDatabase().then(() => {
    http.createServer(requestHandler).listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
});
