P=tar_stream_chunker
SOURCES=src/main.c src/options.c

$(P): $(SOURCES) Makefile
	$(CC) -o $(P) -Wall -Werror -O3 $(SOURCES)

clean:
	rm -f $(P) src/*.o
	rm -rf e2e/node_modules

e2e: clean $(P)
	cd e2e && npm install && npm test
