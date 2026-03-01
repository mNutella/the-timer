import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation } from "./functions";

export const seedAnalyticsData = mutation({
	args: {
		userId: v.id("users"),
	},
	handler: async (ctx, { userId }) => {
		const now = Date.now();

		// Create clients
		const client1 = await ctx.table("clients").insert({
			name: "Acme Corp",
			userId,
			updated_at: now,
		});
		const client2 = await ctx.table("clients").insert({
			name: "Globex Inc",
			userId,
			updated_at: now,
		});

		// Create projects
		const project1 = await ctx.table("projects").insert({
			name: "Website Redesign",
			status: "active",
			userId,
			clientId: client1,
			updated_at: now,
		});
		const project2 = await ctx.table("projects").insert({
			name: "Mobile App",
			status: "active",
			userId,
			clientId: client1,
			updated_at: now,
		});
		const project3 = await ctx.table("projects").insert({
			name: "API Integration",
			status: "active",
			userId,
			clientId: client2,
			updated_at: now,
		});

		// Create categories
		const catDev = await ctx.table("categories").insert({
			name: "Development",
			userId,
			updated_at: now,
		});
		const catDesign = await ctx.table("categories").insert({
			name: "Design",
			userId,
			updated_at: now,
		});
		const catMeetings = await ctx.table("categories").insert({
			name: "Meetings",
			userId,
			updated_at: now,
		});
		const catResearch = await ctx.table("categories").insert({
			name: "Research",
			userId,
			updated_at: now,
		});

		// Helper to create a time entry for a given date with duration in hours
		const hour = 3_600_000;
		function makeEntry(
			name: string,
			daysAgo: number,
			durationHours: number,
			opts: {
				clientId?: Id<"clients">;
				projectId?: Id<"projects">;
				categoryId?: Id<"categories">;
			} = {},
		) {
			const date = new Date(now);
			date.setDate(date.getDate() - daysAgo);
			date.setHours(9, 0, 0, 0);
			const startTime = date.getTime();
			const duration = Math.round(durationHours * hour);
			return {
				name,
				userId,
				start_time: startTime,
				end_time: startTime + duration,
				duration,
				clientId: opts.clientId as Id<"clients"> | undefined,
				projectId: opts.projectId as Id<"projects"> | undefined,
				categoryId: opts.categoryId as Id<"categories"> | undefined,
				updated_at: now,
			};
		}

		const entries = [
			// Recent week
			makeEntry("Build homepage", 1, 4.5, {
				clientId: client1,
				projectId: project1,
				categoryId: catDev,
			}),
			makeEntry("Design review", 1, 1.5, {
				clientId: client1,
				projectId: project1,
				categoryId: catDesign,
			}),
			makeEntry("Sprint planning", 2, 1, { categoryId: catMeetings }),
			makeEntry("API endpoints", 2, 5, {
				clientId: client2,
				projectId: project3,
				categoryId: catDev,
			}),
			makeEntry("Research auth libs", 3, 2, { categoryId: catResearch }),
			makeEntry("Mobile UI", 3, 3.5, {
				clientId: client1,
				projectId: project2,
				categoryId: catDev,
			}),
			makeEntry("Client sync", 4, 0.5, {
				clientId: client1,
				categoryId: catMeetings,
			}),
			makeEntry("Fix bugs", 4, 6, {
				clientId: client2,
				projectId: project3,
				categoryId: catDev,
			}),
			makeEntry("Wireframes", 5, 3, {
				clientId: client1,
				projectId: project1,
				categoryId: catDesign,
			}),
			makeEntry("Code review", 6, 2, { categoryId: catDev }),
			makeEntry("Deploy staging", 7, 1.5, {
				clientId: client2,
				projectId: project3,
				categoryId: catDev,
			}),

			// 2 weeks ago
			makeEntry("Database schema", 10, 4, {
				clientId: client2,
				projectId: project3,
				categoryId: catDev,
			}),
			makeEntry("Stakeholder meeting", 11, 2, {
				clientId: client1,
				categoryId: catMeetings,
			}),
			makeEntry("Landing page design", 12, 5, {
				clientId: client1,
				projectId: project1,
				categoryId: catDesign,
			}),
			makeEntry("Testing", 13, 3, {
				clientId: client1,
				projectId: project2,
				categoryId: catDev,
			}),
			makeEntry("Research GraphQL", 14, 2.5, { categoryId: catResearch }),

			// 1 month ago
			makeEntry("Feature implementation", 30, 6, {
				clientId: client1,
				projectId: project2,
				categoryId: catDev,
			}),
			makeEntry("UI polish", 31, 3, {
				clientId: client1,
				projectId: project1,
				categoryId: catDesign,
			}),
			makeEntry("Team retro", 32, 1, { categoryId: catMeetings }),
			makeEntry("Performance tuning", 33, 4, {
				clientId: client2,
				projectId: project3,
				categoryId: catDev,
			}),
			makeEntry("User interviews", 34, 2, { categoryId: catResearch }),
			makeEntry("Write docs", 35, 2.5, {
				clientId: client1,
				projectId: project1,
				categoryId: catDev,
			}),

			// 2 months ago
			makeEntry("Setup project", 60, 3, {
				clientId: client2,
				projectId: project3,
				categoryId: catDev,
			}),
			makeEntry("Architecture design", 61, 4, { categoryId: catDesign }),
			makeEntry("Kickoff meeting", 62, 1.5, {
				clientId: client2,
				categoryId: catMeetings,
			}),
			makeEntry("Prototype", 63, 5, {
				clientId: client1,
				projectId: project2,
				categoryId: catDev,
			}),
			makeEntry("Competitor analysis", 64, 3, { categoryId: catResearch }),
			makeEntry("Sprint work", 65, 7, {
				clientId: client1,
				projectId: project1,
				categoryId: catDev,
			}),

			// 3 months ago
			makeEntry("Initial planning", 85, 2, { categoryId: catMeetings }),
			makeEntry("Scaffolding", 86, 4, {
				clientId: client1,
				projectId: project1,
				categoryId: catDev,
			}),
			makeEntry("Design system", 87, 5, {
				clientId: client1,
				categoryId: catDesign,
			}),
			makeEntry("Tech spike", 88, 3, { categoryId: catResearch }),
			makeEntry("Backend setup", 89, 6, {
				clientId: client2,
				projectId: project3,
				categoryId: catDev,
			}),
			makeEntry("Misc work", 90, 2, {}), // uncategorized
		];

		for (const entry of entries) {
			await ctx.table("time_entries").insert(entry);
		}

		return { created: entries.length };
	},
});
