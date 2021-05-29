const express = require('express')
var fs = require('fs')
var https = require('https')
var cors = require('cors')

const urlMetadata = require('url-metadata')
// const { getLinkPreview } = require('link-preview-js')


const app = express()
const port = 8080

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.post('/linkpreview', (req, res) => {
  const url = new URL(req.body.url);

  // getLinkPreview(url)
  //   .then((data) => res.send(data));

  urlMetadata(url).then(
    (metadata) => { // success handler
      console.log(metadata)
      res.send(metadata)
    },
    (error) => { // failure handler
      console.log(error)
    })
})


https.createServer({
  key: fs.readFileSync('./server.key'),
  cert: fs.readFileSync('./server.cert')
}, app)
.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})