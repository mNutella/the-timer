import { Link } from "@tanstack/react-router";
import { LogOut, Settings, UserCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function DockNavItem({
	icon: Icon,
	label,
	href,
	ref,
}: { icon: LucideIcon; label: string; href: string } & Pick<ComponentProps<"div">, "ref">) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<div ref={ref} className="origin-bottom will-change-transform">
					<Link
						to={href}
						activeOptions={{ exact: href === "/" }}
						className="group relative flex size-10 items-center justify-center rounded-xl transition-colors hover:bg-foreground/10"
					>
						<Icon className="size-4" />
						<span className="absolute -bottom-1.5 left-1/2 size-1 -translate-x-1/2 scale-0 rounded-full bg-primary transition-transform group-[.active]:scale-100" />
					</Link>
				</div>
			</TooltipTrigger>
			<TooltipContent side="top" sideOffset={10}>
				{label}
			</TooltipContent>
		</Tooltip>
	);
}

export function DockActionItem({
	icon: Icon,
	label,
	onClick,
	className,
	ref,
}: {
	icon: LucideIcon;
	label: string;
	onClick: () => void;
	className?: string;
} & Pick<ComponentProps<"div">, "ref">) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<div ref={ref} className="origin-bottom will-change-transform">
					<button
						type="button"
						onClick={onClick}
						className={cn(
							"relative flex items-center justify-center size-10 rounded-xl transition-colors hover:bg-foreground/10",
							className,
						)}
					>
						<Icon className="size-4" />
					</button>
				</div>
			</TooltipTrigger>
			<TooltipContent side="top" sideOffset={10}>
				{label}
			</TooltipContent>
		</Tooltip>
	);
}

export function DockUserItem({ ref }: Pick<ComponentProps<"div">, "ref">) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<div
					ref={ref}
					className="relative flex size-10 origin-bottom cursor-pointer items-center justify-center rounded-xl transition-colors will-change-transform hover:bg-foreground/10"
				>
					<Avatar className="size-7">
						<AvatarFallback className="rounded-lg text-xs">CN</AvatarFallback>
					</Avatar>
				</div>
			</DropdownMenuTrigger>
			<DropdownMenuContent side="top" align="end" sideOffset={10}>
				<DropdownMenuGroup>
					<DropdownMenuItem>
						<UserCircle />
						Account
					</DropdownMenuItem>
					<DropdownMenuItem>
						<Settings />
						Settings
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<LogOut />
					Log out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
