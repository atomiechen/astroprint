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
  }),
});

export const collections = { cv };
