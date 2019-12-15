#/bin/bash

echo "Building Docker Image"
docker build -t patnaikshekhar/custom-service-mesh-injector:0.1 .
docker push patnaikshekhar/custom-service-mesh-injector:0.1

echo "Clean Up"
kubectl delete secret envoy-injector-secret -n custom-service-mesh
kubectl delete MutatingWebhookConfiguration envoy-injector
kubectl delete -f k8s.yaml
rm -r certs

echo "Creating certs"
mkdir certs && cd certs
openssl genrsa -out ca.key 2048
openssl req -x509 -new -nodes -key ca.key -days 100000 -out ca.crt -subj "/CN=admission_ca"
cat >server.conf <<EOF
[req]
req_extensions = v3_req
distinguished_name = req_distinguished_name
[req_distinguished_name]
[ v3_req ]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth, serverAuth
subjectAltName = @alt_names
[alt_names]
DNS.1 = injector-service
DNS.2 = injector-service.custom-service-mesh
DNS.3 = injector-service.custom-service-mesh.svc
EOF
openssl genrsa -out tls.key 2048
openssl req -new -key tls.key -out server.csr -subj "/CN=injector-service.custom-service-mesh.svc" -config server.conf
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out tls.crt -days 100000 -extensions v3_req -extfile server.conf

echo "Create Namespace"
kubectl create ns custom-service-mesh

echo "Creating Secret"
kubectl create secret tls envoy-injector-secret --cert=tls.crt --key=tls.key -n custom-service-mesh

cd ..

echo "Installing Webhook Pods"
kubectl apply -f k8s.yaml

echo "Creating Webhook"
cat <<EOF | kubectl apply -f -
apiVersion: admissionregistration.k8s.io/v1beta1
kind: MutatingWebhookConfiguration
metadata:
  name: envoy-injector
webhooks:
- name: envoy-injector.shekharpatnaik.com
  rules:
  - apiGroups:
    - ""
    apiVersions:
    - v1
    operations:
    - CREATE
    resources:
    - pods
  failurePolicy: Fail
  clientConfig:
    service:
      namespace: custom-service-mesh
      name: injector-service
    caBundle: $(cat ./certs/ca.crt | base64 | tr -d '\n')
EOF