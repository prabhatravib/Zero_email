import { useLoaderData, useNavigate } from 'react-router';

import { MailLayout } from '@/components/mail/mail';
import { authProxy } from '@/lib/auth-proxy';
import { useEffect } from 'react';
import type { Route } from './+types/page';

const ALLOWED_FOLDERS = new Set(['inbox', 'draft', 'sent', 'spam', 'bin', 'archive']);

export async function clientLoader({ params, request }: Route.ClientLoaderArgs) {
  if (!params.folder) return Response.redirect(`${import.meta.env.VITE_PUBLIC_APP_URL}/mail/inbox`);

  const session = await authProxy.api.getSession({ headers: request.headers });
  if (!session) return Response.redirect(`${import.meta.env.VITE_PUBLIC_APP_URL}/login`);

  return {
    folder: params.folder,
  };
}

export default function MailPage() {
  const { folder } = useLoaderData<typeof clientLoader>();
  const navigate = useNavigate();

  const isStandardFolder = ALLOWED_FOLDERS.has(folder);

  useEffect(() => {
    if (!isStandardFolder) {
      navigate('/mail/inbox');
    }
  }, [folder, isStandardFolder, navigate]);

  if (!isStandardFolder) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center">
        <h2 className="text-xl font-semibold">Folder not found</h2>
        <p className="text-muted-foreground mt-2">
          The folder you're looking for doesn't exist. Redirecting to inbox...
        </p>
      </div>
    );
  }

  return <MailLayout />;
}
