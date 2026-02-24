import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
	children: ReactNode;
	fallbackLabel?: string;
}

interface State {
	hasError: boolean;
}

export class WidgetErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false };

	static getDerivedStateFromError(): State {
		return { hasError: true };
	}

	handleRetry = () => {
		this.setState({ hasError: false });
	};

	render() {
		if (this.state.hasError) {
			return (
				<div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-card p-5">
					<div className="flex items-center gap-3">
						<div className="flex size-8 items-center justify-center rounded-lg bg-destructive/10">
							<AlertTriangle className="size-4 text-destructive" />
						</div>
						<div>
							<p className="text-sm font-medium">
								{this.props.fallbackLabel ?? "Failed to load"}
							</p>
							<p className="text-xs text-muted-foreground">
								Something went wrong. Try refreshing.
							</p>
						</div>
					</div>
					<Button
						onClick={this.handleRetry}
						variant="ghost"
						size="sm"
						className="gap-1.5"
					>
						<RefreshCw className="size-3.5" />
						Retry
					</Button>
				</div>
			);
		}

		return this.props.children;
	}
}
