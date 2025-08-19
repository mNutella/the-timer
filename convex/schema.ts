import { v } from "convex/values";
import { defineEnt, defineEntSchema, getEntDefinitions } from "convex-ents";

const schema = defineEntSchema({
	users: defineEnt({
		name: v.string(),
		password_hash: v.string(),
		updated_at: v.number(),
	})
		.field("email", v.string(), { unique: true })
		.edges("clients", { ref: true })
		.edges("projects", { ref: true })
		.edges("activities", { ref: true })
		.edges("time_entries", { ref: true })
		.edges("categories", { ref: true })
		.edges("tags", { ref: true }),

	clients: defineEnt({
		name: v.string(),
		updated_at: v.number(),
	})
		.edge("user")
		.edges("projects", { ref: true })
		.edges("activities", { ref: true })
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
		.edges("activities", { ref: true })
		.searchIndex("name", {
			searchField: "name",
			filterFields: ["userId", "clientId"],
		})
		.index("by_user_and_client", ["userId", "clientId"]),

	activities: defineEnt({
		name: v.string(),
		description: v.optional(v.string()),
		updated_at: v.number(),
	})
		.edge("user")
		.edge("client", { to: "clients", field: "clientId", optional: true })
		.edge("project", { to: "projects", field: "projectId", optional: true })
		.edge("category", { to: "categories", field: "categoryId", optional: true })
		.edges("time_entries", { ref: true })
		.edges("tags"),

	time_entries: defineEnt({
		start_time: v.number(),
		end_time: v.optional(v.number()),
		duration: v.optional(v.number()),
		notes: v.optional(v.string()),
		updated_at: v.number(),
	})
		.edge("user")
		.edge("activity", { to: "activities", field: "activityId" }),

	categories: defineEnt({
		name: v.string(),
		updated_at: v.number(),
	})
		.edge("user")
		.edges("activities", { ref: true })
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
		.edges("activities")
		.searchIndex("name", {
			searchField: "name",
			filterFields: ["userId"],
		}),
});

export default schema;

export const entDefinitions = getEntDefinitions(schema);
