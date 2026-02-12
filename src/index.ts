#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from './config.js';
import { createStabilityClient } from './stability-client.js';

async function main() {
  try {
    const config = loadConfig();
    const client = createStabilityClient(config);

    const server = new Server(
      {
        name: 'stabilityai-mcp-server',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    // Helper: save binary to disk
    function saveFile(data: Buffer, savePath: string): string {
      const dir = path.dirname(savePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(savePath, data);
      return path.resolve(savePath);
    }

    // Helper: generate auto save path
    function getAutoSavePath(outputDir: string, prefix: string, ext: string = 'png'): string {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${prefix}-${timestamp}.${ext}`;
      return path.resolve(outputDir, filename);
    }

    // -----------------------------------------------------------------------
    // Tool definitions
    // -----------------------------------------------------------------------
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // === IMAGE GENERATION ===
          {
            name: 'generate_image',
            description: "Generate images using Stability AI's Stable Diffusion models. Supports text-to-image and image-to-image with multiple models (ultra, core, sd3.5). Trigger: 'stability generate', 'stability image', or 'stable diffusion'.",
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Text description of the image to generate',
                  maxLength: 10000
                },
                model: {
                  type: 'string',
                  description: 'Model to use: "ultra" (highest quality, 8 credits), "core" (fast/affordable, 3 credits), "sd3.5-large", "sd3.5-large-turbo", "sd3.5-medium"',
                  enum: ['ultra', 'core', 'sd3.5-large', 'sd3.5-large-turbo', 'sd3.5-medium']
                },
                negative_prompt: {
                  type: 'string',
                  description: 'What to exclude from the image'
                },
                image_path: {
                  type: 'string',
                  description: 'Source image path for image-to-image generation (optional)'
                },
                strength: {
                  type: 'number',
                  description: 'How much to transform the source image (0-1, only for image-to-image)',
                  minimum: 0,
                  maximum: 1
                },
                aspect_ratio: {
                  type: 'string',
                  description: 'Aspect ratio: "1:1", "16:9", "21:9", "2:3", "3:2", "4:5", "5:4", "9:16", "9:21"',
                  enum: ['1:1', '16:9', '21:9', '2:3', '3:2', '4:5', '5:4', '9:16', '9:21']
                },
                style_preset: {
                  type: 'string',
                  description: 'Style preset (core/sd3 only): "photographic", "anime", "digital-art", "cinematic", "3d-model", "pixel-art", etc.',
                  enum: ['3d-model', 'analog-film', 'anime', 'cinematic', 'comic-book', 'digital-art', 'enhance', 'fantasy-art', 'isometric', 'line-art', 'low-poly', 'modeling-compound', 'neon-punk', 'origami', 'photographic', 'pixel-art', 'tile-texture']
                },
                output_format: {
                  type: 'string',
                  description: 'Output format: "png" (default), "jpeg", "webp"',
                  enum: ['png', 'jpeg', 'webp']
                },
                seed: {
                  type: 'integer',
                  description: 'Random seed for reproducibility (0-4294967294)',
                  minimum: 0,
                  maximum: 4294967294
                },
                save_path: {
                  type: 'string',
                  description: 'File path to save the image. If not provided, auto-saves to output directory.'
                }
              },
              required: ['prompt']
            }
          },

          // === IMAGE EDITING ===
          {
            name: 'erase_object',
            description: "Erase objects from an image using Stability AI. Provide an image and optionally a mask to indicate what to erase. Trigger: 'stability erase'.",
            inputSchema: {
              type: 'object',
              properties: {
                image_path: {
                  type: 'string',
                  description: 'Absolute path to the source image'
                },
                mask_path: {
                  type: 'string',
                  description: 'Absolute path to mask image (white areas will be erased). If omitted, auto-detection is used.'
                },
                output_format: {
                  type: 'string',
                  enum: ['png', 'jpeg', 'webp']
                },
                save_path: { type: 'string', description: 'File path to save the result' }
              },
              required: ['image_path']
            }
          },
          {
            name: 'inpaint',
            description: "Fill in masked areas of an image with new AI-generated content based on a text prompt. Trigger: 'stability inpaint'.",
            inputSchema: {
              type: 'object',
              properties: {
                image_path: {
                  type: 'string',
                  description: 'Absolute path to the source image'
                },
                prompt: {
                  type: 'string',
                  description: 'What to generate in the masked area'
                },
                mask_path: {
                  type: 'string',
                  description: 'Absolute path to mask image (white areas will be inpainted)'
                },
                negative_prompt: { type: 'string' },
                seed: { type: 'integer', minimum: 0, maximum: 4294967294 },
                output_format: { type: 'string', enum: ['png', 'jpeg', 'webp'] },
                save_path: { type: 'string' }
              },
              required: ['image_path', 'prompt']
            }
          },
          {
            name: 'outpaint',
            description: "Extend an image's boundaries in any direction with AI-generated content. Trigger: 'stability outpaint', 'stability extend'.",
            inputSchema: {
              type: 'object',
              properties: {
                image_path: {
                  type: 'string',
                  description: 'Absolute path to the source image'
                },
                prompt: {
                  type: 'string',
                  description: 'Description of what to generate in the extended area'
                },
                left: { type: 'integer', description: 'Pixels to extend left (0-2000)', minimum: 0, maximum: 2000 },
                right: { type: 'integer', description: 'Pixels to extend right (0-2000)', minimum: 0, maximum: 2000 },
                top: { type: 'integer', description: 'Pixels to extend top (0-2000)', minimum: 0, maximum: 2000 },
                bottom: { type: 'integer', description: 'Pixels to extend bottom (0-2000)', minimum: 0, maximum: 2000 },
                creativity: { type: 'number', description: 'Creativity level (0-1)', minimum: 0, maximum: 1 },
                output_format: { type: 'string', enum: ['png', 'jpeg', 'webp'] },
                save_path: { type: 'string' }
              },
              required: ['image_path']
            }
          },
          {
            name: 'search_and_replace',
            description: "Find an object in an image by text description and replace it with something else. No mask needed. Trigger: 'stability replace'.",
            inputSchema: {
              type: 'object',
              properties: {
                image_path: {
                  type: 'string',
                  description: 'Absolute path to the source image'
                },
                prompt: {
                  type: 'string',
                  description: 'What to replace the found object with'
                },
                search_prompt: {
                  type: 'string',
                  description: 'Description of the object to find and replace'
                },
                negative_prompt: { type: 'string' },
                seed: { type: 'integer', minimum: 0, maximum: 4294967294 },
                output_format: { type: 'string', enum: ['png', 'jpeg', 'webp'] },
                save_path: { type: 'string' }
              },
              required: ['image_path', 'prompt', 'search_prompt']
            }
          },
          {
            name: 'search_and_recolor',
            description: "Find an object in an image by text description and recolor it. No mask needed. Trigger: 'stability recolor'.",
            inputSchema: {
              type: 'object',
              properties: {
                image_path: {
                  type: 'string',
                  description: 'Absolute path to the source image'
                },
                prompt: {
                  type: 'string',
                  description: 'The new color/appearance for the object'
                },
                select_prompt: {
                  type: 'string',
                  description: 'Description of the object to find and recolor'
                },
                negative_prompt: { type: 'string' },
                seed: { type: 'integer', minimum: 0, maximum: 4294967294 },
                output_format: { type: 'string', enum: ['png', 'jpeg', 'webp'] },
                save_path: { type: 'string' }
              },
              required: ['image_path', 'prompt', 'select_prompt']
            }
          },
          {
            name: 'remove_background',
            description: "Remove the background from an image, leaving only the foreground subject with transparency. Trigger: 'stability remove bg', 'stability remove background'.",
            inputSchema: {
              type: 'object',
              properties: {
                image_path: {
                  type: 'string',
                  description: 'Absolute path to the source image'
                },
                output_format: { type: 'string', enum: ['png', 'webp'] },
                save_path: { type: 'string' }
              },
              required: ['image_path']
            }
          },
          {
            name: 'replace_background',
            description: "Replace the background of an image with AI-generated content and optionally adjust lighting. Trigger: 'stability replace bg', 'stability replace background'.",
            inputSchema: {
              type: 'object',
              properties: {
                image_path: {
                  type: 'string',
                  description: 'Absolute path to the source image'
                },
                background_prompt: {
                  type: 'string',
                  description: 'Description of the new background to generate'
                },
                foreground_prompt: {
                  type: 'string',
                  description: 'Optional description of the foreground subject for better results'
                },
                negative_prompt: { type: 'string' },
                light_source_direction: {
                  type: 'string',
                  description: 'Direction of light source: "above", "below", "left", "right"',
                  enum: ['above', 'below', 'left', 'right']
                },
                light_source_strength: {
                  type: 'number',
                  description: 'Strength of the light source (0-1)',
                  minimum: 0,
                  maximum: 1
                },
                output_format: { type: 'string', enum: ['png', 'jpeg', 'webp'] },
                save_path: { type: 'string' }
              },
              required: ['image_path', 'background_prompt']
            }
          },

          // === UPSCALE ===
          {
            name: 'upscale_image',
            description: "Upscale an image to higher resolution using Stability AI. Three modes: 'fast' (quick 2x), 'conservative' (detail-preserving), 'creative' (AI-enhanced, async). Trigger: 'stability upscale'.",
            inputSchema: {
              type: 'object',
              properties: {
                image_path: {
                  type: 'string',
                  description: 'Absolute path to the image to upscale'
                },
                mode: {
                  type: 'string',
                  description: 'Upscale mode: "fast" (2 credits), "conservative" (25 credits), "creative" (25 credits, async)',
                  enum: ['fast', 'conservative', 'creative']
                },
                prompt: {
                  type: 'string',
                  description: 'Guide the upscaler (conservative/creative modes only)'
                },
                negative_prompt: { type: 'string' },
                creativity: {
                  type: 'number',
                  description: 'How creative the upscaler should be (0-0.35, conservative/creative only)',
                  minimum: 0,
                  maximum: 0.35
                },
                seed: { type: 'integer', minimum: 0, maximum: 4294967294 },
                output_format: { type: 'string', enum: ['png', 'jpeg', 'webp'] },
                save_path: { type: 'string' }
              },
              required: ['image_path']
            }
          },

          // === CONTROLNET ===
          {
            name: 'control_sketch',
            description: "Generate an image from a sketch/drawing using ControlNet. The sketch guides the composition while the prompt defines the content. Trigger: 'stability sketch'.",
            inputSchema: {
              type: 'object',
              properties: {
                image_path: {
                  type: 'string',
                  description: 'Absolute path to the sketch/drawing image'
                },
                prompt: {
                  type: 'string',
                  description: 'Text description of what to generate from the sketch'
                },
                negative_prompt: { type: 'string' },
                control_strength: {
                  type: 'number',
                  description: 'How closely to follow the sketch (0-1)',
                  minimum: 0,
                  maximum: 1
                },
                seed: { type: 'integer', minimum: 0, maximum: 4294967294 },
                output_format: { type: 'string', enum: ['png', 'jpeg', 'webp'] },
                save_path: { type: 'string' }
              },
              required: ['image_path', 'prompt']
            }
          },
          {
            name: 'control_structure',
            description: "Generate an image guided by the structure/edges of a reference image using ControlNet. Preserves composition while changing content. Trigger: 'stability structure'.",
            inputSchema: {
              type: 'object',
              properties: {
                image_path: {
                  type: 'string',
                  description: 'Absolute path to the reference image (its structure will guide generation)'
                },
                prompt: {
                  type: 'string',
                  description: 'Text description of what to generate'
                },
                negative_prompt: { type: 'string' },
                control_strength: {
                  type: 'number',
                  description: 'How closely to follow the structure (0-1)',
                  minimum: 0,
                  maximum: 1
                },
                seed: { type: 'integer', minimum: 0, maximum: 4294967294 },
                output_format: { type: 'string', enum: ['png', 'jpeg', 'webp'] },
                save_path: { type: 'string' }
              },
              required: ['image_path', 'prompt']
            }
          },
          {
            name: 'control_style',
            description: "Generate an image using a reference image to guide the visual style. The reference provides style cues while the prompt defines content. Trigger: 'stability style guide'.",
            inputSchema: {
              type: 'object',
              properties: {
                image_path: {
                  type: 'string',
                  description: 'Absolute path to the style reference image'
                },
                prompt: {
                  type: 'string',
                  description: 'Text description of what to generate in the reference style'
                },
                negative_prompt: { type: 'string' },
                fidelity: {
                  type: 'number',
                  description: 'How closely to match the reference style (0-1)',
                  minimum: 0,
                  maximum: 1
                },
                seed: { type: 'integer', minimum: 0, maximum: 4294967294 },
                output_format: { type: 'string', enum: ['png', 'jpeg', 'webp'] },
                save_path: { type: 'string' }
              },
              required: ['image_path', 'prompt']
            }
          },
          {
            name: 'style_transfer',
            description: "Transfer the visual style of one image onto another. Combines a content image with a style reference. Trigger: 'stability style transfer'.",
            inputSchema: {
              type: 'object',
              properties: {
                init_image_path: {
                  type: 'string',
                  description: 'Absolute path to the content/source image'
                },
                style_image_path: {
                  type: 'string',
                  description: 'Absolute path to the style reference image'
                },
                prompt: {
                  type: 'string',
                  description: 'Optional prompt to guide the style transfer'
                },
                negative_prompt: { type: 'string' },
                seed: { type: 'integer', minimum: 0, maximum: 4294967294 },
                output_format: { type: 'string', enum: ['png', 'jpeg', 'webp'] },
                save_path: { type: 'string' }
              },
              required: ['init_image_path', 'style_image_path']
            }
          },

          // === 3D GENERATION ===
          {
            name: 'generate_3d',
            description: "Generate a 3D mesh (glTF/glb) from a single image using Stability AI. Two models: 'stable-fast-3d' (fast, 10 credits) and 'spar3d' (advanced, 4 credits). Trigger: 'stability 3d', 'stability mesh'.",
            inputSchema: {
              type: 'object',
              properties: {
                image_path: {
                  type: 'string',
                  description: 'Absolute path to the source image (clear subject on simple background works best)'
                },
                model: {
                  type: 'string',
                  description: 'Model: "stable-fast-3d" (fast, general purpose) or "spar3d" (advanced, editable)',
                  enum: ['stable-fast-3d', 'spar3d']
                },
                texture_resolution: {
                  type: 'integer',
                  description: 'Texture resolution: 512, 1024, or 2048',
                  enum: [512, 1024, 2048]
                },
                foreground_ratio: {
                  type: 'number',
                  description: 'Foreground object ratio (0.1-1.0, stable-fast-3d only)',
                  minimum: 0.1,
                  maximum: 1.0
                },
                remesh: {
                  type: 'string',
                  description: 'Remeshing algorithm (stable-fast-3d only): "none", "triangle", "quad"',
                  enum: ['none', 'triangle', 'quad']
                },
                guidance_scale: {
                  type: 'number',
                  description: 'Guidance scale (1-10, spar3d only)',
                  minimum: 1,
                  maximum: 10
                },
                save_path: {
                  type: 'string',
                  description: 'File path to save the .glb file. If not provided, auto-saves to output directory.'
                }
              },
              required: ['image_path']
            }
          },

          // === UTILITY ===
          {
            name: 'check_balance',
            description: "Check your Stability AI credits balance. Trigger: 'stability balance', 'stability credits'.",
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          }
        ]
      };
    });

    // -----------------------------------------------------------------------
    // Tool handlers
    // -----------------------------------------------------------------------
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'generate_image': {
            const schema = z.object({
              prompt: z.string().min(1),
              model: z.enum(['ultra', 'core', 'sd3.5-large', 'sd3.5-large-turbo', 'sd3.5-medium']).optional(),
              negative_prompt: z.string().optional(),
              image_path: z.string().optional(),
              strength: z.number().min(0).max(1).optional(),
              aspect_ratio: z.string().optional(),
              style_preset: z.string().optional(),
              output_format: z.enum(['png', 'jpeg', 'webp']).optional(),
              seed: z.number().int().min(0).max(4294967294).optional(),
              save_path: z.string().optional()
            });
            const input = schema.parse(args);

            if (input.image_path && !fs.existsSync(path.resolve(input.image_path))) {
              return { content: [{ type: 'text', text: `Source image not found: ${input.image_path}` }], isError: true };
            }

            const result = await client.generateImage({
              prompt: input.prompt,
              model: input.model,
              negativePrompt: input.negative_prompt,
              image: input.image_path,
              strength: input.strength,
              seed: input.seed,
              aspectRatio: input.aspect_ratio,
              outputFormat: input.output_format,
              stylePreset: input.style_preset
            });

            const format = input.output_format || 'png';
            const savePath = input.save_path || getAutoSavePath(config.outputDir, 'generated', format);
            const savedTo = saveFile(result.data, savePath);

            let text = `Image generated and saved to: ${savedTo}`;
            if (result.seed !== undefined) text += `\nSeed: ${result.seed}`;
            text += `\nModel: ${input.model || 'core'}`;

            return {
              content: [
                { type: 'image', data: result.data.toString('base64'), mimeType: `image/${format}` },
                { type: 'text', text }
              ]
            };
          }

          case 'erase_object': {
            const schema = z.object({
              image_path: z.string().min(1),
              mask_path: z.string().optional(),
              output_format: z.enum(['png', 'jpeg', 'webp']).optional(),
              save_path: z.string().optional()
            });
            const input = schema.parse(args);

            if (!fs.existsSync(path.resolve(input.image_path))) {
              return { content: [{ type: 'text', text: `Image not found: ${input.image_path}` }], isError: true };
            }

            const result = await client.eraseObject({
              image: input.image_path,
              mask: input.mask_path,
              outputFormat: input.output_format
            });

            const format = input.output_format || 'png';
            const savePath = input.save_path || getAutoSavePath(config.outputDir, 'erased', format);
            const savedTo = saveFile(result.data, savePath);

            return {
              content: [
                { type: 'image', data: result.data.toString('base64'), mimeType: `image/${format}` },
                { type: 'text', text: `Object erased. Saved to: ${savedTo}` }
              ]
            };
          }

          case 'inpaint': {
            const schema = z.object({
              image_path: z.string().min(1),
              prompt: z.string().min(1),
              mask_path: z.string().optional(),
              negative_prompt: z.string().optional(),
              seed: z.number().int().optional(),
              output_format: z.enum(['png', 'jpeg', 'webp']).optional(),
              save_path: z.string().optional()
            });
            const input = schema.parse(args);

            if (!fs.existsSync(path.resolve(input.image_path))) {
              return { content: [{ type: 'text', text: `Image not found: ${input.image_path}` }], isError: true };
            }

            const result = await client.inpaint({
              image: input.image_path,
              prompt: input.prompt,
              mask: input.mask_path,
              negativePrompt: input.negative_prompt,
              seed: input.seed
            });

            const format = input.output_format || 'png';
            const savePath = input.save_path || getAutoSavePath(config.outputDir, 'inpainted', format);
            const savedTo = saveFile(result.data, savePath);

            return {
              content: [
                { type: 'image', data: result.data.toString('base64'), mimeType: `image/${format}` },
                { type: 'text', text: `Inpainted image saved to: ${savedTo}` }
              ]
            };
          }

          case 'outpaint': {
            const schema = z.object({
              image_path: z.string().min(1),
              prompt: z.string().optional(),
              left: z.number().int().min(0).max(2000).optional(),
              right: z.number().int().min(0).max(2000).optional(),
              top: z.number().int().min(0).max(2000).optional(),
              bottom: z.number().int().min(0).max(2000).optional(),
              creativity: z.number().min(0).max(1).optional(),
              output_format: z.enum(['png', 'jpeg', 'webp']).optional(),
              save_path: z.string().optional()
            });
            const input = schema.parse(args);

            if (!fs.existsSync(path.resolve(input.image_path))) {
              return { content: [{ type: 'text', text: `Image not found: ${input.image_path}` }], isError: true };
            }

            const result = await client.outpaint({
              image: input.image_path,
              prompt: input.prompt,
              left: input.left,
              right: input.right,
              top: input.top,
              bottom: input.bottom,
              creativity: input.creativity,
              outputFormat: input.output_format
            });

            const format = input.output_format || 'png';
            const savePath = input.save_path || getAutoSavePath(config.outputDir, 'outpainted', format);
            const savedTo = saveFile(result.data, savePath);

            return {
              content: [
                { type: 'image', data: result.data.toString('base64'), mimeType: `image/${format}` },
                { type: 'text', text: `Outpainted image saved to: ${savedTo}` }
              ]
            };
          }

          case 'search_and_replace': {
            const schema = z.object({
              image_path: z.string().min(1),
              prompt: z.string().min(1),
              search_prompt: z.string().min(1),
              negative_prompt: z.string().optional(),
              seed: z.number().int().optional(),
              output_format: z.enum(['png', 'jpeg', 'webp']).optional(),
              save_path: z.string().optional()
            });
            const input = schema.parse(args);

            if (!fs.existsSync(path.resolve(input.image_path))) {
              return { content: [{ type: 'text', text: `Image not found: ${input.image_path}` }], isError: true };
            }

            const result = await client.searchAndReplace({
              image: input.image_path,
              prompt: input.prompt,
              searchPrompt: input.search_prompt,
              negativePrompt: input.negative_prompt,
              seed: input.seed,
              outputFormat: input.output_format
            });

            const format = input.output_format || 'png';
            const savePath = input.save_path || getAutoSavePath(config.outputDir, 'replaced', format);
            const savedTo = saveFile(result.data, savePath);

            return {
              content: [
                { type: 'image', data: result.data.toString('base64'), mimeType: `image/${format}` },
                { type: 'text', text: `Replaced "${input.search_prompt}" with "${input.prompt}". Saved to: ${savedTo}` }
              ]
            };
          }

          case 'search_and_recolor': {
            const schema = z.object({
              image_path: z.string().min(1),
              prompt: z.string().min(1),
              select_prompt: z.string().min(1),
              negative_prompt: z.string().optional(),
              seed: z.number().int().optional(),
              output_format: z.enum(['png', 'jpeg', 'webp']).optional(),
              save_path: z.string().optional()
            });
            const input = schema.parse(args);

            if (!fs.existsSync(path.resolve(input.image_path))) {
              return { content: [{ type: 'text', text: `Image not found: ${input.image_path}` }], isError: true };
            }

            const result = await client.searchAndRecolor({
              image: input.image_path,
              prompt: input.prompt,
              selectPrompt: input.select_prompt,
              negativePrompt: input.negative_prompt,
              seed: input.seed,
              outputFormat: input.output_format
            });

            const format = input.output_format || 'png';
            const savePath = input.save_path || getAutoSavePath(config.outputDir, 'recolored', format);
            const savedTo = saveFile(result.data, savePath);

            return {
              content: [
                { type: 'image', data: result.data.toString('base64'), mimeType: `image/${format}` },
                { type: 'text', text: `Recolored "${input.select_prompt}" to "${input.prompt}". Saved to: ${savedTo}` }
              ]
            };
          }

          case 'remove_background': {
            const schema = z.object({
              image_path: z.string().min(1),
              output_format: z.enum(['png', 'webp']).optional(),
              save_path: z.string().optional()
            });
            const input = schema.parse(args);

            if (!fs.existsSync(path.resolve(input.image_path))) {
              return { content: [{ type: 'text', text: `Image not found: ${input.image_path}` }], isError: true };
            }

            const result = await client.removeBackground({
              image: input.image_path,
              outputFormat: input.output_format
            });

            const format = input.output_format || 'png';
            const savePath = input.save_path || getAutoSavePath(config.outputDir, 'nobg', format);
            const savedTo = saveFile(result.data, savePath);

            return {
              content: [
                { type: 'image', data: result.data.toString('base64'), mimeType: `image/${format}` },
                { type: 'text', text: `Background removed. Saved to: ${savedTo}` }
              ]
            };
          }

          case 'replace_background': {
            const schema = z.object({
              image_path: z.string().min(1),
              background_prompt: z.string().min(1),
              foreground_prompt: z.string().optional(),
              negative_prompt: z.string().optional(),
              light_source_direction: z.enum(['above', 'below', 'left', 'right']).optional(),
              light_source_strength: z.number().min(0).max(1).optional(),
              output_format: z.enum(['png', 'jpeg', 'webp']).optional(),
              save_path: z.string().optional()
            });
            const input = schema.parse(args);

            if (!fs.existsSync(path.resolve(input.image_path))) {
              return { content: [{ type: 'text', text: `Image not found: ${input.image_path}` }], isError: true };
            }

            const result = await client.replaceBackground({
              image: input.image_path,
              backgroundPrompt: input.background_prompt,
              foregroundPrompt: input.foreground_prompt,
              negativePrompt: input.negative_prompt,
              lightSourceDirection: input.light_source_direction,
              lightSourceStrength: input.light_source_strength,
              outputFormat: input.output_format
            });

            const format = input.output_format || 'png';
            const savePath = input.save_path || getAutoSavePath(config.outputDir, 'newbg', format);
            const savedTo = saveFile(result.data, savePath);

            return {
              content: [
                { type: 'image', data: result.data.toString('base64'), mimeType: `image/${format}` },
                { type: 'text', text: `Background replaced. Saved to: ${savedTo}` }
              ]
            };
          }

          case 'upscale_image': {
            const schema = z.object({
              image_path: z.string().min(1),
              mode: z.enum(['fast', 'conservative', 'creative']).optional(),
              prompt: z.string().optional(),
              negative_prompt: z.string().optional(),
              creativity: z.number().min(0).max(0.35).optional(),
              seed: z.number().int().optional(),
              output_format: z.enum(['png', 'jpeg', 'webp']).optional(),
              save_path: z.string().optional()
            });
            const input = schema.parse(args);

            if (!fs.existsSync(path.resolve(input.image_path))) {
              return { content: [{ type: 'text', text: `Image not found: ${input.image_path}` }], isError: true };
            }

            const mode = input.mode || 'fast';
            const result = await client.upscaleImage({
              image: input.image_path,
              mode,
              prompt: input.prompt,
              negativePrompt: input.negative_prompt,
              seed: input.seed,
              creativity: input.creativity,
              outputFormat: input.output_format
            });

            const format = input.output_format || 'png';
            const savePath = input.save_path || getAutoSavePath(config.outputDir, `upscaled-${mode}`, format);
            const savedTo = saveFile(result.data, savePath);

            return {
              content: [
                { type: 'image', data: result.data.toString('base64'), mimeType: `image/${format}` },
                { type: 'text', text: `Image upscaled (${mode} mode). Saved to: ${savedTo}` }
              ]
            };
          }

          case 'control_sketch': {
            const schema = z.object({
              image_path: z.string().min(1),
              prompt: z.string().min(1),
              negative_prompt: z.string().optional(),
              control_strength: z.number().min(0).max(1).optional(),
              seed: z.number().int().optional(),
              output_format: z.enum(['png', 'jpeg', 'webp']).optional(),
              save_path: z.string().optional()
            });
            const input = schema.parse(args);

            if (!fs.existsSync(path.resolve(input.image_path))) {
              return { content: [{ type: 'text', text: `Sketch image not found: ${input.image_path}` }], isError: true };
            }

            const result = await client.controlSketch({
              image: input.image_path,
              prompt: input.prompt,
              negativePrompt: input.negative_prompt,
              controlStrength: input.control_strength,
              seed: input.seed,
              outputFormat: input.output_format
            });

            const format = input.output_format || 'png';
            const savePath = input.save_path || getAutoSavePath(config.outputDir, 'sketch', format);
            const savedTo = saveFile(result.data, savePath);

            return {
              content: [
                { type: 'image', data: result.data.toString('base64'), mimeType: `image/${format}` },
                { type: 'text', text: `Generated from sketch. Saved to: ${savedTo}` }
              ]
            };
          }

          case 'control_structure': {
            const schema = z.object({
              image_path: z.string().min(1),
              prompt: z.string().min(1),
              negative_prompt: z.string().optional(),
              control_strength: z.number().min(0).max(1).optional(),
              seed: z.number().int().optional(),
              output_format: z.enum(['png', 'jpeg', 'webp']).optional(),
              save_path: z.string().optional()
            });
            const input = schema.parse(args);

            if (!fs.existsSync(path.resolve(input.image_path))) {
              return { content: [{ type: 'text', text: `Reference image not found: ${input.image_path}` }], isError: true };
            }

            const result = await client.controlStructure({
              image: input.image_path,
              prompt: input.prompt,
              negativePrompt: input.negative_prompt,
              controlStrength: input.control_strength,
              seed: input.seed,
              outputFormat: input.output_format
            });

            const format = input.output_format || 'png';
            const savePath = input.save_path || getAutoSavePath(config.outputDir, 'structure', format);
            const savedTo = saveFile(result.data, savePath);

            return {
              content: [
                { type: 'image', data: result.data.toString('base64'), mimeType: `image/${format}` },
                { type: 'text', text: `Structure-guided image generated. Saved to: ${savedTo}` }
              ]
            };
          }

          case 'control_style': {
            const schema = z.object({
              image_path: z.string().min(1),
              prompt: z.string().min(1),
              negative_prompt: z.string().optional(),
              fidelity: z.number().min(0).max(1).optional(),
              seed: z.number().int().optional(),
              output_format: z.enum(['png', 'jpeg', 'webp']).optional(),
              save_path: z.string().optional()
            });
            const input = schema.parse(args);

            if (!fs.existsSync(path.resolve(input.image_path))) {
              return { content: [{ type: 'text', text: `Style reference not found: ${input.image_path}` }], isError: true };
            }

            const result = await client.controlStyle({
              image: input.image_path,
              prompt: input.prompt,
              negativePrompt: input.negative_prompt,
              fidelity: input.fidelity,
              seed: input.seed,
              outputFormat: input.output_format
            });

            const format = input.output_format || 'png';
            const savePath = input.save_path || getAutoSavePath(config.outputDir, 'styled', format);
            const savedTo = saveFile(result.data, savePath);

            return {
              content: [
                { type: 'image', data: result.data.toString('base64'), mimeType: `image/${format}` },
                { type: 'text', text: `Style-guided image generated. Saved to: ${savedTo}` }
              ]
            };
          }

          case 'style_transfer': {
            const schema = z.object({
              init_image_path: z.string().min(1),
              style_image_path: z.string().min(1),
              prompt: z.string().optional(),
              negative_prompt: z.string().optional(),
              seed: z.number().int().optional(),
              output_format: z.enum(['png', 'jpeg', 'webp']).optional(),
              save_path: z.string().optional()
            });
            const input = schema.parse(args);

            if (!fs.existsSync(path.resolve(input.init_image_path))) {
              return { content: [{ type: 'text', text: `Content image not found: ${input.init_image_path}` }], isError: true };
            }
            if (!fs.existsSync(path.resolve(input.style_image_path))) {
              return { content: [{ type: 'text', text: `Style image not found: ${input.style_image_path}` }], isError: true };
            }

            const result = await client.styleTransfer({
              initImage: input.init_image_path,
              styleImage: input.style_image_path,
              prompt: input.prompt,
              negativePrompt: input.negative_prompt,
              seed: input.seed,
              outputFormat: input.output_format
            });

            const format = input.output_format || 'png';
            const savePath = input.save_path || getAutoSavePath(config.outputDir, 'transferred', format);
            const savedTo = saveFile(result.data, savePath);

            return {
              content: [
                { type: 'image', data: result.data.toString('base64'), mimeType: `image/${format}` },
                { type: 'text', text: `Style transferred. Saved to: ${savedTo}` }
              ]
            };
          }

          case 'generate_3d': {
            const schema = z.object({
              image_path: z.string().min(1),
              model: z.enum(['stable-fast-3d', 'spar3d']).optional(),
              texture_resolution: z.number().int().optional(),
              foreground_ratio: z.number().min(0.1).max(1.0).optional(),
              remesh: z.enum(['none', 'triangle', 'quad']).optional(),
              guidance_scale: z.number().min(1).max(10).optional(),
              save_path: z.string().optional()
            });
            const input = schema.parse(args);

            if (!fs.existsSync(path.resolve(input.image_path))) {
              return { content: [{ type: 'text', text: `Image not found: ${input.image_path}` }], isError: true };
            }

            const result = await client.generate3D({
              image: input.image_path,
              model: input.model,
              textureResolution: input.texture_resolution,
              foregroundRatio: input.foreground_ratio,
              remesh: input.remesh,
              guidanceScale: input.guidance_scale
            });

            const savePath = input.save_path || getAutoSavePath(config.output3dDir, 'model', 'glb');
            const savedTo = saveFile(result.data, savePath);

            return {
              content: [
                { type: 'text', text: `3D model generated and saved to: ${savedTo}\nFormat: glTF Binary (.glb)\nModel: ${input.model || 'stable-fast-3d'}\nSize: ${(result.data.length / 1024).toFixed(1)} KB` }
              ]
            };
          }

          case 'check_balance': {
            const result = await client.checkBalance();
            return {
              content: [{ type: 'text', text: `Stability AI Credits: ${result.credits.toFixed(2)}` }]
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Stability AI error: ${error.message || error}` }],
          isError: true
        };
      }
    });

    // Start server
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('Stability AI MCP Server v1.0.0 running');

    process.on('SIGINT', async () => {
      console.error('Shutting down Stability AI MCP Server...');
      await server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('Shutting down Stability AI MCP Server...');
      await server.close();
      process.exit(0);
    });
  } catch (error: any) {
    console.error('Failed to start Stability AI MCP Server:', error.message);
    process.exit(1);
  }
}

main();
