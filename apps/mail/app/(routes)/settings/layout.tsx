import { SettingsLayoutContent } from '@/components/ui/settings-content';
import { Outlet } from 'react-router';
import { authProxy } from '@/lib/auth-proxy';
import type { Route } from './+types/layout';

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  try {
    const session = await authProxy.api.getSession({ headers: request.headers });

    if (!session) {
      return Response.redirect(`${import.meta.env.VITE_PUBLIC_APP_URL}/login`);
    }

    return null;
  } catch (error) {
    console.error('Error in settings clientLoader:', error);
    // Redirect to login on error
    return Response.redirect(`${import.meta.env.VITE_PUBLIC_APP_URL}/login`);
  }
}

export default function SettingsLayout() {
  return (
    <SettingsLayoutContent>
      <Outlet />
    </SettingsLayoutContent>
  );
}