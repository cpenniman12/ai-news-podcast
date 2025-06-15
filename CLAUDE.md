Here's a detailed technical description of the issue for you to assess and help debug:

**Issue:** Podcast Audio Output Still Capped at ~4 Minutes Despite Per-Story TTS Concatenation

- The backend `/api/generate-audio` should accept an array of scripts, generate TTS for each, and concatenate the MP3s.
- The frontend and backend both appear to be sending/receiving the correct data (array of scripts).
- The final podcast audio file is still only about 4 minutes long, even when 3 stories are selected.
- Logs for `/api/generate-detailed-script` confirm 3 scripts are generated, each with 2,400–2,600 characters.
- No `[TTS DEBUG]` logs from `/api/generate-audio` are visible in the dev server terminal.
- The audio file is always ~4 minutes, regardless of the number of stories.

**Please:**
1. Analyze why `/api/generate-audio` is not producing the expected multi-segment audio output.
2. Confirm the endpoint is being called and is processing all scripts.
3. Check for silent errors in the TTS or ffmpeg steps.
4. Ensure the frontend is sending the correct payload.
5. Suggest or implement fixes so the final audio file is the correct length and includes all stories.
6. Push your changes directly to the GitHub repo. 