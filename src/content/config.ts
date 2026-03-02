import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    publishDate: z.coerce.date(),
    client: z.string(),
    industry: z.string(),
    year: z.string().optional(),
    services: z.array(z.string()).optional(),
    image: z.union([z.string(), z.array(z.string())]),
    hoverimage: z.string().optional(),
    isFeatured: z.boolean().default(false),
    seo: z.object({
      image: z.object({
        src: z.string(),
        alt: z.string(),
      }),
    }).optional(),
    tags: z.array(z.string()).optional(),
    contribution: z.array(z.string()).optional(),
    team: z.array(z.string()).optional(),
    agency: z.string().optional(),
  }),
});

export const collections = { projects };
