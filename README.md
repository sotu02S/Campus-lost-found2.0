# Campus Lost & Found Web Application

A modern, premium web application for managing lost and found items on campus. Built with vanilla JavaScript, Node.js, and PostgreSQL (Neon Database).

## Features

- 📝 Post lost or found items with detailed descriptions
- 📸 Upload photos with automatic client-side compression
- 🔍 Advanced search and filtering by type, category, and status
- 💬 Contact item owners through secure messaging
- 🔐 Email verification for claiming items
- 📱 Fully responsive design with modern dark theme
- ⚡ Offline capability with localStorage caching
- 🎨 Premium glassmorphic UI with smooth animations

## Project Structure

```
campus-lost-and-found/
├── public/                 # Static frontend files (served by Netlify)
│   ├── index.html         # Main HTML page
│   ├── app.js             # Frontend JavaScript
│   └── style.css          # Styling with modern dark theme
├── netlify/
│   └── functions/
│       └── api.js         # Serverless function for Netlify deployment
├── server.js              # Local development server
├── campus_db_schema.sql   # Database schema with sample data
├── netlify.toml           # Netlify configuration
├── package.json           # Dependencies and scripts
├── .env.example           # Environment variables template
└── README.md              # This file
```

## Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js (local), Netlify Functions (production)
- **Database**: Neon PostgreSQL (serverless)
- **Deployment**: Netlify

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "CAMPUS LOST AND FOUND 2.0"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Update the `.env` file with your Neon database credentials:

```env
DATABASE_URL='postgresql://username:password@host.neon.tech/database?sslmode=require'
PORT=3000
```

### 4. Initialize Database

Run the SQL schema file in your Neon database console or using psql:

```bash
psql <your-database-url> -f campus_db_schema.sql
```

This will create the necessary tables (`items`, `messages`) with indexes and sample data.

### 5. Run Locally

```bash
npm start
# or
npm run dev
```

Visit `http://localhost:3000` in your browser.

## Deployment to Netlify

### Method 1: Deploy via Netlify CLI

```bash
# Install Netlify CLI if you haven't already
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

### Method 2: Deploy via Git Integration

1. Push your code to GitHub/GitLab/Bitbucket
2. Connect your repository to Netlify
3. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `public`
   - **Functions directory**: `netlify/functions`
4. Add environment variable `DATABASE_URL` in Netlify dashboard
5. Deploy!

## Environment Variables for Netlify

In your Netlify dashboard, add the following environment variable:

- `DATABASE_URL`: Your Neon PostgreSQL connection string

## API Endpoints

### Items

- `GET /api/items` - Get all items
- `POST /api/items` - Create a new item listing
- `PATCH /api/items/:id/claim` - Mark an item as claimed (requires email verification)

### Messages

- `POST /api/messages` - Send a message to an item owner

## Database Schema

### Items Table

Stores lost and found item listings with details, photos, and contact information.

### Messages Table

Stores messages between users and item owners for secure communication.

## Features in Detail

### Client-Side Image Compression

Images are automatically compressed to 800x800px max with 70% quality before upload, reducing bandwidth and storage costs.

### Offline Support

The application caches item data in localStorage, allowing users to browse listings even when offline.

### Email Verification for Claims

When marking an item as claimed, users must provide the exact email address used when posting the item, preventing fraudulent claims.

### Toast Notifications

User-friendly toast notifications for all actions (success, error, info) with automatic dismissal.

### Advanced Filtering

Filter items by:
- Type (Lost/Found)
- Category (Electronics, Clothing, Books, etc.)
- Status (Claimed/Unclaimed)
- Search keywords (title, description, location)

Sort by newest, oldest, or alphabetically.

## Development Notes

- The `server.js` file is only for local development
- Netlify uses serverless functions in `netlify/functions/api.js` for production
- Static files are served from the `public/` directory
- Both local and serverless implementations share the same API interface

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Security Features

- SQL injection prevention via parameterized queries
- XSS protection with HTML escaping
- Email verification for sensitive operations
- CORS configured for API endpoints
- Secure database connections with SSL

## License

This project is available for educational purposes.

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## Support

For issues or questions, please open an issue in the repository.
