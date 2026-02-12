import * as fs from 'fs';
import * as path from 'path';
import {
  Config, API_BASE,
  GENERATION_MODELS, GenerationModel,
  UPSCALE_ENDPOINTS, UpscaleMode,
  EDIT_ENDPOINTS, CONTROL_ENDPOINTS,
  THREE_D_ENDPOINTS, ThreeDModel,
  OutputFormat
} from './config.js';

export interface ImageResult {
  data: Buffer;
  format: string;
  seed?: number;
  finishReason?: string;
}

export interface ThreeDResult {
  data: Buffer;
  format: string;
}

export interface BalanceResult {
  credits: number;
}

export class StabilityClient {
  private apiKey: string;
  private timeout: number;

  constructor(config: Config) {
    this.apiKey = config.apiKey;
    this.timeout = config.timeout;
  }

  // ---------------------------------------------------------------------------
  // Image Generation
  // ---------------------------------------------------------------------------

  async generateImage(options: {
    prompt: string;
    model?: GenerationModel;
    negativePrompt?: string;
    image?: string; // file path for img-to-img
    strength?: number;
    seed?: number;
    aspectRatio?: string;
    outputFormat?: OutputFormat;
    stylePreset?: string;
  }): Promise<ImageResult> {
    const model = options.model || 'core';
    const endpoint = GENERATION_MODELS[model];

    const form = new FormData();
    form.append('prompt', options.prompt);

    if (options.negativePrompt) form.append('negative_prompt', options.negativePrompt);
    if (options.seed !== undefined) form.append('seed', options.seed.toString());
    if (options.aspectRatio) form.append('aspect_ratio', options.aspectRatio);
    form.append('output_format', options.outputFormat || 'png');

    // SD3 models need the model parameter
    if (model.startsWith('sd3.5')) {
      form.append('model', model);
      if (options.image) {
        form.append('mode', 'image-to-image');
        form.append('image', await this.fileBlob(options.image));
        if (options.strength !== undefined) form.append('strength', options.strength.toString());
      } else {
        form.append('mode', 'text-to-image');
      }
    } else if (model === 'ultra' && options.image) {
      form.append('image', await this.fileBlob(options.image));
      if (options.strength !== undefined) form.append('strength', options.strength.toString());
    }

    if (options.stylePreset && (model === 'core' || model.startsWith('sd3.5'))) {
      form.append('style_preset', options.stylePreset);
    }

    return this.postImage(endpoint, form);
  }

  // ---------------------------------------------------------------------------
  // Image Editing
  // ---------------------------------------------------------------------------

  async eraseObject(options: {
    image: string;
    mask?: string;
    outputFormat?: OutputFormat;
  }): Promise<ImageResult> {
    const form = new FormData();
    form.append('image', await this.fileBlob(options.image));
    if (options.mask) form.append('mask', await this.fileBlob(options.mask));
    form.append('output_format', options.outputFormat || 'png');
    return this.postImage(EDIT_ENDPOINTS['erase'], form);
  }

  async inpaint(options: {
    image: string;
    prompt: string;
    mask?: string;
    negativePrompt?: string;
    seed?: number;
    outputFormat?: OutputFormat;
  }): Promise<ImageResult> {
    const form = new FormData();
    form.append('image', await this.fileBlob(options.image));
    form.append('prompt', options.prompt);
    if (options.mask) form.append('mask', await this.fileBlob(options.mask));
    if (options.negativePrompt) form.append('negative_prompt', options.negativePrompt);
    if (options.seed !== undefined) form.append('seed', options.seed.toString());
    form.append('output_format', options.outputFormat || 'png');
    return this.postImage(EDIT_ENDPOINTS['inpaint'], form);
  }

