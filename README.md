# Stability AI MCP Server

MCP server that brings Stability AI to Claude Code — image generation, editing, upscaling, ControlNet, and 3D mesh generation. 15 tools powered by Stable Diffusion 3.5, Stable Image Ultra/Core, and Stable Fast 3D.

## Quick Start

### Step 1: Get Your API Key

1. Go to [Stability AI Platform](https://platform.stability.ai/)
2. Create an account or sign in
3. Generate an API key
4. Copy the key (you'll need it in Step 3)

### Step 2: Install Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Claude Code CLI** - [Installation guide](https://docs.anthropic.com/claude-code)

### Step 3: Install the MCP Server

#### 3.1 Clone the repository

```text
git clone https://github.com/wynandw87/claude-code-stabilityai-mcp.git
cd claude-code-stabilityai-mcp
```

#### 3.2 Install dependencies

**macOS / Linux / Windows:**
```text
npm install
```

> **Note:** Dependencies are installed and the server is built automatically in one step.

#### 3.3 Register with Claude Code

Choose your install scope:

| Scope | Flag | Who can use it |
|-------|------|----------------|
| **User** (recommended) | `-s user` | You, in any project |
| **Project** | `-s project` | Anyone who clones this repo |
| **Local** | `-s local` | Only in current directory |

Replace `YOUR_API_KEY` with your actual Stability AI API key, and use the full path to `dist/index.js`.

> **Tip:** To get the full path, run this from the cloned directory:
> - macOS/Linux: `echo "$(pwd)/dist/index.js"`
> - Windows: `echo %cd%\dist\index.js`

**macOS / Linux:**
```text
claude mcp add -s user StabilityAI -e STABILITY_API_KEY=YOUR_API_KEY -- node /full/path/to/dist/index.js
```

**Windows (CMD):**
```text
claude mcp add -s user StabilityAI -e "STABILITY_API_KEY=YOUR_API_KEY" -- node "C:\full\path\to\dist\index.js"
```

**Windows (PowerShell):**
```text
claude mcp add -s user StabilityAI -e "STABILITY_API_KEY=YOUR_API_KEY" '--' node "C:\full\path\to\dist\index.js"
```

#### Alternative: Use Setup Scripts

The setup scripts handle dependency installation, building, and registration automatically.

**macOS / Linux:**
```text
chmod +x setup.sh
./setup.sh YOUR_API_KEY
```

**Windows (PowerShell):**
```text
.\setup.ps1 -ApiKey YOUR_API_KEY
```

### Step 4: Restart Claude Code

Close and reopen Claude Code for the changes to take effect.

### Step 5: Verify Installation

```text
claude mcp list
```

You should see `StabilityAI` listed with a Connected status.

---

## Features

### Image Generation
- **Generate Image** (`generate_image`) - Text-to-image and image-to-image using Ultra, Core, or SD 3.5 models

### Image Editing
- **Erase Object** (`erase_object`) - Remove objects from images with optional mask
- **Inpaint** (`inpaint`) - Fill masked areas with AI-generated content
- **Outpaint** (`outpaint`) - Extend image boundaries in any direction
- **Search & Replace** (`search_and_replace`) - Find and replace objects by text description
- **Search & Recolor** (`search_and_recolor`) - Find and recolor objects by text description
- **Remove Background** (`remove_background`) - Remove image background with transparency
- **Replace Background** (`replace_background`) - Replace background with AI content and relighting

### Image Upscale
- **Upscale Image** (`upscale_image`) - Enhance resolution with fast, conservative, or creative modes

### ControlNet
- **Sketch to Image** (`control_sketch`) - Generate images from sketches/drawings
- **Structure-Guided** (`control_structure`) - Generate images following reference structure
- **Style-Guided** (`control_style`) - Generate images matching a reference style
- **Style Transfer** (`style_transfer`) - Transfer style from one image to another

### 3D Generation
- **Generate 3D** (`generate_3d`) - Create 3D meshes (glTF/glb) from single images

### Utility
- **Check Balance** (`check_balance`) - View remaining Stability AI credits

---

## Usage

Once installed, use trigger phrases to invoke Stability AI:

| Trigger | Tool | Example |
|---------|------|---------|
| `stability generate`, `stability image` | Generate Image | "stability generate a sunset over mountains" |
| `stability erase` | Erase Object | "stability erase the person from this photo" |
| `stability inpaint` | Inpaint | "stability inpaint a cat in the masked area" |
| `stability outpaint`, `stability extend` | Outpaint | "stability extend this image 500px to the right" |
| `stability replace` | Search & Replace | "stability replace the car with a bicycle" |
| `stability recolor` | Search & Recolor | "stability recolor the dress to red" |
| `stability remove bg` | Remove Background | "stability remove background from this photo" |
| `stability replace bg` | Replace Background | "stability replace background with a beach" |
| `stability upscale` | Upscale Image | "stability upscale this image using creative mode" |
| `stability sketch` | Sketch to Image | "stability sketch: turn this into a realistic house" |
| `stability structure` | Structure-Guided | "stability structure: same layout but as a painting" |
| `stability style guide` | Style-Guided | "stability style: generate in the style of this reference" |
| `stability style transfer` | Style Transfer | "stability transfer the style of painting.png onto photo.jpg" |
| `stability 3d`, `stability mesh` | Generate 3D | "stability 3d: create a mesh from this object photo" |
| `stability balance`, `stability credits` | Check Balance | "stability check my credits balance" |

Or ask naturally:

- *"Use Stability AI to generate an anime-style character"*
- *"Remove the background from this product photo using Stability"*
- *"Upscale this low-res image with Stability AI"*
- *"Turn this sketch into a photorealistic house using Stability"*
- *"Generate a 3D model from this object image"*
- *"Replace the sky in this photo with a dramatic sunset"*
- *"Extend this image to make it wider for a banner"*

---

## Tool Reference

### generate_image

Generate images using Stable Diffusion models. Supports text-to-image and image-to-image.

**Parameters:**
- `prompt` (string, required) - Text description of the image to generate
- `model` (string, optional) - `"ultra"` (highest quality, 8 credits), `"core"` (fast, 3 credits), `"sd3.5-large"`, `"sd3.5-large-turbo"`, `"sd3.5-medium"`
- `negative_prompt` (string, optional) - What to exclude from the image
- `image_path` (string, optional) - Source image for image-to-image generation
- `strength` (number, optional) - Transform amount for img-to-img (0-1)
- `aspect_ratio` (string, optional) - `"1:1"`, `"16:9"`, `"21:9"`, `"2:3"`, `"3:2"`, `"4:5"`, `"5:4"`, `"9:16"`, `"9:21"`
- `style_preset` (string, optional) - `"photographic"`, `"anime"`, `"digital-art"`, `"cinematic"`, `"3d-model"`, `"pixel-art"`, etc.
- `output_format` (string, optional) - `"png"` (default), `"jpeg"`, `"webp"`
- `seed` (integer, optional) - Random seed for reproducibility (0-4294967294)
- `save_path` (string, optional) - File path to save the image

### erase_object

Erase objects from an image.

**Parameters:**
- `image_path` (string, required) - Absolute path to the source image
- `mask_path` (string, optional) - Mask image (white areas erased). Auto-detection if omitted.
- `output_format` (string, optional) - `"png"`, `"jpeg"`, `"webp"`
- `save_path` (string, optional) - File path to save the result

### inpaint

Fill masked areas with AI-generated content.

**Parameters:**
- `image_path` (string, required) - Absolute path to the source image
- `prompt` (string, required) - What to generate in the masked area
- `mask_path` (string, optional) - Mask image (white areas inpainted)
- `negative_prompt` (string, optional) - What to avoid
- `seed` (integer, optional) - Random seed
- `output_format` (string, optional) - `"png"`, `"jpeg"`, `"webp"`
- `save_path` (string, optional) - File path to save the result

### outpaint

Extend an image's boundaries in any direction.

**Parameters:**
- `image_path` (string, required) - Absolute path to the source image
- `prompt` (string, optional) - Description of what to generate in extended area
- `left` / `right` / `top` / `bottom` (integer, optional) - Pixels to extend (0-2000 each)
- `creativity` (number, optional) - Creativity level (0-1)
- `output_format` (string, optional) - `"png"`, `"jpeg"`, `"webp"`
- `save_path` (string, optional) - File path to save the result

### search_and_replace

Find an object by text description and replace it. No mask needed.

**Parameters:**
- `image_path` (string, required) - Absolute path to the source image
- `prompt` (string, required) - What to replace the object with
- `search_prompt` (string, required) - Description of the object to find
- `negative_prompt` (string, optional) - What to avoid
- `seed` (integer, optional) - Random seed
- `output_format` (string, optional) - `"png"`, `"jpeg"`, `"webp"`
- `save_path` (string, optional) - File path to save the result

### search_and_recolor

Find an object by text description and recolor it. No mask needed.

**Parameters:**
- `image_path` (string, required) - Absolute path to the source image
- `prompt` (string, required) - New color/appearance for the object
- `select_prompt` (string, required) - Description of the object to find
- `negative_prompt` (string, optional) - What to avoid
- `seed` (integer, optional) - Random seed
- `output_format` (string, optional) - `"png"`, `"jpeg"`, `"webp"`
- `save_path` (string, optional) - File path to save the result

### remove_background

Remove the background, leaving the foreground subject with transparency.

**Parameters:**
- `image_path` (string, required) - Absolute path to the source image
- `output_format` (string, optional) - `"png"`, `"webp"` (PNG recommended for transparency)
- `save_path` (string, optional) - File path to save the result

### replace_background

Replace the background with AI-generated content and optionally adjust lighting.

**Parameters:**
- `image_path` (string, required) - Absolute path to the source image
- `background_prompt` (string, required) - Description of the new background
- `foreground_prompt` (string, optional) - Description of the foreground subject
- `negative_prompt` (string, optional) - What to avoid
- `light_source_direction` (string, optional) - `"above"`, `"below"`, `"left"`, `"right"`
- `light_source_strength` (number, optional) - Light intensity (0-1)
- `output_format` (string, optional) - `"png"`, `"jpeg"`, `"webp"`
- `save_path` (string, optional) - File path to save the result

### upscale_image

Upscale an image to higher resolution.

**Parameters:**
- `image_path` (string, required) - Absolute path to the image
- `mode` (string, optional) - `"fast"` (quick 2x, 2 credits), `"conservative"` (detail-preserving, 25 credits), `"creative"` (AI-enhanced, 25 credits, async)
- `prompt` (string, optional) - Guide the upscaler (conservative/creative only)
- `negative_prompt` (string, optional) - What to avoid
- `creativity` (number, optional) - How creative the upscaler should be (0-0.35)
- `seed` (integer, optional) - Random seed
- `output_format` (string, optional) - `"png"`, `"jpeg"`, `"webp"`
- `save_path` (string, optional) - File path to save the result

### control_sketch

Generate an image from a sketch/drawing using ControlNet.

**Parameters:**
- `image_path` (string, required) - Absolute path to the sketch image
- `prompt` (string, required) - What to generate from the sketch
- `negative_prompt` (string, optional) - What to avoid
- `control_strength` (number, optional) - How closely to follow the sketch (0-1)
- `seed` (integer, optional) - Random seed
- `output_format` (string, optional) - `"png"`, `"jpeg"`, `"webp"`
- `save_path` (string, optional) - File path to save the result

### control_structure

Generate an image guided by the structure/edges of a reference image.

**Parameters:**
- `image_path` (string, required) - Absolute path to the reference image
- `prompt` (string, required) - What to generate
- `negative_prompt` (string, optional) - What to avoid
- `control_strength` (number, optional) - How closely to follow the structure (0-1)
- `seed` (integer, optional) - Random seed
- `output_format` (string, optional) - `"png"`, `"jpeg"`, `"webp"`
- `save_path` (string, optional) - File path to save the result

### control_style

Generate an image using a reference image to guide visual style.

**Parameters:**
- `image_path` (string, required) - Absolute path to the style reference image
- `prompt` (string, required) - What to generate in the reference style
- `negative_prompt` (string, optional) - What to avoid
- `fidelity` (number, optional) - How closely to match the reference style (0-1)
- `seed` (integer, optional) - Random seed
- `output_format` (string, optional) - `"png"`, `"jpeg"`, `"webp"`
- `save_path` (string, optional) - File path to save the result

### style_transfer

Transfer the visual style of one image onto another.

**Parameters:**
- `init_image_path` (string, required) - Absolute path to the content image
- `style_image_path` (string, required) - Absolute path to the style reference image
- `prompt` (string, optional) - Guide the style transfer
- `negative_prompt` (string, optional) - What to avoid
- `seed` (integer, optional) - Random seed
- `output_format` (string, optional) - `"png"`, `"jpeg"`, `"webp"`
- `save_path` (string, optional) - File path to save the result

### generate_3d

Generate a 3D mesh (glTF/glb) from a single image.

**Parameters:**
- `image_path` (string, required) - Absolute path to the source image
- `model` (string, optional) - `"stable-fast-3d"` (fast, 10 credits) or `"spar3d"` (advanced, 4 credits)
- `texture_resolution` (integer, optional) - 512, 1024, or 2048
- `foreground_ratio` (number, optional) - Foreground object ratio, 0.1-1.0 (stable-fast-3d only)
- `remesh` (string, optional) - `"none"`, `"triangle"`, `"quad"` (stable-fast-3d only)
- `guidance_scale` (number, optional) - 1-10 (spar3d only)
- `save_path` (string, optional) - File path to save the .glb file

### check_balance

Check your Stability AI credits balance. No parameters required.

---

## Supported Models

### Image Generation
| Model | Endpoint | Credits | Best For |
|-------|----------|---------|----------|
| `ultra` | Stable Image Ultra | 8 | Highest quality, photorealistic |
| `core` | Stable Image Core | 3 | Fast iteration, affordable |
| `sd3.5-large` | SD 3.5 Large | 6.5 | High quality, good prompt adherence |
| `sd3.5-large-turbo` | SD 3.5 Large Turbo | 4 | Fast, good quality |
| `sd3.5-medium` | SD 3.5 Medium | 3.5 | Balanced speed and quality |

### 3D Generation
| Model | Credits | Best For |
|-------|---------|----------|
| `stable-fast-3d` | 10 | Fast general-purpose 3D |
| `spar3d` | 4 | Advanced with backside editing |

### Style Presets (for core/sd3 models)
`3d-model` · `analog-film` · `anime` · `cinematic` · `comic-book` · `digital-art` · `enhance` · `fantasy-art` · `isometric` · `line-art` · `low-poly` · `modeling-compound` · `neon-punk` · `origami` · `photographic` · `pixel-art` · `tile-texture`

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STABILITY_API_KEY` | Yes | — | Stability AI API key |
| `STABILITY_TIMEOUT` | No | `60000` | API timeout in ms |
| `STABILITY_OUTPUT_DIR` | No | `./generated-images` | Directory for auto-saved images |
| `STABILITY_3D_OUTPUT_DIR` | No | `./generated-3d` | Directory for auto-saved 3D models |

---

## How It Works

This MCP server uses the Stability AI REST API (v2beta) directly with `fetch` and `FormData`. No SDK required. It connects to Claude Code via stdio transport.

All image endpoints use `multipart/form-data` requests and return binary image data. The creative upscale endpoint is asynchronous — the server handles polling automatically.

**Tools provided:**
| Tool | API Endpoint | Credits |
|------|-------------|---------|
| `generate_image` | `/v2beta/stable-image/generate/{ultra,core,sd3}` | 3-8 |
| `erase_object` | `/v2beta/stable-image/edit/erase` | 4 |
| `inpaint` | `/v2beta/stable-image/edit/inpaint` | 4 |
| `outpaint` | `/v2beta/stable-image/edit/outpaint` | 4 |
| `search_and_replace` | `/v2beta/stable-image/edit/search-and-replace` | 4 |
| `search_and_recolor` | `/v2beta/stable-image/edit/search-and-recolor` | 5 |
| `remove_background` | `/v2beta/stable-image/edit/remove-background` | 4 |
| `replace_background` | `/v2beta/stable-image/edit/replace-background-and-relight` | 8 |
| `upscale_image` | `/v2beta/stable-image/upscale/{fast,conservative,creative}` | 2-25 |
| `control_sketch` | `/v2beta/stable-image/control/sketch` | 5 |
| `control_structure` | `/v2beta/stable-image/control/structure` | 5 |
| `control_style` | `/v2beta/stable-image/control/style` | 5 |
| `style_transfer` | `/v2beta/stable-image/control/style-transfer` | 8 |
| `generate_3d` | `/v2beta/3d/stable-fast-3d` or `/v2beta/3d/stable-point-aware-3d` | 4-10 |
| `check_balance` | `/v1/user/balance` | 0 |

---

## Troubleshooting

### Fix API Key

If you entered the wrong API key, remove and reinstall:

```text
claude mcp remove StabilityAI
```

Then reinstall using the command from Step 3.3 above (use the same scope you originally installed with).

### MCP Server Not Showing Up

Check if the server is installed:

```text
claude mcp list
```

If not listed, follow Step 3 to install it.

### Server Won't Start

1. **Verify your API key** is valid at [Stability AI Platform](https://platform.stability.ai/)

2. **Check Node.js version** (needs 18+):
   ```text
   node --version
   ```

3. **Ensure the server was built** — if `dist/index.js` is missing, run `npm install` again

### Connection Errors

1. **Check that `dist/index.js` exists** — if not, run `npm install`
2. **Verify the path is absolute** in your `claude mcp add` command
3. **Restart Claude Code** after any configuration changes

### Insufficient Credits

If you get a 402 error, add credits at [platform.stability.ai](https://platform.stability.ai/). Check your balance with the `check_balance` tool.

### Timeout Errors

- Image generation and upscaling use extended timeouts (3x base)
- Creative upscale uses async polling (up to 5 minutes)
- Increase `STABILITY_TIMEOUT` environment variable for slow connections

### View Current Configuration

```text
claude mcp list
```

---

## Contributing

Pull requests welcome! Please keep it simple and beginner-friendly.

## License

MIT

---

Made for the Claude Code community
