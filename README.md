# Docker Logger

MVP para acompanhar logs de containers Docker em tempo real. O navegador acessa apenas a API REST/SSE do servidor; o socket Docker permanece isolado no backend.

## Executar localmente

Pré-requisitos: [Bun](https://bun.sh) e Docker em execução.

```bash
bun install
bun run dev
```

Acesse `http://localhost:3001`. O Vite encaminha chamadas `/api` para o servidor em `http://localhost:3000`.

## Deploy local com Docker e Nginx

Para subir o frontend estático servido pelo Nginx e o backend conectado ao Docker host:

```bash
docker compose up --build
```

Acesse `http://localhost:8080`. O Nginx encaminha `/api` e o stream SSE para o serviço interno `server`; a porta do backend não é publicada no host.

O compose monta `/var/run/docker.sock` no servidor. Esse socket concede privilégios administrativos ao Docker host: exponha o serviço somente em ambientes confiáveis e mantenha os endpoints restritos a leitura de containers e logs.

## Recursos

- containers disponíveis, com nome, ID, imagem e estado;
- carregamento dos últimos 1.000 logs, limitado a 10.000 por requisição;
- atualização por SSE, com um stream Docker compartilhado por container;
- parser do protocolo multiplexado stdout/stderr e reconstrução de linhas fragmentadas;
- busca textual e filtros stdout/stderr no navegador;
- lista virtualizada, buffer com batches de 75 ms e limite local de 10.000 linhas;
- modo LIVE, pausa automática ao subir a lista, contador de novas entradas e retorno ao final;
- status da conexão SSE e limpeza local dos logs.

## Verificação

```bash
bun run check-types
bun run --cwd apps/server test
bun run build
```
