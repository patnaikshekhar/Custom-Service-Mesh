package main

import (
	"log"
	"net/http"
)

func main() {

	http.HandleFunc("/books", booksHandler)

	err := http.ListenAndServe("127.0.0.1:8081", nil)
	if err != nil {
		log.Fatalf("%v", err)
	}
}

func booksHandler(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Here are some books"))
}
