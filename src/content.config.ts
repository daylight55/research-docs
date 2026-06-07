import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const docs = defineCollection({
  loader: glob({ base: "./src/content/docs", pattern: "**/*.{md,mdx}" }),
  schema: z
    .object({
      title: z.string(),
      navTitle: z.string().optional(),
      description: z.string().optional(),
      kind: z.enum(["slides", "research", "sources", "task", "article"]).default("article"),
      order: z.number().default(100),
      tags: z.array(z.string()).optional(),
    })
    .passthrough(),
});

export const collections = { docs };
