import type { QueryCtx } from "../types";
import type { Id } from "../_generated/dataModel";
import {
	timeEntriesTotalDurationByCategoryAndDateAggregate,
	timeEntriesTotalDurationByClientAndDateAggregate,
	timeEntriesTotalDurationByDateAggregate,
	timeEntriesTotalDurationByProjectAndDateAggregate,
} from "../aggregates";
import { getEndOfDay, getStartOfDay } from "../utils";

export async function getTotalHoursByDate(
	ctx: QueryCtx,
	{
		userId,
		filters,
	}: {
		userId: Id<"users">;
		filters: {
			dateRange: { startDate: number; endDate: number };
		};
	},
) {
	const { startDate, endDate } = filters?.dateRange ?? {};

	let totalDuration = 0;
	if (startDate !== undefined) {
		totalDuration = await timeEntriesTotalDurationByDateAggregate.sum(ctx, {
			namespace: userId,
			bounds: {
				lower: {
					key: [getStartOfDay(startDate ?? 0)],
					inclusive: true,
				},
				upper: {
					key: [getEndOfDay(endDate ?? 0)],
					inclusive: true,
				},
			},
		});
	}

	return totalDuration;
}

export async function getTotalHoursByClientAndDate(
	ctx: QueryCtx,
	{
		userId,
		filters,
	}: {
		userId: Id<"users">;
		filters: {
			clientId?: string | null;
			dateRange: { startDate: number; endDate: number };
		};
	},
) {
	const { clientId } = filters ?? {};
	const { startDate, endDate } = filters?.dateRange ?? {};

	let totalDuration = 0;
	if (startDate !== undefined) {
		totalDuration = await timeEntriesTotalDurationByClientAndDateAggregate.sum(
			ctx,
			{
				namespace: userId,
				bounds: {
					lower: {
						key: [clientId ?? "", getStartOfDay(startDate ?? 0)],
						inclusive: true,
					},
					upper: {
						key: [clientId ?? "\uffff", getEndOfDay(endDate ?? 0)],
						inclusive: true,
					},
				},
			},
		);
	}

	return totalDuration;
}

export async function getTotalHoursByProjectAndDate(
	ctx: QueryCtx,
	{
		userId,
		filters,
	}: {
		userId: Id<"users">;
		filters: {
			projectId?: string | null;
			dateRange: { startDate: number; endDate: number };
		};
	},
) {
	const { projectId } = filters ?? {};
	const { startDate, endDate } = filters?.dateRange ?? {};

	let totalDuration = 0;
	if (startDate !== undefined) {
		totalDuration = await timeEntriesTotalDurationByProjectAndDateAggregate.sum(
			ctx,
			{
				namespace: userId,
				bounds: {
					lower: {
						key: [projectId ?? "", getStartOfDay(startDate ?? 0)],
						inclusive: true,
					},
					upper: {
						key: [projectId ?? "\uffff", getEndOfDay(endDate ?? 0)],
						inclusive: true,
					},
				},
			},
		);
	}

	return totalDuration;
}

export async function getTotalHoursByCategoryAndDate(
	ctx: QueryCtx,
	{
		userId,
		filters,
	}: {
		userId: Id<"users">;
		filters: {
			categoryId?: string | null;
			dateRange: { startDate: number; endDate: number };
		};
	},
) {
	const { categoryId } = filters ?? {};
	const { startDate, endDate } = filters?.dateRange ?? {};

	let totalDuration = 0;
	if (startDate !== undefined) {
		totalDuration =
			await timeEntriesTotalDurationByCategoryAndDateAggregate.sum(ctx, {
				namespace: userId,
				bounds: {
					lower: {
						key: [categoryId ?? "", getStartOfDay(startDate ?? 0)],
						inclusive: true,
					},
					upper: {
						key: [categoryId ?? "\uffff", getEndOfDay(endDate ?? 0)],
						inclusive: true,
					},
				},
			});
	}

	return totalDuration;
}
