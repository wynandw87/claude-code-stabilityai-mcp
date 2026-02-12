export interface Config {
  apiKey: string;
  timeout: number;
  outputDir: string;
  output3dDir: string;
}

// Stability AI API base URL
export const API_BASE = 'https://api.stability.ai';

// Image generation models mapped to endpoints
export const GENERATION_MODELS = {
  'ultra': '/v2beta/stable-image/generate/ultra',
  'core': '/v2beta/stable-image/generate/core',
  'sd3.5-large': '/v2beta/stable-image/generate/sd3',
  'sd3.5-large-turbo': '/v2beta/stable-image/generate/sd3',
  'sd3.5-medium': '/v2beta/stable-image/generate/sd3',
} as const;

export type GenerationModel = keyof typeof GENERATION_MODELS;

// Image editing endpoints
export const EDIT_ENDPOINTS = {
  'erase': '/v2beta/stable-image/edit/erase',
  'inpaint': '/v2beta/stable-image/edit/inpaint',
  'outpaint': '/v2beta/stable-image/edit/outpaint',
  'search-and-replace': '/v2beta/stable-image/edit/search-and-replace',
  'search-and-recolor': '/v2beta/stable-image/edit/search-and-recolor',
  'remove-background': '/v2beta/stable-image/edit/remove-background',
  'replace-background-and-relight': '/v2beta/stable-image/edit/replace-background-and-relight',
} as const;

// Upscale modes
export const UPSCALE_ENDPOINTS = {
  'fast': '/v2beta/stable-image/upscale/fast',
  'conservative': '/v2beta/stable-image/upscale/conservative',
  'creative': '/v2beta/stable-image/upscale/creative',
} as const;

export type UpscaleMode = keyof typeof UPSCALE_ENDPOINTS;

// ControlNet endpoints
export const CONTROL_ENDPOINTS = {
  'sketch': '/v2beta/stable-image/control/sketch',
  'structure': '/v2beta/stable-image/control/structure',
  'style': '/v2beta/stable-image/control/style',
  'style-transfer': '/v2beta/stable-image/control/style-transfer',
} as const;

// 3D generation endpoints
export const THREE_D_ENDPOINTS = {
  'stable-fast-3d': '/v2beta/3d/stable-fast-3d',
  'spar3d': '/v2beta/3d/stable-point-aware-3d',
} as const;

export type ThreeDModel = keyof typeof THREE_D_ENDPOINTS;

// Supported output formats
export const OUTPUT_FORMATS = ['png', 'jpeg', 'webp'] as const;
export type OutputFormat = typeof OUTPUT_FORMATS[number];

// Style presets available for core/sd3 generation
export const STYLE_PRESETS = [
  '3d-model', 'analog-film', 'anime', 'cinematic', 'comic-book',
  'digital-art', 'enhance', 'fantasy-art', 'isometric', 'line-art',
  'low-poly', 'modeling-compound', 'neon-punk', 'origami',
  'photographic', 'pixel-art', 'tile-texture'
] as const;

// Aspect ratios
export const ASPECT_RATIOS = [
  '1:1', '16:9', '21:9', '2:3', '3:2', '4:5', '5:4', '9:16', '9:21'
] as const;

export function loadConfig(): Config {
  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Stability AI API key not configured. Please set the STABILITY_API_KEY environment variable.'
    );
  }

  const outputDir = process.env.STABILITY_OUTPUT_DIR || './generated-images';
  const output3dDir = process.env.STABILITY_3D_OUTPUT_DIR || './generated-3d';

  const timeoutStr = process.env.STABILITY_TIMEOUT;
  const timeout = timeoutStr ? parseInt(timeoutStr, 10) : 60000;

  if (timeout <= 0) {
    throw new Error('STABILITY_TIMEOUT must be a positive number');
  }

  return {
    apiKey,
    timeout,
    outputDir,
    output3dDir
  };
}
