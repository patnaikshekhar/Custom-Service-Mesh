const express = require('express')

const kube = require('./kube')

const app = express()

app.use(express.json())

const clusters = []

const logMiddleware = (req, res, next) => {
  console.log('Request Body', req.body)
  console.log('Request Method', req.method)
  console.log('Request Path', req.originalUrl)
  next()
}

app.post('/v2/discovery::action', logMiddleware, (req, res) => {
  if (req.params.action == 'clusters') {
    getClusters(req, res)
  } else if (req.params.action == 'listeners') {
    getListeners(req, res)
  } else {
    res.sendStatus(404)
  }
})

function getClusters(req, res) {
  
  const resources = clusters.map(cluster => ({
    "@type": "type.googleapis.com/envoy.api.v2.Cluster",
    "name": `${cluster.name}_${cluster.namespace}`,
    "connect_timeout": "0.25s",
    "lb_policy": "ROUND_ROBIN",
    "type": "strict_dns",
    "dns_lookup_family": "V4_ONLY",
    "hosts": cluster.ports.map(port => ({
      "socket_address": {
        "address": `${cluster.name}.${cluster.namespace}`,
        "port_value": 10000
      }
    }))
  }))

  res.json({
    "version_info": "0",
    "resources": resources
  })
}

function getListeners(req, res) {
  res.json({
    "version_info": "3",
    "resources": [{
      "@type": "type.googleapis.com/envoy.api.v2.Listener",
      name: 'listener_internal',
      address: {
        socket_address: {
          address: '127.0.0.1',
          port_value: 8080
        }
      },
      filter_chains: [{
        filters: [{
          name: 'envoy.http_connection_manager',
          config: {
            access_log: {
              name: 'envoy.file_access_log',
              config: {
                path: '/dev/stdout'
              }
            },
            stat_prefix: 'ingress_http',
            codec_type: 'AUTO',
            route_config: {
              name: 'local_route',
              virtual_hosts: [{
                name: 'local_service',
                domains: ["*"],
                routes: clusters.map(cluster => ({
                  match: {
                    prefix: `/${cluster.name}.${cluster.namespace}/`
                  },
                  route: {
                    prefix_rewrite: '/',
                    host_rewrite: `${cluster.name}.${cluster.namespace}`,
                    cluster: `${cluster.name}_${cluster.namespace}`
                  }
                }))
              }]
            },
            "http_filters": [
              {
                  "name": "envoy.router"
              }
            ]
          }
        }]
      }]
    }, {
      "@type": "type.googleapis.com/envoy.api.v2.Listener",
      name: 'listener_external',
      address: {
        socket_address: {
          address: '0.0.0.0',
          port_value: 10000
        }
      },
      filter_chains: [{
        filters: [{
          name: 'envoy.http_connection_manager',
          config: {
            access_log: {
              name: 'envoy.file_access_log',
              config: {
                path: '/dev/stdout'
              }
            },
            stat_prefix: 'ingress_http',
            codec_type: 'AUTO',
            route_config: {
              name: 'local_route',
              virtual_hosts: [{
                name: 'local_service',
                domains: ["*"],
                routes: clusters.map(cluster => ({
                  match: {
                    prefix: '/'
                  },
                  route: {
                    cluster: 'local_cluster'
                  }
                }))
              }]
            },
            "http_filters": [
              {
                  "name": "envoy.router"
              }
            ]
          }
        }]
      }]
    }]
  })
}

const main = () => {
  // Watching API server for new services
  kube.watchServices(service => {
    if (service.action == 'ADDED') {
      clusters.push(service)
    } else if (service.action == 'DELETED') {
      clusters = clusters.filter(c => {
        return c.name != service.name && c.namespace != service.namespace
      })
    }
  })

  // When a new service is created then update backend clusters
  app.listen(80, () => console.log('XDS Server Started'))
}

main()

