FROM nice/ld-mimirbase
MAINTAINER Ryan Roberts <ryansroberts@gmail.com>

#Explicitly adding package.json should cache this layer if it hasn't changed
#See http://www.clock.co.uk/blog/a-guide-on-how-to-cache-npm-install-with-docker
ADD src/owldin/package.json /owldin/
RUN cd /owldin && \
    npm install
ADD src/owldin/ /owldin

# Same trick with paket.lock
ADD tools/ /tools/
RUN cd /tools && \
    ./install.sh

ENV PROJECT_DIR="/git"
ENV ARTIFACT_DIR="/artifacts"
ENV MIMIR_PORT=80

EXPOSE  80
CMD ["node", "/owldin/server.js"]
