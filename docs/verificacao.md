# Verificação e testes

Resultado da última execução completa, num build de produção com PostgreSQL 16:

| Conjunto | Resultado |
| --- | --- |
| Testes unitários (Vitest) | 23 de 23 aprovados |
| Testes end-to-end (Playwright, Chromium) | 55 de 55 aprovados |
| Verificação de tipos (TypeScript) e lint (ESLint) | Sem erros |
| Build de produção (Next.js) | Concluído |

Os testes end-to-end usam uma base de dados própria (`ol4_test`), recriada no início de cada execução, e uma pasta de ficheiros temporária. Todos os dados criados pelos testes são identificados como `[DEMO]` e não existem noutros ambientes.

## Correspondência com os testes obrigatórios

| Verificação obrigatória | Teste automático |
| --- | --- |
| Pesquisa de recursos | `03-editorial`: pesquisa por título, autor, palavra-chave e resumo, sem distinção de acentos e com prefixo |
| Funcionamento dos filtros | `03-editorial`: filtros combinados (tipo, coleção, intervalo de anos, idioma, país), ordenação, filtros ativos e ausência de resultados |
| Upload de PDFs | `03-editorial`: carregamento válido; recusa de PDF com JavaScript e de ficheiro falso; `04-submission`: recusa de PDF com ação de lançamento |
| Visualização de documentos | `03-editorial`: visualizador integrado com páginas renderizadas, camada de texto, navegação e zoom |
| Downloads autorizados | `03-editorial`: descarregamento com licença adequada, pedidos parciais, indisponibilidade quando não autorizado e para rascunhos |
| Criação e edição de autores | `03-editorial`: criação de perfil, fotografia com autorização obrigatória, publicação e página pública |
| Associação de recursos a sessões | `03-editorial`: sessão com orador e apresentação; ligação recíproca na página do recurso e do autor |
| Autenticação | `02-auth`: acesso protegido, mensagem genérica, bloqueio após tentativas, terminar sessão, palavra-passe temporária e alteração obrigatória |
| Permissões administrativas | `02-auth` e `03-editorial`: revisor sem acesso a utilizadores e configurações, revisor sem edição de metadados, editor sem aprovação, eliminação de publicados reservada ao administrador |
| Submissão de documentos | `04-submission`: validação, campo-isco, tempo mínimo, PDF malicioso, submissão válida pendente e não publicada |
| Revisão editorial | `03-editorial`: Rascunho, Em revisão, Aprovado, Publicado, Arquivado, com notas e histórico; `04-submission`: análise e conversão em recurso |
| Funcionamento dos formulários | Todos os formulários do fluxo são preenchidos e submetidos, com verificação das mensagens de sucesso e de erro |
| Responsividade | `05-accessibility`: largura de 375 px sem deslocamento horizontal e menu móvel acessível |
| Acessibilidade | `05-accessibility`: axe-core (WCAG 2.0, 2.1 e 2.2 AA) em 12 páginas públicas e 6 páginas do painel; ligação para saltar para o conteúdo e foco visível |
| Política de Privacidade | `01-public`: acessível no rodapé, com as 11 secções exigidas e aviso de versão preliminar |
| Termos e Condições | `01-public`: acessível no rodapé, com as 11 secções exigidas |
| Favicon | `01-public`: `favicon.ico`, `icon.svg` e declaração no HTML |
| Links do menu e rodapé | `01-public`: todas as entradas do menu principal e as ligações jurídicas e de contacto do rodapé |
| Ausência de conteúdos fictícios | `01-public`: sem dados, não existem indicadores, contadores ou zeros decorativos e são apresentados os estados vazios; `03-editorial`: os indicadores surgem apenas com dados reais |

Verificações adicionais: cabeçalhos de segurança e CSP, bloqueio de indexação no ambiente de testes, `robots.txt`, `sitemap.xml`, dados estruturados, ausência de emojis, de botões em pílula, de travessões longos e de selos de geração automática, ausência de erros na consola do navegador, estatísticas agregadas, registo de atividade e reordenação de coleções.

## Testes realizados diretamente na base de dados

Executados com o papel da aplicação (`ol4_app`), confirmaram que:

- um visitante anónimo não lê rascunhos, submissões, utilizadores ou estatísticas e não cria recursos;
- um visitante anónimo só cria submissões no estado pendente;
- o revisor não altera metadados e o editor não aprova;
- alterações de um conteúdo aprovado reenviam-no para revisão;
- o endereço permanente não muda após a publicação;
- o último administrador ativo não pode ser despromovido ou desativado;
- um utilizador sem função de administrador não altera a própria função;
- o papel da aplicação não acede às credenciais nem às sessões.

## Cópias de segurança

Foi testado o ciclo completo: cópia com `scripts/backup.sh`, recuperação com `scripts/restore.sh` numa base de dados vazia e confirmação de que os dados e as permissões do papel `ol4_app` foram preservados.

## Como executar

```bash
npm run lint && npm run typecheck && npm test
npm run build
npm run test:e2e        # requer a base de dados ol4_test (ver playwright.config.ts)
```

## Limitações conhecidas

- A deteção de conteúdo ativo em PDF analisa a estrutura do ficheiro e não inspeciona fluxos comprimidos. O visualizador não executa JavaScript dos documentos. Recomenda-se acrescentar um antivírus (por exemplo, ClamAV) no alojamento definitivo.
- A verificação automática de acessibilidade não substitui testes com leitores de ecrã e com utilizadores.
- A imagem Docker não foi construída no ambiente de desenvolvimento por limite de pedidos do Docker Hub. O modo standalone que a imagem utiliza foi executado e validado diretamente.
