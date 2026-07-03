import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Shared schema — both collections use the same frontmatter shape.
const postSchema = ({ image }) =>
    z.object({
        title: z.string(),
        description: z.string(),
        // Transform string to Date object
        pubDate: z.coerce.date(),
        updatedDate: z.coerce.date().optional(),
        heroImage: z.optional(image()),
		featured: z.boolean().default(false),   // <-- add this
    });

const blog = defineCollection({
    // Load Markdown and MDX files in the `src/content/blog/` directory.
    loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
    schema: postSchema,
});

const projects = defineCollection({
    // Load Markdown and MDX files in the `src/content/projects/` directory.
    loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
    schema: postSchema,
});

export const collections = { blog, projects };