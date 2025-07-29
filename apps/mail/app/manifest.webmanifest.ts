import manifest from '../public/manifest.json';

export async function loader() {
  return new Response(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json',
    },
  });
}