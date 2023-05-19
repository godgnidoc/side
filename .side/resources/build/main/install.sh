#!/bin/bash -e
set -e

HOST=${HOST:-'localhost:5000'}

API_QUERY="http://${HOST}/api/package/search/byquery"
API_DOWNLOAD="http://${HOST}/api/package/download"
API_DL="http://${HOST}/api/dl"
API_TASK="http://${HOST}/api/tasks"

echo "Query the latest version of Side"
PACKAGE_ID=$(curl -s ${API_QUERY}?query=@platform/side\&version=latest | sed -e 's|.*\["\(.*\)".*|\1|')
echo "Package ID: ${PACKAGE_ID}"

echo "Request to download the package"
DOWNLOAD_TOKEN=$(curl -s ${API_DOWNLOAD}?id=${PACKAGE_ID} | sed -e 's|.*"token":"\(.*\)".*|\1|')
echo "Download Token: ${DOWNLOAD_TOKEN}"

echo "Download the package"
mkdir -p ~/.side/side/root
curl -s -X POST -H "Task-Token: ${DOWNLOAD_TOKEN}" ${API_TASK} -o ~/.side/side.tar
echo "Downloaded " $(md5sum ~/.side/side.tar)

echo "Extract the package"
tar -xf ~/.side/side.tar -C ~/.side/side
tar -xf ~/.side/side/root.tar.xz -C ~/.side/side/root
rm -rf ~/.side/side/root.tar.xz ~/.side/side.tar
echo "Extracted"

if [[ ! $(sed -n '/# Side/,/# End Side/p' ~/.bashrc) ]]; then
    echo "Modify bashrc"
    echo "# Side" >> ~/.bashrc
    echo "source ~/.side/side/root/setup.sh" >> ~/.bashrc
    echo "# End Side" >> ~/.bashrc
    echo "Modified"
fi

if ! which node &> /dev/null || ! node --version | grep -q "v16"; then
    echo "Install nodejs"
    curl -s ${API_DL}?p=node -o ~/.side/side/root/node
    echo "Installed"
fi

echo "Check version"
export PATH=~/.side/side/root:$PATH
side --version

echo "Modifying the configuration file"
if [[ ! -f ~/.side/settings ]]; then
    echo '{}' > ~/.side/settings
fi

if ! side vhas ~/.side/settings dist &> /dev/null; then
    side vset ~/.side/settings -o ~/.side/settings dist = '{}'
fi

side vset ~/.side/settings -o ~/.side/settings dist.apiBaseUrl = "'http://${HOST}/api'"
echo "Modified"

echo "Side installed successfully, please restart your terminal."
echo "Enjoy!"

