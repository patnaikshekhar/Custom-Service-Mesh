const Client = require('kubernetes-client').Client
const Request = require('kubernetes-client/backends/request')
const JSONStream = require('json-stream')

const watchServices = (callback) => {
  const backend = new Request(Request.config.getInCluster())
  const client = new Client({ backend, version: '1.13' })

  const stream = client.api.v1.watch.namespaces('').services.getStream()
  const jsonStream = new JSONStream()
  stream.pipe(jsonStream)

  jsonStream.on('data', (service) => {
    callback({
      action: service.type,
      name: service.object.metadata.name,
      namespace: service.object.metadata.namespace,
      ports: service.object.spec.ports.map(p => p.port) 
    })
  })

  jsonStream.on('end', () => {
    console.log('Stream closed')
  })
}

module.exports = {
  watchServices
}