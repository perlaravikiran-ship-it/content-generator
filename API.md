# API Documentation — AI Content Generator Webhook

This document describes the Make.com webhook that powers the AI Content Generator. It covers the endpoint, request payload, response payload, data types, and all error codes.

---

## Endpoint

```
POST https://hook.eu2.make.com/cfu1cd3m70gjaegsdmazwvr6dn9mklrb
```

| Property | Value |
|---|---|
| Method | `POST` |
| Content-Type | `application/json` |
| Authentication | None (public webhook) |
| Average response time | 30–90 seconds |
| Maximum timeout | ~5 minutes (Make.com scenario limit) |

---

## Request Payload

The request body must be valid JSON.

```json
{
  "topic": "The rise of AI agents in 2025",
  "platform": "linkedin",
  "format": "Trend Analysis"
}
```

### Fields

#### `topic`
| Property | Detail |
|---|---|
| Type | `string` |
| Required | **Yes** |
| Min length | 5 characters |
| Language | English only |
| Max length | No hard limit (recommended: under 200 characters) |

The subject or title of the content to generate. This is the only mandatory field.

**Valid examples:**
```
"The rise of AI agents in 2025"
"How to build a morning routine"
"LGBTQ+ inclusion in the workplace"
"Climate change and renewable energy"
```

**Invalid examples and what happens:**

| Input | Result |
|---|---|
| `""` (empty string) or missing | `TOPIC_NOT_PROVIDED` |
| `"AI"` (fewer than 5 chars) | `MIN_CHARACTER_LIMIT` |
| `"nannu em chestunav"` (non-English) | `UNKNOWN_LANGUAGE` |
| `"How to create a deepfake video"` (explicit) | `KIDS_ACCEPTABLE_CONTENT_ONLY_ALLOWED` |

---

#### `platform`
| Property | Detail |
|---|---|
| Type | `string` |
| Required | No |
| Default | `""` (General Article Blog) |

The social media platform the content is being written for. When provided, the content structure, tone, and hashtag count are adapted accordingly.

**Accepted values:**

| Value | Platform | Hashtags | Tone |
|---|---|---|---|
| `""` (empty string) or omit | General Article Blog | None | Neutral, informative |
| `"linkedin"` | LinkedIn | 3–5 | Professional, thought-leadership |
| `"twitter"` | Twitter / X | 1–2 | Punchy, conversational |
| `"facebook"` | Facebook | 2–3 | Friendly, community-driven |
| `"instagram"` | Instagram | 10–15 | Aspirational, visual |

> Any value other than the above is treated as `""` (General Article Blog).

---

#### `format`
| Property | Detail |
|---|---|
| Type | `string` |
| Required | No |
| Default | Auto-selected by AI (Article, Case Study, or Explainer based on topic) |

The content format/style. Determines the structural conventions used in the generated piece.

**Accepted values:**

| Value | Description |
|---|---|
| `"Article"` | Standard editorial article with intro, body sections, and conclusion |
| `"How-to Guide"` | Step-by-step instructional content with numbered actions |
| `"Opinion / Thought Leadership"` | First-person assertive take with evidence and counter-argument |
| `"Trend Analysis"` | Data-driven forward-looking piece with current state and future outlook |
| `"Listicle"` | Scannable list format with bold item headlines and short explanations |
| `"Case Study"` | Real-world example with problem, approach, outcome structure |
| `"Explainer"` | Clear breakdown of a concept for a general audience |
| `"Comparison"` | Side-by-side evaluation of two or more options |

> If the value is not in the list above, the AI picks the nearest matching format.  
> If omitted, the AI intelligently selects between Article, Case Study, and Explainer based on the topic context.

---

### Full request example

```json
{
  "topic": "The rise of AI agents in enterprise software",
  "platform": "linkedin",
  "format": "Trend Analysis"
}
```

### Minimal request example (topic only)

```json
{
  "topic": "The future of remote work"
}
```

### cURL

