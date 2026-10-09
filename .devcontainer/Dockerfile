FROM mcr.microsoft.com/devcontainers/javascript-node:5-24-trixie

# AWS CLI v2 for inspecting the local RustFS (profile `rustfs`, see aws-config); same version as storage-init
ARG AWS_CLI_VERSION=2.37.9
RUN curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-$(uname -m)-${AWS_CLI_VERSION}.zip" -o /tmp/awscliv2.zip \
    && unzip -q /tmp/awscliv2.zip -d /tmp \
    && /tmp/aws/install \
    && rm -rf /tmp/awscliv2.zip /tmp/aws

# Claude Code CLI, stable channel (installed into /root/.local/bin)
RUN curl -fsSL https://claude.ai/install.sh | bash -s stable
ENV PATH="/root/.local/bin:${PATH}"
