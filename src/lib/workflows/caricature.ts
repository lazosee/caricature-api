import { Buffer } from "node:buffer";
import {
  WorkflowEntrypoint,
  WorkflowEvent,
  WorkflowStep,
} from "cloudflare:workers";

export class CaricatureWorkflow extends WorkflowEntrypoint<CloudflareBindings> {
  async run(event: WorkflowEvent<{ imageKey: string }>, step: WorkflowStep) {
    const { imageKey } = event.payload;

    // COMBINED STEP 1 & 2: Fetch and analyze directly to keep state small
    const visualDescription = await step.do(
      "fetch-and-analyze-image",
      async () => {
        // 1. Fetch raw image bytes from R2
        const obj = await this.env.R2.get(imageKey);
        if (!obj) throw new Error("Target image missing from storage");

        const originalImageBytes = await obj.arrayBuffer();
        const uInt8Array = Array.from(new Uint8Array(originalImageBytes));

        // 2. Leverage Vision LLM to generate an accurate prompt description
        const response = await this.env.AI.run("@cf/llava-hf/llava-1.5-7b-hf", {
          image: uInt8Array,
          prompt: `
            Analyze the provided face in the image strictly for a high-fidelity caricature portrait. 
            Output a precise, comma-separated list answering these exact anatomical details:
            - Ethnicity & Skin Tone: State the exact shade of Black/African deep brown skin tone.
            - Hair: Describe the precise texture (e.g., very short, closely cropped, tightly coiled/textured black African natural hair, clean hairline, no facial hair/completely clean-shaven).
            - Head & Face Shape: Identify the facial structure (e.g., strong rounded jawline, broad forehead, smooth clear complexion).
            - Eyes & Brows: Describe the shape and placement (e.g., prominent, large, intense dark brown eyes, direct serious gaze, naturally defined flat eyebrows).
            - Nose & Mouth: Outline structural shape (e.g., broad natural nose, full well-defined lips held in a calm, neutral, unsmiling expression).
            - Clothing: Identify the specific pattern (e.g., a dark collared shirt with thin, vertical red/pink pinstripes).
            Do not use abstract artistic terms. Give raw physical characteristics.
            `,
          max_tokens: 200,
        });

        // Only return the text string (well under 1MiB limit)
        return response.description;
      },
    );

    // STEP 3: Pass descriptions into a generation model formatted for caricatures
    const caricatureBytes = await step.do("generate-caricature", async () => {
      const enhancedPrompt = `
        A professional, vibrant 2D digital vector art caricature portrait of a single person.
        The character MUST perfectly match these exact anatomical features: ${visualDescription}.
        
        STRICT STYLISTIC RULES:
        - Exaggerate the exact features provided: keep the hair strictly short, tightly coiled, and textured. The head should be oversized, emphasizing the prominent dark eyes and direct neutral expression.
        - Maintain the exact deep African brown skin tone.
        - Dress the character in a simplified cartoon version of the dark shirt with vertical pinstripes.
        - Face MUST be completely clean-shaven with no beard, no mustache, and no stubble.
        - Graphic style: Bold, clean black outlines, smooth digital gradients, high contrast cel-shading, completely flat white background.
        - The character must look directly at the viewer with a calm, neutral, intense gaze.
        `;

      const response = await this.env.AI.run(
        "@cf/black-forest-labs/flux-1-schnell",
        {
          prompt: enhancedPrompt,
          steps: 8,
        },
      );

      return response.image;
    });

    // STEP 4: Store back to R2 for downstream CDN delivery
    await step.do("save-final-artwork", async () => {
      const buffer = Buffer.from(caricatureBytes ?? "", "base64");
      await this.env.R2.put(`caricatures/${imageKey}`, buffer, {
        httpMetadata: {
          contentType: "image/jpeg",
        },
      });
    });
  }
}
