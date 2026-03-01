import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

interface Props {
	children: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false, error: null };

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	handleReload = () => {
		window.location.reload();
	};

	render() {
		if (this.state.hasError) {
			return (
				<div className="flex h-[100dvh] items-center justify-center bg-background p-8">
					<div className="flex max-w-md flex-col items-center gap-6 text-center">
						<div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
							<AlertTriangle className="size-7 text-destructive" />
						</div>
						<div className="flex flex-col gap-2">
							<h1 className="text-lg font-semibold text-foreground">Something went wrong</h1>
							<p className="text-sm text-muted-foreground">
								The app encountered an unexpected error. Reloading usually fixes this.
							</p>
							{import.meta.env.DEV && this.state.error && (
								<pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-muted p-3 text-left text-xs text-muted-foreground">
									{this.state.error.message}
								</pre>
							)}
						</div>
						<Button onClick={this.handleReload} className="gap-2">
							<RefreshCw className="size-4" />
							Reload App
						</Button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
