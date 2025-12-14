# Admin Get Applications Function

This Supabase Edge Function allows administrators to fetch all seller applications for review.

## Authentication

Only users with email `admin@vendra.com` can access this function. The function verifies the JWT token passed in the Authorization header.

## Usage

```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-get-applications`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
// data.applications contains the array of seller applications
```

## Response Format

```json
{
  "applications": [
    {
      "id": "string",
      "user_id": "string",
      "status": "string",
      "role_choice": "string",
      "full_name": "string | null",
      "email": "string | null",
      "created_at": "string",
      "submitted_at": "string | null",
      "review_notes": "string | null",
      "reviewer_id": "string | null",
      "user_name": "string",
      "user_email": "string"
    }
  ]
}
```

## Status Values

- `draft` - Application is in draft state
- `submitted` - Application has been submitted for review
- `approved` - Application has been approved
- `rejected` - Application has been rejected
- `needs_more_info` - More information is required

## Error Handling

Returns appropriate HTTP status codes:
- `401` - No authorization header or invalid token
- `403` - User is not an admin
- `500` - Internal server error
