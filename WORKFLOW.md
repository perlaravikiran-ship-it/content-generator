# AI Content Generator — Detailed Workflow Documentation

This document describes the full end-to-end automation behind the AI Content Generator. It covers what the system does, why it was built this way, how the Make.com scenario is structured module by module, what every branch condition checks, how retries work, and what every possible response looks like.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Solution Overview](#solution-overview)
3. [How to Access the System](#how-to-access-the-system)
4. [The Request Payload](#the-request-payload)
5. [Scenario Architecture](#scenario-architecture)
6. [Module-by-Module Walkthrough](#module-by-module-walkthrough)
   - [Module 1 — Custom Webhook](#module-1--custom-webhook)
   - [Module 8 — Topic Exists Check (If-Else)](#module-8--topic-exists-check-if-else)
   - [Module 2 — Content Generation: Phase 1 (GPT-5-mini, 40 tokens)](#module-2--content-generation-phase-1-gpt-5-mini-40-tokens)
   - [Module 10 — Content Result Router (If-Else, 4 branches)](#module-10--content-result-router-if-else-4-branches)
   - [Module 3 — Image Generation (GPT Image 2)](#module-3--image-generation-gpt-image-2)
   - [Module 17 — Image Data Check (If-Else)](#module-17--image-data-check-if-else)
   - [Module 4 — Google Drive Upload](#module-4--google-drive-upload)
   - [Module 44 — File ID Check (If-Else)](#module-44--file-id-check-if-else)
   - [Module 6 — Google Drive Share](#module-6--google-drive-share)
   - [Module 48 — Share Link Check (If-Else)](#module-48--share-link-check-if-else)
   - [Module 7 — Success Webhook Response](#module-7--success-webhook-response)
7. [Retry Mechanism — Full Detail](#retry-mechanism--full-detail)
8. [The System Prompt — Content Generation](#the-system-prompt--content-generation)
9. [The Image Prompt — Image Generation](#the-image-prompt--image-generation)
10. [Response Payload Reference](#response-payload-reference)
11. [Error Code Reference](#error-code-reference)
12. [Content Guardrails](#content-guardrails)
13. [Platform Behaviour](#platform-behaviour)
14. [Supported Content Formats](#supported-content-formats)
15. [The Next.js Proxy Layer](#the-nextjs-proxy-layer)

---

## Problem Statement

Content creators publishing on LinkedIn, Twitter, Instagram, or any other platform spend a disproportionate amount of time on content production — writing the copy, finding the right tone and structure for each platform, sourcing or generating a relevant image, and then repeating the cycle for each post.

This project automates that entire flow. The goal is to let a creator supply nothing more than a topic (and optionally a platform and style preference) and get back a ready-to-post piece of writing in the correct format, with platform-appropriate hashtags and tone, alongside a photorealistic image — all within a single API call.

---

## Solution Overview

The system is built as a Make.com automation scenario triggered by a webhook. A Next.js application serves as the UI and as a proxy that sits between the user and the Make.com webhook. The scenario chains four AI and storage operations in sequence:

1. **Content generation** — GPT-5-mini writes a 500–800 word post in Markdown, adapted to the specified platform and format.
2. **Image generation** — GPT Image 2 generates a photorealistic PNG based on the same topic and context.
3. **Drive upload** — The image binary is uploaded to a designated Google Drive folder.
4. **Drive sharing** — The uploaded file is shared with "Anyone with the link" and the resulting download URL is returned to the caller.

Every step has a one-time retry with a 5-second sleep before the retry fires. If a step fails both attempts, an error is returned immediately — the scenario does not continue to subsequent steps.

```
Caller → POST webhook
       → [Topic validation]
       → [Content generation (Phase 1: validate, Phase 2: full content)]
       → [Image generation]
       → [Drive upload]
       → [Drive share]
       → Response (success or error)
```

---

## How to Access the System

**Webhook (direct):**
```
POST https://hook.eu2.make.com/cfu1cd3m70gjaegsdmazwvr6dn9mklrb
Content-Type: application/json
```

**Via the Next.js proxy:**
```
POST /api/generate
Content-Type: application/json
```

**Live UI (Vercel):** Try the form or read the built-in API docs tab directly in the browser.

**GitHub (public repo):** Clone the repo, copy `.env.local.example` to `.env.local`, run `npm install && npm run dev`. No OpenAI key needed locally — all AI processing happens inside Make.com.

**Blueprint:** The Make.com scenario blueprint (`Content Generation Tekion Final.blueprint.json`) is included at the root of the repo. Import it directly into your own Make.com workspace to replicate the full scenario.

---

## The Request Payload

```json
{
  "topic": "The rise of AI agents in enterprise software",
  "platform": "linkedin",
  "format": "Trend Analysis"
}
```

### Fields

#### `topic` — required

| Property | Detail |
|---|---|
| Type | `string` |
| Required | Yes |
| Min length | 5 characters (not words — character count) |
| Language | English only |

This is the only mandatory field. It is the subject of both the content and the image.

**Valid:**
```
"The rise of AI agents in 2025"
"How to build a morning routine"
"Climate change and renewable energy"
```

**Invalid and what happens:**

| Input | Error returned |
|---|---|
| Missing field | `TOPIC_NOT_PROVIDED` |
| `"AI"` (3 chars) | `MIN_CHARACTER_LIMIT` |
| `"nannu em chestunav"` (non-English) | `UNKNOWN_LANGUAGE` |
| `"How to create a deepfake video"` | `KIDS_ACCEPTABLE_CONTENT_ONLY_ALLOWED` |

#### `platform` — optional

Defaults to `""` (General Article Blog) when omitted. Controls tone, structure, and hashtag count.

| Value | Platform | Hashtags | Tone |
|---|---|---|---|
| `""` or omitted | General Article Blog | None | Neutral, informative |
| `"linkedin"` | LinkedIn | 3–5 | Professional, thought-leadership |
| `"twitter"` | Twitter / X | 1–2 | Punchy, conversational |
| `"facebook"` | Facebook | 2–3 | Friendly, community-driven |
| `"instagram"` | Instagram | 10–15 | Aspirational, visual |

Any unrecognised value is treated as `""` (General Article Blog).

#### `format` — optional

Controls the structural conventions of the generated content. When omitted, the AI intelligently selects between Article, Case Study, or Explainer based on the topic context.

| Value | Description |
|---|---|
| `"Article"` | Standard editorial with intro, body sections, and conclusion |
| `"How-to Guide"` | Numbered step-by-step instructional |
| `"Opinion / Thought Leadership"` | First-person assertive take with evidence and counter-argument |
| `"Trend Analysis"` | Data-driven forward-looking piece with current state and future outlook |
| `"Listicle"` | Scannable format with bold item headlines and short explanations |
| `"Case Study"` | Real-world example with problem → approach → outcome structure |
| `"Explainer"` | Clear breakdown of a concept for a general audience |
| `"Comparison"` | Side-by-side evaluation of two or more options |

If the value is not in this list, the AI picks the nearest matching format.

---

## Scenario Architecture

The Make.com scenario is named **"Content Generation Tekion Final"**. It is built on the following module IDs (as found in the blueprint):

| Module ID | Type | Purpose |
|---|---|---|
| 1 | `gateway:CustomWebHook` | Receives the inbound POST request |
| 8 | `builtin:BasicIfElse` | Checks if `topic` field exists in payload |
| 2 | `openai-gpt-3:CreateCompletion` | Phase 1 content call — validation + content (GPT-5-mini) |
| 67 | `gateway:WebhookRespond` | Error handler on module 2 failure → `CONTENT_GENERATION_FAILED` |
| 10 | `builtin:BasicIfElse` | Routes content result — valid / error code / empty |
| 3 | `openai-gpt-3:GenerateImage` | Generates image (GPT Image 2) |
| 110 | `gateway:WebhookRespond` | Error handler on module 3 failure → `IMAGE_GENERATION_FAILED` |
| 17 | `builtin:BasicIfElse` | Checks if image data exists |
| 4 | `google-drive:uploadAFile` | Uploads image to Drive folder |
| 90 | `gateway:WebhookRespond` | Error handler on module 4 failure → `IMAGE_SAVING_FAILED` |
| 44 | `builtin:BasicIfElse` | Checks if Drive file ID was returned |
| 6 | `google-drive:shareAFileFolder` | Shares file with "Anyone with link" |
| 84 | `gateway:WebhookRespond` | Error handler on module 6 failure → `IMAGE_SHARING_FAILED` |
| 48 | `builtin:BasicIfElse` | Checks if `webContentLink` exists |
| 7 | `gateway:WebhookRespond` | 200 success response |
| 85 | `util:FunctionSleep` | 5-second sleep before share retry |
| 62 | `google-drive:shareAFileFolder` | Retry: share the file again |

---

## Module-by-Module Walkthrough

### Module 1 — Custom Webhook

**Type:** `gateway:CustomWebHook`  
**Webhook name:** `content-generator-tekion-webhook-final`  
**Hook ID:** `4508061`

This is the entry point. Make.com listens on the webhook URL and fires the scenario each time a POST request arrives. The webhook interface declares three fields that it passes downstream:

```
topic    → text
platform → text
format   → text
```

All three are passed into subsequent modules as `{{1.topic}}`, `{{1.platform}}`, and `{{1.format}}`.

---

### Module 8 — Topic Exists Check (If-Else)

**Type:** `builtin:BasicIfElse`

The first gate in the scenario. Checks whether the `topic` field is present and non-empty in the payload.

- **If `topic` exists (non-empty):** flow continues to Module 2 (content generation).
- **Else:** the scenario immediately returns a `400` response with error code `TOPIC_NOT_PROVIDED`.

```json
{
  "success": false,
  "message": "Request failed",
  "error": {
    "code": "TOPIC_NOT_PROVIDED",
    "message": "Topic is not provided in the payload",
    "custom_message_from_service_provider": "",
    "details": null
  }
}
```

No AI call is made if the topic is missing.

---

### Module 2 — Content Generation: Phase 1 (GPT-5-mini, 40 tokens)

**Type:** `openai-gpt-3:CreateCompletion`  
**Model:** `gpt-5-mini`  
**max_tokens:** `40`  
**reasoning_effort:** `minimal`  
**temperature:** `1`  
**response_format:** `text`

This is the first of two OpenAI calls. It uses only 40 tokens intentionally. At 40 tokens, the model cannot produce a full 500–800 word post. The purpose of this call is purely to run the guardrail check fast and cheaply before committing to full content generation.

The system prompt instructs the model to act as a senior social media strategist and content writer. It is given a comprehensive ruleset covering content quality, platform adaptation, format selection, and guardrails. The user message passes `{{1.topic}}`, `{{1.platform}}`, and `{{1.format}}` directly into the prompt.

At 40 tokens, the model will return one of:
- An error code (`UNKNOWN_LANGUAGE`, `KIDS_ACCEPTABLE_CONTENT_ONLY_ALLOWED`, or `MIN_CHARACTER_LIMIT`) if the topic fails a guardrail
- A short partial content start if the topic is clean (the actual content is too long to fit in 40 tokens, so the response will be truncated)
- Empty output if the model timed out or hit an unexpected issue

**On API error:** Module 67 fires immediately and returns `CONTENT_GENERATION_FAILED` (HTTP 400) with the raw OpenAI error message in `custom_message_from_service_provider`.

---

### Module 10 — Content Result Router (If-Else, 4 branches)

**Type:** `builtin:BasicIfElse`

This is the most complex branch in the scenario. It evaluates the result from Module 2 (`{{2.result}}`) and routes into one of four paths:

**Branch 1 — Valid content (non-empty, no error code):**
The topic passed all guardrails and the model returned content. The scenario sleeps 5 seconds and re-calls GPT-5-mini with `max_tokens: 4000` to generate the full 500–800 word post. This is by design — the Phase 1 call was only a cheap validation pass. The full content is always generated in this Phase 2 retry call.

**Branch 2 — Error code detected (`UNKNOWN_LANGUAGE` / `KIDS_ACCEPTABLE_CONTENT_ONLY_ALLOWED` / `MIN_CHARACTER_LIMIT`):**
The result contains one of the guardrail error codes. The scenario immediately returns a `400` response with the corresponding error code and message. No further processing happens.

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

**Branch 3 — Empty result (Phase 1 returned nothing):**
The model returned an empty string. The scenario sleeps 5 seconds and retries with `max_tokens: 4000`. If this retry also returns empty, `CONTENT_NOT_GENERATED` is returned.

**Branch 4 — API error on retry:**
If the Phase 2 GPT-5-mini call throws an API error, `CONTENT_GENERATION_FAILED` is returned with the raw error in `custom_message_from_service_provider`.

After a successful Phase 2 call producing actual content (`{{2.result}}` now holds the full Markdown post), the scenario moves into image generation.

---

### Module 3 — Image Generation (GPT Image 2)

**Type:** `openai-gpt-3:GenerateImage`  
**Model:** `gpt-image-2`  
**Quality:** `low`  
**Output format:** `png`  
**Number of images:** `1`

The image generation call uses a separate prompt that is distinct from the content generation system prompt. The prompt instructs the model to act as a senior photographer or visual painter and to generate a natural, realistic, camera-captured quality image. Key rules from the image prompt:

- Every image must look natural and humanistic — no avatars, no AI-looking figures
- Must include real humans, not cartoons or animals
- If the topic references a specific person, landmark, or widely known object, the image should represent it faithfully rather than creating a generic substitute
- The image style adapts to the platform and format provided in `{{1.platform}}` and `{{1.format}}`

The same three variables from the webhook (`{{1.topic}}`, `{{1.platform}}`, `{{1.format}}`) are injected into the image prompt.

The module returns image binary data as `{{3.resImgData}}` and a filename as `{{3.resImgName}}`.

**On API error:** Module 110 fires immediately and returns `IMAGE_GENERATION_FAILED` (HTTP 400) with the raw OpenAI error in `custom_message_from_service_provider`.

---

### Module 17 — Image Data Check (If-Else)

**Type:** `builtin:BasicIfElse`

Checks whether `{{3.resImgData}}` (the image binary from GPT Image 2) exists and is non-empty.

- **If image data exists:** flow continues to Module 4 (Google Drive upload).
- **Else (no image data):** the scenario sleeps 5 seconds and retries Module 3 (GPT Image 2 call). If the retry also returns no data, `IMAGE_NOT_GENERATED` is returned (HTTP 400).

```json
{
  "success": false,
  "message": "Request failed",
  "error": {
    "code": "IMAGE_NOT_GENERATED",
    "message": "Oops! Something went wrong while generating the image. Please retry again",
    "custom_message_from_service_provider": "",
    "details": null
  }
}
```

---

### Module 4 — Google Drive Upload

**Type:** `google-drive:uploadAFile` (version 4)  
**Connection:** Ravi's Google Drive connection (`perla.ravikiran@gmail.com`)  
**Drive:** My Drive  
**Destination folder:** `Content Generation Tekion` (folder ID: `/1bDphFCuFI_1XFx_EVcVewbIz7vDtfkZf`)  
**File title:** `{{1.topic}}`  
**File name:** `{{3.resImgName}}` (the filename returned by GPT Image 2)  
**File data:** `{{3.resImgData}}` (the image binary)  
**Convert:** `false` (uploaded as-is, no Google Docs conversion)

The image binary from Module 3 is uploaded directly to the designated folder. The module returns a Drive file ID as `{{4.id}}`.

**On API error:** Module 90 fires immediately and returns `IMAGE_SAVING_FAILED` (HTTP 400) with the raw Drive API error in `custom_message_from_service_provider`.

---

### Module 44 — File ID Check (If-Else)

**Type:** `builtin:BasicIfElse`

Checks whether `{{4.id}}` (the Drive file ID from the upload) exists.

- **If file ID exists:** flow continues to Module 6 (share the file).
- **Else (upload succeeded but no file ID returned):** the scenario sleeps 5 seconds and retries the upload (Module 4). If the retry also returns no file ID, `IMAGE_SAVING_FAILED` is returned.

---

### Module 6 — Google Drive Share

**Type:** `google-drive:shareAFileFolder` (version 4)  
**Connection:** Ravi's Google Drive connection (`perla.ravikiran@gmail.com`)  
**Drive:** My Drive  
**Select:** File  
**File ID:** `{{4.id}}`  
**Role:** `reader`  
**Type:** `anyone`  
**Allow File Discovery:** `false`

This call sets the file permission to "Anyone with the link can view." The `allowFileDiscovery: false` setting means the file will not appear in public search results — it is only accessible via the direct link.

The module returns a `webContentLink` (`{{6.webContentLink}}`) — this is the Google Drive direct download URL in the format `https://drive.google.com/uc?id=<FILE_ID>&export=download`.

**On API error:** Module 84 fires immediately and returns `IMAGE_SHARING_FAILED` (HTTP 400) with the raw Drive API error in `custom_message_from_service_provider`.

---

### Module 48 — Share Link Check (If-Else)

**Type:** `builtin:BasicIfElse`  
**Condition:** `{{6.webContentLink}}` exists

The final gate before the success response. Checks whether the share operation produced a usable `webContentLink`.

- **If `webContentLink` exists:** Module 7 fires — the scenario returns HTTP 200 with content and image URL.
- **Else (share call succeeded but no link returned):** the scenario sleeps 5 seconds (Module 85) and retries the share (Module 62 — an identical call to Module 6). If the retry also returns no link, `IMAGE_NOT_SHARED` is returned.

```json
{
  "success": false,
  "message": "Request failed",
  "error": {
    "code": "IMAGE_NOT_SHARED",
    "message": "Oops! Something went wrong while sharing the image. Please retry again or contact admin",
    "custom_message_from_service_provider": "",
    "details": null
  }
}
```

---

### Module 7 — Success Webhook Response

**Type:** `gateway:WebhookRespond`  
**HTTP status:** `200`

The final module. Returns the generated content from Module 2 and the Drive download URL from Module 6.

```json
{
  "success": true,
  "message": "Task completed successfully",
  "data": {
    "content": "{{2.result}}",
    "imageUrl": "{{6.webContentLink}}"
  }
}
```

The `{{2.result}}` value is the full Markdown post from the Phase 2 GPT-5-mini call (the 4000-token call). The `{{6.webContentLink}}` is the Google Drive `uc?id=...&export=download` URL.

---

## Retry Mechanism — Full Detail

Each of the four operational steps retries exactly once on failure. The retry is always preceded by a 5-second sleep (`util:FunctionSleep`, `duration: 5`). The scenario never retries more than once per step.

| Step | Trigger for retry | Sleep | What is retried | Error if retry also fails |
|---|---|---|---|---|
| **Content generation** | Phase 1 returns empty OR error code present | 5s | Full GPT-5-mini call with `max_tokens: 4000` | `CONTENT_NOT_GENERATED` or `CONTENT_GENERATION_FAILED` |
| **Image generation** | Module 17: `resImgData` is empty | 5s | GPT Image 2 call (Module 3) | `IMAGE_NOT_GENERATED` |
| **Drive upload** | Module 44: `file.id` is empty | 5s | `google-drive:uploadAFile` (Module 4) | `IMAGE_SAVING_FAILED` |
| **Drive sharing** | Module 48: `webContentLink` is empty | 5s | `google-drive:shareAFileFolder` (Module 62) | `IMAGE_NOT_SHARED` |

Note: If the API itself throws an error (not just an empty result), the `onerror` handler fires immediately without sleeping — `CONTENT_GENERATION_FAILED`, `IMAGE_GENERATION_FAILED`, `IMAGE_SAVING_FAILED`, and `IMAGE_SHARING_FAILED` are all direct `onerror` paths, not retry exhaustion paths.

---

## The System Prompt — Content Generation

The system prompt given to GPT-5-mini in Module 2 is reproduced below in full. This is the exact prompt from the blueprint.

**System message:**

```
# Role: You are a senior social media strategist who is expert in content writing and copywriting.

# Task: You have to create engaging, compelling, high-performing and platform specific prompt.

# Rules:
1. Understand the title/topic or purpose of the post that you need to draft the content on.
2. Every content you are drafting should be between 500-800 words and not less or more.
3. Create the content specific to the platform mentioned in the user query and create the structure of the content accordingly.
4. Content has to be created by on the style mentioned in the payload, if it's empty, consider it to be general style.
5. Tone of the content should be polite, professional, straight, informative and data driven whereever possible.
6. Provide Hashtags that are trendy and gives wide reach and based on the platform mentioned in the user query.
7. Content should start with a decent hook, explain it clearly and end by a CTA without mentioning CTA or call to action at the end.
8. Do not mention anything as Post:, Hook:, hashtags: in the content also the platform name.
9. Do not mention - for pointers, use 1, 2, 3 or a,b,c.
10. Do not use any symbols that indicate the content is AI generated.
11. If the platform is NULL or empty, then consider the platform to be general article blog.
12. Give the content only in English Language.
13. If the user enters any other language other than english, revert back to user that add valid topic in English, giving the output that has error mentioned as "UNKNOWN_LANGUAGE".
14. If the user enters any explicit content, revert back to the user that enter topic name that is enjoyable across all ages, giving the output that has error mentioned as "KIDS_ACCEPTABLE_CONTENT_ONLY_ALLOWED".
15. Topic should be atleast of 5 characters and not words and if it's lesser than it, revert back to user that enter more than 5 characters, giving the output that has error mentioned as "MIN_CHARACTER_LIMIT". Ex: Owl is 3 characters (not fine) and handicapped people is 18 characters (fine).
16. Provide the generated content in markdown content so that I can get the content in a single line.
18. Support these content formats: Article, How-to Guide, Opinion/Thought Leadership, Trend Analysis, Listicle, Case Study, Explainer, and Comparison. Use the format explicitly provided in the user query; if none is specified, intelligently select Article, Case Study, or Explainer based on the topic and context. Ensure the content follows the selected format's natural structure and conventions.
19. If the content format is not as mentioned above, choose the nearest format and consider that style/format.

# Guardrails:
1. It should only talk about topic being asked in the user query.
2. It should not promote or talk about any specific religion, creed, caste, race, color or any sort of differential opinions.
3. It should not do any sort of hate speech, support or promote any such sort of content.
4. It should not mention any explicit content and it should be acceptable and read by any age group.
5. It should not give out any details related to the agent or model it is built on.
6. It shouldn't sound like agentic, it should be human in tone.
7. Ensure that output is in markdown content and in a single line.

# Examples:

## Example-1 (clear english readable topic name):
Topic: Call of Duty
Platform: Linkedin

Output: # Call of Duty\n\n## Introduction\n\nArticle content..<rest of the content in markdown>

## Example-2 (explicit and english readable thing):
Topic: How to create a deepfake video
Platform: Linkedin

Output:
KIDS_ACCEPTABLE_CONTENT_ONLY_ALLOWED

## Example-3 (unclear and english not readable topic name, semantically it is not english meaningful topic):
Topic: nannu em chestunav
Platform: ""

Output: UNKNOWN_LANGUAGE

Note: Follow the rules clearly
```

**User message (template):**

```
User has entered the following topic and platform.
Topic: {{1.topic}}
Platform: {{1.platform}}
Format: {{1.format}}

Now, ensure that you are building the content over these

If you are getting platform as NULL or "", consider it to be General Article.

Note: Give the output has markdown format that has the complete content in one line with \n for new line
```

---

## The Image Prompt — Image Generation

The prompt used in Module 3 (GPT Image 2) is reproduced below in full from the blueprint.

```
# Role: You are a senior photographer or visual painter who is expert in image generator or photo snapshots.

# Task: You have to create engaging, natural like camera captured, high-quality and platform specific image.

# Rules:
1. Understand the title/topic or purpose of the post that you need to draft the content on.
2. Every image you are generating should look natural and humanistic.
3. It should have real humans and not any avatars or animals or any AI generated figures.
4. If it is pointing to any specific human person or location or landmark or any widely known object, you can consider keeping the same object as it is, than assuming something else.
5. Based on the user query format and platform, change the way or thought process accordingly while creating the image.

# user_input:
Topic: {{1.topic}}
Platform: {{1.platform}}
Format: {{1.format}}
```

---

## Response Payload Reference

### Success — HTTP 200

```json
{
  "success": true,
  "message": "Task completed successfully",
  "data": {
    "content": "# Your Generated Title\n\n## Introduction\n\n...",
    "imageUrl": "https://drive.google.com/uc?id=1AbCdEfGhIjKlMn&export=download"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `success` | `boolean` | Always `true` on 200 |
| `message` | `string` | `"Task completed successfully"` |
| `data.content` | `string` | Full Markdown post, 500–800 words, platform-aware |
| `data.imageUrl` | `string` | Google Drive direct download URL |

**Working with `imageUrl`:**

The URL is in the format `https://drive.google.com/uc?id=<FILE_ID>&export=download`.

```javascript
// Extract file ID
const fileId = imageUrl.match(/[?&]id=([^&]+)/)?.[1];

// Embed in browser (iframe-compatible preview URL)
const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;

// Direct download
const downloadUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;
```

Images are stored permanently in the Google Drive folder `Content Generation Tekion`. They are shared with `type: anyone`, `role: reader`, `allowFileDiscovery: false`.

### Error — HTTP 400

```json
{
  "success": false,
  "message": "Request failed",
  "error": {
    "code": "UNKNOWN_LANGUAGE",
    "message": "Topic is not provided in English Language, please provide in English Language",
    "custom_message_from_service_provider": null,
    "details": null
  }
}
```

| Field | Type | Description |
|---|---|---|
| `success` | `boolean` | Always `false` on 400 |
| `message` | `string` | Always `"Request failed"` |
| `error.code` | `string` | Machine-readable error code |
| `error.message` | `string` | Human-readable description |
| `error.custom_message_from_service_provider` | `string \| null` | Raw error from OpenAI or Google Drive API — only present on `_FAILED` codes |
| `error.details` | `null` | Reserved, always `null` |

---

## Error Code Reference

### Input validation (checked before any AI call)

| Code | HTTP | Message | Trigger |
|---|---|---|---|
| `TOPIC_NOT_PROVIDED` | 400 | Topic is not provided in the payload | `topic` field is missing or empty |
| `MIN_CHARACTER_LIMIT` | 400 | Please enter the topic name more than 5 characters | Topic is 4 characters or fewer. Character count, not word count — `"Owl"` (3 chars) fails, `"handicapped people"` (18 chars) passes |
| `UNKNOWN_LANGUAGE` | 400 | Topic is not provided in English Language, please provide in English Language | The AI detected the topic is not in English |
| `KIDS_ACCEPTABLE_CONTENT_ONLY_ALLOWED` | 400 | Kids friendly topics are allowed | Topic contains explicit, violent, or age-inappropriate content |

### Content generation errors

| Code | HTTP | Message | Path |
|---|---|---|---|
| `CONTENT_NOT_GENERATED` | 400 | Oops! Something went wrong while generating the content after retrying. Please retry again after sometime | Both Phase 1 and Phase 2 GPT calls returned empty content |
| `CONTENT_GENERATION_FAILED` | 400 | Oops! Something went wrong while generating the content after retrying. Please retry again after sometime | OpenAI API threw an error. `custom_message_from_service_provider` contains the raw error |

### Image generation errors

| Code | HTTP | Message | Path |
|---|---|---|---|
| `IMAGE_NOT_GENERATED` | 400 | Oops! Something went wrong while generating the image. Please retry again | GPT Image 2 returned no image data on both attempts |
| `IMAGE_GENERATION_FAILED` | 400 | Oops! Something went wrong while generating the image after retrying. Please retry again after sometime | GPT Image API threw an error. `custom_message_from_service_provider` contains the raw error |

### Google Drive errors

| Code | HTTP | Message | Path |
|---|---|---|---|
| `IMAGE_SAVING_FAILED` | 400 | Oops! Something went wrong while saving the image after retrying. Please retry again after sometime or contact admin | Drive upload failed or returned no file ID on both attempts. `custom_message_from_service_provider` contains the raw error |
| `IMAGE_SHARING_FAILED` | 400 | Oops! Something went wrong while sharing the image after retrying. Please retry again after sometime or contact admin | Drive sharing API threw an error on the first attempt. `custom_message_from_service_provider` contains the raw error |
| `IMAGE_NOT_SHARED` | 400 | Oops! Something went wrong while sharing the image. Please retry again or contact admin | Drive sharing call succeeded but returned no `webContentLink` after both attempts |

---

## Content Guardrails

These rules are enforced by the system prompt. They cannot be bypassed by the caller regardless of what is passed in the payload.

| Rule | Detail |
|---|---|
| Word count | Strictly 500–800 words. The model is instructed never to go below or above. |
| Language | Output is always English, regardless of topic phrasing. Non-English topics return `UNKNOWN_LANGUAGE` before content is generated. |
| Age-appropriate | No explicit, violent, or adult content. Violations return `KIDS_ACCEPTABLE_CONTENT_ONLY_ALLOWED` without generating content. |
| No AI indicators | Output must not contain phrases or symbols that reveal it is AI-generated (no "As an AI...", no "Certainly!", etc.). |
| No section labels | Output must not include labels like `Post:`, `Hook:`, `Hashtags:`, or `CTA:`. |
| No bullet dashes | Lists must use numbered (`1.`, `2.`) or lettered (`a.`, `b.`) format — never `-`. |
| Platform awareness | If `platform` is provided, the content structure, tone, and hashtag count adapt accordingly. |
| No religion / politics | Content must not promote or reference specific religions, castes, races, or political views. |
| Human tone | Content should not sound agentic. It should read as though written by a human professional. |
| Markdown output | The model outputs the full post in Markdown, delivered as a single line with `\n` for newlines (required for clean JSON serialisation through Make.com's webhook response). |

---

## Platform Behaviour

When `platform` is provided, both the content and the image adapt:

**Content adaptation:**

| Platform | Hashtag count | Tone | Structure notes |
|---|---|---|---|
| `""` (omitted) | None | Neutral, editorial | Standard article structure |
| `"linkedin"` | 3–5 | Professional, thought-leadership | Longer paragraphs, data-driven where possible, ends with industry-relevant CTA |
| `"twitter"` | 1–2 | Punchy, conversational | Shorter sentences, hook-heavy opener, punchline close |
| `"facebook"` | 2–3 | Friendly, community-driven | Conversational, invites engagement |
| `"instagram"` | 10–15 | Aspirational, visual | Caption-style, emotionally resonant, heavy on hashtags |

**Image adaptation:**

The image prompt instructs the model to change its "way or thought process accordingly" based on the platform and format. A LinkedIn topic generates a professional, workplace-contextual image. An Instagram topic generates something more aspirational and visually striking.

---

## Supported Content Formats

| Format | Auto-selected? | Structure |
|---|---|---|
| `Article` | Yes (auto) | Intro → body sections with subheadings → conclusion |
| `How-to Guide` | No | Numbered step-by-step, action-oriented |
| `Opinion / Thought Leadership` | No | First-person assertion → evidence → counter-argument → conclusion |
| `Trend Analysis` | No | Current state → data → drivers → future outlook |
| `Listicle` | No | Bold item headline + short explanation, repeated N times |
| `Case Study` | Yes (auto) | Problem statement → approach taken → outcome → lesson |
| `Explainer` | Yes (auto) | Concept definition → why it matters → how it works → takeaway |
| `Comparison` | No | Criteria → Option A → Option B → verdict |

When `format` is omitted, the AI chooses between Article, Case Study, or Explainer based on the topic context. Any unrecognised format value is mapped to the nearest match.

---

## The Next.js Proxy Layer

The Next.js application exposes a single API route at `POST /api/generate`. This route acts as a proxy between the UI (or any direct API caller) and the Make.com webhook.

**Why proxy instead of calling Make.com directly from the browser?**

1. The webhook URL is kept server-side — it is never exposed to the browser.
2. The proxy handles a known Make.com serialisation quirk: when the scenario builds its JSON response, it interpolates `{{2.result}}` (the Markdown content) directly into the JSON body using template variable substitution. Markdown content contains literal newline characters (`\n`), which are invalid inside JSON string values. The proxy's `fixJsonControlChars` function walks the raw response string character by character, tracks whether it is inside a quoted JSON string, and escapes any raw newlines, carriage returns, or tabs it finds before passing the string to `JSON.parse`.
3. The route sets `maxDuration = 300` seconds to accommodate the full scenario runtime (30–90 seconds typical, up to ~5 minutes in worst-case retry scenarios).

**Route behaviour:**

- Validates that `topic` is present and at least 5 characters. Returns HTTP 422 if not.
- Forwards `topic`, `platform`, and `format` to the Make.com webhook.
- Reads the raw response text, runs `fixJsonControlChars`, then parses and re-serialises as a consistent API envelope (`{ success, data, error }`).
- Returns HTTP 502 if Make.com is unreachable or returns malformed JSON after the fix attempt.

**API envelope:**

```typescript
// Success
{ success: true, data: MakeComResponse, error: null }

// Error
{ success: false, data: null, error: string }
```
