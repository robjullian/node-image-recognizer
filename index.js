const config = require('./config.json')

const brain = require('brain.js')
const fetch = require('node-fetch')
const image2base64 = require('image-to-base64')
const fs = require('fs')

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db.json')
const db = low(adapter)

db.defaults({ net: [] }).write()

const net = new brain.NeuralNetwork()

const recognizer = {
  getImages (callback) {
    fetch(`${config.api}/search/photos/?client_id=${config.access_token}&page=1&query=office`)
    .then(res => res.json())
    .then(json => {
      let data = json.results
      for (i in data) {
        console.log(i)
        image2base64(data[i].urls.regular)
        .then((response) => {
          db.get('net').push({
            input: response,
            output: data[i].tags
          }).write()
        }).catch((error) => {
          console.log(error)
        })
      }
      callback()
    })
  },

  train () {
    net.trainAsync(db.get('net').value()).then(res => {
      fs.writeFile('./brain.json', net.toJSON(), 'utf8', () => {
        console.log('Done')
      })
    }) 
  },

  compare (url) {
    const brainFile = JSON.parse(fs.readFileSync('./brain.json'))
    net.fromJSON(brainFile)

    image2base64(url)
    .then((response) => {
      net.run(response)
    }).catch((error) => {
      console.log(error)
    })

  }
}

if (process.argv[2] === '-d') {
  recognizer.getImages(() => {
    console.log('[INFO] > Download : done')
  })
}
if (process.argv[2] === '-t') {
  recognizer.train()
}
if (process.argv[2] === '-c') {
  recognizer.compare(process.argv[3])
}