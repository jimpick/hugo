function initBrowserFs () {
  const promise = new Promise((resolve, reject) => {
    BrowserFS.configure({
      fs: "HTTPRequest",
      options: {
        // baseUrl: "/quickstart"
      }
    }, function(e) {
      if (e) {
          return reject (e)
      }
      // Otherwise, BrowserFS is ready-to-use!
      var fs = BrowserFS.BFSRequire('fs')
      var Buffer = BrowserFS.BFSRequire('buffer').Buffer
      fs.readFile('/quickstart/config.toml', (err, data) => {
        console.log('Jim5', err, data.toString())
      })
      resolve([fs, Buffer])
    })
  })
  return promise
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