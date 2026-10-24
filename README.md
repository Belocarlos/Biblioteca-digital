# Biblioteca Digital Open Lecture4All

Repositório digital do programa internacional **Open Lecture4All**: livros, artigos científicos, apresentações, gravações das sessões **Saberes em Rede** e materiais complementares.

> Conhecimento sem fronteiras, acessível a todos.

Contacto institucional: openlecture4all@gmail.com

## Funcionalidades

- Catálogo com pesquisa de texto integral (PostgreSQL, português, sem distinção de acentos), pesquisa por campo (título, autor, palavras-chave, resumo) e filtros combináveis (tipo, área temática, ano, idioma, país), com ordenação e paginação.
- Página permanente por recurso, com metadados bibliográficos, referência em APA 7 e ABNT, cópia do endereço, ligação à fonte original, materiais relacionados, dados estruturados (schema.org) e metadados para indexadores académicos.
- Visualizador PDF integrado (pdf.js servido pela própria plataforma) e descarregamento apenas quando a licença ou a autorização o permitem.
- Arquivo das sessões Saberes em Rede, com oradores, cartaz, gravação (carregada apenas a pedido do visitante), apresentação, documentos e referências.
- Diretório de autores e oradores, com perfis publicados mediante autorização e fotografias apenas com autorização registada.
- Coleções temáticas editáveis e reordenáveis.
- Formulário público de submissão com validação de ficheiros, proteção contra envios automáticos e revisão editorial obrigatória.
- Painel administrativo em `/admin` com funções de Administrador, Editor e Revisor, fluxo editorial (Rascunho, Em revisão, Aprovado, Publicado, Arquivado), histórico, estatísticas agregadas e anónimas, registo de atividade e documentos jurídicos versionados.
- Política de Privacidade e Termos e Condições editáveis, com aviso de versão preliminar até à aprovação institucional.

A plataforma não contém conteúdos fictícios. Sem dados publicados, apresenta estados vazios e oculta os indicadores.

## Arquitetura

| Camada | Tecnologia |
| --- | --- |
| Aplicação | Next.js 16 (App Router, Server Actions), React 19, TypeScript |
| Estilos | Tailwind CSS 4 com componentes próprios, Inter e Source Sans 3 servidas localmente, ícones Lucide |
| Base de dados | PostgreSQL 16 (compatível com Supabase), pesquisa de texto integral, RLS |
| Ficheiros | Disco local ou serviço compatível com S3 (Supabase Storage, Cloudflare R2, AWS S3) |
| Autenticação | Própria: Argon2id, sessões guardadas como resumo SHA-256, cookie `HttpOnly` |
| Testes | Vitest (unitários), Playwright e axe-core (end-to-end e acessibilidade) |

### Segurança em várias camadas

1. **Servidor**: cada página e ação verifica a sessão e a função do utilizador.
2. **Base de dados**: a aplicação liga-se com o papel `ol4_app`, sujeito a Row Level Security. A função do utilizador é obtida pela própria base de dados a partir do token de sessão, e não é enviada pela aplicação. Gatilhos aplicam o fluxo editorial (por exemplo, um revisor não altera metadados e um editor não aprova), impedem a alteração de endereços permanentes após a publicação, mantêm o histórico e escrevem o registo de auditoria, que a aplicação não pode alterar.
3. **Ficheiros**: PDF validados (assinatura, integridade, recusa de JavaScript, anexos e ações automáticas), imagens recodificadas em WebP sem metadados, nomes aleatórios, acesso aos PDF verificado em cada pedido e ficheiros de submissões reservados à equipa.
4. **HTTP**: Content Security Policy com nonce por pedido, HSTS em produção, `X-Frame-Options`, `nosniff`, proteção CSRF das Server Actions, limitação de tentativas de autenticação e de submissões.

O ambiente de pré-visualização fica fora dos motores de pesquisa (`robots.txt`, `X-Robots-Tag` e meta `robots`) enquanto `SITE_INDEXING` não for `true`.

