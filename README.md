# BananaLanguage

BananaLanguage is a Next.js app for language learning. It generates short French stories at a chosen CEFR level using Google Gemini, creates an image for each paragraph, highlights unknown words, and lets you save AI translations and definitions. Stories, images, and word levels are stored in MongoDB. Includes a banana counter showing mastered words.

## Requirements
- Google API key for Gemini (image + text)
- Docker (recommended) or Node.js 18+/20+

## Environment
Create a `.env` file in the project root with at least:

```
GOOGLE_API_KEY=your_google_api_key
# For local dev (if you run Mongo locally or via docker):
MONGODB_URI=mongodb://root:example@localhost:27017/banana?authSource=admin
```

Notes:
- Docker Compose sets `MONGODB_URI` for the web container automatically. You still need `GOOGLE_API_KEY` in `.env` on the host so Compose can pass it through.

## Run with Docker (recommended)
```
docker compose up -d --build
```
- App: http://localhost:3300
- MongoDB: runs in the `mongo` service

## Run locally (without Docker)
```
npm install
# ensure Mongo is running and MONGODB_URI in .env points to it
npm run dev
```
- App: http://localhost:3000

## What it does
- Generate a short French story at a CEFR level
- Create one image per paragraph (no spoilers)
- Save story + images to MongoDB
- Highlight unknown words; set levels per word
- “Add Translation & Definition (AI)” per sentence (saved at "Barely know")
- Banana counter shows how many words you’ve mastered
- View and delete past stories

