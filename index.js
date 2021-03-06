const express = require('express')
var fs = require('fs')
var https = require('https')
var cors = require('cors')

var palette = require('image-palette')
var pixels = require('image-pixels')

var jsonld_request = require('jsonld-request');

const urlMetadata = require('url-metadata');

const cheerio = require('cheerio');
const fetch = require('node-fetch');

const metascraper = require('metascraper')([
  require('metascraper-author')(),
  require('metascraper-date')(),
  require('metascraper-description')(),
  require('metascraper-image')(),
  require('metascraper-logo')(),
  require('metascraper-clearbit')(),
  require('metascraper-title')(),
  require('metascraper-url')(),
  require('metascraper-youtube')(),
  require('@samirrayani/metascraper-shopping')()
])

const { default: urlExists} = require('url-exists-deep');

const got = require('got')

const app = express()
const port = 8080

app.use(cors())
app.use(express.json())

if (process.env.NODE_ENV === "development") {
  https.createServer({
    key: fs.readFileSync('./server.key'),
    cert: fs.readFileSync('./server.cert')
  }, app)
    .listen(port, () => {
      console.log(`Started server at http://localhost:${port}`)
    })
} else {
  app.listen((process.env.PORT || port), () => {
    console.log(`Started server at https://linkspace-backend.herokuapp.com`)
  })
}

app.get('/', (req, res) => {
  res.send('Server running!')
})

app.post('/linkpreview', async (req, res) => {
  const parsed = req.body.url.replace(/(^\w+:|^)\/\//, '');

  const urls = {
    https: new URL(`https://${parsed}`),
    httpsWWW: new URL(`https://www.${parsed}`),
    httpWWW: new URL(`http://www.${parsed}`),
    http: new URL(`http://${parsed}`),
  } 

  let data = {}

  const getUrlObj = async () => {
    
    for(const key of Object.keys(urls)) {
      const url = urls[key]

      const scraperFetch = await fetch(url.href);
      const scraperFetchHTML = await scraperFetch.text();
      const $ = cheerio.load(scraperFetchHTML);

      if ($("title").text()) {
        return url
      }

      // const doesUrlExists = await urlExists(url.href)

      // if(doesUrlExists) {
      //   return url
      // }
    }

    return false
  }

  const urlObj = await getUrlObj()

  console.log("DEBUG final", urlObj)

  // scrapper #1
  try {
    const rawData = await urlMetadata(urlObj);
    data = {
      ...data,
      ...rawData
    }
  } catch (e) {
    return res.status(400).send({
      error: e
    });
  }

  // scrapper #2
  try {
    const { body: html, url: getUrl } = await got(urlObj.href)
    const metadata = await metascraper({ html, url: getUrl })

    data = {
      ...data,
      scraped: metadata,
    }
  } catch (e) {
    return res.status(400).send({
      error: e
    });
  }

  //srapper #3
  try {
    const scraperFetch = await fetch(urlObj.href);
    const scraperFetchHTML = await scraperFetch.text();
    const $ = cheerio.load(scraperFetchHTML);

    const getMetatag = (name) =>
      $(`meta[name=${name}]`).attr('content') ||
      $(`meta[property="og:${name}"]`).attr('content') ||
      $(`meta[property="twitter:${name}"]`).attr('content')

    const rawMetaData = {
      title: $("title").text(),
      favicon: $("link[rel='shortcut icon']").attr("href"),
      description: getMetatag("description"),
      image: getMetatag("image") || "",
      author: getMetatag("author") || "",
      url: urlObj.href
    }

    data = {
      ...data,
      scrapedRaw: rawMetaData,
    }
  } catch (e) {
    return res.status(400).send({
      error: e
    });
  }

  return res.send(data)
})

app.post('/getColors', async (req,res) => {
  let { ids, colors } = palette(await pixels(req.body.img));
  const correctedColor = colors.map(color => color.map((value, index) => index === 3 ? 1 : value)).map(color => `rgba (${color.join(", ")})`)
  res.send({ colors: correctedColor })
})

app.post('/getJson', (req,res) => {
  jsonld_request(req.body.url, function (err, res, data) {
    res.send({ data })
  });
});