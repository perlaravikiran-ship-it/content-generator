# AI Content Generator

A Next.js application that generates platform-optimised social media content and AI images by triggering a Make.com automation scenario. Enter a topic, pick a platform and format, and get a 500–800 word post plus a photorealistic image stored on Google Drive — all within a couple of minutes.

---

## How it works

```
Browser → Next.js API Route (/api/generate) → Make.com Webhook → GPT-5-mini + GPT Image 2 + Google Drive → Response
```

1. The user fills in **Topic**, **Platform**, and **Format** in the UI.
2. The Next.js proxy route forwards the payload to the Make.com webhook.
3. Make.com runs the scenario: generates content (GPT-5-mini), generates an image (GPT Image 2), uploads it to Google Drive, and returns the result.
4. The UI renders the content and embeds the image directly from Google Drive.

---

## Make.com Webhook URL

```
POST https://hook.eu2.make.com/cfu1cd3m70gjaegsdmazwvr6dn9mklrb
```

**Request payload:**

```json
{
  "topic": "The rise of AI agents in 2025",
  "platform": "linkedin",
  "format": "Trend Analysis"
}
```

| Field | Required | Description |
|---|---|---|
| `topic` | ✅ Yes | Content topic. English only. Min 5 characters. |
| `platform` | No | `linkedin`, `twitter`, `facebook`, `instagram`, or `""` (General Article Blog) |
| `format` | No | `Article`, `How-to Guide`, `Opinion / Thought Leadership`, `Trend Analysis`, `Listicle`, `Case Study`, `Explainer`, `Comparison` |

**Success response (200):**

```json
{
  "success": true,
  "message": "Task completed successfully",
  "data": {
    "content": "# Your generated markdown content...",
    "imageUrl": "https://drive.google.com/uc?id=...&export=download"
  }
}
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm v9 or higher
- The Make.com scenario must be **active** (the webhook URL above is live)

---

## Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd content-generator
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example env file:

```bash
cp .env.local.example .env.local
```

Open `.env.local` and set the webhook URL:

```env
MAKECOM_WEBHOOK_URL=https://hook.eu2.make.com/cfu1cd3m70gjaegsdmazwvr6dn9mklrb
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

The `MAKECOM_WEBHOOK_URL` is already set to the live Make.com scenario. No OpenAI key is needed locally — all AI processing happens inside Make.com.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server on port 3000 |
| `npm run build` | Build the production bundle |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run all tests |
| `npm run test:coverage` | Run tests with coverage report |

---

## Project structure

```
content-generator/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── generate/
│   │   │       └── route.ts        # Proxy route → Make.com webhook
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                # Root page (Form Mode / Webhook Mode tabs)
│   ├── components/
│   │   ├── FormMode.tsx            # Topic/platform/format form + result display
│   │   ├── WebhookMode.tsx         # API docs, error codes, scenario flow
│   │   └── JsonBlock.tsx           # Syntax-highlighted JSON display
│   ├── lib/
│   │   └── utils/
│   │       └── constants.ts        # Webhook URL, formats, error codes, scenario steps
│   └── types/
│       └── index.ts                # TypeScript types for requests/responses
├── tests/
│   ├── apiRoutes.test.ts
│   ├── contentService.test.ts
│   └── imageService.test.ts
├── .env.local                      # Your local environment variables (gitignored)
├── .env.local.example              # Template for env variables
├── next.config.js
├── tailwind.config.js
└── package.json
```

---

## Deploying to Vercel

1. Push your code to GitHub (make sure `.env.local` is in `.gitignore`).
2. Import the repository in [Vercel](https://vercel.com).
3. Add the environment variable in Vercel's dashboard:
   - `MAKECOM_WEBHOOK_URL` = `https://hook.eu2.make.com/cfu1cd3m70gjaegsdmazwvr6dn9mklrb`
4. Deploy. Vercel will auto-detect Next.js.

> **Note:** The Make.com scenario can take 30–60 seconds to complete (content generation + image generation + Google Drive upload). Vercel's free plan has a 10-second function timeout — upgrade to Pro or set `maxDuration = 300` in the route (already configured).

---

## UI modes

### Form Mode
The main interface. Enter a topic, optionally select a platform and content format, and click **Generate**. The result shows:
- The full generated post (Markdown, copy button included)
- The AI-generated image embedded inline (Google Drive `/preview`)
- A **Download Image** button

### Webhook Mode
Developer reference with four tabs:
- **Overview** — Request/response schemas, example payloads, cURL command
- **Error Codes** — All 11 error codes the scenario can return with triggers and messages
- **Scenario Flow** — Step-by-step breakdown of the Make.com automation
- **Try It** — Button that switches directly to Form Mode

---

## Error codes reference

| Code | Trigger |
|---|---|
| `TOPIC_NOT_PROVIDED` | `topic` field missing from payload |
| `MIN_CHARACTER_LIMIT` | Topic shorter than 5 characters |
| `UNKNOWN_LANGUAGE` | Topic is not in English |
| `KIDS_ACCEPTABLE_CONTENT_ONLY_ALLOWED` | Explicit or age-inappropriate content |
| `CONTENT_NOT_GENERATED` | Content empty after both attempts |
| `CONTENT_GENERATION_FAILED` | OpenAI API error after retry |
| `IMAGE_NOT_GENERATED` | No image data returned after retry |
| `IMAGE_GENERATION_FAILED` | GPT Image API error after retry |
| `IMAGE_SAVING_FAILED` | Google Drive upload failed after retry |
| `IMAGE_SHARING_FAILED` | Google Drive sharing failed after retry |
| `IMAGE_NOT_SHARED` | No share link returned after all retries |

---

## Notes

- The Make.com scenario uses a **two-phase content generation**: a quick validation call (max_tokens: 40) first checks for guardrail violations, then a full generation call (max_tokens: 4000) produces the complete content. If either call fails, the scenario sleeps 5 seconds and retries.
- Images are stored permanently in a Google Drive folder (`Content Generation Tekion`) and shared with "Anyone with the link".
- The `imageUrl` in the response is a direct Google Drive download link. The UI converts it to a `/preview` embed URL for inline display.
