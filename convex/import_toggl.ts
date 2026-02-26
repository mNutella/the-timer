import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./functions";

const entryValidator = v.object({
	description: v.string(),
	billable: v.boolean(),
	duration_ms: v.number(),
	project: v.string(),
	tag: v.optional(v.string()),
	start_time: v.number(),
	end_time: v.number(),
});

export const importTogglData = internalMutation({
	args: {
		email: v.string(),
		entries: v.array(entryValidator),
	},
	handler: async (ctx, { email, entries }) => {
		// Look up user by email
		const user = await ctx.table("users").get("email", email);
		if (!user) {
			throw new Error(`User not found with email: ${email}`);
		}
		const userId = user._id;
		const now = Date.now();

		// Phase 1: Create clients from unique Toggl project names
		const clientMap = new Map<string, Id<"clients">>();
		const uniqueProjects = [...new Set(entries.map((e) => e.project))];

		for (const projectName of uniqueProjects) {
			const clientId = await ctx.table("clients").insert({
				name: projectName,
				userId,
				updated_at: now,
			});
			clientMap.set(projectName, clientId);
		}

		// Phase 2: Create projects from unique Toggl tags (scoped per client)
		const projectMap = new Map<string, Id<"projects">>();
		const uniqueTags = new Set<string>();
		for (const entry of entries) {
			if (entry.tag) {
				const key = `${entry.project}::${entry.tag}`;
				uniqueTags.add(key);
			}
		}

		for (const key of uniqueTags) {
			const [clientName, tagName] = key.split("::");
			const clientId = clientMap.get(clientName)!;
			const projectId = await ctx.table("projects").insert({
				name: tagName,
				status: "active",
				userId,
				clientId,
				updated_at: now,
			});
			projectMap.set(key, projectId);
		}

		// Phase 3: Create time entries
		for (const entry of entries) {
			const clientId = clientMap.get(entry.project);
			const projectKey = entry.tag
				? `${entry.project}::${entry.tag}`
				: undefined;
			const projectId = projectKey ? projectMap.get(projectKey) : undefined;

			await ctx.table("time_entries").insert({
				name: entry.description,
				userId,
				start_time: entry.start_time,
				end_time: entry.end_time,
				duration: entry.duration_ms,
				billable: entry.billable,
				clientId,
				projectId,
				updated_at: now,
			});
		}

		return {
			clients: clientMap.size,
			projects: projectMap.size,
			timeEntries: entries.length,
		};
	},
});
