-- Create Items Table
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

-- Create Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    sender_name VARCHAR(255) NOT NULL,
    sender_email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_date ON items(date);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_item_id ON messages(item_id);

-- Automatically update updated_at on row changes
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS items_set_updated_at ON items;
CREATE TRIGGER items_set_updated_at
BEFORE UPDATE ON items
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Insert sample data (optional, for testing)
INSERT INTO items (id, type, title, category, description, location, date, contact_name, contact_email, status) 
VALUES 
    (1, 'lost', 'Black Backpack', 'accessories', 'Lost my black Nike backpack with laptop inside. Has a red keychain attached.', 'Library 2nd Floor', '2025-11-08', 'John Doe', 'john.doe@campus.edu', 'unclaimed'),
    (2, 'found', 'Blue Water Bottle', 'other', 'Found a blue Hydro Flask water bottle near the cafeteria entrance.', 'Main Cafeteria', '2025-11-09', 'Jane Smith', 'jane.smith@campus.edu', 'unclaimed'),
    (3, 'lost', 'iPhone 13', 'electronics', 'Lost iPhone 13 Pro in black case. Has a crack on the screen protector.', 'Gym Locker Room', '2025-11-07', 'Mike Johnson', 'mike.j@campus.edu', 'unclaimed'),
    (4, 'found', 'Chemistry Textbook', 'books', 'Found Chemistry 101 textbook with name "Sarah" written inside.', 'Science Building Room 204', '2025-11-10', 'Emily Davis', 'emily.d@campus.edu', 'unclaimed'),
    (5, 'lost', 'Student ID Card', 'keys', 'Lost my student ID card somewhere on campus. Name: Alex Brown', 'Unknown', '2025-11-06', 'Alex Brown', 'alex.brown@campus.edu', 'claimed')
ON CONFLICT (id) DO NOTHING;
