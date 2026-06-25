const { neon } = require("@neondatabase/serverless");

// Initialize DB connection (uses Netlify environment variable)
const sql = neon(process.env.DATABASE_URL);

// Ensure tables exist
let dbInitialized = false;
const initializeDatabase = async () => {
    if (dbInitialized) return;
    try {
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
        dbInitialized = true;
    } catch (err) {
        console.error("Database initialization error:", err);
    }
};

// Helper: JSON response
const jsonResponse = (statusCode, body) => ({
    statusCode,
    headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    },
    body: JSON.stringify(body),
});

// Main handler
exports.handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            body: "",
        };
    }

    await initializeDatabase();

    let path = event.path.replace("/.netlify/functions/api", "");
    if (path.startsWith("/api")) {
        path = path.substring(4);
    }
    const method = event.httpMethod;

    try {
        // ─── GET /api/items ───
        if (path === "/items" && method === "GET") {
            const rows = await sql`SELECT * FROM items ORDER BY created_at DESC`;
            return jsonResponse(200, rows);
        }

        // ─── POST /api/items ───
        if (path === "/items" && method === "POST") {
            const body = JSON.parse(event.body || "{}");
            const {
                type, title, category, description,
                location, date, contact_name, contact_email, photo_data
            } = body;

            if (!type || !title || !category || !description || !location || !date || !contact_name || !contact_email) {
                return jsonResponse(400, { error: "Missing required fields" });
            }

            const result = await sql`
                INSERT INTO items (
                    type, title, category, description,
                    location, date, contact_name, contact_email,
                    photo_data, status
                )
                VALUES (
                    ${type}, ${title}, ${category}, ${description},
                    ${location}, ${date}, ${contact_name}, ${contact_email},
                    ${photo_data || null}, 'unclaimed'
                )
                RETURNING *
            `;
            return jsonResponse(201, result[0]);
        }

        // ─── POST /api/messages ───
        if (path === "/messages" && method === "POST") {
            const body = JSON.parse(event.body || "{}");
            const { item_id, sender_name, sender_email, message } = body;

            if (!item_id || !sender_name || !sender_email || !message) {
                return jsonResponse(400, { error: "Missing required fields" });
            }

            const items = await sql`SELECT id, title, contact_name, contact_email FROM items WHERE id = ${item_id}`;
            if (items.length === 0) {
                return jsonResponse(404, { error: "Item not found" });
            }

            const item = items[0];
            const result = await sql`
                INSERT INTO messages (item_id, sender_name, sender_email, message)
                VALUES (${item_id}, ${sender_name}, ${sender_email}, ${message})
                RETURNING *
            `;

            console.log(`Message saved. From ${sender_name} (${sender_email}) to ${item.contact_name} (${item.contact_email}) about "${item.title}": ${message}`);
            return jsonResponse(201, { success: true, message: "Message saved successfully", data: result[0] });
        }

        // ─── PATCH /api/items/:id/claim ───
        const claimMatch = path.match(/^\/items\/(\d+)\/claim$/);
        if (claimMatch && method === "PATCH") {
            const itemId = parseInt(claimMatch[1], 10);
            const body = JSON.parse(event.body || "{}");
            const { contact_email } = body;

            if (!contact_email) {
                return jsonResponse(400, { error: "Contact email is required to confirm claim" });
            }

            const items = await sql`SELECT contact_email, status FROM items WHERE id = ${itemId}`;
            if (items.length === 0) {
                return jsonResponse(404, { error: "Item not found" });
            }

            const item = items[0];
            if (item.status === "claimed") {
                return jsonResponse(409, { error: "Item is already claimed" });
            }

            if (item.contact_email.toLowerCase() !== String(contact_email).trim().toLowerCase()) {
                return jsonResponse(403, { error: "Contact email does not match" });
            }

            const result = await sql`
                UPDATE items
                SET status = 'claimed', updated_at = NOW()
                WHERE id = ${itemId}
                RETURNING *
            `;
            return jsonResponse(200, result[0]);
        }

        // ─── 404 ───
        return jsonResponse(404, { error: "Not Found" });

    } catch (err) {
        console.error("Serverless function error:", err);
        return jsonResponse(500, { error: "Internal Server Error", details: err.message });
    }
};