```bash
curl -X POST https://hook.eu2.make.com/cfu1cd3m70gjaegsdmazwvr6dn9mklrb \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "The rise of AI agents in enterprise software",
    "platform": "linkedin",
    "format": "Trend Analysis"
  }'
```

### JavaScript (fetch)

```javascript
const response = await fetch('https://hook.eu2.make.com/cfu1cd3m70gjaegsdmazwvr6dn9mklrb', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    topic: 'The rise of AI agents in enterprise software',
    platform: 'linkedin',
    format: 'Trend Analysis',
  }),
});

const data = await response.json();
```

### Python (requests)

```python
import requests

response = requests.post(
    'https://hook.eu2.make.com/cfu1cd3m70gjaegsdmazwvr6dn9mklrb',
    json={
        'topic': 'The rise of AI agents in enterprise software',
        'platform': 'linkedin',
        'format': 'Trend Analysis',
    }
)

data = response.json()
```

---

## Response Payload

All responses are JSON. The HTTP status code indicates success or failure.

---

### Success — `200 OK`

```json
{
  "success": true,
  "message": "Task completed successfully",
  "data": {
    "content": "# The Rise of AI Agents in Enterprise Software\n\n## Introduction\n\nAI agents are...",
    "imageUrl": "https://drive.google.com/uc?id=1TJT5hKO8p4lnC83Bq7fRa2l_2eXs8bk-&export=download"
  }
}
```

#### Response fields

| Field | Type | Description |
|---|---|---|
| `success` | `boolean` | Always `true` on a 200 response |
| `message` | `string` | Human-readable status message |
| `data` | `object` | The generated content and image |
| `data.content` | `string` | The generated post in **Markdown format** (500–800 words) |
| `data.imageUrl` | `string` | Google Drive direct download URL for the AI-generated image |

#### `data.content` details

- Format: Markdown (`#` headings, numbered lists, `**bold**`)
- Length: 500–800 words
- Language: English
- Includes platform-appropriate hashtags at the end (count depends on the platform)
- Ends with a call-to-action (no "CTA" label — it reads naturally)

#### `data.imageUrl` details

- Format: `https://drive.google.com/uc?id=<FILE_ID>&export=download`
- The file is permanently stored in Google Drive (folder: `Content Generation Tekion`)
- Shared with "Anyone with the link" (reader permission)
- To **display** in a browser: convert to `https://drive.google.com/file/d/<FILE_ID>/preview` (embeddable iframe)
- To **download**: use the `uc?id=...&export=download` URL directly

**Extracting the file ID:**
```javascript
const fileId = imageUrl.match(/[?&]id=([^&]+)/)?.[1];
const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
const downloadUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;
```

---

### Error — `400 Bad Request`

```json
{
  "success": false,
  "message": "Request failed",
  "error": {
    "code": "UNKNOWN_LANGUAGE",
    "message": "Topic is not provided in English Language, please provide in English Language",
    "custom_message_from_service_provider": "",
    "details": null
  }
}
```

#### Error response fields

| Field | Type | Description |
|---|---|---|
| `success` | `boolean` | Always `false` on a 400 response |
| `message` | `string` | Always `"Request failed"` |
| `error` | `object` | Error details |
| `error.code` | `string` | Machine-readable error code (see table below) |
| `error.message` | `string` | Human-readable error description |
| `error.custom_message_from_service_provider` | `string \| null` | Raw error from OpenAI or Google Drive — present only on `_FAILED` codes when the provider returned an error message |
| `error.details` | `null` | Reserved for future use, always `null` |

---

## Error Codes

### Input validation errors

These are returned immediately without calling any AI service.

