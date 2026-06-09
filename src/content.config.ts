import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const docs = defineCollection({
  loader: glob({
    base: "./contents",
    pattern: [
      "{themes,slides,research,sources,tasks}/**/*.{md,mdx}",
      "*/{themes,slides,research,sources,tasks}/**/*.{md,mdx}",
      "!templates/**",
    ],
    generateId: ({ entry }) => {
      const parts = entry.split("/");
      if (parts.length >= 3 && ["themes", "slides", "research", "sources", "tasks"].includes(parts[1])) {
        return parts.slice(1).join("/").replace(/\.(md|mdx)$/, "");
      }

      return entry.replace(/\.(md|mdx)$/, "");
    },
  }),
  schema: z
    .object({
      title: z.string(),
      navTitle: z.string().optional(),
      description: z.string().optional(),
      kind: z.enum(["theme", "slides", "research", "sources", "task", "article"]).default("article"),
      themeId: z.string().optional(),
      status: z.enum(["draft", "active", "review", "published"]).optional(),
      owner: z.string().optional(),
      updatedAt: z.string().optional(),
      order: z.number().default(100),
      tags: z.array(z.string()).optional(),
    })
    .passthrough(),
});

export const collections = { docs };
