import { v } from "convex/values";
import {
	defineEnt,
	defineEntSchema,
	defineEntsFromTables,
	getEntDefinitions,
} from "convex-ents";
import { authTables } from "@convex-dev/auth/server";

const schema = defineEntSchema({
	...defineEntsFromTables(authTables),

	users: defineEnt({
		name: v.optional(v.string()),
		email: v.optional(v.string()),
		image: v.optional(v.string()),
		emailVerificationTime: v.optional(v.number()),
		isAnonymous: v.optional(v.boolean()),
		updated_at: v.optional(v.number()),
	})
		.index("email", ["email"])
		.edges("clients", { ref: true })
		.edges("projects", { ref: true })
		.edges("time_entries", { ref: true })
		.edges("categories", { ref: true })
		.edges("tags", { ref: true }),

	clients: defineEnt({
		name: v.string(),
		updated_at: v.number(),
	})
		.edge("user")
		.edges("projects", { ref: true })
		.edges("time_entries", { ref: true })
		.searchIndex("name", {
			searchField: "name",
			filterFields: ["userId"],
		}),

	projects: defineEnt({
		name: v.string(),
		status: v.union(
			v.literal("active"),
			v.literal("archived"),
			v.literal("completed"),
		),
		updated_at: v.number(),
	})
		.edge("user")
		.edge("client", { to: "clients", field: "clientId", optional: true })
		.edges("time_entries", { ref: true })
		.searchIndex("name", {
			searchField: "name",
			filterFields: ["userId", "clientId"],
		})
		.index("by_user_and_client", ["userId", "clientId"]),

	time_entries: defineEnt({
		name: v.string(),
		description: v.optional(v.string()),
		start_time: v.optional(v.number()),
		end_time: v.optional(v.number()),
		duration: v.optional(v.number()),
		notes: v.optional(v.string()),
		updated_at: v.number(),
	})
		.edge("user")
		.edge("client", { to: "clients", field: "clientId", optional: true })
		.edge("project", { to: "projects", field: "projectId", optional: true })
		.edge("category", { to: "categories", field: "categoryId", optional: true })
		.edges("tags")
		.index("by_user_and_client", ["userId", "clientId"])
		.index("by_user_and_project", ["userId", "projectId"])
		.index("by_user_and_category", ["userId", "categoryId"])
		.index("by_user_start_time", ["userId", "start_time"])
		.index("by_user_end_time", ["userId", "end_time"])
		.index("by_user_client_start", ["userId", "clientId", "start_time"])
		.index("by_user_project_start", ["userId", "projectId", "start_time"])
		.index("by_user_category_start", ["userId", "categoryId", "start_time"])
		.searchIndex("name", {
			searchField: "name",
			filterFields: ["userId", "clientId", "projectId", "categoryId"],
		}),

	categories: defineEnt({
		name: v.string(),
		updated_at: v.number(),
	})
		.edge("user")
		.edges("time_entries", { ref: true })
		.searchIndex("name", {
			searchField: "name",
			filterFields: ["userId"],
		}),

	tags: defineEnt({
		name: v.string(),
		color_code: v.optional(v.string()),
		updated_at: v.number(),
	})
		.edge("user")
		.edges("time_entries")
		.searchIndex("name", {
			searchField: "name",
			filterFields: ["userId"],
		}),
});

export default schema;

export const entDefinitions = getEntDefinitions(schema);
