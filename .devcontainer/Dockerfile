FROM mcr.microsoft.com/devcontainers/javascript-node:5-24-trixie

# Claude Code CLI, stable channel (installed into /root/.local/bin)
RUN curl -fsSL https://claude.ai/install.sh | bash -s stable
ENV PATH="/root/.local/bin:${PATH}"
