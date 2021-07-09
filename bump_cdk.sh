#!/bin/bash

CURRENT_VERSION=$(grep "^const AWS_CDK_VERSION" .projenrc.js | cut -d \' -f2)
CURRENT_MAJOR=$(echo "${CURRENT_VERSION}" | cut -d . -f1)
CURRENT_MINOR=$(echo "${CURRENT_VERSION}" | cut -d . -f2)

NEXT_VERSION="${CURRENT_MAJOR}.$(( $CURRENT_MINOR + 1)).0"
NEXT_PATCH="0"

function get_next_patch_version_from_next() {
  NEXT_MAJOR=$(echo "${NEXT_VERSION}" | cut -d . -f1)
  NEXT_MINOR=$(echo "${NEXT_VERSION}" | cut -d . -f2)
  NEXT_PATCH=$(echo "${NEXT_VERSION}" | cut -d . -f3)
  echo "${NEXT_MAJOR}.${NEXT_MINOR}.$(( ${NEXT_PATCH} + 1))"
}

git checkout main

# Below variable will be 0 if they are not available
if curl -s "https://github.com/awslabs/aws-solutions-constructs/releases/tag/v${NEXT_VERSION}" | grep "^Not Found" &>/dev/null
then
  echo "No matching aws-solutions-constructs version available, not proceeding due to missing dependency"
  exit 2
else
  NEXT_PATCH_VERSION=$(get_next_patch_version_from_next)
  while ! curl -s "https://github.com/awslabs/aws-solutions-constructs/releases/tag/v${NEXT_PATCH_VERSION}" | grep "^Not Found" &>/dev/null
  do
    NEXT_VERSION="${NEXT_PATCH_VERSION}"
  done
fi

echo "Current version is ${CURRENT_VERSION} so bump will go to ${NEXT_VERSION}. Proceed?<y[es]/N[o]>"
read -r PROCEED
PROCEED_UPPER=$(echo "${PROCEED}" | tr '[:lower:]' '[:upper:]')

if [[ "${PROCEED_UPPER}" = 'Y' ]] || [[ "${PROCEED_UPPER}" = 'YES' ]]
then
  echo "Matching aws-solutions-constructs version found. Proceeding."
  echo "Update config file"
  sed -i.bak "s/${CURRENT_VERSION}/${NEXT_VERSION}/" .projenrc.js
  echo "Update version file"
  sed -i.bak "s/${CURRENT_VERSION}/${NEXT_VERSION}/" version.json
  echo "Re-synthesize using projen"
  npx projen
  echo "Tag version correctly"
  git tag -a "v${NEXT_VERSION}" -m "chore(release): ${NEXT_VERSION}"

  echo "After validation run:"
  echo " git push --follow-tags origin main"
  echo " git checkout release && git push --follow-tags origin release && git checkout main"
else
  echo "Abort"
  exit 1
fi