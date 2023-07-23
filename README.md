# Introduction

I used to use Twitter as a news reader. It offered a great user experience as it made it easy to discuss news with friends. Now, I want to introduce this user experience in Bluesky.

This repository provides the implementation of Bluesky bots (@bbcnews-uk-rss.bsky.social and @bbcnews-world-rss.bsky.social) designed to repost RSS feeds of BBC News. I wish you readers implement bots with your favourite news sources.

# Implementation

The following function is implemented and deployed using Google Cloud Functions with Pub/Sub trigger.	

1. Fetch the latest RSS feeds from BBC RSS using the `rss-parser` package.
2. Fetch the latest posts from the bot account using the `@atproto/api` package. 
3. For each RSS feed (fetched in Step 1) that was not posted to bluesky (fetched in Step 2),
    1. Fetch the HTML of the news.
    2. Extract description and image using the `cheerio` package.
    3. Reduce the size of image using the `sharp` package.
    4. Upload the image as a blob, and create a post with the image and link by `@atproto/api` package.

See `index.js` for the detailed implementation.

Then, the function is periodically (say, every 15 minutes) triggered using Google Cloud Scheduler, i.e., it has the following cron setting.

```
*/15 * * * * *
```

# References

- https://zenn.dev/ryo_kawamata/articles/8d1966f6bb0a82 for reducing image sizes.

