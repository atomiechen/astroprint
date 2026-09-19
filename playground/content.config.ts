import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const cv = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "playground/content/cv",
  }),
  schema: z.object({
    title: z.string().optional(),
    secondaryTitle: z.string().optional(),
    affiliation: z.array(z.string()).optional(),
    contact: z
      .array(
        z.object({
          label: z.string(),
          value: z.string(),
          href: z.string().optional(),
        }),
      )
      .optional(),
  }),
});

export const collections = { cv };
