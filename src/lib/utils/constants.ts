// ── Make.com Webhook ──────────────────────────────────────────────────────────

export const MAKECOM_WEBHOOK_URL =
  process.env.MAKECOM_WEBHOOK_URL ??
  'https://hook.eu2.make.com/cfu1cd3m70gjaegsdmazwvr6dn9mklrb';

// ── Supported content formats ──────────────────────────────────────────────────

export const CONTENT_FORMATS = [
  'Article',
  'How-to Guide',
  'Opinion / Thought Leadership',
  'Trend Analysis',
  'Listicle',
  'Case Study',
  'Explainer',
  'Comparison',
] as const;

// ── Platform options (empty = General Article Blog) ──────────────────────────

export const PLATFORM_OPTIONS = [
  { id: '', name: 'General Article Blog', emoji: '📝' },
  { id: 'linkedin', name: 'LinkedIn', emoji: '💼' },
  { id: 'twitter', name: 'Twitter / X', emoji: '🐦' },
  { id: 'facebook', name: 'Facebook', emoji: '👥' },
  { id: 'instagram', name: 'Instagram', emoji: '📸' },
] as const;

// ── Error codes from Make.com scenario (Final blueprint) ─────────────────────

export interface ErrorCodeInfo {
  code: string;
  message: string;
  trigger: string;
}

export const ERROR_CODES: ErrorCodeInfo[] = [
  {
    code: 'TOPIC_NOT_PROVIDED',
    message: 'Topic is not provided in the payload',
    trigger: 'The request body does not include a "topic" field',
  },
  {
    code: 'MIN_CHARACTER_LIMIT',
    message: 'Please enter the topic name more than 5 characters',
    trigger: 'Topic is shorter than 5 characters (e.g. "Owl" = 3 chars = not fine)',
  },
  {
    code: 'UNKNOWN_LANGUAGE',
    message: 'Topic is not provided in English Language, please provide in English Language',
    trigger: 'Topic is detected as non-English (e.g. "nannu em chestunav")',
  },
  {
    code: 'KIDS_ACCEPTABLE_CONTENT_ONLY_ALLOWED',
    message: 'Kids friendly topics are allowed',
    trigger: 'Topic contains explicit or age-inappropriate content (e.g. "How to create a deepfake video")',
  },
  {
    code: 'CONTENT_NOT_GENERATED',
    message: 'Oops! Something went wrong while generating the content after retrying. Please retry again after sometime',
    trigger: 'Both the first attempt and retry returned no result or content is empty',
  },
  {
    code: 'CONTENT_GENERATION_FAILED',
    message: 'Oops! Something went wrong while generating the content after retrying. Please retry again after sometime',
    trigger: 'OpenAI API threw an error even after the retry module kicked in',
  },
  {
    code: 'IMAGE_NOT_GENERATED',
    message: 'Oops! Something went wrong while generating the image. Please retry again',
    trigger: 'GPT Image returned no image data on both first attempt and retry',
  },
  {
    code: 'IMAGE_GENERATION_FAILED',
    message: 'Oops! Something went wrong while generating the image after retrying. Please retry again after sometime',
    trigger: 'GPT Image API threw an error even after the retry module kicked in',
  },
  {
    code: 'IMAGE_SAVING_FAILED',
    message: 'Oops! Something went wrong while saving the image after retrying. Please retry again after sometime or contact admin',
    trigger: 'Google Drive upload failed on both first attempt and retry (5s sleep between attempts)',
  },
  {
    code: 'IMAGE_SHARING_FAILED',
    message: 'Oops! Something went wrong while sharing the image after retrying. Please retry again after sometime or contact admin',
    trigger: 'Google Drive sharing failed on all retry attempts (5s sleep between each)',
  },
  {
    code: 'IMAGE_NOT_SHARED',
    message: 'Oops! Something went wrong while sharing the image. Please retry again or contact admin',
    trigger: 'Google Drive sharing returned no webContentLink after all retry attempts exhausted',
  },
];

// ── Make.com scenario flow (Final blueprint) ─────────────────────────────────

export const SCENARIO_STEPS = [
  { step: 1, module: 'Custom Webhook', action: 'Receives POST with { topic, platform?, format? }' },
  { step: 2, module: 'If-Else', action: 'Checks if topic field exists in payload — if not, returns TOPIC_NOT_PROVIDED' },
  { step: 3, module: 'OpenAI GPT-5-mini (max_tokens: 40)', action: 'Quick validation call — checks for error codes (UNKNOWN_LANGUAGE, KIDS_ACCEPTABLE, MIN_CHARACTER_LIMIT)' },
  { step: 4, module: 'If-Else (4 branches)', action: 'Branches based on content result: valid content → proceed to image gen; error code → return error; empty → trigger retry' },
  { step: 5, module: 'Sleep 5s + Retry GPT-5-mini (max_tokens: 4000)', action: 'If first call fails or returns empty: sleep 5 seconds, then retry with full token limit for complete content generation' },
  { step: 6, module: 'If-Else (4 branches)', action: 'Checks retry result for same error codes — valid → proceed to image gen; error code → return error; empty → CONTENT_NOT_GENERATED' },
  { step: 7, module: 'OpenAI GPT Image 2', action: 'Generates a photorealistic image based on topic + platform + format' },
  { step: 8, module: 'If image data exists', action: 'If no image data → Sleep 5s → Retry image generation → If still fails → IMAGE_NOT_GENERATED' },
  { step: 9, module: 'Google Drive Upload', action: 'Uploads the generated image to "Content Generation Tekion" folder' },
  { step: 10, module: 'If file ID exists', action: 'If no file ID → Sleep 5s → Retry upload → If still fails → IMAGE_SAVING_FAILED' },
  { step: 11, module: 'Google Drive Share', action: 'Shares the file with "Anyone with link" reader permission' },
  { step: 12, module: 'If share link exists', action: 'If no webContentLink → Sleep 5s → Retry sharing → If still fails → IMAGE_NOT_SHARED. If error thrown → IMAGE_SHARING_FAILED' },
  { step: 13, module: 'Webhook Response', action: 'Returns 200 with content + imageUrl, or 400 with error code' },
] as const;

// ── Retry behavior summary ───────────────────────────────────────────────────

export const RETRY_BEHAVIOR = {
  sleepDuration: '5 seconds',
  steps: [
    { step: 'Content Generation', firstAttempt: 'max_tokens: 40 (quick validation)', retry: 'Sleep 5s → max_tokens: 4000 (full content)' },
    { step: 'Image Generation', firstAttempt: 'GPT Image 2', retry: 'Sleep 5s → Retry GPT Image 2' },
    { step: 'Drive Upload', firstAttempt: 'Upload to "Content Generation Tekion" folder', retry: 'Sleep 5s → Retry upload' },
    { step: 'Drive Sharing', firstAttempt: 'Share with "Anyone with link"', retry: 'Sleep 5s → Retry sharing' },
  ],
} as const;
