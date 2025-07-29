import HomeContent from '@/components/home/HomeContent';
import { authProxy } from '@/lib/auth-proxy';
import type { Route } from './+types/page';
import { redirect } from 'react-router';

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  try {
    const session = await authProxy.api.getSession({ headers: request.headers });
    if (session?.user.id) throw redirect('/mail/inbox');
    return null;
  } catch (error) {
    console.error('Error in clientLoader:', error);
    // Don't throw the error, just return null to allow the app to continue
    return null;
  }
}

export default function Home() {
  return <HomeContent />;
}
