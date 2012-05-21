DIR="`dirname $0`"
find "$1" -path "$1/jquery" -prune -o -path "$1/steal" -prune -o \
	-path "$1/documentjs" -prune -o -path "$1/funcunit" -prune -o \
	-path "$1/to/exclude/a/dir/add/a/line/like/this" -prune -o \
	-name "production.js" -prune -o \
	\( -name "*.js" -type f  -exec echo "upgrading: {}" ';' -exec "$DIR/upgrade.sh" '{}' ';' \)
