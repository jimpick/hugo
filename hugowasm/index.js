function initBrowserFs () {
  const promise = new Promise((resolve, reject) => {
    BrowserFS.configure({
      fs: "MountableFileSystem",
      options: {
        "/quickstart": {
          fs: "HTTPRequest", options: { baseUrl: "/quickstart"}
        },
        "/public": { fs: "InMemory" },
        "/tmp": { fs: "InMemory" }
      }
    }, function(e) {
      if (e) {
          return reject (e)
      }
      // Otherwise, BrowserFS is ready-to-use!
      var fs = BrowserFS.BFSRequire('fs')
      var Buffer = BrowserFS.BFSRequire('buffer').Buffer
      resolve([fs, Buffer])
    })
  })
  return promise
}

async function run () {
  const node = await window.Ipfs.create()
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
