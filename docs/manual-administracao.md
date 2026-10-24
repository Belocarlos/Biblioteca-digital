# Manual básico de administração

Biblioteca Digital Open Lecture4All

Este manual descreve as tarefas correntes da equipa editorial no painel administrativo.

## 1. Acesso

- O painel está em `/admin`. A ligação «Área reservada» encontra-se no topo e no rodapé do website.
- As contas são criadas por um administrador. A primeira palavra-passe é temporária e tem de ser alterada no primeiro acesso.
- A palavra-passe deve ter pelo menos 12 caracteres e três tipos de caracteres (minúsculas, maiúsculas, números ou símbolos).
- Após 5 tentativas falhadas numa conta (ou 20 a partir do mesmo endereço), o acesso é bloqueado durante 15 minutos.
- A sessão expira ao fim de 12 horas. Utilize «Terminar sessão» em computadores partilhados.
- A página «A minha conta» permite alterar a palavra-passe. As restantes sessões abertas são terminadas.

## 2. Funções

| Função | Pode |
| --- | --- |
| Administrador | Tudo, incluindo utilizadores, configurações, documentos jurídicos, equipa, parceiros e eliminação de conteúdos publicados |
| Editor | Criar e editar recursos, sessões, autores e coleções; enviar para revisão; publicar conteúdos aprovados; arquivar; eliminar rascunhos |
| Revisor | Consultar conteúdos, aprovar ou devolver conteúdos em revisão, analisar submissões |

As permissões são aplicadas no servidor e na base de dados. Mesmo que um botão fosse apresentado por engano, a operação seria recusada.

## 3. Fluxo editorial

```
Rascunho  ->  Em revisão  ->  Aprovado  ->  Publicado  ->  Arquivado
```

- Os novos recursos e sessões são criados como **Rascunho** e não são visíveis no website.
- O editor envia para revisão. O revisor aprova ou devolve a rascunho, com uma nota.
- Se um editor alterar um conteúdo **Aprovado**, este volta automaticamente a **Em revisão**.
- O editor publica o conteúdo aprovado. O endereço permanente (slug) fica fixo a partir da primeira publicação.
- Para retirar um conteúdo do website, **arquive-o**. O arquivo pode ser reaberto como rascunho.
- O administrador pode publicar diretamente quando necessário.
- Cada mudança de estado fica registada no histórico do conteúdo, com data, autor e nota.

Para aprovar ou publicar um recurso é necessário ter resumo e pelo menos um autor (ou a instituição ou editora).

## 4. Recursos

**Criar**: Recursos, «Novo recurso». Preencha os metadados e grave. O recurso fica em rascunho e abre-se a página de edição.

**Campos principais**: título, subtítulo, tipo de documento, ano, idioma, país, área de conhecimento, instituição ou editora, DOI, ISBN, resumo, palavras-chave, licença, titular dos direitos e direitos de utilização.

**Autores**: pesquise os perfis registados e adicione-os pela ordem correta (a ordem é usada nas referências). Se o autor não existir, crie primeiro o perfil em Autores. Para referências corretas, preencha o «Nome para referências» no formato `Apelido, Nome`.

**Coleções e sessões**: assinale as coleções temáticas e associe as sessões relacionadas.

**Ficheiros** (na página de edição):

- PDF até 60 MB. São recusados ficheiros com JavaScript, anexos ou ações automáticas.
- Capa em JPEG, PNG ou WebP até 8 MB. A imagem é otimizada e os metadados são removidos. Sem capa, é apresentado um modelo gráfico com o título e o tipo.
- Quando o ficheiro não pode ser alojado, indique a **fonte original** (link externo).

**Permissões de acesso** (após carregar o PDF):

- «Permitir a leitura online»: ativa o visualizador integrado.
- «Permitir o descarregamento»: ativa o botão de descarregamento.
- Ative apenas o que a licença ou a autorização do titular permitem. Com «Todos os direitos reservados» ou «Outra licença», o descarregamento exige a descrição da autorização obtida em «Direitos de utilização».

**Eliminar**: os editores só eliminam rascunhos. Para conteúdos publicados, prefira arquivar. A eliminação definitiva pede confirmação explícita.

## 5. Sessões Saberes em Rede

- Indique apenas datas confirmadas. Sem data, a sessão aparece como «Data a confirmar». O fuso horário é escolhido no formulário.
- O «Estado da sessão» (Programada, Realizada, Adiada, Cancelada) é independente do estado editorial.
- Associe os oradores (função Orador ou Moderação) e os recursos da biblioteca (Apresentação utilizada, Gravação ou Documento relacionado). Apenas os recursos publicados aparecem no website.
- A gravação (YouTube, Vimeo ou outro endereço) só é guardada com a confirmação de que a disponibilização foi autorizada. No website, o vídeo só é carregado quando o visitante o pede.
- O cartaz é carregado na página de edição. Preencha o texto alternativo para leitores de ecrã.

## 6. Autores e oradores