  async outpaint(options: {
    image: string;
    prompt?: string;
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
    creativity?: number;
    outputFormat?: OutputFormat;
  }): Promise<ImageResult> {
    const form = new FormData();
    form.append('image', await this.fileBlob(options.image));
    if (options.prompt) form.append('prompt', options.prompt);
    if (options.left !== undefined) form.append('left', options.left.toString());
    if (options.right !== undefined) form.append('right', options.right.toString());
    if (options.top !== undefined) form.append('top', options.top.toString());
    if (options.bottom !== undefined) form.append('bottom', options.bottom.toString());
    if (options.creativity !== undefined) form.append('creativity', options.creativity.toString());
    form.append('output_format', options.outputFormat || 'png');
    return this.postImage(EDIT_ENDPOINTS['outpaint'], form);
  }

  async searchAndReplace(options: {
    image: string;
    prompt: string;
    searchPrompt: string;
    negativePrompt?: string;
    seed?: number;
    outputFormat?: OutputFormat;
  }): Promise<ImageResult> {
    const form = new FormData();
    form.append('image', await this.fileBlob(options.image));
    form.append('prompt', options.prompt);
    form.append('search_prompt', options.searchPrompt);
    if (options.negativePrompt) form.append('negative_prompt', options.negativePrompt);
    if (options.seed !== undefined) form.append('seed', options.seed.toString());
    form.append('output_format', options.outputFormat || 'png');
    return this.postImage(EDIT_ENDPOINTS['search-and-replace'], form);
  }

  async searchAndRecolor(options: {
    image: string;
    prompt: string;
    selectPrompt: string;
    negativePrompt?: string;
    seed?: number;
    outputFormat?: OutputFormat;
  }): Promise<ImageResult> {
    const form = new FormData();
    form.append('image', await this.fileBlob(options.image));
    form.append('prompt', options.prompt);
    form.append('select_prompt', options.selectPrompt);
    if (options.negativePrompt) form.append('negative_prompt', options.negativePrompt);
    if (options.seed !== undefined) form.append('seed', options.seed.toString());
    form.append('output_format', options.outputFormat || 'png');
    return this.postImage(EDIT_ENDPOINTS['search-and-recolor'], form);
  }

  async removeBackground(options: {
    image: string;
    outputFormat?: OutputFormat;
  }): Promise<ImageResult> {
    const form = new FormData();
    form.append('image', await this.fileBlob(options.image));
    form.append('output_format', options.outputFormat || 'png');
    return this.postImage(EDIT_ENDPOINTS['remove-background'], form);
  }

  async replaceBackground(options: {
    image: string;
    backgroundPrompt: string;
    foregroundPrompt?: string;
    negativePrompt?: string;
    lightSourceDirection?: string;
    lightSourceStrength?: number;
    outputFormat?: OutputFormat;
  }): Promise<ImageResult> {
    const form = new FormData();
    form.append('image', await this.fileBlob(options.image));
    form.append('background_prompt', options.backgroundPrompt);
    if (options.foregroundPrompt) form.append('foreground_prompt', options.foregroundPrompt);
    if (options.negativePrompt) form.append('negative_prompt', options.negativePrompt);
    if (options.lightSourceDirection) form.append('light_source_direction', options.lightSourceDirection);
    if (options.lightSourceStrength !== undefined) form.append('light_source_strength', options.lightSourceStrength.toString());
    form.append('output_format', options.outputFormat || 'png');
    return this.postImage(EDIT_ENDPOINTS['replace-background-and-relight'], form);
  }

  // ---------------------------------------------------------------------------
  // Image Upscale
  // ---------------------------------------------------------------------------

  async upscaleImage(options: {
    image: string;
    mode?: UpscaleMode;
    prompt?: string;
    negativePrompt?: string;
    seed?: number;
    creativity?: number;
    outputFormat?: OutputFormat;
  }): Promise<ImageResult> {
    const mode = options.mode || 'fast';
    const endpoint = UPSCALE_ENDPOINTS[mode];

    const form = new FormData();
    form.append('image', await this.fileBlob(options.image));
    form.append('output_format', options.outputFormat || 'png');

    if (mode !== 'fast') {
      if (options.prompt) form.append('prompt', options.prompt);
      if (options.negativePrompt) form.append('negative_prompt', options.negativePrompt);
      if (options.seed !== undefined) form.append('seed', options.seed.toString());
      if (options.creativity !== undefined) form.append('creativity', options.creativity.toString());
    }

    // Creative upscale is async — needs polling
    if (mode === 'creative') {
      return this.postImageAsync(endpoint, form);
    }

    return this.postImage(endpoint, form);
  }

