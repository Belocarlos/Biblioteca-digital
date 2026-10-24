# Implantação e ambiente de pré-visualização

Nesta fase, a plataforma é disponibilizada num endereço temporário do fornecedor de alojamento, sem domínio próprio e fora dos motores de pesquisa. A publicação definitiva só deve ocorrer após aprovação institucional.

## Requisitos

- Servidor Node.js 22 ou contentor Docker.
- PostgreSQL 16 com as extensões `unaccent`, `pg_trgm` e `citext`.
- Armazenamento persistente de ficheiros: disco persistente (opção A) ou serviço compatível com S3 (opção B).
- HTTPS fornecido pela plataforma de alojamento.

## Opção A: contentor Docker com disco persistente

Adequada a Render, Railway, Fly.io ou a um servidor próprio, que atribuem um endereço temporário (por exemplo, `*.onrender.com` ou `*.fly.dev`).

1. Crie uma base de dados PostgreSQL gerida e obtenha a ligação do proprietário.
2. Crie o serviço web a partir do `Dockerfile` deste repositório.
3. Monte um disco persistente em `/app/storage`.
4. Defina as variáveis de ambiente:

   ```
   MIGRATION_DATABASE_URL=postgres://<proprietário>:<senha>@<anfitrião>:5432/<base>
   APP_DB_PASSWORD=<senha forte para o papel ol4_app>
   DATABASE_URL=postgres://ol4_app:<APP_DB_PASSWORD>@<anfitrião>:5432/<base>
   APP_SECRET=<openssl rand -base64 48>
   SITE_URL=https://<endereço-temporário>
   SITE_INDEXING=false
   STORAGE_DRIVER=local
   STORAGE_LOCAL_DIR=/app/storage
   ```

5. No arranque, o contentor aplica as migrações e inicia o servidor.
6. Crie o primeiro administrador na consola do serviço:

   ```
   node scripts/create-admin.mts --email pessoa@exemplo.org --name "Nome Apelido"
   ```

7. Agende diariamente `node scripts/retention.mts` e a cópia de segurança da base de dados.

## Opção B: Vercel e Supabase

1. Crie um projeto Supabase. No editor SQL, confirme as extensões:

   ```sql
   create extension if not exists unaccent with schema public;
   create extension if not exists pg_trgm with schema public;
   create extension if not exists citext with schema public;
   ```

2. Crie um bucket privado no Supabase Storage e chaves de acesso S3.
3. Execute as migrações a partir de um computador com o repositório:

   ```
   MIGRATION_DATABASE_URL=<ligação direta, porta 5432> APP_DB_PASSWORD=<senha> npm run db:migrate
   ```

4. Importe o repositório na Vercel e defina as variáveis:

   ```
   DATABASE_URL=postgres://ol4_app.<ref>:<APP_DB_PASSWORD>@<pooler>:6543/postgres
   DATABASE_PREPARE=false
   APP_SECRET=...
   SITE_URL=https://<projeto>.vercel.app
   SITE_INDEXING=false
   STORAGE_DRIVER=s3
   S3_ENDPOINT=https://<ref>.supabase.co/storage/v1/s3
   S3_REGION=<região>
   S3_BUCKET=<bucket>
   S3_ACCESS_KEY_ID=...
   S3_SECRET_ACCESS_KEY=...
   S3_FORCE_PATH_STYLE=true
   ```

   Com o Supavisor, o utilizador da ligação inclui a referência do projeto (`ol4_app.<ref>`).

5. Crie o administrador com `npm run admin:create` usando a `MIGRATION_DATABASE_URL`.

Nesta opção, o disco do servidor não é persistente, pelo que o armazenamento S3 é obrigatório. O limite de tamanho dos pedidos da plataforma pode exigir a redução dos limites de carregamento.

## Domínio próprio (fase futura)

A plataforma está preparada para receber um domínio sem alterações de código:

1. Associe o domínio no fornecedor de alojamento e confirme o certificado HTTPS.
2. Atualize `SITE_URL` para o novo endereço.
3. Após aprovação institucional da publicação definitiva, defina `SITE_INDEXING=true`.
4. Submeta `https://<domínio>/sitemap.xml` às ferramentas dos motores de pesquisa.

## Lista de verificação antes da publicação definitiva

- [ ] Logótipo oficial e favicon substituídos.
- [ ] Política de Privacidade e Termos e Condições revistos e aprovados.
- [ ] Identificação jurídica do responsável e localização dos servidores indicadas na política.
- [ ] Conteúdos reais introduzidos e verificados; nenhum dado de demonstração.
- [ ] Cópias de segurança diárias e recuperação testada.
- [ ] Tarefa diária de conservação de dados agendada.
- [ ] `SITE_INDEXING=true` apenas após aprovação.