- O perfil só aparece no diretório quando «Publicar o perfil» está assinalado. Confirme antes a autorização da pessoa.
- O nome aparece sempre nos recursos e sessões publicados, porque faz parte dos metadados bibliográficos.
- As fotografias exigem a confirmação de que a pessoa autorizou a utilização. Não utilize imagens geradas por inteligência artificial. Se a autorização for retirada, desmarque a opção e a fotografia é removida.
- Links profissionais: um por linha, no formato `Etiqueta | https://endereço`.
- Apenas administradores eliminam perfis, e só quando não têm recursos nem sessões associados.

## 7. Coleções

- Crie, edite, oculte e reordene as coleções com as setas na lista. A ordem é a do website.
- Alterar o endereço (slug) de uma coleção quebra ligações existentes.
- Só é possível eliminar coleções sem recursos associados.

## 8. Submissões

1. As propostas enviadas em «Submeter material» chegam como **Pendentes**. Nada é publicado automaticamente.
2. Abra a submissão, verifique os dados, o ficheiro ou o link e a informação sobre direitos.
3. Utilize «Iniciar análise», «Aceitar» ou «Recusar». A recusa exige uma nota com o motivo. Todas as decisões ficam no histórico de revisão.
4. Para publicar, um editor ou administrador usa «Converter em recurso». É criado um rascunho com os metadados e uma cópia do ficheiro. Associe os autores, confirme a licença e siga o fluxo editorial.
5. Para responder ao proponente, utilize a ligação de e-mail na página da submissão.

Os administradores podem eliminar submissões, por exemplo a pedido do titular dos dados.

## 9. Utilizadores (administradores)

- «Nova conta»: nome, e-mail e função. É apresentada uma palavra-passe temporária uma única vez. Comunique-a por um canal seguro.
- «Repor palavra-passe» gera uma nova palavra-passe temporária e termina as sessões da conta.
- Desativar uma conta termina imediatamente as suas sessões. Tem de existir sempre pelo menos um administrador ativo.

## 10. Configurações (administradores)

- **Dados gerais**: contacto institucional, redes sociais oficiais (apenas perfis confirmados) e texto «Sobre a iniciativa» da página inicial.
- **Texto da página Sobre Nós**: em Markdown (`##` para títulos, `-` para listas).
- **Equipa responsável** e **Parceiros institucionais**: publique apenas elementos confirmados. A base de dados impede a publicação de parceiros sem parceria confirmada.
- **Imagem de partilha**: imagem para pré-visualizações em redes sociais (1200 x 630 píxeis recomendados).
- **Documentos jurídicos**: edite a Política de Privacidade e os Termos e Condições. Cada gravação cria uma versão. Marque «revista juridicamente e aprovada» apenas após aprovação institucional. Até lá, o website mostra o aviso de documento em revisão.
- **Registo de atividade**: ações administrativas relevantes (entradas, criações, alterações, eliminações, mudanças de estado).

## 11. Estatísticas

Contagens de visualizações, leituras online e descarregamentos por recurso e por dia, sem cookies, sem endereços IP e sem dados pessoais. Incluem distribuição por tipo, coleção, idioma e mês.

## 12. Manutenção técnica

| Tarefa | Comando | Frequência |
| --- | --- | --- |
| Cópia de segurança | `scripts/backup.sh /caminho/seguro` | Diária |
| Prazos de conservação | `npm run maintenance:retention` | Diária |
| Atualização do esquema | `npm run db:migrate` | Em cada nova versão |
| Recuperação | `scripts/restore.sh copia.dump [ficheiros.tar.gz]` | Quando necessário |

- Guarde as cópias de segurança fora do servidor e teste a recuperação periodicamente.
- Com armazenamento S3, ative o versionamento do bucket.
- Nunca partilhe `APP_SECRET`, `MIGRATION_DATABASE_URL` ou as chaves de armazenamento. Estas variáveis existem apenas no servidor.

## 13. Boas práticas editoriais

- Publique apenas informação verificada e autorizada. Não crie recursos, autores, sessões, parceiros, números ou testemunhos fictícios.
- Confirme a licença antes de ativar a leitura ou o descarregamento.
- Preencha sempre o texto alternativo de cartazes e fotografias.
- Prefira arquivar a eliminar, para preservar os endereços permanentes e o histórico.

## 14. Resolução de problemas

| Situação | Causa provável |
| --- | --- |
| «Não tem permissão para realizar esta operação» | A sua função não permite a ação, ou o estado do conteúdo não a admite |
| «Transição editorial não permitida» | A mudança de estado não segue o fluxo para a sua função |
| O recurso não aparece no website | Não está publicado, ou foi arquivado |
| O botão de descarregamento não aparece | O descarregamento não está autorizado, ou não existe ficheiro |
| O PDF é recusado | Ficheiro danificado, maior do que o limite ou com conteúdo ativo |
| Acesso bloqueado | Demasiadas tentativas falhadas. Aguarde 15 minutos |