  // ---------------------------------------------------------------------------
  // ControlNet
  // ---------------------------------------------------------------------------

  async controlSketch(options: {
    image: string;
    prompt: string;
    negativePrompt?: string;
    seed?: number;
    controlStrength?: number;
    outputFormat?: OutputFormat;
  }): Promise<ImageResult> {
    const form = new FormData();
    form.append('image', await this.fileBlob(options.image));
    form.append('prompt', options.prompt);
    if (options.negativePrompt) form.append('negative_prompt', options.negativePrompt);
    if (options.seed !== undefined) form.append('seed', options.seed.toString());
    if (options.controlStrength !== undefined) form.append('control_strength', options.controlStrength.toString());
    form.append('output_format', options.outputFormat || 'png');
    return this.postImage(CONTROL_ENDPOINTS['sketch'], form);
  }

  async controlStructure(options: {
    image: string;
    prompt: string;
    negativePrompt?: string;
    seed?: number;
    controlStrength?: number;
    outputFormat?: OutputFormat;
  }): Promise<ImageResult> {
    const form = new FormData();
    form.append('image', await this.fileBlob(options.image));
    form.append('prompt', options.prompt);
    if (options.negativePrompt) form.append('negative_prompt', options.negativePrompt);
    if (options.seed !== undefined) form.append('seed', options.seed.toString());
    if (options.controlStrength !== undefined) form.append('control_strength', options.controlStrength.toString());
    form.append('output_format', options.outputFormat || 'png');
    return this.postImage(CONTROL_ENDPOINTS['structure'], form);
  }

  async controlStyle(options: {
    image: string;
    prompt: string;
    negativePrompt?: string;
    seed?: number;
    fidelity?: number;
    outputFormat?: OutputFormat;
  }): Promise<ImageResult> {
    const form = new FormData();
    form.append('image', await this.fileBlob(options.image));
    form.append('prompt', options.prompt);
    if (options.negativePrompt) form.append('negative_prompt', options.negativePrompt);
    if (options.seed !== undefined) form.append('seed', options.seed.toString());
    if (options.fidelity !== undefined) form.append('fidelity', options.fidelity.toString());
    form.append('output_format', options.outputFormat || 'png');
    return this.postImage(CONTROL_ENDPOINTS['style'], form);
  }

  async styleTransfer(options: {
    initImage: string;
    styleImage: string;
    prompt?: string;
    negativePrompt?: string;
    seed?: number;
    outputFormat?: OutputFormat;
  }): Promise<ImageResult> {
    const form = new FormData();
    form.append('init_image', await this.fileBlob(options.initImage));
    form.append('style_image', await this.fileBlob(options.styleImage));
    if (options.prompt) form.append('prompt', options.prompt);
    if (options.negativePrompt) form.append('negative_prompt', options.negativePrompt);
    if (options.seed !== undefined) form.append('seed', options.seed.toString());
    form.append('output_format', options.outputFormat || 'png');
    return this.postImage(CONTROL_ENDPOINTS['style-transfer'], form);
  }

  // ---------------------------------------------------------------------------
  // 3D Generation
  // ---------------------------------------------------------------------------