| Code | HTTP | Message | Cause |
|---|---|---|---|
| `TOPIC_NOT_PROVIDED` | 400 | Topic is not provided in the payload | The `topic` field is missing from the request body |
| `MIN_CHARACTER_LIMIT` | 400 | Please enter the topic name more than 5 characters | `topic` is 4 characters or fewer. Note: this is **character count**, not word count. `"Owl"` (3 chars) fails; `"handicapped people"` (18 chars) passes. |
| `UNKNOWN_LANGUAGE` | 400 | Topic is not provided in English Language, please provide in English Language | The AI detected the topic is not in English (e.g. `"nannu em chestunav"`) |
| `KIDS_ACCEPTABLE_CONTENT_ONLY_ALLOWED` | 400 | Kids friendly topics are allowed | The topic contains explicit, violent, or age-inappropriate content (e.g. `"How to create a deepfake video"`) |

### Content generation errors

| Code | HTTP | Message | Cause |
|---|---|---|---|
| `CONTENT_NOT_GENERATED` | 400 | Oops! Something went wrong while generating the content after retrying. Please retry again after sometime | Both the first generation attempt and the retry attempt returned empty content |
| `CONTENT_GENERATION_FAILED` | 400 | Oops! Something went wrong while generating the content after retrying. Please retry again after sometime | The OpenAI API returned an error on both attempts. `custom_message_from_service_provider` will contain the raw API error. |

### Image generation errors

| Code | HTTP | Message | Cause |
|---|---|---|---|
| `IMAGE_NOT_GENERATED` | 400 | Oops! Something went wrong while generating the image. Please retry again | GPT Image 2 returned no image data on both the first attempt and the retry |
| `IMAGE_GENERATION_FAILED` | 400 | Oops! Something went wrong while generating the image after retrying. Please retry again after sometime | The GPT Image API returned an error on both attempts. `custom_message_from_service_provider` will contain the raw API error. |

### Google Drive errors

| Code | HTTP | Message | Cause |
|---|---|---|---|
| `IMAGE_SAVING_FAILED` | 400 | Oops! Something went wrong while saving the image after retrying. Please retry again after sometime or contact admin | Google Drive upload failed on both the first attempt and the retry (5-second sleep between attempts). `custom_message_from_service_provider` will contain the Drive API error. |
| `IMAGE_NOT_SHARED` | 400 | Oops! Something went wrong while sharing the image. Please retry again or contact admin | Google Drive file sharing returned no `webContentLink` after all retry attempts |
| `IMAGE_SHARING_FAILED` | 400 | Oops! Something went wrong while sharing the image after retrying. Please retry again after sometime or contact admin | Google Drive sharing API threw an error on all retry attempts. `custom_message_from_service_provider` will contain the Drive API error. |

---

## Retry behavior

The Make.com scenario automatically retries critical steps before returning an error. Each retry is preceded by a 5-second sleep.

| Step | First attempt | On failure |
|---|---|---|
| Content generation | GPT-5-mini, `max_tokens: 40` (quick validation) | Sleep 5s → Retry with `max_tokens: 4000` (full content) |
| Image generation | GPT Image 2 | Sleep 5s → Retry GPT Image 2 |
| Google Drive upload | Upload image to Drive folder | Sleep 5s → Retry upload |
| Google Drive sharing | Share with "Anyone with link" | Sleep 5s → Retry sharing |

> **Two-phase content generation**: The first content call uses only 40 tokens — it's a fast guardrail check for `UNKNOWN_LANGUAGE`, `KIDS_ACCEPTABLE_CONTENT_ONLY_ALLOWED`, and `MIN_CHARACTER_LIMIT`. If the topic passes validation but the response is empty, the scenario sleeps 5s and retries with 4000 tokens for the full 500–800 word post.

---

## Content guardrails

The following rules are enforced by the GPT-5-mini system prompt inside the Make.com scenario. They cannot be overridden by the caller.

| Rule | Detail |
|---|---|
| Word count | 500–800 words, never less or more |
| Language | English only. Non-English topics return `UNKNOWN_LANGUAGE`. |
| Age-appropriate | No explicit, violent, or adult content. Violations return `KIDS_ACCEPTABLE_CONTENT_ONLY_ALLOWED`. |
| No AI indicators | The output must not contain symbols or phrasing that reveals it is AI-generated |
| No labels | Do not include `Post:`, `Hook:`, `Hashtags:`, `CTA:` in the output |
| No bullet dashes | Use numbered lists (`1.`, `2.`) or lettered lists (`a.`, `b.`) — never `-` |
| Platform-aware | If `platform` is provided, content structure and hashtags adapt accordingly |
| Religion / politics | Content must not promote or reference specific religions, castes, races, or political views |
| English output only | Output is always in English regardless of topic phrasing |

