#!/bin/bash

echo "Building Books Service"
cd books_service
CGO_ENABLED=0 GOOS=linux go build -o app
docker build -t patnaikshekhar/custom-service-mesh-books-service:1 .
docker push patnaikshekhar/custom-service-mesh-books-service:1

echo "Building Borrowers Client"
cd ../borrowers

CGO_ENABLED=0 GOOS=linux go build -o app
docker build -t patnaikshekhar/custom-service-mesh-borrowers-client:1 .
docker push patnaikshekhar/custom-service-mesh-borrowers-client:1

cd ..

echo "Deploying to Kubernetes"
kubectl delete deploy borrowers
kubectl delete deploy books
kubectl apply -f test.yaml