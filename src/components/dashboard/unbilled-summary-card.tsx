import { useQuery } from "convex-helpers/react/cache";
import { DollarSign } from "lucide-react";
import { api } from "@/../convex/_generated/api";
import { formatDuration } from "@/lib/utils";

function formatCents(cents: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(cents / 100);
}

export function UnbilledSummaryCard() {
	const unbilled = useQuery(api.invoices.getUnbilledTotal, {});

	if (!unbilled) return null;
	if (unbilled.amount_cents === 0 && unbilled.entry_count === 0) return null;

	return (
		<div className="rounded-xl border border-border bg-card">
			<div className="flex items-center gap-4 px-4 py-4 lg:px-6">
				<div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10">
					<DollarSign className="size-5 text-amber-500" />
				</div>
				<div className="flex-1">
					<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
						Unbilled
					</p>
					<p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
						{formatCents(unbilled.amount_cents)}
					</p>
				</div>
				<div className="text-right">
					<p className="text-sm text-muted-foreground tabular-nums">
						{formatDuration(unbilled.duration_ms)}
					</p>
					<p className="text-xs text-muted-foreground">
						{unbilled.entry_count} entries
					</p>
				</div>
			</div>
		</div>
	);
}
