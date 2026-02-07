import aggregate from "@convex-dev/aggregate/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();
// app.use(aggregate, { name: "time_entries_by_user" });
app.use(aggregate, { name: "time_entries_total_duration_by_user" });
app.use(aggregate, { name: "time_entries_total_duration_by_client_and_date" });
app.use(aggregate, { name: "time_entries_total_duration_by_project_and_date" });
app.use(aggregate, {
	name: "time_entries_total_duration_by_category_and_date",
});
export default app;
