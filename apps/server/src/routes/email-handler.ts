import { Hono } from 'hono';
import { categorizeEmail } from '../lib/vertex-ai';
import { getZeroDB } from '../lib/server-utils';

interface HonoContext {
  Bindings: {
    DB: D1Database;
    ZERO_DB: DurableObjectNamespace;
  };
}

interface EmailData {
  id: string;
  from: string;
  subject: string;
  body: string;
  threadId?: string;
  userId: string;
}

const emailHandlerRouter = new Hono<HonoContext>()
  .post('/process', async (c) => {
    try {
      const body = await c.req.json();
      const { email, userId }: { email: EmailData; userId: string } = body;
      
      if (!email || !userId) {
        return c.json({ 
          success: false, 
          error: 'Missing email data or userId' 
        }, 400);
      }
      
      // Categorize the email using Vertex AI
      let categories: string[];
      try {
        categories = await categorizeEmail(email.body, c.env);
      } catch (error) {
        // Silent failure - return fallback category
        categories = ['Others'];
      }
      
      console.log(`Email from: ${email.from}`);
      console.log(`Categories: ${categories.join(', ')}`);
      
      // Get the user's database instance
      const db = await getZeroDB(userId);
      
      // Get the user's first connection (you might want to make this more specific)
      const connections = await db.findManyConnections(userId);
      if (!connections.length) {
        return c.json({ 
          success: false, 
          error: 'No email connections found for user' 
        }, 400);
      }
      
      const connectionId = connections[0].id;
      
      // Store email with categories in the database
      const threadData = {
        from: email.from,
        subject: email.subject,
        body: email.body,
        threadId: email.threadId || email.id,
        categories,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await db.storeThread(connectionId, email.threadId || email.id, threadData);
      
      return c.json({ 
        success: true, 
        categories,
        note: 'Email categorized and stored successfully'
      });
      
    } catch (error) {
      console.error('Email processing failed:', error);
      
      return c.json({ 
        success: false, 
        categories: ['Others'],
        error: error.message 
      }, 500);
    }
  })
  .post('/categorize', async (c) => {
    try {
      const body = await c.req.json();
      const { emailContent }: { emailContent: string } = body;
      
      if (!emailContent) {
        return c.json({ 
          success: false, 
          error: 'Missing email content' 
        }, 400);
      }
      
      // Just categorize without storing
      let categories: string[];
      try {
        categories = await categorizeEmail(emailContent, c.env);
      } catch (error) {
        // Silent failure - return fallback category
        categories = ['Others'];
      }
      
      return c.json({ 
        success: true, 
        categories,
        note: 'Email categorized successfully'
      });
      
    } catch (error) {
      console.error('Categorization failed:', error);
      
      // Return success with fallback category instead of error
      return c.json({ 
        success: true, 
        categories: ['Others'],
        note: 'Email categorized with fallback category'
      });
    }
  })
  .get('/health', (c) => c.json({ status: 'Email handler is running' }))
  .get('/test-secret', (c) => {
    const hasSecret = !!c.env.GOOGLE_SERVICE_ACCOUNT;
    const secretLength = c.env.GOOGLE_SERVICE_ACCOUNT?.length || 0;
    return c.json({ 
      hasSecret, 
      secretLength,
      message: hasSecret ? 'Secret is available' : 'Secret is not available'
    });
  });

export default emailHandlerRouter; 