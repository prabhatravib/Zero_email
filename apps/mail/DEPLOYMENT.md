# Deployment Guide for Zero Email

This guide explains how to deploy the Zero Email application on Render.

## Prerequisites

- A Render account
- Your repository connected to Render
- Environment variables configured

## Deployment Options

### Option 1: Docker Deployment (Recommended)

This approach uses Docker to containerize the application:

1. Use the `render.yaml` file in the root of the mail app
2. Render will automatically detect the Dockerfile and build the container
3. The app will be served using Wrangler (Cloudflare Workers runtime)

### Option 2: Static File Server

If the Docker approach doesn't work, use the static file server:

1. Use the `render-static.yaml` file
2. This serves the built static files using Express.js
3. Simpler but doesn't use Cloudflare Workers features

## Environment Variables

Set these environment variables in your Render dashboard:

- `NODE_ENV`: `production`
- `PORT`: `10000` (Your current setup)
- `VITE_PUBLIC_BACKEND_URL`: `https://pitext-email.onrender.com`
- `VITE_PUBLIC_APP_URL`: `https://pitext-email.onrender.com`
- `VITE_GOOGLE_CLIENT_ID`: `your-google-client-id.apps.googleusercontent.com`
- `GOOGLE_CLIENT_ID`: `your-google-client-id.apps.googleusercontent.com`
- `GOOGLE_CLIENT_SECRET`: `your-google-client-secret`
- `GOOGLE_REDIRECT_URI`: `https://pitext-email.onrender.com`
- `BETTER_AUTH_SECRET`: `your-better-auth-secret`
- `BETTER_AUTH_URL`: `https://pitext-email.onrender.com`
- `GOOGLE_MAPS_API_KEY`: `your-google-maps-api-key`
- `OPENAI_API_KEY`: `your-openai-api-key`
- `LOG_LEVEL`: `debug`

## Build Process

The build process:
1. Installs dependencies using pnpm
2. Builds the React Router application
3. Creates static files in `build/client/`

## Troubleshooting

### Port Binding Issues
- Ensure the app binds to `0.0.0.0` instead of `localhost`
- The start script handles this automatically

### Cloudflare Workers Compatibility
- The compatibility date has been set to `2025-06-17`
- Update Wrangler if you see compatibility warnings

### Large Bundle Sizes
- The build shows some large chunks (>500KB)
- Consider code splitting for better performance

## Health Check

The health check endpoint is set to `/` which should return the main application.

## Custom Domain

After deployment, you can configure a custom domain in your Render dashboard. 