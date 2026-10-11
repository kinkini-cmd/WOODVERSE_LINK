import { navigate } from '../utils';

export function NotFoundPage() {
  return (
    <div className='grid min-h-screen place-items-center bg-[#f5f1e8] text-[#151d28]'>
      <div className='text-center max-w-sm px-6'>
        <h1 className='text-5xl font-extrabold text-[#164f40] mb-4'>404</h1>
        <h2 className='text-2xl font-bold mb-4'>Page Not Found</h2>
        <p className='text-[#4b514f] mb-6'>The page you are looking for does not exist or has been moved.</p>
        <button
          onClick={() => navigate('/')}
          className='rounded-md bg-[#164f40] px-6 py-3 font-bold text-white'
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
