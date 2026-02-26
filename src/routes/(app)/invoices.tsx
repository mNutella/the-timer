import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery as useRealtimeQuery } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import {
	ArrowLeft,
	Calendar as CalendarIcon,
	ChevronRight,
	ClipboardCopy,
	DollarSign,
	Hash,
	Inbox,
	Pencil,
	Plus,
	Receipt,
	Save,
	Trash2,
	X,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn, formatDuration } from "@/lib/utils";

export const Route = createFileRoute("/(app)/invoices")({
	component: InvoicesPage,
});

type GroupByDimension = "client" | "project" | "category" | "name";

const DIMENSION_LABELS: Record<GroupByDimension, string> = {
	client: "Client",
	project: "Project",
	category: "Category",
	name: "Entry Name",
};

const ALL_DIMENSIONS: GroupByDimension[] = [
	"client",
	"project",
	"category",
	"name",
];

function formatCents(cents: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(cents / 100);
}

function formatDate(ms: number): string {
	return new Date(ms).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function DatePickerButton({
	label,
	value,
	onChange,
	hint,
}: {
	label: string;
	value: Date | undefined;
	onChange: (date: Date | undefined) => void;
	hint?: string;
}) {
	const [open, setOpen] = useState(false);

	return (
		<div className="flex flex-col gap-1.5">
			<Label>{label}</Label>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						className={cn(
							"h-9 justify-start text-left font-normal",
							!value && "text-muted-foreground",
						)}
					>
						<CalendarIcon className="size-4 text-muted-foreground" />
						{value ? formatDate(value.getTime()) : "Pick a date"}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						mode="single"
						selected={value}
						onSelect={(date) => {
							onChange(date);
							setOpen(false);
						}}
						className="bg-transparent p-3"
						captionLayout="dropdown"
					/>
				</PopoverContent>
			</Popover>
			{hint && <p className="text-xs text-muted-foreground">{hint}</p>}
		</div>
	);
}

// ─── Invoice List View ────────────────────────────────────────────

function InvoiceListView({
	onCreateNew,
}: { onCreateNew: () => void }) {
	const invoices = useQuery(api.invoices.list, {});
	const deleteInvoice = useMutation(api.invoices.deleteOne);

	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div className="px-4 lg:px-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">
							Invoices
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							Create and manage invoices from your time entries.
						</p>
					</div>
					<Button onClick={onCreateNew}>
						<Plus className="size-4" />
						New Invoice
					</Button>
				</div>

				{/* Summary Strip */}
				<div className="mt-4 rounded-xl border border-border bg-card">
					<div className="grid grid-cols-1 divide-y divide-border @xl/main:grid-cols-2 @xl/main:divide-y-0 @xl/main:divide-x">
						<div className="flex items-center gap-4 px-4 py-4 lg:px-6">
							<div className="flex size-11 items-center justify-center rounded-xl bg-success/10">
								<Receipt className="size-5 text-success" />
							</div>
							<div>
								<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
									Total Invoices
								</p>
								<p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
									{invoices ? invoices.length : "--"}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-3 px-4 py-4 @xl/main:pl-6 lg:px-6">
							<div className="flex size-8 items-center justify-center rounded-lg bg-muted">
								<DollarSign className="size-4 text-muted-foreground" />
							</div>
							<div>
								<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
									Total Billed
								</p>
								<p className="mt-0.5 text-xl font-semibold tabular-nums">
									{invoices
										? formatCents(
												invoices
													.filter((i) => i.status === "finalized")
													.reduce((sum, i) => sum + i.subtotal_cents, 0),
											)
										: "--"}
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Invoice Table */}
				<Card className="mt-4">
					<CardContent className="p-0">
						{invoices?.length === 0 && (
							<div className="flex flex-col items-center justify-center py-16 text-center">
								<div className="flex size-12 items-center justify-center rounded-xl bg-muted">
									<Inbox className="size-6 text-muted-foreground" />
								</div>
								<h3 className="mt-4 text-sm font-medium">
									No invoices yet
								</h3>
								<p className="mt-1 text-sm text-muted-foreground">
									Create your first invoice from your billable time entries.
								</p>
								<Button
									className="mt-4"
									size="sm"
									onClick={onCreateNew}
								>
									<Plus className="size-4" />
									New Invoice
								</Button>
							</div>
						)}

						{invoices && invoices.length > 0 && (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="pl-4 lg:pl-6">
											Invoice
										</TableHead>
										<TableHead className="w-40">Client</TableHead>
										<TableHead className="w-40">Period</TableHead>
										<TableHead className="w-28">Status</TableHead>
										<TableHead className="w-32 text-right">
											Amount
										</TableHead>
										<TableHead className="w-20 pr-4 text-right lg:pr-6">
											Actions
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{invoices.map((invoice) => (
										<TableRow key={invoice._id}>
											<TableCell className="pl-4 font-medium lg:pl-6">
												{invoice.number || `INV-${invoice._id.slice(-6)}`}
											</TableCell>
											<TableCell className="text-muted-foreground">
												{invoice.clientName ?? "All Clients"}
											</TableCell>
											<TableCell className="text-muted-foreground text-sm">
												{new Date(
													invoice.start_date,
												).toLocaleDateString()}{" "}
												-{" "}
												{new Date(
													invoice.end_date,
												).toLocaleDateString()}
											</TableCell>
											<TableCell>
												<Badge
													variant={
														invoice.status === "finalized"
															? "default"
															: "secondary"
													}
												>
													{invoice.status}
												</Badge>
											</TableCell>
											<TableCell className="text-right font-medium tabular-nums">
												{formatCents(invoice.subtotal_cents)}
											</TableCell>
											<TableCell className="pr-4 text-right lg:pr-6">
												<Button
													size="icon"
													variant="ghost"
													className="size-7 text-destructive hover:text-destructive"
													onClick={() =>
														deleteInvoice({
															id: invoice._id as Id<"invoices">,
														}).catch(() =>
															toast.error("Failed to delete"),
														)
													}
												>
													<Trash2 className="size-3.5" />
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

// ─── Grouping Controls ────────────────────────────────────────────

function GroupingControls({
	rules,
	onRulesChange,
	mergeEntries,
	onMergeChange,
	includeDateRange,
	onDateRangeToggle,
	includeDuration,
	onDurationToggle,
}: {
	rules: GroupByDimension[];
	onRulesChange: (rules: GroupByDimension[]) => void;
	mergeEntries: boolean;
	onMergeChange: (v: boolean) => void;
	includeDateRange: boolean;
	onDateRangeToggle: (v: boolean) => void;
	includeDuration: boolean;
	onDurationToggle: (v: boolean) => void;
}) {
	const availableDimensions = ALL_DIMENSIONS.filter(
		(d) => !rules.includes(d),
	);

	const removeRule = (dim: GroupByDimension) => {
		onRulesChange(rules.filter((r) => r !== dim));
	};

	const addRule = (dim: GroupByDimension) => {
		onRulesChange([...rules, dim]);
	};

	return (
		<div className="flex flex-col gap-3">
			<Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
				Group By
			</Label>
			<div className="flex flex-wrap items-center gap-2">
				{rules.map((dim, idx) => (
					<div key={dim} className="flex items-center">
						{idx > 0 && (
							<ChevronRight className="mx-1 size-3 text-muted-foreground" />
						)}
						<Badge
							variant="secondary"
							className="gap-1 pr-1"
						>
							<Hash className="size-3 text-muted-foreground" />
							{DIMENSION_LABELS[dim]}
							<button
								type="button"
								onClick={() => removeRule(dim)}
								className="ml-1 rounded-sm p-0.5 hover:bg-muted-foreground/20"
							>
								<X className="size-3" />
							</button>
						</Badge>
					</div>
				))}
				{availableDimensions.length > 0 && (
					<Select
						value=""
						onValueChange={(val) =>
							addRule(val as GroupByDimension)
						}
					>
						<SelectTrigger className="h-7 w-auto gap-1 border-dashed px-2 text-xs">
							<Plus className="size-3" />
							<span>Add level</span>
						</SelectTrigger>
						<SelectContent>
							{availableDimensions.map((dim) => (
								<SelectItem key={dim} value={dim}>
									{DIMENSION_LABELS[dim]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
			</div>
			<div className="flex flex-wrap items-center gap-4">
				<label className="flex items-center gap-2 text-sm">
					<Switch
						checked={mergeEntries}
						onCheckedChange={onMergeChange}
					/>
					Merge same-name entries
				</label>
				<label className="flex items-center gap-2 text-sm">
					<Switch
						checked={includeDateRange}
						onCheckedChange={onDateRangeToggle}
					/>
					Show date range
				</label>
				<label className="flex items-center gap-2 text-sm">
					<Switch
						checked={includeDuration}
						onCheckedChange={onDurationToggle}
					/>
					Show duration
				</label>
			</div>
		</div>
	);
}

// ─── Line Items Preview ───────────────────────────────────────────

interface PreviewData {
	lineItems: {
		label: string;
		duration_ms: number;
		rate_cents: number;
		amount_cents: number;
		group_key?: string;
	}[];
	subtotal_cents: number;
	total_duration_ms: number;
	entry_count: number;
}

function LineItemsPreview({ data }: { data: PreviewData | undefined }) {
	if (!data) {
		return (
			<div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
				Loading preview...
			</div>
		);
	}

	if (data.lineItems.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-12 text-center">
				<div className="flex size-10 items-center justify-center rounded-lg bg-muted">
					<Inbox className="size-5 text-muted-foreground" />
				</div>
				<p className="mt-3 text-sm text-muted-foreground">
					No billable entries found in this period.
				</p>
			</div>
		);
	}

	return (
		<div>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="pl-4 lg:pl-6">
							Description
						</TableHead>
						<TableHead className="w-28">Duration</TableHead>
						<TableHead className="w-28 text-right">Rate</TableHead>
						<TableHead className="w-32 pr-4 text-right lg:pr-6">
							Amount
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{data.lineItems.map((item, idx) => (
						<TableRow key={`${item.group_key ?? idx}`}>
							<TableCell className="pl-4 lg:pl-6">
								{item.label}
							</TableCell>
							<TableCell className="tabular-nums text-muted-foreground">
								{formatDuration(item.duration_ms)}
							</TableCell>
							<TableCell className="text-right tabular-nums text-muted-foreground">
								{item.rate_cents > 0
									? formatCents(item.rate_cents) + "/hr"
									: "—"}
							</TableCell>
							<TableCell className="pr-4 text-right font-medium tabular-nums lg:pr-6">
								{formatCents(item.amount_cents)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			{/* Totals */}
			<Separator />
			<div className="flex items-center justify-between px-4 py-3 lg:px-6">
				<span className="text-sm text-muted-foreground">
					{data.lineItems.length} {data.lineItems.length === 1 ? "item" : "items"} /{" "}
					{formatDuration(data.total_duration_ms)}
				</span>
				<span className="text-lg font-semibold tabular-nums">
					{formatCents(data.subtotal_cents)}
				</span>
			</div>
		</div>
	);
}

// ─── Invoice Creation View ────────────────────────────────────────

function InvoiceCreateView({ onBack }: { onBack: () => void }) {
	const clients = useQuery(api.clients.list, {});

	// Date range
	const lastEndDate = useQuery(api.invoices.getLastEndDate, {});
	const defaultStart = lastEndDate ? new Date(lastEndDate + 1) : undefined;
	const [startDate, setStartDate] = useState<Date | undefined>(undefined);
	const [endDate, setEndDate] = useState<Date | undefined>(undefined);

	// Use suggested start date if user hasn't picked one yet
	const effectiveStartDate = startDate ?? defaultStart;
	const effectiveStart = effectiveStartDate?.getTime();
	const effectiveEnd = endDate?.getTime();

	// Client filter
	const [clientFilter, setClientFilter] = useState<string>("all");
	const selectedClientId =
		clientFilter !== "all" ? (clientFilter as Id<"clients">) : undefined;

	// Grouping
	const [groupingRules, setGroupingRules] = useState<GroupByDimension[]>([
		"client",
		"project",
	]);
	const [mergeEntries, setMergeEntries] = useState(true);
	const [includeDateRange, setIncludeDateRange] = useState(true);
	const [includeDuration, setIncludeDuration] = useState(true);

	// Invoice number — auto-generate, editable
	const invoiceCount = useQuery(api.invoices.list, {});
	const autoNumber = invoiceCount
		? `INV-${String(invoiceCount.length + 1).padStart(4, "0")}`
		: "";
	const [invoiceNumberOverride, setInvoiceNumberOverride] = useState("");
	const [editingNumber, setEditingNumber] = useState(false);
	const invoiceNumber = invoiceNumberOverride || autoNumber;

	const [notes, setNotes] = useState("");

	// Preview query
	const previewArgs =
		effectiveStart && effectiveEnd
			? {
					startDate: effectiveStart,
					endDate: effectiveEnd,
					clientId: selectedClientId,
					groupingRules: groupingRules.map((g) => ({ group_by: g })),
					mergeEntries,
					includeDateRange,
					includeDuration,
				}
			: "skip";

	const preview = useRealtimeQuery(
		api.invoices.previewLineItems,
		previewArgs === "skip" ? "skip" : previewArgs,
	);

	// Actions
	const createInvoice = useMutation(api.invoices.create);

	const handleCopyToClipboard = useCallback(() => {
		if (!preview?.lineItems.length) return;

		const lines = preview.lineItems.map((item) => {
			const amount = (item.amount_cents / 100).toFixed(2);
			return `Description: ${item.label}\nQty: 1\nUnit Price: ${amount}\nAmount: ${amount}`;
		});

		navigator.clipboard
			.writeText(lines.join("\n\n"))
			.then(() => toast.success("Copied to clipboard"))
			.catch(() => toast.error("Failed to copy"));
	}, [preview]);

	const handleSave = useCallback(
		async (status: "draft" | "finalized") => {
			if (!effectiveStart || !effectiveEnd || !preview) return;
			try {
				await createInvoice({
					number: invoiceNumber || undefined,
					clientId: selectedClientId,
					startDate: effectiveStart,
					endDate: effectiveEnd,
					lineItems: preview.lineItems,
					subtotal_cents: preview.subtotal_cents,
					notes: notes || undefined,
					status,
				});
				toast.success(
					status === "finalized"
						? "Invoice finalized"
						: "Invoice saved as draft",
				);
				onBack();
			} catch {
				toast.error("Failed to save invoice");
			}
		},
		[
			effectiveStart,
			effectiveEnd,
			preview,
			invoiceNumber,
			selectedClientId,
			notes,
			createInvoice,
			onBack,
		],
	);

	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div className="px-4 lg:px-6">
				{/* Header */}
				<div className="flex items-center gap-3">
					<Button variant="ghost" size="icon" onClick={onBack}>
						<ArrowLeft className="size-4" />
					</Button>
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">
							New Invoice
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							Select a period and grouping to generate line items.
						</p>
					</div>
				</div>

				{/* Configuration */}
				<Card className="mt-4">
					<CardHeader>
						<CardTitle className="text-base">Period & Scope</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{/* Start Date */}
						<DatePickerButton
							label="Start Date"
							value={effectiveStartDate}
							onChange={setStartDate}
							hint={
								defaultStart && !startDate
									? "Suggested from last invoice"
									: undefined
							}
						/>

						{/* End Date */}
						<DatePickerButton
							label="End Date"
							value={endDate}
							onChange={setEndDate}
						/>

						{/* Client Filter */}
						<div className="flex flex-col gap-1.5">
							<Label>Client</Label>
							<Select
								value={clientFilter}
								onValueChange={setClientFilter}
							>
								<SelectTrigger className="h-9">
									<SelectValue placeholder="All Clients" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Clients</SelectItem>
									{clients?.map((client) => (
										<SelectItem
											key={client._id}
											value={client._id}
										>
											{client.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Invoice Number */}
						<div className="flex flex-col gap-1.5">
							<Label>Invoice #</Label>
							{editingNumber ? (
								<Input
									autoFocus
									placeholder={autoNumber}
									value={invoiceNumberOverride}
									onChange={(e) =>
										setInvoiceNumberOverride(e.target.value)
									}
									onBlur={() => setEditingNumber(false)}
									onKeyDown={(e) => {
										if (e.key === "Enter") setEditingNumber(false);
										if (e.key === "Escape") {
											setInvoiceNumberOverride("");
											setEditingNumber(false);
										}
									}}
									className="h-9"
								/>
							) : (
								<Button
									variant="outline"
									className="h-9 justify-between font-normal"
									onClick={() => setEditingNumber(true)}
								>
									<span className={cn(!invoiceNumber && "text-muted-foreground")}>
										{invoiceNumber || "Auto"}
									</span>
									<Pencil className="size-3 text-muted-foreground" />
								</Button>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Grouping */}
				<Card className="mt-4">
					<CardHeader>
						<CardTitle className="text-base">Grouping</CardTitle>
						<CardDescription>
							Choose how to group time entries into line items.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<GroupingControls
							rules={groupingRules}
							onRulesChange={setGroupingRules}
							mergeEntries={mergeEntries}
							onMergeChange={setMergeEntries}
							includeDateRange={includeDateRange}
							onDateRangeToggle={setIncludeDateRange}
							includeDuration={includeDuration}
							onDurationToggle={setIncludeDuration}
						/>
					</CardContent>
				</Card>

				{/* Preview */}
				<Card className="mt-4">
					<CardHeader>
						<CardTitle className="text-base">
							Line Items Preview
						</CardTitle>
						{effectiveStart && effectiveEnd && (
							<CardDescription>
								{new Date(effectiveStart).toLocaleDateString()} -{" "}
								{new Date(effectiveEnd).toLocaleDateString()}
							</CardDescription>
						)}
					</CardHeader>
					<CardContent className="p-0">
						{!effectiveStart || !effectiveEnd ? (
							<div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
								Select a date range to preview line items.
							</div>
						) : (
							<LineItemsPreview
								key={`${mergeEntries}-${groupingRules.join(",")}`}
								data={preview ?? undefined}
							/>
						)}
					</CardContent>
				</Card>

				{/* Notes */}
				<Card className="mt-4">
					<CardHeader>
						<CardTitle className="text-base">Notes</CardTitle>
					</CardHeader>
					<CardContent>
						<Textarea
							placeholder="Optional notes for this invoice..."
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							rows={3}
						/>
					</CardContent>
				</Card>

				{/* Actions */}
				<div className="mt-4 flex items-center justify-end gap-2">
					<Button
						variant="outline"
						onClick={handleCopyToClipboard}
						disabled={!preview?.lineItems.length}
					>
						<ClipboardCopy className="size-4" />
						Copy for Stripe
					</Button>
					<Button
						variant="outline"
						onClick={() => handleSave("draft")}
						disabled={!preview?.lineItems.length}
					>
						<Save className="size-4" />
						Save Draft
					</Button>
					<Button
						onClick={() => handleSave("finalized")}
						disabled={!preview?.lineItems.length}
					>
						<Receipt className="size-4" />
						Finalize
					</Button>
				</div>
			</div>
		</div>
	);
}

// ─── Main Page ────────────────────────────────────────────────────

function InvoicesPage() {
	const [view, setView] = useState<"list" | "create">("list");

	if (view === "create") {
		return <InvoiceCreateView onBack={() => setView("list")} />;
	}

	return <InvoiceListView onCreateNew={() => setView("create")} />;
}
