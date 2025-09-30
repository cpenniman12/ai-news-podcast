# Email Verification & Rate Limiting System

## Overview

The AI News Podcast Generator now includes a robust email verification and rate limiting system that ensures fair usage while maintaining security.

## Features

### 🔐 Email Verification
- **Required for Generation**: Users must verify their email before generating podcasts
- **Magic Link Authentication**: Uses Supabase's secure magic link system
- **One-Time Verification**: Once verified, users stay verified for future generations

### ⏱️ Rate Limiting
- **Daily Limit**: Regular users can generate 1 podcast per day
- **Admin Bypass**: `cooperpenniman@gmail.com` has unlimited access
- **Automatic Reset**: Limits reset daily at midnight

### 🎯 User Experience
- **Minimal Friction**: Verification only required when generating podcasts
- **Clear Messaging**: Users receive clear feedback about verification status
- **Retry System**: Easy retry flow after email verification

## How It Works

### For New Users

1. **Select Headlines**: Choose 1-6 news stories as usual
2. **Enter Email**: Click "Generate Podcast" and enter email address
3. **Verify Email**: Receive magic link via email and click to verify
4. **Generate**: Return to app and click "I've verified my email"
5. **Enjoy**: Podcast generates normally

### For Returning Users

1. **Select Headlines**: Choose stories as usual
2. **Enter Email**: Enter previously verified email
3. **Rate Check**: System checks if you've already generated today
4. **Generate**: If within limits, podcast generates immediately

### For Admin User

1. **Enter Admin Email**: Use `cooperpenniman@gmail.com`
2. **Instant Access**: Bypasses all verification and rate limits
3. **Unlimited**: No daily generation limits

## Technical Implementation

### API Endpoints

- **`/api/verify-and-generate`**: Checks verification status and rate limits
- **`/api/send-verification`**: Sends magic link emails via Supabase
- **`/api/record-generation`**: Records successful generations for rate limiting

### Database Tables

- **`user_generations`**: Tracks daily podcast generations per email
- **`podcast_episodes`**: Existing table for storing generated episodes

### Security Features

- ✅ Email format validation
- ✅ Rate limiting per email address
- ✅ Admin email bypass
- ✅ Secure magic link verification
- ✅ Daily generation tracking

## Configuration

### Required Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key (for admin operations)
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # or your production URL
```

### Database Setup

See `SUPABASE_SETUP.md` for detailed database setup instructions including:
- Creating the `user_generations` table
- Setting up Row Level Security policies
- Configuring email authentication

## User Flow Examples

### First-Time User
```
1. Select 3 headlines
2. Click "Generate Podcast"
3. Enter: john@example.com
4. See: "Check Your Email!"
5. Click magic link in email
6. Return to app, click "I've verified my email"
7. Podcast generates successfully
```

### Returning User (Within Limits)
```
1. Select 2 headlines  
2. Click "Generate Podcast"
3. Enter: john@example.com (already verified)
4. Podcast generates immediately
```

### User Hitting Rate Limit
```
1. Select 4 headlines
2. Click "Generate Podcast"  
3. Enter: john@example.com
4. See: "You can only generate one podcast per day"
5. Must wait until next day
```

### Admin User
```
1. Select any number of headlines
2. Click "Generate Podcast"
3. Enter: cooperpenniman@gmail.com
4. Podcast generates immediately (no limits)
```

## Error Handling

The system gracefully handles various error scenarios:

- **Invalid email format**: Clear validation message
- **Rate limit exceeded**: Friendly message with next available time
- **Verification pending**: Clear instructions with retry option
- **Network errors**: Graceful fallback messages
- **Database errors**: Logged for debugging with user-friendly messages

## Benefits

### For Users
- **Fair Access**: Everyone gets equal daily access
- **Security**: Email verification prevents abuse
- **Simplicity**: Minimal friction for legitimate users

### For Administrators
- **Abuse Prevention**: Rate limiting prevents system overload
- **Admin Access**: Unlimited access for testing and demos
- **Monitoring**: Database tracking of all generations

### For Developers
- **Scalable**: Efficient database queries with proper indexing
- **Maintainable**: Clean API structure with error handling
- **Extensible**: Easy to adjust rate limits or add features

## Future Enhancements

Potential improvements for the system:

- **Premium Tiers**: Different rate limits for paid users
- **Weekly/Monthly Limits**: More flexible limit periods
- **Usage Analytics**: Dashboard for generation statistics
- **Email Preferences**: Customizable notification settings
- **Social Login**: OAuth integration for easier verification

## Support

For issues with the email verification system:

1. Check `SUPABASE_SETUP.md` for database configuration
2. Verify environment variables are set correctly
3. Test with admin email for immediate troubleshooting
4. Check browser console for detailed error messages
5. Review Supabase dashboard for authentication logs 