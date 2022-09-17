DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"
cp $DIR/../../webos-common/Mojo/updater-model.js $DIR/../app/models/updater-model.js
cp $DIR/../../webos-common/Mojo/system-model.js $DIR/../app/models/system-model.js
cp $DIR/../../webos-common/Mojo/com.wosa.mojo.additions.js $DIR/../app/com.wosa.mojo.additions.js
palm-run $DIR/../