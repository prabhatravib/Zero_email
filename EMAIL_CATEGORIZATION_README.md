# Email Categorization System

This system implements automatic email categorization using Google's Vertex AI with Gemini 1.5 Flash model. Every email is automatically categorized and stored in the "Others" category plus any specific categories detected by the LLM.

## Key Features

- **Integration with Email Groups**: Works with existing "FUBO Related" and "Others" email groups
- **AI-Powered Categorization**: Uses Google Vertex AI Gemini 1.5 Flash for intelligent categorization
- **Three Category System**: FUBO Related, Jobs and Employment, and Others
- **Mandatory "Others" Category**: Every email is automatically included in "Others" plus any specific categories
- **Error Resilience**: Falls back to "Others" category on any error
- **Real-time Updates**: Email groups update automatically as emails are categorized

## Architecture

### Files Created/Modified

1. **`apps/server/src/lib/vertex-ai.ts`** - Core categorization logic
2. **`apps/server/src/routes/email-handler.ts`** - Email processing endpoint
3. **`apps/server/src/main.ts`** - Route integration
4. **`apps/mail/hooks/use-ai-categorization.ts`** - AI categorization hook
5. **`apps/mail/hooks/use-email-groups.ts`** - Updated to integrate with AI categorization
6. **`apps/mail/components/email-categorization-test.tsx`** - Test component
7. **`apps/mail/app/(routes)/settings/email-categorization/page.tsx`** - Test page

### API Endpoints

- `POST /api/email-handler/process` - Process and categorize an email
- `GET /api/email-handler/health` - Health check endpoint

## Implementation Details

### Categorization Logic

The system uses a carefully crafted prompt to ensure consistent categorization:

```typescript
const prompt = `Analyze this email and assign it to ALL applicable categories from the list below. An email can belong to multiple categories.

Categories:
1. Fubo - Emails from Fubo TV streaming service (subscriptions, content updates, billing, promotions)
2. Jobs and Employment - Job postings, recruitment emails, employment opportunities, career-related content

Email content:
${emailContent}

Return a JSON array of category names that apply. Only include "Fubo" and/or "Jobs and Employment" if they specifically apply. Return an empty array [] if neither category applies.
Examples: ["Fubo"], ["Jobs and Employment"], ["Fubo", "Jobs and Employment"], or []`;
```

### Category Processing

1. **LLM Analysis**: Email content is sent to Vertex AI for categorization
2. **Response Parsing**: LLM response is parsed as JSON array
3. **Validation**: Ensures response is a valid array
4. **Filtering**: Removes "Others" if LLM mistakenly includes it
5. **Prepending**: Always adds "Others" as the first category
6. **Deduplication**: Removes any duplicate categories

### Error Handling

- **LLM Failures**: Returns `["Others"]` on any LLM error
- **Invalid Responses**: Handles malformed JSON responses
- **Network Issues**: Graceful fallback to "Others" category
- **Authentication Errors**: Falls back to "Others" if JWT generation fails

## Environment Variables

Required environment variable:

```bash
GOOGLE_SERVICE_ACCOUNT=your_service_account_json_string
```

The service account JSON should include:
- `project_id`
- `client_email` 
- `private_key`

## Usage Examples

### Processing an Email

```bash
curl -X POST https://your-domain.com/api/email-handler/process \
  -H "Content-Type: application/json" \
  -d '{
    "email": {
      "from": "sender@example.com",
      "subject": "Test Email",
      "body": "This is a test email content for categorization."
    }
  }'
```

### Expected Response

```json
{
  "success": true,
  "categories": ["Others", "Fubo"],
  "note": "All emails are stored in Others plus any specific categories"
}
```

### Error Response

```json
{
  "success": false,
  "categories": ["Others"],
  "error": "LLM categorization failed: Network error"
}
```

## Integration Points

### Email Storage Integration

The system integrates with the existing ZeroDB storage system:

```typescript
// Store email with categories
const threadData = {
  from: email.from,
  subject: email.subject,
  body: email.body,
  threadId: email.threadId || email.id,
  categories, // Array of categories from AI
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

await db.storeThread(connectionId, threadId, threadData);
```

### Database Schema

The system uses the existing threads table with categories support:

```sql
CREATE TABLE threads (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  data TEXT NOT NULL, -- JSON containing email data and categories
  categories TEXT[], -- Array of categories
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Security Considerations

1. **Service Account**: Store the Google service account JSON securely
2. **JWT Expiration**: JWT tokens expire after 1 hour for security
3. **Input Validation**: Validate email content before processing
4. **Rate Limiting**: Consider implementing rate limiting for the API endpoints

## Monitoring and Logging

The system includes comprehensive logging:

```typescript
console.log(`Email from: ${email.from}`);
console.log(`Categories: ${categories.join(', ')}`);
console.error('LLM categorization failed:', error);
```

## Testing

### Health Check

```bash
curl https://your-domain.com/api/email-handler/health
```

Expected response:
```json
{
  "status": "Email handler is running"
}
```

### Web Interface

Access the test interface at: `/settings/email-categorization`

This provides a user-friendly way to:
- Test email categorization with sample content
- See real-time categorization results
- Understand how different email types are categorized

### Test Categories

Test with various email types:

1. **Fubo Email**: Content mentioning Fubo TV, subscriptions, streaming
2. **Job Email**: Content mentioning job postings, recruitment, careers  
3. **Generic Email**: Any other content should return `["Others"]`

## Troubleshooting

### Common Issues

1. **"LLM categorization failed"**: Check Google service account configuration
2. **"Unauthorized"**: Verify JWT generation and API permissions
3. **"Invalid JSON response"**: LLM returned malformed response, check prompt

### Debug Steps

1. Check environment variables are set correctly
2. Verify Google service account has Vertex AI permissions
3. Test JWT generation independently
4. Monitor API response logs

## Future Enhancements

1. **Dynamic Categories**: Allow user-defined categories
2. **Category Training**: Learn from user corrections
3. **Batch Processing**: Process multiple emails simultaneously
4. **Category Confidence**: Include confidence scores in responses
5. **Custom Prompts**: Allow customization of categorization prompts

## Dependencies

- Google Cloud Vertex AI
- Hono (web framework)
- TypeScript
- Cloudflare Workers (runtime)

---

**AI Model in use**: Claude Sonnet 4 