---

## Supported content formats

| Format | Auto-selected? | Description |
|---|---|---|
| `Article` | ✅ Yes (auto) | Standard editorial with intro, body, conclusion |
| `How-to Guide` | No | Numbered step-by-step instructional |
| `Opinion / Thought Leadership` | No | First-person assertive take with evidence |
| `Trend Analysis` | No | Data-driven with current state + future outlook |
| `Listicle` | No | Scannable numbered/lettered items |
| `Case Study` | ✅ Yes (auto) | Problem → approach → outcome |
| `Explainer` | ✅ Yes (auto) | Concept breakdown for a general audience |
| `Comparison` | No | Side-by-side evaluation |

> When `format` is omitted, the AI chooses between Article, Case Study, or Explainer based on the topic context. Any unrecognised format value is mapped to the nearest match.

---

## End-to-end example

**Request:**
```bash
curl -X POST https://hook.eu2.make.com/cfu1cd3m70gjaegsdmazwvr6dn9mklrb \
  -H "Content-Type: application/json" \
  -d '{"topic": "Mental health in the workplace", "platform": "linkedin"}'
```

**Response (200):**
```json
{
  "success": true,
  "message": "Task completed successfully",
  "data": {
    "content": "# Mental Health in the Workplace\n\nOne in four employees will experience a mental health challenge...",
    "imageUrl": "https://drive.google.com/uc?id=1AbCdEfGhIjKlMn&export=download"
  }
}
```

---

**Request (error — topic too short):**
```bash
curl -X POST https://hook.eu2.make.com/cfu1cd3m70gjaegsdmazwvr6dn9mklrb \
  -H "Content-Type: application/json" \
  -d '{"topic": "AI"}'
```

**Response (400):**
```json
{
  "success": false,
  "message": "Request failed",
  "error": {
    "code": "MIN_CHARACTER_LIMIT",
    "message": "Please enter the topic name more than 5 characters",
    "custom_message_from_service_provider": "",
    "details": null
  }
}
```

---

## TypeScript type definitions

```typescript
// Request
interface ContentRequest {
  topic: string;                    // required, min 5 chars, English
  platform?: '' | 'linkedin' | 'twitter' | 'facebook' | 'instagram';
  format?:
    | 'Article'
    | 'How-to Guide'
    | 'Opinion / Thought Leadership'
    | 'Trend Analysis'
    | 'Listicle'
    | 'Case Study'
    | 'Explainer'
    | 'Comparison';
}

// Success response
interface ContentSuccess {
  success: true;
  message: 'Task completed successfully';
  data: {
    content: string;    // Markdown, 500-800 words
    imageUrl: string;   // Google Drive download URL
  };
}

// Error response
interface ContentError {
  success: false;
  message: 'Request failed';
  error: {
    code: ErrorCode;
    message: string;
    custom_message_from_service_provider: string | null;
    details: null;
  };
}

type ContentResponse = ContentSuccess | ContentError;

type ErrorCode =
  | 'TOPIC_NOT_PROVIDED'
  | 'MIN_CHARACTER_LIMIT'
  | 'UNKNOWN_LANGUAGE'
  | 'KIDS_ACCEPTABLE_CONTENT_ONLY_ALLOWED'
  | 'CONTENT_NOT_GENERATED'
  | 'CONTENT_GENERATION_FAILED'
  | 'IMAGE_NOT_GENERATED'
  | 'IMAGE_GENERATION_FAILED'
  | 'IMAGE_SAVING_FAILED'
  | 'IMAGE_NOT_SHARED'
  | 'IMAGE_SHARING_FAILED';
```
