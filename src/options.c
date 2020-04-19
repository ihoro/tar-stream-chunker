#include <getopt.h>
#include <limits.h>
#include <string.h>
#include <stdlib.h>
#include <err.h>
#include <stdio.h>

#include "options.h"

static void usage(void);
static void validate_options(void);

char	*file_name = NULL;
int	chunk_size = INT_MIN;

static struct option longopts[] = {
	{ "file-name",	required_argument,	NULL,	'f' },
	{ "chunk-size",	required_argument,	NULL,	's' },
	{ NULL,		0,			NULL,	0 }
};

void
parse_options(int argc, char *argv[]) {
	if (argc < 2) {
		usage();
	}

	int ch;
	while ((ch = getopt_long(argc, argv, "f:s:", longopts, NULL)) != -1) {
		switch (ch) {
		case 'f':
			file_name = strdup(optarg);
			break;
		case 's':
			chunk_size = atoi(optarg);
			break;
		default:
			usage();
		}
	}

	validate_options();
}

static void
validate_options(void) {
	if (file_name == NULL) {
		errx(1, "file name is not provided.");
	}
	if (strlen(file_name) > 93) {
		errx(1, "file name length maximum is 93 bytes.");
	}
	if (chunk_size == INT_MIN) {
		errx(1, "chunk size is not provided.");
	}
	if (chunk_size <= 0) {
		errx(1, "chunk size must be an integer > 0.");
	}
}

static void
usage(void) {
	fprintf(stderr,
		"tar_stream_chunker: splits stdin of unknown size onto chunks of given size\n"
		"and collect chunk files as a TAR archive what is written to stdout.\n"
		"\n"
		"Usage: tar_stream_chunker\n"
			"\t{ --file-name | -f } <chunk-file-name>\n"
			"\t{ --chunk-size | -s } <bytes>\n"
		"\n"
		"Examples:\n"
			"\t$ ... | tar_stream_chunker -f dump.sql -s 500000000 | ... > result.tar\n"
			"\t$ tar_stream_chunker -f dump.sql -s 500000000 < input > output.tar\n"
			"\t$ pg_dump ... | tar_stream_chunker ... | tarsnap -cf archive @-\n"
		"\n"
		"What to expect within a resulting TAR file:\n"
			"\t$ cat 3MB-file | tar_stream_chunker -f file -s 1000000 > result.tar\n"
			"\t$ tar -tf result.tar\n"
			"\tfile.00001\n"
			"\tfile.00002\n"
			"\tfile.00003\n"
		"\n"
		"How to re-assemble to the original file:\n"
			"\t$ tar -xf result.tar; cat file.* > original-3MB-file\n"
			"\t$ tar -xOf result.tar > original-3MB-file\n"
	);
	exit(-1);
}
