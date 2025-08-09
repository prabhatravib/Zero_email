import { redirect } from 'react-router';

export function clientLoader() {
  throw redirect('/mail/inbox');
}

export default function MailPage() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center">
      <h2 className="text-xl font-semibold">Redirecting to inbox...</h2>
    </div>
  );
}
