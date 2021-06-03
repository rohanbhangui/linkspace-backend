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

const got = require('got')

const app = express()
const port = 8080

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.post('/linkpreview', async (req, res) => {
  const url = new URL(req.body.url);

  const rawData = await urlMetadata(url);

  const { body: html, url: getUrl } = await got(url.href)
  
  const metadata = await metascraper({ html, url: getUrl })

  const scraperFetch = await fetch(url.href);
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
    author: getMetatag("author") || ""
  }
  
  res.send({
    ...rawData,
    scraped: metadata,
    scrapedRaw: rawMetaData
  })
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



https.createServer({
  key: fs.readFileSync('./server.key'),
  cert: fs.readFileSync('./server.cert')
}, app)
.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})