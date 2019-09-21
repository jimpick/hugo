import {html, render} from 'https://unpkg.com/lit-html?module'

function mainView (state) {
  let content = '!!!'
  if (state.machine == 'INIT') {
    content = 'Loading wasm... (25MB -> 6MB compressed!!)'
  }
  if (state.machine == 'READY') {
    const cidEle = document.getElementById('cid')
    const cid = cidEle ? cidEle.value : ''
    content = html`
    <div class="instructions">
      Want to make a blog? Download this Hugo blog template with IPFS:
        <pre>
ipfs get QmSNEDmpw1snSE968LUpNWFfQavVUzyMHmqGZbzk1eueq7
        </pre>
      When you are done, just use "ipfs add -r ." to upload and
      paste the CID below.
    </div>
    <div>
    CID: <input type="text" id="cid" size="70" @input=${rerender}>
    </div>
    <button @click=${state.download} ?disabled=${!state.isCidValid(cid)}>
      Run Hugo to build blog and save to IPFS
    </button>`

  }
  if (state.machine == 'DOWNLOADING') {
    content = 'Downloading from IPFS...'
  }
  if (state.machine == 'BUILDING') {
    content = 'Building...'
  }
  if (state.machine == 'ADDING_TO_IPFS') {
    content = 'Adding to IPFS...'
    if (state.numFiles > 0) {
      content += ` (${state.added} / ${state.numFiles} files)`
    }
  }
  if (state.machine == 'PUBLISHED') {
    content = html`
      <p>Published ${state.added} files.</p>
      <div class="finalLinks">
        <p>CID: ${state.cid}</p>
        <p><a href="https://${state.cid}.ipfs.dweb.link/" target="_blank">
          https://${state.cid}.ipfs.dweb.link/
        </a></p>
      </div>
      <p><i>Suggestion: Now pin it somewhere...</i></p>
    `
  }
  return html`
    <h1>hugo-wasm demo</h1>

    ${content}
  `

  function rerender () {
    r(state)
  }
}

function r (state) {
  render(mainView(state), document.body)
}

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
  const state = {
    machine: 'INIT'
  }
  r(state)
  const ipfs = await window.Ipfs.create()
  const CID = window.Ipfs.CID
  const [ fs, Buffer ] = await initBrowserFs()
  const go = new Go()
  fs.stat2 = function (...args) {
    console.log('args', args)
  }
  const { instance } = await WebAssembly.instantiateStreaming(
    fetch("hugo.wasm"),
    go.importObject
  )
  state.machine = 'READY'
  state.isCidValid = isCidValid
  state.download = download
  r(state)

  function isCidValid (cidString) {
    try {
      const cid = new CID(cidString)
      return true
    } catch (e) {
      return false
    }
  }

  async function download (e) {
    const cidEle = document.getElementById('cid')
    const cid = new CID(cidEle.value)
    e.preventDefault()
    // await build()
    state.machine = 'DOWNLOADING'
    r(state)
    setTimeout(build, 3000)
  }

  async function build () {
    runBuild()

    async function runBuild () {
      const bytes = window.crypto.getRandomValues(new Uint8Array(3))
      const toHex = n => n.toString('16').padStart(2, '0')

      state.jobId = Array.prototype.map.call(bytes, toHex).join('')
      console.log('Building job', state.jobId)
      state.machine = 'BUILDING'
      r(state)
      await go.run(instance)
      await addToIpfs()
    }
  }

  async function addToIpfs () {
    state.machine = 'ADDING_TO_IPFS'
    r(state)

    const files = []
    walkDir('')
    state.numFiles = files.length
    state.added = 0
    r(state)
    const mfsDir = `/hugo/${state.jobId}`
    for (const file of files) {
      const data = fs.readFileSync(`/public${file}`)
      await ipfs.files.write(
        `${mfsDir}${file}`,
        data,
        { create: true, parents: true }
      )
      state.added += 1
      r(state)
    }
    const mfsStats = await ipfs.files.stat(mfsDir)
    state.cid = (new CID(mfsStats.hash)).toV1()
    await finished()

    function walkDir (dir) {
      const dirFiles = fs.readdirSync(`/public/${dir}`)
      for (const file of dirFiles) {
        const stats = fs.statSync(`/public/${dir}/${file}`)
        if (stats.isDirectory()) {
          walkDir(`${dir}/${file}`)
        } else {
          files.push(`${dir}/${file}`)
        }
      }
    }
  }

  async function finished () {
    state.machine = 'PUBLISHED'
    r(state)
  }
}

run()
