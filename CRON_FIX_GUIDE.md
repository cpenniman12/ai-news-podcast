# Cron Job Timeout Fix Guide

## Problem
The headline refresh cron job is timing out because:
1. **Process takes too long**: Multiple Brave API searches + Claude API calls in a loop can take 60-120 seconds
2. **Render's timeout is too short**: Free tier cron jobs timeout at 30 seconds, but the process needs 60-120 seconds
3. **The route maxDuration (60s) is exceeded**

## Immediate Solutions

### Option 1: Use Production URL with Longer Timeout (Recommended)

Call your production API endpoint directly with a longer timeout:

```bash
# Find your production URL (should be something like https://ai-daily-briefing.onrender.com)
# Then run:
node scripts/trigger-refresh.js https://your-app.onrender.com
```

This bypasses the 30-second cron job timeout since you're calling it directly.

### Option 2: Start Dev Server and Run Locally

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Trigger refresh
node scripts/trigger-refresh.js
```

This runs without ANY timeout limits.

### Option 3: Quick Manual Trigger via Browser/curl

If you know your production URL and CRON_SECRET:

```bash
curl "https://your-app.onrender.com/api/cron/refresh-headlines?secret=YOUR_SECRET"
```

Or open this URL in your browser (replace with your values):
```
https://your-app.onrender.com/api/cron/refresh-headlines?secret=YOUR_SECRET
```

## Long-term Fixes

### Fix 1: Increase Route maxDuration

Edit `src/app/api/cron/refresh-headlines/route.ts`:

```typescript
// Change from:
export const maxDuration = 60;

// To:
export const maxDuration = 120; // 120 seconds (2 minutes)
```

**Note**: This requires upgrading from Render's free tier to a paid plan that supports longer execution times.

### Fix 2: Optimize the Claude Agent (Recommended for Free Tier)

Reduce the number of search queries and API calls to stay under 30 seconds.

Edit `src/utils/claude-agent.ts`:

```typescript
// Around line 244, change:
const maxLoops = 10;

// To:
const maxLoops = 5; // Fewer loops = faster completion
```

And update the prompt to do fewer searches (around line 212):

```typescript
const userPrompt = `Today is ${dateStr}. Use the search_news tool to find the most important AI and technology news headlines from the past 7 days.

Do 3-4 focused searches to cover different topics:
1. Search for major AI announcements
2. Search for AI startup news and funding
3. Search for AI model releases

After collecting search results, curate exactly 20 of the BEST headlines that fit our criteria.
...`;
```

### Fix 3: Use Render Cron Jobs with Paid Plan

Upgrade your Render plan to get:
- Longer timeout limits (up to 15 minutes)
- Better performance
- No cold starts

In `render.yaml`, add a cron job:

```yaml
services:
  - type: web
    name: ai-daily-briefing
    # ... existing config ...

  - type: cron
    name: headline-refresh-cron
    plan: starter  # Paid plan required
    schedule: "0 10 * * *"  # 6am ET = 10am UTC
    command: curl -X GET "https://ai-daily-briefing.onrender.com/api/cron/refresh-headlines?secret=${CRON_SECRET}"
    env:
      - key: CRON_SECRET
        sync: false
```

## Scripts Available

1. **`scripts/trigger-refresh.js`** - Call the API endpoint to trigger refresh
   ```bash
   node scripts/trigger-refresh.js [URL]
   ```

2. **`scripts/refresh-headlines.sh`** - Simple bash wrapper
   ```bash
   ./scripts/refresh-headlines.sh
   ```

## Debugging

Check logs to see where it's timing out:

1. **Render Dashboard**: Services → Your Service → Logs
2. **Look for**:
   - `[Claude] Starting headline compilation...`
   - `[Claude] Loop X - stop_reason: ...`
   - `[CRON] Fetched X headlines in Ys`

If you see loops stopping around 30 seconds, that's the timeout.

## Recommended Action Plan

1. **Immediate**: Use Option 1 or 2 above to manually trigger refresh
2. **Short-term**: Implement Fix 2 to optimize for 30-second timeout
3. **Long-term**: Consider Fix 3 when ready to upgrade to paid plan

## Need Help?

The headline refresh should complete successfully with any of these solutions. The optimization in Fix 2 will make it work reliably on the free tier.
