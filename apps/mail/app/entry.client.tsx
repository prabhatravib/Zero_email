import { startTransition, StrictMode } from 'react';
import { HydratedRouter } from 'react-router/dom';
import { hydrateRoot } from 'react-dom/client';
import './instrument';

console.log('🚀 Starting React app initialization...');

startTransition(() => {
  console.log('🔄 Starting React hydration...');
  
  try {
    hydrateRoot(
      document,
      <StrictMode>
        <HydratedRouter />
      </StrictMode>,
    );
    console.log('✅ React app initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize React app:', error);
  }
});
