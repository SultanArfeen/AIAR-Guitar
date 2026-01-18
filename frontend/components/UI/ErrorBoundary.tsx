/**
 * ErrorBoundary Component
 * 
 * Catches JavaScript errors in child components and displays
 * a fallback UI.
 * 
 * @module components/UI/ErrorBoundary
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-surface-dark p-8">
                    <div className="max-w-lg text-center">
                        {/* Error Icon */}
                        <div className="text-6xl mb-6">⚠️</div>

                        {/* Title */}
                        <h1 className="text-2xl font-bold text-white mb-2">
                            Something went wrong
                        </h1>

                        {/* Description */}
                        <p className="text-white/60 mb-6">
                            An unexpected error occurred. This might be due to a browser
                            compatibility issue or a temporary glitch.
                        </p>

                        {/* Error Details (collapsible) */}
                        <details className="mb-6 text-left">
                            <summary className="text-sm text-white/40 cursor-pointer hover:text-white/60">
                                Technical details
                            </summary>
                            <div className="mt-4 p-4 bg-black/30 rounded-lg overflow-auto max-h-48">
                                <pre className="text-xs text-red-400 whitespace-pre-wrap">
                                    {this.state.error?.toString()}
                                </pre>
                                {this.state.errorInfo && (
                                    <pre className="text-xs text-white/40 mt-2 whitespace-pre-wrap">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                )}
                            </div>
                        </details>

                        {/* Action Buttons */}
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="btn-secondary"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="btn-primary"
                            >
                                Reload Page
                            </button>
                        </div>

                        {/* Help Text */}
                        <p className="mt-8 text-xs text-white/30">
                            If this keeps happening, try using Chrome or Firefox with
                            WebGL enabled.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
