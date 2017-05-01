FROM mhart/alpine-node:7.9

RUN adduser -D codewarrior
RUN ln -s /home/codewarrior /workspace

RUN apk add --no-cache \
    bash \
    coreutils \
    findutils \
    git \
 && apk add --no-cache \
    --repository http://dl-cdn.alpinelinux.org/alpine/edge/community/ \
    lua5.2 \
    lua5.2-busted \
 && ln -s /usr/bin/busted-5.2 /usr/bin/busted \
 && ln -s /usr/bin/lua5.2 /usr/bin/lua

WORKDIR /runner
ENV NPM_CONFIG_LOGLEVEL=warn
COPY package.json /runner/package.json
RUN npm install --only=prod

COPY lib /runner/lib
# files inside /home/codewarrior will be removed in NODE_ENV=test
COPY docker/lua /runner/lua

COPY docker/run-json.js /runner/run-json.js

USER codewarrior
ENV USER=codewarrior HOME=/home/codewarrior

# timeout is a fallback in case an error with node
# prevents it from exiting properly
ENTRYPOINT ["timeout", "15", "node"]
