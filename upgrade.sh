DIR="`dirname $0`"
UP="$1.upgraded"
ERR="$1.upgrade-error"
node "$DIR/jsshaper/src/run-shaper.js" "$1" "../../jmvc-upgrader.js" "../../steal-collapse.js" --source > "$UP"
if [ $? -eq 0 ]
then mv "$UP" "$1"
fi
