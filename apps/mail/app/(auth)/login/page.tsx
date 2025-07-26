import { LoginClient } from './login-client';
import { useLoaderData } from 'react-router';

export async function clientLoader() {
  const isProd = !import.meta.env.DEV;

  // Simplified loader - just return basic info for Gmail auth
  return {
    allProviders: [{ id: 'google', name: 'Gmail', enabled: true }],
    isProd,
  };
}

export default function LoginPage() {
  const { allProviders, isProd } = useLoaderData<typeof clientLoader>();

  return (
    <div className="flex min-h-screen w-full flex-col bg-white dark:bg-black">
      <LoginClient providers={allProviders} isProd={isProd} />
    </div>
  );
}
