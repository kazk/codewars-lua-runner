FROM codewars/base-runner

# luarocks with lua 5.2 needs to be built from source
RUN apt-get update && apt-get install -y lua5.2 liblua5.2-dev unzip
RUN curl -fsSL https://github.com/luarocks/luarocks/archive/v2.4.2.tar.gz | tar xz -C /tmp \
	&& cd /tmp/luarocks-2.4.2 \
	&& ./configure --lua-version=5.2 \
	&& make build \
	&& make install \
	&& cd /tmp \
	&& rm -rf /tmp/luarocks-2.4.2

RUN luarocks install busted

RUN ln -s /home/codewarrior /workspace
WORKDIR /runner
ENV NPM_CONFIG_LOGLEVEL=warn
COPY package.json /runner/package.json
RUN npm install --only=prod
RUN npm install --only=dev # TODO

COPY lib /runner/lib
COPY test /runner/test

# files inside /home/codewarrior will be removed in NODE_ENV=test
COPY docker/lua /runner/lua

USER codewarrior
ENV USER=codewarrior HOME=/home/codewarrior

# Use global mocha for now. local one exits after first test for some reason.
RUN NODE_ENV=test mocha -t 5s

# timeout is a fallback in case an error with node
# prevents it from exiting properly
ENTRYPOINT ["timeout", "15", "node"]