## Estrutura

```
db/migrations/        Esquema, segurança (RLS, gatilhos, funções), permissões e dados institucionais
scripts/              Migrações, criação de administrador, conservação de dados, cópias de segurança
src/app/(site)/       Website público
src/app/admin/        Painel administrativo
src/app/api/          Entrega controlada de ficheiros
src/components/       Componentes (ui, site, admin)
src/lib/              Acesso a dados, autenticação, armazenamento, validação, referências
tests/unit/           Testes unitários
e2e/                  Testes end-to-end
docs/                 Manual de administração, implantação e verificação
```

## Instalação local

Requisitos: Node.js 22, PostgreSQL 16 (ou Docker).

```bash
npm install
cp .env.example .env.local        # e preencha os valores
```

Crie a base de dados e o papel proprietário (exemplo com `psql` como superutilizador):

```sql
create role ol4_owner login password 'ALTERAR' createrole;
create database ol4 owner ol4_owner;
\c ol4
create extension if not exists unaccent;
create extension if not exists pg_trgm;
create extension if not exists citext;
```

```bash
npm run db:migrate                                         # cria o esquema e ativa o papel ol4_app
npm run admin:create -- --email pessoa@exemplo.org --name "Nome Apelido"
npm run dev                                                # http://localhost:3000
```

A palavra-passe temporária do administrador é apresentada uma única vez e tem de ser alterada no primeiro acesso.

Em alternativa, com Docker: `docker compose up --build` (defina `POSTGRES_PASSWORD`, `APP_DB_PASSWORD` e `APP_SECRET` num ficheiro `.env`).

## Variáveis de ambiente

| Variável | Descrição |
| --- | --- |
| `DATABASE_URL` | Ligação da aplicação com o papel `ol4_app` |
| `MIGRATION_DATABASE_URL` | Ligação do proprietário do esquema (migrações e manutenção) |
| `APP_DB_PASSWORD` | Palavra-passe atribuída ao papel `ol4_app` pelas migrações |
| `APP_SECRET` | Segredo com pelo menos 32 caracteres |
| `SITE_URL` | Endereço público, sem barra final (temporário nesta fase) |
| `SITE_INDEXING` | `true` apenas quando a publicação definitiva for aprovada |
| `STORAGE_DRIVER` | `local` ou `s3` |
| `STORAGE_LOCAL_DIR` | Pasta dos ficheiros com armazenamento local |
| `S3_*` | Configuração do armazenamento compatível com S3 |
| `DATABASE_PREPARE` | `false` com gestores de ligações em modo de transação |
| `COOKIE_SECURE` | Força o atributo `Secure` do cookie (predefinido em produção) |

## Comandos

| Comando | Função |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` e `npm start` | Build e servidor de produção |
| `npm run lint`, `npm run typecheck` | Qualidade do código |
| `npm test` | Testes unitários |
| `npm run test:e2e` | Testes end-to-end (requer `npm run build` e a base `ol4_test`) |
| `npm run db:migrate` | Aplica migrações pendentes |
| `npm run admin:create` | Cria ou reativa um administrador |
| `npm run maintenance:retention` | Aplica os prazos de conservação de dados |
| `scripts/backup.sh`, `scripts/restore.sh` | Cópia de segurança e recuperação |

## Documentação

- [Manual básico de administração](docs/manual-administracao.md)
- [Implantação e ambiente de pré-visualização](docs/implantacao.md)
- [Verificação e testes](docs/verificacao.md)

## Pendências institucionais

- Logótipo oficial: o favicon e o monograma OL4 são provisórios (`src/app/icon.svg`, `npm run icons`).
- Revisão jurídica e aprovação da Política de Privacidade e dos Termos e Condições, incluindo a identificação jurídica do responsável e a localização dos servidores.
- Redes sociais oficiais, equipa, parceiros confirmados e conteúdos reais (introduzidos no painel).
