import { Component } from 'react';
import { reportClientError } from '@/lib/clientErrorMonitoring';
import ChurchLogoImage from '@/components/ChurchLogoImage';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    reportClientError(error, {
      type: 'react-render-error',
      source: 'react-error-boundary',
      componentStack: errorInfo?.componentStack || '',
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f1e5] px-6 py-16">
        <div className="max-w-lg rounded-lg border border-amber-200 bg-white p-8 text-center shadow-xl">
          <ChurchLogoImage
            alt="Goodwill Presbyterian Church Logo"
            className="mx-auto h-16 w-16 rounded-full object-contain"
            sizes="64px"
            width={64}
            height={64}
          />
          <h1 className="mt-6 text-2xl font-bold text-[#3D2519]">Something went wrong</h1>
          <p className="mt-3 text-sm leading-6 text-gray-700">
            The site team has been notified. Please refresh the page, or use the contact information in the footer if this continues.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex items-center rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-800"
          >
            Refresh page
          </button>
        </div>
      </main>
    );
  }
}
