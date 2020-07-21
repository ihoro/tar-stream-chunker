#include <err.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

#include "options.h"

static char end_of_tar[1024] = { 0 };
static void write_tar_entry(int chunk_index, void *buf, int len);

int
main(int argc, char *argv[]) {
	parse_options(argc, argv);

	void *buf = malloc(chunk_size);

	int chunk_index = 0;
	int window = chunk_size;
	int bytes_read = 0;

	while ((bytes_read = read(0, buf + chunk_size - window, window)) > 0) {
		window -= bytes_read;
		if (window <= 0) {
			chunk_index++;
			write_tar_entry(chunk_index, buf, chunk_size);
			window = chunk_size;
		}
	}

	if (bytes_read == 0 && window == chunk_size && chunk_index == 0) {
		errx(1, "nothing to archive - empty stdin.");
	}

	if (bytes_read == 0 && window != chunk_size) {
		chunk_index++;
		write_tar_entry(chunk_index, buf, chunk_size - window);
	}

	if (write(STDOUT_FILENO, end_of_tar, 1024) <= 0) {
		errx(1, "Could not write end of TAR.");
	}

	free(buf);
	free(file_name);

	return (0);
}

static void
write_tar_entry(int chunk_index, void *buf, int len) {
	unsigned int now = time(NULL);

	char chunk_name[99] = { 0 };
	strcpy(chunk_name, file_name);
	sprintf(chunk_name + strlen(file_name), ".%05d", chunk_index);

	char header[512] = { 0 };
	memcpy(header, chunk_name, strlen(chunk_name));	/* name */
	memcpy(header+100, "000644 ", 7);		/* modes */
	memcpy(header+108, "000000 ", 7);		/* uid */
	memcpy(header+116, "000000 ", 7);		/* gid */
	sprintf(header+124, "%011o ", len);		/* size */
	sprintf(header+136, "%011o ", now);		/* time */
	header[156] = 48 + 0;				/* type=file */
	memcpy(header+257, "ustar", 5);			/* ustar magic */
	memcpy(header+263, "00", 2);			/* ustar version */
	memcpy(header+329, "000000 ", 7);		/* device major */
	memcpy(header+337, "000000 ", 7);		/* device minor */

	int check_sum = 8 * 32;
	int i;
	for (i = 0; i < 148; i++) {
		check_sum += header[i];
	}
	for (i = 156; i < 512; i++) {
		check_sum += header[i];
	}
	sprintf(header+148, "%06o ", check_sum);

	if (write(STDOUT_FILENO, header, 512) <= 0) {
		errx(1, "Could not write TAR entry header.");
	}
	if (write(STDOUT_FILENO, buf, len) <= 0) {
		errx(1, "Could not write TAR entry body.");
	}

	/* overflow */
	int s = len & 511;
	if (s) {
		if (write(STDOUT_FILENO, end_of_tar, 512 - s) <= 0) {
			errx(1, "Could not write TAR entry padding.");
		}
	}
}
