import { Link } from "@tanstack/react-router";
import {
	BarChart3,
	Briefcase,
	CirclePlus,
	Folder,
	LayoutDashboard,
	Settings,
	Tag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";

import { DockActionItem, DockNavItem, DockUserItem } from "@/components/dock-item";
import { StartTimerDialog } from "@/components/start-timer-dialog";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

function useDockMagnification() {
	const containerRef = useRef<HTMLDivElement>(null);
	const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
	const mouseXRef = useRef<number | null>(null);
	const rafRef = useRef<number>(0);
	const isHoveringRef = useRef(false);
	const prefersReducedMotion = useRef(
		typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
	);

	const updateScales = useCallback(() => {
		if (!isHoveringRef.current || mouseXRef.current === null) return;

		const mx = mouseXRef.current;
		for (const el of itemRefs.current) {
			if (!el) continue;
			const rect = el.getBoundingClientRect();
			const center = rect.left + rect.width / 2;
			const dist = Math.abs(mx - center);
			const scale = 1 + 0.4 * Math.max(0, 1 - dist / 150);
			el.style.transform = `scale(${scale})`;
		}

		rafRef.current = requestAnimationFrame(updateScales);
	}, []);

	const onMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
		mouseXRef.current = e.clientX;
	}, []);

	const onMouseEnter = useCallback(() => {
		if (prefersReducedMotion.current) return;
		isHoveringRef.current = true;
		for (const el of itemRefs.current) {
			if (el) el.style.transition = "none";
		}
		rafRef.current = requestAnimationFrame(updateScales);
	}, [updateScales]);

	const onMouseLeave = useCallback(() => {
		if (prefersReducedMotion.current) return;
		isHoveringRef.current = false;
		cancelAnimationFrame(rafRef.current);
		for (const el of itemRefs.current) {
			if (!el) continue;
			el.style.transition = "transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)";
			el.style.transform = "scale(1)";
		}
	}, []);

	useEffect(() => {
		return () => cancelAnimationFrame(rafRef.current);
	}, []);

	return { containerRef, itemRefs, onMouseMove, onMouseEnter, onMouseLeave };
}

function DesktopDock({ onStartTimer }: { onStartTimer: () => void }) {
	const { containerRef, itemRefs, onMouseMove, onMouseEnter, onMouseLeave } =
		useDockMagnification();

	return (
		<nav aria-label="Main navigation" className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
			<div
				ref={containerRef}
				onMouseMove={onMouseMove}
				onMouseEnter={onMouseEnter}
				onMouseLeave={onMouseLeave}
				className="flex items-end gap-1 rounded-2xl border border-border/50 bg-background/70 px-3 py-2 shadow-lg backdrop-blur-xl"
			>
				<DockActionItem
					ref={(el) => {
						itemRefs.current[0] = el;
					}}
					icon={CirclePlus}
					label="Start Timer"
					onClick={onStartTimer}
					className="text-success hover:bg-success/20"
				/>

				<Separator orientation="vertical" className="mx-1 h-6" />

				<DockNavItem
					ref={(el) => {
						itemRefs.current[1] = el;
					}}
					icon={LayoutDashboard}
					label="Dashboard"
					href="/"
				/>
				<DockNavItem
					ref={(el) => {
						itemRefs.current[2] = el;
					}}
					icon={BarChart3}
					label="Analytics"
					href="/analytics"
				/>

				<Separator orientation="vertical" className="mx-1 h-6" />

				<DockNavItem
					ref={(el) => {
						itemRefs.current[3] = el;
					}}
					icon={Briefcase}
					label="Clients"
					href="/clients"
				/>
				<DockNavItem
					ref={(el) => {
						itemRefs.current[4] = el;
					}}
					icon={Folder}
					label="Projects"
					href="/projects"
				/>
				<DockNavItem
					ref={(el) => {
						itemRefs.current[5] = el;
					}}
					icon={Tag}
					label="Categories"
					href="/categories"
				/>

				<Separator orientation="vertical" className="mx-1 h-6" />

				<DockNavItem
					ref={(el) => {
						itemRefs.current[6] = el;
					}}
					icon={Settings}
					label="Settings"
					href="/settings"
				/>
				<DockUserItem
					ref={(el) => {
						itemRefs.current[7] = el;
					}}
				/>
			</div>
		</nav>
	);
}

function MobileNavLink({
	icon: Icon,
	label,
	href,
}: {
	icon: LucideIcon;
	label: string;
	href: string;
}) {
	return (
		<Link
			to={href}
			activeOptions={{ exact: href === "/" }}
			className="group flex flex-col items-center gap-0.5 text-muted-foreground [&.active]:text-foreground"
		>
			<Icon className="size-5" />
			<span className="text-[10px]">{label}</span>
		</Link>
	);
}

function MobileNavButton({
	icon: Icon,
	label,
	onClick,
	className,
}: {
	icon: LucideIcon;
	label: string;
	onClick: () => void;
	className?: string;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn("flex flex-col items-center gap-0.5 text-muted-foreground", className)}
		>
			<Icon className="size-5" />
			<span className="text-[10px]">{label}</span>
		</button>
	);
}

function MobileDock({ onStartTimer }: { onStartTimer: () => void }) {
	return (
		<nav
			aria-label="Main navigation"
			className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg"
		>
			<div className="flex items-center justify-around py-2">
				<MobileNavButton
					icon={CirclePlus}
					label="Timer"
					onClick={onStartTimer}
					className="text-success"
				/>
				<MobileNavLink icon={LayoutDashboard} label="Dashboard" href="/" />
				<MobileNavLink icon={BarChart3} label="Analytics" href="/analytics" />
				<MobileNavLink icon={Briefcase} label="Clients" href="/clients" />
				<MobileNavLink icon={Folder} label="Projects" href="/projects" />
				<MobileNavLink icon={Settings} label="Settings" href="/settings" />
			</div>
		</nav>
	);
}

export function Dock() {
	const isMobile = useIsMobile();
	const [dialogOpen, setDialogOpen] = useState(false);
	const openDialog = useCallback(() => setDialogOpen(true), []);

	return (
		<>
			{isMobile ? (
				<MobileDock onStartTimer={openDialog} />
			) : (
				<DesktopDock onStartTimer={openDialog} />
			)}
			<StartTimerDialog open={dialogOpen} onOpenChange={setDialogOpen} />
		</>
	);
}
