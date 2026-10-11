import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className='grid min-h-screen place-items-center bg-[#f5f1e8] text-[#151d28]'>
          <div className='text-center max-w-sm px-6'>
            <h1 className='text-2xl font-extrabold mb-4'>Something went wrong</h1>
            <p className='text-[#4b514f] mb-6'>An unexpected error occurred. Please refresh the page and try again.</p>
            <button
              onClick={() => window.location.reload()}
              className='rounded-md bg-[#164f40] px-6 py-3 font-bold text-white'
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
