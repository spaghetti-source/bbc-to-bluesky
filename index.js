const functions = require("@google-cloud/functions-framework");

const { BskyAgent, AppBskyFeedPost } = require("@atproto/api");
const cheerio = require("cheerio");
const sharp = require("sharp");
const Parser = require("rss-parser");
const parser = new Parser();


const settings = [
  {
    account: "bbcnews-uk-rss.bsky.social",
    password: "xxxx-xxxx-xxxx-xxxx",
    url: "https://feeds.bbci.co.uk/news/uk/rss.xml#",
  },
  {
    account: "bbcnews-world-rss.bsky.social",
    password: "xxxx-xxxx-xxxx-xxxx",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml#",
  },
  {
    account: "apnews-world-rss.bsky.social",
    password: "xxxx-xxxx-xxxx-xxxx",
    url: "https://rsshub.app/apnews/topics/world-news",
  },
];

async function get_feeds(url) {
  const feed = await parser.parseURL(url);
  let output = [];
  for (const item of feed.items) {
    output.push({
      title: item.title,
      link: item.link,
    });
  }
  return output;
}

async function post(agent, item) {
  let post = {
    $type: "app.bsky.feed.post",
    text: item.title,
    createdAt: new Date().toISOString(),
  };
  const dom = await fetch(item.link)
    .then((response) => response.text())
    .then((html) => cheerio.load(html));

  let description = null;
  const description_ = dom('head > meta[property="og:description"]');
  if (description_) {
    description = description_.attr("content");
  }

  let image_url = null;
  const image_url_ = dom('head > meta[property="og:image"]');
  if (image_url_) {
    image_url = image_url_.attr("content");
  }
  const buffer = await fetch(image_url)
    .then((response) => response.arrayBuffer())
    .then((buffer) => sharp(buffer))
    .then((s) =>
      s.resize(
        s
          .resize(800, null, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({
            quality: 80,
            progressive: true,
          })
          .toBuffer()
      )
    );
  const image = await agent.uploadBlob(buffer, { encoding: "image/jpeg" });
  post["embed"] = {
    external: {
      uri: item.link,
      title: item.title,
      description: description,
      thumb: image.data.blob,
    },
    $type: "app.bsky.embed.external",
  };
  const res = AppBskyFeedPost.validateRecord(post);
  if (res.success) {
    console.log(post);
    // await agent.post(post);
  } else {
    console.log(res.error);
  }
}

async function main(setting) {
  const agent = new BskyAgent({ service: "https://bsky.social" });
  await agent.login({
    identifier: setting.account,
    password: setting.password,
  });

  let processed = new Set();
  let cursor = "";
  for (let i = 0; i < 3; ++i) {
    const response = await agent.getAuthorFeed({
      actor: setting.account,
      limit: 100,
      cursor: cursor,
    });
    cursor = response.cursor;
    for (const feed of response.data.feed) {
      processed.add(feed.post.record.embed.external.uri);
      processed.add(feed.post.record.text);
    }
  }
  for (const feed of await get_feeds(setting.url)) {
    if (!processed.has(feed.title) && !processed.has(feed.link)) {
      await post(agent, feed);
    } else {
      console.log("skipped " + feed.title);
    }
  }
}
// async function entrypoint() {
//   for (const setting of settings) {
//     console.log("process " + setting.url);
//     await main(setting);
//   }
//   console.log("--- finish ---");
// }
// entrypoint();
functions.cloudEvent("entrypoint", async (_) => {
  for (const setting of settings) {
    console.log("process " + setting.url);
    await main(setting);
  }
  console.log("--- finish ---");
});
