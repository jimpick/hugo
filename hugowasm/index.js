// import { readdirSync, mkdirSync, copyFileSync } from "fs"

function initBrowserFs () {
  const promise = new Promise((resolve, reject) => {
    BrowserFS.configure({
      fs: "MountableFileSystem",
      options: {
        "/source": { fs: "HTTPRequest", options: { baseUrl: "/source"} },
        "/quickstart": { fs: "InMemory" },
        "/tmp": { fs: "InMemory" }
      }
    }, function(e) {
      if (e) {
          return reject (e)
      }
      // Otherwise, BrowserFS is ready-to-use!
      var fs = BrowserFS.BFSRequire('fs')
      var Buffer = BrowserFS.BFSRequire('buffer').Buffer
      fs.readFile('/source/config.toml', (err, data) => {
        console.log('Jim5', err, data.toString())
      })
      copyFiles(fs, '')
      resolve([fs, Buffer])
    })
  })
  return promise
}

function copyFiles (fs, dir) {
  const sourceDir = `/source/${dir}`
  const destDir = `/quickstart/${dir}`
  const files = fs.readdirSync(sourceDir)
  for (const file of files) {
    const stats = fs.statSync(`${sourceDir}/${file}`)
    if (stats.isDirectory()) {
      console.log('Jim dir', `${dir}/${file}`)
      fs.mkdirSync(`${destDir}/${file}`)
      copyFiles(fs, `${dir}/${file}`)
    } else {
      console.log('Jim file', `${dir}/${file}`)
      const data = fs.readFileSync(`${sourceDir}/${file}`)
      fs.writeFileSync(`${destDir}/${file}`, data)
    }
  }
}

async function run () {
  const [ fs, Buffer ] = await initBrowserFs()
  const go = new Go()
  fs.stat2 = function (...args) {
    console.log('args', args)
  }
  const { instance } = await WebAssembly.instantiateStreaming(
    fetch("hugo.wasm"),
    go.importObject
  )
  go.run(instance)
}

run()