  async generate3D(options: {
    image: string;
    model?: ThreeDModel;
    textureResolution?: number;
    foregroundRatio?: number;
    remesh?: string;
    guidanceScale?: number;
  }): Promise<ThreeDResult> {
    const model = options.model || 'stable-fast-3d';
    const endpoint = THREE_D_ENDPOINTS[model];

    const form = new FormData();
    form.append('image', await this.fileBlob(options.image));

    if (options.textureResolution !== undefined) {
      form.append('texture_resolution', options.textureResolution.toString());
    }

    if (model === 'stable-fast-3d') {
      if (options.foregroundRatio !== undefined) form.append('foreground_ratio', options.foregroundRatio.toString());
      if (options.remesh) form.append('remesh', options.remesh);
    } else if (model === 'spar3d') {
      if (options.guidanceScale !== undefined) form.append('guidance_scale', options.guidanceScale.toString());
    }

    const response = await this.postRaw(endpoint, form);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`3D generation failed (HTTP ${response.status}): ${errorText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return { data: buffer, format: 'glb' };
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  async checkBalance(): Promise<BalanceResult> {
    const response = await fetch(`${API_BASE}/v1/user/balance`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to check balance (HTTP ${response.status}): ${errorText}`);
    }

    const data = await response.json() as { credits: number };
    return { credits: data.credits };
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private async fileBlob(filePath: string): Promise<Blob> {
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${absolutePath}`);
    }
    const buffer = fs.readFileSync(absolutePath);
    const mimeType = this.getMimeType(absolutePath);
    return new Blob([buffer], { type: mimeType });
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
    };
    return mimeTypes[ext] || 'image/png';
  }

  private async postRaw(endpoint: string, form: FormData): Promise<Response> {
    return fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json',
      },
      body: form,
      signal: AbortSignal.timeout(this.timeout * 3)
    });
  }

  private async postImage(endpoint: string, form: FormData): Promise<ImageResult> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'image/*',
      },
      body: form,
      signal: AbortSignal.timeout(this.timeout * 3)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Stability AI error (HTTP ${response.status}): ${errorText}`);
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const format = contentType.includes('jpeg') ? 'jpeg' : contentType.includes('webp') ? 'webp' : 'png';
    const seed = response.headers.get('x-seed') ? parseInt(response.headers.get('x-seed')!) : undefined;
    const finishReason = response.headers.get('finish-reason') || undefined;

    const buffer = Buffer.from(await response.arrayBuffer());

    return { data: buffer, format, seed, finishReason };
  }

  private async postImageAsync(endpoint: string, form: FormData): Promise<ImageResult> {
    // Step 1: Submit the job
    const submitResponse = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json',
      },
      body: form,
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      throw new Error(`Stability AI error (HTTP ${submitResponse.status}): ${errorText}`);
    }

    const submitData = await submitResponse.json() as { id: string };
    const generationId = submitData.id;

    if (!generationId) {
      throw new Error('No generation ID returned from async endpoint');
    }

    // Step 2: Poll for results
    const maxAttempts = 60;
    const pollInterval = 5000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const pollResponse = await fetch(`${API_BASE}/v2beta/results/${generationId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'image/*',
        },
        signal: AbortSignal.timeout(this.timeout)
      });

      if (pollResponse.status === 202) {
        // Still processing
        continue;
      }

      if (!pollResponse.ok) {
        const errorText = await pollResponse.text();
        throw new Error(`Polling failed (HTTP ${pollResponse.status}): ${errorText}`);
      }

      // Success - return the image
      const contentType = pollResponse.headers.get('content-type') || 'image/png';
      const format = contentType.includes('jpeg') ? 'jpeg' : contentType.includes('webp') ? 'webp' : 'png';
      const seed = pollResponse.headers.get('x-seed') ? parseInt(pollResponse.headers.get('x-seed')!) : undefined;
      const finishReason = pollResponse.headers.get('finish-reason') || undefined;

      const buffer = Buffer.from(await pollResponse.arrayBuffer());
      return { data: buffer, format, seed, finishReason };
    }

    throw new Error(`Async generation timed out after ${maxAttempts * pollInterval / 1000} seconds`);
  }

  private handleError(error: any): Error {
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      return new Error('Stability AI API request timed out. Please try again.');
    }
    if (error.message?.includes('401') || error.message?.includes('403')) {
      return new Error('Invalid Stability AI API key. Please check your STABILITY_API_KEY environment variable.');
    }
    if (error.message?.includes('429')) {
      return new Error('Stability AI API rate limit exceeded. Please wait a moment and try again.');
    }
    if (error.message?.includes('402')) {
      return new Error('Insufficient credits. Please add credits at platform.stability.ai.');
    }
    return new Error(`Stability AI error: ${error.message || error}`);
  }
}

export function createStabilityClient(config: Config): StabilityClient {
  return new StabilityClient(config);
}
