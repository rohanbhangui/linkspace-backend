const express = require('express')
var fs = require('fs')
var https = require('https')
var cors = require('cors')

var palette = require('image-palette')
var pixels = require('image-pixels')

var jsonld_request = require('jsonld-request');

const urlMetadata = require('url-metadata')


const app = express()
const port = 8080

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.post('/linkpreview', (req, res) => {
  const url = new URL(req.body.url);

  urlMetadata(url).then(
    (metadata) => { // success handler
      console.log(metadata)
      res.send(metadata)
    },
    (error) => { // failure handler
      console.log(error)
    })
})

app.post('/getColors', async (req,res) => {
  let { ids, colors } = palette(await pixels(req.body.img));
  res.send({ colors: colors.map(color => `rgba(${color.join(", ")})`) })
})

app.post('/getJson', (req,res) => {
  jsonld_request(req.body.url, function (err, res, data) {
    // handle errors or use data
    res.send({ data })
  });
})


https.createServer({
  key: fs.readFileSync('./server.key'),
  cert: fs.readFileSync('./server.cert')
}, app)
.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})