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
ipfs get -o blog QmdxupX32R9Ra2TaEY7Gpf4CTAa5F7aKyHpB3ajp14fkuV
        </pre>
      When you are done, just use "ipfs add -r blog" to upload and
      paste the CID below.
    </div>
    <div>
    CID: <input type="text" id="cid" size="70" @input=${rerender} autocomplete="off" spellcheck="false">
    </div>
    <button @click=${state.download} ?disabled=${!state.isCidValid(cid)}>
      Run Hugo to build blog and save to IPFS
    </button>`

  }
  if (state.machine == 'DOWNLOADING') {
    content = 'Downloading from IPFS'
    const dots = Math.floor((Date.now() - state.start) / 1000)
    content += '.'.repeat(dots)
    content = html`
      <div>${content}</div>
      <div>${state.numSourceFiles} Files downloaded</div>
      <div>${state.bytesSourceFiles} bytes downloaded</div>`
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
        <p><a href="https://ipfs.io/ipfs/${state.cid}" target="_blank">
          https://ipfs.io/ipfs/${state.cid}/
        </a></p>
      </div>
      <p><i>Suggestion: Now pin it somewhere...</i></p>
    `
  }
  return html`
    <h1>hugo-wasm demo</h1>

    ${content}

    <div class="footer">
    GitHub: <a href="https://github.com/jimpick/hugo/tree/jim/wasm-js-ipfs">jimpick/hugo#wasm-js-ipfs</a>
    </div>
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
        /*
        "/quickstart": {
          fs: "HTTPRequest", options: { baseUrl: "/quickstart"}
        },
        */
        "/quickstart": { fs: "InMemory" },
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

  const ipfs = window.ipfs ? await window.ipfs.enable() : await window.Ipfs.create()

  // ipfs.swarm.connect('/dns4/ipfs.jimpick.com/tcp/4006/wss/ipfs/QmScdku7gc3VvfZZvT8kHU77bt6bnH3PnGXkyFRZ17g9EG')
  const CID = window.Ipfs.CID
  const [ fs, Buffer ] = await initBrowserFs()
  const go = new Go()
  let instance
  if (!WebAssembly) {
    alert("No WASM!")
  } else if (WebAssembly.instantiateStreaming) {
    const result = await WebAssembly.instantiateStreaming(
      fetch("hugo.wasm"),
      go.importObject
    )
    instance = result.instance
  } else {
    const response = await fetch("hugo.wasm")
    const bytes = await response.arrayBuffer()
    const result = await WebAssembly.instantiate(bytes, go.importObject)
    instance = result.instance
  }
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
    const bytes = window.crypto.getRandomValues(new Uint8Array(3))
    const toHex = n => n.toString('16').padStart(2, '0')
    state.jobId = Array.prototype.map.call(bytes, toHex).join('')

    const cidEle = document.getElementById('cid')
    const cid = new CID(cidEle.value)
    e.preventDefault()
    // await build()
    state.machine = 'DOWNLOADING'
    state.numSourceFiles = 0
    state.bytesSourceFiles = 0
    state.start = Date.now()
    r(state)
    const intervalId = setInterval(() => r(state), 1000)
    if (ipfs.getReadableStream) {
      const stream = ipfs.getReadableStream(cid)
      stream.on('data', file => {
        console.log('Jim file', file.path, file)
        const shortPath = file.path.replace(/^[^\/]+/, '')
        if (shortPath !== '') {
          if (file.type === 'dir') {
            console.log('Jim mkdir', shortPath)
            fs.mkdirSync(`/quickstart${shortPath}`)
          } else {
            console.log('Jim file', shortPath, file.size)
            file.content.on('data', data => {
              fs.writeFileSync(`/quickstart${shortPath}`, data)
              state.numSourceFiles += 1
              state.bytesSourceFiles += file.size
            })
            file.content.resume()
          }
        }
      })
      stream.on('end', () => {
        clearInterval(intervalId)
        build()
      })
    } else {
      const files = await ipfs.get(cid)
      for (const file of files) {
        console.log('Jim file', file)
        const shortPath = file.path.replace(/^[^\/]+/, '')
        if (shortPath !== '') {
          if (!file.content) {
            console.log('Jim mkdir', shortPath)
            fs.mkdirSync(`/quickstart${shortPath}`)
          } else {
            console.log('Jim file', shortPath, file.content.length)
            fs.writeFileSync(`/quickstart${shortPath}`, file.content)
            state.numSourceFiles += 1
            state.bytesSourceFiles += file.content.length
          }
        }
      }
      clearInterval(intervalId)
      await build()
    }
  }

  async function build () {
    runBuild()

    async function runBuild () {
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
