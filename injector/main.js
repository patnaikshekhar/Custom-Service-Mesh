const express = require('express')
const fs = require('fs')
const https = require('https')
const privateKey  = fs.readFileSync('./certs/tls.key')
const certificate = fs.readFileSync('./certs/tls.crt')

const app = express()

app.use(express.json())

app.post('/', (req, res) => {
  const request = req.body.request
  let patchBase64 = ''
  
  if (request.object.metadata.annotations) {

    if (request.object.metadata.annotations['inject-mesh'] === 'true') {

      console.log(`Found annotation for pod ${request.object.metadata.name} injecting envoy`)

      const patch = [{
        op: "add", 
        path: "/spec/containers/-", 
        value: {
          image: 'envoyproxy/envoy',
          name: 'envoy',
          args: ["-c", "/etc/envoy/envoy.yaml", "--service-cluster", "pod", "--service-node", "node"],
          volumeMounts: [{
            name: 'envoy-config',
            mountPath: '/etc/envoy'
          }]
        }
      }, {
        op: "add", 
        path: "/spec/volumes/-", 
        value: {
          name: 'envoy-config',
          configMap: {
            name: 'envoy-config'
          }
        }
      }]
    
      patchBase64 = Buffer.from(JSON.stringify(patch)).toString('base64')
    }
  }

  res.json({
    "apiVersion": "admission.k8s.io/v1beta1",
    "kind": "AdmissionReview",
    "response": {
      "uid": request.uid,
      "allowed": true,
      "patchType": "JSONPatch",
      "patch": patchBase64
    }
  })
})

const run = () => {
  const httpsServer = https.createServer({
    key: privateKey,
    cert: certificate
  }, app)
  httpsServer.listen(443)
  console.log('Server started')
}

run()
