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
	$(VALGRIND) ./$(P) -f file -s       1 < <(head -c       1 /dev/random) > /dev/null
	$(VALGRIND) ./$(P) -f file -s       1 < <(head -c    1000 /dev/random) > /dev/null
	$(VALGRIND) ./$(P) -f file -s       1 < <(head -c 1000000 /dev/random) > /dev/null
	$(VALGRIND) ./$(P) -f file -s      10 < <(head -c 1000000 /dev/random) > /dev/null
	$(VALGRIND) ./$(P) -f file -s     100 < <(head -c 1000000 /dev/random) > /dev/null
	$(VALGRIND) ./$(P) -f file -s    1000 < <(head -c 1000000 /dev/random) > /dev/null
	$(VALGRIND) ./$(P) -f file -s   10000 < <(head -c 1000000 /dev/random) > /dev/null
	$(VALGRIND) ./$(P) -f file -s  100000 < <(head -c 1000000 /dev/random) > /dev/null
	$(VALGRIND) ./$(P) -f file -s 1000000 < <(head -c 1000000 /dev/random) > /dev/null

e2e: clean $(P)
	cd e2e && npm install && npm test
