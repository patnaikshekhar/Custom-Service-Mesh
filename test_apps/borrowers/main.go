package main

import (
	"io/ioutil"
	"log"
	"net/http"
	"time"
)

func main() {

	for {
		log.Println("Waiting")
		time.Sleep(10 * time.Second)

		response, err := http.Get("http://localhost:8080/books-service.custom-service-mesh/books")
		if err != nil {
			log.Printf("Error: %s", err.Error())
			log.Printf("Status Code %d", response.StatusCode)
			continue
		}

		body, err := ioutil.ReadAll(response.Body)
		if err != nil {
			log.Printf("Error: %s", err.Error())
			log.Printf("Status Code %d", response.StatusCode)
			continue
		}

		log.Printf("Status Code %d", response.StatusCode)
		log.Println(string(body))
	}
}

func booksHandler(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Here are some books"))
}
