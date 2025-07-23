<p align="center">
  <picture>
    <source srcset="apps/mail/public/white-icon.svg" media="(prefers-color-scheme: dark)">
    <img src="apps/mail/public/black-icon.svg" alt="Zero Logo" width="64" style="background-color: #000; padding: 10px;"/>
  </picture>
</p>

# Simple Gmail Client

A clean, simple Gmail client built with React and TypeScript. This application focuses on providing a streamlined email experience by connecting directly to Gmail via OAuth 2.0.

## Features

- **Gmail Integration**: Full Gmail API integration with real-time sync
- **Clean Interface**: Modern, responsive design that works on all devices
- **Secure Authentication**: OAuth 2.0 authentication with Google's security standards
- **Email Management**: View, read, and manage emails across different folders
- **Compose Emails**: Create and send new emails
- **Search**: Basic email search functionality

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm
- Google Cloud Console project with Gmail API enabled

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Zero_email
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   # Better Auth
   BETTER_AUTH_SECRET=your_secret_key_here
   
   # Google OAuth (Required for Gmail integration)
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   
   # Database
   HYPERDRIVE_CONNECTION_STRING=your_database_connection_string
   
   # App URLs
   VITE_PUBLIC_APP_URL=http://localhost:3000
   VITE_PUBLIC_BACKEND_URL=http://localhost:8787
   ```

4. **Google OAuth Setup**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing one
   - Enable the Gmail API and Google OAuth2 API
   - Create OAuth 2.0 credentials (Web application type)
   - Add authorized redirect URIs:
     - Development: `http://localhost:8787/api/auth/callback/google`
     - Production: `https://your-production-url/api/auth/callback/google`
   - Add yourself as a test user in the OAuth consent screen

5. **Database Setup**
   ```bash
   pnpm docker:db:up
   pnpm db:push
   ```

6. **Start the application**
   ```bash
   pnpm dev
   ```
   
   Visit [http://localhost:3000](http://localhost:3000)

## Architecture

This application is built with:

- **Frontend**: React with TypeScript, Vite, Tailwind CSS
- **Backend**: Hono.js with Cloudflare Workers
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth with Google OAuth
- **Email Integration**: Gmail API

## Project Structure

```
apps/
├── mail/                 # Frontend React application
│   ├── app/             # React Router pages
│   ├── components/      # React components
│   └── hooks/           # Custom React hooks
└── server/              # Backend API
    ├── src/
    │   ├── lib/         # Core libraries
    │   ├── routes/      # API routes
    │   └── trpc/        # tRPC API
    └── db/              # Database schema and migrations
```

## Key Components

- **Gmail Integration**: `apps/server/src/lib/driver/google.ts` - Handles Gmail API communication
- **Authentication**: `apps/server/src/lib/auth.ts` - OAuth setup and user management
- **Email Display**: `apps/mail/components/mail/` - Email list and thread display components
- **Navigation**: `apps/mail/config/navigation.ts` - Simplified navigation structure

## Development

### Available Scripts

- `pnpm dev` - Start development servers
- `pnpm build` - Build for production
- `pnpm db:push` - Push database schema changes
- `pnpm db:studio` - Open database studio

### Adding Features

This simplified version focuses on core Gmail functionality. To add features:

1. **Email Features**: Extend the Gmail driver in `apps/server/src/lib/driver/google.ts`
2. **UI Components**: Add components in `apps/mail/components/`
3. **API Routes**: Add tRPC procedures in `apps/server/src/trpc/routes/`

## Security

- Uses OAuth 2.0 for secure Gmail authentication
- Never stores user passwords
- Implements proper token refresh mechanisms
- Follows Google's security best practices

## Deployment

The application can be deployed to:
- **Frontend**: Vercel, Netlify, or any static hosting
- **Backend**: Cloudflare Workers
- **Database**: Any PostgreSQL provider

## License

MIT License - see LICENSE file for details.
