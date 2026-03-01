import type { Id } from "../_generated/dataModel";

export function assertOwnership(
	entity: { userId: Id<"users"> },
	userId: Id<"users">,
	entityType: string,
) {
	if (entity.userId !== userId) {
		throw new Error(`${entityType} does not belong to user`);
	}
}

export function applyOrFilter<Q, T extends string>(query: Q, fieldName: T, ids: string[]): Q {
	if (ids.length === 0) return query;
	// biome-ignore lint/suspicious/noExplicitAny: Convex filter API requires dynamic field access
	return (query as any).filter((q: any) => {
		let expr = q.eq(q.field(fieldName), ids[0]);
		for (let i = 1; i < ids.length; i++) {
			expr = q.or(expr, q.eq(q.field(fieldName), ids[i]));
		}
		return expr;
	}) as Q;
}
