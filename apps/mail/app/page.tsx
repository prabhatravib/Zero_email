import HomeContent from '@/components/home/HomeContent';
import type { Route } from './+types/page';

export async function clientLoader({ }: Route.ClientLoaderArgs) {
  return null;
}

export default function Home() {
  return <HomeContent />;
}
