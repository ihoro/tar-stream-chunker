P=tar_stream_chunker
SOURCES=src/main.c src/options.c
SHELL=/usr/bin/env bash
VALGRIND=valgrind -v --leak-check=full --show-leak-kinds=all

$(P): $(SOURCES) Makefile
	$(CC) -o $(P) -Wall -Werror -O3 $(SOURCES)

clean:
	rm -f $(P) src/*.o
	rm -rf e2e/node_modules e2e/package-lock.json

valgrind: clean
	$(CC) -o $(P) -Wall -Werror -O0 -g $(SOURCES)
	$(VALGRIND) ./$(P) -f file -s   1 < <(head -c   1 /dev/random) > /dev/null
	$(VALGRIND) ./$(P) -f file -s   1 < <(head -c 100 /dev/random) > /dev/null
	$(VALGRIND) ./$(P) -f file -s  10 < <(head -c 100 /dev/random) > /dev/null
	$(VALGRIND) ./$(P) -f file -s 100 < <(head -c 100 /dev/random) > /dev/null

e2e: clean $(P)
	cd e2e && npm install && npm test
