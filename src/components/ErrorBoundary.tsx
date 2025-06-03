import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component to catch JavaScript errors anywhere in child component tree
 * and display a fallback UI instead of crashing the whole app
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to an error reporting service
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return this.props.fallback || (
        <div className="rounded-lg bg-red-500/10 p-6 m-4 text-center">
          <div className="flex flex-col items-center justify-center space-y-4">
            <AlertTriangle size={40} className="text-secondary" />
            <h2 className="text-xl font-bold text-text-dark dark:text-text-light">
              Something went wrong
            </h2>
            <p className="text-text-dark/70 dark:text-text-light/70 max-w-md mx-auto">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={this.handleReset}
              className="mt-4 inline-flex items-center rounded-full bg-secondary px-6 py-3 text-sm font-medium text-white transition-all hover:bg-secondary-light"
            >
              <RefreshCw size={16} className="mr-2" />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
