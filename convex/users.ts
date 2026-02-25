import { query } from "./functions";
import { getRequiredUserId } from "./model/auth";

export const me = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getRequiredUserId(ctx);
		const user = await ctx.table("users").get(userId);
		if (!user) throw new Error("User not found");
		return user.doc();
	},
});
