import { createFileRoute } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/(app)/analytics")({
	component: Analytics,
});

function Analytics() {
	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div>
				<h1 className="text-3xl font-bold underline">Hello world!</h1>
				<Button>Click me</Button>
			</div>
		</div>
	);
}
